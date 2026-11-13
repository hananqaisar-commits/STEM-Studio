"""Best-effort source instrumentation for learner-authored C++ programs.

The transformed program still runs in Judge0's isolated sandbox. Tree-sitter is
used only to find statement and scope boundaries; it never executes learner
code. When parsing is unavailable or the source has syntax errors, callers can
run the original program without claiming that a trace was captured.
"""

from __future__ import annotations

import re
import json
from typing import Any

try:
    import tree_sitter_cpp
    from tree_sitter import Language, Parser
except ImportError:  # Local/dev installs may not have refreshed requirements yet.
    tree_sitter_cpp = None  # type: ignore[assignment]
    Language = Parser = None  # type: ignore[assignment,misc]


def _text(source: bytes, node: Any) -> str:
    return source[node.start_byte:node.end_byte].decode("utf-8", "replace")


def _same_node(left: Any, right: Any) -> bool:
    return left is not None and right is not None and left.type == right.type and left.start_byte == right.start_byte and left.end_byte == right.end_byte


def _walk(node: Any):
    yield node
    for child in node.named_children:
        yield from _walk(child)


def _declarator_name(node: Any, source: bytes) -> str | None:
    if node is None or node.type == "function_declarator":
        return None
    if node.type in {"identifier", "field_identifier"}:
        return _text(source, node)
    if node.type == "init_declarator":
        return _declarator_name(node.child_by_field_name("declarator"), source)
    for child in node.named_children:
        value = _declarator_name(child, source)
        if value:
            return value
    return None


def _declaration_names(node: Any, source: bytes) -> list[str]:
    result: list[str] = []
    type_node = node.child_by_field_name("type")
    for child in node.named_children:
        if child == type_node or child.type in {"attribute_declaration", "ms_call_modifier"}:
            continue
        if child.type not in {"identifier", "init_declarator", "pointer_declarator", "reference_declarator", "array_declarator", "parenthesized_declarator"}:
            continue
        name = _declarator_name(child, source)
        if name and name not in result:
            result.append(name)
    return result


def _function_name(node: Any, source: bytes) -> str:
    declarator = node.child_by_field_name("declarator")
    value = _text(source, declarator) if declarator is not None else "function"
    identifiers = re.findall(r"[A-Za-z_]\w*", value)
    return "::".join(identifiers[:-1]) if "::" in value and len(identifiers) > 1 else (identifiers[0] if identifiers else "function")


def _function_parameters(node: Any, source: bytes) -> list[str]:
    declarator = node.child_by_field_name("declarator")
    if declarator is None:
        return []
    for item in _walk(declarator):
        if item.type == "parameter_list":
            return [name for child in item.named_children if child.type == "parameter_declaration"
                    if (name := _declarator_name(child.child_by_field_name("declarator"), source))]
    return []


def _scope_names(target: Any, source: bytes, globals_: list[str]) -> list[str]:
    names: dict[str, None] = dict.fromkeys(globals_)
    current = target
    while current.parent is not None:
        parent = current.parent
        if parent.type == "compound_statement":
            branch = current
            while branch.parent is not None and not _same_node(branch.parent, parent):
                branch = branch.parent
            for sibling in parent.named_children:
                if sibling.start_byte == branch.start_byte and sibling.end_byte == branch.end_byte:
                    break
                if sibling.type == "declaration":
                    for name in _declaration_names(sibling, source):
                        names[name] = None
            if branch.start_byte == target.start_byte and branch.end_byte == target.end_byte and target.type == "declaration":
                for name in _declaration_names(target, source):
                    names[name] = None
        if parent.type in {"for_statement", "range_based_for_statement"}:
            body = parent.child_by_field_name("body")
            if body is not None and (_same_node(current, body) or _same_node(current.parent, body)):
                initializer = parent.child_by_field_name("initializer")
                if initializer is not None and initializer.type == "declaration":
                    for name in _declaration_names(initializer, source):
                        names[name] = None
                left = parent.child_by_field_name("left")
                if left is not None:
                    for name in _declaration_names(left, source):
                        names[name] = None
        if parent.type == "function_definition":
            for name in _function_parameters(parent, source):
                names[name] = None
            break
        current = parent
    return list(names)


def _structs(root: Any, source: bytes) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    for node in _walk(root):
        if node.type not in {"struct_specifier", "class_specifier"}:
            continue
        if any(parent.type in {"namespace_definition", "template_declaration", "class_specifier", "struct_specifier"} for parent in _ancestors(node)):
            continue  # Namespace-qualified declarations need qualified serializer overloads.
        name_node = next((child for child in node.named_children if child.type in {"type_identifier", "identifier"}), None)
        body = next((child for child in node.named_children if child.type == "field_declaration_list"), None)
        if name_node is None or body is None:
            continue
        name = _text(source, name_node)
        public = node.type == "struct_specifier"
        fields: list[tuple[str, str, bool]] = []
        for child in body.named_children:
            if child.type == "access_specifier":
                public = _text(source, child).strip() == "public"
                continue
            if child.type != "field_declaration" or not public:
                continue
            type_node = child.child_by_field_name("type")
            if type_node is None:
                continue
            field_type = _text(source, type_node).strip()
            for declarator in child.named_children:
                if _same_node(declarator, type_node):
                    continue
                field_name = _declarator_name(declarator, source)
                if field_name is None:
                    continue
                declarator_text = _text(source, declarator)
                pointer = "*" in declarator_text
                fields.append((field_name, field_type, pointer))
        if not fields:
            continue
        declaration = node.parent if node.parent is not None and node.parent.type == "declaration" else node
        if declaration is node and node.parent is not None:
            siblings = list(node.parent.children)
            index = siblings.index(node)
            if index + 1 < len(siblings) and _text(source, siblings[index + 1]).strip() == ";":
                declaration = siblings[index + 1]
        found.append({"name": name, "fields": fields, "end": declaration.end_byte})
    # A serializer may reference an earlier declared type. Keep source order and
    # only emit self-reference handlers here; other user types use opaque values.
    return found


def _ancestors(node: Any):
    current = node.parent
    while current is not None:
        yield current
        current = current.parent


def _runtime_prelude(nonce: str) -> str:
    p = f"__octa_{nonce}_"
    return f'''#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <type_traits>
#include <typeinfo>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
namespace {p}runtime {{
struct Frame {{ std::string function; int line; std::map<std::string,std::string> scope; }};
struct Context {{ int seq=0; bool truncated=false; std::vector<Frame> frames; std::unordered_set<const void*> tracked, seen; std::unordered_map<const void*,std::string> ids; std::map<std::string,std::string> heap; }};
inline Context& context() {{ static Context value; return value; }}
inline std::string quote(const std::string& s) {{ std::ostringstream o; o<<'"'; for(unsigned char c:s) {{ if(c=='"'||c=='\\\\') o<<'\\\\'<<c; else if(c=='\\n') o<<"\\\\n"; else if(c=='\\r') o<<"\\\\r"; else if(c=='\\t') o<<"\\\\t"; else if(c<32) o<<"\\\\u"<<std::hex<<std::setw(4)<<std::setfill('0')<<(int)c<<std::dec; else o<<c; }} o<<'"'; return o.str(); }}
inline std::string scalar(const char* type,const std::string& value) {{ return "{{\\\"kind\\\":\\\"scalar\\\",\\\"type\\\":"+quote(type)+",\\\"value\\\":"+quote(value)+"}}"; }}
inline std::string opaque(const char* type,const std::string& preview) {{ return "{{\\\"kind\\\":\\\"opaque\\\",\\\"type\\\":"+quote(type)+",\\\"preview\\\":"+quote(preview)+"}}"; }}
inline std::string null_value() {{ return "{{\\\"kind\\\":\\\"scalar\\\",\\\"type\\\":\\\"nullptr\\\",\\\"value\\\":null}}"; }}
inline std::string ref(const std::string& type,const std::string& id) {{ return "{{\\\"kind\\\":\\\"ref\\\",\\\"type\\\":"+quote(type)+",\\\"object_id\\\":"+quote(id)+"}}"; }}
inline std::string id_for(const void* ptr) {{ auto& c=context(); auto it=c.ids.find(ptr); if(it!=c.ids.end()) return it->second; std::ostringstream out; out<<"cpp-"<<std::hex<<(std::uintptr_t)ptr; auto id=out.str(); c.ids[ptr]=id; return id; }}
inline std::string object(const std::string& id,const char* type,const std::string& entries) {{ return "{{\\\"object_id\\\":"+quote(id)+",\\\"type\\\":"+quote(type)+",\\\"entries\\\":["+entries+"]}}"; }}
inline std::string encode(bool v) {{ return std::string("{{\\\"kind\\\":\\\"scalar\\\",\\\"type\\\":\\\"bool\\\",\\\"value\\\":")+(v?"true":"false")+"}}"; }}
template<class T> inline const char* type_name() {{ if(std::is_same<T,char>::value) return "char"; if(std::is_same<T,signed char>::value) return "signed char"; if(std::is_same<T,unsigned char>::value) return "unsigned char"; if(std::is_same<T,short>::value) return "short"; if(std::is_same<T,unsigned short>::value) return "unsigned short"; if(std::is_same<T,int>::value) return "int"; if(std::is_same<T,unsigned int>::value) return "unsigned int"; if(std::is_same<T,long>::value) return "long"; if(std::is_same<T,unsigned long>::value) return "unsigned long"; if(std::is_same<T,long long>::value) return "long long"; if(std::is_same<T,unsigned long long>::value) return "unsigned long long"; if(std::is_same<T,float>::value) return "float"; if(std::is_same<T,double>::value) return "double"; if(std::is_same<T,long double>::value) return "long double"; return typeid(T).name(); }}
template<class T> inline typename std::enable_if<std::is_arithmetic<T>::value && !std::is_same<T,bool>::value,std::string>::type encode(T v) {{ std::ostringstream o; o<<std::setprecision(16)<<v; return "{{\\\"kind\\\":\\\"scalar\\\",\\\"type\\\":"+quote(type_name<T>())+",\\\"value\\\":"+o.str()+"}}"; }}
template<class T> inline typename std::enable_if<!std::is_arithmetic<T>::value && !std::is_array<T>::value,std::string>::type encode(const T& v) {{ return opaque(typeid(T).name(),"<object preview unavailable>"); }}
inline std::string encode(const std::string& v) {{ return scalar("string",v.substr(0,240)); }}
inline std::string encode(const char* v) {{ return v?scalar("string",std::string(v).substr(0,240)):null_value(); }}
template<class T> inline std::string encode(T* const& p) {{ if(!p) return null_value(); std::ostringstream o; o<<"0x"<<std::hex<<(std::uintptr_t)p; return opaque("pointer",o.str()); }}
template<class T> inline std::string encode(const std::vector<T>& values) {{ auto& c=context(); const void* ptr=&values; auto id=id_for(ptr); if(c.seen.count(ptr)) return ref("vector",id); c.seen.insert(ptr); std::string entries; std::size_t i=0; for(const auto& v:values) {{ if(i>=80) break; if(!entries.empty()) entries+=","; entries+="{{\\\"key\\\":"+quote(std::to_string(i++))+",\\\"value\\\":"+encode(v)+"}}"; }} c.heap[id]=object(id,"vector",entries); return ref("vector",id); }}
template<class T,std::size_t N> inline std::string encode(const T (&values)[N]) {{ auto& c=context(); const void* ptr=&values; auto id=id_for(ptr); if(c.seen.count(ptr)) return ref("array",id); c.seen.insert(ptr); std::string entries; for(std::size_t i=0;i<N && i<80;++i) {{ if(i) entries+=","; entries+="{{\\\"key\\\":"+quote(std::to_string(i))+",\\\"value\\\":"+encode(values[i])+"}}"; }} c.heap[id]=object(id,"array",entries); return ref("array",id); }}
inline void track(const void* ptr) {{ if(ptr) context().tracked.insert(ptr); }}
inline void untrack(const void* ptr) {{ context().tracked.erase(ptr); }}
template<class T> inline T* track_new(T* ptr) {{ track(ptr); return ptr; }}
template<class T> inline void tracked_delete(T* ptr) {{ untrack(ptr); delete ptr; }}
template<class T> inline void tracked_delete_array(T* ptr) {{ untrack(ptr); delete[] ptr; }}
template<class F> inline void emit(int line,const char* kind,const char* function,F get_values) {{ auto& c=context(); if(c.seq>=180) {{ c.truncated=true; return; }} c.heap.clear(); c.seen.clear(); auto values=get_values(); if(c.frames.empty()) c.frames.push_back({{function,line,{{}}}}); auto& frame=c.frames.back(); frame.function=function; frame.line=line; frame.scope.clear(); for(const auto& item:values) frame.scope[item.first]=item.second; std::ostringstream out; out<<"{{\\\"seq\\\":"<<c.seq++<<",\\\"kind\\\":"<<quote(kind)<<",\\\"phase\\\":\\\"after\\\",\\\"line\\\":"<<line<<",\\\"function\\\":"<<quote(function)<<",\\\"frames\\\":["; for(std::size_t i=0;i<c.frames.size();++i) {{ if(i) out<<','; const auto& f=c.frames[i]; out<<"{{\\\"function\\\":"<<quote(f.function)<<",\\\"line\\\":"<<f.line<<",\\\"scope\\\":{{"; std::size_t j=0; for(const auto& var:f.scope) {{ if(j++) out<<','; out<<quote(var.first)<<':'<<var.second; }} out<<"}}}}"; }} out<<"],\\\"heap\\\":{{"; std::size_t k=0; for(const auto& item:c.heap) {{ if(k++) out<<','; out<<quote(item.first)<<':'<<item.second; }} out<<"}}}}"; std::cerr<<"__OCTACPP__{nonce} "<<out.str()<<'\\n'; }}
template<class F> inline void enter(const char* function,int line,F get_values) {{ auto& c=context(); Frame f; f.function=function; f.line=line; c.frames.push_back(f); emit(line,"call",function,get_values); }}
inline void leave() {{ auto& c=context(); if(!c.frames.empty()) c.frames.pop_back(); }}
}}
using namespace {p}runtime;
#line 1 "<live-source>"
'''


def _field_accessors(struct: dict[str, Any], known: set[str], nonce: str) -> str:
    p = f"__octa_{nonce}_"
    name = struct["name"]
    entries: list[str] = []
    for field, field_type, pointer in struct["fields"]:
        custom = re.fullmatch(r"(?:const\s+)?([A-Za-z_]\w*)", field_type)
        custom_type = custom.group(1) if custom else None
        if custom_type == name:
            expression = f"{p}runtime::encode(value.{field})"
        else:
            expression = f"{p}runtime::encode(value.{field})"
        entries.append(f"if(!fields.empty()) fields+=\",\"; fields+=\"{{\\\"key\\\":\"+{p}runtime::quote(\"{field}\")+\",\\\"value\\\":\"+{expression}+\"}}\";")
    body = " ".join(entries)
    return (
        f"namespace {p}runtime {{ inline std::string encode(const {name}& value); inline std::string encode({name}* value); "
        f"inline std::string encode({name}* value) {{ auto& c=context(); if(!value) return null_value(); if(!c.tracked.count(value)) return opaque(\"pointer\",\"untracked address\"); return encode(*value); }} "
        f"inline std::string encode(const {name}& value) {{ auto& c=context(); const void* ptr=&value; auto id=id_for(ptr); if(c.seen.count(ptr)) return ref(\"{name}\",id); c.seen.insert(ptr); c.tracked.insert(ptr); std::string fields; {body} c.heap[id]=object(id,\"{name}\",fields); return ref(\"{name}\",id); }} }}"
    )


def build_cpp_trace_program(source_text: str, nonce: str) -> str | None:
    """Instrument scope statements and public POD-like structs for live snapshots.

    If the C++ parser rejects the learner draft, the route should execute the
    original source and report that snapshots could not be attached.
    """
    if Parser is None or tree_sitter_cpp is None:
        return None
    source = source_text.encode("utf-8")
    parser = Parser(Language(tree_sitter_cpp.language()))
    tree = parser.parse(source)
    root = tree.root_node
    if root.has_error:
        return None

    structs = _structs(root, source)
    struct_names = {item["name"] for item in structs}
    globals_: list[str] = []
    for child in root.named_children:
        if child.type == "declaration":
            globals_.extend(_declaration_names(child, source))

    edits: list[tuple[int, int, str]] = []
    # Attach self-describing serializers after public struct/class definitions.
    # They are kept on one physical source line so learner line numbers remain stable.
    for item in structs:
        edits.append((item["end"], item["end"], _field_accessors(item, struct_names, nonce)))

    functions = [node for node in _walk(root) if node.type == "function_definition"]
    if not functions:
        return None
    for function in functions:
        body = function.child_by_field_name("body")
        if body is None or body.type != "compound_statement":
            continue
        fn = _function_name(function, source)
        entry_line = function.start_point.row + 1
        params = _function_parameters(function, source)
        values = ",".join(f"{{\"{name}\",{_encode_name(name, struct_names, nonce)}}}" for name in params)
        edits.append((body.start_byte + 1, body.start_byte + 1,
                     f"__octa_{nonce}_runtime::enter(\"{fn}\",{entry_line},[&](){{ return std::vector<std::pair<std::string,std::string>>{{{values}}}; }});"))
        for statement in _walk(body):
            if statement.type not in {"declaration", "expression_statement", "return_statement", "break_statement", "continue_statement", "throw_statement"}:
                continue
            # Declarations in for/if headers are not standalone statements.
            if statement.type == "declaration" and any(parent.type in {"for_statement", "range_based_for_statement", "condition_clause"} for parent in _ancestors(statement)):
                continue
            # Avoid treating lambda internals as part of the surrounding function frame.
            if any(parent.type == "lambda_expression" for parent in _ancestors(statement) if parent != function):
                continue
            names = _scope_names(statement, source, globals_)
            line = statement.start_point.row + 1
            values = ",".join(f"{{\"{name}\",{_encode_name(name, struct_names, nonce)}}}" for name in names)
            current_fn = fn
            track_locals = "".join(
                f"__octa_{nonce}_runtime::track(&{name});"
                for name in names if _name_has_struct_type(statement, name, source, struct_names)
            )
            if statement.type == "return_statement":
                pos = statement.start_byte
                code = f"{track_locals}__octa_{nonce}_runtime::emit({line},\"return\",\"{current_fn}\",[&](){{ return std::vector<std::pair<std::string,std::string>>{{{values}}}; }}); __octa_{nonce}_runtime::leave();"
                edits.append((pos, pos, code))
            else:
                pos = statement.end_byte
                code = f"{track_locals}__octa_{nonce}_runtime::emit({line},\"line\",\"{current_fn}\",[&](){{ return std::vector<std::pair<std::string,std::string>>{{{values}}}; }});"
                edits.append((pos, pos, code))

        # Implicit return and cleanup for local stack structs, immediately before
        # the function's closing brace. Explicit returns already pop the frame.
        close_byte = body.end_byte - 1
        edits.append((close_byte, close_byte, f"__octa_{nonce}_runtime::leave();"))

    # Register new allocations and remove deleted ones. This lets struct pointer
    # serializers follow only addresses created or observed by the running program.
    for node in _walk(root):
        if node.type == "new_expression" and not any(parent.type == "new_expression" for parent in _ancestors(node)):
            original = _text(source, node)
            edits.append((node.start_byte, node.end_byte, f"__octa_{nonce}_runtime::track_new(({original}))"))
        elif node.type == "delete_expression":
            arg = node.named_children[-1] if node.named_children else None
            if arg is None:
                continue
            array_delete = "delete[" in _text(source, node)[:12]
            method = "tracked_delete_array" if array_delete else "tracked_delete"
            edits.append((node.start_byte, node.end_byte, f"__octa_{nonce}_runtime::{method}(({_text(source,arg)}))"))

    transformed = _runtime_prelude(nonce) + source_text
    offset = len(_runtime_prelude(nonce).encode("utf-8"))
    # Apply original-source edits from right to left; each probe is single-line,
    # preserving the source's physical line numbers after the #line directive.
    for start, end, replacement in sorted(edits, key=lambda item: (item[0], item[1]), reverse=True):
        left = offset + start
        right = offset + end
        transformed = transformed[:left] + replacement + transformed[right:]
    return transformed


def parse_cpp_trace_output(stderr: str, nonce: str) -> tuple[list[dict[str, Any]], str, bool]:
    """Remove this run's private trace records from stderr and decode snapshots."""
    prefix = f"__OCTACPP__{nonce} "
    events: list[dict[str, Any]] = []
    user_stderr: list[str] = []
    for line in stderr.splitlines():
        if line.startswith(prefix):
            try:
                event = json.loads(line[len(prefix):])
                if isinstance(event, dict) and len(events) < 180:
                    events.append(event)
            except json.JSONDecodeError:
                continue
        else:
            user_stderr.append(line)
    return events, "\n".join(user_stderr), len(events) >= 180


def _encode_name(name: str, struct_names: set[str], nonce: str) -> str:
    return f"__octa_{nonce}_runtime::encode({name})"


def _name_has_struct_type(node: Any, name: str, source: bytes, struct_names: set[str]) -> bool:
    scope = node
    while scope is not None and scope.type not in {"compound_statement", "function_definition"}:
        scope = scope.parent
    if scope is None:
        return False
    for child in scope.named_children:
        if child.type != "declaration" or name not in _declaration_names(child, source):
            continue
        type_node = child.child_by_field_name("type")
        declarator = next((item for item in child.named_children if _declarator_name(item, source) == name), None)
        if type_node is not None and "*" not in (_text(source, declarator) if declarator is not None else "") and _text(source, type_node).strip() in struct_names:
            return True
    return False
