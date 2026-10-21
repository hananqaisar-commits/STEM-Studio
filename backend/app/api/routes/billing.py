"""Learner subscription, manual payment, and signed provider webhook endpoints."""

from __future__ import annotations

import json
import logging
import secrets
from datetime import timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, security_scheme
from backend.app.api.schemas import BillingCheckoutRequest, ManualPaymentClaimRequest
from backend.app.core.billing_service import (
    cancel_safepay_subscription,
    create_safepay_subscription_checkout,
    process_queued_webhook,
    queue_verified_event,
    utcnow,
    verify_safepay_signature,
)
from backend.app.core.feature_access import _aware, ensure_default_free_plan
from backend.app.core.owner_security import is_provisioned_owner
from backend.app.core.rate_limit import strict
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    ManualPaymentClaim,
    ManualPaymentMethod,
    AdConfiguration,
    PaymentRecord,
    FeaturePolicy,
    PlanFeature,
    Subscription,
    SubscriptionPlan,
    User,
)

router = APIRouter(prefix="/api/billing", tags=["Subscriptions & Billing"])
logger = logging.getLogger(__name__)


@router.get("/ads/{placement}")
def public_ad_placement(
    placement: str,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    """Return a placement only for anonymous/free learners; paid plans and owner sessions never receive ads."""
    if placement not in {"landing", "learner"}:
        raise HTTPException(status_code=404, detail="Ad placement not found")
    user = None
    if credentials is not None or request.cookies.get("owner_access"):
        try:
            user = get_current_user(request, credentials, db)
        except HTTPException:
            # A stale browser credential is treated as an anonymous visitor for
            # the public placement. It never changes server-side account access.
            user = None
    if user is not None and is_provisioned_owner(db, user):
        return {"eligible": False, "publisher_id": "", "slot_id": ""}

    if user is not None:
        now = utcnow()
        paid_subscription = db.query(Subscription.subscription_id).join(
            SubscriptionPlan, SubscriptionPlan.plan_id == Subscription.plan_id
        ).filter(
            Subscription.user_id == user.user_id,
            SubscriptionPlan.is_free.is_(False),
            Subscription.status.in_(("active", "past_due")),
            (Subscription.current_period_end.is_(None) | (Subscription.current_period_end > now)),
        ).first()
        if paid_subscription:
            return {"eligible": False, "publisher_id": "", "slot_id": ""}

    config = db.get(AdConfiguration, 1)
    slot_id = (config.landing_slot_id if placement == "landing" else config.learner_slot_id) if config else ""
    enabled = bool(config and config.is_enabled and config.publisher_id and slot_id)
    return {
        "eligible": enabled,
        "publisher_id": config.publisher_id if enabled else "",
        "slot_id": slot_id if enabled else "",
    }


def _plan_json(db: Session, plan: SubscriptionPlan) -> dict:
    included = db.query(PlanFeature.feature_key, FeaturePolicy.label).join(
        FeaturePolicy, FeaturePolicy.feature_key == PlanFeature.feature_key
    ).filter(
        PlanFeature.plan_id == plan.plan_id,
        PlanFeature.included.is_(True),
        FeaturePolicy.is_archived.is_(False),
        or_(FeaturePolicy.is_enabled.is_(True), FeaturePolicy.disabled_until <= utcnow()),
    ).all()
    return {
        "plan_id": plan.plan_id,
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "price_minor": plan.price_minor,
        "list_price_minor": plan.list_price_minor or plan.price_minor,
        "discount_label": plan.discount_label,
        "currency": plan.currency,
        "billing_interval": plan.billing_interval,
        "is_free": plan.is_free,
        "is_featured": plan.is_featured,
        "safepay_ready": bool(plan.safepay_plan_id),
        "features": [{"feature_key": key, "label": label} for key, label in included],
    }


@router.get("/plans")
def public_plans(db: Session = Depends(get_db)):
    ensure_default_free_plan(db)
    db.commit()
    plans = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.is_active.is_(True), SubscriptionPlan.is_public.is_(True)
    ).order_by(SubscriptionPlan.price_minor.asc(), SubscriptionPlan.plan_id.asc()).all()
    return {"plans": [_plan_json(db, plan) for plan in plans]}


@router.get("/payment-methods")
def public_manual_payment_methods(db: Session = Depends(get_db)):
    rows = db.query(ManualPaymentMethod).filter(ManualPaymentMethod.is_active.is_(True)).order_by(
        ManualPaymentMethod.payment_method_id.asc()
    ).all()
    return [{
        "payment_method_id": row.payment_method_id,
        "provider_key": row.provider_key,
        "label": row.label,
        "account_name": row.account_name,
        "account_identifier": row.account_identifier,
        "instructions": row.instructions,
        "currency": row.currency,
    } for row in rows]


@router.get("/me")
def my_billing(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subscriptions = db.query(Subscription).filter(Subscription.user_id == current_user.user_id).order_by(
        Subscription.created_at.desc(), Subscription.subscription_id.desc()
    ).limit(20).all()
    payments = db.query(PaymentRecord).filter(PaymentRecord.user_id == current_user.user_id).order_by(
        PaymentRecord.created_at.desc(), PaymentRecord.payment_id.desc()
    ).limit(50).all()
    claims = db.query(ManualPaymentClaim).filter(ManualPaymentClaim.user_id == current_user.user_id).order_by(
        ManualPaymentClaim.created_at.desc(), ManualPaymentClaim.claim_id.desc()
    ).limit(20).all()
    current = next((row for row in subscriptions if row.status in {"active", "past_due", "payment_hold", "pending"}), None)
    current_plan = db.get(SubscriptionPlan, current.plan_id) if current else None
    return {
        "is_owner": is_provisioned_owner(db, current_user),
        "effective_plan": _plan_json(db, current_plan) if current_plan else {"name": "Free", "is_free": True, "features": []},
        "subscription": ({
            "subscription_id": current.subscription_id,
            "status": current.status,
            "provider": current.provider,
            "period_start": current.current_period_start,
            "period_end": current.current_period_end,
            "cancel_at_period_end": current.cancel_at_period_end,
            "last_payment_at": current.last_payment_at,
        } if current else None),
        "subscriptions": [{
            "subscription_id": row.subscription_id,
            "plan_name": (db.get(SubscriptionPlan, row.plan_id).name if db.get(SubscriptionPlan, row.plan_id) else "Archived plan"),
            "provider": row.provider,
            "status": row.status,
            "period_start": row.current_period_start,
            "period_end": row.current_period_end,
            "created_at": row.created_at,
        } for row in subscriptions],
        "payments": [{
            "payment_id": row.payment_id,
            "plan_name": (db.get(SubscriptionPlan, row.plan_id).name if row.plan_id and db.get(SubscriptionPlan, row.plan_id) else "Plan"),
            "amount_minor": row.amount_minor,
            "currency": row.currency,
            "status": row.status,
            "payment_method": row.payment_method,
            "external_reference": row.external_reference,
            "paid_at": row.paid_at,
            "created_at": row.created_at,
        } for row in payments],
        "manual_claims": [{
            "claim_id": row.claim_id,
            "transaction_reference": row.transaction_reference,
            "status": row.status,
            "owner_note": row.owner_note,
            "created_at": row.created_at,
            "reviewed_at": row.reviewed_at,
        } for row in claims],
    }


@router.post("/checkout")
async def start_checkout(
    payload: BillingCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.plan_id == payload.plan_id,
        SubscriptionPlan.is_active.is_(True),
        SubscriptionPlan.is_public.is_(True),
        SubscriptionPlan.is_free.is_(False),
    ).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Paid plan not found or no longer available")
    if not plan.safepay_plan_id:
        raise HTTPException(status_code=409, detail="Online card checkout is not configured for this plan. Use one of the listed bank or wallet methods.")
    current = db.query(Subscription).filter(
        Subscription.user_id == current_user.user_id,
        Subscription.status.in_(("active", "past_due", "payment_hold")),
    ).order_by(Subscription.current_period_end.desc().nullslast()).first()
    if current and (current.current_period_end is None or _aware(current.current_period_end) > utcnow()):
        raise HTTPException(status_code=409, detail="An existing paid subscription must be resolved before starting another.")
    reference = f"stem-{secrets.token_urlsafe(24)}"
    subscription = Subscription(
        user_id=current_user.user_id,
        plan_id=plan.plan_id,
        provider="safepay",
        status="pending",
        reference=reference,
    )
    db.add(subscription)
    db.commit()  # Persist correlation before contacting Safepay / redirecting.
    try:
        checkout_url = await create_safepay_subscription_checkout(plan, reference)
    except RuntimeError as exc:
        subscription.status = "checkout_failed"
        db.commit()
        message = str(exc)
        code = 503 if "not configured" in message.lower() else 502
        raise HTTPException(status_code=code, detail=message)
    return {"checkout_url": checkout_url, "reference": reference}


@router.post("/manual-claims", status_code=status.HTTP_201_CREATED)
def submit_manual_claim(
    payload: ManualPaymentClaimRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    plan = db.query(SubscriptionPlan).filter_by(plan_id=payload.plan_id, is_active=True, is_public=True, is_free=False).first()
    method = db.query(ManualPaymentMethod).filter_by(payment_method_id=payload.payment_method_id, is_active=True).first()
    if plan is None or method is None:
        raise HTTPException(status_code=404, detail="Plan or payment method is not available")
    if plan.currency != method.currency:
        raise HTTPException(status_code=400, detail="This payment method does not support the selected plan currency")
    reference = " ".join(payload.transaction_reference.split())
    if db.query(ManualPaymentClaim).filter(func.lower(ManualPaymentClaim.transaction_reference) == reference.lower()).first():
        raise HTTPException(status_code=409, detail="This transfer reference has already been submitted")
    claim = ManualPaymentClaim(
        user_id=current_user.user_id,
        plan_id=plan.plan_id,
        payment_method_id=method.payment_method_id,
        transaction_reference=reference,
        amount_minor=plan.price_minor,
        currency=plan.currency,
    )
    db.add(claim)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This transfer reference has already been submitted")
    return {"claim_id": claim.claim_id, "status": claim.status, "message": "Saved for owner reconciliation. Premium access starts only after the transfer is verified."}


@router.post("/subscription/{subscription_id}/cancel")
async def cancel_my_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    subscription = db.query(Subscription).filter_by(
        subscription_id=subscription_id, user_id=current_user.user_id
    ).first()
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if subscription.status != "active":
        raise HTTPException(status_code=409, detail="Only an active subscription can be cancelled")
    if subscription.provider == "safepay":
        if not subscription.provider_subscription_id:
            raise HTTPException(status_code=409, detail="Provider subscription is not linked yet. Contact support before cancelling.")
        try:
            await cancel_safepay_subscription(subscription.provider_subscription_id)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc))
    # Stop future provider renewals while preserving the already-paid period.
    # The lifecycle worker marks access ended when current_period_end arrives.
    if subscription.current_period_end and _aware(subscription.current_period_end) > utcnow():
        subscription.status = "active"
        subscription.cancel_at_period_end = True
    else:
        subscription.status = "cancelled"
        subscription.cancel_at_period_end = False
    subscription.cancelled_at = utcnow()
    db.commit()
    return {"success": True, "status": subscription.status,
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "access_ends_at": subscription.current_period_end or subscription.cancelled_at}


@router.post("/webhooks/safepay", status_code=200)
async def safepay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    if len(raw_body) > 256_000:
        raise HTTPException(status_code=413, detail="Webhook payload too large")
    if not verify_safepay_signature(raw_body, request.headers.get("x-sfpy-signature")):
        raise HTTPException(status_code=401, detail="Invalid payment webhook signature")
    try:
        event = json.loads(raw_body)
        if not isinstance(event, dict):
            raise ValueError("invalid_event")
        event_id, created = queue_verified_event(db, event)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("Verified Safepay webhook payload was invalid (%s)", type(exc).__name__)
        raise HTTPException(status_code=400, detail="Invalid payment webhook payload")
    if created:
        background_tasks.add_task(process_queued_webhook, event_id)
    return {"received": True, "duplicate": not created}
