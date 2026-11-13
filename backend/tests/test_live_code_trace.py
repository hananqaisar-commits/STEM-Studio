import subprocess
import sys

from backend.app.services.custom_code.live_trace import (
    build_python_trace_program,
    parse_python_trace_output,
)


def run_traced_python(source: str, nonce: str = "testtrace"):
    wrapper = build_python_trace_program(source, nonce)
    result = subprocess.run(
        [sys.executable, "-I", "-S", "-c", wrapper],
        capture_output=True,
        text=True,
        timeout=8,
        check=False,
    )
    return result, parse_python_trace_output(result.stdout, nonce)


def test_full_python_program_emits_source_mapped_scope_and_heap_snapshots():
    source = "\n".join([
        "class Node:",
        "    def __init__(self, data):",
        "        self.data = data",
        "        self.next = None",
        "        self.prev = None",
        "left = Node(1)",
        "right = Node(2)",
        "left.next = right",
        "right.prev = left",
        "print(left.data)",
    ])

    process, (events, output, truncated, trace_error) = run_traced_python(source)

    assert process.returncode == 0
    assert output == "1"
    assert not truncated
    assert trace_error is None
    assert events
    assert all(1 <= event["line"] <= len(source.splitlines()) for event in events)
    linked_snapshot = next(
        event for event in reversed(events)
        if sum(obj["type"] == "Node" for obj in event["heap"].values()) == 2
    )
    nodes = [obj for obj in linked_snapshot["heap"].values() if obj["type"] == "Node"]
    node_by_id = {node["object_id"]: node for node in nodes}
    left = next(node for node in nodes if next(entry["value"].get("value") for entry in node["entries"] if entry["key"] == "data") == 1)
    right_id = next(entry["value"]["object_id"] for entry in left["entries"] if entry["key"] == "next")
    right = node_by_id[right_id]
    assert next(entry["value"]["object_id"] for entry in right["entries"] if entry["key"] == "prev") == left["object_id"]


def test_python_syntax_error_is_reported_without_inventing_trace_events():
    process, (events, output, _truncated, trace_error) = run_traced_python("if True:\n", nonce="syntaxcheck")

    assert process.returncode != 0
    assert events == []
    assert output == ""
    assert trace_error is not None
    assert trace_error["kind"] == "syntax_error"
    assert trace_error["line"] == 1
    assert "indented block" in trace_error["message"]


def test_python_runtime_error_keeps_the_user_source_line_and_partial_trace():
    source = "value = 4\nresult = value / 0\nprint(result)\n"
    process, (events, output, _truncated, trace_error) = run_traced_python(source, nonce="runtimecheck")

    assert process.returncode != 0
    assert output == ""
    assert events
    assert trace_error is not None
    assert trace_error["kind"] == "runtime_error"
    assert trace_error["line"] == 2
    assert trace_error["exception_type"] == "ZeroDivisionError"


def test_trace_event_limit_is_reported():
    source = "counter = 0\nfor index in range(400):\n    counter += 1\nprint(counter)\n"
    process, (events, output, truncated, _trace_error) = run_traced_python(source, nonce="limitcheck")

    assert process.returncode == 0
    assert output == "400"
    assert len(events) == 220
    assert truncated
