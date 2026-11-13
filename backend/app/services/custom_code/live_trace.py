"""Helpers for running full Python programs with bounded runtime snapshots.

The learner's program is compiled with its own filename so trace line numbers
match the editor. Tracing is observational: failures in snapshot serialization
are swallowed and never replace the learner program's result.
"""

from __future__ import annotations

import base64
import json


def build_python_trace_program(source: str, nonce: str) -> str:
    """Wrap a complete Python program with a bounded ``sys.settrace`` probe."""
    encoded_source = base64.b64encode(source.encode("utf-8")).decode("ascii")
    wrapper = r'''import base64 as __v_b64
import json as __v_json
import traceback as __v_traceback
import math as __v_math
import sys as __v_sys
import types as __v_types

__v_source = __v_b64.b64decode("__V_SOURCE_B64__").decode("utf-8")
__v_source_line_count = max(1, len(__v_source.splitlines()))
__v_nonce = "__V_NONCE__"
__v_stream = __v_sys.stdout
__v_prefix = "__VTRACE__" + __v_nonce + " "
__v_end_prefix = "__VTRACE_END__" + __v_nonce + " "
__v_error_prefix = "__VTRACE_ERROR__" + __v_nonce + " "
__v_event_limit = 220
__v_object_limit = 70
__v_depth_limit = 5
__v_output_limit = 280000
__v_event_count = 0
__v_output_bytes = 0
__v_truncated = False

def __v_scalar(value):
    if value is None:
        return {"kind": "scalar", "type": "NoneType", "value": None}
    value_type = type(value)
    if value_type is bool:
        return {"kind": "scalar", "type": "bool", "value": value}
    if value_type is int:
        return {"kind": "scalar", "type": "int", "value": value}
    if value_type is float:
        if not __v_math.isfinite(value):
            return {"kind": "scalar", "type": "float", "value": str(value)}
        return {"kind": "scalar", "type": "float", "value": value}
    if value_type is str:
        return {"kind": "scalar", "type": "str", "value": value[:240], "truncated": len(value) > 240}
    if value_type is bytes:
        return {"kind": "scalar", "type": "bytes", "value": value[:120].decode("utf-8", "replace"), "truncated": len(value) > 120}
    return None

def __v_type_name(value_type):
    try:
        return type.__getattribute__(value_type, "__name__")[:80]
    except BaseException:
        return "object"

def __v_key_name(value):
    value_type = type(value)
    if value_type in (str, int, bool, float):
        try:
            return str(value)[:100]
        except BaseException:
            pass
    return "<" + __v_type_name(value_type) + ">"

def __v_encode(value, heap, depth=0):
    scalar = __v_scalar(value)
    if scalar is not None:
        return scalar

    value_type = type(value)
    type_name = __v_type_name(value_type)
    if value_type in (__v_types.ModuleType, __v_types.FunctionType, type, __v_types.BuiltinFunctionType):
        return {"kind": "opaque", "type": type_name, "preview": "<not expanded>"}
    if depth >= __v_depth_limit:
        return {"kind": "opaque", "type": type_name, "preview": "<maximum depth>"}

    object_id = "py-" + format(id(value), "x")
    if object_id in heap:
        return {"kind": "ref", "type": type_name, "object_id": object_id}
    if len(heap) >= __v_object_limit:
        return {"kind": "opaque", "type": type_name, "preview": "<object limit>"}

    record = {"object_id": object_id, "type": type_name, "entries": []}
    heap[object_id] = record
    try:
        if value_type is dict:
            values = list(dict.items(value))[:40]
            record["entries"] = [
                {"key": __v_key_name(key), "value": __v_encode(item, heap, depth + 1)}
                for key, item in values
            ]
            record["truncated"] = len(value) > 40
        elif value_type in (list, tuple, set, frozenset):
            values = list(value)[:40]
            record["entries"] = [
                {"key": str(index), "value": __v_encode(item, heap, depth + 1)}
                for index, item in enumerate(values)
            ]
            record["truncated"] = len(value) > 40
        else:
            try:
                attributes = object.__getattribute__(value, "__dict__")
            except (TypeError, AttributeError):
                attributes = {}
            if type(attributes) is not dict:
                attributes = {}
            record["entries"] = [
                {"key": key[:100] if type(key) is str else __v_key_name(key), "value": __v_encode(item, heap, depth + 1)}
                for key, item in list(dict.items(attributes))[:40]
                if not (type(key) is str and key.startswith("__"))
            ]
            record["truncated"] = len(attributes) > 40
    except BaseException:
        record["entries"] = []
        record["opaque"] = True
    return {"kind": "ref", "type": type_name, "object_id": object_id}

def __v_snapshot(frame, event, arg):
    heap = {}
    frames = []
    cursor = frame
    while cursor is not None and len(frames) < 24:
        if cursor.f_code.co_filename == "<live-source>":
            local_scope = {}
            try:
                items = list(cursor.f_locals.items())
            except BaseException:
                items = []
            for name, value in items[:80]:
                if name.startswith("__v") or name == "__builtins__":
                    continue
                local_scope[str(name)[:100]] = __v_encode(value, heap)
            frames.append({
                "function": cursor.f_code.co_qualname[:120],
                "line": int(cursor.f_lineno),
                "scope": local_scope,
            })
        cursor = cursor.f_back
    frames.reverse()
    payload = {
        "seq": __v_event_count,
        "kind": event,
        "phase": "before" if event == "line" else "after" if event == "return" else "at",
        "line": int(frame.f_lineno),
        "function": frame.f_code.co_qualname[:120],
        "frames": frames,
        "heap": heap,
    }
    if event == "return":
        payload["return_value"] = __v_encode(arg, heap)
    elif event == "exception" and isinstance(arg, tuple) and arg:
        payload["exception_type"] = getattr(arg[0], "__name__", "Exception")[:120]
    return payload

def __v_trace(frame, event, arg):
    global __v_event_count, __v_output_bytes, __v_truncated
    if frame.f_code.co_filename != "<live-source>":
        return __v_trace
    if event not in ("line", "call", "return", "exception"):
        return __v_trace
    if frame.f_lineno < 1 or frame.f_lineno > __v_source_line_count:
        return __v_trace
    if __v_event_count >= __v_event_limit:
        __v_truncated = True
        return __v_trace
    try:
        payload = __v_snapshot(frame, event, arg)
        payload["seq"] = __v_event_count
        line = __v_prefix + __v_json.dumps(payload, ensure_ascii=True, separators=(",", ":")) + "\n"
        size = len(line.encode("utf-8"))
        if __v_output_bytes + size > __v_output_limit:
            __v_truncated = True
            return __v_trace
        __v_stream.write(line)
        __v_stream.flush()
        __v_event_count += 1
        __v_output_bytes += size
    except BaseException:
        # Snapshotting must never change whether the student's code runs.
        pass
    return __v_trace

try:
    __v_code = compile(__v_source, "<live-source>", "exec")
except SyntaxError as __v_exc:
    __v_stream.write(__v_error_prefix + __v_json.dumps({"kind": "syntax_error", "line": __v_exc.lineno, "message": __v_exc.msg}) + "\n")
    raise

__v_globals = {"__name__": "__main__", "__file__": "<live-source>"}
__v_sys.settrace(__v_trace)
try:
    exec(__v_code, __v_globals, __v_globals)
except BaseException as __v_exc:
    try:
        __v_cursor = __v_exc.__traceback__
        __v_user_line = None
        while __v_cursor is not None:
            if __v_cursor.tb_frame.f_code.co_filename == "<live-source>":
                __v_user_line = int(__v_cursor.tb_lineno)
            __v_cursor = __v_cursor.tb_next
        __v_exc_type = type.__getattribute__(type(__v_exc), "__name__")
        __v_safe_types = (AssertionError, AttributeError, IndexError, KeyError, NameError, NotImplementedError, RuntimeError, StopIteration, TypeError, ValueError, ZeroDivisionError)
        __v_exc_message = str(__v_exc)[:240] if type(__v_exc) in __v_safe_types else ""
        __v_stream.write(__v_error_prefix + __v_json.dumps({"kind": "runtime_error", "line": __v_user_line, "exception_type": __v_exc_type, "message": __v_exc_message}) + "\n")
    except BaseException:
        pass
    raise
finally:
    __v_sys.settrace(None)
    __v_stream.write(__v_end_prefix + __v_json.dumps({"trace_truncated": __v_truncated, "event_count": __v_event_count}) + "\n")
'''
    return wrapper.replace("__V_SOURCE_B64__", encoded_source).replace("__V_NONCE__", nonce)


def parse_python_trace_output(stdout: str, nonce: str) -> tuple[list[dict], str, bool, dict | None]:
    """Extract only trace records generated by this run; preserve learner stdout."""
    trace_prefix = f"__VTRACE__{nonce} "
    end_prefix = f"__VTRACE_END__{nonce} "
    error_prefix = f"__VTRACE_ERROR__{nonce} "
    events: list[dict] = []
    program_output: list[str] = []
    truncated = False
    trace_error: dict | None = None
    saw_end = False
    for line in stdout.splitlines():
        if line.startswith(trace_prefix):
            try:
                value = json.loads(line[len(trace_prefix):])
                if isinstance(value, dict) and len(events) < 220:
                    events.append(value)
            except json.JSONDecodeError:
                continue
        elif line.startswith(end_prefix):
            saw_end = True
            try:
                value = json.loads(line[len(end_prefix):])
                truncated = bool(value.get("trace_truncated")) if isinstance(value, dict) else False
            except json.JSONDecodeError:
                pass
        elif line.startswith(error_prefix):
            try:
                value = json.loads(line[len(error_prefix):])
                trace_error = value if isinstance(value, dict) else None
            except json.JSONDecodeError:
                pass
        else:
            program_output.append(line)
    truncated = truncated or len(events) >= 220 or (bool(events) and not saw_end)
    return events, "\n".join(program_output), truncated, trace_error
