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
