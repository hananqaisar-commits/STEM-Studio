export type LanguageKey = 'javascript' | 'python' | 'cpp' | 'java';

export interface CodeSnippet {
  code: string;
  lineMapping: Record<number, number>; // maps step codeLine -> code line index
}

export const STACK_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class Stack {
  constructor() { this.items = []; }
  push(element) {
    this.items.push(element);
  }
  pop() {
    if (this.isEmpty()) return "Underflow";
    return this.items.pop();
  }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
}`,
    lineMapping: { 1: 3, 2: 4, 3: 5 },
  },
  python: {
    code: `class Stack:
    def __init__(self):
        self.items = []
        
    def push(self, item):
        self.items.append(item)
        
    def pop(self):
        if self.is_empty():
            return "Underflow"
        return self.items.pop()
        
    def peek(self):
        return self.items[-1]`,
    lineMapping: { 1: 5, 2: 6, 3: 6 },
  },
  cpp: {
    code: `#include <iostream>
#include <vector>
using namespace std;

class Stack {
    vector<int> items;
public:
    void push(int val) {
        items.push_back(val);
    }
    void pop() {
        if (!items.empty()) items.pop_back();
    }
    int top() { return items.back(); }
};`,
    lineMapping: { 1: 8, 2: 9, 3: 9 },
  },
  java: {
    code: `import java.util.Stack;

public class StackDemo {
    private Stack<Integer> stack = new Stack<>();

    public void push(int val) {
        stack.push(val);
    }

    public int pop() {
        if (stack.isEmpty()) throw new IllegalStateException("Underflow");
        return stack.pop();
    }
}`,
    lineMapping: { 1: 6, 2: 7, 3: 7 },
  },
};

export const QUEUE_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class Queue {
  constructor() { this.items = []; }
  enqueue(element) {
    this.items.push(element);
  }
  dequeue() {
    if (this.isEmpty()) return "Underflow";
    return this.items.shift();
  }
}`,
    lineMapping: { 1: 3, 2: 4, 3: 5 },
  },
  python: {
    code: `from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()
        
    def enqueue(self, item):
        self.items.append(item)
        
    def dequeue(self):
        if not self.items:
            return "Underflow"
        return self.items.popleft()`,
    lineMapping: { 1: 7, 2: 8, 3: 8 },
  },
  cpp: {
    code: `#include <queue>
using namespace std;

class QueueDemo {
    queue<int> q;
public:
    void enqueue(int val) {
        q.push(val);
    }
    void dequeue() {
        if (!q.empty()) q.pop();
    }
};`,
    lineMapping: { 1: 7, 2: 8, 3: 8 },
  },
  java: {
    code: `import java.util.LinkedList;
import java.util.Queue;

public class QueueDemo {
    private Queue<Integer> q = new LinkedList<>();

    public void enqueue(int val) {
        q.add(val);
    }

    public int dequeue() {
        return q.poll();
    }
}`,
    lineMapping: { 1: 7, 2: 8, 3: 8 },
  },
};

export const PARENTHESES_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (stack.pop() !== map[char]) {
      return false;
    }
  }
  return stack.length === 0;
}`,
    lineMapping: { 1: 2, 3: 6, 5: 7, 6: 8, 8: 11, 9: 11 },
  },
  python: {
    code: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif not stack or stack.pop() != mapping[char]:
            return False
    return len(stack) == 0`,
    lineMapping: { 1: 2, 3: 6, 5: 7, 6: 8, 8: 9, 9: 9 },
  },
  cpp: {
    code: `#include <stack>
#include <unordered_map>
#include <string>
using namespace std;

bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty() || (c == ')' && st.top() != '(') ||
                (c == '}' && st.top() != '{') ||
                (c == ']' && st.top() != '[')) return false;
            st.pop();
        }
    }
    return st.empty();
}`,
    lineMapping: { 1: 7, 3: 9, 5: 14, 6: 12, 8: 16, 9: 16 },
  },
  java: {
    code: `import java.util.Stack;

public class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') stack.push(c);
            else if (stack.isEmpty() || !isMatch(stack.pop(), c)) return false;
        }
        return stack.isEmpty();
    }
}`,
    lineMapping: { 1: 5, 3: 7, 5: 8, 6: 8, 8: 10, 9: 10 },
  },
};

export const POSTFIX_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function evalRPN(tokens) {
  const stack = [];
  for (let token of tokens) {
    if (!isNaN(token)) {
      stack.push(Number(token));
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (token === '+') stack.push(a + b);
      else if (token === '-') stack.push(a - b);
      else if (token === '*') stack.push(a * b);
      else if (token === '/') stack.push(Math.trunc(a / b));
    }
  }
  return stack.pop();
}`,
    lineMapping: { 1: 2, 3: 5, 5: 11, 8: 15 },
  },
  python: {
    code: `def evalRPN(tokens: list[str]) -> int:
    stack = []
    for token in tokens:
        if token not in "+-*/":
            stack.append(int(token))
        else:
            b, a = stack.pop(), stack.pop()
            if token == '+': stack.append(a + b)
            elif token == '-': stack.append(a - b)
            elif token == '*': stack.append(a * b)
            elif token == '/': stack.append(int(a / b))
    return stack[-1]`,
    lineMapping: { 1: 2, 3: 5, 5: 11, 8: 12 },
  },
  cpp: {
    code: `#include <vector>
#include <string>
#include <stack>
using namespace std;

int evalRPN(vector<string>& tokens) {
    stack<int> st;
    for (string& t : tokens) {
        if (t != "+" && t != "-" && t != "*" && t != "/") st.push(stoi(t));
        else {
            int b = st.top(); st.pop();
            int a = st.top(); st.pop();
            if (t == "+") st.push(a + b);
            else if (t == "-") st.push(a - b);
            else if (t == "*") st.push(a * b);
            else if (t == "/") st.push(a / b);
        }
    }
    return st.top();
}`,
    lineMapping: { 1: 8, 3: 9, 5: 15, 8: 18 },
  },
  java: {
    code: `import java.util.Stack;

public class RPN {
    public int evalRPN(String[] tokens) {
        Stack<Integer> stack = new Stack<>();
        for (String t : tokens) {
            if (!"+-*/".contains(t)) stack.push(Integer.parseInt(t));
            else {
                int b = stack.pop(), a = stack.pop();
                if (t.equals("+")) stack.push(a + b);
                else if (t.equals("-")) stack.push(a - b);
                else if (t.equals("*")) stack.push(a * b);
                else if (t.equals("/")) stack.push(a / b);
            }
        }
        return stack.pop();
    }
}`,
    lineMapping: { 1: 6, 3: 7, 5: 13, 8: 16 },
  },
};

export const QVS_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class MyQueue {
  constructor() {
    this.inStack = [];
    this.outStack = [];
  }
  push(x) { this.inStack.push(x); }
  pop() {
    if (this.outStack.length === 0) {
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop());
      }
    }
    return this.outStack.pop();
  }
}`,
    lineMapping: { 2: 6, 4: 8, 5: 10, 7: 13 },
  },
  python: {
    code: `class MyQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []
        
    def push(self, x: int) -> None:
        self.in_stack.append(x)
        
    def pop(self) -> int:
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
        return self.out_stack.pop()`,
    lineMapping: { 2: 7, 4: 10, 5: 12, 7: 13 },
  },
  cpp: {
    code: `#include <stack>
using namespace std;

class MyQueue {
    stack<int> inStack, outStack;
public:
    void push(int x) { inStack.push(x); }
    int pop() {
        if (outStack.empty()) {
            while (!inStack.empty()) {
                outStack.push(inStack.top()); inStack.pop();
            }
        }
        int val = outStack.top(); outStack.pop();
        return val;
    }
};`,
    lineMapping: { 2: 7, 4: 9, 5: 11, 7: 14 },
  },
  java: {
    code: `import java.util.Stack;

class MyQueue {
    private Stack<Integer> inStack = new Stack<>();
    private Stack<Integer> outStack = new Stack<>();
    
    public void push(int x) { inStack.push(x); }
    public int pop() {
        if (outStack.isEmpty()) {
            while (!inStack.isEmpty()) {
                outStack.push(inStack.pop());
            }
        }
        return outStack.pop();
    }
}`,
    lineMapping: { 2: 7, 4: 9, 5: 11, 7: 14 },
  },
};

export const DAILY_TEMP_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function dailyTemperatures(temperatures) {
  const n = temperatures.length;
  const answer = new Array(n).fill(0);
  const stack = []; // stores indices
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const prevIdx = stack.pop();
      answer[prevIdx] = i - prevIdx;
    }
    stack.push(i);
  }
  return answer;
}`,
    lineMapping: { 1: 4, 3: 5, 6: 7, 8: 10, 10: 12 },
  },
  python: {
    code: `def dailyTemperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    answer = [0] * n
    stack = []
    for i, t in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < t:
            prev_idx = stack.pop()
            answer[prev_idx] = i - prev_idx
        stack.append(i)
    return answer`,
    lineMapping: { 1: 5, 3: 6, 6: 8, 8: 9, 10: 10 },
  },
  cpp: {
    code: `#include <vector>
#include <stack>
using namespace std;

vector<int> dailyTemperatures(vector<int>& temperatures) {
    int n = temperatures.size();
    vector<int> answer(n, 0);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && temperatures[st.top()] < temperatures[i]) {
            int prevIdx = st.top(); st.pop();
            answer[prevIdx] = i - prevIdx;
        }
        st.push(i);
    }
    return answer;
}`,
    lineMapping: { 1: 9, 3: 10, 6: 12, 8: 14, 10: 16 },
  },
  java: {
    code: `import java.util.Stack;

public class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] answer = new int[n];
        Stack<Integer> stack = new Stack<>();
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && temperatures[stack.peek()] < temperatures[i]) {
                int prevIdx = stack.pop();
                answer[prevIdx] = i - prevIdx;
            }
            stack.push(i);
        }
        return answer;
    }
}`,
    lineMapping: { 1: 8, 3: 9, 6: 11, 8: 13, 10: 15 },
  },
};

export const MIN_STACK_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];
  }
  push(val) {
    this.stack.push(val);
    if (this.minStack.length === 0 || val <= this.minStack[this.minStack.length - 1]) {
      this.minStack.push(val);
    }
  }
  pop() {
    const val = this.stack.pop();
    if (val === this.minStack[this.minStack.length - 1]) this.minStack.pop();
  }
  top() { return this.stack[this.stack.length - 1]; }
  getMin() { return this.minStack[this.minStack.length - 1]; }
}`,
    lineMapping: { 2: 7 },
  },
  python: {
    code: `class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []

    def push(self, val):
        self.stack.append(val)
        if not self.min_stack or val <= self.min_stack[-1]:
            self.min_stack.append(val)

    def pop(self):
        if self.stack[-1] == self.min_stack[-1]:
            self.min_stack.pop()
        self.stack.pop()

    def get_min(self):
        return self.min_stack[-1]`,
    lineMapping: { 2: 7 },
  },
  cpp: {
    code: `#include <stack>
using namespace std;

class MinStack {
    stack<int> st;
    stack<int> minSt;
public:
    void push(int val) {
        st.push(val);
        if (minSt.empty() || val <= minSt.top()) minSt.push(val);
    }
    void pop() {
        if (st.top() == minSt.top()) minSt.pop();
        st.pop();
    }
    int getMin() { return minSt.top(); }
};`,
    lineMapping: { 2: 9 },
  },
  java: {
    code: `import java.util.Stack;

class MinStack {
    private Stack<Integer> stack = new Stack<>();
    private Stack<Integer> minStack = new Stack<>();

    public void push(int val) {
        stack.push(val);
        if (minStack.isEmpty() || val <= minStack.peek()) minStack.push(val);
    }

    public void pop() {
        if (stack.peek().equals(minStack.peek())) minStack.pop();
        stack.pop();
    }

    public int getMin() { return minStack.peek(); }
}`,
    lineMapping: { 2: 8 },
  },
};

export const SIMPLIFY_PATH_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function simplifyPath(path) {
  const stack = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return '/' + stack.join('/');
}`,
    lineMapping: { 1: 2, 4: 8, 5: 6, 6: 6, 8: 12 },
  },
  python: {
    code: `def simplify_path(path: str) -> str:
    stack = []
    for part in path.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if stack:
                stack.pop()
        else:
            stack.append(part)
    return "/" + "/".join(stack)`,
    lineMapping: { 1: 2, 4: 10, 5: 8, 6: 7, 8: 11 },
  },
  cpp: {
    code: `#include <stack>
#include <sstream>
using namespace std;

string simplifyPath(string path) {
    stack<string> st;
    stringstream ss(path);
    string part;
    while (getline(ss, part, '/')) {
        if (part == "" || part == ".") continue;
        if (part == "..") {
            if (!st.empty()) st.pop();
        } else {
            st.push(part);
        }
    }
    string result = "";
    while (!st.empty()) {
        result = "/" + st.top() + result;
        st.pop();
    }
    return result.empty() ? "/" : result;
}`,
    lineMapping: { 1: 6, 4: 14, 5: 12, 6: 12, 8: 22 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public String simplifyPath(String path) {
        Deque<String> stack = new ArrayDeque<>();
        for (String part : path.split("/")) {
            if (part.isEmpty() || part.equals(".")) continue;
            if (part.equals("..")) {
                if (!stack.isEmpty()) stack.pollLast();
            } else {
                stack.addLast(part);
            }
        }
        return "/" + String.join("/", stack);
    }
}`,
    lineMapping: { 1: 6, 4: 12, 5: 10, 6: 10, 8: 15 },
  },
};

export const REMOVE_ADJACENT_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function removeDuplicates(s) {
  const stack = [];
  for (const ch of s) {
    if (stack.length > 0 && stack[stack.length - 1] === ch) {
      stack.pop();
    } else {
      stack.push(ch);
    }
  }
  return stack.join('');
}`,
    lineMapping: { 1: 2, 3: 7, 4: 5, 6: 10 },
  },
  python: {
    code: `def remove_duplicates(s: str) -> str:
    stack = []
    for ch in s:
        if stack and stack[-1] == ch:
            stack.pop()
        else:
            stack.append(ch)
    return "".join(stack)`,
    lineMapping: { 1: 2, 3: 7, 4: 5, 6: 8 },
  },
  cpp: {
    code: `#include <string>
using namespace std;

string removeDuplicates(string s) {
    string stack;
    for (char ch : s) {
        if (!stack.empty() && stack.back() == ch) {
            stack.pop_back();
        } else {
            stack.push_back(ch);
        }
    }
    return stack;
}`,
    lineMapping: { 1: 5, 3: 10, 4: 8, 6: 13 },
  },
  java: {
    code: `public class Solution {
    public String removeDuplicates(String s) {
        StringBuilder stack = new StringBuilder();
        for (char ch : s.toCharArray()) {
            int len = stack.length();
            if (len > 0 && stack.charAt(len - 1) == ch) {
                stack.deleteCharAt(len - 1);
            } else {
                stack.append(ch);
            }
        }
        return stack.toString();
    }
}`,
    lineMapping: { 1: 3, 3: 9, 4: 7, 6: 12 },
  },
};

export const BASIC_CALCULATOR_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function calculate(s) {
  let result = 0;
  let sign = 1;
  let num = 0;
  const stack = []; // saves (result, sign) at '('
  for (const c of s) {
    if (c >= '0' && c <= '9') {
      num = num * 10 + Number(c);
    } else if (c === '+' || c === '-') {
      result += sign * num;
      num = 0;
      sign = c === '+' ? 1 : -1;
    } else if (c === '(') {
      stack.push({ result, sign });
      result = 0;
      sign = 1;
    } else if (c === ')') {
      result += sign * num;
      num = 0;
      const ctx = stack.pop();
      result = ctx.result + ctx.sign * result;
    }
  }
  return result + sign * num;
}`,
    lineMapping: { 1: 1, 3: 8, 4: 10, 5: 14, 7: 20, 9: 24 },
  },
  python: {
    code: `def calculate(s: str) -> int:
    result = 0
    sign = 1
    num = 0
    stack = []  # saves (result, sign) at '('
    for c in s:
        if c.isdigit():
            num = num * 10 + int(c)
        elif c in "+-":
            result += sign * num
            num = 0
            sign = 1 if c == "+" else -1
        elif c == "(":
            stack.append((result, sign))
            result = 0
            sign = 1
        elif c == ")":
            result += sign * num
            num = 0
            prev, prev_sign = stack.pop()
            result = prev + prev_sign * result
    return result + sign * num`,
    lineMapping: { 1: 1, 3: 8, 4: 10, 5: 14, 7: 20, 9: 22 },
  },
  cpp: {
    code: `#include <string>
#include <vector>
using namespace std;

int calculate(string s) {
    int result = 0, sign = 1, num = 0;
    vector<pair<int, int>> stack; // (result, sign) at '('
    for (char c : s) {
        if (isdigit(c)) {
            num = num * 10 + (c - '0');
        } else if (c == '+' || c == '-') {
            result += sign * num;
            num = 0;
            sign = (c == '+') ? 1 : -1;
        } else if (c == '(') {
            stack.push_back({result, sign});
            result = 0;
            sign = 1;
        } else if (c == ')') {
            result += sign * num;
            num = 0;
            auto [prev, prevSign] = stack.back();
            stack.pop_back();
            result = prev + prevSign * result;
        }
    }
    return result + sign * num;
}`,
    lineMapping: { 1: 5, 3: 10, 4: 12, 5: 16, 7: 22, 9: 27 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public int calculate(String s) {
        int result = 0, sign = 1, num = 0;
        Deque<int[]> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c)) {
                num = num * 10 + (c - '0');
            } else if (c == '+' || c == '-') {
                result += sign * num;
                num = 0;
                sign = (c == '+') ? 1 : -1;
            } else if (c == '(') {
                stack.push(new int[]{result, sign});
                result = 0;
                sign = 1;
            } else if (c == ')') {
                result += sign * num;
                num = 0;
                int[] ctx = stack.pop();
                result = ctx[0] + ctx[1] * result;
            }
        }
        return result + sign * num;
    }
}`,
    lineMapping: { 1: 5, 3: 10, 4: 12, 5: 16, 7: 22, 9: 26 },
  },
};

export const DECODE_STRING_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function decodeString(s) {
  const countStack = [];
  const stringStack = [];
  let current = '';
  let num = 0;
  for (const c of s) {
    if (c >= '0' && c <= '9') {
      num = num * 10 + Number(c);
    } else if (c === '[') {
      countStack.push(num);
      stringStack.push(current);
      num = 0;
      current = '';
    } else if (c === ']') {
      const repeat = countStack.pop();
      const prev = stringStack.pop();
      current = prev + current.repeat(repeat);
    } else {
      current += c;
    }
  }
  return current;
}`,
    lineMapping: { 1: 6, 3: 8, 4: 10, 5: 19, 6: 15, 8: 22 },
  },
  python: {
    code: `def decode_string(s: str) -> str:
    count_stack = []
    string_stack = []
    current = ""
    num = 0
    for c in s:
        if c.isdigit():
            num = num * 10 + int(c)
        elif c == "[":
            count_stack.append(num)
            string_stack.append(current)
            num = 0
            current = ""
        elif c == "]":
            repeat = count_stack.pop()
            prev = string_stack.pop()
            current = prev + current * repeat
        else:
            current += c
    return current`,
    lineMapping: { 1: 6, 3: 8, 4: 10, 5: 19, 6: 15, 8: 20 },
  },
  cpp: {
    code: `#include <string>
#include <vector>
using namespace std;

string decodeString(string s) {
    vector<int> countStack;
    vector<string> stringStack;
    string current = "";
    int num = 0;
    for (char c : s) {
        if (isdigit(c)) {
            num = num * 10 + (c - '0');
        } else if (c == '[') {
            countStack.push_back(num);
            stringStack.push_back(current);
            num = 0;
            current = "";
        } else if (c == ']') {
            int repeat = countStack.back(); countStack.pop_back();
            string prev = stringStack.back(); stringStack.pop_back();
            string expanded = "";
            for (int i = 0; i < repeat; i++) expanded += current;
            current = prev + expanded;
        } else {
            current += c;
        }
    }
    return current;
}`,
    lineMapping: { 1: 10, 3: 12, 4: 14, 5: 25, 6: 19, 8: 28 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public String decodeString(String s) {
        Deque<Integer> countStack = new ArrayDeque<>();
        Deque<String> stringStack = new ArrayDeque<>();
        StringBuilder current = new StringBuilder();
        int num = 0;
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c)) {
                num = num * 10 + (c - '0');
            } else if (c == '[') {
                countStack.push(num);
                stringStack.push(current.toString());
                num = 0;
                current.setLength(0);
            } else if (c == ']') {
                int repeat = countStack.pop();
                String prev = stringStack.pop();
                String cur = current.toString();
                current.setLength(0);
                current.append(prev.repeat(repeat)).append(cur);
            } else {
                current.append(c);
            }
        }
        return current.toString();
    }
}`,
    lineMapping: { 1: 10, 3: 12, 4: 14, 5: 25, 6: 19, 8: 28 },
  },
};

export const TRAPPING_RAIN_WATER_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function trap(height) {
  let water = 0;
  const stack = []; // indices of bars
  for (let i = 0; i < height.length; i++) {
    while (stack.length > 0 && height[i] > height[stack[stack.length - 1]]) {
      const bottom = stack.pop();
      if (stack.length === 0) break;
      const left = stack[stack.length - 1];
      const width = i - left - 1;
      const depth = Math.min(height[left], height[i]) - height[bottom];
      water += width * depth;
    }
    stack.push(i);
  }
  return water;
}`,
    lineMapping: { 1: 3, 3: 5, 5: 7, 6: 11, 8: 13, 10: 15 },
  },
  python: {
    code: `def trap(height: list[int]) -> int:
    water = 0
    stack = []  # indices of bars
    for i, h in enumerate(height):
        while stack and h > height[stack[-1]]:
            bottom = stack.pop()
            if not stack:
                break
            left = stack[-1]
            width = i - left - 1
            depth = min(height[left], h) - height[bottom]
            water += width * depth
        stack.append(i)
    return water`,
    lineMapping: { 1: 3, 3: 5, 5: 7, 6: 12, 8: 13, 10: 14 },
  },
  cpp: {
    code: `#include <vector>
#include <stack>
using namespace std;

int trap(vector<int>& height) {
    int water = 0;
    stack<int> st; // indices of bars
    for (int i = 0; i < (int)height.size(); i++) {
        while (!st.empty() && height[i] > height[st.top()]) {
            int bottom = st.top(); st.pop();
            if (st.empty()) break;
            int left = st.top();
            int width = i - left - 1;
            int depth = min(height[left], height[i]) - height[bottom];
            water += width * depth;
        }
        st.push(i);
    }
    return water;
}`,
    lineMapping: { 1: 7, 3: 9, 5: 11, 6: 15, 8: 17, 10: 19 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public int trap(int[] height) {
        int water = 0;
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < height.length; i++) {
            while (!stack.isEmpty() && height[i] > height[stack.peek()]) {
                int bottom = stack.pop();
                if (stack.isEmpty()) break;
                int left = stack.peek();
                int width = i - left - 1;
                int depth = Math.min(height[left], height[i]) - height[bottom];
                water += width * depth;
            }
            stack.push(i);
        }
        return water;
    }
}`,
    lineMapping: { 1: 7, 3: 9, 5: 11, 6: 15, 8: 17, 10: 19 },
  },
};

export const LARGEST_RECTANGLE_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function largestRectangleArea(heights) {
  const stack = []; // indices, heights increasing
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i];
    while (stack.length > 0 && heights[stack[stack.length - 1]] > h) {
      const top = stack.pop();
      const left = stack.length > 0 ? stack[stack.length - 1] : -1;
      const width = i - left - 1;
      best = Math.max(best, heights[top] * width);
    }
    stack.push(i);
  }
  return best;
}`,
    lineMapping: { 1: 2, 3: 6, 6: 10, 8: 12, 10: 14 },
  },
  python: {
    code: `def largest_rectangle_area(heights: list[int]) -> int:
    stack = []  # indices, heights increasing
    best = 0
    for i in range(len(heights) + 1):
        h = 0 if i == len(heights) else heights[i]
        while stack and heights[stack[-1]] > h:
            top = stack.pop()
            left = stack[-1] if stack else -1
            width = i - left - 1
            best = max(best, heights[top] * width)
        stack.append(i)
    return best`,
    lineMapping: { 1: 2, 3: 6, 6: 10, 8: 11, 10: 12 },
  },
  cpp: {
    code: `#include <vector>
#include <stack>
using namespace std;

int largestRectangleArea(vector<int>& heights) {
    stack<int> st; // indices, heights increasing
    int best = 0;
    for (int i = 0; i <= (int)heights.size(); i++) {
        int h = (i == (int)heights.size()) ? 0 : heights[i];
        while (!st.empty() && heights[st.top()] > h) {
            int top = st.top(); st.pop();
            int left = st.empty() ? -1 : st.top();
            int width = i - left - 1;
            best = max(best, heights[top] * width);
        }
        st.push(i);
    }
    return best;
}`,
    lineMapping: { 1: 6, 3: 10, 6: 14, 8: 16, 10: 18 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;
        for (int i = 0; i <= heights.length; i++) {
            int h = (i == heights.length) ? 0 : heights[i];
            while (!stack.isEmpty() && heights[stack.peek()] > h) {
                int top = stack.pop();
                int left = stack.isEmpty() ? -1 : stack.peek();
                int width = i - left - 1;
                best = Math.max(best, heights[top] * width);
            }
            stack.push(i);
        }
        return best;
    }
}`,
    lineMapping: { 1: 6, 3: 10, 6: 14, 8: 16, 10: 18 },
  },
};

export const STACK_VIA_QUEUES_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class MyStack {
  constructor() {
    this.main = [];
    this.aux = [];
  }
  push(x) {
    this.aux.push(x);
    while (this.main.length > 0) {
      this.aux.push(this.main.shift());
    }
    [this.main, this.aux] = [this.aux, this.main];
  }
  pop() {
    if (this.main.length === 0) return null;
    return this.main.shift();
  }
  top() {
    return this.main[0];
  }
}`,
    lineMapping: { 1: 14, 2: 7, 4: 9, 6: 11, 8: 15, 9: 15 },
  },
  python: {
    code: `from collections import deque

class MyStack:
    def __init__(self):
        self.main = deque()
        self.aux = deque()

    def push(self, x):
        self.aux.append(x)
        while self.main:
            self.aux.append(self.main.popleft())
        self.main, self.aux = self.aux, self.main

    def pop(self):
        if not self.main:
            return None
        return self.main.popleft()

    def top(self):
        return self.main[0]`,
    lineMapping: { 1: 15, 2: 9, 4: 11, 6: 12, 8: 17, 9: 17 },
  },
  cpp: {
    code: `#include <queue>
using namespace std;

class MyStack {
    queue<int> mainQ, auxQ;
public:
    void push(int x) {
        auxQ.push(x);
        while (!mainQ.empty()) {
            auxQ.push(mainQ.front());
            mainQ.pop();
        }
        swap(mainQ, auxQ);
    }
    int pop() {
        if (mainQ.empty()) return -1;
        int val = mainQ.front();
        mainQ.pop();
        return val;
    }
};`,
    lineMapping: { 1: 16, 2: 8, 4: 10, 6: 13, 8: 17, 9: 19 },
  },
  java: {
    code: `import java.util.LinkedList;
import java.util.Queue;

class MyStack {
    private Queue<Integer> main = new LinkedList<>();
    private Queue<Integer> aux = new LinkedList<>();

    public void push(int x) {
        aux.add(x);
        while (!main.isEmpty()) {
            aux.add(main.poll());
        }
        Queue<Integer> tmp = main;
        main = aux;
        aux = tmp;
    }

    public int pop() {
        if (main.isEmpty()) return -1;
        return main.poll();
    }
}`,
    lineMapping: { 1: 19, 2: 9, 4: 11, 6: 14, 8: 20, 9: 20 },
  },
};

export const CIRCULAR_QUEUE_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class MyCircularQueue {
  constructor(k) {
    this.data = new Array(k).fill(null);
    this.front = -1;
    this.rear = -1;
    this.capacity = k;
  }
  enQueue(value) {
    if (this.isFull()) return false;
    if (this.isEmpty()) this.front = 0;
    this.rear = (this.rear + 1) % this.capacity;
    this.data[this.rear] = value;
    return true;
  }
  deQueue() {
    if (this.isEmpty()) return false;
    this.data[this.front] = null;
    if (this.front === this.rear) this.front = this.rear = -1;
    else this.front = (this.front + 1) % this.capacity;
    return true;
  }
  isFull() { return (this.rear + 1) % this.capacity === this.front; }
  isEmpty() { return this.front === -1; }
}`,
    lineMapping: { 1: 10, 2: 12, 3: 13 },
  },
  python: {
    code: `class MyCircularQueue:
    def __init__(self, k: int):
        self.data = [None] * k
        self.front = -1
        self.rear = -1
        self.capacity = k

    def en_queue(self, value) -> bool:
        if self.is_full():
            return False
        if self.is_empty():
            self.front = 0
        self.rear = (self.rear + 1) % self.capacity
        self.data[self.rear] = value
        return True

    def is_full(self) -> bool:
        return (self.rear + 1) % self.capacity == self.front

    def is_empty(self) -> bool:
        return self.front == -1`,
    lineMapping: { 1: 9, 2: 12, 3: 13 },
  },
  cpp: {
    code: `#include <vector>
using namespace std;

class MyCircularQueue {
    vector<int> data;
    int front = -1, rear = -1, capacity;
public:
    MyCircularQueue(int k) : data(k), capacity(k) {}
    bool enQueue(int value) {
        if (isFull()) return false;
        if (isEmpty()) front = 0;
        rear = (rear + 1) % capacity;
        data[rear] = value;
        return true;
    }
    bool isFull() { return (rear + 1) % capacity == front; }
    bool isEmpty() { return front == -1; }
};`,
    lineMapping: { 1: 9, 2: 11, 3: 12 },
  },
  java: {
    code: `public class MyCircularQueue {
    private Integer[] data;
    private int front = -1, rear = -1;
    private final int capacity;

    public MyCircularQueue(int k) {
        data = new Integer[k];
        capacity = k;
    }

    public boolean enQueue(int value) {
        if (isFull()) return false;
        if (isEmpty()) front = 0;
        rear = (rear + 1) % capacity;
        data[rear] = value;
        return true;
    }

    public boolean isFull() { return (rear + 1) % capacity == front; }
    public boolean isEmpty() { return front == -1; }
}`,
    lineMapping: { 1: 13, 2: 15, 3: 16 },
  },
};

export const CIRCULAR_DEQUE_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class MyCircularDeque {
  constructor(k) {
    this.data = new Array(k).fill(null);
    this.front = -1;
    this.rear = -1;
    this.capacity = k;
  }
  insertFront(value) {
    if (this.isFull()) return false;
    if (this.isEmpty()) this.front = this.rear = 0;
    else this.front = (this.front - 1 + this.capacity) % this.capacity;
    this.data[this.front] = value;
    return true;
  }
  insertLast(value) {
    if (this.isFull()) return false;
    if (this.isEmpty()) this.front = this.rear = 0;
    else this.rear = (this.rear + 1) % this.capacity;
    this.data[this.rear] = value;
    return true;
  }
  deleteFront() {
    if (this.isEmpty()) return false;
    this.data[this.front] = null;
    if (this.front === this.rear) this.front = this.rear = -1;
    else this.front = (this.front + 1) % this.capacity;
    return true;
  }
  deleteLast() {
    if (this.isEmpty()) return false;
    this.data[this.rear] = null;
    if (this.front === this.rear) this.front = this.rear = -1;
    else this.rear = (this.rear - 1 + this.capacity) % this.capacity;
    return true;
  }
  isEmpty() { return this.front === -1; }
  isFull() { return !this.isEmpty() && (this.rear + 1) % this.capacity === this.front; }
}`,
    lineMapping: {},
  },
  python: {
    code: `class MyCircularDeque:
    def __init__(self, k: int):
        self.data = [None] * k
        self.front = -1
        self.rear = -1
        self.capacity = k

    def insert_front(self, value) -> bool:
        if self.is_full():
            return False
        if self.is_empty():
            self.front = self.rear = 0
        else:
            self.front = (self.front - 1 + self.capacity) % self.capacity
        self.data[self.front] = value
        return True

    def insert_last(self, value) -> bool:
        if self.is_full():
            return False
        if self.is_empty():
            self.front = self.rear = 0
        else:
            self.rear = (self.rear + 1) % self.capacity
        self.data[self.rear] = value
        return True

    def is_empty(self) -> bool:
        return self.front == -1

    def is_full(self) -> bool:
        return not self.is_empty() and (self.rear + 1) % self.capacity == self.front`,
    lineMapping: {},
  },
  cpp: {
    code: `#include <vector>
using namespace std;

class MyCircularDeque {
    vector<int> data;
    int front = -1, rear = -1, capacity;
public:
    MyCircularDeque(int k) : data(k), capacity(k) {}
    bool insertFront(int value) {
        if (isFull()) return false;
        if (isEmpty()) front = rear = 0;
        else front = (front - 1 + capacity) % capacity;
        data[front] = value;
        return true;
    }
    bool insertLast(int value) {
        if (isFull()) return false;
        if (isEmpty()) front = rear = 0;
        else rear = (rear + 1) % capacity;
        data[rear] = value;
        return true;
    }
    bool isEmpty() { return front == -1; }
    bool isFull() { return !isEmpty() && (rear + 1) % capacity == front; }
};`,
    lineMapping: {},
  },
  java: {
    code: `public class MyCircularDeque {
    private Integer[] data;
    private int front = -1, rear = -1;
    private final int capacity;

    public MyCircularDeque(int k) {
        data = new Integer[k];
        capacity = k;
    }

    public boolean insertFront(int value) {
        if (isFull()) return false;
        if (isEmpty()) front = rear = 0;
        else front = (front - 1 + capacity) % capacity;
        data[front] = value;
        return true;
    }

    public boolean insertLast(int value) {
        if (isFull()) return false;
        if (isEmpty()) front = rear = 0;
        else rear = (rear + 1) % capacity;
        data[rear] = value;
        return true;
    }

    public boolean isEmpty() { return front == -1; }
    public boolean isFull() { return !isEmpty() && (rear + 1) % capacity == front; }
}`,
    lineMapping: {},
  },
};

export const SLIDING_WINDOW_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function maxSlidingWindow(nums, k) {
  const dq = []; // indices, values decreasing
  const result = [];
  for (let i = 0; i < nums.length; i++) {
    if (dq.length > 0 && dq[0] <= i - k) dq.shift();
    while (dq.length > 0 && nums[dq[dq.length - 1]] < nums[i]) dq.pop();
    dq.push(i);
    if (i >= k - 1) result.push(nums[dq[0]]);
  }
  return result;
}`,
    lineMapping: { 1: 2, 6: 8 },
  },
  python: {
    code: `from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq = deque()  # indices, values decreasing
    result = []
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k:
            dq.popleft()
        while dq and nums[dq[-1]] < x:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result`,
    lineMapping: { 1: 4, 6: 13 },
  },
  cpp: {
    code: `#include <vector>
#include <deque>
using namespace std;

vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    deque<int> dq; // indices, values decreasing
    vector<int> result;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k) dq.pop_front();
        while (!dq.empty() && nums[dq.back()] < nums[i]) dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1) result.push_back(nums[dq.front()]);
    }
    return result;
}`,
    lineMapping: { 1: 6, 6: 12 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        Deque<Integer> dq = new ArrayDeque<>();
        int[] result = new int[nums.length - k + 1];
        for (int i = 0; i < nums.length; i++) {
            if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();
            while (!dq.isEmpty() && nums[dq.peekLast()] < nums[i]) dq.pollLast();
            dq.addLast(i);
            if (i >= k - 1) result[i - k + 1] = nums[dq.peekFirst()];
        }
        return result;
    }
}`,
    lineMapping: { 1: 6, 6: 12 },
  },
};

export const FIRST_NON_REPEATING_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function firstNonRepeating(stream) {
  const dq = [];
  const count = new Map();
  const timeline = [];
  for (const ch of stream) {
    count.set(ch, (count.get(ch) ?? 0) + 1);
    if (count.get(ch) === 1) dq.push(ch);
    while (dq.length > 0 && count.get(dq[0]) > 1) dq.shift();
    timeline.push(dq.length > 0 ? dq[0] : '-');
  }
  return timeline;
}`,
    lineMapping: { 1: 2, 3: 7, 5: 8, 7: 9, 9: 11 },
  },
  python: {
    code: `from collections import deque

def first_non_repeating(stream: str) -> list[str]:
    dq = deque()
    count = {}
    timeline = []
    for ch in stream:
        count[ch] = count.get(ch, 0) + 1
        if count[ch] == 1:
            dq.append(ch)
        while dq and count[dq[0]] > 1:
            dq.popleft()
        timeline.append(dq[0] if dq else "-")
    return timeline`,
    lineMapping: { 1: 4, 3: 10, 5: 12, 7: 13, 9: 14 },
  },
  cpp: {
    code: `#include <deque>
#include <unordered_map>
#include <vector>
#include <string>
using namespace std;

vector<char> firstNonRepeating(const string& stream) {
    deque<char> dq;
    unordered_map<char, int> count;
    vector<char> timeline;
    for (char ch : stream) {
        count[ch]++;
        if (count[ch] == 1) dq.push_back(ch);
        while (!dq.empty() && count[dq.front()] > 1) dq.pop_front();
        timeline.push_back(dq.empty() ? '-' : dq.front());
    }
    return timeline;
}`,
    lineMapping: { 1: 8, 3: 13, 5: 14, 7: 15, 9: 17 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

public class Solution {
    public char[] firstNonRepeating(String stream) {
        Deque<Character> dq = new ArrayDeque<>();
        Map<Character, Integer> count = new HashMap<>();
        StringBuilder timeline = new StringBuilder();
        for (char ch : stream.toCharArray()) {
            count.merge(ch, 1, Integer::sum);
            if (count.get(ch) == 1) dq.addLast(ch);
            while (!dq.isEmpty() && count.get(dq.peekFirst()) > 1) dq.pollFirst();
            timeline.append(dq.isEmpty() ? '-' : dq.peekFirst());
        }
        return timeline.toString().toCharArray();
    }
}`,
    lineMapping: { 1: 8, 3: 13, 5: 14, 7: 15, 9: 17 },
  },
};

export const MOVING_AVERAGE_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `class MovingAverage {
  constructor(size) {
    this.dq = [];
    this.size = size;
    this.total = 0;
  }
  next(val) {
    this.dq.push(val);
    this.total += val;
    if (this.dq.length > this.size) {
      this.total -= this.dq.shift();
    }
    return this.total / this.dq.length;
  }
}`,
    lineMapping: { 1: 3, 3: 8, 5: 11, 7: 13, 9: 13 },
  },
  python: {
    code: `from collections import deque

class MovingAverage:
    def __init__(self, size: int):
        self.dq = deque()
        self.size = size
        self.total = 0

    def next(self, val: int) -> float:
        self.dq.append(val)
        self.total += val
        if len(self.dq) > self.size:
            self.total -= self.dq.popleft()
        return self.total / len(self.dq)`,
    lineMapping: { 1: 5, 3: 10, 5: 13, 7: 14, 9: 14 },
  },
  cpp: {
    code: `#include <deque>

class MovingAverage {
    deque<int> dq;
    int size;
    double total = 0;
public:
    MovingAverage(int size) : size(size) {}
    double next(int val) {
        dq.push_back(val);
        total += val;
        if ((int)dq.size() > size) {
            total -= dq.front();
            dq.pop_front();
        }
        return total / dq.size();
    }
};`,
    lineMapping: { 1: 4, 3: 10, 5: 13, 7: 16, 9: 16 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

class MovingAverage {
    private Deque<Integer> dq = new ArrayDeque<>();
    private final int size;
    private double total = 0;

    public MovingAverage(int size) {
        this.size = size;
    }

    public double next(int val) {
        dq.addLast(val);
        total += val;
        if (dq.size() > size) {
            total -= dq.pollFirst();
        }
        return total / dq.size();
    }
}`,
    lineMapping: { 1: 5, 3: 14, 5: 17, 7: 19, 9: 19 },
  },
};

export const TASK_SCHEDULER_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function leastInterval(tasks, n) {
  const freq = new Map();
  for (const t of tasks) freq.set(t, (freq.get(t) ?? 0) + 1);
  const schedule = [];
  while (freq.size > 0) {
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n + 1);
    for (let i = 0; i < n + 1; i++) {
      if (i < top.length) {
        schedule.push(top[i][0]);
        top[i][1]--;
        if (top[i][1] === 0) freq.delete(top[i][0]);
      } else {
        schedule.push('·');
      }
    }
  }
  return schedule.length;
}`,
    lineMapping: { 1: 2, 4: 10, 6: 13, 8: 17 },
  },
  python: {
    code: `from collections import Counter

def least_interval(tasks: list[str], n: int) -> int:
    freq = Counter(tasks)
    schedule = []
    while freq:
        top = freq.most_common(n + 1)
        for i in range(n + 1):
            if i < len(top):
                task, _ = top[i]
                schedule.append(task)
                freq[task] -= 1
                if freq[task] == 0:
                    del freq[task]
            else:
                schedule.append("·")
    return len(schedule)`,
    lineMapping: { 1: 4, 4: 12, 6: 16, 8: 17 },
  },
  cpp: {
    code: `#include <vector>
#include <map>
#include <algorithm>
using namespace std;

int leastInterval(vector<char>& tasks, int n) {
    map<char, int> freq;
    for (char t : tasks) freq[t]++;
    vector<char> schedule;
    while (!freq.empty()) {
        vector<pair<char, int>> top(freq.begin(), freq.end());
        sort(top.begin(), top.end(), [](auto& a, auto& b) { return a.second > b.second; });
        if ((int)top.size() > n + 1) top.resize(n + 1);
        for (int i = 0; i <= n; i++) {
            if (i < (int)top.size()) {
                schedule.push_back(top[i].first);
                if (--freq[top[i].first] == 0) freq.erase(top[i].first);
            } else {
                schedule.push_back('.');
            }
        }
    }
    return schedule.size();
}`,
    lineMapping: { 1: 7, 4: 17, 6: 19, 8: 23 },
  },
  java: {
    code: `import java.util.*;

public class Solution {
    public int leastInterval(char[] tasks, int n) {
        Map<Character, Integer> freq = new HashMap<>();
        for (char t : tasks) freq.merge(t, 1, Integer::sum);
        List<Character> schedule = new ArrayList<>();
        while (!freq.isEmpty()) {
            List<Map.Entry<Character, Integer>> top = new ArrayList<>(freq.entrySet());
            top.sort((a, b) -> b.getValue() - a.getValue());
            if (top.size() > n + 1) top = top.subList(0, n + 1);
            for (int i = 0; i <= n; i++) {
                if (i < top.size()) {
                    char task = top.get(i).getKey();
                    schedule.add(task);
                    freq.merge(task, -1, Integer::sum);
                    if (freq.get(task) == 0) freq.remove(task);
                } else {
                    schedule.add('·');
                }
            }
        }
        return schedule.size();
    }
}`,
    lineMapping: { 1: 5, 4: 16, 6: 19, 8: 23 },
  },
};

export const ROTTING_ORANGES_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function orangesRotting(grid) {
  const rows = grid.length, cols = grid[0].length;
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      else if (grid[r][c] === 1) fresh++;
    }
  }
  let minutes = 0;
  while (queue.length > 0 && fresh > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2;
          fresh--;
          queue.push([nr, nc]);
        }
      }
    }
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}`,
    lineMapping: { 1: 3, 5: 13, 10: 27 },
  },
  python: {
    code: `from collections import deque

def oranges_rotting(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while queue and fresh > 0:
        size = len(queue)
        for _ in range(size):
            r, c = queue.popleft()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    queue.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1`,
    lineMapping: { 1: 5, 5: 15, 10: 25 },
  },
  cpp: {
    code: `#include <vector>
#include <queue>
using namespace std;

int orangesRotting(vector<vector<int>>& grid) {
    int rows = grid.size(), cols = grid[0].size();
    queue<pair<int, int>> q;
    int fresh = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) q.push({r, c});
            else if (grid[r][c] == 1) fresh++;
        }
    }
    int minutes = 0;
    while (!q.empty() && fresh > 0) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            auto [r, c] = q.front(); q.pop();
            int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
            for (int d = 0; d < 4; d++) {
                int nr = r + dr[d], nc = c + dc[d];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                    grid[nr][nc] = 2;
                    fresh--;
                    q.push({nr, nc});
                }
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}`,
    lineMapping: { 1: 7, 5: 17, 10: 32 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public int orangesRotting(int[][] grid) {
        int rows = grid.length, cols = grid[0].length;
        Deque<int[]> queue = new ArrayDeque<>();
        int fresh = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 2) queue.add(new int[]{r, c});
                else if (grid[r][c] == 1) fresh++;
            }
        }
        int minutes = 0;
        while (!queue.isEmpty() && fresh > 0) {
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                int[] cell = queue.poll();
                int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
                for (int[] d : dirs) {
                    int nr = cell[0] + d[0], nc = cell[1] + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1) {
                        grid[nr][nc] = 2;
                        fresh--;
                        queue.add(new int[]{nr, nc});
                    }
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
}`,
    lineMapping: { 1: 7, 5: 17, 10: 32 },
  },
};

export const DOTA2_SENATE_SNIPPETS: Record<LanguageKey, CodeSnippet> = {
  javascript: {
    code: `function predictPartyVictory(senate) {
  const radiant = [];
  const dire = [];
  for (let i = 0; i < senate.length; i++) {
    if (senate[i] === 'R') radiant.push(i);
    else dire.push(i);
  }
  const n = senate.length;
  while (radiant.length > 0 && dire.length > 0) {
    const r = radiant.shift();
    const d = dire.shift();
    if (r < d) radiant.push(r + n);
    else dire.push(d + n);
  }
  return radiant.length > 0 ? 'Radiant' : 'Dire';
}`,
    lineMapping: { 1: 2, 4: 12, 6: 13, 8: 15 },
  },
  python: {
    code: `from collections import deque

def predict_party_victory(senate: str) -> str:
    radiant = deque()
    dire = deque()
    for i, ch in enumerate(senate):
        if ch == "R":
            radiant.append(i)
        else:
            dire.append(i)
    n = len(senate)
    while radiant and dire:
        r = radiant.popleft()
        d = dire.popleft()
        if r < d:
            radiant.append(r + n)
        else:
            dire.append(d + n)
    return "Radiant" if radiant else "Dire"`,
    lineMapping: { 1: 4, 4: 16, 6: 18, 8: 19 },
  },
  cpp: {
    code: `#include <queue>
#include <string>
using namespace std;

string predictPartyVictory(string senate) {
    queue<int> radiant, dire;
    for (int i = 0; i < (int)senate.size(); i++) {
        if (senate[i] == 'R') radiant.push(i);
        else dire.push(i);
    }
    int n = senate.size();
    while (!radiant.empty() && !dire.empty()) {
        int r = radiant.front(); radiant.pop();
        int d = dire.front(); dire.pop();
        if (r < d) radiant.push(r + n);
        else dire.push(d + n);
    }
    return radiant.empty() ? "Dire" : "Radiant";
}`,
    lineMapping: { 1: 6, 4: 15, 6: 16, 8: 18 },
  },
  java: {
    code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public String predictPartyVictory(String senate) {
        Deque<Integer> radiant = new ArrayDeque<>();
        Deque<Integer> dire = new ArrayDeque<>();
        for (int i = 0; i < senate.length(); i++) {
            if (senate.charAt(i) == 'R') radiant.addLast(i);
            else dire.addLast(i);
        }
        int n = senate.length();
        while (!radiant.isEmpty() && !dire.isEmpty()) {
            int r = radiant.pollFirst();
            int d = dire.pollFirst();
            if (r < d) radiant.addLast(r + n);
            else dire.addLast(d + n);
        }
        return radiant.isEmpty() ? "Dire" : "Radiant";
    }
}`,
    lineMapping: { 1: 6, 4: 16, 6: 17, 8: 19 },
  },
};

/**
 * Category → snippet-set resolver so every stack/queue problem shows its own
 * reference implementation instead of falling back to the generic Stack class.
 */export function getStackQueueSnippets(
  category: string
): Record<LanguageKey, CodeSnippet> {
  switch (category) {
    case 'queue':
      return QUEUE_SNIPPETS;
    case 'validParentheses':
      return PARENTHESES_SNIPPETS;
    case 'postfixEval':
      return POSTFIX_SNIPPETS;
    case 'queueViaStacks':
      return QVS_SNIPPETS;
    case 'dailyTemperatures':
      return DAILY_TEMP_SNIPPETS;
    case 'minStack':
      return MIN_STACK_SNIPPETS;
    case 'simplifyPath':
      return SIMPLIFY_PATH_SNIPPETS;
    case 'removeAdjacentDuplicates':
      return REMOVE_ADJACENT_SNIPPETS;
    case 'basicCalculator':
      return BASIC_CALCULATOR_SNIPPETS;
    case 'decodeString':
      return DECODE_STRING_SNIPPETS;
    case 'trappingRainWater':
      return TRAPPING_RAIN_WATER_SNIPPETS;
    case 'largestRectangle':
      return LARGEST_RECTANGLE_SNIPPETS;
    case 'stackViaQueues':
      return STACK_VIA_QUEUES_SNIPPETS;
    case 'circularQueue':
      return CIRCULAR_QUEUE_SNIPPETS;
    case 'circularDeque':
      return CIRCULAR_DEQUE_SNIPPETS;
    case 'slidingWindow':
      return SLIDING_WINDOW_SNIPPETS;
    case 'firstNonRepeating':
      return FIRST_NON_REPEATING_SNIPPETS;
    case 'movingAverage':
      return MOVING_AVERAGE_SNIPPETS;
    case 'taskScheduler':
      return TASK_SCHEDULER_SNIPPETS;
    case 'rottingOranges':
      return ROTTING_ORANGES_SNIPPETS;
    case 'dota2Senate':
      return DOTA2_SENATE_SNIPPETS;
    default:
      return STACK_SNIPPETS;
  }
}

/* ── Go reference implementations ──────────────────────────────────
   Go references exist for the flagship studio set. Topics without an
   entry must report the gap in the UI — never fall back silently. */
export const STACKQUEUE_GO_SNIPPETS: Record<string, CodeSnippet> = {
  stack: {
    code: `type Stack struct {
    items []int
}

func (s *Stack) Push(val int) {
    s.items = append(s.items, val)
}

func (s *Stack) Pop() (int, bool) {
    if len(s.items) == 0 {
        return 0, false // Underflow
    }
    top := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return top, true
}

func (s *Stack) Peek() int { return s.items[len(s.items)-1] }`,
    lineMapping: { 1: 6, 2: 9, 3: 17 },
  },
  queue: {
    code: `type Queue struct {
    items []int
}

func (q *Queue) Enqueue(val int) {
    q.items = append(q.items, val) // joins at REAR
}

func (q *Queue) Dequeue() (int, bool) {
    if len(q.items) == 0 {
        return 0, false // Underflow
    }
    front := q.items[0]
    q.items = q.items[1:] // leaves from FRONT
    return front, true
}

func (q *Queue) Front() int { return q.items[0] }`,
    lineMapping: { 1: 6, 2: 9, 3: 17 },
  },
  validParentheses: {
    code: `func isValid(s string) bool {
    stack := []byte{}
    pairs := map[byte]byte{')': '(', ']': '[', '}': '{'}
    for i := 0; i < len(s); i++ {
        ch := s[i]
        if ch == '(' || ch == '[' || ch == '{' {
            stack = append(stack, ch) // opening: push
        } else {
            top := byte(0)
            if len(stack) > 0 {
                top = stack[len(stack)-1]
            }
            if top != pairs[ch] {
                return false // mismatch or premature close
            }
            stack = stack[:len(stack)-1] // matched: pop
        }
    }
    return len(stack) == 0 // leftover openings are invalid
}`,
    lineMapping: { 1: 7, 3: 14, 5: 14, 6: 16, 8: 19, 9: 19 },
  },
  postfixEval: {
    code: `func evalRPN(tokens []string) int {
    stack := []int{}
    for _, tok := range tokens {
        if n, err := strconv.Atoi(tok); err == nil {
            stack = append(stack, n) // operand: push
        } else {
            b, a := stack[len(stack)-1], stack[len(stack)-2]
            stack = stack[:len(stack)-2] // pop two operands
            switch tok {
            case "+":
                stack = append(stack, a+b) // result pushed back
            case "-":
                stack = append(stack, a-b)
            case "*":
                stack = append(stack, a*b)
            case "/":
                stack = append(stack, a/b)
            }
        }
    }
    return stack[0]
}`,
    lineMapping: { 1: 5, 3: 7, 5: 8, 8: 11 },
  },
  minStack: {
    code: `type MinStack struct {
    data, mins []int
}

func (s *MinStack) Push(val int) {
    s.data = append(s.data, val)
    if len(s.mins) == 0 || val <= s.mins[len(s.mins)-1] {
        s.mins = append(s.mins, val) // new min tracked in parallel
    }
}

func (s *MinStack) Pop() {
    top := s.data[len(s.data)-1]
    s.data = s.data[:len(s.data)-1]
    if top == s.mins[len(s.mins)-1] {
        s.mins = s.mins[:len(s.mins)-1] // min track pops too
    }
}

func (s *MinStack) GetMin() int {
    return s.mins[len(s.mins)-1] // O(1): no scan needed
}`,
    lineMapping: { 1: 6, 3: 7, 6: 8, 8: 13, 10: 21 },
  },
  decodeString: {
    code: `func decodeString(s string) string {
    numStk, strStk := []int{}, []string{}
    cur, k := "", 0
    for _, ch := range s {
        switch {
        case unicode.IsDigit(ch):
            k = k*10 + int(ch-'0')
        case ch == '[':
            numStk = append(numStk, k)   // save repeat count
            strStk = append(strStk, cur) // save outer context
            cur, k = "", 0
        case ch == ']':
            prev := strStk[len(strStk)-1]
            times := numStk[len(numStk)-1]
            strStk = strStk[:len(strStk)-1]
            numStk = numStk[:len(numStk)-1]
            cur = prev + strings.Repeat(cur, times) // expand frame
        default:
            cur += string(ch)
        }
    }
    return cur
}`,
    lineMapping: { 1: 9, 3: 10, 4: 11, 5: 12, 7: 13, 9: 17 },
  },
  trappingRainWater: {
    code: `func trap(height []int) int {
    total := 0
    stack := []int{} // indices, decreasing heights
    for i, h := range height {
        for len(stack) > 0 && h > height[stack[len(stack)-1]] {
            bottom := stack[len(stack)-1]
            stack = stack[:len(stack)-1] // taller bar pops boundary
            if len(stack) == 0 {
                break
            }
            left := stack[len(stack)-1]
            width := i - left - 1
            bounded := min(height[left], h) - height[bottom]
            total += width * bounded // water over the bottom
        }
        stack = append(stack, i)
    }
    return total
}`,
    lineMapping: { 1: 3, 3: 5, 5: 6, 6: 7, 8: 11, 10: 14 },
  },
  circularQueue: {
    code: `type MyCircularQueue struct {
    buf         []int
    front, rear int
    size, cap   int
}

func (q *MyCircularQueue) EnQueue(v int) bool {
    if q.size == q.cap {
        return false // overflow: full
    }
    if q.size == 0 {
        q.front, q.rear = 0, 0
    } else {
        q.rear = (q.rear + 1) % q.cap // wraps last -> 0
    }
    q.buf[q.rear] = v
    q.size++
    return true
}

func (q *MyCircularQueue) DeQueue() bool {
    if q.size == 0 {
        return false // underflow: empty
    }
    if q.size == 1 {
        q.front, q.rear = 0, 0
        q.size = 0
        return true
    }
    q.front = (q.front + 1) % q.cap // wraps last -> 0
    q.size--
    return true
}`,
    lineMapping: { 1: 8, 2: 14, 3: 16 },
  },
  circularDeque: {
    code: `type MyCircularDeque struct {
    buf         []int
    front, rear int
    size, cap   int
}

func (d *MyCircularDeque) InsertFront(v int) bool {
    if d.size == d.cap {
        return false
    }
    d.front = (d.front - 1 + d.cap) % d.cap // wraps backwards
    d.buf[d.front] = v
    d.size++
    return true
}

func (d *MyCircularDeque) InsertLast(v int) bool {
    if d.size == d.cap {
        return false
    }
    d.rear = (d.rear + 1) % d.cap // wraps forwards
    d.buf[d.rear] = v
    d.size++
    return true
}

func (d *MyCircularDeque) DeleteFront() bool {
    if d.size == 0 {
        return false
    }
    d.front = (d.front + 1) % d.cap
    d.size--
    return true
}

func (d *MyCircularDeque) DeleteLast() bool {
    if d.size == 0 {
        return false
    }
    d.rear = (d.rear - 1 + d.cap) % d.cap
    d.size--
    return true
}`,
    lineMapping: {},
  },
  firstNonRepeating: {
    code: `func firstUniqChar(s string) int {
    freq := [26]int{}
    for i := 0; i < len(s); i++ {
        freq[s[i]-'a']++ // pass 1: count frequencies
    }
    for i := 0; i < len(s); i++ {
        if freq[s[i]-'a'] == 1 {
            return i // pass 2: first freq==1 wins
        }
    }
    return -1 // every character repeated
}`,
    lineMapping: { 1: 4, 3: 4, 5: 6, 7: 7, 9: 11 },
  },
  dota2Senate: {
    code: `func predictPartyVictory(senate string) string {
    radiant, dire := []int{}, []int{}
    n := len(senate)
    for i, c := range senate {
        if c == 'R' {
            radiant = append(radiant, i)
        } else {
            dire = append(dire, i)
        }
    }
    for len(radiant) > 0 && len(dire) > 0 {
        r, d := radiant[0], dire[0]
        radiant, dire = radiant[1:], dire[1:]
        if r < d {
            radiant = append(radiant, r+n) // earlier senator bans, re-enqueues
        } else {
            dire = append(dire, d+n)
        }
    }
    if len(radiant) > 0 {
        return "Radiant"
    }
    return "Dire"
}`,
    lineMapping: { 1: 2, 4: 5, 6: 12, 8: 15 },
  },
};
