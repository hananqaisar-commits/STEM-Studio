"""Local subprocess runners for environments without Judge0.

When JUDGE0_URL is not configured (local development or a Render deployment
without an external sandbox), this module executes Python programs in a
short-lived subprocess using the same Python interpreter that runs the API.

Security boundaries are intentionally thin — the subprocess shares the host
kernel and filesystem.  This is acceptable for a controlled educational
platform on Render where all callers are authenticated learners, but this
runner should **not** replace Judge0 on internet-facing production tiers that
need hard sandbox isolation.

Python remains a development-only subprocess fallback. C++ can also run in
DEBUG mode when bubblewrap and g++ are installed. The C++ process gets a small
read-only filesystem view, no Linux capabilities, a seccomp filter that denies
network syscalls, bounded temporary storage, resource limits, and a timeout.
Production requests must use Judge0.
"""

from __future__ import annotations

import asyncio
import ctypes
import errno
import tempfile
import os
import shlex
import signal
import shutil
from typing import Any, Dict, Optional

try:
    import resource
except ImportError:  # pragma: no cover - local C++ sandbox is Linux-only.
    resource = None  # type: ignore[assignment]


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


def _network_seccomp_fd() -> int:
    """Create a libseccomp BPF filter that denies opening or using sockets."""
    try:
        lib = ctypes.CDLL("libseccomp.so.2", use_errno=True)
    except OSError as exc:
        raise LocalRunnerError("The local C++ sandbox needs libseccomp.") from exc

    lib.seccomp_init.argtypes = [ctypes.c_uint32]
    lib.seccomp_init.restype = ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    lib.seccomp_syscall_resolve_name.restype = ctypes.c_int
    lib.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    lib.seccomp_rule_add.restype = ctypes.c_int
    lib.seccomp_export_bpf.argtypes = [ctypes.c_void_p, ctypes.c_int]
    lib.seccomp_export_bpf.restype = ctypes.c_int
    lib.seccomp_release.argtypes = [ctypes.c_void_p]

    # libseccomp actions: ALLOW by default, EPERM for socket operations.
    context = lib.seccomp_init(0x7FFF0000)
    if not context:
        raise LocalRunnerError("Could not initialize the local C++ syscall filter.")

    filter_fd = os.memfd_create("stem-cpp-seccomp", os.MFD_CLOEXEC)
    try:
        deny_network = 0x00050000 | errno.EPERM
        for name in (
            "socket", "socketpair", "connect", "accept", "accept4", "bind", "listen",
            "sendto", "recvfrom", "sendmsg", "recvmsg", "recvmmsg", "sendmmsg",
            "shutdown", "io_uring_setup",
        ):
            syscall = lib.seccomp_syscall_resolve_name(name.encode("ascii"))
            if syscall < 0:
                continue
            result = lib.seccomp_rule_add(context, deny_network, syscall, 0)
            if result < 0:
                raise LocalRunnerError("Could not configure the local C++ network filter.")

        result = lib.seccomp_export_bpf(context, filter_fd)
        if result < 0:
            raise LocalRunnerError("Could not export the local C++ syscall filter.")
        os.lseek(filter_fd, 0, os.SEEK_SET)
        return filter_fd
    except Exception:
        os.close(filter_fd)
        raise
    finally:
        lib.seccomp_release(context)


async def _read_bounded(stream: asyncio.StreamReader, limit: int) -> tuple[bytes, bool]:
    chunks: list[bytes] = []
    retained = 0
    truncated = False
    while chunk := await stream.read(65_536):
        remaining = limit - retained
        if remaining > 0:
            kept = chunk[:remaining]
            chunks.append(kept)
            retained += len(kept)
        if len(chunk) > max(remaining, 0):
            truncated = True
    return b"".join(chunks), truncated


async def run_cpp(
    source_code: str,
    *,
    stdin: str = "",
    timeout_seconds: int = 12,
    max_output_bytes: int = 512_000,
) -> Dict[str, Any]:
    """Compile and run a C++17 program inside a restricted bubblewrap sandbox."""
    if os.name != "posix" or resource is None:
        raise LocalRunnerError("Local C++ execution is supported only on Linux hosts.")
    bwrap = shutil.which("bwrap")
    compiler = shutil.which("g++")
    shell = shutil.which("bash")
    if not bwrap or not compiler:
        raise LocalRunnerError("Local C++ needs bubblewrap and g++ installed on the API host.")
    if not shell:
        raise LocalRunnerError("The local C++ sandbox needs bash installed on the API host.")
    cat = shutil.which("cat")
    if not cat:
        raise LocalRunnerError("The local C++ sandbox needs the standard cat utility.")

    nonce = os.urandom(12).hex()
    compile_marker = f"__STEM_CPP_COMPILE_ERROR_{nonce}__"
    exit_marker = f"__STEM_CPP_EXIT_{nonce}__="
    script = f"""
ulimit -t 15
ulimit -v 1048576
ulimit -f 2048
ulimit -u 24
ulimit -n 64
ulimit -c 0
{shlex.quote(compiler)} -std=c++17 -O0 -pipe /work/main.cpp -o /work/program 2>/work/compiler.stderr
compile_status=$?
if [ "$compile_status" -ne 0 ]; then
  {shlex.quote(cat)} /work/compiler.stderr >&2
  printf '\\n{compile_marker}\\n' >&2
  exit 0
fi
{shlex.quote(cat)} /work/compiler.stderr >&2
ulimit -t 5
ulimit -v 524288
ulimit -f 1024
ulimit -u 16
ulimit -n 64
ulimit -c 0
/work/program
program_status=$?
printf '\\n{exit_marker}%s\\n' "$program_status" >&2
exit "$program_status"
""".strip()

    source_fd = os.memfd_create("stem-cpp-source", os.MFD_CLOEXEC)
    filter_fd = -1
    try:
        os.write(source_fd, source_code.encode("utf-8"))
        os.lseek(source_fd, 0, os.SEEK_SET)
        filter_fd = _network_seccomp_fd()
        command = [
            bwrap,
            "--unshare-all", "--share-net", "--die-with-parent", "--new-session", "--cap-drop", "ALL",
            "--ro-bind", "/usr", "/usr",
            "--ro-bind", "/lib", "/lib",
            "--ro-bind-try", "/lib64", "/lib64",
            "--ro-bind", "/etc", "/etc",
            "--dev", "/dev", "--proc", "/proc",
            "--size", "16777216", "--tmpfs", "/tmp",
            "--size", "16777216", "--tmpfs", "/work",
            "--symlink", "usr/bin", "/bin",
            "--clearenv",
            "--setenv", "PATH", "/usr/bin:/bin",
            "--setenv", "HOME", "/tmp",
            "--setenv", "TMPDIR", "/tmp",
            "--setenv", "LANG", "C.UTF-8",
            "--setenv", "LC_ALL", "C.UTF-8",
            "--seccomp", str(filter_fd),
            "--file", str(source_fd), "/work/main.cpp",
            "--", shell, "-c", script,
        ]
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                pass_fds=(source_fd, filter_fd),
                start_new_session=True,
            )
        except OSError as exc:
            raise LocalRunnerError("Could not start the restricted local C++ sandbox.") from exc

        stdout_task = asyncio.create_task(_read_bounded(process.stdout, max_output_bytes))
        stderr_task = asyncio.create_task(_read_bounded(process.stderr, max_output_bytes))
        try:
            if process.stdin is not None:
                try:
                    process.stdin.write(stdin.encode("utf-8"))
                    await process.stdin.drain()
                except (BrokenPipeError, ConnectionResetError):
                    # Programs are allowed to exit without consuming all input.
                    pass
                finally:
                    process.stdin.close()
            await asyncio.wait_for(process.wait(), timeout=max(1, timeout_seconds))
            (stdout_bytes, stdout_truncated), (stderr_bytes, stderr_truncated) = await asyncio.gather(stdout_task, stderr_task)
        except asyncio.TimeoutError:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            await process.wait()
            for task in (stdout_task, stderr_task):
                if not task.done():
                    task.cancel()
            await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)
            return {
                "status": "timeout", "stdout": "", "stderr": "", "compile_output": "",
                "message": "Time Limit Exceeded",
            }
        finally:
            if process.returncode is None:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass

        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        if stdout_truncated:
            stdout += "\n[output truncated]"
        if stderr_truncated:
            stderr += "\n[stderr truncated]"

        if compile_marker in stderr:
            compile_output = stderr.split(compile_marker, 1)[0].strip()
            return {
                "status": "compile_error", "stdout": "", "stderr": "",
                "compile_output": compile_output or "C++ compilation failed.",
                "message": "Compilation Error",
            }

        exit_line = next((line for line in reversed(stderr.splitlines()) if line.startswith(exit_marker)), None)
        if exit_line is None:
            raise LocalRunnerError("The local C++ sandbox stopped before reporting a program result.")
        stderr = "\n".join(line for line in stderr.splitlines() if not line.startswith(exit_marker))
        status = "ok" if process.returncode == 0 else "runtime_error"
        return {
            "status": status,
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": "",
            "message": "Accepted" if status == "ok" else "Runtime Error",
        }
    finally:
        os.close(source_fd)
        if filter_fd >= 0:
            os.close(filter_fd)
