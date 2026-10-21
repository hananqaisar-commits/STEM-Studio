"""
Custom Code execution route.

POST /api/execute/custom-code — takes the user's pasted function/class,
combines it with the auto-generated harness for the algorithm's input-shape
category and the current UI state, executes it in Judge0, and parses the
trace steps / final result out of stdout.
"""

import json
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

try:
    from backend.app.api.dependencies import get_current_user
    from backend.app.api.schemas import CustomCodeExecutionRequest, CustomCodeExecutionResponse
    from backend.app.core.config import get_settings
    from backend.app.core.feature_access import require_algorithm_access, require_feature_access
    from backend.app.core.rate_limit import RateLimiter
    from backend.app.services.custom_code import harness, judge0, registry
    from backend.infrastructure.database.database import get_db
    from backend.infrastructure.database.models import User
except ModuleNotFoundError:
    from app.api.dependencies import get_current_user
    from app.api.schemas import CustomCodeExecutionRequest, CustomCodeExecutionResponse
    from app.core.config import get_settings
    from app.core.feature_access import require_algorithm_access, require_feature_access
    from app.core.rate_limit import RateLimiter
    from app.services.custom_code import harness, judge0, registry
    from infrastructure.database.database import get_db
    from infrastructure.database.models import User

router = APIRouter(prefix="/api/execute", tags=["Custom Code"])
_rate_settings = get_settings()
_user_submission_limiter = RateLimiter(_rate_settings.JUDGE0_RATE_LIMIT_PER_MINUTE, 60)
_ip_submission_limiter = RateLimiter(120, 60)

_STEP_PREFIX = "__VSTEP__ "
_RESULT_PREFIX = "__VRESULT__ "
_EMIT_ROW_PREFIX = "__VEMIT_ROW__ "
_EMIT_PAIR_PREFIX = "__VEMIT_PAIR__ "


def _enforce_submission_limits(
    request: Request,
    user: User = Depends(get_current_user),
) -> User:
    """Require a signed-in learner and cap both account and source-IP usage."""
    _user_submission_limiter.raise_if_limited(f"judge0:user:{user.user_id}")
    if _rate_settings.TRUST_X_FORWARDED_FOR:
        forwarded = request.headers.get("x-forwarded-for", "")
        client_ip = forwarded.split(",", 1)[0].strip() if forwarded else ""
    else:
        client_ip = ""
    if not client_ip:
        client_ip = request.client.host if request.client else "unknown"
    _ip_submission_limiter.raise_if_limited(f"judge0:ip:{client_ip}")
    return user


def parse_execution_output(stdout: str) -> Tuple[List[dict], List[List[int]], List[List[int]], Any]:
    """Split stdout into (trace_steps, emitted_rows, emitted_pairs, result)."""
    trace_steps: List[dict] = []
    emitted_rows: List[List[int]] = []
    emitted_pairs: List[List[int]] = []
    result: Any = None

    for line in stdout.splitlines():
        if line.startswith(_STEP_PREFIX):
            try:
                trace_steps.append(json.loads(line[len(_STEP_PREFIX):]))
            except json.JSONDecodeError:
                continue
        elif line.startswith(_RESULT_PREFIX):
            try:
                result = json.loads(line[len(_RESULT_PREFIX):])
            except json.JSONDecodeError:
                continue
        elif line.startswith(_EMIT_ROW_PREFIX):
            try:
                emitted_rows.append(json.loads(line[len(_EMIT_ROW_PREFIX):]))
            except json.JSONDecodeError:
                continue
        elif line.startswith(_EMIT_PAIR_PREFIX):
            try:
                emitted_pairs.append(json.loads(line[len(_EMIT_PAIR_PREFIX):]))
            except json.JSONDecodeError:
                continue

    # C collection results stream through the emit helpers instead of a
    # single return value — fold them into the result payload.
    if isinstance(result, dict) and result.get("emitted"):
        if emitted_pairs:
            result = {"result": {str(k): v for k, v in emitted_pairs}}
        else:
            result = {"result": emitted_rows}

    return trace_steps, emitted_rows, emitted_pairs, result


@router.post("/custom-code", response_model=CustomCodeExecutionResponse)
async def execute_custom_code(
    req: CustomCodeExecutionRequest,
    _user: User = Depends(_enforce_submission_limits),
    db: Session = Depends(get_db),
) -> CustomCodeExecutionResponse:
    feature_key = req.algorithm_key.split(".", 1)[0]
    require_feature_access(db, _user, feature_key)
    try:
        category, algorithm_id = req.algorithm_key.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Algorithm key must include its category.") from exc
    require_algorithm_access(db, _user, category, algorithm_id)
    settings = get_settings()
    if not settings.JUDGE0_URL:
        raise HTTPException(
            status_code=503,
            detail="Code execution is not configured on the API host. Set JUDGE0_URL and the Judge0 authentication secret in the backend deployment settings.",
        )
    if not settings.JUDGE0_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Code execution is not securely configured. Set the Judge0 authentication token as the backend secret JUDGE0_API_KEY.",
        )

    algo = registry.get_algorithm(req.algorithm_key)
    if algo is None:
        raise HTTPException(status_code=404, detail=f"Unknown algorithm: {req.algorithm_key}")

    contract_error = registry.validate_submission(algo, req.language, req.code, req.state)
    if contract_error:
        raise HTTPException(status_code=422, detail=contract_error)

    # Keep the registered name as the default, while allowing a small set of
    # common LeetCode-style names (for example hasCycle / cycleDetection).
    resolved_entry = (
        algo["entry"]
        if algo["kind"] == "class"
        else registry.resolve_submission_entry(algo, req.language, req.code)
    )
    if resolved_entry is None:
        raise HTTPException(status_code=422, detail="The required method could not be resolved.")
    algo = {
        **algo,
        "_entryOverride": resolved_entry,
        "_entryNoArgs": registry.submission_is_zero_argument(algo, req.language, req.code, resolved_entry),
    }

    try:
        source = harness.build_harness(req.language, algo, req.code, req.state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        raw = await judge0.submit(
            source,
            req.language,
            settings.JUDGE0_URL,
            settings.JUDGE0_API_KEY,
            auth_header=getattr(settings, "JUDGE0_AUTH_HEADER", "X-Auth-Token"),
            timeout_seconds=settings.JUDGE0_TIMEOUT_SECONDS,
        )
    except judge0.Judge0Error as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    trace_steps, emitted_rows, emitted_pairs, result = parse_execution_output(raw["stdout"])

    if raw["status"] == "compile_error":
        return CustomCodeExecutionResponse(
            status="compile_error",
            error=raw["compile_output"] or raw["stderr"] or "Compilation failed.",
            stderr=raw["stderr"],
        )

    if raw["status"] == "timeout":
        return CustomCodeExecutionResponse(
            status="timeout",
            error="Execution timed out. Check for infinite loops.",
            trace_steps=trace_steps,
        )

    if raw["status"] == "runtime_error":
        return CustomCodeExecutionResponse(
            status="runtime_error",
            error=raw["stderr"] or raw["message"] or "Runtime error.",
            stderr=raw["stderr"],
            trace_steps=trace_steps,
            result=result,
            emitted_rows=emitted_rows,
            emitted_pairs=emitted_pairs,
        )

    return CustomCodeExecutionResponse(
        status="ok",
        trace_steps=trace_steps,
        result=result,
        emitted_rows=emitted_rows,
        emitted_pairs=emitted_pairs,
    )
