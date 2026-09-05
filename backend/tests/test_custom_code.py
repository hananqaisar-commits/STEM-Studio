"""
Tests for the Custom Code execution pipeline:
  - stub registry integrity (all algorithms x all languages)
  - harness generation across every harness category and language
  - real execution of generated Python harnesses (subprocess)
  - stdout parsing contract
  - endpoint behavior (503 when unconfigured, 404 unknown algorithm,
    502 when the execution service is unreachable)
"""

import json
import shutil
import subprocess
import sys

import pytest

from backend.app.services.custom_code import harness, registry
from backend.app.api.routes.execute import parse_execution_output

LANGS = ["python", "cpp", "c", "java", "go", "csharp"]

# One representative algorithm per harness category.
CATEGORY_REPRESENTATIVES = {
    "array_in": "sorting.bubble",
    "string_in": "strings.palindrome",
    "number_in": "recursion.factorial",
    "grid_in": "stackQueue.rottingOranges",
    "linked_list_in": "linkedList.reverse",
    "graph_in": "graph.bfs",
    "stateful_class": "stackQueue.stack",
}

FUNCTION_STATE = {
    "sorting.bubble": {"args": {"arr": [5, 2, 9, 1]}},
    "strings.palindrome": {"args": {"s": "racecar"}},
    "recursion.factorial": {"args": {"n": 5}},
    "stackQueue.rottingOranges": {"args": {"grid": [[2, 1, 1], [1, 1, 0], [0, 1, 1]]}},
    "linkedList.reverse": {"args": {"head": {"values": [1, 2, 3], "cycleIndex": -1}}},
    "graph.bfs": {"args": {"n": 4, "edges": [[0, 1], [1, 2], [2, 3]], "start": 0}},
}

STATEFUL_STATE = {
    "stackQueue.stack": {
        "ctorArgs": [],
        "operations": [
            {"method": "push", "args": [10]},
            {"method": "push", "args": [20]},
            {"method": "pop", "args": []},
        ],
    }
}


# ── Registry ────────────────────────────────────────────────────────────────
def test_registry_covers_all_algorithms_with_six_language_stubs():
    reg = registry.load_registry()
    assert len(reg) == 92
    for key, algo in reg.items():
        for lang in LANGS:
            stub = algo["stubs"].get(lang)
            assert stub and len(stub.strip()) > 0, f"{key} missing stub for {lang}"


def test_registry_harness_categories_match_phase1_grouping():
    reg = registry.load_registry()
    counts = {}
    for algo in reg.values():
        counts[algo["harness"]] = counts.get(algo["harness"], 0) + 1
    assert counts == {
        "array_in": 41,
        "stateful_class": 21,
        "string_in": 14,
        "number_in": 7,
        "graph_in": 5,
        "linked_list_in": 3,
        "grid_in": 1,
    }


# ── Harness generation ──────────────────────────────────────────────────────
def test_harness_generation_all_categories_all_languages():
    for category, key in CATEGORY_REPRESENTATIVES.items():
        algo = registry.get_algorithm(key)
        state = STATEFUL_STATE[key] if category == "stateful_class" else FUNCTION_STATE[key]
        for lang in LANGS:
            source = harness.build_harness(lang, algo, "/* user code */" if lang != "python" else "# user code", state)
            assert source and len(source) > 100, f"empty harness for {key}/{lang}"
            assert algo["entry"] in source or category == "stateful_class", (
                f"entry point missing in {key}/{lang}"
            )
            assert "__VRESULT__" in source, f"result contract missing in {key}/{lang}"
            assert "__VSTEP__" in source, f"trace contract missing in {key}/{lang}"


def test_harness_rejects_unsupported_language():
    algo = registry.get_algorithm("sorting.bubble")
    with pytest.raises(ValueError):
        harness.build_harness("javascript", algo, "x", {"args": {"arr": [1]}})


@pytest.mark.parametrize("language, code", [
    ("python", "def somethingElse(arr):\n    return arr"),
    ("cpp", "vector<int> somethingElse(vector<int> arr) { return arr; }"),
    ("c", "void somethingElse(int* arr, int arrSize) {}"),
    ("java", "public static int[] somethingElse(int[] arr) { return arr; }"),
    ("go", "func somethingElse(arr []int) []int { return arr }"),
    ("csharp", "public static int[] somethingElse(int[] arr) { return arr; }"),
])
def test_submission_requires_the_algorithm_entry_point(language, code):
    algo = registry.get_algorithm("sorting.bubble")
    message = registry.validate_submission(algo, language, code, {"args": {"arr": [3, 1]}})
    assert message == "Required method not found: bubbleSort(arr)"


@pytest.mark.parametrize("language, code", [
    ("python", "def bubbleSort(arr):\n    return arr\nif __name__ == '__main__':\n    bubbleSort([])"),
    ("cpp", "int main() { return 0; }\nvector<int> bubbleSort(vector<int> arr) { return arr; }"),
    ("c", "int main(void) { return 0; }\nvoid bubbleSort(int* arr, int arrSize) {}"),
    ("java", "public static void main(String[] args) {}\npublic static int[] bubbleSort(int[] arr) { return arr; }"),
    ("go", "func main() {}\nfunc bubbleSort(arr []int) []int { return arr }"),
    ("csharp", "static void Main() {}\npublic static int[] bubbleSort(int[] arr) { return arr; }"),
])
def test_submission_rejects_full_program_wrappers(language, code):
    algo = registry.get_algorithm("sorting.bubble")
    message = registry.validate_submission(algo, language, code, {"args": {"arr": [3, 1]}})
    assert message and "Paste only the required method or class" in message


def test_stateful_harness_replays_full_operation_history():
    algo = registry.get_algorithm("stackQueue.stack")
    state = STATEFUL_STATE["stackQueue.stack"]
    for lang in LANGS:
        source = harness.build_harness(lang, algo, "// user code", state)
        # Every historical operation must appear in the replay.
        assert "push" in source and "pop" in source
        assert "10" in source and "20" in source, f"history values missing for {lang}"


# ── Real execution of generated Python harnesses ───────────────────────────
def _run_python_source(source: str) -> str:
    proc = subprocess.run(
        [sys.executable, "-c", source],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert proc.returncode == 0, f"generated python failed:\n{proc.stderr}\n--- source ---\n{source}"
    return proc.stdout


def _result_of(stdout: str) -> dict:
    for line in stdout.splitlines():
        if line.startswith("__VRESULT__ "):
            return json.loads(line[len("__VRESULT__ "):])
    raise AssertionError(f"no result line in output:\n{stdout}")


def test_python_bubble_sort_end_to_end():
    algo = registry.get_algorithm("sorting.bubble")
    user_code = (
        "def bubbleSort(arr):\n"
        "    a = list(arr)\n"
        "    for i in range(len(a) - 1):\n"
        "        for j in range(len(a) - 1 - i):\n"
        "            if a[j] > a[j + 1]:\n"
        "                visualize_step('compare', [j, j + 1])\n"
        "                a[j], a[j + 1] = a[j + 1], a[j]\n"
        "                visualize_step('swap', [j, j + 1])\n"
        "    return a\n"
    )
    state = {"args": {"arr": [5, 2, 9, 1]}}
    stdout = _run_python_source(harness.build_harness("python", algo, user_code, state))
    steps, _, _, result = parse_execution_output(stdout)
    assert result == {"result": [1, 2, 5, 9]}
    assert any(s.get("op") == "compare" for s in steps), "user trace steps missing"


def test_python_stack_replay_end_to_end():
    algo = registry.get_algorithm("stackQueue.stack")
    user_code = (
        "class Stack:\n"
        "    def __init__(self):\n"
        "        self.items = []\n"
        "    def push(self, value):\n"
        "        self.items.append(value)\n"
        "        visualize_step('push', value)\n"
        "    def pop(self):\n"
        "        if not self.items:\n"
        "            return None\n"
        "        v = self.items.pop()\n"
        "        visualize_step('pop', v)\n"
        "        return v\n"
        "    def peek(self):\n"
        "        return self.items[-1] if self.items else None\n"
        "    def isEmpty(self):\n"
        "        return len(self.items) == 0\n"
    )
    state = STATEFUL_STATE["stackQueue.stack"]
    stdout = _run_python_source(harness.build_harness("python", algo, user_code, state))
    result = _result_of(stdout)
    assert result["lastMethod"] == "pop"
    assert result["returned"] == 20  # pushed 10, 20 then popped -> 20


def test_python_linked_list_reverse_end_to_end():
    algo = registry.get_algorithm("linkedList.reverse")
    user_code = (
        "def reverseList(head):\n"
        "    prev = None\n"
        "    cur = head\n"
        "    while cur:\n"
        "        nxt = cur.next\n"
        "        cur.next = prev\n"
        "        prev = cur\n"
        "        cur = nxt\n"
        "    return prev\n"
    )
    state = {"args": {"head": {"values": [1, 2, 3], "cycleIndex": -1}}}
    stdout = _run_python_source(harness.build_harness("python", algo, user_code, state))
    assert _result_of(stdout) == {"result": [3, 2, 1]}


def test_python_graph_bfs_end_to_end():
    algo = registry.get_algorithm("graph.bfs")
    user_code = (
        "def bfs(n, edges, start):\n"
        "    adj = {i: [] for i in range(n)}\n"
        "    for u, v in edges:\n"
        "        adj[u].append(v)\n"
        "        adj[v].append(u)\n"
        "    order, seen, queue = [], {start}, [start]\n"
        "    while queue:\n"
        "        node = queue.pop(0)\n"
        "        order.append(node)\n"
        "        for nb in adj[node]:\n"
        "            if nb not in seen:\n"
        "                seen.add(nb)\n"
        "                queue.append(nb)\n"
        "    return order\n"
    )
    state = FUNCTION_STATE["graph.bfs"]
    stdout = _run_python_source(harness.build_harness("python", algo, user_code, state))
    assert _result_of(stdout) == {"result": [0, 1, 2, 3]}


# ── C compilation check (when gcc is available) ─────────────────────────────
@pytest.mark.skipif(shutil.which("gcc") is None, reason="gcc not installed")
def test_c_bubble_sort_compiles_and_runs(tmp_path):
    algo = registry.get_algorithm("sorting.bubble")
    user_code = (
        "void bubbleSort(int arr[], int arrSize) {\n"
        "    for (int i = 0; i < arrSize - 1; i++)\n"
        "        for (int j = 0; j < arrSize - 1 - i; j++)\n"
        "            if (arr[j] > arr[j + 1]) {\n"
        "                int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;\n"
        "                visualizeStep(\"swap\", j);\n"
        "            }\n"
        "    emitIntList(arr, arrSize);\n"
        "}\n"
    )
    state = {"args": {"arr": [5, 2, 9, 1]}}
    source = harness.build_harness("c", algo, user_code, state)
    src = tmp_path / "prog.c"
    exe = tmp_path / "prog.exe"
    src.write_text(source, encoding="utf-8")
    comp = subprocess.run(["gcc", str(src), "-o", str(exe)], capture_output=True, text=True)
    assert comp.returncode == 0, f"C compile failed:\n{comp.stderr}\n--- source ---\n{source}"
    run = subprocess.run([str(exe)], capture_output=True, text=True, timeout=30)
    assert run.returncode == 0
    steps, rows, _, result = parse_execution_output(run.stdout)
    assert rows == [[1, 2, 5, 9]]
    assert result == {"result": [[1, 2, 5, 9]]}
    assert any(s.get("op") == "swap" for s in steps)


# ── Output parsing ──────────────────────────────────────────────────────────
def test_parse_execution_output_separates_contract_lines():
    stdout = (
        "some user print noise\n"
        '__VSTEP__ {"op": "compare", "value": [0, 1]}\n'
        "__VEMIT_ROW__ [1,2,3]\n"
        "__VEMIT_PAIR__ [7,2]\n"
        '__VRESULT__ {"result": 42}\n'
    )
    steps, rows, pairs, result = parse_execution_output(stdout)
    assert steps == [{"op": "compare", "value": [0, 1]}]
    assert rows == [[1, 2, 3]]
    assert pairs == [[7, 2]]
    assert result == {"result": 42}


def test_parse_execution_output_folds_emitted_into_result():
    stdout = '__VEMIT_ROW__ [1,2]\n__VEMIT_ROW__ [3]\n__VRESULT__ {"emitted": true}\n'
    _, _, _, result = parse_execution_output(stdout)
    assert result == {"result": [[1, 2], [3]]}


# ── Endpoint behavior ───────────────────────────────────────────────────────
def test_endpoint_returns_503_when_judge0_not_configured(client):
    resp = client.post(
        "/api/execute/custom-code",
        json={"algorithm_key": "sorting.bubble", "language": "python", "code": "def bubbleSort(arr):\n    return arr", "state": {}},
    )
    assert resp.status_code == 503


def test_endpoint_returns_404_for_unknown_algorithm(client, monkeypatch):
    import backend.app.api.routes.execute as execute_route

    class _StubSettings:
        JUDGE0_URL = "http://judge0.invalid"
        JUDGE0_API_KEY = ""
        JUDGE0_TIMEOUT_SECONDS = 5

    monkeypatch.setattr(execute_route, "get_settings", lambda: _StubSettings())
    resp = client.post(
        "/api/execute/custom-code",
        json={"algorithm_key": "nope.nope", "language": "python", "code": "x = 1", "state": {}},
    )
    assert resp.status_code == 404


def test_endpoint_returns_502_when_judge0_unreachable(client, monkeypatch):
    import backend.app.api.routes.execute as execute_route

    class _StubSettings:
        JUDGE0_URL = "http://judge0.invalid"
        JUDGE0_API_KEY = ""
        JUDGE0_TIMEOUT_SECONDS = 5

    monkeypatch.setattr(execute_route, "get_settings", lambda: _StubSettings())
    resp = client.post(
        "/api/execute/custom-code",
        json={
            "algorithm_key": "sorting.bubble",
            "language": "python",
            "code": "def bubbleSort(arr):\n    return arr",
            "state": {"args": {"arr": [3, 1]}},
        },
    )
    assert resp.status_code == 502
