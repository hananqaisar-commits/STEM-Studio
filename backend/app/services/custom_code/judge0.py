"""
Judge0 submission client for Custom Code execution.

Judge0 runs each submission in an isolated sandbox; executions are stateless,
so stateful data structures are handled by replaying the operation history in
the generated harness (see harness.py).
"""

from typing import Any, Dict, Optional

import base64

import httpx

# Judge0 CE language IDs (https://github.com/judge0/judge0/blob/master/README.md)
LANGUAGE_IDS: Dict[str, int] = {
    "python": 71,   # Python (3.10)
    "cpp": 54,      # C++ (GCC 9.2.0)
    "c": 50,        # C (GCC 9.2.0)
    "java": 62,     # Java (OpenJDK 13.0.2)
    "go": 60,       # Go (1.13.5)
    "csharp": 51,   # C# (Mono 6.8.0)
}

# Judge0 status.id -> our status vocabulary
_STATUS_MAP = {
    3: "ok",                # Accepted
    4: "runtime_error",     # Wrong Answer (runs to completion; output compared by frontend)
    5: "timeout",           # Time Limit Exceeded
    6: "compile_error",     # Compilation Error
    7: "runtime_error",
    8: "runtime_error",
    9: "runtime_error",
    10: "runtime_error",
    11: "runtime_error",
    12: "runtime_error",
    13: "runtime_error",
}


class Judge0Error(Exception):
    """Raised when the Judge0 service itself is unreachable or misbehaves."""


def _b64dec(value: Optional[str]) -> str:
    if not value:
        return ""
    try:
        return base64.b64decode(value).decode("utf-8", errors="replace")
    except Exception:
        return value


async def submit(
    source_code: str,
    language: str,
    judge0_url: str,
    api_key: str = "",
    timeout_seconds: int = 20,
) -> Dict[str, Any]:
    """
    Submit code to Judge0 and wait for the result.

    Payloads and responses use base64 encoding — the plain-text mode rejects
    submissions whose output cannot round-trip UTF-8.

    Returns a dict with: status, stdout, stderr, compile_output, message.
    """
    if language not in LANGUAGE_IDS:
        raise ValueError(f"Unsupported language: {language}")

    url = judge0_url.rstrip("/") + "/submissions"
    params = {"wait": "true", "base64_encoded": "true"}
    payload = {
        "source_code": base64.b64encode(source_code.encode("utf-8")).decode("ascii"),
        "language_id": LANGUAGE_IDS[language],
        "stdin": "",
    }
    headers: Dict[str, str] = {}
    if api_key:
        headers["X-Auth-User"] = api_key

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(url, params=params, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise Judge0Error("Execution service timed out. Please try again.") from exc
    except httpx.HTTPError as exc:
        raise Judge0Error("Execution service is unreachable right now.") from exc

    if resp.status_code >= 400:
        detail = ""
        try:
            detail = resp.json().get("error", "")
        except Exception:
            detail = resp.text[:200]
        raise Judge0Error(f"Execution service rejected the submission (HTTP {resp.status_code}). {detail}")

    data = resp.json()

    status_id: Optional[int] = (data.get("status") or {}).get("id")
    status = _STATUS_MAP.get(status_id or 0, "runtime_error")
    return {
        "status": status,
        "stdout": _b64dec(data.get("stdout")),
        "stderr": _b64dec(data.get("stderr")),
        "compile_output": _b64dec(data.get("compile_output")),
        "message": (data.get("status") or {}).get("description", ""),
    }
