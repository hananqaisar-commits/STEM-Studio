"""Full-program execution endpoint for the Live Code workspace."""

from __future__ import annotations

import secrets
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from backend.app.api.routes.execute import _enforce_submission_limits
    from backend.app.core.config import get_settings
    from backend.app.core.feature_access import require_algorithm_access, require_feature_access
    from backend.app.services.custom_code import cpp_trace, judge0, live_trace, local_runner
    from backend.infrastructure.database.database import get_db
    from backend.infrastructure.database.models import User
except ModuleNotFoundError:
    from app.api.routes.execute import _enforce_submission_limits
    from app.core.config import get_settings
    from app.core.feature_access import require_algorithm_access, require_feature_access
    from app.services.custom_code import cpp_trace, judge0, live_trace, local_runner
    from infrastructure.database.database import get_db
    from infrastructure.database.models import User


router = APIRouter(prefix="/api/execute", tags=["Live Code"])


class LiveCodeExecutionRequest(BaseModel):
    category_id: str = Field(..., min_length=1, max_length=40, pattern=r"^[A-Za-z][A-Za-z0-9_-]*$")
    topic_id: Optional[str] = Field(default=None, max_length=60, pattern=r"^[A-Za-z0-9_-]+$")
    language: str = Field(..., pattern=r"^(python|cpp|c|java|go|csharp)$")
    code: str = Field(..., min_length=1, max_length=30_000)
    stdin: str = Field(default="", max_length=8_000)
    revision: str = Field(..., min_length=1, max_length=80)


class LiveCodeExecutionResponse(BaseModel):
    status: Literal["ok", "compile_error", "runtime_error", "timeout"]
    revision: str
    stdout: str = ""
    stderr: str = ""
    error: Optional[str] = None
    trace_steps: list[dict[str, Any]] = Field(default_factory=list)
    trace_support: Literal["automatic", "not_available"]
    trace_truncated: bool = False
    trace_error: Optional[dict[str, Any]] = None


@router.post("/live-code", response_model=LiveCodeExecutionResponse)
async def execute_live_code(
    req: LiveCodeExecutionRequest,
    _user: User = Depends(_enforce_submission_limits),
    db: Session = Depends(get_db),
) -> LiveCodeExecutionResponse:
    """Execute the learner's complete program.

    When Judge0 is configured the request is forwarded to the external sandbox.
    When Judge0 is **not** configured, Python programs are executed in a local
    subprocess on the API host so the Live Code feature works on every
    deployment (including Render Free) without an external service.

    Python programs use a bounded runtime probe. C++ programs use bounded
    source instrumentation for line, scope, and supported public-struct snapshots.
    Other languages run as complete programs and return their real stdout/errors.
    """
    require_feature_access(db, _user, req.category_id)
    if req.topic_id:
        require_algorithm_access(db, _user, req.category_id, req.topic_id)
    if len(req.code.encode("utf-8")) > 30_000 or len(req.stdin.encode("utf-8")) > 8_000:
        raise HTTPException(status_code=413, detail="Program or input is larger than the live runner limit.")

    settings = get_settings()
    use_judge0 = bool(settings.JUDGE0_URL and settings.JUDGE0_API_KEY)

    # When Judge0 is unavailable, only Python is supported through the local
    # subprocess runner.  Other compiled languages need Judge0.
    if not use_judge0 and req.language != "python":
        raise HTTPException(
            status_code=503,
            detail=f"Live execution for {req.language} requires the Judge0 sandbox service. "
                   f"Python is available now — switch to Python or configure Judge0 on the API host.",
        )

    nonce = secrets.token_hex(12)
    cpp_instrumented: Optional[str] = None
    if req.language == "python":
        trace_support: Literal["automatic", "not_available"] = "automatic"
        source = live_trace.build_python_trace_program(req.code, nonce)
    elif req.language == "cpp":
        cpp_instrumented = cpp_trace.build_cpp_trace_program(req.code, nonce)
        trace_support = "automatic" if cpp_instrumented is not None else "not_available"
        source = cpp_instrumented or req.code
    else:
        trace_support = "not_available"
        source = req.code

    # ── Execute via Judge0 or local subprocess ───────────────────────
    if use_judge0:
        try:
            raw = await judge0.submit(
                source,
                req.language,
                settings.JUDGE0_URL,
                settings.JUDGE0_API_KEY,
                auth_header=getattr(settings, "JUDGE0_AUTH_HEADER", "X-Auth-Token"),
                timeout_seconds=min(settings.JUDGE0_TIMEOUT_SECONDS, 20),
                stdin=req.stdin,
            )
        except judge0.Judge0Error as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        # A source adapter must never turn a valid learner program into an adapter
        # compilation failure. If our generated C++ probe fails to compile, rerun
        # the original code and report the real compiler result without snapshots.
        if req.language == "cpp" and cpp_instrumented is not None and raw["status"] == "compile_error":
            try:
                raw = await judge0.submit(
                    req.code,
                    req.language,
                    settings.JUDGE0_URL,
                    settings.JUDGE0_API_KEY,
                    auth_header=getattr(settings, "JUDGE0_AUTH_HEADER", "X-Auth-Token"),
                    timeout_seconds=min(settings.JUDGE0_TIMEOUT_SECONDS, 20),
                    stdin=req.stdin,
                )
                cpp_instrumented = None
                trace_support = "not_available"
            except judge0.Judge0Error as exc:
                raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        # Local subprocess fallback — Python only
        try:
            raw = await local_runner.run_python(
                source,
                stdin=req.stdin,
                timeout_seconds=min(getattr(settings, "JUDGE0_TIMEOUT_SECONDS", 15), 20),
            )
        except local_runner.LocalRunnerError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    stdout = raw.get("stdout", "") or ""
    stderr = raw.get("stderr", "") or ""
    trace_steps: list[dict[str, Any]] = []
    trace_truncated = False
    trace_error: Optional[dict[str, Any]] = None
    if req.language == "python":
        trace_steps, stdout, trace_truncated, trace_error = live_trace.parse_python_trace_output(stdout, nonce)
    elif req.language == "cpp" and cpp_instrumented is not None:
        trace_steps, stderr, trace_truncated = cpp_trace.parse_cpp_trace_output(stderr, nonce)
        if not trace_steps and raw["status"] == "ok":
            trace_support = "not_available"
            trace_error = {"kind": "capture_unavailable", "message": "The C++ program ran, but this source did not produce automatic snapshots."}

    status = raw["status"]
    error: Optional[str] = None
    if trace_error and trace_error.get("kind") == "syntax_error":
        status = "compile_error"
        line = trace_error.get("line")
        error = f"Syntax error on line {line}: {trace_error.get('message', 'invalid syntax')}" if line else str(trace_error.get("message", "Syntax error."))
    elif trace_error and trace_error.get("kind") == "runtime_error":
        line = trace_error.get("line")
        location = f" on line {line}" if line else ""
        exception_type = trace_error.get("exception_type") or "Runtime error"
        message = trace_error.get("message") or ""
        error = f"{exception_type}{location}: {message}" if message else f"{exception_type}{location}."
    elif status == "compile_error":
        error = raw.get("compile_output") or stderr or "Compilation failed."
    elif status == "timeout":
        error = "Execution timed out. Check for infinite loops."
    elif status == "runtime_error":
        error = stderr or raw.get("message") or "Runtime error."

    return LiveCodeExecutionResponse(
        status=status,
        revision=req.revision,
        stdout=stdout[:20_000],
        stderr=stderr[:12_000],
        error=error[:12_000] if error else None,
        trace_steps=trace_steps,
        trace_support=trace_support,
        trace_truncated=trace_truncated,
        trace_error=trace_error,
    )
