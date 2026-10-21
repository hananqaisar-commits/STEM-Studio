"""Safepay checkout, verified webhook processing, and billing lifecycle jobs."""

from __future__ import annotations

import calendar
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.email import send_billing_notice_email
from backend.infrastructure.database.database import SessionLocal
from backend.infrastructure.database.models import (
    BillingNotice,
    PaymentRecord,
    PaymentWebhookEvent,
    Subscription,
    SubscriptionPlan,
    User,
)

logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def safepay_hosts() -> tuple[str, str, str]:
    settings = get_settings()
    if settings.SAFEPAY_ENV == "production":
        return "https://api.getsafepay.com", "https://getsafepay.com", "production"
    return "https://sandbox.api.getsafepay.com", "https://sandbox.api.getsafepay.com", "sandbox"


async def create_safepay_subscription_checkout(plan: SubscriptionPlan, reference: str) -> str:
    """Generate a hosted recurring checkout URL; never collect card data here."""
    settings = get_settings()
    if not settings.SAFEPAY_SECRET_KEY:
        raise RuntimeError("Safepay merchant credentials are not configured")
    if not plan.safepay_plan_id:
        raise RuntimeError("This plan has no Safepay recurring plan ID")
    api_host, checkout_host, environment = safepay_hosts()
    timeout = httpx.Timeout(settings.SAFEPAY_TIMEOUT_SECONDS)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{api_host}/client/passport/v1/token",
                headers={"X-SFPY-MERCHANT-SECRET": settings.SAFEPAY_SECRET_KEY},
                json={},
            )
            response.raise_for_status()
            token = response.json().get("data")
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Safepay checkout token request failed (%s)", type(exc).__name__)
        raise RuntimeError("Payment provider could not start checkout. Your subscription remains pending; retry from Billing.") from exc
    if not isinstance(token, str) or not token:
        raise RuntimeError("Payment provider returned an invalid checkout token")
    success_url = f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/billing?checkout=return"
    cancel_url = f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/billing?checkout=cancelled"
    query = urlencode({
        "plan_id": plan.safepay_plan_id,
        "auth_token": token,
        "env": environment,
        "reference": reference,
        "redirect_url": success_url,
        "cancel_url": cancel_url,
    })
    return f"{checkout_host}/checkout/auth/login?{query}"


async def cancel_safepay_subscription(provider_subscription_id: str) -> None:
    """Cancel recurring collection upstream before changing local access state."""
    settings = get_settings()
    if not settings.SAFEPAY_SECRET_KEY:
        raise RuntimeError("Safepay merchant credentials are not configured")
    api_host, _, _ = safepay_hosts()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.SAFEPAY_TIMEOUT_SECONDS)) as client:
            response = await client.post(
                f"{api_host}/subscriptions/v1/{provider_subscription_id}/cancel",
                headers={"X-SFPY-MERCHANT-SECRET": settings.SAFEPAY_SECRET_KEY},
                json={},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("Safepay subscription cancellation failed (%s)", type(exc).__name__)
        raise RuntimeError("The payment provider did not confirm cancellation. No local subscription change was made.") from exc


async def pause_safepay_subscription(provider_subscription_id: str) -> None:
    settings = get_settings()
    api_host, _, _ = safepay_hosts()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.SAFEPAY_TIMEOUT_SECONDS)) as client:
            response = await client.put(
                f"{api_host}/subscriptions/v1/{provider_subscription_id}",
                headers={"X-SFPY-MERCHANT-SECRET": settings.SAFEPAY_SECRET_KEY},
                json={"pause_collection": {"payment_collection_behavior": "MARK_UNCOLLECTIBLE"}},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError("Safepay did not confirm the subscription pause.") from exc


async def resume_safepay_subscription(provider_subscription_id: str) -> None:
    settings = get_settings()
    api_host, _, _ = safepay_hosts()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.SAFEPAY_TIMEOUT_SECONDS)) as client:
            response = await client.put(
                f"{api_host}/subscriptions/v1/{provider_subscription_id}/resumption",
                headers={"X-SFPY-MERCHANT-SECRET": settings.SAFEPAY_SECRET_KEY},
                json={},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError("Safepay did not confirm the subscription resumption.") from exc


def verify_safepay_signature(raw_body: bytes, signature: str | None) -> bool:
    secret = get_settings().SAFEPAY_WEBHOOK_SECRET
    if not secret or not signature:
        return False
    supplied = signature.strip().lower()
    if supplied.startswith("sha256="):
        supplied = supplied[7:]
    if len(supplied) != 64:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, supplied)


def _event_timestamp(value: Any) -> datetime | None:
    if isinstance(value, dict):
        value = value.get("seconds")
    try:
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def add_interval(start: datetime, interval: str) -> datetime:
    if interval == "yearly":
        month = start.month
        year = start.year + 1
        day = min(start.day, calendar.monthrange(year, month)[1])
        return start.replace(year=year, day=day)
    month = start.month + 1
    year = start.year + ((month - 1) // 12)
    month = ((month - 1) % 12) + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return start.replace(year=year, month=month, day=day)


def _event_data(event: dict[str, Any]) -> dict[str, Any]:
    data = event.get("data")
    return data if isinstance(data, dict) else {}


def _find_subscription(db: Session, data: dict[str, Any]) -> Subscription | None:
    reference = data.get("reference")
    if isinstance(reference, str) and reference:
        subscription = db.query(Subscription).filter(
            Subscription.reference == reference,
            Subscription.provider == "safepay",
        ).with_for_update().first()
        if subscription:
            return subscription
    provider_id = data.get("id") or data.get("subscription_id") or data.get("sub_id")
    if isinstance(provider_id, str) and provider_id:
        return db.query(Subscription).filter(
            Subscription.provider_subscription_id == provider_id,
            Subscription.provider == "safepay",
        ).with_for_update().first()
    return None


def process_webhook_event(db: Session, event_row: PaymentWebhookEvent) -> None:
    """Apply one previously signature-verified, durably queued webhook idempotently."""
    if event_row.status == "processed":
        return
    event = json.loads(event_row.payload_summary or "{}")
    event_type = event_row.event_type
    data = _event_data(event)
    subscription = _find_subscription(db, data)
    now = utcnow()

    if event_type == "subscription.created":
        if subscription is None:
            raise ValueError("subscription_reference_not_found")
        provider_id = data.get("id") or data.get("subscription_id") or data.get("sub_id")
        plan_id = data.get("plan_id")
        plan = db.get(SubscriptionPlan, subscription.plan_id)
        if plan is None or (plan_id and plan.safepay_plan_id != plan_id):
            raise ValueError("provider_plan_mismatch")
        subscription.provider_subscription_id = str(provider_id) if provider_id else subscription.provider_subscription_id
        subscription.status = "pending"

    elif event_type in {"subscription.payment.succeeded", "subscription.payment_succeeded"}:
        if subscription is None:
            raise ValueError("subscription_reference_not_found")
        plan = db.get(SubscriptionPlan, subscription.plan_id)
        transaction_id = data.get("transaction_id")
        provider_plan_id = data.get("plan_id")
        if plan is None or not plan.safepay_plan_id or provider_plan_id != plan.safepay_plan_id:
            raise ValueError("provider_plan_mismatch")
        if str(data.get("currency", "")).upper() != plan.currency:
            raise ValueError("payment_currency_mismatch")
        try:
            amount_minor = int(data.get("amount"))
        except (TypeError, ValueError):
            raise ValueError("payment_amount_missing")
        if amount_minor != plan.price_minor:
            raise ValueError("payment_amount_mismatch")
        if not isinstance(transaction_id, str) or not transaction_id:
            raise ValueError("provider_transaction_id_missing")
        if data.get("transaction_status") != "COMPLETE":
            raise ValueError("provider_transaction_not_complete")

        existing = db.query(PaymentRecord).filter(
            PaymentRecord.provider_transaction_id == transaction_id
        ).first()
        if existing is not None:
            # A provider transaction can activate access only once. A failed
            # record for this same subscription may be upgraded to paid, but a
            # replay or cross-subscription reuse must never extend access.
            if existing.subscription_id not in (None, subscription.subscription_id):
                raise ValueError("provider_transaction_reused")
            if existing.status == "paid":
                event_row.status = "processed"
                event_row.processed_at = now
                event_row.attempts = (event_row.attempts or 0) + 1
                event_row.last_error_code = None
                db.commit()
                return
            existing.user_id = subscription.user_id
            existing.plan_id = subscription.plan_id
            existing.subscription_id = subscription.subscription_id
            existing.amount_minor = amount_minor
            existing.currency = plan.currency
            existing.status = "paid"
            existing.payment_method = "safepay"
            existing.external_reference = subscription.reference
            existing.failure_code = None
            existing.paid_at = _event_timestamp(data.get("last_paid_date")) or now
        provider_id = data.get("id") or data.get("subscription_id") or data.get("sub_id")
        if provider_id:
            subscription.provider_subscription_id = str(provider_id)
        if existing is None:
            db.add(PaymentRecord(
                user_id=subscription.user_id,
                plan_id=subscription.plan_id,
                subscription_id=subscription.subscription_id,
                provider="safepay",
                provider_transaction_id=transaction_id,
                amount_minor=amount_minor,
                currency=plan.currency,
                status="paid",
                payment_method="safepay",
                external_reference=subscription.reference,
                paid_at=_event_timestamp(data.get("last_paid_date")) or now,
            ))
        period_start = _event_timestamp(data.get("current_period_start_date"))
        period_end = _event_timestamp(data.get("current_period_end_date"))
        subscription.current_period_start = period_start or now
        subscription.current_period_end = period_end or add_interval(subscription.current_period_start, plan.billing_interval)
        subscription.status = "active"
        subscription.past_due_since = None
        subscription.premium_hold_until = None
        subscription.cancelled_at = None
        subscription.cancel_at_period_end = False
        subscription.last_payment_at = _event_timestamp(data.get("last_paid_date")) or now
        subscription.last_provider_transaction_id = transaction_id

    elif event_type in {"subscription.payment.failed", "subscription.payment_failed"}:
        if subscription is None:
            raise ValueError("subscription_reference_not_found")
        subscription.status = "past_due"
        if subscription.past_due_since is None:
            subscription.past_due_since = now
        transaction_id = data.get("transaction_id")
        plan = db.get(SubscriptionPlan, subscription.plan_id)
        if transaction_id and plan and not db.query(PaymentRecord).filter_by(provider_transaction_id=str(transaction_id)).first():
            db.add(PaymentRecord(
                user_id=subscription.user_id,
                plan_id=subscription.plan_id,
                subscription_id=subscription.subscription_id,
                provider="safepay",
                provider_transaction_id=str(transaction_id),
                amount_minor=int(data.get("amount") or plan.price_minor),
                currency=str(data.get("currency") or plan.currency),
                status="failed",
                payment_method="safepay",
                external_reference=subscription.reference,
                failure_code=str(data.get("transaction_error_code") or "payment_failed")[:64],
            ))

    elif event_type in {"subscription.cancelled", "subscription.canceled"}:
        if subscription is not None:
            subscription.cancelled_at = now
            period_end = _aware(subscription.current_period_end) if subscription.current_period_end else None
            if period_end and period_end > now:
                subscription.status = "active"
                subscription.cancel_at_period_end = True
            else:
                subscription.status = "cancelled"
                subscription.cancel_at_period_end = False

    elif event_type == "subscription.paused":
        if subscription is not None:
            subscription.status = "suspended"
    elif event_type == "subscription.resumed":
        if subscription is not None:
            subscription.status = "active"
    elif event_type in {"subscription.ended"}:
        if subscription is not None:
            subscription.status = "expired"
    # payment.succeeded has no subscription correlation key and is intentionally ignored.

    event_row.status = "processed"
    event_row.processed_at = now
    event_row.attempts = (event_row.attempts or 0) + 1
    event_row.last_error_code = None
    db.commit()


def process_queued_webhook(event_id: str) -> None:
    db = SessionLocal()
    try:
        row = db.query(PaymentWebhookEvent).filter_by(event_id=event_id).with_for_update().first()
        if row is None or row.status == "processed":
            return
        process_webhook_event(db, row)
    except Exception as exc:
        db.rollback()
        row = db.query(PaymentWebhookEvent).filter_by(event_id=event_id).first()
        if row is not None:
            row.attempts = (row.attempts or 0) + 1
            row.last_error_code = type(exc).__name__[:64]
            row.status = "failed" if row.attempts >= 10 else "queued"
            db.commit()
        logger.error("Payment webhook processing failed (%s)", type(exc).__name__)
    finally:
        db.close()


def queue_verified_event(db: Session, event: dict[str, Any]) -> tuple[str, bool]:
    event_id = event.get("token") or event.get("id")
    event_type = event.get("type")
    if not isinstance(event_id, str) or not event_id or not isinstance(event_type, str) or not event_type:
        raise ValueError("Webhook event identity is missing")
    data = _event_data(event)
    # Store only the subscription and payment fields needed for reconciliation.
    compact = {
        "token": event_id,
        "type": event_type,
        "data": {
            key: data.get(key)
            for key in (
                "reference", "id", "subscription_id", "sub_id", "plan_id", "transaction_id",
                "transaction_status", "transaction_error_code", "amount", "currency", "status",
                "current_period_start_date", "current_period_end_date", "last_paid_date",
            )
            if data.get(key) is not None
        },
    }
    serialized = json.dumps(compact, separators=(",", ":"), ensure_ascii=True)
    row = PaymentWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        reference=str(data.get("reference"))[:80] if data.get("reference") else None,
        payload_summary=serialized[:4000],
        status="queued",
    )
    db.add(row)
    try:
        db.commit()
        return event_id, True
    except IntegrityError:
        db.rollback()
        return event_id, False


def run_billing_lifecycle(db: Session, now: datetime | None = None) -> dict[str, int]:
    """Send five daily recovery notices, hold premium for one day, then downgrade."""
    now = now or utcnow()
    processed = {"notices": 0, "held": 0, "expired": 0, "owner_grants_expired": 0, "email_sent": 0}
    candidates = db.query(Subscription).filter(
        Subscription.status.in_(("active", "past_due", "payment_hold")),
        Subscription.provider.in_(("safepay", "manual", "owner")),
    ).all()
    for subscription in candidates:
        end = _aware(subscription.current_period_end) if subscription.current_period_end else None
        if subscription.status == "active" and end and end <= now:
            if subscription.provider == "owner":
                # An owner's complimentary grant simply expires; it has no
                # failed renewal to charge or send payment-recovery notices for.
                subscription.status = "expired"
                subscription.cancelled_at = now
                processed["owner_grants_expired"] += 1
                continue
            if subscription.cancel_at_period_end:
                subscription.status = "cancelled"
                subscription.cancelled_at = now
                continue
            subscription.status = "past_due"
            subscription.past_due_since = end
        if subscription.status == "past_due" and subscription.past_due_since:
            past_due_since = _aware(subscription.past_due_since)
            cycle_key = past_due_since.date().isoformat()
            user = db.get(User, subscription.user_id)
            plan = db.get(SubscriptionPlan, subscription.plan_id)
            if user is None or plan is None:
                continue
            elapsed = max(timedelta(0), now - past_due_since)
            if elapsed < timedelta(days=5):
                day = elapsed.days
                stage = f"reminder-{day + 1}"
                title = "Your premium renewal needs attention"
                message = f"We could not confirm your {plan.name} renewal. Update payment or contact support within {5 - day} day(s) to keep premium access. Your account and saved progress remain available."
            else:
                stage = "premium-hold"
                title = "Premium access is paused for payment"
                message = "Premium access is temporarily paused for one day while we wait for renewal confirmation. Your account and saved progress remain available."
                # Anchor the hold to the renewal failure timestamp. Re-running
                # this job must not move the deadline forward and keep a
                # delinquent subscription alive forever.
                subscription.status = "payment_hold"
                subscription.premium_hold_until = past_due_since + timedelta(days=6)
                processed["held"] += 1
            existing = db.query(BillingNotice.notice_id).filter_by(
                subscription_id=subscription.subscription_id,
                cycle_key=cycle_key,
                stage=stage,
            ).first()
            if existing:
                continue
            notice = BillingNotice(
                subscription_id=subscription.subscription_id,
                user_id=subscription.user_id,
                cycle_key=cycle_key,
                stage=stage,
                title=title,
                message=message,
                email_status="pending",
            )
            db.add(notice)
            db.flush()
            processed["notices"] += 1
        elif subscription.status == "payment_hold":
            hold_until = _aware(subscription.premium_hold_until) if subscription.premium_hold_until else None
            if hold_until is None or now >= hold_until:
                subscription.status = "expired"
                subscription.premium_hold_until = None
                processed["expired"] += 1
                cycle_key = _aware(subscription.past_due_since).date().isoformat() if subscription.past_due_since else now.date().isoformat()
                existing = db.query(BillingNotice.notice_id).filter_by(
                    subscription_id=subscription.subscription_id,
                    cycle_key=cycle_key,
                    stage="downgraded",
                ).first()
                if not existing:
                    db.add(BillingNotice(
                        subscription_id=subscription.subscription_id,
                        user_id=subscription.user_id,
                        cycle_key=cycle_key,
                        stage="downgraded",
                        title="Premium period ended",
                        message="Your account is now on the free plan because renewal was not confirmed. Your account and saved progress are still available.",
                        email_status="pending",
                    ))
                    db.flush()
                    processed["notices"] += 1
    db.commit()

    # Failed email attempts remain durable and are retried on the next
    # lifecycle run. In-app notices remain available regardless of SMTP.
    pending_email_notices = db.query(BillingNotice).filter(
        BillingNotice.email_status.in_(("pending", "failed")),
    ).order_by(BillingNotice.created_at.asc(), BillingNotice.notice_id.asc()).limit(500).all()
    for row in pending_email_notices:
        user = db.get(User, row.user_id)
        if user is None or not user.is_active or not user.is_verified:
            row.email_status = "skipped"
            db.commit()
            continue
        ok = send_billing_notice_email(user.email, row.title, row.message)
        row.email_status = "sent" if ok else "failed"
        row.sent_at = now if ok else None
        db.commit()
        if ok:
            processed["email_sent"] += 1
    return processed


def retry_queued_webhooks(limit: int = 100) -> dict[str, int]:
    db = SessionLocal()
    try:
        ids = [row[0] for row in db.query(PaymentWebhookEvent.event_id).filter(
            PaymentWebhookEvent.status == "queued"
        ).order_by(PaymentWebhookEvent.received_at.asc()).limit(limit).all()]
    finally:
        db.close()
    for event_id in ids:
        process_queued_webhook(event_id)
    return {"processed_attempts": len(ids)}


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
