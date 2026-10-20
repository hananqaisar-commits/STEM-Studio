from __future__ import annotations

import hmac
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.security import decode_token
from backend.app.core.owner_security import is_provisioned_owner
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import OwnerMFACredential, OwnerSessionGrant, User, UserSession

security_scheme = HTTPBearer(auto_error=False)
settings = get_settings()


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve a valid user from the regular bearer token or owner-only cookie."""
    token = credentials.credentials if credentials else request.cookies.get("owner_access")
    request.state.auth_source = "bearer" if credentials else ("owner_cookie" if token else "none")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # The owner cookie is also a browser credential for shared user routes.
    # Protect every unsafe cookie-authenticated request, not only /api/owner.
    if request.state.auth_source == "owner_cookie" and request.method.upper() not in {"GET", "HEAD", "OPTIONS"}:
        _verify_owner_csrf(request)
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")

    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    session_id = payload.get("sid")
    if session_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in again to renew this session")
    try:
        session_id = int(session_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access session")
    db_session = db.query(UserSession).filter(
        UserSession.session_id == session_id,
        UserSession.user_id == user.user_id,
        UserSession.revoked_at.is_(None),
    ).first()
    if db_session is None or _aware(db_session.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session has been revoked or expired")
    request.state.auth_session_id = session_id

    request.state.auth_payload = payload
    request.state.auth_token = token
    return user


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def has_owner_session(user: User, request: Request, db: Session) -> bool:
    """Check the persisted role, MFA grant, and unrevoked short-lived session."""
    payload = getattr(request.state, "auth_payload", {})
    if (
        request.state.auth_source != "owner_cookie"
        or not payload.get("owner_mfa")
        or not user.is_active
        or not user.is_verified
        or not is_provisioned_owner(db, user)
    ):
        return False
    try:
        session_id = int(payload.get("sid"))
    except (TypeError, ValueError):
        return False

    now = datetime.now(timezone.utc)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.session_id == session_id,
            UserSession.user_id == user.user_id,
            UserSession.revoked_at.is_(None),
        )
        .first()
    )
    if session is None or _aware(session.expires_at) <= now:
        return False
    grant = (
        db.query(OwnerSessionGrant)
        .filter(
            OwnerSessionGrant.session_id == session_id,
            OwnerSessionGrant.user_id == user.user_id,
        )
        .first()
    )
    if grant is None:
        return False
    mfa = (
        db.query(OwnerMFACredential)
        .filter(OwnerMFACredential.user_id == user.user_id, OwnerMFACredential.enabled.is_(True))
        .first()
    )
    return mfa is not None


def _verify_owner_csrf(request: Request) -> None:
    expected = request.cookies.get("owner_csrf", "")
    supplied = request.headers.get("x-csrf-token", "")
    if not expected or not supplied or not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner CSRF validation failed")

    origin = request.headers.get("origin")
    if not origin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner request origin is required")
    allowed_origins = set(settings.CORS_ORIGINS)
    if origin not in allowed_origins:
        # Local development can use either loopback spelling without enabling
        # arbitrary origins; production always uses the exact CORS allowlist.
        if not settings.DEBUG or not origin.startswith(("http://localhost:", "http://127.0.0.1:")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner request origin is not allowed")


def require_owner(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Default-deny dependency for every owner-only API route."""
    if not has_owner_session(current_user, request, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access requires an MFA-verified owner session")
    if request.method.upper() not in {"GET", "HEAD", "OPTIONS"}:
        _verify_owner_csrf(request)
    return current_user


def require_recent_owner(
    request: Request,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
) -> User:
    """Require a recent owner MFA verification for high-impact writes."""
    payload = getattr(request.state, "auth_payload", {})
    try:
        session_id = int(payload.get("sid"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner session is invalid")
    grant = (
        db.query(OwnerSessionGrant)
        .filter(OwnerSessionGrant.session_id == session_id, OwnerSessionGrant.user_id == current_user.user_id)
        .first()
    )
    if grant is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner session is invalid")
    verified_at = _aware(grant.mfa_verified_at)
    age_seconds = (datetime.now(timezone.utc) - verified_at).total_seconds()
    if age_seconds < 0 or age_seconds > settings.AUTH_REAUTH_MAX_AGE_MINUTES * 60:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recent owner MFA verification is required. Re-authenticate to continue.",
        )
    return current_user
