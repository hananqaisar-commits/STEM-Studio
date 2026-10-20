from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ─── Auth Request Schemas ────────────────────────────────────────────

class SignUpRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)


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


class AnnouncementResponse(BaseModel):
    announcement_id: int
    title: str
    message: str
    kind: str
    published_at: datetime
    is_read: bool = False


class NotificationInboxResponse(BaseModel):
    unread_count: int
    items: List[AnnouncementResponse]


class AnnouncementAdminResponse(AnnouncementResponse):
    audience_size: int


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
