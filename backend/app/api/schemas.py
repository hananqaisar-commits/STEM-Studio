from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# ─── Auth Request Schemas ────────────────────────────────────────────

class SignUpRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    marketing_email_opt_in: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    owner_mode: bool = False
    mfa_code: Optional[str] = Field(default=None, min_length=6, max_length=6, pattern=r"^\d{6}$")

    model_config = ConfigDict(extra="forbid")

class GoogleSignInRequest(BaseModel):
    credential: str
    client_id: str
    remember_me: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class OwnerReauthRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=128)
    mfa_code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class OwnerUserStatusRequest(BaseModel):
    is_active: bool


class OwnerFeaturePolicyRequest(BaseModel):
    is_premium: bool
    is_enabled: bool = True
    is_archived: bool = False
    disabled_until: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_pause(self):
        if self.is_enabled and self.disabled_until is not None:
            raise ValueError("An enabled feature cannot have a pause expiry")
        if self.disabled_until is not None:
            point = self.disabled_until
            if point.tzinfo is None:
                point = point.replace(tzinfo=timezone.utc)
            if point <= datetime.now(timezone.utc):
                raise ValueError("Pause expiry must be in the future")
        return self


class OwnerFeatureCreateRequest(BaseModel):
    feature_key: str = Field(..., min_length=2, max_length=80, pattern=r"^[a-z0-9][a-z0-9._-]*$")
    label: str = Field(..., min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    is_premium: bool = False
    is_enabled: bool = True


class PlanWriteRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=80, pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(..., min_length=2, max_length=120)
    description: str = Field(default="", max_length=1000)
    price_minor: int = Field(..., ge=0, le=100_000_000)
    list_price_minor: Optional[int] = Field(default=None, ge=0, le=100_000_000)
    discount_label: Optional[str] = Field(default=None, max_length=80)
    currency: Literal["PKR", "USD"] = "PKR"
    billing_interval: Literal["monthly", "yearly"] = "monthly"
    is_free: bool = False
    is_active: bool = True
    is_public: bool = True
    is_featured: bool = False
    safepay_plan_id: Optional[str] = Field(default=None, max_length=120)
    feature_keys: List[str] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def validate_plan(self):
        if self.is_free and self.price_minor != 0:
            raise ValueError("Free plans must have a zero price")
        if not self.is_free and self.price_minor <= 0:
            raise ValueError("Paid plans must have a positive price")
        if self.list_price_minor is not None and self.list_price_minor < self.price_minor:
            raise ValueError("The regular price cannot be lower than the amount charged")
        if self.is_free and self.list_price_minor not in (None, 0):
            raise ValueError("Free plans cannot have a regular paid price")
        if self.is_free and self.billing_interval not in {"monthly", "yearly"}:
            raise ValueError("Invalid billing interval")
        if len(set(self.feature_keys)) != len(self.feature_keys):
            raise ValueError("Feature keys must be unique")
        return self


class ManualPaymentMethodWriteRequest(BaseModel):
    provider_key: Literal["easypaisa", "jazzcash", "bank_transfer", "other"]
    label: str = Field(..., min_length=2, max_length=100)
    account_name: str = Field(..., min_length=2, max_length=120)
    account_identifier: str = Field(..., min_length=3, max_length=160)
    instructions: str = Field(default="", max_length=1000)
    currency: Literal["PKR", "USD"] = "PKR"
    is_active: bool = True


class ManualPaymentClaimRequest(BaseModel):
    plan_id: int = Field(..., ge=1)
    payment_method_id: int = Field(..., ge=1)
    transaction_reference: str = Field(..., min_length=4, max_length=160)


class ManualPaymentReviewRequest(BaseModel):
    approve: bool
    owner_note: str = Field(default="", max_length=500)


class OwnerSubscriptionActionRequest(BaseModel):
    action: Literal["grant", "suspend", "restore", "end"]
    plan_id: Optional[int] = Field(default=None, ge=1)
    duration_days: Optional[int] = Field(default=30, ge=1, le=366)


class OwnerAdConfigurationRequest(BaseModel):
    is_enabled: bool = False
    publisher_id: str = Field(default="", max_length=40, pattern=r"^(|pub-[0-9]{16})$")
    landing_slot_id: str = Field(default="", max_length=40, pattern=r"^(|[0-9]{1,40})$")
    learner_slot_id: str = Field(default="", max_length=40, pattern=r"^(|[0-9]{1,40})$")


class AnnouncementDeleteRequest(BaseModel):
    announcement_ids: List[int] = Field(default_factory=list, max_length=100)
    delete_all: bool = False

    @model_validator(mode="after")
    def require_scope(self):
        if not self.delete_all and not self.announcement_ids:
            raise ValueError("Select broadcasts to delete or choose delete_all")
        if len(set(self.announcement_ids)) != len(self.announcement_ids):
            raise ValueError("Broadcast IDs must be unique")
        return self


class AuditDeleteRequest(BaseModel):
    event_ids: List[int] = Field(default_factory=list, max_length=200)
    older_than_days: Optional[int] = Field(default=None, ge=30, le=3650)
    delete_all: bool = False

    @model_validator(mode="after")
    def require_scope(self):
        if not self.event_ids and self.older_than_days is None and not self.delete_all:
            raise ValueError("Select audit events, specify a retention age, or choose delete_all")
        if len(set(self.event_ids)) != len(self.event_ids):
            raise ValueError("Audit event IDs must be unique")
        return self


class BillingCheckoutRequest(BaseModel):
    plan_id: int = Field(..., ge=1)


class BillingCheckoutResponse(BaseModel):
    checkout_url: str
    reference: str


class OwnerFeatureGrantRequest(BaseModel):
    feature_key: str = Field(..., min_length=2, max_length=80)
    granted: bool
    expires_at: Optional[datetime] = None


class OwnerUserDeleteRequest(BaseModel):
    confirmation: Literal["DELETE"]
    expected_username: str = Field(..., min_length=1, max_length=50)


class DeleteAccountRequest(BaseModel):
    confirmation: Literal["DELETE"]


# ─── Auth Response Schemas ───────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class OwnerLoginResponse(BaseModel):
    owner_session: bool = True
    csrf_token: str


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_owner: bool = False
    is_owner_session: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SignUpResponse(UserResponse):
    email_verification_required: bool = False


class MessageResponse(BaseModel):
    message: str
    success: bool = True


# ─── Progress & Quiz Schemas ─────────────────────────────────────────

class QuizSubmissionRequest(BaseModel):
    module_name: str = Field(..., max_length=50)
    algorithm_id: str = Field(..., max_length=50)
    question_prompt: str = Field(..., max_length=500)
    selected_option: str = Field(..., max_length=255)
    is_correct: bool


class QuizSubmissionResponse(BaseModel):
    attempt_id: int
    is_correct: bool
    total_quizzes_taken: int
    accuracy_percentage: float
    current_streak: int
    message: str


class CompleteAlgorithmRequest(BaseModel):
    module_name: str = Field(..., max_length=50)
    algorithm_id: str = Field(..., max_length=50)


class ModuleProgressResponse(BaseModel):
    module_name: str
    completed_algorithms: List[str]
    completion_percentage: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserStatsResponse(BaseModel):
    total_quizzes: int
    correct_quizzes: int
    accuracy_percentage: float
    current_streak: int
    highest_streak: int
    modules: List[ModuleProgressResponse]


# ─── Saved Session Schemas ───────────────────────────────────────────

class SaveSessionRequest(BaseModel):
    title: str = Field(..., max_length=100)
    module_name: str = Field(..., max_length=50)
    algorithm_id: str = Field(..., max_length=50)
    dataset_json: str = Field(..., max_length=5000)


class SavedSessionResponse(BaseModel):
    session_id: int
    title: str
    module_name: str
    algorithm_id: str
    dataset_json: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Public Platform Stats ───────────────────────────────────────────

class PlatformStatsResponse(BaseModel):
    registered_learners: int
    active_learners: int
    total_reviews: int
    average_rating: float


class SupportTicketCreateRequest(BaseModel):
    category: str = Field(..., min_length=2, max_length=50)
    subject: str = Field(..., min_length=4, max_length=120)
    message: str = Field(..., min_length=10, max_length=5000)


class SupportTicketResponse(BaseModel):
    ticket_id: int
    category: str
    subject: str
    message: str
    status: str
    owner_reply: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupportTicketInboxItem(SupportTicketResponse):
    user_id: int
    username: str
    email: str


class SupportTicketUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|resolved)$")
    owner_reply: Optional[str] = Field(default=None, max_length=5000)


# ─── In-app Announcements ────────────────────────────────────────────

class AnnouncementCreateRequest(BaseModel):
    title: str = Field(..., min_length=4, max_length=140)
    message: str = Field(..., min_length=10, max_length=3000)
    kind: Literal["announcement", "product_update", "promotion", "maintenance"] = "announcement"
    send_email: bool = False


class AnnouncementResponse(BaseModel):
    announcement_id: int
    title: str
    message: str
    kind: str
    published_at: datetime
    is_read: bool = False
    source: Literal["announcement", "billing"] = "announcement"
    notification_id: Optional[str] = None


class NotificationInboxResponse(BaseModel):
    unread_count: int
    items: List[AnnouncementResponse]


class AnnouncementAdminResponse(AnnouncementResponse):
    audience_size: int
    email_requested: bool = False
    email_audience_size: int = 0
    email_status: str = "not_requested"
    email_sent_count: int = 0
    email_failed_count: int = 0


# ─── Review Schemas ──────────────────────────────────────────────────

class ReviewCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., min_length=2, max_length=100)
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=10, max_length=2000)


class ReviewResponse(BaseModel):
    review_id: int
    name: str
    role: str
    rating: int
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



# ─── Custom Code Execution Schemas ───────────────────────────────────

class CustomCodeExecutionRequest(BaseModel):
    algorithm_key: str = Field(..., min_length=3, max_length=120, description="Composite key: categoryId.topicId")
    language: str = Field(..., pattern="^(python|cpp|c|java|go|csharp)$")
    code: str = Field(..., min_length=1, max_length=60_000)
    # Function-style: {"args": {paramName: value}}; stateful: {"ctorArgs": [...], "operations": [...]}
    state: dict = Field(default_factory=dict)


class CustomCodeExecutionResponse(BaseModel):
    status: str = Field(..., description="ok | compile_error | runtime_error | timeout")
    error: Optional[str] = None
    stderr: Optional[str] = None
    trace_steps: List[dict] = Field(default_factory=list)
    result: Optional[dict] = None
    emitted_rows: List[List[int]] = Field(default_factory=list)
    emitted_pairs: List[List[int]] = Field(default_factory=list)


# ─── Octa AI Tutor Schemas ───────────────────────────────────────────

class OctaTutorMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class OctaTutorRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    algorithm_name: str = Field(default="")
    algorithm_id: str = Field(default="")
    category: str = Field(default="")
    current_step_description: str = Field(default="")
    current_step_index: int = Field(default=0)
    total_steps: int = Field(default=0)
    step_data: str = Field(default="")
    current_page: str = Field(default="", max_length=300)
    site_catalog: str = Field(default="", max_length=12000)
    topic_knowledge: str = Field(default="", max_length=12000)
    conversation_history: List[OctaTutorMessage] = Field(default_factory=list)
    mode: str = Field(default="natural", description="natural | interactive")
    # Custom LLM provider configuration (Bring Your Own Key / BYOK)
    provider: str = Field(default="dashscope", description="dashscope | openai | openrouter | custom | anthropic")
    api_key: str = Field(default="")
    base_url: str = Field(default="")
    model_name: str = Field(default="")


class OctaTutorFeedbackRequest(BaseModel):
    helpful: bool
    response_style: Optional[Literal["simpler", "stepwise", "examples"]] = None


class OctaTutorPreferenceRequest(BaseModel):
    response_style: Literal["balanced", "simpler", "stepwise", "examples"]


class OctaTutorTestRequest(BaseModel):
    provider: str = Field(default="dashscope")
    api_key: str = Field(default="")
    base_url: str = Field(default="")
    model_name: str = Field(default="")


class OctaTutorTestResponse(BaseModel):
    success: bool
    message: str
    model_used: str = Field(default="")


class OctaTutorFunctionCall(BaseModel):
    name: str
    args: dict = Field(default_factory=dict)


class OctaTutorResponse(BaseModel):
    reply: str
    function_calls: List[OctaTutorFunctionCall] = Field(default_factory=list)
    mascot_expression: str = Field(default="helping")
    answer_source: str = Field(default="model", description="model | offline")
    provider_status: Literal["connected", "missing", "limit", "unavailable"] | None = Field(
        default=None,
        description="Safe provider health state; never includes credentials.",
    )
