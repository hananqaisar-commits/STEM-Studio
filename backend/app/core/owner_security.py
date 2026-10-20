"""Owner role, MFA, cookie, and audit helpers.

Owner privileges are granted only by the private provisioning command and are
checked against the database on every request. No request field or frontend
state can grant the role.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import struct
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.infrastructure.database.models import (
    AdminAuditEvent,
    OwnerAccount,
    OwnerMFACredential,
    OwnerSessionGrant,
    Role,
    User,
)

OWNER_ROLE = "owner"
settings = get_settings()


def user_has_owner_role(user: User) -> bool:
    return any(role.role_name == OWNER_ROLE for role in user.roles)


def is_provisioned_owner(db: Session, user: User) -> bool:
    """Require both the role and singleton server-provisioned owner anchor."""
    if not user_has_owner_role(user):
        return False
    return db.query(OwnerAccount.owner_slot).filter(
        OwnerAccount.owner_slot == 1,
        OwnerAccount.user_id == user.user_id,
    ).first() is not None


def is_owner_identity(db: Session, user: User) -> bool:
    """Recognize either half of the protected owner identity for safety checks."""
    if user_has_owner_role(user):
        return True
    return db.query(OwnerAccount.owner_slot).filter(
        OwnerAccount.owner_slot == 1,
        OwnerAccount.user_id == user.user_id,
    ).first() is not None


def get_owner_role(db: Session) -> Role | None:
    return db.query(Role).filter(Role.role_name == OWNER_ROLE).first()


def derive_mfa_cipher() -> Fernet:
    """Load a dedicated production key; derive a local-only development key."""
    configured = settings.OWNER_MFA_ENCRYPTION_KEY.strip()
    if configured:
        return Fernet(configured.encode("ascii"))
    if not settings.DEBUG:
        raise RuntimeError("OWNER_MFA_ENCRYPTION_KEY must be configured before owner MFA is used")
    material = hashlib.sha256(
        b"stem-studio-owner-totp-v1:" + settings.JWT_SECRET_KEY.encode("utf-8")
    ).digest()
    return Fernet(base64.urlsafe_b64encode(material))


def encrypt_totp_secret(secret: str) -> str:
    return derive_mfa_cipher().encrypt(secret.encode("ascii")).decode("ascii")


def decrypt_totp_secret(encrypted_secret: str) -> str:
    return derive_mfa_cipher().decrypt(encrypted_secret.encode("ascii")).decode("ascii")


def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def totp_uri(secret: str, username: str) -> str:
    label = quote(f"STEM Studio:{username}", safe="")
    return (
        f"otpauth://totp/{label}?secret={secret}&issuer=STEM%20Studio"
        "&algorithm=SHA1&digits=6&period=30"
    )


def totp_counter(secret: str, code: str, now: int | None = None) -> int | None:
    """Return the matching TOTP step within ±1 time step, otherwise None."""
    if len(code) != 6 or not code.isdigit():
        return None
    try:
        padded = secret + "=" * ((8 - len(secret) % 8) % 8)
        key = base64.b32decode(padded, casefold=True)
    except (ValueError, TypeError):
        return None
    current = (int(time.time()) if now is None else now) // 30
    for counter in range(current - 1, current + 2):
        digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
        offset = digest[-1] & 0x0F
        binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
        expected = f"{binary % 1_000_000:06d}"
        if hmac.compare_digest(expected, code):
            return counter
    return None


def consume_owner_totp(db: Session, user_id: int, code: str, now: int | None = None) -> bool:
    """Validate and atomically consume a code once to prevent replay."""
    credential = (
        db.query(OwnerMFACredential)
        .filter(OwnerMFACredential.user_id == user_id, OwnerMFACredential.enabled.is_(True))
        .first()
    )
    if credential is None:
        return False
    try:
        secret = decrypt_totp_secret(credential.encrypted_secret)
    except Exception:
        return False
    counter = totp_counter(secret, code, now)
    if counter is None:
        return False
    updated = (
        db.query(OwnerMFACredential)
        .filter(
            OwnerMFACredential.user_id == user_id,
            OwnerMFACredential.enabled.is_(True),
            OwnerMFACredential.last_used_counter < counter,
        )
        .update({OwnerMFACredential.last_used_counter: counter}, synchronize_session=False)
    )
    return updated == 1


def record_admin_event(
    db: Session,
    *,
    actor_user_id: int | None,
    action: str,
    target_user_id: int | None = None,
    outcome: str = "success",
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Persist an allowlisted, non-secret context for an administrative event."""
    safe_details = details or {}
    db.add(
        AdminAuditEvent(
            actor_user_id=actor_user_id,
            target_user_id=target_user_id,
            action=action[:80],
            outcome=outcome[:16],
            details_json=json.dumps(safe_details, separators=(",", ":"))[:2000],
            ip_address=ip_address[:45] if ip_address else None,
            created_at=datetime.now(timezone.utc),
        )
    )


def owner_session_grant(db: Session, session_id: int, user_id: int) -> OwnerSessionGrant | None:
    return (
        db.query(OwnerSessionGrant)
        .filter(
            OwnerSessionGrant.session_id == session_id,
            OwnerSessionGrant.user_id == user_id,
        )
        .first()
    )
