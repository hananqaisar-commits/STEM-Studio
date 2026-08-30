"""
Custom Code execution route.

POST /api/execute/custom-code — takes the user's pasted function/class,
combines it with the auto-generated harness for the algorithm's input-shape
category and the current UI state, executes it in Judge0, and parses the
trace steps / final result out of stdout.
"""

import json
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, HTTPException

try:
    from backend.app.api.schemas import CustomCodeExecutionRequest, CustomCodeExecutionResponse
    from backend.app.core.config import get_settings
    from backend.app.services.custom_code import harness, judge0, registry
except ModuleNotFoundError:
    from app.api.schemas import CustomCodeExecutionRequest, CustomCodeExecutionResponse
    from app.core.config import get_settings
    from app.services.custom_code import harness, judge0, registry

router = APIRouter(prefix="/api/execute", tags=["Custom Code"])

_STEP_PREFIX = "__VSTEP__ "
_RESULT_PREFIX = "__VRESULT__ "
_EMIT_ROW_PREFIX = "__VEMIT_ROW__ "
_EMIT_PAIR_PREFIX = "__VEMIT_PAIR__ "


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
async def execute_custom_code(req: CustomCodeExecutionRequest) -> CustomCodeExecutionResponse:
    settings = get_settings()
    if not settings.JUDGE0_URL:
        raise HTTPException(
            status_code=503,
            detail="Execution service is not configured (JUDGE0_URL missing on the backend).",
        )

    algo = registry.get_algorithm(req.algorithm_key)
    if algo is None:
        raise HTTPException(status_code=404, detail=f"Unknown algorithm: {req.algorithm_key}")

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
            settings.JUDGE0_TIMEOUT_SECONDS,
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
