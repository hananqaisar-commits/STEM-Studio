"""Restricted operational commands for the STEM Studio backend."""

from __future__ import annotations

import argparse
import getpass
import logging
import re
import sys
from datetime import datetime, timezone

from sqlalchemy import func

from backend.app.core.owner_security import encrypt_totp_secret, generate_totp_secret, record_admin_event, totp_uri
from backend.app.core.security import hash_password, verify_password
from backend.infrastructure.database.database import SessionLocal, engine
from backend.infrastructure.database import models  # noqa: F401 - register model metadata
from backend.infrastructure.database.models import OwnerAccount, OwnerMFACredential, Role, User, UserSession


USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,50}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def create_owner() -> int:
    """Provision the first owner interactively; never accept credentials as CLI args."""
    username = input("Owner username: ").strip().lower()
    email = input("Owner email: ").strip().lower()
    if not USERNAME_PATTERN.fullmatch(username):
        print("Username must be 3–50 letters, digits, or underscores.", file=sys.stderr)
        return 2
    if not EMAIL_PATTERN.fullmatch(email):
        print("Enter a valid email address.", file=sys.stderr)
        return 2

    password = getpass.getpass("Owner password (hidden): ")
    confirmation = getpass.getpass("Confirm owner password (hidden): ")
    if password != confirmation:
        print("Passwords did not match.", file=sys.stderr)
        return 2
    if len(password) < 14 or not any(char.islower() for char in password) or not any(char.isupper() for char in password) or not any(char.isdigit() for char in password):
        print("Use at least 14 characters with uppercase, lowercase, and a digit.", file=sys.stderr)
        return 2
    if len(password.encode("utf-8")) > 72:
        print("Password must be 72 UTF-8 bytes or fewer for the configured bcrypt hasher.", file=sys.stderr)
        return 2

    db = SessionLocal()
    secret = generate_totp_secret()
    try:
        with db.begin():
            existing_owner = (
                db.query(User)
                .join(User.roles)
                .filter(Role.role_name == "owner")
                .first()
            )
            if existing_owner or db.query(OwnerAccount).filter(OwnerAccount.owner_slot == 1).first():
                raise RuntimeError("An owner is already provisioned; refusing to create another.")
            if db.query(User).filter(func.lower(User.username) == username).first():
                raise RuntimeError("That username is already in use.")
            if db.query(User).filter(func.lower(User.email) == email).first():
                raise RuntimeError("That email address is already in use.")

            owner_role = db.query(Role).filter(Role.role_name == "owner").first()
            if owner_role is None:
                owner_role = Role(role_name="owner")
                db.add(owner_role)
                db.flush()
            user = User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                is_active=True,
                is_verified=True,
                roles=[owner_role],
            )
            db.add(user)
            db.flush()
            db.add(OwnerAccount(owner_slot=1, user_id=user.user_id))
            db.add(OwnerMFACredential(
                user_id=user.user_id,
                encrypted_secret=encrypt_totp_secret(secret),
                enabled=True,
                last_used_counter=-1,
            ))
    except Exception as exc:
        # Database exception messages can contain connection details or SQL
        # parameters. Keep provisioning failures useful without echoing them.
        print(f"Owner provisioning failed ({type(exc).__name__}). Check server configuration.", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(f"Owner account {username!r} ({email}) created with MFA required.")
    print("Add this one-time authenticator setup URI to an authenticator app now:")
    print(totp_uri(secret, username))
    print("The password and TOTP secret are not stored in source code or application logs.")
    return 0


def reset_owner_mfa() -> int:
    """Re-enroll the provisioned owner using password proof and revoke sessions."""
    identifier = input("Provisioned owner username or email: ").strip().lower()
    password = getpass.getpass("Owner password (hidden): ")
    db = SessionLocal()
    secret = generate_totp_secret()
    username = None
    try:
        with db.begin():
            account = (
                db.query(User)
                .join(OwnerAccount, OwnerAccount.user_id == User.user_id)
                .join(User.roles)
                .filter(
                    OwnerAccount.owner_slot == 1,
                    Role.role_name == "owner",
                    (func.lower(User.username) == identifier) | (func.lower(User.email) == identifier),
                )
                .first()
            )
            if account is None or not account.is_active or not account.is_verified or not verify_password(password, account.password_hash):
                raise RuntimeError("Owner verification failed.")
            credential = db.query(OwnerMFACredential).filter(
                OwnerMFACredential.user_id == account.user_id,
            ).first()
            if credential is None:
                raise RuntimeError("The provisioned owner MFA record is missing; use the restricted database recovery procedure.")
            username = account.username
            credential.encrypted_secret = encrypt_totp_secret(secret)
            credential.enabled = True
            credential.last_used_counter = -1
            now = datetime.now(timezone.utc)
            db.query(UserSession).filter(
                UserSession.user_id == account.user_id,
                UserSession.revoked_at.is_(None),
            ).update({"revoked_at": now}, synchronize_session=False)
            record_admin_event(
                db,
                actor_user_id=account.user_id,
                action="owner.mfa.recovery",
                details={"method": "restricted_cli", "sessions_revoked": True},
            )
    except Exception as exc:
        print(f"Owner MFA recovery failed ({type(exc).__name__}). Check server configuration.", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(f"MFA reset for {username!r}. All existing owner sessions were revoked.")
    print("Add this one-time authenticator setup URI to an authenticator app now:")
    print(totp_uri(secret, username))
    return 0


def main() -> int:
    # DEBUG=true enables SQLAlchemy's echo mode elsewhere in the app. Admin
    # commands handle password hashes and MFA credentials, so never emit SQL
    # statements or bound parameter values to this terminal.
    engine.echo = False
    logging.disable(logging.INFO)

    parser = argparse.ArgumentParser(prog="stem-studio-admin")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("create-owner", help="Provision the first owner interactively")
    subparsers.add_parser("reset-owner-mfa", help="Re-enroll the provisioned owner after password verification")
    args = parser.parse_args()
    if args.command == "create-owner":
        return create_owner()
    if args.command == "reset-owner-mfa":
        return reset_owner_mfa()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
