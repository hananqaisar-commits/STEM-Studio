import base64
import hashlib
import hmac
import struct
import time
from datetime import datetime, timedelta, timezone

import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from backend.app.api.dependencies import get_current_user, require_owner, require_recent_owner
from backend.app.api.routes import auth, owner
from backend.app.api.schemas import LoginRequest, OwnerUserStatusRequest, SignUpRequest
from backend.app import cli
from backend.app.core import owner_security
from backend.app.core.config import Settings, get_settings
from backend.app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, hash_token
from backend.infrastructure.database.models import AdminAuditEvent, OwnerAccount, OwnerMFACredential, OwnerSessionGrant, Role, User, UserSession


def _totp(secret: str, now: int | None = None) -> str:
    current = (int(time.time()) if now is None else now) // 30
    key = base64.b32decode(secret + "=" * ((8 - len(secret) % 8) % 8))
    digest = hmac.new(key, struct.pack(">Q", current), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{binary % 1_000_000:06d}"


def _request(method="GET", headers=None):
    raw_headers = [(name.lower().encode("latin1"), value.encode("latin1")) for name, value in (headers or {}).items()]
    return Request({
        "type": "http",
        "method": method,
        "path": "/api/owner/test",
        "raw_path": b"/api/owner/test",
        "query_string": b"",
        "headers": raw_headers,
        "client": ("127.0.0.1", 4455),
        "server": ("testserver", 80),
        "scheme": "http",
    })


def _make_owner(db_session, monkeypatch):
    monkeypatch.setattr(owner_security.settings, "OWNER_MFA_ENCRYPTION_KEY", Fernet.generate_key().decode())
    role = Role(role_name="owner")
    account = User(
        username="studio_owner",
        email="owner@example.test",
        password_hash=hash_password("SecureOwnerPassword123!"),
        is_active=True,
        is_verified=True,
        roles=[role],
    )
    db_session.add(account)
    db_session.flush()
    db_session.add(OwnerAccount(owner_slot=1, user_id=account.user_id))
    secret = owner_security.generate_totp_secret()
    db_session.add(OwnerMFACredential(
        user_id=account.user_id,
        encrypted_secret=owner_security.encrypt_totp_secret(secret),
        enabled=True,
        last_used_counter=-1,
    ))
    db_session.commit()
    return account, secret


def _sign_in_as_owner(db_session, monkeypatch):
    account, secret = _make_owner(db_session, monkeypatch)
    response = Response()
    result = auth.login(
        LoginRequest(
            email=account.email,
            password="SecureOwnerPassword123!",
            owner_mode=True,
            mfa_code=_totp(secret),
        ),
        _request("POST"),
        response,
        db_session,
        None,
    )
    cookies = {}
    for key, value in response.raw_headers:
        if key.lower() == b"set-cookie":
            name, cookie_value = value.decode("latin1").split(";", 1)[0].split("=", 1)
            cookies[name] = cookie_value
    return account, secret, result, cookies, response.raw_headers


def _owner_user_from_cookie(cookies, method="GET", origin=None, include_csrf=True, db_session=None):
    headers = {"Cookie": "; ".join(f"{name}={value}" for name, value in cookies.items())}
    if include_csrf:
        headers["X-CSRF-Token"] = cookies["owner_csrf"]
    if origin:
        headers["Origin"] = origin
    request = _request(method, headers)
    account = get_current_user(request, None, db_session)
    return request, account


def test_production_rejects_placeholder_signing_key_and_wildcard_cors():
    with pytest.raises(ValidationError):
        Settings(
            DEBUG=False,
            JWT_SECRET_KEY="change-this-to-a-secure-random-key",
            CORS_ORIGINS=["https://studio.example.com"],
            OWNER_COOKIE_SAMESITE="lax",
            OWNER_COOKIE_SECURE=None,
        )
    with pytest.raises(ValidationError):
        Settings(
            DEBUG=False,
            JWT_SECRET_KEY="a-strong-test-signing-key-that-is-long-enough-123456",
            CORS_ORIGINS=["*"],
            OWNER_COOKIE_SAMESITE="lax",
            OWNER_COOKIE_SECURE=None,
        )


def test_anonymous_and_regular_bearer_cannot_access_owner_dependencies(db_session):
    with pytest.raises(HTTPException) as anonymous:
        get_current_user(_request(), None, db_session)
    assert anonymous.value.status_code == 401

    learner = User(
        username="learner",
        email="learner@example.test",
        password_hash=hash_password("LearnerPassword123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(learner)
    db_session.commit()
    refresh = create_refresh_token(learner.user_id)
    session = UserSession(
        user_id=learner.user_id,
        refresh_token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(session)
    db_session.flush()
    token = create_access_token(learner.user_id, learner.email, session_id=session.session_id)
    db_session.commit()
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    request = _request()
    signed_in = get_current_user(request, credentials, db_session)
    with pytest.raises(HTTPException) as forbidden:
        require_owner(request, signed_in, db_session)
    assert forbidden.value.status_code == 403


def test_access_token_without_a_live_database_session_is_rejected(db_session):
    learner = User(
        username="sessionless",
        email="sessionless@example.test",
        password_hash=hash_password("LearnerPassword123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(learner)
    db_session.commit()
    legacy_token = create_access_token(learner.user_id, learner.email)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=legacy_token)
    with pytest.raises(HTTPException) as denied:
        get_current_user(_request(), credentials, db_session)
    assert denied.value.status_code == 401


def test_regular_password_login_keeps_bearer_flow_without_owner_privileges(db_session):
    learner = User(
        username="normal_login",
        email="normal@example.test",
        password_hash=hash_password("LearnerPassword123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(learner)
    db_session.commit()
    result = auth.login(
        LoginRequest(email=learner.email, password="LearnerPassword123!"),
        _request("POST"),
        Response(),
        db_session,
        None,
    )
    assert result.access_token and result.refresh_token
    request = _request()
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=result.access_token)
    signed_in = get_current_user(request, credentials, db_session)
    assert signed_in.user_id == learner.user_id
    assert not owner_security.is_provisioned_owner(db_session, signed_in)


def test_revoking_regular_session_invalidates_its_access_token_immediately(db_session):
    learner = User(
        username="revoke_me",
        email="revoke@example.test",
        password_hash=hash_password("LearnerPassword123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(learner)
    db_session.commit()
    result = auth.login(
        LoginRequest(email=learner.email, password="LearnerPassword123!"),
        _request("POST"),
        Response(),
        db_session,
        None,
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=result.access_token)
    assert get_current_user(_request(), credentials, db_session).user_id == learner.user_id
    session = db_session.query(UserSession).filter(UserSession.user_id == learner.user_id).one()
    session.revoked_at = datetime.now(timezone.utc)
    db_session.commit()
    with pytest.raises(HTTPException) as revoked:
        get_current_user(_request(), credentials, db_session)
    assert revoked.value.status_code == 401


def test_public_signup_ignores_submitted_owner_role_fields(db_session, monkeypatch):
    monkeypatch.setattr(auth.settings, "SMTP_USER", "")
    monkeypatch.setattr(auth.settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(auth.settings, "DEBUG", True)
    monkeypatch.setattr(auth.settings, "ALLOW_UNVERIFIED_SIGNUP", True)
    monkeypatch.setattr(auth, "invalidate_platform_stats_cache", lambda: None)
    payload = SignUpRequest.model_validate({
        "username": "public_user",
        "email": "public@example.com",
        "password": "SecurePublicUser123!",
        "role": "owner",
        "roles": ["owner"],
    })
    created = auth.signup(payload, _request("POST"), db_session, None)
    assert created.roles == []
    assert db_session.query(OwnerAccount).count() == 0


def test_owner_login_requires_totp_and_returns_cookie_only_owner_session(db_session, monkeypatch):
    account, secret, result, cookies, raw_headers = _sign_in_as_owner(db_session, monkeypatch)
    assert result.owner_session is True
    assert not hasattr(result, "access_token") and not hasattr(result, "refresh_token")
    assert {"owner_access", "owner_refresh", "owner_csrf"}.issubset(cookies)
    assert any(
        key.lower() == b"set-cookie" and value.startswith(b"owner_access=") and b"httponly" in value.lower()
        for key, value in raw_headers
    )

    request, signed_in = _owner_user_from_cookie(cookies, db_session=db_session)
    assert signed_in.user_id == account.user_id
    assert require_owner(request, signed_in, db_session).user_id == account.user_id
    overview = owner.owner_overview(signed_in, db_session)
    assert overview["current_owner"] == account.username


def test_owner_mutation_needs_csrf_and_recent_mfa(db_session, monkeypatch):
    _, _, _, cookies, _ = _sign_in_as_owner(db_session, monkeypatch)
    target = User(
        username="learner2",
        email="learner2@example.test",
        password_hash=hash_password("LearnerPassword123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(target)
    db_session.commit()

    missing_csrf_request = _request("PATCH", {
        "Cookie": "; ".join(f"{name}={value}" for name, value in cookies.items()),
    })
    with pytest.raises(HTTPException) as shared_user_route_csrf_denied:
        get_current_user(missing_csrf_request, None, db_session)
    assert shared_user_route_csrf_denied.value.status_code == 403

    request, signed_in = _owner_user_from_cookie(
        cookies,
        method="PATCH",
        origin=get_settings().CORS_ORIGINS[0],
        db_session=db_session,
    )
    current_owner = require_recent_owner(request, signed_in, db_session)
    result = owner.set_user_status(
        target.user_id,
        OwnerUserStatusRequest(is_active=False),
        request,
        current_owner,
        db_session,
    )
    assert result["is_active"] is False
    assert db_session.query(User).filter(User.user_id == target.user_id).one().is_active is False
    assert db_session.query(AdminAuditEvent).filter(AdminAuditEvent.action == "user.status.update").count() == 1


def test_totp_code_is_single_use(db_session, monkeypatch):
    account, secret = _make_owner(db_session, monkeypatch)
    code = _totp(secret)
    assert owner_security.consume_owner_totp(db_session, account.user_id, code)
    assert not owner_security.consume_owner_totp(db_session, account.user_id, code)


def test_owner_session_is_denied_after_session_revocation(db_session, monkeypatch):
    account, _, _, cookies, _ = _sign_in_as_owner(db_session, monkeypatch)
    session = db_session.query(UserSession).filter(UserSession.user_id == account.user_id).one()
    session.revoked_at = datetime.now(timezone.utc)
    db_session.commit()
    with pytest.raises(HTTPException) as revoked:
        _owner_user_from_cookie(cookies, db_session=db_session)
    assert revoked.value.status_code == 401


def test_owner_login_rejects_wrong_mfa_code(db_session, monkeypatch):
    account, secret = _make_owner(db_session, monkeypatch)
    current = int(_totp(secret))
    wrong_code = f"{(current + 1) % 1_000_000:06d}"
    response = Response()
    with pytest.raises(HTTPException) as denied:
        auth.login(
            LoginRequest(
                email=account.email,
                password="SecureOwnerPassword123!",
                owner_mode=True,
                mfa_code=wrong_code,
            ),
            _request("POST"),
            response,
            db_session,
            None,
        )
    assert denied.value.status_code == 401
    assert not any(key.lower() == b"set-cookie" for key, _ in response.raw_headers)


def test_role_and_mfa_without_provisioned_owner_anchor_are_not_enough(db_session, monkeypatch):
    monkeypatch.setattr(owner_security.settings, "OWNER_MFA_ENCRYPTION_KEY", Fernet.generate_key().decode())
    role = Role(role_name="owner")
    account = User(
        username="role_only",
        email="role-only@example.test",
        password_hash=hash_password("SecureOwnerPassword123!"),
        is_active=True,
        is_verified=True,
        roles=[role],
    )
    db_session.add(account)
    db_session.flush()
    secret = owner_security.generate_totp_secret()
    db_session.add(OwnerMFACredential(
        user_id=account.user_id,
        encrypted_secret=owner_security.encrypt_totp_secret(secret),
        enabled=True,
        last_used_counter=-1,
    ))
    db_session.commit()
    with pytest.raises(HTTPException) as denied:
        auth.login(
            LoginRequest(email=account.email, password="SecureOwnerPassword123!", owner_mode=True, mfa_code=_totp(secret)),
            _request("POST"),
            Response(),
            db_session,
            None,
        )
    assert denied.value.status_code == 401
    assert db_session.query(OwnerAccount).count() == 0


def test_owner_refresh_rotates_database_session_without_exposing_tokens(db_session, monkeypatch):
    account, _, _, cookies, _ = _sign_in_as_owner(db_session, monkeypatch)
    old_session = db_session.query(UserSession).filter(UserSession.user_id == account.user_id).one()
    old_session_id = old_session.session_id
    headers = {
        "Cookie": "; ".join(f"{name}={value}" for name, value in cookies.items()),
        "Origin": get_settings().CORS_ORIGINS[0],
        "X-CSRF-Token": cookies["owner_csrf"],
    }
    response = Response()
    result = auth.refresh_token(
        auth.RefreshTokenRequest(),
        _request("POST", headers),
        response,
        db_session,
        None,
    )
    assert result.owner_session is True
    assert not hasattr(result, "access_token") and not hasattr(result, "refresh_token")
    db_session.refresh(old_session)
    assert old_session.revoked_at is not None
    new_cookies = {}
    for key, value in response.raw_headers:
        if key.lower() == b"set-cookie":
            name, cookie_value = value.decode("latin1").split(";", 1)[0].split("=", 1)
            new_cookies[name] = cookie_value
    request, signed_in = _owner_user_from_cookie(new_cookies, db_session=db_session)
    assert require_owner(request, signed_in, db_session).user_id == account.user_id
    assert db_session.query(UserSession).filter(UserSession.session_id == old_session_id, UserSession.revoked_at.is_(None)).count() == 0


def test_owner_refresh_token_uses_absolute_session_expiry(db_session):
    started_at = int((datetime.now(timezone.utc) - timedelta(hours=7)).timestamp())
    token = create_refresh_token(1, auth_time=started_at, owner_mfa=True)
    payload = decode_token(token)
    assert payload is not None
    assert payload["exp"] <= started_at + get_settings().OWNER_SESSION_MAX_HOURS * 60 * 60


def test_server_provisioning_creates_only_one_owner_and_never_prints_password(db_session, monkeypatch, capsys):
    monkeypatch.setattr(owner_security.settings, "OWNER_MFA_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setattr(cli, "SessionLocal", lambda: db_session)
    answers = iter([
        "first_owner", "first@example.test", "SecureProvisionedOwner123!", "SecureProvisionedOwner123!",
        "second_owner", "second@example.test", "SecureProvisionedOwner456!", "SecureProvisionedOwner456!",
    ])
    monkeypatch.setattr("builtins.input", lambda _prompt="": next(answers))
    monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt="": next(answers))

    assert cli.create_owner() == 0
    assert cli.create_owner() == 1
    assert db_session.query(OwnerAccount).count() == 1
    assert db_session.query(User).filter(User.username == "first_owner").count() == 1
    captured = capsys.readouterr()
    assert "SecureProvisionedOwner123!" not in captured.out + captured.err


def test_restricted_mfa_recovery_rotates_secret_and_revokes_owner_sessions(db_session, monkeypatch, capsys):
    account, original_secret = _make_owner(db_session, monkeypatch)
    refresh_token = "opaque-test-refresh-token"
    session = UserSession(
        user_id=account.user_id,
        refresh_token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=8),
    )
    db_session.add(session)
    db_session.flush()
    db_session.add(OwnerSessionGrant(
        session_id=session.session_id,
        user_id=account.user_id,
        mfa_verified_at=datetime.now(timezone.utc),
    ))
    db_session.commit()

    test_session_factory = sessionmaker(bind=db_session.bind)
    monkeypatch.setattr(cli, "SessionLocal", test_session_factory)
    monkeypatch.setattr("builtins.input", lambda _prompt="": account.username)
    monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt="": "SecureOwnerPassword123!")
    assert cli.reset_owner_mfa() == 0

    credential = db_session.query(OwnerMFACredential).filter_by(user_id=account.user_id).one()
    new_secret = owner_security.decrypt_totp_secret(credential.encrypted_secret)
    db_session.refresh(session)
    assert new_secret != original_secret
    assert credential.last_used_counter == -1
    assert session.revoked_at is not None
    assert "SecureOwnerPassword123!" not in capsys.readouterr().out
