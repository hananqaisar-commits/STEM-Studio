"""MFA-gated owner control center endpoints."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.api.dependencies import require_owner, require_recent_owner
from backend.app.api.schemas import OwnerUserStatusRequest
from backend.app.core.owner_security import is_owner_identity, record_admin_event
from backend.app.core.rate_limit import strict
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import AdminAuditEvent, User, UserSession

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
