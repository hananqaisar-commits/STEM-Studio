from datetime import datetime, timedelta, timezone

import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.app.api.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SignUpRequest,
    TokenResponse,
    UserResponse,
)
from backend.app.core.config import get_settings
from backend.app.core.rate_limit import rate_limit, standard, strict
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_secure_token,
    hash_password,
    hash_token,
    verify_password,
)
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    LoginAttempt,
    PasswordReset,
    User,
    UserSession,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


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

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Check if username already exists
    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken",
        )

    # If SMTP is not configured, auto-verify account so local/demo users are not trapped
    smtp_enabled = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    new_user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_verified=not smtp_enabled,
    )
    db.add(new_user)
    db.flush() # get user_id

    # Generate verification token
    from backend.app.infrastructure.database.models import EmailVerification
    from backend.app.core.email import send_verification_email

    raw_token = generate_secure_token()
    verification = EmailVerification(
        user_id=new_user.user_id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(verification)
    db.commit()
    db.refresh(new_user)

    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={raw_token}"
    send_verification_email(to_email=new_user.email, verify_url=verify_url)

    return new_user


# ─── GET /api/auth/verify-email ─────────────────────────────────────

@router.get("/verify-email", response_model=MessageResponse)
def verify_email(
    token: str,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    from backend.app.infrastructure.database.models import EmailVerification
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

@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Authenticate a user and return access + refresh tokens."""

    # Get client IP for login attempt logging
    client_ip = request.client.host if request.client else None

    # Find user by email or username
    user = db.query(User).filter(
        (User.email == payload.identifier) | (User.username == payload.identifier)
    ).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        # Log failed attempt
        failed_attempt = LoginAttempt(
            user_id=user.user_id if user else None,
            email=payload.identifier,
            ip_address=client_ip,
            successful=False,
            failure_reason="Invalid email/username or password",
        )
        db.add(failed_attempt)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    if not user.is_verified:
        if not bool(settings.SMTP_USER and settings.SMTP_PASSWORD):
            # Auto-verify in local/demo environment without SMTP setup
            user.is_verified = True
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before signing in. Check your inbox for the verification link.",
            )

    # Log successful attempt
    success_attempt = LoginAttempt(
        user_id=user.user_id,
        email=user.email,
        ip_address=client_ip,
        successful=True,
    )
    db.add(success_attempt)

    # Generate tokens ("Remember me" extends the refresh-token lifetime)
    access_token = create_access_token(user.user_id, user.email)
    refresh_token = create_refresh_token(user.user_id, remember_me=payload.remember_me)

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
    db.commit()

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
    if not email:
        raise HTTPException(status_code=400, detail="No email found in Google token")

    first_name = id_info.get("given_name")
    last_name = id_info.get("family_name")

    # Check if user exists by email
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Create a new user since they don't exist
        # We generate a random password for them and a username based on their email
        username_base = email.split("@")[0]
        username = username_base
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{username_base}{counter}"
            counter += 1
            
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(generate_secure_token()), # random unguessable password
            first_name=first_name,
            last_name=last_name,
            is_verified=True, # Google verified their email
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Generate tokens
    access_token = create_access_token(user.user_id, user.email)
    refresh_token = create_refresh_token(user.user_id, remember_me=payload.remember_me)

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
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )

# ─── POST /api/auth/refresh ─────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    payload: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(rate_limit(10, 60)),
):
    """Use a valid refresh token to get a new access token pair."""

    # Decode the refresh token
    token_payload = decode_token(payload.refresh_token)
    if token_payload is None or token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = int(token_payload["sub"])

    # Verify the refresh token hash exists in DB and is not revoked
    token_hash = hash_token(payload.refresh_token)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.refresh_token_hash == token_hash,
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or already revoked",
        )

    # Check expiry
    if session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    # Revoke the old session
    session.revoked_at = datetime.now(timezone.utc)

    # Get user
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    # Issue new token pair (preserve the "remember me" lifetime on rotation)
    remember_me = bool(token_payload.get("remember", False))
    session_days = (
        settings.JWT_REMEMBER_ME_EXPIRE_DAYS
        if remember_me
        else settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    new_access_token = create_access_token(user.user_id, user.email)
    new_refresh_token = create_refresh_token(user.user_id, remember_me=remember_me)

    # Store new refresh token session
    new_session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=hash_token(new_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=session_days),
    )
    db.add(new_session)
    db.commit()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )


# ─── POST /api/auth/logout ──────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke the refresh token session to log out."""

    token_hash = hash_token(payload.refresh_token)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.refresh_token_hash == token_hash,
            UserSession.user_id == current_user.user_id,
            UserSession.revoked_at.is_(None),
        )
        .first()
    )

    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()

    return MessageResponse(message="Logged out successfully")


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
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
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
    current_user: User = Depends(get_current_user),
    _rate: None = Depends(standard),
):
    """Return the current authenticated user's profile."""
    return current_user
