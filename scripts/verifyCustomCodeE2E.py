"""One-off live verification of the Custom Code pipeline against a running
backend + Judge0. Run: venv python scripts/verifyCustomCodeE2E.py
"""
import json
import httpx

BASE = "http://localhost:8000/api/execute/custom-code"


def run(name, payload, check):
    r = httpx.post(BASE, json=payload, timeout=90)
    if r.status_code != 200:
        print(f"FAIL {name}: HTTP {r.status_code} {r.text[:200]}")
        return False
    data = r.json()
    try:
        ok, detail = check(data)
    except Exception as exc:
        ok, detail = False, f"check crashed: {exc}; status={data.get('status')} err={(data.get('error') or '')[:120]}"
    print(f"{'PASS' if ok else 'FAIL'} {name}: status={data['status']} traces={len(data['trace_steps'])} {detail}")
    if not ok:
        print("   raw:", json.dumps(data)[:400])
    return ok


STACK_CODE = """
class Stack:
    def __init__(self):
        self.items = []
    def push(self, value):
        self.items.append(value)
        visualize_step("push", value)
    def pop(self):
        if not self.items:
            return None
        v = self.items.pop()
        visualize_step("pop", v)
        return v
    def peek(self):
        return self.items[-1] if self.items else None
    def isEmpty(self):
        return len(self.items) == 0
"""

BUBBLE_PY = """
def bubbleSort(arr):
    a = list(arr)
    for i in range(len(a) - 1):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                visualize_step("swap", [j, j + 1])
                a[j], a[j + 1] = a[j + 1], a[j]
    return a
"""

BUBBLE_CPP = """
vector<int> bubbleSort(vector<int> arr) {
    for (size_t i = 0; i < arr.size(); i++)
        for (size_t j = 0; j + 1 < arr.size() - i; j++)
            if (arr[j] > arr[j + 1]) { swap(arr[j], arr[j + 1]); visualizeStep("swap", (int)j); }
    return arr;
}
"""

PAL_JAVA = """
public static boolean isPalindrome(String s) {
    String t = s.toLowerCase();
    int i = 0, j = t.length() - 1;
    while (i < j) {
        if (t.charAt(i) != t.charAt(j)) return false;
        i++; j--;
    }
    return true;
}
"""

FACT_GO = """
func factorial(n int) int {
\tif n <= 1 {
\t\treturn 1
\t}
\tvisualizeStep("recurse", n)
\treturn n * factorial(n-1)
}
"""

ORANGES_PY = """
def rottingOranges(grid):
    g = [row[:] for row in grid]
    rows, cols = len(g), len(g[0])
    q = [(r, c) for r in range(rows) for c in range(cols) if g[r][c] == 2]
    minutes = 0
    while q:
        nxt = []
        for r, c in q:
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and g[nr][nc] == 1:
                    g[nr][nc] = 2
                    nxt.append((nr, nc))
        if nxt:
            minutes += 1
        q = nxt
    if any(1 in row for row in g):
        return -1
    return minutes
"""

REV_C = """
struct ListNode* reverseList(struct ListNode* head) {
    struct ListNode* prev = NULL;
    struct ListNode* cur = head;
    while (cur) {
        visualizeStep("rewire", cur->val);
        struct ListNode* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}
"""

BFS_PY = """
def bfs(n, edges, start):
    adj = {i: [] for i in range(n)}
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    order = [start]
    seen = {start}
    queue = [start]
    while queue:
        node = queue.pop(0)
        for nb in sorted(adj[node]):
            if nb not in seen:
                seen.add(nb)
                queue.append(nb)
                order.append(nb)
                visualize_step("visit", nb)
    return order
"""

QUEUE_CS = """
class Queue {
    private List<int> items = new List<int>();
    public Queue() {}
    public void enqueue(int value) { items.Add(value); visualizeStep("enqueue", value); }
    public int dequeue() { int v = items[0]; items.RemoveAt(0); visualizeStep("dequeue", v); return v; }
    public int front() { return items[0]; }
    public bool isEmpty() { return items.Count == 0; }
}
"""


def main():
    results = []

    results.append(run("stateful_class stack (python)", {
        "algorithm_key": "stackQueue.stack", "language": "python", "code": STACK_CODE,
        "state": {"ctorArgs": [], "operations": [
            {"method": "push", "args": [10]}, {"method": "push", "args": [20]},
            {"method": "push", "args": [42]}, {"method": "pop", "args": []}]},
    }, lambda d: (d["status"] == "ok" and d["result"]["returned"] == 42 and d["result"]["lastMethod"] == "pop",
                  f"returned={d['result'].get('returned')}")))

    results.append(run("array_in bubbleSort (python)", {
        "algorithm_key": "sorting.bubble", "language": "python", "code": BUBBLE_PY,
        "state": {"args": {"arr": [5, 2, 9, 1]}},
    }, lambda d: (d["status"] == "ok" and d["result"]["result"] == [1, 2, 5, 9],
                  f"result={d['result'].get('result')}")))

    results.append(run("array_in bubbleSort (cpp)", {
        "algorithm_key": "sorting.bubble", "language": "cpp", "code": BUBBLE_CPP,
        "state": {"args": {"arr": [5, 2, 9, 1]}},
    }, lambda d: (d["status"] == "ok" and d["result"]["result"] == [1, 2, 5, 9],
                  f"result={d['result'].get('result')}")))

    results.append(run("string_in isPalindrome (java)", {
        "algorithm_key": "strings.palindrome", "language": "java", "code": PAL_JAVA,
        "state": {"args": {"s": "RaceCar"}},
    }, lambda d: (d["status"] == "ok" and d["result"]["result"] is True,
                  f"result={d['result'].get('result')}")))

    results.append(run("number_in factorial (go)", {
        "algorithm_key": "recursion.factorial", "language": "go", "code": FACT_GO,
        "state": {"args": {"n": 5}},
    }, lambda d: (d["status"] == "ok" and d["result"]["result"] == 120,
                  f"result={d['result'].get('result')}")))

    results.append(run("grid_in rottingOranges (python)", {
        "algorithm_key": "stackQueue.rottingOranges", "language": "python", "code": ORANGES_PY,
        "state": {"args": {"grid": [[2, 1, 1], [1, 1, 0], [0, 1, 1]]}},
    }, lambda d: (d["status"] == "ok" and d["result"]["result"] == 4,
                  f"result={d['result'].get('result')}")))

    results.append(run("linked_list_in reverseList (c)", {
        "algorithm_key": "linkedList.reverse", "language": "c", "code": REV_C,
        "state": {"args": {"head": {"values": [1, 2, 3], "cycleIndex": -1}}},
    }, lambda d: (d["status"] == "ok" and d["result"]["result"] == [3, 2, 1],
                  f"result={d['result'].get('result')}")))

    results.append(run("graph_in bfs (python)", {
        "algorithm_key": "graph.bfs", "language": "python", "code": BFS_PY,
        "state": {"args": {"n": 4, "edges": [[0, 1], [1, 2], [2, 3]], "start": 0}},
    }, lambda d: (d["status"] == "ok" and d["result"]["result"] == [0, 1, 2, 3],
                  f"result={d['result'].get('result')}")))

    results.append(run("stateful_class queue (csharp)", {
        "algorithm_key": "stackQueue.queue", "language": "csharp", "code": QUEUE_CS,
        "state": {"ctorArgs": [], "operations": [
            {"method": "enqueue", "args": [7]}, {"method": "enqueue", "args": [9]},
            {"method": "dequeue", "args": []}]},
    }, lambda d: (d["status"] == "ok" and d["result"]["returned"] == 7,
                  f"returned={d['result'].get('returned')}")))

    results.append(run("syntax error surfacing", {
        "algorithm_key": "sorting.bubble", "language": "python", "code": "def bubbleSort(arr):\n    return arr +",
        "state": {"args": {"arr": [1]}},
    }, lambda d: (d["status"] in ("compile_error", "runtime_error") and bool(d.get("error") or d.get("stderr")),
                  f"error={(d.get('error') or d.get('stderr') or '')[:60]!r}")))

    print(f"\n{sum(results)}/{len(results)} E2E checks passed")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
