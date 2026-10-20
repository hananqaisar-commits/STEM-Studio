/**
 * Generates frontend/src/data/customCode/stubs.json — the single source of
 * truth for Custom Code signature stubs (LeetCode-style fill-in-the-body model).
 *
 * Each executable algorithm gets one canonical entry-point name (identical
 * across languages) plus per-language signature stub text. Stubs are grouped
 * by harness category (input shape), which drives the Phase 2 harness
 * generators on the backend.
 *
 * Run: node scripts/generateCustomCodeStubs.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'frontend', 'src', 'data', 'customCode', 'stubs.json');

export const LANGUAGES = ['python', 'cpp', 'c', 'java', 'go', 'csharp'];
const LANGUAGE_LABELS = {
  python: 'Python',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  go: 'Go',
  csharp: 'C#',
};

const HARNESS_CATEGORY_DOCS = {
  array_in: 'Array input (optionally + scalar params); result printed by harness.',
  string_in: 'String input (optionally + second string/scalar); result printed by harness.',
  number_in: 'Scalar numeric input(s); result printed by harness.',
  grid_in: '2-D grid input; result printed by harness.',
  linked_list_in: 'Harness builds a linked list from UI values; user function receives head.',
  graph_in: 'Harness passes (n, edges[, start]); edges are [u,v] or [u,v,w] rows, nodes 0..n-1.',
  stateful_class: 'Harness replays the full UI operation history against a fresh instance each run.',
};

// ── Semantic type tables ────────────────────────────────────────────────────
// Param types per language. C expands array params into (pointer, size) pairs.
const PARAM_TYPE = {
  int:      { cpp: 'int', c: 'int', java: 'int', go: 'int', csharp: 'int' },
  double:   { cpp: 'double', c: 'double', java: 'double', go: 'float64', csharp: 'double' },
  bool:     { cpp: 'bool', c: 'int', java: 'boolean', go: 'bool', csharp: 'bool' },
  string:   { cpp: 'const string&', c: 'const char*', java: 'String', go: 'string', csharp: 'string' },
  intArray: { cpp: 'vector<int>', c: 'int*', java: 'int[]', go: '[]int', csharp: 'int[]' },
  intMatrix:{ cpp: 'vector<vector<int>>', c: 'int**', java: 'int[][]', go: '[][]int', csharp: 'int[][]' },
  node:     { cpp: 'ListNode*', c: 'struct ListNode*', java: 'ListNode', go: '*ListNode', csharp: 'ListNode' },
};
const C_SIZED_TYPES = new Set(['intArray', 'intMatrix']);

// Return types per language. C renders collection returns as void + emit helpers.
const RETURN_TYPE = {
  void:        { cpp: 'void', c: 'void', java: 'void', go: '', csharp: 'void' },
  int:         { cpp: 'int', c: 'int', java: 'int', go: 'int', csharp: 'int' },
  double:      { cpp: 'double', c: 'double', java: 'double', go: 'float64', csharp: 'double' },
  bool:        { cpp: 'bool', c: 'int', java: 'boolean', go: 'bool', csharp: 'bool' },
  string:      { cpp: 'string', c: 'char*', java: 'String', go: 'string', csharp: 'string' },
  intArray:    { cpp: 'vector<int>', c: 'void', java: 'int[]', go: '[]int', csharp: 'int[]' },
  intMatrix:   { cpp: 'vector<vector<int>>', c: 'void', java: 'int[][]', go: '[][]int', csharp: 'int[][]' },
  stringArray: { cpp: 'vector<string>', c: 'void', java: 'List<String>', go: '[]string', csharp: 'List<string>' },
  map:         { cpp: 'unordered_map<int,int>', c: 'void', java: 'Map<Integer,Integer>', go: 'map[int]int', csharp: 'Dictionary<int,int>' },
  node:        { cpp: 'ListNode*', c: 'struct ListNode*', java: 'ListNode', go: '*ListNode', csharp: 'ListNode' },
};
const C_EMIT_TYPES = new Set(['intArray', 'intMatrix', 'map']);

function lineComment(lang, text) {
  const marker = lang === 'python' ? '#' : '//';
  return lang === 'c' ? `/* ${text} */` : `${marker} ${text}`;
}

function headerLines(lang, name, note) {
  const lines = [
    lineComment(lang, `${name}: fill in the body. Input values come from the studio controls.`),
    lineComment(lang, lang === 'python'
      ? 'Optional: visualize_step("op", value) adds animation steps to the visualizer.'
      : 'Optional: visualizeStep("op", value) adds animation steps to the visualizer.'),
  ];
  if (note) lines.push(lineComment(lang, note));
  return lines;
}

// ── Param / return rendering ────────────────────────────────────────────────
function renderParams(lang, params) {
  if (lang === 'python') return params.map((p) => p.name).join(', ');
  const parts = [];
  for (const p of params) {
    const t = PARAM_TYPE[p.type][lang];
    if (lang === 'c' && C_SIZED_TYPES.has(p.type)) {
      parts.push(`${t} ${p.name}`, `int ${p.name}Size`);
    } else if (lang === 'go') {
      parts.push(`${p.name} ${t}`);
    } else {
      parts.push(`${t} ${p.name}`);
    }
  }
  return parts.join(', ');
}

function renderReturn(lang, ret) {
  return RETURN_TYPE[ret][lang];
}

function cEmitNote(ret) {
  if (ret === 'map') return 'Report results by calling emitPair(key, count) for each entry.';
  if (ret === 'intMatrix') return 'Report each result row by calling emitIntList(values, size).';
  if (ret === 'intArray') return 'Report the result by calling emitIntList(values, size).';
  return null;
}

// ── Function stub renderers ─────────────────────────────────────────────────
function renderFunctionStub(lang, algo) {
  const lines = headerLines(lang, algo.name, algo.note);
  const params = renderParams(lang, algo.params);
  const bodyComment = lang === 'c' || lang === 'python' ? null : '    // Write your code here';

  switch (lang) {
    case 'python':
      lines.push(`def ${algo.entry}(${params}):`, '    # Write your code here', '    pass');
      break;
    case 'cpp':
      lines.push(`${renderReturn(lang, algo.returns)} ${algo.entry}(${params}) {`, bodyComment, '}');
      break;
    case 'c': {
      lines.push(`${renderReturn(lang, algo.returns)} ${algo.entry}(${params}) {`, '    /* Write your code here */', '}');
      const emitNote = cEmitNote(algo.returns);
      if (emitNote) lines.splice(1, 0, lineComment(lang, emitNote));
      if (algo.returns === 'bool') lines.splice(1, 0, lineComment(lang, 'Return 1 for true, 0 for false.'));
      break;
    }
    case 'java':
      lines.push(`public static ${renderReturn(lang, algo.returns)} ${algo.entry}(${params}) {`, bodyComment, '}');
      break;
    case 'go': {
      const ret = renderReturn(lang, algo.returns);
      lines.push(`func ${algo.entry}(${params})${ret ? ` ${ret}` : ''} {`, bodyComment, '}');
      break;
    }
    case 'csharp':
      lines.push(`public static ${renderReturn(lang, algo.returns)} ${algo.entry}(${params}) {`, bodyComment, '}');
      break;
    default:
      throw new Error(`Unknown language: ${lang}`);
  }
  return lines.filter((l) => l !== '').join('\n');
}

// ── Class stub renderers (stateful data structures) ─────────────────────────
function renderClassStub(lang, algo) {
  const lines = headerLines(lang, algo.name, algo.note);
  const bodyComment = lang === 'c' || lang === 'python' ? null : '        // Write your code here';
  const ctorParams = algo.ctorParams || [];

  switch (lang) {
    case 'python': {
      lines.push(`class ${algo.entry}:`);
      lines.push(`    def __init__(${renderParams(lang, ctorParams) ? `self, ${renderParams(lang, ctorParams)}` : 'self'}):`);
      lines.push('        # Initialize your data structure here', '        pass');
      for (const m of algo.methods) {
        lines.push('', `    def ${m.name}(self${m.params.length ? `, ${renderParams(lang, m.params)}` : ''}):`);
        lines.push('        # Write your code here', '        pass');
      }
      break;
    }
    case 'cpp': {
      lines.push(`class ${algo.entry} {`, 'public:');
      lines.push(`    ${algo.entry}(${renderParams(lang, ctorParams)}) {`, '        // Initialize your data structure here', '    }');
      for (const m of algo.methods) {
        lines.push('', `    ${renderReturn(lang, m.returns)} ${m.name}(${renderParams(lang, m.params)}) {`);
        lines.push(bodyComment, '    }');
      }
      lines.push('};');
      break;
    }
    case 'c': {
      lines.push(`struct ${algo.entry} {`, '    /* your fields here */', '};');
      lines.push('', `void init${algo.entry}(struct ${algo.entry}* self${ctorParams.length ? `, ${renderParams(lang, ctorParams)}` : ''}) {`);
      lines.push('    /* Initialize your data structure here */', '}');
      for (const m of algo.methods) {
        const ret = renderReturn(lang, m.returns);
        const baseParams = renderParams(lang, m.params);
        const allParams = [`struct ${algo.entry}* self`, ...(baseParams ? baseParams.split(', ') : [])];
        lines.push('', `${ret} ${m.name}(${allParams.join(', ')}) {`, '    /* Write your code here */', '}');
      }
      break;
    }
    case 'java': {
      lines.push(`class ${algo.entry} {`);
      lines.push(`    public ${algo.entry}(${renderParams(lang, ctorParams)}) {`, '        // Initialize your data structure here', '    }');
      for (const m of algo.methods) {
        lines.push('', `    public ${renderReturn(lang, m.returns)} ${m.name}(${renderParams(lang, m.params)}) {`);
        lines.push(bodyComment, '    }');
      }
      lines.push('}');
      break;
    }
    case 'go': {
      lines.push(`type ${algo.entry} struct {`, '    // your fields here', '}');
      if (ctorParams.length) {
        lines.push('', `func new${algo.entry}(${renderParams(lang, ctorParams)}) *${algo.entry} {`, `    return &${algo.entry}{}`, '}');
      }
      for (const m of algo.methods) {
        const ret = renderReturn(lang, m.returns);
        lines.push('', `func (self *${algo.entry}) ${m.name}(${renderParams(lang, m.params)})${ret ? ` ${ret}` : ''} {`);
        lines.push('    // Write your code here', '}');
      }
      break;
    }
    case 'csharp': {
      lines.push(`class ${algo.entry} {`);
      lines.push(`    public ${algo.entry}(${renderParams(lang, ctorParams)}) {`, '        // Initialize your data structure here', '    }');
      for (const m of algo.methods) {
        lines.push('', `    public ${renderReturn(lang, m.returns)} ${m.name}(${renderParams(lang, m.params)}) {`);
        lines.push(bodyComment, '    }');
      }
      lines.push('}');
      break;
    }
    default:
      throw new Error(`Unknown language: ${lang}`);
  }
  return lines.join('\n');
}

// ── Algorithm descriptors ───────────────────────────────────────────────────
// Function-style: [categoryId, topicId, displayName, harness, entry, params, returns, note?]
const F = (categoryId, topicId, name, harness, entry, params, returns, note) => ({
  kind: 'function', categoryId, topicId, name, harness, entry, params, returns, note: note || null,
});
// Stateful class-style: [categoryId, topicId, displayName, entry, ctorParams, methods, note?]
const CL = (categoryId, topicId, name, entry, ctorParams, methods, note) => ({
  kind: 'class', categoryId, topicId, name, harness: 'stateful_class', entry,
  ctorParams, methods, note: note || null,
});

const P = (name, type) => ({ name, type });
const M = (name, params, returns) => ({ name, params, returns });

const ALGORITHMS = [
  // ── Sorting (array_in) ──────────────────────────────────────────────
  F('sorting', 'bubble', 'Bubble Sort', 'array_in', 'bubbleSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'selection', 'Selection Sort', 'array_in', 'selectionSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'insertion', 'Insertion Sort', 'array_in', 'insertionSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'merge', 'Merge Sort', 'array_in', 'mergeSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'quick', 'Quick Sort', 'array_in', 'quickSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'heap', 'Heap Sort', 'array_in', 'heapSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'shell', 'Shell Sort', 'array_in', 'shellSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'counting', 'Counting Sort', 'array_in', 'countingSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'radix', 'Radix Sort', 'array_in', 'radixSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),
  F('sorting', 'bucket', 'Bucket Sort', 'array_in', 'bucketSort', [P('arr', 'intArray')], 'intArray', 'Return the sorted array.'),

  // ── Arrays (array_in) ───────────────────────────────────────────────
  F('arrays', 'linearSearch', 'Linear Search', 'array_in', 'linearSearch', [P('arr', 'intArray'), P('target', 'int')], 'int', 'Return the index of target, or -1 if absent.'),
  F('arrays', 'kadane', "Kadane's Algorithm", 'array_in', 'kadane', [P('arr', 'intArray')], 'int', 'Return the maximum subarray sum.'),
  F('arrays', 'twoPointer', 'Two Pointers', 'array_in', 'twoPointer', [P('arr', 'intArray'), P('target', 'int')], 'intArray', 'Return the two indices whose values sum to target, or [-1, -1].'),
  F('arrays', 'slidingWindow', 'Sliding Window', 'array_in', 'maxWindowSum', [P('arr', 'intArray'), P('k', 'int')], 'int', 'Return the maximum sum of any window of size k.'),
  F('arrays', 'rotation', 'Array Rotation', 'array_in', 'rotateArray', [P('arr', 'intArray'), P('k', 'int')], 'intArray', 'Return the array rotated left by k positions.'),
  F('arrays', 'prefixSum', 'Prefix Sum', 'array_in', 'prefixSum', [P('arr', 'intArray')], 'intArray', 'Return the prefix-sum array.'),

  // ── Strings (string_in) ─────────────────────────────────────────────
  F('strings', 'palindrome', 'Palindrome Check', 'string_in', 'isPalindrome', [P('s', 'string')], 'bool'),
  F('strings', 'anagram', 'Anagram Check', 'string_in', 'isAnagram', [P('s', 'string'), P('t', 'string')], 'bool'),
  F('strings', 'reverse', 'String Reversal', 'string_in', 'reverseString', [P('s', 'string')], 'string'),
  F('strings', 'frequency', 'Frequency Count', 'string_in', 'charFrequency', [P('s', 'string')], 'map', 'Return character counts keyed by character code.'),

  // ── Linked list ─────────────────────────────────────────────────────
  CL('linkedList', 'singly', 'Singly Linked List', 'SinglyLinkedList', [], [
    M('insertHead', [P('value', 'int')], 'void'),
    M('insertTail', [P('value', 'int')], 'void'),
    M('delete', [P('value', 'int')], 'void'),
    M('reverse', [], 'void'),
  ], 'Node type ListNode (val, next) is provided by the harness.'),
  F('linkedList', 'reverse', 'Reverse Linked List', 'linked_list_in', 'reverseList', [P('head', 'node')], 'node', 'Node type ListNode (val, next) is provided by the harness.'),
  F('linkedList', 'middleNode', 'Find Middle Node', 'linked_list_in', 'middleNode', [P('head', 'node')], 'int', 'Return the middle node value (second middle when even). ListNode is provided.'),
  F('linkedList', 'detectCycle', 'Cycle Detection (Floyd)', 'linked_list_in', 'detectCycle', [P('head', 'node')], 'bool', 'ListNode is provided; the harness may attach a cycle.'),
  CL('linkedList', 'doubly', 'Doubly Linked List', 'DoublyLinkedList', [], [
    M('insertHead', [P('value', 'int')], 'void'),
    M('insertTail', [P('value', 'int')], 'void'),
    M('delete', [P('value', 'int')], 'void'),
  ], 'Define your own doubly-linked node (val, prev, next).'),
  CL('linkedList', 'circular', 'Circular Linked List', 'CircularLinkedList', [], [
    M('insertHead', [P('value', 'int')], 'void'),
    M('insertTail', [P('value', 'int')], 'void'),
    M('delete', [P('value', 'int')], 'void'),
  ], 'Define your own circular node (val, next).'),

  // ── Stack & Queue: stateful classes ─────────────────────────────────
  CL('stackQueue', 'stack', 'Stack Primitive (LIFO)', 'Stack', [], [
    M('push', [P('value', 'int')], 'void'),
    M('pop', [], 'int'),
    M('peek', [], 'int'),
    M('isEmpty', [], 'bool'),
  ]),
  CL('stackQueue', 'queue', 'Queue Primitive (FIFO)', 'Queue', [], [
    M('enqueue', [P('value', 'int')], 'void'),
    M('dequeue', [], 'int'),
    M('front', [], 'int'),
    M('isEmpty', [], 'bool'),
  ]),
  CL('stackQueue', 'minStack', 'Min Stack O(1)', 'MinStack', [], [
    M('push', [P('value', 'int')], 'void'),
    M('pop', [], 'void'),
    M('top', [], 'int'),
    M('getMin', [], 'int'),
  ], 'getMin must run in O(1).'),
  CL('stackQueue', 'queueViaStacks', 'Queue using 2 Stacks', 'QueueViaStacks', [], [
    M('enqueue', [P('value', 'int')], 'void'),
    M('dequeue', [], 'int'),
    M('front', [], 'int'),
    M('isEmpty', [], 'bool'),
  ], 'Use two stacks only.'),
  CL('stackQueue', 'stackViaQueues', 'Stack using Queues', 'StackViaQueues', [], [
    M('push', [P('value', 'int')], 'void'),
    M('pop', [], 'int'),
    M('top', [], 'int'),
    M('isEmpty', [], 'bool'),
  ], 'Use queues only.'),
  CL('stackQueue', 'circularQueue', 'Circular Ring Queue', 'CircularQueue', [P('capacity', 'int')], [
    M('enQueue', [P('value', 'int')], 'bool'),
    M('deQueue', [], 'bool'),
    M('front', [], 'int'),
    M('rear', [], 'int'),
    M('isEmpty', [], 'bool'),
    M('isFull', [], 'bool'),
  ]),
  CL('stackQueue', 'circularDeque', 'Design Circular Deque', 'CircularDeque', [P('capacity', 'int')], [
    M('insertFront', [P('value', 'int')], 'bool'),
    M('insertLast', [P('value', 'int')], 'bool'),
    M('deleteFront', [], 'bool'),
    M('deleteLast', [], 'bool'),
    M('getFront', [], 'int'),
    M('getRear', [], 'int'),
    M('isEmpty', [], 'bool'),
    M('isFull', [], 'bool'),
  ]),
  CL('stackQueue', 'movingAverage', 'Moving Average Data Stream', 'MovingAverage', [P('windowSize', 'int')], [
    M('next', [P('value', 'int')], 'double'),
  ], 'next returns the average of the last windowSize values.'),
  CL('stackQueue', 'firstNonRepeating', 'First Non-Repeating in Stream', 'FirstNonRepeating', [], [
    M('next', [P('ch', 'string')], 'string'),
  ], 'next receives one character and returns the first non-repeating character so far, or "#" if none.'),

  // ── Stack & Queue: function-style problems ──────────────────────────
  F('stackQueue', 'validParentheses', 'Valid Parentheses', 'string_in', 'validParentheses', [P('s', 'string')], 'bool'),
  F('stackQueue', 'postfixEval', 'Evaluate RPN / Postfix', 'string_in', 'postfixEval', [P('expr', 'string')], 'int', 'Tokens in the expression are space-separated.'),
  F('stackQueue', 'simplifyPath', 'Simplify Path', 'string_in', 'simplifyPath', [P('path', 'string')], 'string'),
  F('stackQueue', 'removeAdjacentDuplicates', 'Remove Adjacent Duplicates', 'string_in', 'removeAdjacentDuplicates', [P('s', 'string')], 'string'),
  F('stackQueue', 'basicCalculator', 'Basic Calculator', 'string_in', 'basicCalculator', [P('s', 'string')], 'int', 'Support +, -, parentheses and spaces.'),
  F('stackQueue', 'decodeString', 'Decode String Pattern', 'string_in', 'decodeString', [P('s', 'string')], 'string'),
  F('stackQueue', 'dailyTemperatures', 'Daily Temperatures', 'array_in', 'dailyTemperatures', [P('temps', 'intArray')], 'intArray', 'Return days waited until a warmer temperature (0 if none).'),
  F('stackQueue', 'trappingRainWater', 'Trapping Rain Water', 'array_in', 'trapRainWater', [P('heights', 'intArray')], 'int'),
  F('stackQueue', 'largestRectangle', 'Largest Rectangle in Histogram', 'array_in', 'largestRectangle', [P('heights', 'intArray')], 'int'),
  F('stackQueue', 'slidingWindow', 'Sliding Window Maximum', 'array_in', 'maxSlidingWindow', [P('nums', 'intArray'), P('k', 'int')], 'intArray', 'Return the maximum of every window of size k.'),
  F('stackQueue', 'taskScheduler', 'Task Scheduler CPU Queue', 'array_in', 'taskScheduler', [P('tasks', 'intArray'), P('n', 'int')], 'int', 'tasks are task IDs as integers (A=0, B=1, ...); n is the cooldown.'),
  F('stackQueue', 'rottingOranges', 'Rotting Oranges BFS Grid', 'grid_in', 'rottingOranges', [P('grid', 'intMatrix')], 'int', 'grid cells: 0 empty, 1 fresh, 2 rotten. Return minutes until all fresh rot, or -1.'),
  F('stackQueue', 'dota2Senate', 'Dota2 Senate Round-Robin', 'string_in', 'dota2Senate', [P('s', 'string')], 'string', 'Return "Radiant" or "Dire".'),

  // ── Binary search (array_in) ────────────────────────────────────────
  F('binarySearch', 'binarySearch', 'Classic Binary Search', 'array_in', 'binarySearch', [P('arr', 'intArray'), P('target', 'int')], 'int', 'Return the index of target, or -1 if absent.'),
  F('binarySearch', 'lowerBound', 'Lower Bound (First >= X)', 'array_in', 'lowerBound', [P('arr', 'intArray'), P('target', 'int')], 'int', 'Return the first index with arr[i] >= target (arr.length if none).'),
  F('binarySearch', 'upperBound', 'Upper Bound (First > X)', 'array_in', 'upperBound', [P('arr', 'intArray'), P('target', 'int')], 'int', 'Return the first index with arr[i] > target (arr.length if none).'),
  F('binarySearch', 'searchRotatedArray', 'Rotated Sorted Array', 'array_in', 'searchRotatedArray', [P('arr', 'intArray'), P('target', 'int')], 'int', 'Return the index of target in the rotated array, or -1.'),
  F('binarySearch', 'findPeakElement', 'Find Peak Element', 'array_in', 'findPeakElement', [P('arr', 'intArray')], 'int', 'Return any peak index.'),

  // ── Hash maps (array_in) ────────────────────────────────────────────
  F('hashMaps', 'twoSum', 'Two Sum', 'array_in', 'twoSum', [P('arr', 'intArray'), P('target', 'int')], 'intArray', 'Return the two indices whose values sum to target.'),
  F('hashMaps', 'duplicateDetect', 'Duplicate Detect', 'array_in', 'duplicateDetect', [P('arr', 'intArray')], 'bool'),
  F('hashMaps', 'frequencyMap', 'Frequency Map', 'array_in', 'frequencyMap', [P('arr', 'intArray')], 'map', 'Return value counts keyed by value.'),
  F('hashMaps', 'subarraySum', 'Subarray Sum', 'array_in', 'subarraySum', [P('arr', 'intArray'), P('k', 'int')], 'int', 'Return the number of contiguous subarrays summing to k.'),

  // ── Trees (stateful_class) ──────────────────────────────────────────
  CL('bst', 'bst', 'Binary Search Tree (BST)', 'BST', [], [
    M('insert', [P('value', 'int')], 'void'),
    M('search', [P('value', 'int')], 'bool'),
    M('inorder', [], 'intArray'),
  ], 'Define your own tree node (value, left, right).'),
  CL('bst', 'avl', 'AVL Tree (Self-Balancing)', 'AVLTree', [], [
    M('insert', [P('value', 'int')], 'void'),
    M('search', [P('value', 'int')], 'bool'),
    M('inorder', [], 'intArray'),
  ], 'Keep the tree balanced with rotations on every insert.'),
  CL('bst', 'heap', 'Binary Heap (Priority Queue)', 'BinaryHeap', [], [
    M('insert', [P('value', 'int')], 'void'),
    M('extractTop', [], 'int'),
    M('peekTop', [], 'int'),
  ], 'The studio toggle selects min-heap or max-heap; match the active mode.'),
  CL('bst', 'trie', 'Trie (Prefix Tree)', 'Trie', [], [
    M('insert', [P('word', 'string')], 'void'),
    M('search', [P('word', 'string')], 'bool'),
    M('startsWith', [P('prefix', 'string')], 'bool'),
  ]),

  // ── Graphs (graph_in) ───────────────────────────────────────────────
  F('graph', 'bfs', 'Breadth-First Search (BFS)', 'graph_in', 'bfs', [P('n', 'int'), P('edges', 'intMatrix'), P('start', 'int')], 'intArray', 'edges rows are [u, v]; return the BFS visit order.'),
  F('graph', 'dfs', 'Depth-First Search (DFS)', 'graph_in', 'dfs', [P('n', 'int'), P('edges', 'intMatrix'), P('start', 'int')], 'intArray', 'edges rows are [u, v]; return the DFS visit order.'),
  F('graph', 'dijkstra', "Dijkstra's Shortest Path", 'graph_in', 'dijkstra', [P('n', 'int'), P('edges', 'intMatrix'), P('start', 'int')], 'intArray', 'edges rows are [u, v, weight]; return distances from start (-1 if unreachable).'),
  F('graph', 'prim', "Prim's Minimum Spanning Tree", 'graph_in', 'prim', [P('n', 'int'), P('edges', 'intMatrix')], 'int', 'edges rows are [u, v, weight]; return the total MST weight.'),
  F('graph', 'topoSort', 'Topological Sort (Kahn)', 'graph_in', 'topoSort', [P('n', 'int'), P('edges', 'intMatrix')], 'intArray', 'edges rows are [u, v] (u before v); return a topological order.'),

  // ── Recursion ───────────────────────────────────────────────────────
  F('recursion', 'factorial', 'Factorial', 'number_in', 'factorial', [P('n', 'int')], 'int'),
  F('recursion', 'fibonacci', 'Fibonacci', 'number_in', 'fibonacci', [P('n', 'int')], 'int', 'Return the n-th Fibonacci number (fib(0)=0, fib(1)=1).'),
  F('recursion', 'power', 'Power', 'number_in', 'power', [P('base', 'int'), P('exponent', 'int')], 'int'),
  F('recursion', 'arraySum', 'Array Sum', 'array_in', 'arraySum', [P('arr', 'intArray')], 'int'),
  F('recursion', 'towerOfHanoi', 'Tower of Hanoi', 'number_in', 'towerOfHanoi', [P('n', 'int')], 'int', 'Return the total number of moves.'),

  // ── Backtracking ────────────────────────────────────────────────────
  F('backtracking', 'subsets', 'Subsets', 'array_in', 'subsets', [P('arr', 'intArray')], 'intMatrix', 'Return all subsets (each subset is one row).'),
  F('backtracking', 'permutations', 'Permutations', 'array_in', 'permutations', [P('arr', 'intArray')], 'intMatrix', 'Return all permutations (each permutation is one row).'),
  F('backtracking', 'nQueens', 'N-Queens', 'number_in', 'nQueens', [P('n', 'int')], 'intMatrix', 'Return all solutions; each row lists the queen column per board row.'),
  F('backtracking', 'combinationSum', 'Combination Sum', 'array_in', 'combinationSum', [P('candidates', 'intArray'), P('target', 'int')], 'intMatrix', 'Return all unique combinations summing to target (reuse allowed).'),

  // ── Greedy ──────────────────────────────────────────────────────────
  F('greedy', 'activitySelection', 'Activity Selection', 'array_in', 'activitySelection', [P('activities', 'intMatrix')], 'int', 'activities rows are [start, end]; return the max number of compatible activities.'),
  F('greedy', 'fractionalKnapsack', 'Fractional Knapsack', 'array_in', 'fractionalKnapsack', [P('items', 'intMatrix'), P('capacity', 'int')], 'double', 'items rows are [weight, value]; return the max total value.'),
  F('greedy', 'jobScheduling', 'Job Scheduling', 'array_in', 'jobScheduling', [P('jobs', 'intMatrix')], 'int', 'jobs rows are [deadline, profit]; return the max profit with one job per slot.'),
  F('greedy', 'huffmanCoding', 'Huffman Coding', 'string_in', 'huffmanCoding', [P('text', 'string')], 'string', 'Return the Huffman-encoded bit string for text.'),

  // ── Dynamic programming ─────────────────────────────────────────────
  F('dp', 'fibonacciDP', 'Fibonacci DP', 'number_in', 'fibonacciDP', [P('n', 'int')], 'int'),
  F('dp', 'coinChange', 'Coin Change', 'array_in', 'coinChange', [P('coins', 'intArray'), P('amount', 'int')], 'int', 'Return the fewest coins to make amount, or -1 if impossible.'),
  F('dp', 'houseRobber', 'House Robber', 'array_in', 'houseRobber', [P('nums', 'intArray')], 'int'),
  F('dp', 'knapsack01', '0/1 Knapsack', 'array_in', 'knapsack01', [P('weights', 'intArray'), P('values', 'intArray'), P('capacity', 'int')], 'int'),
  F('dp', 'lcs', 'Longest Common Subseq', 'string_in', 'lcs', [P('a', 'string'), P('b', 'string')], 'int', 'Return the length of the longest common subsequence.'),
  F('dp', 'lis', 'Longest Increasing Subseq', 'array_in', 'lis', [P('arr', 'intArray')], 'int', 'Return the length of the longest strictly increasing subsequence.'),
  F('dp', 'editDistance', 'Edit Distance', 'string_in', 'editDistance', [P('a', 'string'), P('b', 'string')], 'int'),
  F('dp', 'uniquePaths', 'Unique Paths', 'number_in', 'uniquePaths', [P('m', 'int'), P('n', 'int')], 'int'),

  // ── Trie (stateful_class) ───────────────────────────────────────────
  CL('trie', 'trieInsert', 'Trie Insert', 'Trie', [], [
    M('insert', [P('word', 'string')], 'void'),
  ]),
  CL('trie', 'trieSearch', 'Trie Search', 'Trie', [], [
    M('insert', [P('word', 'string')], 'void'),
    M('search', [P('word', 'string')], 'bool'),
  ]),
  CL('trie', 'triePrefix', 'Prefix Search', 'Trie', [], [
    M('insert', [P('word', 'string')], 'void'),
    M('startsWith', [P('prefix', 'string')], 'stringArray'),
  ], 'startsWith returns all inserted words with the given prefix.'),
  CL('trie', 'wordDictionary', 'Word Dictionary', 'WordDictionary', [], [
    M('addWord', [P('word', 'string')], 'void'),
    M('search', [P('pattern', 'string')], 'bool'),
  ], 'search supports "." as a wildcard matching any single letter.'),
  CL('trie', 'autocomplete', 'Autocomplete', 'Autocomplete', [], [
    M('insert', [P('word', 'string')], 'void'),
    M('suggest', [P('prefix', 'string')], 'stringArray'),
  ], 'suggest returns all inserted words with the given prefix.'),
];

// ── Build + validate ────────────────────────────────────────────────────────
// Mirror of frontend/src/data/categoryTopics.ts (executable topics only).
const REQUIRED_KEYS = [
  'sorting.bubble', 'sorting.selection', 'sorting.insertion', 'sorting.merge', 'sorting.quick',
  'sorting.heap', 'sorting.shell', 'sorting.counting', 'sorting.radix', 'sorting.bucket',
  'arrays.linearSearch', 'arrays.kadane', 'arrays.twoPointer', 'arrays.slidingWindow', 'arrays.rotation', 'arrays.prefixSum',
  'strings.palindrome', 'strings.anagram', 'strings.reverse', 'strings.frequency',
  'linkedList.singly', 'linkedList.reverse', 'linkedList.middleNode', 'linkedList.detectCycle', 'linkedList.doubly', 'linkedList.circular',
  'stackQueue.stack', 'stackQueue.queue', 'stackQueue.validParentheses', 'stackQueue.minStack', 'stackQueue.postfixEval',
  'stackQueue.dailyTemperatures', 'stackQueue.simplifyPath', 'stackQueue.removeAdjacentDuplicates', 'stackQueue.basicCalculator',
  'stackQueue.decodeString', 'stackQueue.trappingRainWater', 'stackQueue.largestRectangle', 'stackQueue.queueViaStacks',
  'stackQueue.stackViaQueues', 'stackQueue.circularQueue', 'stackQueue.circularDeque', 'stackQueue.slidingWindow',
  'stackQueue.firstNonRepeating', 'stackQueue.movingAverage', 'stackQueue.taskScheduler', 'stackQueue.rottingOranges', 'stackQueue.dota2Senate',
  'binarySearch.binarySearch', 'binarySearch.lowerBound', 'binarySearch.upperBound', 'binarySearch.searchRotatedArray', 'binarySearch.findPeakElement',
  'hashMaps.twoSum', 'hashMaps.duplicateDetect', 'hashMaps.frequencyMap', 'hashMaps.subarraySum',
  'bst.bst', 'bst.avl', 'bst.heap', 'bst.trie',
  'graph.bfs', 'graph.dfs', 'graph.dijkstra', 'graph.prim', 'graph.topoSort',
  'recursion.factorial', 'recursion.fibonacci', 'recursion.power', 'recursion.arraySum', 'recursion.towerOfHanoi',
  'backtracking.subsets', 'backtracking.permutations', 'backtracking.nQueens', 'backtracking.combinationSum',
  'greedy.activitySelection', 'greedy.fractionalKnapsack', 'greedy.jobScheduling', 'greedy.huffmanCoding',
  'dp.fibonacciDP', 'dp.coinChange', 'dp.houseRobber', 'dp.knapsack01', 'dp.lcs', 'dp.lis', 'dp.editDistance', 'dp.uniquePaths',
  'trie.trieInsert', 'trie.trieSearch', 'trie.triePrefix', 'trie.wordDictionary', 'trie.autocomplete',
];

const errors = [];
const seen = new Set();
for (const algo of ALGORITHMS) {
  const key = `${algo.categoryId}.${algo.topicId}`;
  if (seen.has(key)) errors.push(`Duplicate key: ${key}`);
  seen.add(key);
}
for (const key of REQUIRED_KEYS) {
  if (!seen.has(key)) errors.push(`Missing required algorithm: ${key}`);
}
for (const key of seen) {
  if (!REQUIRED_KEYS.includes(key)) errors.push(`Unknown algorithm not in registry: ${key}`);
}
if (errors.length) {
  console.error('Validation failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const output = {
  languages: LANGUAGES,
  languageLabels: LANGUAGE_LABELS,
  harnessCategories: HARNESS_CATEGORY_DOCS,
  algorithms: ALGORITHMS.map((algo) => {
    const stubs = {};
    for (const lang of LANGUAGES) {
      stubs[lang] = algo.kind === 'class' ? renderClassStub(lang, algo) : renderFunctionStub(lang, algo);
    }
    const { categoryId, topicId, name, harness, kind, entry, note } = algo;
    const record = {
      key: `${categoryId}.${topicId}`,
      categoryId,
      topicId,
      name,
      harness,
      kind,
      entry,
      stubs,
    };
    if (note) record.note = note;
    if (algo.kind === 'function') {
      record.params = algo.params;
      record.returns = algo.returns;
    } else {
      record.ctorParams = algo.ctorParams;
      record.methods = algo.methods;
    }
    return record;
  }),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

const byHarness = {};
for (const algo of ALGORITHMS) byHarness[algo.harness] = (byHarness[algo.harness] || 0) + 1;
console.log(`Wrote ${OUT_PATH}`);
console.log(`Algorithms: ${ALGORITHMS.length} | Languages: ${LANGUAGES.join(', ')}`);
console.log('Harness category coverage:');
for (const [cat, count] of Object.entries(byHarness).sort()) console.log(`  ${cat}: ${count}`);
