from datetime import datetime
from typing import List, Optional

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
    # "Remember me" extends the refresh-token/session lifetime so the user
    # stays signed in across browser restarts.
    remember_me: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ─── Auth Response Schemas ───────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    is_verified: bool
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
    active_learners: int
    total_reviews: int
    average_rating: float


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
    conversation_history: List[OctaTutorMessage] = Field(default_factory=list)


class OctaTutorFunctionCall(BaseModel):
    name: str
    args: dict = Field(default_factory=dict)


class OctaTutorResponse(BaseModel):
    reply: str
    function_calls: List[OctaTutorFunctionCall] = Field(default_factory=list)
    mascot_expression: str = Field(default="helping")

