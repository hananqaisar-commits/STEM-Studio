from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# Association Tables for Many-to-Many Relationships

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.role_id", ondelete="CASCADE"), primary_key=True),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.role_id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.permission_id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[Optional[str]] = mapped_column(String(50))
    last_name: Mapped[Optional[str]] = mapped_column(String(50))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    sessions: Mapped[List["UserSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    email_verifications: Mapped[List["EmailVerification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    password_resets: Mapped[List["PasswordReset"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    roles: Mapped[List["Role"]] = relationship(secondary=user_roles, back_populates="users")
    login_attempts: Mapped[List["LoginAttempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    quiz_attempts: Mapped[List["QuizAttempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    module_progress: Mapped[List["ModuleProgress"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    streak: Mapped[Optional["UserStreak"]] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    saved_sessions: Mapped[List["SavedSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tutor_learning_profile: Mapped[Optional["TutorLearningProfile"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    support_tickets: Mapped[List["SupportTicket"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    preferences: Mapped[Optional["UserPreference"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    notification_reads: Mapped[List["AnnouncementRead"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    announcement_recipients: Mapped[List["AnnouncementRecipient"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    session_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"))
    refresh_token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="sessions")


class OwnerAccount(Base):
    """Singleton database anchor for the one server-provisioned owner identity."""

    __tablename__ = "owner_accounts"
    __table_args__ = (CheckConstraint("owner_slot = 1", name="ck_owner_accounts_singleton_slot"),)

    owner_slot: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), unique=True)


class OwnerMFACredential(Base):
    """Encrypted owner TOTP credential; provisioning is server-side only."""

    __tablename__ = "owner_mfa_credentials"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    encrypted_secret: Mapped[str] = mapped_column(String(512))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_counter: Mapped[int] = mapped_column(Integer, default=-1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OwnerSessionGrant(Base):
    """Marks a database session that completed owner MFA."""

    __tablename__ = "owner_session_grants"

    session_id: Mapped[int] = mapped_column(
        ForeignKey("user_sessions.session_id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    mfa_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AdminAuditEvent(Base):
    """Administrative audit trail containing no credential or token material."""

    __tablename__ = "admin_audit_events"

    event_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), index=True)
    target_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    outcome: Mapped[str] = mapped_column(String(16), default="success")
    details_json: Mapped[str] = mapped_column(String(2000), default="{}")
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    verification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="email_verifications")


class EmailOutbox(Base):
    """Durable, encrypted verification-mail jobs shared by all API replicas."""

    __tablename__ = "email_outbox"
    __table_args__ = (
        Index("ix_email_outbox_queue", "status", "available_at", "created_at"),
    )

    job_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    verification_id: Mapped[int] = mapped_column(
        ForeignKey("email_verifications.verification_id", ondelete="CASCADE"), index=True
    )
    encrypted_token: Mapped[str] = mapped_column(Text())
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    lease_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error_category: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class PasswordReset(Base):
    __tablename__ = "password_resets"

    reset_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="password_resets")


class Role(Base):
    __tablename__ = "roles"

    role_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(50), unique=True)

    users: Mapped[List["User"]] = relationship(secondary=user_roles, back_populates="roles")
    permissions: Mapped[List["Permission"]] = relationship(secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    permission_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    permission_name: Mapped[str] = mapped_column(String(100), unique=True)

    roles: Mapped[List["Role"]] = relationship(secondary=role_permissions, back_populates="permissions")


class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    attempt_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    email: Mapped[str] = mapped_column(String(255))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    successful: Mapped[bool] = mapped_column(Boolean, default=False)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255))

    user: Mapped[Optional["User"]] = relationship(back_populates="login_attempts")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    attempt_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    module_name: Mapped[str] = mapped_column(String(50), index=True)
    algorithm_id: Mapped[str] = mapped_column(String(50))
    question_prompt: Mapped[str] = mapped_column(String(500))
    selected_option: Mapped[str] = mapped_column(String(255))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="quiz_attempts")


class ModuleProgress(Base):
    __tablename__ = "module_progress"

    progress_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    module_name: Mapped[str] = mapped_column(String(50), index=True)
    completed_algorithms: Mapped[str] = mapped_column(String(1000), default="[]")
    completion_percentage: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="module_progress")


class UserStreak(Base):
    __tablename__ = "user_streaks"

    streak_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, index=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=1)
    highest_streak: Mapped[int] = mapped_column(Integer, default=1)
    last_active_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="streak")


class SavedSession(Base):
    __tablename__ = "saved_sessions"

    session_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(100))
    module_name: Mapped[str] = mapped_column(String(50))
    algorithm_id: Mapped[str] = mapped_column(String(50))
    dataset_json: Mapped[str] = mapped_column(String(5000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="saved_sessions")


class TutorLearningProfile(Base):
    """Small, user-controlled tutor adaptation signals; never stores chat transcripts."""

    __tablename__ = "tutor_learning_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    response_style: Mapped[str] = mapped_column(String(24), default="balanced")
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    needs_detail_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="tutor_learning_profile")


class Review(Base):
    __tablename__ = "reviews"

    review_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(100))
    rating: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(String(2000))
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    ticket_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(50))
    subject: Mapped[str] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(String(5000))
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    owner_reply: Mapped[Optional[str]] = mapped_column(String(5000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="support_tickets")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    theme: Mapped[Optional[str]] = mapped_column(String(10))
    marketing_email_opt_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="preferences")


class Announcement(Base):
    """An owner-published in-app message for the active account audience."""

    __tablename__ = "announcements"

    announcement_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(140))
    message: Mapped[str] = mapped_column(String(3000))
    kind: Mapped[str] = mapped_column(String(24), default="announcement", index=True)
    audience_size: Mapped[int] = mapped_column(Integer, default=0)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    email_requested: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_audience_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    email_status: Mapped[str] = mapped_column(String(20), default="not_requested", nullable=False)
    email_sent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    email_failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recipients: Mapped[List["AnnouncementRecipient"]] = relationship(
        back_populates="announcement", cascade="all, delete-orphan"
    )


class FeaturePolicy(Base):
    """Owner-managed availability and premium status for a registered module."""

    __tablename__ = "feature_policies"

    feature_key: Mapped[str] = mapped_column(String(80), primary_key=True)
    label: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(500), default="")
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    disabled_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SubscriptionPlan(Base):
    """Versioned, owner-managed free or paid package offered to learners."""

    __tablename__ = "subscription_plans"

    plan_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(1000), default="")
    price_minor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    list_price_minor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discount_label: Mapped[Optional[str]] = mapped_column(String(80))
    currency: Mapped[str] = mapped_column(String(3), default="PKR", nullable=False)
    billing_interval: Mapped[str] = mapped_column(String(12), default="monthly", nullable=False)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    safepay_plan_id: Mapped[Optional[str]] = mapped_column(String(120), unique=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PlanFeature(Base):
    """Feature membership for one plan; unknown feature keys fail closed."""

    __tablename__ = "plan_features"

    plan_id: Mapped[int] = mapped_column(ForeignKey("subscription_plans.plan_id", ondelete="CASCADE"), primary_key=True)
    feature_key: Mapped[str] = mapped_column(
        ForeignKey("feature_policies.feature_key", ondelete="CASCADE"), primary_key=True
    )
    included: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Subscription(Base):
    """Provider- or owner-backed access period; state changes come from verified events."""

    __tablename__ = "subscriptions"

    subscription_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("subscription_plans.plan_id", ondelete="RESTRICT"), index=True)
    provider: Mapped[str] = mapped_column(String(24), default="safepay", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    reference: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    provider_subscription_id: Mapped[Optional[str]] = mapped_column(String(120), unique=True)
    current_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    past_due_since: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    premium_hold_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_payment_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_provider_transaction_id: Mapped[Optional[str]] = mapped_column(String(120), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PaymentRecord(Base):
    """Minimal payment ledger; no card numbers or security codes are stored."""

    __tablename__ = "payment_records"

    payment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), index=True)
    plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("subscription_plans.plan_id", ondelete="SET NULL"))
    subscription_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscriptions.subscription_id", ondelete="SET NULL"), index=True
    )
    provider: Mapped[str] = mapped_column(String(24), nullable=False)
    provider_transaction_id: Mapped[Optional[str]] = mapped_column(String(120), unique=True)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(32))
    external_reference: Mapped[Optional[str]] = mapped_column(String(160), index=True)
    reviewed_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    failure_code: Mapped[Optional[str]] = mapped_column(String(64))
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class PaymentWebhookEvent(Base):
    """Idempotency and retry ledger for signed payment-provider events."""

    __tablename__ = "payment_webhook_events"

    event_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(80), index=True)
    payload_summary: Mapped[str] = mapped_column(String(4000), default="{}", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_error_code: Mapped[Optional[str]] = mapped_column(String(64))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class ManualPaymentMethod(Base):
    """Public owner-configured bank or wallet instructions; never store card credentials."""

    __tablename__ = "manual_payment_methods"

    payment_method_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    provider_key: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    account_name: Mapped[str] = mapped_column(String(120), nullable=False)
    account_identifier: Mapped[str] = mapped_column(String(160), nullable=False)
    instructions: Mapped[str] = mapped_column(String(1000), default="")
    currency: Mapped[str] = mapped_column(String(3), default="PKR", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ManualPaymentClaim(Base):
    """Learner-submitted transfer reference awaiting owner reconciliation."""

    __tablename__ = "manual_payment_claims"
    __table_args__ = (UniqueConstraint("transaction_reference", name="uq_manual_payment_claim_reference"),)

    claim_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("subscription_plans.plan_id", ondelete="RESTRICT"))
    payment_method_id: Mapped[int] = mapped_column(
        ForeignKey("manual_payment_methods.payment_method_id", ondelete="RESTRICT")
    )
    transaction_reference: Mapped[str] = mapped_column(String(160), index=True)
    amount_minor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="PKR", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    owner_note: Mapped[Optional[str]] = mapped_column(String(500))
    reviewed_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    payment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("payment_records.payment_id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BillingNotice(Base):
    """Uniquely staged renewal reminders and delivery status for retry safety."""

    __tablename__ = "billing_notices"
    __table_args__ = (UniqueConstraint("subscription_id", "cycle_key", "stage", name="uq_billing_notice_stage"),)

    notice_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("subscriptions.subscription_id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    cycle_key: Mapped[str] = mapped_column(String(80), nullable=False)
    stage: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(140), nullable=False, default="Subscription reminder")
    message: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    email_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class AdConfiguration(Base):
    """Owner-managed public ad identifiers and placements; disabled by default."""

    __tablename__ = "ad_configuration"

    config_id: Mapped[int] = mapped_column(primary_key=True, default=1)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    publisher_id: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    landing_slot_id: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    learner_slot_id: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    updated_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserFeatureOverride(Base):
    """Explicit per-user feature allow/deny override, optionally time limited."""

    __tablename__ = "user_feature_overrides"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    feature_key: Mapped[str] = mapped_column(
        ForeignKey("feature_policies.feature_key", ondelete="CASCADE"), primary_key=True
    )
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AnnouncementRecipient(Base):
    """Immutable audience snapshot, one row per account eligible at publish time."""

    __tablename__ = "announcement_recipients"

    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.announcement_id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True, index=True
    )

    announcement: Mapped["Announcement"] = relationship(back_populates="recipients")
    user: Mapped["User"] = relationship(back_populates="announcement_recipients")


class AnnouncementRead(Base):
    """Per-user read receipt; broadcasts themselves are stored only once."""

    __tablename__ = "announcement_reads"

    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.announcement_id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True, index=True
    )
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="notification_reads")


class AnnouncementEmailDelivery(Base):
    """Per-recipient delivery outcome for owner email broadcasts."""

    __tablename__ = "announcement_email_deliveries"
    __table_args__ = (UniqueConstraint("announcement_id", "user_id", name="uq_announcement_email_recipient"),)

    delivery_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    announcement_id: Mapped[int] = mapped_column(
        ForeignKey("announcements.announcement_id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="queued", nullable=False)
    error_type: Mapped[Optional[str]] = mapped_column(String(64))
    attempted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
