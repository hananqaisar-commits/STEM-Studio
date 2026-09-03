"""
Harness generators for Custom Code execution.

A harness wraps the user's pasted function/class in auto-generated driver
code that:
  1. injects the trace SDK (visualize_step / visualizeStep),
  2. constructs the input from the current UI state,
  3. calls the user's entry point (or replays the operation history for
     stateful data structures — Judge0 runs are stateless),
  4. prints the result in a parseable format.

Output contract (parsed by the execution route):
  __VSTEP__ {...}     one JSON trace step per line (from user code)
  __VRESULT__ {...}   final result JSON (from the harness)
  __VEMIT_ROW__ [...] C collection rows (from emitIntList helper)
  __VEMIT_PAIR__ [k,v] C map entries (from emitPair helper)

Harnesses are grouped by harness category (input shape), not per algorithm —
see the harnessCategories map in stubs.json.
"""

import json
from typing import Any, Dict, List, Optional, Tuple

SUPPORTED_LANGUAGES = ("python", "cpp", "c", "java", "go", "csharp")


def build_harness(language: str, algo: Dict[str, Any], user_code: str, state: Dict[str, Any]) -> str:
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language: {language}")
    builders = {
        "python": _build_python,
        "cpp": _build_cpp,
        "c": _build_c,
        "java": _build_java,
        "go": _build_go,
        "csharp": _build_csharp,
    }
    return builders[language](algo, user_code, state)


# ── Shared helpers ──────────────────────────────────────────────────────────
def _param_list(algo: Dict[str, Any]) -> List[Dict[str, str]]:
    return algo.get("params", [])


def _args_for(algo: Dict[str, Any], state: Dict[str, Any]) -> List[Tuple[str, str, Any]]:
    """Ordered (name, type, value) triples for the algorithm's parameters."""
    args = state.get("args", {})
    out = []
    for p in _param_list(algo):
        out.append((p["name"], p["type"], args.get(p["name"])))
    return out


def _method_map(algo: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return {m["name"]: m for m in algo.get("methods", [])}


def _operations(state: Dict[str, Any]) -> List[Dict[str, Any]]:
    return state.get("operations", [])


def _ctor_args(state: Dict[str, Any]) -> List[Any]:
    return state.get("ctorArgs", [])


def _last_method_info(algo: Dict[str, Any], state: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """Return (lastMethodName, returnTypeOrNone) for stateful replays."""
    ops = _operations(state)
    if not ops:
        return None, None
    last = ops[-1]
    m = _method_map(algo).get(last["method"])
    return last["method"], (m["returns"] if m else None)


def _esc(s: str) -> str:
    """Escape a string for embedding in a C-family string literal."""
    return (
        str(s)
        .replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\t", "\\t")
        .replace("\r", "\\r")
    )


def _quote(s: str) -> str:
    return f'"{_esc(s)}"'


def _lit_quote(s: str) -> str:
    """Quoted string escaped for embedding inside a generated string literal."""
    return '\\"' + _esc(s) + '\\"'


def _double_lit(v: Any) -> str:
    text = repr(float(v))
    if "." not in text and "e" not in text and "E" not in text:
        text += ".0"
    return text


def _is_collection_return(ret: str) -> bool:
    return ret in ("intArray", "intMatrix", "map", "stringArray")


# ── Python ───────────────────────────────────────────────────────────────────
_PY_PRELUDE = """import json

def visualize_step(op, value=None):
    print("__VSTEP__ " + json.dumps({"op": str(op), "value": value}))
"""

_PY_LIST_NODE = """
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def __build_list(values, cycle_index=-1):
    head = tail = None
    nodes = []
    for v in values:
        node = ListNode(v)
        nodes.append(node)
        if head is None:
            head = node
        else:
            tail.next = node
        tail = node
    if 0 <= cycle_index < len(nodes) and tail is not None:
        tail.next = nodes[cycle_index]
    return head

def __ser_list(head):
    out, seen = [], set()
    cur = head
    while cur is not None and id(cur) not in seen:
        seen.add(id(cur))
        out.append(cur.val)
        cur = cur.next
    return out
"""


def _build_python(algo: Dict[str, Any], user_code: str, state: Dict[str, Any]) -> str:
    parts = [_PY_PRELUDE, user_code, ""]

    if algo["kind"] == "class":
        ctor = json.dumps(_ctor_args(state))
        parts.append(f"__instance = {algo['entry']}(*json.loads({json.dumps(ctor)}))")
        parts.append("__last = None")
        parts.append("__last_method = None")
        parts.append(f"for __op in json.loads({json.dumps(json.dumps(_operations(state)))}):")
        parts.append("    __m = getattr(__instance, __op[\"method\"])")
        parts.append("    visualize_step(__op[\"method\"], __op[\"args\"][0] if __op[\"args\"] else None)")
        parts.append("    __last_method = __op[\"method\"]")
        parts.append("    __last = __m(*__op[\"args\"])")
        parts.append(
            'print("__VRESULT__ " + json.dumps({"lastMethod": __last_method, "returned": __last}, default=str))'
        )
        return "\n".join(parts)

    needs_list = any(t == "node" for _, t, _ in _args_for(algo, state))
    if needs_list:
        parts.insert(1, _PY_LIST_NODE)

    args_payload = json.dumps(json.dumps(state.get("args", {})))
    parts.append(f"__args = json.loads({args_payload})")
    call_args = []
    for name, ptype, _ in _args_for(algo, state):
        if ptype == "node":
            call_args.append(
                f"__build_list(__args[{json.dumps(name)}][\"values\"], "
                f"__args[{json.dumps(name)}].get(\"cycleIndex\", -1))"
            )
        else:
            call_args.append(f"__args[{json.dumps(name)}]")
    parts.append(f"__result = {algo['entry']}({', '.join(call_args)})")
    if algo.get("returns") == "node":
        parts.append("__result = __ser_list(__result)")
    parts.append('print("__VRESULT__ " + json.dumps({"result": __result}, default=str))')
    return "\n".join(parts)


# ── C++ ──────────────────────────────────────────────────────────────────────
_CPP_PRELUDE = """#include <bits/stdc++.h>
using namespace std;

static string __vj(const string& s) {
    string o = "\\"";
    for (char c : s) {
        if (c == '"' || c == '\\\\') o += '\\\\';
        if (c == '\\n') { o += "\\\\n"; continue; }
        o += c;
    }
    return o + "\\"";
}
static void visualizeStep(const string& op) {
    cout << "__VSTEP__ {\\"op\\":" << __vj(op) << "}" << endl;
}
static void visualizeStep(const string& op, int v) {
    cout << "__VSTEP__ {\\"op\\":" << __vj(op) << ",\\"value\\":" << v << "}" << endl;
}
static void visualizeStep(const string& op, double v) {
    cout << "__VSTEP__ {\\"op\\":" << __vj(op) << ",\\"value\\":" << v << "}" << endl;
}
static void visualizeStep(const string& op, const string& v) {
    cout << "__VSTEP__ {\\"op\\":" << __vj(op) << ",\\"value\\":" << __vj(v) << "}" << endl;
}
static string __jr(int v) { return to_string(v); }
static string __jr(double v) { ostringstream o; o << v; return o.str(); }
static string __jr(bool v) { return v ? "true" : "false"; }
static string __jr(const string& v) { return __vj(v); }
static string __jr(const vector<int>& v) {
    string o = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += to_string(v[i]); }
    return o + "]";
}
static string __jr(const vector<double>& v) {
    string o = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; ostringstream s; s << v[i]; o += s.str(); }
    return o + "]";
}
static string __jr(const vector<string>& v) {
    string o = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += __vj(v[i]); }
    return o + "]";
}
static string __jr(const vector<vector<int>>& v) {
    string o = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += __jr(v[i]); }
    return o + "]";
}
static string __jr(const unordered_map<int, int>& m) {
    string o = "{";
    bool first = true;
    for (const auto& kv : m) {
        if (!first) o += ",";
        first = false;
        o += "\\"" + to_string(kv.first) + "\\":" + to_string(kv.second);
    }
    return o + "}";
}
"""

_CPP_LIST_NODE = """struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v) : val(v), next(nullptr) {}
};
static ListNode* __buildList(const vector<int>& values, int cycleIndex) {
    ListNode* head = nullptr;
    ListNode* tail = nullptr;
    vector<ListNode*> nodes;
    for (int v : values) {
        ListNode* node = new ListNode(v);
        nodes.push_back(node);
        if (!head) head = node;
        else tail->next = node;
        tail = node;
    }
    if (cycleIndex >= 0 && cycleIndex < (int)nodes.size() && tail) tail->next = nodes[cycleIndex];
    return head;
}
static string __jr(ListNode* h) {
    string o = "[";
    set<ListNode*> seen;
    bool first = true;
    while (h && !seen.count(h)) {
        seen.insert(h);
        if (!first) o += ",";
        first = false;
        o += to_string(h->val);
        h = h->next;
    }
    return o + "]";
}
"""


def _cpp_lit(value: Any, ptype: str) -> str:
    if ptype == "int":
        return str(int(value))
    if ptype == "double":
        return _double_lit(value)
    if ptype == "string":
        return _quote(value)
    if ptype == "intArray":
        return "{" + ", ".join(str(int(v)) for v in value) + "}"
    if ptype == "intMatrix":
        return "{" + ", ".join("{" + ", ".join(str(int(v)) for v in row) + "}" for row in value) + "}"
    raise ValueError(f"Unsupported C++ literal type: {ptype}")


def _cpp_decl(name: str, ptype: str, value: Any) -> str:
    if ptype == "int":
        return f"    int {name} = {_cpp_lit(value, ptype)};"
    if ptype == "double":
        return f"    double {name} = {_cpp_lit(value, ptype)};"
    if ptype == "string":
        return f"    string {name} = {_cpp_lit(value, ptype)};"
    if ptype == "intArray":
        return f"    vector<int> {name} = {_cpp_lit(value, ptype)};"
    if ptype == "intMatrix":
        return f"    vector<vector<int>> {name} = {_cpp_lit(value, ptype)};"
    if ptype == "node":
        vals = "{" + ", ".join(str(int(v)) for v in value.get("values", [])) + "}"
        cycle = int(value.get("cycleIndex", -1))
        return f"    ListNode* {name} = __buildList(vector<int>{vals}, {cycle});"
    raise ValueError(f"Unsupported C++ param type: {ptype}")


def _cpp_result_expr(ret: str) -> str:
    return '__jr(__result)'


def _build_cpp(algo: Dict[str, Any], user_code: str, state: Dict[str, Any]) -> str:
    parts = [_CPP_PRELUDE]
    if algo["kind"] == "function" and any(t == "node" for _, t, _ in _args_for(algo, state)):
        parts.append(_CPP_LIST_NODE)
    if algo["kind"] == "function" and algo.get("returns") == "node":
        if _CPP_LIST_NODE not in parts:
            parts.append(_CPP_LIST_NODE)
    parts.append(user_code)
    parts.append("")
    parts.append("int main() {")

    if algo["kind"] == "class":
        ctor = ", ".join(_cpp_lit(v, "int") if isinstance(v, (int, float)) else _quote(v) for v in _ctor_args(state))
        parts.append(f"    {algo['entry']} __inst({ctor});")
        methods = _method_map(algo)
        last_name, last_ret = _last_method_info(algo, state)
        for op in _operations(state):
            m = methods.get(op["method"], {})
            arg_lits = ", ".join(_cpp_lit(v, pt["type"]) for v, pt in zip(op.get("args", []), m.get("params", [])))
            parts.append(f"    visualizeStep({ _quote(op['method']) }{', ' + _cpp_lit(op['args'][0], m['params'][0]['type']) if op.get('args') else ''});")
            is_last = op["method"] == last_name and op is _operations(state)[-1]
            call = f"__inst.{op['method']}({arg_lits})"
            if is_last and last_ret and last_ret != "void":
                parts.append(f"    auto __result = {call};")
                parts.append(
                    f"    cout << \"__VRESULT__ {{\\\"lastMethod\\\":{_lit_quote(last_name)},\\\"returned\\\":\" << __jr(__result) << \"}}\" << endl;"
                )
            else:
                parts.append(f"    {call};")
        if not (last_ret and last_ret != "void"):
            parts.append(
                f"    cout << \"__VRESULT__ {{\\\"lastMethod\\\":{_lit_quote(last_name or '')},\\\"returned\\\":null}}\" << endl;"
            )
        parts.append("    return 0;")
        parts.append("}")
        return "\n".join(parts)

    for name, ptype, value in _args_for(algo, state):
        parts.append(_cpp_decl(name, ptype, value))
    names = ", ".join(n for n, _, _ in _args_for(algo, state))
    parts.append(f"    auto __result = {algo['entry']}({names});")
    parts.append(f'    cout << "__VRESULT__ {{\\"result\\":" << {_cpp_result_expr(algo.get("returns", ""))} << "}}" << endl;')
    parts.append("    return 0;")
    parts.append("}")
    return "\n".join(parts)


# ── C ────────────────────────────────────────────────────────────────────────
_C_PRELUDE = """#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void visualizeStep(const char* op, int value) {
    printf("__VSTEP__ {\\"op\\":\\"%s\\",\\"value\\":%d}\\n", op, value);
}
static void visualizeStepD(const char* op, double value) {
    printf("__VSTEP__ {\\"op\\":\\"%s\\",\\"value\\":%g}\\n", op, value);
}
static void visualizeStepS(const char* op, const char* value) {
    printf("__VSTEP__ {\\"op\\":\\"%s\\",\\"value\\":\\"%s\\"}\\n", op, value);
}
static void emitIntList(const int* values, int size) {
    printf("__VEMIT_ROW__ [");
    for (int i = 0; i < size; i++) { if (i) printf(","); printf("%d", values[i]); }
    printf("]\\n");
}
static void emitPair(int key, int value) {
    printf("__VEMIT_PAIR__ [%d,%d]\\n", key, value);
}
"""

_C_LIST_NODE = """struct ListNode {
    int val;
    struct ListNode* next;
};
static struct ListNode* __buildList(const int* values, int size, int cycleIndex) {
    struct ListNode* head = NULL;
    struct ListNode* tail = NULL;
    struct ListNode** nodes = (struct ListNode**)malloc(sizeof(struct ListNode*) * (size > 0 ? size : 1));
    for (int i = 0; i < size; i++) {
        struct ListNode* node = (struct ListNode*)malloc(sizeof(struct ListNode));
        node->val = values[i];
        node->next = NULL;
        nodes[i] = node;
        if (!head) head = node;
        else tail->next = node;
        tail = node;
    }
    if (cycleIndex >= 0 && cycleIndex < size && tail) tail->next = nodes[cycleIndex];
    return head;
}
"""


def _c_visualize_call(op_name: str, args: List[Any], param_types: List[Dict[str, str]]) -> str:
    if not args:
        return f"    visualizeStep({ _quote(op_name) }, 0);"
    ptype = param_types[0]["type"] if param_types else "int"
    if ptype == "string":
        return f"    visualizeStepS({ _quote(op_name) }, { _quote(args[0]) });"
    if ptype == "double":
        return f"    visualizeStepD({ _quote(op_name) }, { _double_lit(args[0]) });"
    return f"    visualizeStep({ _quote(op_name) }, { int(args[0]) });"


def _c_result_print(ret: str, expr: str) -> str:
    if ret == "int" or ret == "bool":
        return f'    printf("__VRESULT__ {{\\"result\\":%d}}\\n", {expr});'
    if ret == "double":
        return f'    printf("__VRESULT__ {{\\"result\\":%g}}\\n", {expr});'
    if ret == "string":
        return f'    printf("__VRESULT__ {{\\"result\\":\\"%s\\"}}\\n", {expr});'
    if ret == "void":
        return '    printf("__VRESULT__ {\\"emitted\\":true}\\n");'
    if ret == "node":
        return (
            '    printf("__VRESULT__ {\\"result\\":[");\n'
            f"    {{ struct ListNode* __p = {expr}; int __first = 1; "
            'while (__p) { if (!__first) printf(","); __first = 0; printf("%d", __p->val); __p = __p->next; } }\n'
            '    printf("]}\\n");'
        )
    raise ValueError(f"Unsupported C return type: {ret}")


def _c_param_decls(params: List[Tuple[str, str, Any]]) -> List[str]:
    lines = []
    for name, ptype, value in params:
        if ptype == "int":
            lines.append(f"    int {name} = {int(value)};")
        elif ptype == "double":
            lines.append(f"    double {name} = {_double_lit(value)};")
        elif ptype == "string":
            lines.append(f"    const char* {name} = {_quote(value)};")
        elif ptype == "intArray":
            data = ", ".join(str(int(v)) for v in value)
            lines.append(f"    static int __{name}_data[] = {{{data}}};")
            lines.append(f"    int* {name} = __{name}_data;")
            lines.append(f"    int {name}Size = {len(value)};")
        elif ptype == "intMatrix":
            for i, row in enumerate(value):
                data = ", ".join(str(int(v)) for v in row)
                lines.append(f"    static int __{name}_r{i}[] = {{{data}}};")
            rows = ", ".join(f"__{name}_r{i}" for i in range(len(value)))
            lines.append(f"    static int* __{name}_rows[] = {{{rows}}};")
            lines.append(f"    int** {name} = __{name}_rows;")
            lines.append(f"    int {name}Size = {len(value)};")
        elif ptype == "node":
            vals = ", ".join(str(int(v)) for v in value.get("values", []))
            cycle = int(value.get("cycleIndex", -1))
            lines.append(f"    static int __{name}_vals[] = {{{vals}}};")
            lines.append(
                f"    struct ListNode* {name} = __buildList(__{name}_vals, {len(value.get('values', []))}, {cycle});"
            )
        else:
            raise ValueError(f"Unsupported C param type: {ptype}")
    return lines


def _c_call_arg(name: str, ptype: str) -> str:
    if ptype in ("intArray", "intMatrix"):
        return f"{name}, {name}Size"
    return name


def _build_c(algo: Dict[str, Any], user_code: str, state: Dict[str, Any]) -> str:
    parts = [_C_PRELUDE]
    if algo["kind"] == "function" and (
        any(t == "node" for _, t, _ in _args_for(algo, state)) or algo.get("returns") == "node"
    ):
        parts.append(_C_LIST_NODE)
    parts.append(user_code)
    parts.append("")
    parts.append("int main(void) {")

    if algo["kind"] == "class":
        entry = algo["entry"]
        parts.append(f"    struct {entry} __inst;")
        ctor = ", ".join(str(int(v)) if isinstance(v, (int, float)) else _quote(v) for v in _ctor_args(state))
        parts.append(f"    init{entry}(&__inst{', ' + ctor if ctor else ''});")
        methods = _method_map(algo)
        ops = _operations(state)
        last_name, last_ret = _last_method_info(algo, state)
        for idx, op in enumerate(ops):
            m = methods.get(op["method"], {})
            parts.append(_c_visualize_call(op["method"], op.get("args", []), m.get("params", [])))
            arg_lits = ", ".join(
                _quote(v) if pt["type"] == "string" else (_double_lit(v) if pt["type"] == "double" else str(int(v)))
                for v, pt in zip(op.get("args", []), m.get("params", []))
            )
            call = f"{op['method']}(&__inst{', ' + arg_lits if arg_lits else ''})"
            is_last = idx == len(ops) - 1
            if is_last and last_ret and last_ret != "void":
                decl = "const char*" if last_ret == "string" else ("double" if last_ret == "double" else "int")
                parts.append(f"    {decl} __last = {call};")
                if last_ret == "int" or last_ret == "bool":
                    parts.append(
                        f'    printf("__VRESULT__ {{\\"lastMethod\\":{_lit_quote(last_name)},\\"returned\\":%d}}\\n", __last);'
                    )
                elif last_ret == "double":
                    parts.append(
                        f'    printf("__VRESULT__ {{\\"lastMethod\\":{_lit_quote(last_name)},\\"returned\\":%g}}\\n", __last);'
                    )
                else:
                    parts.append(
                        f'    printf("__VRESULT__ {{\\"lastMethod\\":{_lit_quote(last_name)},\\"returned\\":\\"%s\\"}}\\n", __last);'
                    )
            else:
                parts.append(f"    {call};")
        if not ops or not (last_ret and last_ret != "void"):
            parts.append(
                f'    printf("__VRESULT__ {{\\"lastMethod\\":{_lit_quote(last_name or "")},\\"returned\\":null}}\\n");'
            )
        parts.append("    return 0;")
        parts.append("}")
        return "\n".join(parts)

    params = _args_for(algo, state)
    parts.extend(_c_param_decls(params))
    names = ", ".join(_c_call_arg(n, t) for n, t, _ in params)
    ret = algo.get("returns", "void")
    # Collection returns are streamed through emitIntList/emitPair in C.
    if ret in ("void", "intArray", "intMatrix", "map", "stringArray"):
        parts.append(f"    {algo['entry']}({names});")
        parts.append(_c_result_print("void", ""))
    else:
        decl = {
            "int": "int",
            "bool": "int",
            "double": "double",
            "string": "const char*",
            "node": "struct ListNode*",
        }[ret]
        parts.append(f"    {decl} __result = {algo['entry']}({names});")
        parts.append(_c_result_print(ret, "__result"))
    parts.append("    return 0;")
    parts.append("}")
    return "\n".join(parts)


# ── Java ─────────────────────────────────────────────────────────────────────
_JAVA_PRELUDE_HEAD = """import java.util.*;

public class Main {
    static void visualizeStep(String op, Object value) {
        System.out.println("__VSTEP__ {\\"op\\":\\"" + op + "\\",\\"value\\":" + __json(value) + "}");
    }
    static void visualizeStep(String op) {
        System.out.println("__VSTEP__ {\\"op\\":\\"" + op + "\\"}");
    }
    static String __esc(String s) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\\\') b.append('\\\\');
            if (c == '\\n') { b.append("\\\\n"); continue; }
            b.append(c);
        }
        return b.toString();
    }
    static String __json(Object o) {
        if (o == null) return "null";
        if (o instanceof int[]) {
            int[] a = (int[]) o;
            StringBuilder b = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) b.append(","); b.append(a[i]); }
            return b.append("]").toString();
        }
        if (o instanceof int[][]) {
            int[][] a = (int[][]) o;
            StringBuilder b = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) b.append(","); b.append(__json(a[i])); }
            return b.append("]").toString();
        }
        if (o instanceof double[]) {
            double[] a = (double[]) o;
            StringBuilder b = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) b.append(","); b.append(a[i]); }
            return b.append("]").toString();
        }
        if (o instanceof ListNode) return __jsonList((ListNode) o);
        if (o instanceof String) return "\\"" + __esc((String) o) + "\\"";
        if (o instanceof List) {
            StringBuilder b = new StringBuilder("[");
            boolean first = true;
            for (Object e : (List<?>) o) { if (!first) b.append(","); first = false; b.append(__json(e)); }
            return b.append("]").toString();
        }
        if (o instanceof Map) {
            StringBuilder b = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) {
                if (!first) b.append(",");
                first = false;
                b.append("\\"").append(__esc(String.valueOf(e.getKey()))).append("\\":").append(__json(e.getValue()));
            }
            return b.append("}").toString();
        }
        if (o instanceof Boolean || o instanceof Integer || o instanceof Long || o instanceof Double || o instanceof Float) {
            return o.toString();
        }
        return "\\"" + __esc(o.toString()) + "\\"";
    }
"""

_JAVA_LIST_NODE = """    static class ListNode {
        int val;
        ListNode next;
        ListNode(int v) { val = v; }
    }
    static ListNode __buildList(int[] values, int cycleIndex) {
        ListNode head = null, tail = null;
        List<ListNode> nodes = new ArrayList<>();
        for (int v : values) {
            ListNode node = new ListNode(v);
            nodes.add(node);
            if (head == null) head = node;
            else tail.next = node;
            tail = node;
        }
        if (cycleIndex >= 0 && cycleIndex < nodes.size() && tail != null) tail.next = nodes.get(cycleIndex);
        return head;
    }
    static String __jsonList(ListNode h) {
        StringBuilder b = new StringBuilder("[");
        Set<ListNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        boolean first = true;
        while (h != null && !seen.contains(h)) {
            seen.add(h);
            if (!first) b.append(",");
            first = false;
            b.append(h.val);
            h = h.next;
        }
        return b.append("]").toString();
    }
"""


def _java_lit(value: Any, ptype: str) -> str:
    if ptype == "int":
        return str(int(value))
    if ptype == "double":
        return _double_lit(value)
    if ptype == "string":
        return _quote(value)
    if ptype == "intArray":
        return "{" + ", ".join(str(int(v)) for v in value) + "}"
    if ptype == "intMatrix":
        return "{" + ", ".join("{" + ", ".join(str(int(v)) for v in row) + "}" for row in value) + "}"
    raise ValueError(f"Unsupported Java literal type: {ptype}")


def _java_decl(name: str, ptype: str, value: Any) -> str:
    if ptype == "int":
        return f"        int {name} = {_java_lit(value, ptype)};"
    if ptype == "double":
        return f"        double {name} = {_java_lit(value, ptype)};"
    if ptype == "string":
        return f"        String {name} = {_java_lit(value, ptype)};"
    if ptype == "intArray":
        return f"        int[] {name} = {_java_lit(value, ptype)};"
    if ptype == "intMatrix":
        return f"        int[][] {name} = {_java_lit(value, ptype)};"
    if ptype == "node":
        vals = ", ".join(str(int(v)) for v in value.get("values", []))
        cycle = int(value.get("cycleIndex", -1))
        return f"        ListNode {name} = __buildList(new int[]{{{vals}}}, {cycle});"
    raise ValueError(f"Unsupported Java param type: {ptype}")


def _build_java(algo: Dict[str, Any], user_code: str, state: Dict[str, Any]) -> str:
    parts = [_JAVA_PRELUDE_HEAD]
    # ListNode support is always compiled in because __json references it.
    parts.append(_JAVA_LIST_NODE)
    parts.append(user_code)
    parts.append("")
    parts.append("    public static void main(String[] args) {")

    if algo["kind"] == "class":
        ctor = ", ".join(_java_lit(v, "int") if isinstance(v, (int, float)) else _quote(v) for v in _ctor_args(state))
        parts.append(f"        {algo['entry']} __inst = new {algo['entry']}({ctor});")
        parts.append("        Object __last = null;")
        methods = _method_map(algo)
        ops = _operations(state)
        last_name, last_ret = _last_method_info(algo, state)
        for idx, op in enumerate(ops):
            m = methods.get(op["method"], {})
            arg_lits = ", ".join(_java_lit(v, pt["type"]) for v, pt in zip(op.get("args", []), m.get("params", [])))
            if op.get("args"):
                parts.append(f"        visualizeStep({_quote(op['method'])}, {_java_lit(op['args'][0], m['params'][0]['type'])});")
            else:
                parts.append(f"        visualizeStep({_quote(op['method'])});")
            is_last = idx == len(ops) - 1
            if is_last and last_ret and last_ret != "void":
                parts.append(f"        __last = __inst.{op['method']}({arg_lits});")
            else:
                parts.append(f"        __inst.{op['method']}({arg_lits});")
        parts.append(
            f"        System.out.println(\"__VRESULT__ {{\\\"lastMethod\\\":{_lit_quote(last_name or '')},\\\"returned\\\":\" + __json(__last) + \"}}\");"
        )
        parts.append("    }")
        parts.append("}")
        return "\n".join(parts)

    for name, ptype, value in _args_for(algo, state):
        parts.append(_java_decl(name, ptype, value))
    names = ", ".join(n for n, _, _ in _args_for(algo, state))
    parts.append(f"        Object __result = {algo['entry']}({names});")
    parts.append(
        "        System.out.println(\"__VRESULT__ {\\\"result\\\":\" + __json(__result) + \"}\");"
    )
    parts.append("    }")
    parts.append("}")
    return "\n".join(parts)


# ── Go ───────────────────────────────────────────────────────────────────────
_GO_PRELUDE = """package main

import (
\t"bytes"
\t"encoding/json"
\t"fmt"
\t"math"
\t"sort"
\t"strconv"
\t"strings"
\t"unicode"
)

var (
\t_ = bytes.Compare
\t_ = math.Abs
\t_ = sort.Ints
\t_ = strconv.Itoa
\t_ = strings.TrimSpace
\t_ = unicode.IsDigit
\t_ = json.Marshal
\t_ = fmt.Println
)

func visualizeStep(op string, value interface{}) {
\t__b, _ := json.Marshal(map[string]interface{}{"op": op, "value": value})
\tfmt.Println("__VSTEP__ " + string(__b))
}
"""

_GO_LIST_NODE = """
type ListNode struct {
\tVal  int
\tNext *ListNode
}

func __buildList(values []int, cycleIndex int) *ListNode {
\tvar head, tail *ListNode
\tnodes := []*ListNode{}
\tfor _, v := range values {
\t\tnode := &ListNode{Val: v}
\t\tnodes = append(nodes, node)
\t\tif head == nil {
\t\t\thead = node
\t\t} else {
\t\t\ttail.Next = node
\t\t}
\t\ttail = node
\t}
\tif cycleIndex >= 0 && cycleIndex < len(nodes) && tail != nil {
\t\ttail.Next = nodes[cycleIndex]
\t}
\treturn head
}

func __serList(h *ListNode) []int {
\tout := []int{}
\tseen := map[*ListNode]bool{}
\tfor h != nil && !seen[h] {
\t\tseen[h] = true
\t\tout = append(out, h.Val)
\t\th = h.Next
\t}
\treturn out
}
"""


def _go_lit(value: Any, ptype: str) -> str:
    if ptype == "int":
        return str(int(value))
    if ptype == "double":
        return _double_lit(value)
    if ptype == "string":
        return _quote(value)
    if ptype == "intArray":
        return "[]int{" + ", ".join(str(int(v)) for v in value) + "}"
    if ptype == "intMatrix":
        return "[][]int{" + ", ".join("{" + ", ".join(str(int(v)) for v in row) + "}" for row in value) + "}"
    raise ValueError(f"Unsupported Go literal type: {ptype}")


def _go_decl(name: str, ptype: str, value: Any) -> str:
    if ptype == "node":
        vals = ", ".join(str(int(v)) for v in value.get("values", []))
        cycle = int(value.get("cycleIndex", -1))
        return f"\t{name} := __buildList([]int{{{vals}}}, {cycle})"
    return f"\t{name} := {_go_lit(value, ptype)}"


def _build_go(algo: Dict[str, Any], user_code: str, state: Dict[str, Any]) -> str:
    needs_list = (
        algo["kind"] == "function"
        and (any(t == "node" for _, t, _ in _args_for(algo, state)) or algo.get("returns") == "node")
    )
    parts = [_GO_PRELUDE]
    if needs_list:
        parts.append(_GO_LIST_NODE)
    parts.append(user_code)
    parts.append("")
    parts.append("func main() {")

    if algo["kind"] == "class":
        ctor_params = algo.get("ctorParams", [])
        if ctor_params:
            ctor = ", ".join(_go_lit(v, "int") if isinstance(v, (int, float)) else _quote(v) for v in _ctor_args(state))
            parts.append(f"\t__inst := new{algo['entry']}({ctor})")
        else:
            parts.append(f"\t__inst := &{algo['entry']}{{}}")
        parts.append("\tvar __last interface{}")
        parts.append("\t_ = __last")
        methods = _method_map(algo)
        ops = _operations(state)
        last_name, last_ret = _last_method_info(algo, state)
        for idx, op in enumerate(ops):
            m = methods.get(op["method"], {})
            arg_lits = ", ".join(_go_lit(v, pt["type"]) for v, pt in zip(op.get("args", []), m.get("params", [])))
            if op.get("args"):
                parts.append(f"\tvisualizeStep({_quote(op['method'])}, {_go_lit(op['args'][0], m['params'][0]['type'])})")
            else:
                parts.append(f"\tvisualizeStep({_quote(op['method'])}, nil)")
            is_last = idx == len(ops) - 1
            if is_last and last_ret and last_ret != "void":
                parts.append(f"\t__last = __inst.{op['method']}({arg_lits})")
            else:
                parts.append(f"\t__inst.{op['method']}({arg_lits})")
        parts.append("\t__out, _ := json.Marshal(map[string]interface{}{\"lastMethod\": " + _quote(last_name or "") + ", \"returned\": __last})")
        parts.append('\tfmt.Println("__VRESULT__ " + string(__out))')
        parts.append("}")
        return "\n".join(parts)

    for name, ptype, value in _args_for(algo, state):
        parts.append(_go_decl(name, ptype, value))
    names = ", ".join(n for n, _, _ in _args_for(algo, state))
    if algo.get("returns") == "node":
        parts.append(f"\t__result := __serList({algo['entry']}({names}))")
    else:
        parts.append(f"\t__result := {algo['entry']}({names})")
    parts.append('\t__out, _ := json.Marshal(map[string]interface{}{"result": __result})')
    parts.append('\tfmt.Println("__VRESULT__ " + string(__out))')
    parts.append("}")
    return "\n".join(parts)


# ── C# ───────────────────────────────────────────────────────────────────────
_CSHARP_PRELUDE_HEAD = """using System;
using System.Collections.Generic;
using System.Text;

class Program {
    static void visualizeStep(string op, object value) {
        Console.WriteLine("__VSTEP__ {\\"op\\":\\"" + op + "\\",\\"value\\":" + __json(value) + "}");
    }
    static void visualizeStep(string op) {
        Console.WriteLine("__VSTEP__ {\\"op\\":\\"" + op + "\\"}");
    }
    static string __esc(string s) {
        var b = new StringBuilder();
        foreach (char c in s) {
            if (c == '"' || c == '\\\\') b.Append('\\\\');
            if (c == '\\n') { b.Append("\\\\n"); continue; }
            b.Append(c);
        }
        return b.ToString();
    }
    static string __json(object o) {
        if (o == null) return "null";
        if (o is int[] ai) {
            var b = new StringBuilder("[");
            for (int i = 0; i < ai.Length; i++) { if (i > 0) b.Append(","); b.Append(ai[i]); }
            return b.Append("]").ToString();
        }
        if (o is int[][] aii) {
            var b = new StringBuilder("[");
            for (int i = 0; i < aii.Length; i++) { if (i > 0) b.Append(","); b.Append(__json(aii[i])); }
            return b.Append("]").ToString();
        }
        if (o is double[] ad) {
            var b = new StringBuilder("[");
            for (int i = 0; i < ad.Length; i++) { if (i > 0) b.Append(","); b.Append(ad[i]); }
            return b.Append("]").ToString();
        }
        if (o is ListNode ln) return __jsonList(ln);
        if (o is string s) return "\\"" + __esc(s) + "\\"";
        if (o is bool || o is int || o is long || o is double || o is float) return o.ToString().ToLowerInvariant().Replace(",", ".");
        if (o is System.Collections.IEnumerable en) {
            var b = new StringBuilder("[");
            bool first = true;
            foreach (var e in en) { if (!first) b.Append(","); first = false; b.Append(__json(e)); }
            return b.Append("]").ToString();
        }
        return "\\"" + __esc(o.ToString()) + "\\"";
    }
"""

_CSHARP_LIST_NODE = """    class ListNode {
        public int val;
        public ListNode next;
        public ListNode(int v) { val = v; }
    }
    static ListNode __buildList(int[] values, int cycleIndex) {
        ListNode head = null, tail = null;
        var nodes = new List<ListNode>();
        foreach (int v in values) {
            var node = new ListNode(v);
            nodes.Add(node);
            if (head == null) head = node;
            else tail.next = node;
            tail = node;
        }
        if (cycleIndex >= 0 && cycleIndex < nodes.Count && tail != null) tail.next = nodes[cycleIndex];
        return head;
    }
    static string __jsonList(ListNode h) {
        var b = new StringBuilder("[");
        var seen = new HashSet<ListNode>();
        bool first = true;
        while (h != null && !seen.Contains(h)) {
            seen.Add(h);
            if (!first) b.Append(",");
            first = false;
            b.Append(h.val);
            h = h.next;
        }
        return b.Append("]").ToString();
    }
"""


def _csharp_lit(value: Any, ptype: str) -> str:
    if ptype == "int":
        return str(int(value))
    if ptype == "double":
        return _double_lit(value)
    if ptype == "string":
        return _quote(value)
    if ptype == "intArray":
        return "{" + ", ".join(str(int(v)) for v in value) + "}"
    if ptype == "intMatrix":
        return "new int[][] { " + ", ".join("new int[] {" + ", ".join(str(int(v)) for v in row) + "}" for row in value) + " }"
    raise ValueError(f"Unsupported C# literal type: {ptype}")


def _csharp_decl(name: str, ptype: str, value: Any) -> str:
    if ptype == "int":
        return f"        int {name} = {_csharp_lit(value, ptype)};"
    if ptype == "double":
        return f"        double {name} = {_csharp_lit(value, ptype)};"
    if ptype == "string":
        return f"        string {name} = {_csharp_lit(value, ptype)};"
    if ptype == "intArray":
        return f"        int[] {name} = {_csharp_lit(value, ptype)};"
    if ptype == "intMatrix":
        return f"        int[][] {name} = {_csharp_lit(value, ptype)};"
    if ptype == "node":
        vals = ", ".join(str(int(v)) for v in value.get("values", []))
        cycle = int(value.get("cycleIndex", -1))
        return f"        ListNode {name} = __buildList(new int[] {{{vals}}}, {cycle});"
    raise ValueError(f"Unsupported C# param type: {ptype}")


def _build_csharp(algo: Dict[str, Any], user_code: str, state: Dict[str, Any]) -> str:
    parts = [_CSHARP_PRELUDE_HEAD]
    # ListNode support is always compiled in because __json references it.
    parts.append(_CSHARP_LIST_NODE)
    parts.append(user_code)
    parts.append("")
    parts.append("    static void Main() {")

    if algo["kind"] == "class":
        ctor = ", ".join(_csharp_lit(v, "int") if isinstance(v, (int, float)) else _quote(v) for v in _ctor_args(state))
        parts.append(f"        var __inst = new {algo['entry']}({ctor});")
        parts.append("        object __last = null;")
        methods = _method_map(algo)
        ops = _operations(state)
        last_name, last_ret = _last_method_info(algo, state)
        for idx, op in enumerate(ops):
            m = methods.get(op["method"], {})
            arg_lits = ", ".join(_csharp_lit(v, pt["type"]) for v, pt in zip(op.get("args", []), m.get("params", [])))
            if op.get("args"):
                parts.append(f"        visualizeStep({_quote(op['method'])}, {_csharp_lit(op['args'][0], m['params'][0]['type'])});")
            else:
                parts.append(f"        visualizeStep({_quote(op['method'])});")
            is_last = idx == len(ops) - 1
            if is_last and last_ret and last_ret != "void":
                parts.append(f"        __last = __inst.{op['method']}({arg_lits});")
            else:
                parts.append(f"        __inst.{op['method']}({arg_lits});")
        parts.append(
            f"        Console.WriteLine(\"__VRESULT__ {{\\\"lastMethod\\\":{_lit_quote(last_name or '')},\\\"returned\\\":\" + __json(__last) + \"}}\");"
        )
        parts.append("    }")
        parts.append("}")
        return "\n".join(parts)

    for name, ptype, value in _args_for(algo, state):
        parts.append(_csharp_decl(name, ptype, value))
    names = ", ".join(n for n, _, _ in _args_for(algo, state))
    parts.append(f"        object __result = {algo['entry']}({names});")
    parts.append(
        "        Console.WriteLine(\"__VRESULT__ {\\\"result\\\":\" + __json(__result) + \"}\");"
    )
    parts.append("    }")
    parts.append("}")
    return "\n".join(parts)
