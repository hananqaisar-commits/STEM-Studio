"""Lightweight subprocess-based code runner for environments without Judge0.

When JUDGE0_URL is not configured (local development or a Render deployment
without an external sandbox), this module executes Python programs in a
short-lived subprocess using the same Python interpreter that runs the API.

Security boundaries are intentionally thin — the subprocess shares the host
kernel and filesystem.  This is acceptable for a controlled educational
platform on Render where all callers are authenticated learners, but this
runner should **not** replace Judge0 on internet-facing production tiers that
need hard sandbox isolation.

Only Python is supported through this path.  Other languages (C++, Java, Go,
C#) require Judge0 and will return a clear 503 when it is unavailable.
"""

from __future__ import annotations

import asyncio
import tempfile
import os
from typing import Any, Dict, Optional


class LocalRunnerError(Exception):
    """Raised when the local subprocess execution fails at the infra level."""


async def run_python(
    source_code: str,
    *,
    stdin: str = "",
    timeout_seconds: int = 15,
    max_output_bytes: int = 512_000,
) -> Dict[str, Any]:
    """Execute *source_code* via ``python3 -u`` and return a Judge0-shaped result.

    The return dict mirrors the shape returned by ``judge0.submit`` so the
    caller can use it as a drop-in replacement.
    """
    # Write source to a temp file to avoid shell-escaping pitfalls
    fd, tmp_path = tempfile.mkstemp(suffix=".py", prefix="stem_live_")
    try:
        os.write(fd, source_code.encode("utf-8"))
        os.close(fd)

        try:
            proc = await asyncio.create_subprocess_exec(
                "python3", "-u", tmp_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                # Limit memory & prevent runaway forks via ulimit in a
                # wrapper is not portable; rely on the timeout instead.
            )
        except FileNotFoundError as exc:
            raise LocalRunnerError(
                "python3 is not available on this host."
            ) from exc

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(input=stdin.encode("utf-8")),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {
                "status": "timeout",
                "stdout": "",
                "stderr": "",
                "compile_output": "",
                "message": "Time Limit Exceeded",
            }

        stdout = stdout_bytes[:max_output_bytes].decode("utf-8", errors="replace")
        stderr = stderr_bytes[:max_output_bytes].decode("utf-8", errors="replace")

        if proc.returncode == 0:
            return {
                "status": "ok",
                "stdout": stdout,
                "stderr": stderr,
                "compile_output": "",
                "message": "Accepted",
            }
        else:
            # Distinguish syntax errors (compile errors) from runtime errors
            is_syntax = "SyntaxError" in stderr
            return {
                "status": "compile_error" if is_syntax else "runtime_error",
                "stdout": stdout,
                "stderr": stderr,
                "compile_output": stderr if is_syntax else "",
                "message": "Compilation Error" if is_syntax else "Runtime Error",
            }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
