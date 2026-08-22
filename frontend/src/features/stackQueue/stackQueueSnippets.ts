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
