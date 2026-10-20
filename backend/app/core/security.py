import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from backend.app.core.config import get_settings

settings = get_settings()


# ─── Password Hashing ────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)


# ─── Token Hashing (for storing refresh/reset tokens in DB) ──────────

def hash_token(token: str) -> str:
    """Create a SHA-256 hash of a token for secure DB storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_secure_token() -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(64)


# ─── JWT Token Creation ──────────────────────────────────────────────

def create_access_token(
    user_id: int,
    email: str,
    auth_time: int | None = None,
    *,
    owner_mfa: bool = False,
    session_id: int | None = None,
) -> str:
    """Create a short-lived JWT access token."""
    expire_minutes = (
        settings.OWNER_ACCESS_TOKEN_EXPIRE_MINUTES
        if owner_mfa
        else settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "jti": secrets.token_urlsafe(16),
        "exp": expire,
    }
    if auth_time is not None:
        payload["auth_time"] = auth_time
    if owner_mfa:
        payload["owner_mfa"] = True
    if session_id is not None:
        payload["sid"] = session_id
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    user_id: int,
    remember_me: bool = False,
    auth_time: int | None = None,
    *,
    owner_mfa: bool = False,
) -> str:
    """Create a long-lived JWT refresh token.

    When ``remember_me`` is set the token uses the extended lifetime
    (JWT_REMEMBER_ME_EXPIRE_DAYS) so the session survives browser
    restarts; otherwise the standard shorter lifetime applies.
    """
    if owner_mfa:
        session_started = (
            datetime.fromtimestamp(auth_time, timezone.utc)
            if type(auth_time) is int
            else datetime.now(timezone.utc)
        )
        expire = session_started + timedelta(hours=settings.OWNER_SESSION_MAX_HOURS)
        remember_me = False
    else:
        days = (
            settings.JWT_REMEMBER_ME_EXPIRE_DAYS
            if remember_me
            else settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        )
        expire = datetime.now(timezone.utc) + timedelta(days=days)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "remember": remember_me,
        "jti": secrets.token_urlsafe(16),
        "exp": expire,
    }
    if auth_time is not None:
        payload["auth_time"] = auth_time
    if owner_mfa:
        payload["owner_mfa"] = True
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ─── JWT Token Verification ──────────────────────────────────────────

def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
