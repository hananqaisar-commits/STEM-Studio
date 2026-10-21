"""Restricted operational commands for the STEM Studio backend."""

from __future__ import annotations

import argparse
import getpass
import logging
import re
import sys
from datetime import datetime, timezone

from sqlalchemy import func

from backend.app.core.owner_security import (
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_totp_secret,
    record_admin_event,
)
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
    print("Authenticator manual setup key (shown once):")
    print(secret)
    print("Add it as a time-based code with 6 digits and a 30-second interval.")
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
    print("Authenticator manual setup key (shown once):")
    print(secret)
    print("Add it as a time-based code with 6 digits and a 30-second interval.")
    return 0


def reset_owner_password() -> int:
    """Recover the provisioned owner's password from the trusted server shell."""
    identifier = input("Provisioned owner email: ").strip().lower()
    password = getpass.getpass("New owner password (hidden): ")
    confirmation = getpass.getpass("Confirm new owner password (hidden): ")
    if password != confirmation:
        print("Passwords did not match.", file=sys.stderr)
        return 2
    if (
        len(password) < 14
        or not any(char.islower() for char in password)
        or not any(char.isupper() for char in password)
        or not any(char.isdigit() for char in password)
    ):
        print("Use at least 14 characters with uppercase, lowercase, and a digit.", file=sys.stderr)
        return 2
    if len(password.encode("utf-8")) > 72:
        print("Password must be 72 UTF-8 bytes or fewer for the configured bcrypt hasher.", file=sys.stderr)
        return 2

    db = SessionLocal()
    try:
        with db.begin():
            account = (
                db.query(User)
                .join(OwnerAccount, OwnerAccount.user_id == User.user_id)
                .join(User.roles)
                .filter(
                    OwnerAccount.owner_slot == 1,
                    Role.role_name == "owner",
                    func.lower(User.email) == identifier,
                )
                .first()
            )
            if account is None:
                raise RuntimeError("The provisioned owner was not found in this database")
            account.password_hash = hash_password(password)
            now = datetime.now(timezone.utc)
            revoked = db.query(UserSession).filter(
                UserSession.user_id == account.user_id,
                UserSession.revoked_at.is_(None),
            ).update({"revoked_at": now}, synchronize_session=False)
            record_admin_event(
                db,
                actor_user_id=account.user_id,
                action="owner.password.recovery",
                details={"method": "restricted_cli", "sessions_revoked": revoked},
            )
            username = account.username
    except Exception as exc:
        print(f"Owner password recovery failed ({type(exc).__name__}). Check server configuration.", file=sys.stderr)
        return 1
    finally:
        db.close()

    print(f"Password updated for owner {username!r}. All existing owner sessions were revoked.")
    return 0


def diagnose_owner() -> int:
    """Check the configured database and owner credentials without revealing secrets."""
    identifier = input("Provisioned owner email: ").strip().lower()
    password = getpass.getpass("Owner password (hidden): ")
    db = SessionLocal()
    try:
        print(f"Database engine: {engine.dialect.name}")
        user_count = db.query(func.count(User.user_id)).scalar() or 0
        print(f"User records in this database: {user_count}")
        account = (
            db.query(User)
            .join(OwnerAccount, OwnerAccount.user_id == User.user_id)
            .join(User.roles)
            .filter(
                OwnerAccount.owner_slot == 1,
                Role.role_name == "owner",
                func.lower(User.email) == identifier,
            )
            .first()
        )
        print(f"Provisioned owner found: {'yes' if account else 'no'}")
        if account is None:
            return 1
        password_matches = verify_password(password, account.password_hash)
        print(f"Password hash matches: {'yes' if password_matches else 'no'}")
        print(f"Account enabled: {'yes' if account.is_active else 'no'}")
        print(f"Email verified: {'yes' if account.is_verified else 'no'}")
        credential = db.query(OwnerMFACredential).filter(
            OwnerMFACredential.user_id == account.user_id,
            OwnerMFACredential.enabled.is_(True),
        ).first()
        print(f"Authenticator enrollment enabled: {'yes' if credential else 'no'}")
        if credential:
            try:
                decrypt_totp_secret(credential.encrypted_secret)
                print("Authenticator encryption key matches: yes")
            except Exception:
                print("Authenticator encryption key matches: no")
        return 0 if password_matches and credential and account.is_active and account.is_verified else 1
    except Exception as exc:
        print(f"Owner diagnostic failed ({type(exc).__name__}). Check server configuration.", file=sys.stderr)
        return 1
    finally:
        db.close()


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
    subparsers.add_parser("reset-owner-password", help="Recover the provisioned owner password from this trusted shell")
    subparsers.add_parser("diagnose-owner", help="Check owner login against this configured database")
    args = parser.parse_args()
    if args.command == "create-owner":
        return create_owner()
    if args.command == "reset-owner-mfa":
        return reset_owner_mfa()
    if args.command == "reset-owner-password":
        return reset_owner_password()
    if args.command == "diagnose-owner":
        return diagnose_owner()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
