"""MFA-gated owner control center endpoints."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.api.dependencies import require_owner, require_recent_owner
from backend.app.api.schemas import (
    OwnerFeatureGrantRequest,
    OwnerFeaturePolicyRequest,
    OwnerUserDeleteRequest,
    OwnerUserStatusRequest,
)
from backend.app.core.feature_access import FEATURE_CATALOG, ensure_feature_catalog
from backend.app.core.owner_security import is_owner_identity, record_admin_event
from backend.app.core.rate_limit import strict
from backend.app.api.routes.stats import invalidate_platform_stats_cache
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    AdminAuditEvent,
    FeaturePolicy,
    LoginAttempt,
    ModuleProgress,
    QuizAttempt,
    SavedSession,
    SupportTicket,
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
    policies = {row.feature_key: row for row in db.query(FeaturePolicy).all()}
    return [
        {
            "feature_key": key,
            "label": label,
            "is_premium": policies[key].is_premium,
            "is_enabled": policies[key].is_enabled,
            "updated_at": policies[key].updated_at,
        }
        for key, label in FEATURE_CATALOG
    ]


@router.patch("/features/{feature_key}")
def update_feature_policy(
    feature_key: str,
    payload: OwnerFeaturePolicyRequest,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    labels = dict(FEATURE_CATALOG)
    if feature_key not in labels:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found")
    ensure_feature_catalog(db)
    policy = db.get(FeaturePolicy, feature_key)
    policy.is_premium = payload.is_premium
    policy.is_enabled = payload.is_enabled
    policy.updated_by_user_id = current_user.user_id
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        action="feature.policy.update",
        details={"feature_key": feature_key, "is_premium": payload.is_premium, "is_enabled": payload.is_enabled},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {"feature_key": feature_key, "label": policy.label, "is_premium": policy.is_premium, "is_enabled": policy.is_enabled}


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
    if payload.feature_key not in dict(FEATURE_CATALOG):
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
