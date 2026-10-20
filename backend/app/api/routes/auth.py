from datetime import datetime, timedelta, timezone
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, has_owner_session, _verify_owner_csrf
from backend.app.api.schemas import (
    DeleteAccountRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    OwnerLoginResponse,
    OwnerReauthRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SignUpRequest,
    TokenResponse,
    UserResponse,
)
from backend.app.core.config import get_settings
from backend.app.core.rate_limit import rate_limit, standard, strict
from backend.app.core.owner_security import (
    consume_owner_totp,
    encrypt_totp_secret,
    is_owner_identity,
    is_provisioned_owner,
    record_admin_event,
    user_has_owner_role,
)
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_secure_token,
    hash_password,
    hash_token,
    verify_password,
)
from backend.app.api.routes.stats import invalidate_platform_stats_cache
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    LoginAttempt,
    OwnerMFACredential,
    OwnerSessionGrant,
    PasswordReset,
    User,
    UserSession,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()
logger = logging.getLogger(__name__)


def _owner_cookie_options() -> dict:
    secure = settings.OWNER_COOKIE_SECURE
    if secure is None:
        secure = not settings.DEBUG
    return {
        "secure": secure,
        "httponly": True,
        "samesite": settings.OWNER_COOKIE_SAMESITE,
    }


def _set_owner_cookies(response: Response, access_token: str, refresh_token: str, csrf_token: str) -> None:
    options = _owner_cookie_options()
    response.set_cookie(
        "owner_access", access_token,
        max_age=settings.OWNER_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/api", **options,
    )
    response.set_cookie(
        "owner_refresh", refresh_token,
        max_age=settings.OWNER_SESSION_MAX_HOURS * 3600,
        path="/api/auth", **options,
    )
    response.set_cookie(
        "owner_csrf", csrf_token,
        max_age=settings.OWNER_SESSION_MAX_HOURS * 3600,
        path="/api", secure=options["secure"], httponly=False,
        samesite=options["samesite"],
    )


def _clear_owner_cookies(response: Response) -> None:
    options = _owner_cookie_options()
    for name, path in (("owner_access", "/api"), ("owner_refresh", "/api/auth"), ("owner_csrf", "/api")):
        response.delete_cookie(name, path=path, secure=options["secure"], samesite=options["samesite"])


def _owner_login_failure(db: Session, user: User | None, email: str, ip_address: str | None) -> None:
    db.add(LoginAttempt(
        user_id=user.user_id if user else None,
        email=email[:255],
        ip_address=ip_address,
        successful=False,
        failure_reason="Invalid credentials or owner MFA",
    ))
    if user is not None and user_has_owner_role(user):
        record_admin_event(
            db,
            actor_user_id=user.user_id,
            action="owner.login",
            outcome="failure",
            details={"reason": "authentication_failed"},
            ip_address=ip_address,
        )
    db.commit()


_PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


def _validate_password_strength(password: str) -> None:
    """Ensure passwords meet a minimum complexity bar."""
    if not _PASSWORD_REGEX.match(password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, and one digit.",
        )


# ─── POST /api/auth/signup ───────────────────────────────────────────

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignUpRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Register a new user account."""

    # Enforce password complexity before any DB work
    _validate_password_strength(payload.password)

    # Normalize inputs
    clean_email = payload.email.strip().lower()
    # Canonicalize usernames before storing them. The database's existing
    # unique constraint then also protects case variants during concurrent
    # signups (for example, "Learner" and "learner").
    clean_username = payload.username.strip().lower()

    if "@" in clean_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot contain '@' symbol",
        )

    # Check if email already exists (case-insensitive)
    existing_email = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Sign in with your email instead of creating another account.",
        )

    # Check if username already exists (case-insensitive)
    existing_username = db.query(User).filter(func.lower(User.username) == clean_username.lower()).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken. Sign in to the existing account or choose a different username.",
        )

    smtp_enabled = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    dev_unverified_signup = (
        not smtp_enabled and settings.DEBUG and settings.ALLOW_UNVERIFIED_SIGNUP
    )
    if not smtp_enabled and not dev_unverified_signup:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email verification is not configured. Please try again later.",
        )
    new_user = User(
        username=clean_username,
        email=clean_email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_verified=dev_unverified_signup,
    )
    from backend.infrastructure.database.models import EmailVerification
    from backend.app.core.email import send_verification_email

    raw_token = generate_secure_token()
    try:
        db.add(new_user)
        db.flush()  # Allocate the account ID before inserting its verification row.
        verification = EmailVerification(
            user_id=new_user.user_id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(
                hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
            ),
        )
        db.add(verification)
        db.commit()
        db.refresh(new_user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email or username already belongs to an account. Sign in to continue.",
        ) from exc

    invalidate_platform_stats_cache()

    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={raw_token}"
    if smtp_enabled:
        send_verification_email(to_email=new_user.email, verify_url=verify_url)

    return new_user


# ─── GET /api/auth/verify-email ─────────────────────────────────────

@router.get("/verify-email", response_model=MessageResponse)
def verify_email(
    token: str,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    from backend.infrastructure.database.models import EmailVerification
    token_hash = hash_token(token)

    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.token_hash == token_hash,
            EmailVerification.verified_at.is_(None),
        )
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used verification token",
        )

    if verification.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired",
        )

    user = db.query(User).filter(User.user_id == verification.user_id).first()
    if user:
        user.is_verified = True
        verification.verified_at = datetime.now(timezone.utc)
        db.commit()
    
    return MessageResponse(message="Email verified successfully")


# ─── POST /api/auth/login ───────────────────────────────────────────

@router.post("/login", response_model=TokenResponse | OwnerLoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Authenticate a user and return access + refresh tokens."""

    # Get client IP for login attempt logging
    client_ip = request.client.host if request.client else None
    clean_email = str(payload.email).strip().lower()

    # Email is the sole sign-in identifier for regular and owner accounts.
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        # Log failed attempt
        failed_attempt = LoginAttempt(
            user_id=user.user_id if user else None,
            email=clean_email,
            ip_address=client_ip,
            successful=False,
            failure_reason="Invalid email or password",
        )
        db.add(failed_attempt)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    if not user.is_verified:
        if settings.DEBUG and settings.ALLOW_UNVERIFIED_SIGNUP and not bool(settings.SMTP_USER and settings.SMTP_PASSWORD):
            # Explicit development-only escape hatch.
            user.is_verified = True
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before signing in. Check your inbox for the verification link.",
            )

    # Owner mode is a separate authentication path. The client selection does
    # not grant a role: both the provisioned database role and a fresh TOTP are
    # independently required before issuing an owner-only cookie session.
    if payload.owner_mode:
        mfa = db.query(OwnerMFACredential).filter(
            OwnerMFACredential.user_id == user.user_id,
            OwnerMFACredential.enabled.is_(True),
        ).first()
        if (
            not is_provisioned_owner(db, user)
            or mfa is None
            or not user.is_active
            or not user.is_verified
            or not payload.mfa_code
            or not consume_owner_totp(db, user.user_id, payload.mfa_code)
        ):
            _owner_login_failure(db, user, clean_email, client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email, password, or owner verification code",
            )

        now = datetime.now(timezone.utc)
        auth_time = int(now.timestamp())
        owner_refresh = create_refresh_token(
            user.user_id, auth_time=auth_time, owner_mfa=True
        )
        session = UserSession(
            user_id=user.user_id,
            refresh_token_hash=hash_token(owner_refresh),
            expires_at=now + timedelta(hours=settings.OWNER_SESSION_MAX_HOURS),
        )
        db.add(session)
        db.flush()
        owner_access = create_access_token(
            user.user_id,
            user.email,
            auth_time=auth_time,
            owner_mfa=True,
            session_id=session.session_id,
        )
        db.add(OwnerSessionGrant(
            session_id=session.session_id,
            user_id=user.user_id,
            mfa_verified_at=now,
        ))
        db.add(LoginAttempt(
            user_id=user.user_id,
            email=user.email,
            ip_address=client_ip,
            successful=True,
        ))
        record_admin_event(
            db,
            actor_user_id=user.user_id,
            action="owner.login",
            details={"method": "password_totp"},
            ip_address=client_ip,
        )
        csrf_token = generate_secure_token()
        db.commit()
        _set_owner_cookies(response, owner_access, owner_refresh, csrf_token)
        return OwnerLoginResponse(csrf_token=csrf_token)

    # Log successful regular-user attempt
    success_attempt = LoginAttempt(
        user_id=user.user_id,
        email=user.email,
        ip_address=client_ip,
        successful=True,
    )
    db.add(success_attempt)

    # Preserve the login time through refresh rotation for sensitive actions.
    auth_time = int(datetime.now(timezone.utc).timestamp())
    refresh_token = create_refresh_token(
        user.user_id, remember_me=payload.remember_me, auth_time=auth_time
    )

    # Store refresh token hash in user_sessions table
    session_days = (
        settings.JWT_REMEMBER_ME_EXPIRE_DAYS
        if payload.remember_me
        else settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    refresh_token_hash = hash_token(refresh_token)
    session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=refresh_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=session_days),
    )
    db.add(session)
    db.flush()
    access_token = create_access_token(
        user.user_id,
        user.email,
        auth_time=auth_time,
        session_id=session.session_id,
    )
    db.commit()

    _clear_owner_cookies(response)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )

# ─── POST /api/auth/google ──────────────────────────────────────────

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from backend.app.api.schemas import GoogleSignInRequest

@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleSignInRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Authenticate a user via Google Identity Services."""
    try:
        # Verify the Google ID token
        id_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            payload.client_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {e}"
        )
    
    email = id_info.get("email")
    if not email or id_info.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google sign-in requires a verified email address",
        )

    clean_email = email.strip().lower()

    first_name = id_info.get("given_name")
    last_name = id_info.get("family_name")

    # Check if user exists by email
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    
    if not user:
        # Create a new user since they don't exist
        # We generate a random password for them and a username based on their email
        username_base = clean_email.split("@")[0][:45]
        username = username_base
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{username_base}{counter}"
            counter += 1
            
        user = User(
            username=username,
            email=clean_email,
            password_hash=hash_password(generate_secure_token()), # random unguessable password
            first_name=first_name,
            last_name=last_name,
            is_verified=True, # Google verified their email
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(func.lower(User.email) == clean_email).first()
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Unable to create this account. Please try again.",
                )
        invalidate_platform_stats_cache()
    elif not user.is_verified:
        # A Google ID token with email_verified=true proves email ownership.
        user.is_verified = True
        db.commit()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Treat the verified Google authentication as a recent sign-in.
    auth_time = int(datetime.now(timezone.utc).timestamp())
    refresh_token = create_refresh_token(
        user.user_id, remember_me=payload.remember_me, auth_time=auth_time
    )

    session_days = (
        settings.JWT_REMEMBER_ME_EXPIRE_DAYS
        if payload.remember_me
        else settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    refresh_token_hash = hash_token(refresh_token)
    session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=refresh_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=session_days),
    )
    db.add(session)
    db.flush()
    access_token = create_access_token(
        user.user_id,
        user.email,
        auth_time=auth_time,
        session_id=session.session_id,
    )
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )

# ─── POST /api/auth/refresh ─────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse | OwnerLoginResponse)
def refresh_token(
    payload: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(10, 60)),
):
    """Use a valid refresh token to get a new access token pair."""

    owner_refresh = request.cookies.get("owner_refresh")
    if owner_refresh:
        _verify_owner_csrf(request)
    presented_refresh = owner_refresh or payload.refresh_token
    if not presented_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is required")

    # Decode the refresh token
    token_payload = decode_token(presented_refresh)
    if token_payload is None or token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    try:
        user_id = int(token_payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    # Load revoked rows too, so a replay can revoke the remaining sessions.
    token_hash = hash_token(presented_refresh)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.refresh_token_hash == token_hash,
            UserSession.user_id == user_id,
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or already revoked",
        )

    now = datetime.now(timezone.utc)
    if session.revoked_at is not None:
        # A rotated refresh token is single-use. Reuse may indicate theft, so
        # revoke every still-active session for this account.
        db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        ).update({"revoked_at": now}, synchronize_session=False)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected; sign in again",
        )

    # Check expiry
    if session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        session.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    # Get user
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None or not user.is_active:
        session.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    is_owner_refresh = bool(owner_refresh and token_payload.get("owner_mfa"))
    if owner_refresh and not is_owner_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid owner session")
    owner_grant = None
    if is_owner_refresh:
        owner_grant = db.query(OwnerSessionGrant).filter(
            OwnerSessionGrant.session_id == session.session_id,
            OwnerSessionGrant.user_id == user_id,
        ).first()
        mfa_enabled = db.query(OwnerMFACredential).filter(
            OwnerMFACredential.user_id == user_id,
            OwnerMFACredential.enabled.is_(True),
        ).first()
        if (
            owner_grant is None
            or mfa_enabled is None
            or not user.is_verified
            or not is_provisioned_owner(db, user)
        ):
            session.revoked_at = now
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Owner session is no longer valid")
    elif token_payload.get("owner_mfa"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Owner refresh cookie is required")

    # Issue new token pair (preserve the "remember me" lifetime on rotation)
    remember_me = bool(token_payload.get("remember", False))
    session_days = (
        settings.JWT_REMEMBER_ME_EXPIRE_DAYS
        if remember_me
        else settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    auth_time = token_payload.get("auth_time")
    if type(auth_time) is not int:
        auth_time = None
    owner_session_expiry = None
    if is_owner_refresh:
        if auth_time is None:
            session.revoked_at = now
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Owner session is invalid")
        owner_session_expiry = datetime.fromtimestamp(auth_time, timezone.utc) + timedelta(
            hours=settings.OWNER_SESSION_MAX_HOURS
        )
        if owner_session_expiry <= now:
            session.revoked_at = now
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Owner session has expired")
    rotated_at = db.query(UserSession).filter(
        UserSession.session_id == session.session_id,
        UserSession.revoked_at.is_(None),
    ).update({"revoked_at": now}, synchronize_session=False)
    if rotated_at != 1:
        db.rollback()
        db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        ).update({"revoked_at": datetime.now(timezone.utc)}, synchronize_session=False)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected; sign in again",
        )

    new_refresh_token = create_refresh_token(
        user.user_id, remember_me=remember_me, auth_time=auth_time,
        owner_mfa=is_owner_refresh,
    )

    # Store new refresh token session
    new_session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=hash_token(new_refresh_token),
        expires_at=(
            owner_session_expiry
            if is_owner_refresh
            else now + timedelta(days=session_days)
        ),
    )
    db.add(new_session)
    db.flush()
    new_access_token = create_access_token(
        user.user_id,
        user.email,
        auth_time=auth_time,
        owner_mfa=is_owner_refresh,
        session_id=new_session.session_id,
    )
    if is_owner_refresh:
        db.add(OwnerSessionGrant(
            session_id=new_session.session_id,
            user_id=user.user_id,
            mfa_verified_at=owner_grant.mfa_verified_at,
        ))
    db.commit()

    if is_owner_refresh:
        csrf_token = request.cookies.get("owner_csrf") or generate_secure_token()
        _set_owner_cookies(response, new_access_token, new_refresh_token, csrf_token)
        # Never expose owner tokens to JavaScript or JSON callers.
        return OwnerLoginResponse(csrf_token=csrf_token)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )


# ─── POST /api/auth/logout ──────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    payload: RefreshTokenRequest | None = None,
    db: Session = Depends(get_db),
):
    """Revoke the refresh token session to log out."""

    owner_refresh = request.cookies.get("owner_refresh")
    token = owner_refresh or (payload.refresh_token if payload else None)
    if owner_refresh:
        _verify_owner_csrf(request)
    if token:
        decoded = decode_token(token)
        try:
            user_id = int(decoded.get("sub")) if decoded and decoded.get("type") == "refresh" else None
        except (TypeError, ValueError):
            user_id = None
        session = None if user_id is None else db.query(UserSession).filter(
            UserSession.refresh_token_hash == hash_token(token),
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        ).first()
    else:
        session = None

    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()

    _clear_owner_cookies(response)

    return MessageResponse(message="Logged out successfully")


@router.get("/csrf-token")
def owner_csrf_token(request: Request, response: Response):
    """Expose the double-submit CSRF token to this exact allowed frontend origin."""
    token = request.cookies.get("owner_csrf") or generate_secure_token()
    options = _owner_cookie_options()
    response.set_cookie(
        "owner_csrf", token,
        max_age=settings.OWNER_SESSION_MAX_HOURS * 3600,
        path="/api",
        secure=options["secure"],
        httponly=False,
        samesite=options["samesite"],
    )
    return {"csrf_token": token}


@router.post("/owner-reauth", response_model=OwnerLoginResponse)
def owner_reauthenticate(
    payload: OwnerReauthRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Refresh the recent-MFA window for a sensitive owner action."""
    _verify_owner_csrf(request)
    if (
        request.state.auth_source != "owner_cookie"
        or not is_provisioned_owner(db, current_user)
        or not current_user.is_active
        or not current_user.is_verified
        or not verify_password(payload.password, current_user.password_hash)
        or not consume_owner_totp(db, current_user.user_id, payload.mfa_code)
    ):
        _owner_login_failure(
            db,
            current_user,
            current_user.email,
            request.client.host if request.client else None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Owner re-authentication failed")

    try:
        session_id = int(request.state.auth_payload.get("sid"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Owner session is invalid")
    grant = db.query(OwnerSessionGrant).filter(
        OwnerSessionGrant.session_id == session_id,
        OwnerSessionGrant.user_id == current_user.user_id,
    ).first()
    session = db.query(UserSession).filter(
        UserSession.session_id == session_id,
        UserSession.user_id == current_user.user_id,
        UserSession.revoked_at.is_(None),
    ).first()
    if grant is None or session is None or session.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Owner session is invalid")
    now = datetime.now(timezone.utc)
    grant.mfa_verified_at = now
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        action="owner.reauthenticate",
        details={"method": "password_totp"},
        ip_address=request.client.host if request.client else None,
    )
    auth_time = int(now.timestamp())
    access_token = create_access_token(
        current_user.user_id,
        current_user.email,
        auth_time=auth_time,
        owner_mfa=True,
        session_id=session_id,
    )
    csrf_token = request.cookies.get("owner_csrf") or generate_secure_token()
    # Keep the existing HttpOnly refresh cookie; only rotate the short-lived access cookie.
    options = _owner_cookie_options()
    response.set_cookie("owner_access", access_token, max_age=settings.OWNER_ACCESS_TOKEN_EXPIRE_MINUTES * 60, path="/api", **options)
    response.set_cookie("owner_csrf", csrf_token, max_age=settings.OWNER_SESSION_MAX_HOURS * 3600, path="/api", secure=options["secure"], httponly=False, samesite=options["samesite"])
    db.commit()
    return OwnerLoginResponse(csrf_token=csrf_token)


@router.delete("/me", response_model=MessageResponse)
def delete_account(
    payload: DeleteAccountRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the authenticated user's account after a recent sign-in."""
    if is_owner_identity(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner accounts cannot be deleted through the public account endpoint. Use the restricted server-side recovery process.",
        )
    authorization = request.headers.get("authorization", "")
    scheme, _, access_token = authorization.partition(" ")
    token_payload = decode_token(access_token) if scheme.lower() == "bearer" else None
    auth_time = token_payload.get("auth_time") if token_payload else None
    now_epoch = int(datetime.now(timezone.utc).timestamp())
    reauth_window = settings.AUTH_REAUTH_MAX_AGE_MINUTES * 60
    if (
        type(auth_time) is not int
        or auth_time > now_epoch + 60
        or now_epoch - auth_time > reauth_window
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sign in again before deleting your account",
        )

    try:
        db.delete(current_user)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Account deletion failed for user_id=%s", current_user.user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete this account right now",
        ) from exc

    invalidate_platform_stats_cache()
    return MessageResponse(message="Account deleted successfully")


from backend.app.core.email import send_password_reset_email
from backend.app.core.rate_limit import rate_limit

# ─── POST /api/auth/forgot-password ─────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Generate a password reset token and dispatch email via SMTP."""

    user = db.query(User).filter(User.email == payload.email).first()

    # Always return success to prevent email enumeration attacks
    if user is None:
        return MessageResponse(message="If the email exists, a reset link has been sent")

    # Generate a secure random token
    raw_token = generate_secure_token()

    # Store hashed version in DB
    reset = PasswordReset(
        user_id=user.user_id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        ),
    )
    db.add(reset)
    db.commit()

    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"
    sent = send_password_reset_email(to_email=payload.email, reset_url=reset_url)

    # Surface delivery failures instead of silently pretending success.
    # Previously the return value was ignored, so users saw "reset link
    # sent" while no email was ever dispatched (missing SMTP credentials,
    # SMTP outage, etc.) — making this bug invisible.
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send reset email, please try again",
        )

    return MessageResponse(
        message="If the email exists, a reset link has been sent to your email address",
    )


# ─── POST /api/auth/reset-password ──────────────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Validate the reset token and update the password."""

    token_hash = hash_token(payload.token)

    reset = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.token_hash == token_hash,
            PasswordReset.used_at.is_(None),
        )
        .first()
    )

    if reset is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used reset token",
        )

    # Check expiry
    if reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired",
        )

    # Enforce password complexity on the new password
    _validate_password_strength(payload.new_password)

    # Update password
    user = db.query(User).filter(User.user_id == reset.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = hash_password(payload.new_password)

    # Mark token as used
    reset.used_at = datetime.now(timezone.utc)

    # Revoke all existing sessions (force re-login after password change)
    db.query(UserSession).filter(
        UserSession.user_id == user.user_id,
        UserSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(timezone.utc)})

    db.commit()

    return MessageResponse(message="Password has been reset successfully")


# ─── GET /api/auth/me ────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate: None = Depends(standard),
):
    """Return the current authenticated user's profile."""
    data = UserResponse.model_validate(current_user)
    return data.model_copy(update={
        "is_owner": is_provisioned_owner(db, current_user),
        "is_owner_session": has_owner_session(current_user, request, db),
    })
