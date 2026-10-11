from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from backend.app.api.routes import auth, stats
from backend.app.api.schemas import (
    DeleteAccountRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SignUpRequest,
)
from backend.app.core import security
from backend.app.core.security import hash_password, hash_token, verify_password
from backend.app.core import email
from backend.infrastructure.database.database import Base
from backend.infrastructure.database.models import (
    EmailVerification,
    ModuleProgress,
    PasswordReset,
    User,
    UserSession,
)
import backend.infrastructure.database.models  # noqa: F401 - register all tables


def _database(path):
    engine = create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    return engine, sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _request(method="POST", path="/api/auth/test", token=None):
    headers = []
    if token:
        headers.append((b"authorization", f"Bearer {token}".encode("ascii")))
    return Request({
        "type": "http",
        "method": method,
        "path": path,
        "headers": headers,
        "query_string": b"",
    })


def _new_user(db, email="ada@example.test"):
    user = User(
        username=email.split("@", 1)[0],
        email=email,
        password_hash=hash_password("OriginalPassword123!"),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_unconfigured_email_sender_never_logs_verification_or_reset_tokens(monkeypatch, caplog, capsys):
    monkeypatch.setattr(
        email,
        "get_settings",
        lambda: SimpleNamespace(SMTP_USER="", SMTP_PASSWORD=""),
    )
    reset_url = "https://app.example.test/reset-password?token=private-reset-token"
    verification_url = "https://app.example.test/verify-email?token=private-verification-token"

    assert email.send_password_reset_email("ada@example.test", reset_url) is False
    assert email.send_verification_email("ada@example.test", verification_url) is False

    captured = capsys.readouterr()
    assert "private-reset-token" not in caplog.text + captured.out + captured.err
    assert "private-verification-token" not in caplog.text + captured.out + captured.err


def test_account_and_expired_session_survive_database_restart(tmp_path, monkeypatch):
    database_path = tmp_path / "account-persistence.sqlite3"
    engine, SessionLocal = _database(database_path)
    monkeypatch.setattr(auth.settings, "SMTP_USER", "")
    monkeypatch.setattr(auth.settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(auth, "invalidate_platform_stats_cache", lambda: None)
    monkeypatch.setattr(
        "backend.app.core.email.send_verification_email",
        lambda **_kwargs: False,
    )
    monkeypatch.setattr(security.settings, "JWT_REFRESH_TOKEN_EXPIRE_DAYS", -1)
    with SessionLocal() as db:
        registered = auth.signup(
            SignUpRequest(
                username="ada_lovelace",
                email="Ada@example.com",
                password="OriginalPassword123!",
            ),
            _request(),
            db,
            None,
        )
        user_id = registered.user_id
        expired_refresh_token = security.create_refresh_token(user_id)
        db.add(UserSession(
            user_id=user_id,
            refresh_token_hash=hash_token(expired_refresh_token),
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        ))
        db.commit()
    engine.dispose()

    # Reopening the same file models a process/database-engine restart.
    restarted_engine, RestartedSession = _database(database_path)
    try:
        with RestartedSession() as db:
            user = db.query(User).filter(User.user_id == user_id).one()
            assert user.email == "ada@example.com"
            assert db.query(UserSession).filter(UserSession.user_id == user_id).count() == 1
            with pytest.raises(HTTPException) as expired_refresh:
                auth.refresh_token(
                    RefreshTokenRequest(refresh_token=expired_refresh_token),
                    _request(),
                    db,
                    None,
                )
            assert expired_refresh.value.status_code == 401
            assert db.query(User).filter(User.user_id == user_id).count() == 1

            monkeypatch.setattr(security.settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", -1)
            expired_access_token = security.create_access_token(user_id, user.email)
            assert security.decode_token(expired_access_token) is None
            assert db.query(User).filter(User.user_id == user_id).count() == 1
    finally:
        restarted_engine.dispose()


def test_active_learners_is_exactly_the_number_of_stored_accounts(tmp_path, monkeypatch):
    engine, SessionLocal = _database(tmp_path / "platform-stats.sqlite3")
    monkeypatch.setattr(stats.settings, "REDIS_URL", "")
    try:
        with SessionLocal() as db:
            _new_user(db, "ada@example.test")
            inactive_user = _new_user(db, "grace@example.test")
            inactive_user.is_active = False
            db.commit()
            result = stats.get_platform_stats(db)
            assert result.active_learners == db.query(User).count() == 2
    finally:
        engine.dispose()


def test_signup_normalizes_email_and_rejects_case_variant_duplicate(tmp_path, monkeypatch):
    engine, SessionLocal = _database(tmp_path / "signup-normalization.sqlite3")
    monkeypatch.setattr(auth.settings, "SMTP_USER", "")
    monkeypatch.setattr(auth.settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(auth, "invalidate_platform_stats_cache", lambda: None)
    monkeypatch.setattr(
        "backend.app.core.email.send_verification_email",
        lambda **_kwargs: False,
    )
    try:
        with SessionLocal() as db:
            result = auth.signup(
                SignUpRequest(
                    username="ada_lovelace",
                    email="Ada@example.com",
                    password="OriginalPassword123!",
                ),
                _request(),
                db,
                None,
            )
            assert result.email == "ada@example.com"

            with pytest.raises(HTTPException) as duplicate:
                auth.signup(
                    SignUpRequest(
                        username="ada_second",
                        email="ADA@example.com",
                        password="OriginalPassword123!",
                    ),
                    _request(),
                    db,
                    None,
                )
            assert duplicate.value.status_code == 409
            assert db.query(User).count() == 1
    finally:
        engine.dispose()


def test_refresh_token_replay_revokes_remaining_sessions(tmp_path):
    engine, SessionLocal = _database(tmp_path / "refresh-rotation.sqlite3")
    try:
        with SessionLocal() as db:
            user = _new_user(db)
            old_refresh = security.create_refresh_token(user.user_id)
            db.add(UserSession(
                user_id=user.user_id,
                refresh_token_hash=hash_token(old_refresh),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            ))
            db.commit()

            first_rotation = auth.refresh_token(
                RefreshTokenRequest(refresh_token=old_refresh),
                _request(),
                db,
                None,
            )
            new_hash = hash_token(first_rotation.refresh_token)
            assert db.query(UserSession).filter(
                UserSession.refresh_token_hash == new_hash,
                UserSession.revoked_at.is_(None),
            ).count() == 1

            with pytest.raises(HTTPException) as replay:
                auth.refresh_token(
                    RefreshTokenRequest(refresh_token=old_refresh),
                    _request(),
                    db,
                    None,
                )
            assert replay.value.status_code == 401
            assert db.query(UserSession).filter(
                UserSession.user_id == user.user_id,
                UserSession.revoked_at.is_(None),
            ).count() == 0
    finally:
        engine.dispose()


def test_password_reset_consumes_token_and_revokes_sessions(tmp_path):
    engine, SessionLocal = _database(tmp_path / "password-reset.sqlite3")
    try:
        with SessionLocal() as db:
            user = _new_user(db)
            raw_token = "one-time-reset-token"
            db.add(PasswordReset(
                user_id=user.user_id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=20),
            ))
            db.add(UserSession(
                user_id=user.user_id,
                refresh_token_hash=hash_token("active-session"),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            ))
            db.commit()

            auth.reset_password(
                ResetPasswordRequest(token=raw_token, new_password="NewPassword456!"),
                _request(),
                db,
                None,
            )
            db.refresh(user)
            assert verify_password("NewPassword456!", user.password_hash)
            assert not verify_password("OriginalPassword123!", user.password_hash)
            assert db.query(UserSession).filter(
                UserSession.user_id == user.user_id,
                UserSession.revoked_at.is_(None),
            ).count() == 0

            with pytest.raises(HTTPException) as replay:
                auth.reset_password(
                    ResetPasswordRequest(token=raw_token, new_password="AnotherPassword789!"),
                    _request(),
                    db,
                    None,
                )
            assert replay.value.status_code == 400
    finally:
        engine.dispose()


def test_account_deletion_requires_recent_auth_and_cascades_owned_data(tmp_path, monkeypatch):
    engine, SessionLocal = _database(tmp_path / "account-deletion.sqlite3")
    monkeypatch.setattr(stats.settings, "REDIS_URL", "")
    try:
        with SessionLocal() as db:
            user = _new_user(db)
            user_id = user.user_id
            db.add_all([
                UserSession(
                    user_id=user_id,
                    refresh_token_hash=hash_token("account-session"),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                ),
                EmailVerification(
                    user_id=user_id,
                    token_hash=hash_token("verification-token"),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=1),
                ),
                PasswordReset(
                    user_id=user_id,
                    token_hash=hash_token("reset-token"),
                    expires_at=datetime.now(timezone.utc) + timedelta(minutes=20),
                ),
                ModuleProgress(
                    user_id=user_id,
                    module_name="sorting",
                    completed_algorithms="[]",
                    completion_percentage=0,
                ),
            ])
            db.commit()

            old_auth_time = int((datetime.now(timezone.utc) - timedelta(minutes=11)).timestamp())
            stale_token = security.create_access_token(user_id, user.email, auth_time=old_auth_time)
            with pytest.raises(HTTPException) as stale_auth:
                auth.delete_account(
                    DeleteAccountRequest(confirmation="DELETE"),
                    _request("DELETE", "/api/auth/me", stale_token),
                    user,
                    db,
                )
            assert stale_auth.value.status_code == 403
            assert db.query(User).filter(User.user_id == user_id).count() == 1

            recent_token = security.create_access_token(
                user_id,
                user.email,
                auth_time=int(datetime.now(timezone.utc).timestamp()),
            )
            auth.delete_account(
                DeleteAccountRequest(confirmation="DELETE"),
                _request("DELETE", "/api/auth/me", recent_token),
                user,
                db,
            )
            assert db.query(User).filter(User.user_id == user_id).count() == 0
            assert db.query(UserSession).filter(UserSession.user_id == user_id).count() == 0
            assert db.query(EmailVerification).filter(EmailVerification.user_id == user_id).count() == 0
            assert db.query(PasswordReset).filter(PasswordReset.user_id == user_id).count() == 0
            assert db.query(ModuleProgress).filter(ModuleProgress.user_id == user_id).count() == 0
    finally:
        engine.dispose()
