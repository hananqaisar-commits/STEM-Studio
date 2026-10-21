"""MFA-gated owner control center endpoints."""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from backend.app.api.dependencies import require_owner, require_recent_owner
from backend.app.api.schemas import (
    AuditDeleteRequest,
    ManualPaymentMethodWriteRequest,
    ManualPaymentReviewRequest,
    OwnerAdConfigurationRequest,
    OwnerFeatureCreateRequest,
    OwnerFeatureGrantRequest,
    OwnerFeaturePolicyRequest,
    OwnerSubscriptionActionRequest,
    OwnerUserDeleteRequest,
    OwnerUserStatusRequest,
    PlanWriteRequest,
)
from backend.app.core.billing_service import (
    add_interval,
    cancel_safepay_subscription,
    pause_safepay_subscription,
    process_queued_webhook,
    resume_safepay_subscription,
    run_billing_lifecycle,
    utcnow,
)
from backend.app.core.feature_access import FEATURE_CATALOG, ensure_default_free_plan, ensure_feature_catalog, is_feature_enabled
from backend.app.core.owner_security import is_owner_identity, record_admin_event
from backend.app.core.rate_limit import strict
from backend.app.api.routes.stats import invalidate_platform_stats_cache
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    AdminAuditEvent,
    Announcement,
    AdConfiguration,
    BillingNotice,
    FeaturePolicy,
    LoginAttempt,
    ManualPaymentClaim,
    ManualPaymentMethod,
    ModuleProgress,
    PaymentRecord,
    PaymentWebhookEvent,
    PlanFeature,
    QuizAttempt,
    SavedSession,
    SupportTicket,
    Subscription,
    SubscriptionPlan,
    TutorLearningProfile,
    User,
    UserFeatureOverride,
    UserPreference,
    UserSession,
    UserStreak,
)

router = APIRouter(prefix="/api/owner", tags=["Owner Control Center"])


@router.get("/overview")
def owner_overview(
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(User.user_id)).scalar() or 0
    enabled = db.query(func.count(User.user_id)).filter(User.is_active.is_(True)).scalar() or 0
    verified = db.query(func.count(User.user_id)).filter(User.is_verified.is_(True)).scalar() or 0
    pending_audit = db.query(func.count(AdminAuditEvent.event_id)).scalar() or 0
    return {
        "registered_users": total,
        "enabled_accounts": enabled,
        "verified_accounts": verified,
        "audit_events": pending_audit,
        "current_owner": current_user.username,
    }


@router.get("/users")
def list_users(
    q: str = Query(default="", max_length=120),
    active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if q.strip():
        pattern = f"%{q.strip().lower()}%"
        query = query.filter(or_(func.lower(User.username).like(pattern), func.lower(User.email).like(pattern)))
    if active is not None:
        query = query.filter(User.is_active.is_(active))
    total = query.count()
    rows = query.order_by(User.created_at.desc(), User.user_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            {
                "user_id": row.user_id,
                "username": row.username,
                "email": row.email,
                "is_active": row.is_active,
                "is_verified": row.is_verified,
                "is_owner": is_owner_identity(db, row),
                "created_at": row.created_at,
                "active_sessions": db.query(func.count(UserSession.session_id)).filter(
                    UserSession.user_id == row.user_id,
                    UserSession.revoked_at.is_(None),
                    UserSession.expires_at > datetime.now(timezone.utc),
                ).scalar() or 0,
            }
            for row in rows
        ],
        "page": page,
        "page_size": page_size,
        "total": total,
    }


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Owner view of account and learning records; never returns credentials or tokens."""
    target = db.query(User).filter(User.user_id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).order_by(
        QuizAttempt.created_at.desc(), QuizAttempt.attempt_id.desc()
    ).limit(100).all()
    all_quiz_count = db.query(func.count(QuizAttempt.attempt_id)).filter(QuizAttempt.user_id == user_id).scalar() or 0
    correct_count = db.query(func.count(QuizAttempt.attempt_id)).filter(
        QuizAttempt.user_id == user_id, QuizAttempt.is_correct.is_(True)
    ).scalar() or 0
    progress_rows = db.query(ModuleProgress).filter(ModuleProgress.user_id == user_id).order_by(
        ModuleProgress.module_name.asc()
    ).all()
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    tutor_profile = db.query(TutorLearningProfile).filter(TutorLearningProfile.user_id == user_id).first()
    preference = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    overrides = db.query(UserFeatureOverride).filter(UserFeatureOverride.user_id == user_id).all()
    sessions = db.query(UserSession).filter(UserSession.user_id == user_id).order_by(
        UserSession.created_at.desc()
    ).limit(30).all()
    saved_sessions = db.query(SavedSession).filter(SavedSession.user_id == user_id).order_by(
        SavedSession.created_at.desc()
    ).limit(50).all()
    tickets = db.query(SupportTicket).filter(SupportTicket.user_id == user_id).order_by(
        SupportTicket.created_at.desc()
    ).limit(50).all()
    login_attempts = db.query(LoginAttempt).filter(LoginAttempt.user_id == user_id).order_by(
        LoginAttempt.attempted_at.desc()
    ).limit(20).all()

    return {
        "profile": {
            "user_id": target.user_id,
            "username": target.username,
            "email": target.email,
            "first_name": target.first_name,
            "last_name": target.last_name,
            "phone": target.phone,
            "is_active": target.is_active,
            "is_verified": target.is_verified,
            "is_owner": is_owner_identity(db, target),
            "created_at": target.created_at,
            "updated_at": target.updated_at,
        },
        "learning": {
            "quiz_count": all_quiz_count,
            "correct_quiz_count": correct_count,
            "quiz_accuracy": round(correct_count * 100 / all_quiz_count, 1) if all_quiz_count else 0,
            "current_streak": streak.current_streak if streak else 0,
            "highest_streak": streak.highest_streak if streak else 0,
            "modules": [
                {
                    "module_name": row.module_name,
                    "completed_algorithms": row.completed_algorithms,
                    "completion_percentage": row.completion_percentage,
                    "updated_at": row.updated_at,
                }
                for row in progress_rows
            ],
            "recent_quiz_attempts": [
                {
                    "module_name": row.module_name,
                    "algorithm_id": row.algorithm_id,
                    "question_prompt": row.question_prompt,
                    "selected_option": row.selected_option,
                    "is_correct": row.is_correct,
                    "created_at": row.created_at,
                }
                for row in quizzes
            ],
            "saved_sessions": [
                {
                    "session_id": row.session_id,
                    "title": row.title,
                    "module_name": row.module_name,
                    "algorithm_id": row.algorithm_id,
                    "dataset_json": row.dataset_json,
                    "created_at": row.created_at,
                }
                for row in saved_sessions
            ],
        },
        "preferences": {
            "theme": preference.theme if preference else None,
            "marketing_email_opt_in": bool(preference.marketing_email_opt_in) if preference else False,
        },
        "tutor_learning_profile": {
            "response_style": tutor_profile.response_style,
            "helpful_count": tutor_profile.helpful_count,
            "needs_detail_count": tutor_profile.needs_detail_count,
            "updated_at": tutor_profile.updated_at,
        } if tutor_profile else None,
        "feature_overrides": [
            {
                "feature_key": row.feature_key,
                "granted": row.granted,
                "expires_at": row.expires_at,
                "updated_at": row.updated_at,
            }
            for row in overrides
        ],
        "sessions": [
            {"created_at": row.created_at, "expires_at": row.expires_at, "revoked_at": row.revoked_at}
            for row in sessions
        ],
        "support_tickets": [
            {
                "ticket_id": row.ticket_id,
                "category": row.category,
                "subject": row.subject,
                "message": row.message,
                "status": row.status,
                "owner_reply": row.owner_reply,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in tickets
        ],
        "recent_sign_in_activity": [
            {"attempted_at": row.attempted_at, "successful": row.successful}
            for row in login_attempts
        ],
    }


@router.get("/features")
def list_feature_policies(
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    ensure_feature_catalog(db)
    db.commit()
    rows = db.query(FeaturePolicy).order_by(FeaturePolicy.is_archived.asc(), FeaturePolicy.label.asc()).all()
    return [
        {
            "feature_key": row.feature_key,
            "label": row.label,
            "description": row.description,
            "is_premium": row.is_premium,
            "is_enabled": is_feature_enabled(row),
            "is_archived": row.is_archived,
            "disabled_until": row.disabled_until if not is_feature_enabled(row) else None,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.post("/features", status_code=status.HTTP_201_CREATED)
def create_feature_policy(
    payload: OwnerFeatureCreateRequest,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    if db.get(FeaturePolicy, payload.feature_key):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That feature key already exists")
    policy = FeaturePolicy(
        feature_key=payload.feature_key,
        label=payload.label.strip(),
        description=payload.description.strip(),
        is_premium=payload.is_premium,
        is_enabled=payload.is_enabled,
        is_archived=False,
        updated_by_user_id=current_user.user_id,
    )
    db.add(policy)
    db.flush()
    if not policy.is_premium:
        free_plan = ensure_default_free_plan(db)
        db.add(PlanFeature(plan_id=free_plan.plan_id, feature_key=policy.feature_key, included=True))
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        action="feature.create",
        details={"feature_key": policy.feature_key, "is_premium": policy.is_premium},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {"feature_key": policy.feature_key, "label": policy.label, "description": policy.description, "is_premium": policy.is_premium, "is_enabled": policy.is_enabled, "is_archived": False}


@router.patch("/features/{feature_key}")
def update_feature_policy(
    feature_key: str,
    payload: OwnerFeaturePolicyRequest,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    ensure_feature_catalog(db)
    policy = db.get(FeaturePolicy, feature_key)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found")
    policy.is_premium = payload.is_premium
    policy.is_enabled = payload.is_enabled
    policy.is_archived = payload.is_archived
    policy.disabled_until = None if payload.is_enabled else payload.disabled_until
    policy.updated_by_user_id = current_user.user_id
    free_plan = ensure_default_free_plan(db)
    free_membership = db.get(PlanFeature, (free_plan.plan_id, policy.feature_key))
    if payload.is_premium and free_membership is not None:
        db.delete(free_membership)
    elif not payload.is_premium and free_membership is None:
        db.add(PlanFeature(plan_id=free_plan.plan_id, feature_key=policy.feature_key, included=True))
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        action="feature.policy.update",
        details={"feature_key": feature_key, "is_premium": payload.is_premium, "is_enabled": payload.is_enabled},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {"feature_key": feature_key, "label": policy.label, "description": policy.description, "is_premium": policy.is_premium, "is_enabled": policy.is_enabled, "is_archived": policy.is_archived}


@router.delete("/features/{feature_key}")
def archive_feature_policy(
    feature_key: str,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    policy = db.get(FeaturePolicy, feature_key)
    if policy is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    policy.is_enabled = False
    policy.is_archived = True
    policy.updated_by_user_id = current_user.user_id
    record_admin_event(db, actor_user_id=current_user.user_id, action="feature.archive", details={"feature_key": feature_key}, ip_address=request.client.host if request.client else None)
    db.commit()
    return {"feature_key": feature_key, "is_archived": True, "is_enabled": False}


@router.put("/users/{user_id}/features")
def set_user_feature_override(
    user_id: int,
    payload: OwnerFeatureGrantRequest,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    target = db.query(User).filter(User.user_id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if is_owner_identity(db, target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access is managed by the restricted provisioning process")
    feature_policy = db.get(FeaturePolicy, payload.feature_key)
    if feature_policy is None or feature_policy.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found")
    ensure_feature_catalog(db)
    override = db.get(UserFeatureOverride, (target.user_id, payload.feature_key))
    if override is None:
        override = UserFeatureOverride(
            user_id=target.user_id,
            feature_key=payload.feature_key,
            granted=payload.granted,
            expires_at=payload.expires_at,
            updated_by_user_id=current_user.user_id,
        )
        db.add(override)
    else:
        override.granted = payload.granted
        override.expires_at = payload.expires_at
        override.updated_by_user_id = current_user.user_id
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        target_user_id=target.user_id,
        action="user.feature.override",
        details={"feature_key": payload.feature_key, "granted": payload.granted, "expires_at": payload.expires_at.isoformat() if payload.expires_at else None},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {"user_id": target.user_id, "feature_key": payload.feature_key, "granted": override.granted, "expires_at": override.expires_at}


@router.patch("/users/{user_id}/status")
def set_user_status(
    user_id: int,
    payload: OwnerUserStatusRequest,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    target = db.query(User).filter(User.user_id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if is_owner_identity(db, target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner accounts can only be changed through the restricted server-side recovery process")
    if target.user_id == current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot suspend your own owner account")

    target.is_active = payload.is_active
    if not payload.is_active:
        now = datetime.now(timezone.utc)
        db.query(UserSession).filter(
            UserSession.user_id == target.user_id,
            UserSession.revoked_at.is_(None),
        ).update({"revoked_at": now}, synchronize_session=False)
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        target_user_id=target.user_id,
        action="user.status.update",
        details={"is_active": payload.is_active},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    invalidate_platform_stats_cache()
    return {"user_id": target.user_id, "is_active": target.is_active}


@router.post("/users/{user_id}/revoke-sessions")
def revoke_user_sessions(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    target = db.query(User).filter(User.user_id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if is_owner_identity(db, target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner sessions cannot be revoked from this user-management action")
    now = datetime.now(timezone.utc)
    affected = db.query(UserSession).filter(
        UserSession.user_id == target.user_id,
        UserSession.revoked_at.is_(None),
    ).update({"revoked_at": now}, synchronize_session=False)
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        target_user_id=target.user_id,
        action="user.sessions.revoke",
        details={"sessions_revoked": affected},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {"user_id": target.user_id, "sessions_revoked": affected}


@router.delete("/users/{user_id}")
def delete_managed_user(
    user_id: int,
    payload: OwnerUserDeleteRequest,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Permanently remove a learner after typed confirmation and recent MFA."""
    target = db.query(User).filter(User.user_id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if is_owner_identity(db, target):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner accounts cannot be deleted from the user manager")
    if payload.expected_username != target.username:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Type the account username exactly to confirm deletion")

    username = target.username
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        target_user_id=target.user_id,
        action="user.account.delete",
        details={"username": username, "permanent": True},
        ip_address=request.client.host if request.client else None,
    )
    db.delete(target)
    db.commit()
    invalidate_platform_stats_cache()
    return {"deleted": True, "username": username}


@router.get("/audit")
def list_audit_events(
    limit: int = Query(default=100, ge=1, le=200),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    rows = db.query(AdminAuditEvent).order_by(AdminAuditEvent.created_at.desc(), AdminAuditEvent.event_id.desc()).limit(limit).all()
    user_ids = {uid for row in rows for uid in (row.actor_user_id, row.target_user_id) if uid is not None}
    users = {row.user_id: row.username for row in db.query(User).filter(User.user_id.in_(user_ids)).all()} if user_ids else {}
    result = []
    for row in rows:
        try:
            details = json.loads(row.details_json or "{}")
        except (ValueError, TypeError):
            details = {}
        result.append({
            "event_id": row.event_id,
            "actor": users.get(row.actor_user_id, "Deleted account"),
            "target": users.get(row.target_user_id),
            "action": row.action,
            "outcome": row.outcome,
            "details": details,
            "created_at": row.created_at,
        })
    return result


def _admin_plan_json(db: Session, plan: SubscriptionPlan) -> dict:
    feature_keys = [row[0] for row in db.query(PlanFeature.feature_key).filter(
        PlanFeature.plan_id == plan.plan_id, PlanFeature.included.is_(True)
    ).order_by(PlanFeature.feature_key.asc()).all()]
    active_subscribers = db.query(func.count(Subscription.subscription_id)).filter(
        Subscription.plan_id == plan.plan_id,
        Subscription.status.in_(("active", "past_due", "payment_hold", "pending", "suspended")),
    ).scalar() or 0
    return {
        "plan_id": plan.plan_id, "code": plan.code, "name": plan.name,
        "description": plan.description, "price_minor": plan.price_minor,
        "list_price_minor": plan.list_price_minor or plan.price_minor,
        "discount_label": plan.discount_label, "currency": plan.currency,
        "billing_interval": plan.billing_interval, "is_free": plan.is_free,
        "is_active": plan.is_active, "is_public": plan.is_public,
        "is_featured": plan.is_featured, "safepay_plan_id": plan.safepay_plan_id,
        "feature_keys": feature_keys, "active_subscribers": active_subscribers,
    }


@router.get("/billing/plans")
def owner_list_plans(
    current_user: User = Depends(require_owner), db: Session = Depends(get_db),
):
    ensure_feature_catalog(db)
    db.commit()
    rows = db.query(SubscriptionPlan).order_by(SubscriptionPlan.is_free.desc(), SubscriptionPlan.price_minor.asc()).all()
    return [_admin_plan_json(db, row) for row in rows]


@router.post("/billing/plans", status_code=status.HTTP_201_CREATED)
def owner_create_plan(
    payload: PlanWriteRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    ensure_feature_catalog(db)
    if db.query(SubscriptionPlan).filter_by(code=payload.code).first():
        raise HTTPException(status_code=409, detail="That plan code already exists")
    if payload.is_free and db.query(SubscriptionPlan).filter_by(is_free=True).first():
        raise HTTPException(status_code=409, detail="The Free package already exists; edit it instead")
    policies = {row.feature_key: row for row in db.query(FeaturePolicy).filter(
        FeaturePolicy.feature_key.in_(payload.feature_keys or ["__none__"]),
        FeaturePolicy.is_archived.is_(False),
    ).all()}
    if len(policies) != len(payload.feature_keys):
        raise HTTPException(status_code=422, detail="Every plan feature must be registered and enabled in the feature catalog")
    plan = SubscriptionPlan(
        code=payload.code, name=payload.name.strip(), description=payload.description.strip(),
        price_minor=payload.price_minor, list_price_minor=payload.list_price_minor or payload.price_minor,
        discount_label=(payload.discount_label.strip() if payload.discount_label else None),
        currency=payload.currency, billing_interval=payload.billing_interval,
        is_free=payload.is_free, is_active=payload.is_active, is_public=payload.is_public,
        is_featured=payload.is_featured, safepay_plan_id=payload.safepay_plan_id,
        created_by_user_id=current_user.user_id,
    )
    db.add(plan)
    db.flush()
    db.add_all(PlanFeature(plan_id=plan.plan_id, feature_key=key, included=True) for key in payload.feature_keys)
    record_admin_event(db, actor_user_id=current_user.user_id, action="billing.plan.create",
        details={"plan_id": plan.plan_id, "code": plan.code, "price_minor": plan.price_minor, "interval": plan.billing_interval},
        ip_address=request.client.host if request.client else None)
    db.commit()
    return _admin_plan_json(db, plan)


@router.patch("/billing/plans/{plan_id}")
def owner_update_plan(
    plan_id: int, payload: PlanWriteRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    plan = db.query(SubscriptionPlan).filter_by(plan_id=plan_id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    if payload.code != plan.code and db.query(SubscriptionPlan).filter_by(code=payload.code).first():
        raise HTTPException(status_code=409, detail="That plan code already exists")
    active_count = db.query(func.count(Subscription.subscription_id)).filter(
        Subscription.plan_id == plan_id,
        Subscription.status.in_(("active", "past_due", "payment_hold", "pending", "suspended")),
    ).scalar() or 0
    pending_claims = db.query(func.count(ManualPaymentClaim.claim_id)).filter(
        ManualPaymentClaim.plan_id == plan_id,
        ManualPaymentClaim.status == "pending",
    ).scalar() or 0
    protected_count = active_count + pending_claims
    terms_changed = (
        payload.price_minor != plan.price_minor
        or payload.currency != plan.currency
        or payload.billing_interval != plan.billing_interval
    )
    if plan.is_free != payload.is_free:
        raise HTTPException(status_code=409, detail="A plan cannot switch between Free and paid after creation. Create a separate plan instead.")
    if terms_changed and plan.safepay_plan_id and payload.safepay_plan_id == plan.safepay_plan_id:
        raise HTTPException(status_code=409, detail="Create a matching new Safepay recurring plan ID before changing the charged price, currency, or interval.")
    if protected_count and (terms_changed or payload.safepay_plan_id != plan.safepay_plan_id):
        raise HTTPException(status_code=409, detail="This plan has subscribers or pending transfer claims. Create a new plan version so existing access, claims, and renewals keep their original terms.")
    existing_feature_keys = {row.feature_key for row in db.query(PlanFeature).filter_by(plan_id=plan_id).all() if row.included}
    if protected_count and set(payload.feature_keys) != existing_feature_keys:
        raise HTTPException(status_code=409, detail="This plan has subscribers or pending transfer claims. Create a new plan version to change included features; existing access keeps what was purchased.")
    if plan.is_free and not payload.is_free:
        raise HTTPException(status_code=409, detail="The shared Free package cannot be converted into a paid plan")
    policies = {row.feature_key: row for row in db.query(FeaturePolicy).filter(
        FeaturePolicy.feature_key.in_(payload.feature_keys or ["__none__"]), FeaturePolicy.is_archived.is_(False)
    ).all()}
    if len(policies) != len(payload.feature_keys):
        raise HTTPException(status_code=422, detail="Every plan feature must be registered and available")
    plan.code = payload.code
    plan.name = payload.name.strip()
    plan.description = payload.description.strip()
    plan.price_minor = payload.price_minor
    plan.list_price_minor = payload.list_price_minor or payload.price_minor
    plan.discount_label = payload.discount_label.strip() if payload.discount_label else None
    plan.currency = payload.currency
    plan.billing_interval = payload.billing_interval
    plan.is_free = payload.is_free
    plan.is_active = payload.is_active
    plan.is_public = payload.is_public
    plan.is_featured = payload.is_featured
    plan.safepay_plan_id = payload.safepay_plan_id
    db.query(PlanFeature).filter(PlanFeature.plan_id == plan.plan_id).delete(synchronize_session=False)
    db.add_all(PlanFeature(plan_id=plan.plan_id, feature_key=key, included=True) for key in payload.feature_keys)
    record_admin_event(db, actor_user_id=current_user.user_id, action="billing.plan.update",
        details={"plan_id": plan.plan_id, "code": plan.code, "price_minor": plan.price_minor, "interval": plan.billing_interval},
        ip_address=request.client.host if request.client else None)
    db.commit()
    return _admin_plan_json(db, plan)


@router.delete("/billing/plans/{plan_id}")
def owner_retire_plan(
    plan_id: int, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    plan = db.query(SubscriptionPlan).filter_by(plan_id=plan_id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.is_free:
        raise HTTPException(status_code=409, detail="The Free package cannot be deleted; control free access in the feature registry.")
    plan.is_active = False
    plan.is_public = False
    record_admin_event(db, actor_user_id=current_user.user_id, action="billing.plan.retire",
        details={"plan_id": plan_id, "code": plan.code}, ip_address=request.client.host if request.client else None)
    db.commit()
    return {"plan_id": plan_id, "retired": True, "existing_subscriptions_preserved": True}


@router.get("/billing/manual-methods")
def owner_list_manual_methods(current_user: User = Depends(require_owner), db: Session = Depends(get_db)):
    return [{"payment_method_id": row.payment_method_id, "provider_key": row.provider_key, "label": row.label,
        "account_name": row.account_name, "account_identifier": row.account_identifier, "instructions": row.instructions,
        "currency": row.currency, "is_active": row.is_active}
        for row in db.query(ManualPaymentMethod).order_by(ManualPaymentMethod.payment_method_id.desc()).all()]


@router.post("/billing/manual-methods", status_code=status.HTTP_201_CREATED)
def owner_create_manual_method(
    payload: ManualPaymentMethodWriteRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    method = ManualPaymentMethod(**payload.model_dump(), updated_by_user_id=current_user.user_id)
    db.add(method)
    db.flush()
    record_admin_event(db, actor_user_id=current_user.user_id, action="billing.manual_method.create",
        details={"payment_method_id": method.payment_method_id, "provider": method.provider_key}, ip_address=request.client.host if request.client else None)
    db.commit()
    return {"payment_method_id": method.payment_method_id, **payload.model_dump()}


@router.patch("/billing/manual-methods/{payment_method_id}")
def owner_update_manual_method(
    payment_method_id: int, payload: ManualPaymentMethodWriteRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    method = db.query(ManualPaymentMethod).filter_by(payment_method_id=payment_method_id).first()
    if method is None:
        raise HTTPException(status_code=404, detail="Payment method not found")
    for key, value in payload.model_dump().items():
        setattr(method, key, value)
    method.updated_by_user_id = current_user.user_id
    record_admin_event(db, actor_user_id=current_user.user_id, action="billing.manual_method.update",
        details={"payment_method_id": payment_method_id, "is_active": method.is_active}, ip_address=request.client.host if request.client else None)
    db.commit()
    return {"payment_method_id": payment_method_id, **payload.model_dump()}


@router.delete("/billing/manual-methods/{payment_method_id}")
def owner_retire_manual_method(
    payment_method_id: int, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    method = db.query(ManualPaymentMethod).filter_by(payment_method_id=payment_method_id).first()
    if method is None:
        raise HTTPException(status_code=404, detail="Payment method not found")
    method.is_active = False
    method.updated_by_user_id = current_user.user_id
    record_admin_event(db, actor_user_id=current_user.user_id, action="billing.manual_method.retire",
        details={"payment_method_id": payment_method_id, "provider": method.provider_key},
        ip_address=request.client.host if request.client else None)
    db.commit()
    return {"payment_method_id": payment_method_id, "retired": True}


@router.get("/billing/manual-claims")
def owner_list_manual_claims(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(require_owner), db: Session = Depends(get_db),
):
    rows = db.query(ManualPaymentClaim).order_by(ManualPaymentClaim.created_at.desc(), ManualPaymentClaim.claim_id.desc()).limit(limit).all()
    result = []
    for claim in rows:
        target = db.get(User, claim.user_id)
        plan = db.get(SubscriptionPlan, claim.plan_id)
        method = db.get(ManualPaymentMethod, claim.payment_method_id)
        result.append({"claim_id": claim.claim_id, "user_id": claim.user_id,
            "username": target.username if target else "Deleted account", "email": target.email if target else "",
            "plan_id": claim.plan_id, "plan_name": plan.name if plan else "Archived plan",
            "amount_minor": claim.amount_minor, "currency": claim.currency,
            "payment_method": method.label if method else "Archived method", "transaction_reference": claim.transaction_reference,
            "status": claim.status, "owner_note": claim.owner_note, "created_at": claim.created_at})
    return result


@router.post("/billing/manual-claims/{claim_id}/review")
def owner_review_manual_claim(
    claim_id: int, payload: ManualPaymentReviewRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    claim = db.query(ManualPaymentClaim).filter_by(claim_id=claim_id).with_for_update().first()
    if claim is None:
        raise HTTPException(status_code=404, detail="Transfer claim not found")
    if claim.status != "pending":
        raise HTTPException(status_code=409, detail="This claim has already been reviewed")
    target = db.get(User, claim.user_id)
    plan = db.get(SubscriptionPlan, claim.plan_id)
    if target is None or plan is None or plan.is_free:
        raise HTTPException(status_code=409, detail="The account or plan is no longer eligible")
    claim.owner_note = payload.owner_note.strip() or None
    claim.reviewed_by_user_id = current_user.user_id
    claim.reviewed_at = datetime.now(timezone.utc)
    if payload.approve:
        existing = db.query(Subscription).filter(
            Subscription.user_id == target.user_id,
            Subscription.status.in_(("active", "past_due", "payment_hold")),
        ).with_for_update().first()
        if existing and (existing.current_period_end is None or existing.current_period_end.replace(tzinfo=existing.current_period_end.tzinfo or timezone.utc) > datetime.now(timezone.utc)):
            raise HTTPException(status_code=409, detail="This learner already has an active subscription. Resolve it before approving another transfer.")
        payment = PaymentRecord(user_id=target.user_id, plan_id=plan.plan_id, provider="manual",
            provider_transaction_id=None, amount_minor=claim.amount_minor, currency=claim.currency,
            status="paid", payment_method=claim.payment_method_id and (db.get(ManualPaymentMethod, claim.payment_method_id).provider_key),
            external_reference=claim.transaction_reference, reviewed_by_user_id=current_user.user_id, paid_at=datetime.now(timezone.utc))
        db.add(payment)
        db.flush()
        now = datetime.now(timezone.utc)
        subscription = Subscription(user_id=target.user_id, plan_id=plan.plan_id, provider="manual", status="active",
            reference=f"manual-{claim.claim_id}-{secrets.token_urlsafe(14)}", current_period_start=now,
            current_period_end=add_interval(now, plan.billing_interval), last_payment_at=now)
        db.add(subscription)
        db.flush()
        payment.subscription_id = subscription.subscription_id
        claim.payment_id = payment.payment_id
        claim.status = "approved"
    else:
        claim.status = "rejected"
    record_admin_event(db, actor_user_id=current_user.user_id, target_user_id=target.user_id,
        action="billing.manual_claim.review", details={"claim_id": claim.claim_id, "approved": payload.approve,
        "plan_id": plan.plan_id, "transaction_reference": claim.transaction_reference},
        ip_address=request.client.host if request.client else None)
    db.commit()
    return {"claim_id": claim.claim_id, "status": claim.status, "owner_note": claim.owner_note}


@router.get("/billing/subscriptions")
def owner_list_subscriptions(
    limit: int = Query(default=100, ge=1, le=500), current_user: User = Depends(require_owner), db: Session = Depends(get_db),
):
    rows = db.query(Subscription).order_by(Subscription.created_at.desc(), Subscription.subscription_id.desc()).limit(limit).all()
    return [{"subscription_id": row.subscription_id, "user_id": row.user_id,
        "username": (db.get(User, row.user_id).username if db.get(User, row.user_id) else "Deleted account"),
        "email": (db.get(User, row.user_id).email if db.get(User, row.user_id) else ""),
        "plan_id": row.plan_id, "plan_name": (db.get(SubscriptionPlan, row.plan_id).name if db.get(SubscriptionPlan, row.plan_id) else "Archived plan"),
        "provider": row.provider, "status": row.status, "period_end": row.current_period_end,
        "created_at": row.created_at, "provider_subscription_id": row.provider_subscription_id}
        for row in rows]


@router.post("/users/{user_id}/subscription")
async def owner_subscription_action(
    user_id: int, payload: OwnerSubscriptionActionRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    target = db.get(User, user_id)
    if target is None or is_owner_identity(db, target):
        raise HTTPException(status_code=404, detail="Learner account not found")
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id, Subscription.status.in_(("active", "past_due", "payment_hold", "suspended"))
    ).order_by(Subscription.current_period_end.desc().nullslast()).first()
    if payload.action == "grant":
        plan = db.query(SubscriptionPlan).filter_by(plan_id=payload.plan_id, is_active=True).first() if payload.plan_id else None
        if plan is None or plan.is_free:
            raise HTTPException(status_code=422, detail="Choose an active paid plan to grant")
        if subscription and subscription.status in {"active", "past_due", "payment_hold"}:
            raise HTTPException(status_code=409, detail="End or resolve the current subscription before granting a different plan")
        now = datetime.now(timezone.utc)
        subscription = Subscription(user_id=user_id, plan_id=plan.plan_id, provider="owner", status="active",
            reference=f"owner-{secrets.token_urlsafe(24)}", current_period_start=now,
            current_period_end=now + timedelta(days=payload.duration_days or 30), last_payment_at=now)
        db.add(subscription)
    elif subscription is None:
        raise HTTPException(status_code=404, detail="No current subscription was found")
    elif payload.action == "suspend":
        if subscription.provider == "safepay":
            if not subscription.provider_subscription_id:
                raise HTTPException(status_code=409, detail="This Safepay subscription is not linked yet")
            try:
                await pause_safepay_subscription(subscription.provider_subscription_id)
            except RuntimeError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
        subscription.status = "suspended"
    elif payload.action == "restore":
        if subscription.provider == "safepay" and subscription.provider_subscription_id:
            try:
                await resume_safepay_subscription(subscription.provider_subscription_id)
            except RuntimeError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
        subscription.status = "active"
        if subscription.current_period_end is None or subscription.current_period_end.replace(tzinfo=subscription.current_period_end.tzinfo or timezone.utc) <= datetime.now(timezone.utc):
            now = datetime.now(timezone.utc)
            plan = db.get(SubscriptionPlan, subscription.plan_id)
            subscription.current_period_start = now
            subscription.current_period_end = now + timedelta(days=payload.duration_days or 30)
        subscription.past_due_since = None
        subscription.premium_hold_until = None
    elif payload.action == "end":
        if subscription.provider == "safepay" and subscription.provider_subscription_id:
            try:
                await cancel_safepay_subscription(subscription.provider_subscription_id)
            except RuntimeError as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
        subscription.status = "cancelled"
        subscription.cancelled_at = datetime.now(timezone.utc)
    record_admin_event(db, actor_user_id=current_user.user_id, target_user_id=user_id,
        action=f"billing.subscription.{payload.action}",
        details={"subscription_id": subscription.subscription_id if subscription.subscription_id else None,
            "plan_id": subscription.plan_id, "provider": subscription.provider, "status": subscription.status},
        ip_address=request.client.host if request.client else None)
    db.commit()
    return {"user_id": user_id, "subscription_id": subscription.subscription_id, "status": subscription.status,
        "plan_id": subscription.plan_id, "period_end": subscription.current_period_end}


@router.get("/billing/ads")
def owner_get_ad_settings(current_user: User = Depends(require_owner), db: Session = Depends(get_db)):
    row = db.get(AdConfiguration, 1)
    return {"is_enabled": bool(row.is_enabled) if row else False, "publisher_id": row.publisher_id if row else "",
        "landing_slot_id": row.landing_slot_id if row else "", "learner_slot_id": row.learner_slot_id if row else ""}


@router.put("/billing/ads")
def owner_update_ad_settings(
    payload: OwnerAdConfigurationRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    if payload.is_enabled and not (payload.publisher_id and payload.landing_slot_id and payload.learner_slot_id):
        raise HTTPException(status_code=422, detail="Publisher ID and both approved ad slot IDs are required before enabling ads")
    row = db.get(AdConfiguration, 1)
    if row is None:
        row = AdConfiguration(config_id=1)
        db.add(row)
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    row.updated_by_user_id = current_user.user_id
    record_admin_event(db, actor_user_id=current_user.user_id, action="billing.ads.update",
        details={"is_enabled": row.is_enabled, "publisher_configured": bool(row.publisher_id)},
        ip_address=request.client.host if request.client else None)
    db.commit()
    return {"is_enabled": row.is_enabled, "publisher_id": row.publisher_id,
        "landing_slot_id": row.landing_slot_id, "learner_slot_id": row.learner_slot_id}


@router.delete("/audit")
def delete_audit_events(
    payload: AuditDeleteRequest, request: Request,
    current_user: User = Depends(require_recent_owner), db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    query = db.query(AdminAuditEvent)
    clauses = []
    if payload.delete_all:
        clauses = []
    elif payload.event_ids:
        clauses.append(AdminAuditEvent.event_id.in_(payload.event_ids))
    if not payload.delete_all and payload.older_than_days is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=payload.older_than_days)
        clauses.append(AdminAuditEvent.created_at < cutoff)
    if clauses:
        query = query.filter(and_(*clauses))
    deleted = query.delete(synchronize_session=False)
    record_admin_event(db, actor_user_id=current_user.user_id, action="audit.retention.delete",
        details={"deleted_count": deleted, "older_than_days": payload.older_than_days, "selected_count": len(payload.event_ids), "delete_all": payload.delete_all},
        ip_address=request.client.host if request.client else None)
    db.commit()
    return {"deleted": deleted}
