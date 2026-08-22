from datetime import datetime, timedelta, timezone

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


# ─── POST /api/auth/signup ───────────────────────────────────────────

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    """Register a new user account."""

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

    # Create user with hashed password
    new_user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ─── POST /api/auth/login ───────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate a user and return access + refresh tokens."""

    # Get client IP for login attempt logging
    client_ip = request.client.host if request.client else None

    # Find user by email (indexed column → fast lookup)
    user = db.query(User).filter(User.email == payload.email).first()

    if user is None or not verify_password(payload.password, user.password_hash):
        # Log failed attempt
        failed_attempt = LoginAttempt(
            user_id=user.user_id if user else None,
            email=payload.email,
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

    # Log successful attempt
    success_attempt = LoginAttempt(
        user_id=user.user_id,
        email=payload.email,
        ip_address=client_ip,
        successful=True,
    )
    db.add(success_attempt)

    # Generate tokens
    access_token = create_access_token(user.user_id, user.email)
    refresh_token = create_refresh_token(user.user_id)

    # Store refresh token hash in user_sessions table
    refresh_token_hash = hash_token(refresh_token)
    session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=refresh_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


# ─── POST /api/auth/refresh ─────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
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

    # Issue new token pair
    new_access_token = create_access_token(user.user_id, user.email)
    new_refresh_token = create_refresh_token(user.user_id)

    # Store new refresh token session
    new_session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=hash_token(new_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
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


# ─── POST /api/auth/forgot-password ─────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a password reset token (in production, send via email)."""

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

    # In production, send raw_token via email
    # For development, return it in the response
    return MessageResponse(
        message="If the email exists, a reset link has been sent",
    )


# ─── POST /api/auth/reset-password ──────────────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
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
def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return current_user
