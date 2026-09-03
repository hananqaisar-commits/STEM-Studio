/**
 * Centralized topic registry for every DSA category.
 * Used by the two-level category/topic dropdown in VisualizerHeader.
 * Each entry mirrors the items array passed by individual Page components.
 */

export interface TopicEntry {
  id: string;
  name: string;
  description?: string;
  group?: string;
}

export interface CategoryTopics {
  categoryId: string;
  categoryName: string;
  topics: TopicEntry[];
}

export const CATEGORY_TOPICS: CategoryTopics[] = [
  // ── Foundations ─────────────────────────────────────────────────
  {
    categoryId: 'complexity',
    categoryName: 'Complexity Analysis',
    topics: [
      { id: 'why', name: 'Why Complexity Analysis?', group: 'Foundations' },
      { id: 'notations', name: 'Asymptotic Notations', group: 'Foundations' },
      { id: 'rules', name: 'Simplification Rules', group: 'Foundations' },
      { id: 'loops', name: 'Analyzing Loops', group: 'Foundations' },
      { id: 'time', name: 'Time Complexity Classes', group: 'Foundations' },
      { id: 'space', name: 'Space Complexity', group: 'Foundations' },
      { id: 'cases', name: 'Best / Average / Worst Case', group: 'Analysis' },
      { id: 'recursion', name: 'Recursion & Master Theorem', group: 'Analysis' },
      { id: 'amortized', name: 'Amortized Analysis', group: 'Analysis' },
      { id: 'tradeoffs', name: 'Time-Space Tradeoffs', group: 'Analysis' },
      { id: 'ds-operations', name: 'Data Structure Operations', group: 'Reference' },
      { id: 'comparison', name: 'Algorithm Complexity Reference', group: 'Reference' },
    ],
  },

  // ── Linear Data Structures ────────────────────────────────────
  {
    categoryId: 'sorting',
    categoryName: 'Sorting Algorithms',
    topics: [
      { id: 'bubble', name: 'Bubble Sort', group: 'O(n²)' },
      { id: 'selection', name: 'Selection Sort', group: 'O(n²)' },
      { id: 'insertion', name: 'Insertion Sort', group: 'O(n²)' },
      { id: 'merge', name: 'Merge Sort', group: 'O(n log n)' },
      { id: 'quick', name: 'Quick Sort', group: 'O(n log n)' },
      { id: 'heap', name: 'Heap Sort', group: 'O(n log n)' },
      { id: 'shell', name: 'Shell Sort', group: 'O(n log n)' },
      { id: 'counting', name: 'Counting Sort', group: 'O(n+k)' },
      { id: 'radix', name: 'Radix Sort', group: 'O(d·(n+k))' },
      { id: 'bucket', name: 'Bucket Sort', group: 'O(n+k)' },
    ],
  },
  {
    categoryId: 'arrays',
    categoryName: 'Arrays',
    topics: [
      { id: 'linearSearch', name: 'Linear Search', group: 'O(n)' },
      { id: 'kadane', name: "Kadane's Algorithm", group: 'O(n)' },
      { id: 'twoPointer', name: 'Two Pointers', group: 'O(n)' },
      { id: 'slidingWindow', name: 'Sliding Window', group: 'O(n)' },
      { id: 'rotation', name: 'Array Rotation', group: 'O(n)' },
      { id: 'prefixSum', name: 'Prefix Sum', group: 'O(n)' },
    ],
  },
  {
    categoryId: 'strings',
    categoryName: 'Strings',
    topics: [
      { id: 'palindrome', name: 'Palindrome Check', group: 'O(n)' },
      { id: 'anagram', name: 'Anagram Check', group: 'O(n)' },
      { id: 'reverse', name: 'String Reversal', group: 'O(n)' },
      { id: 'frequency', name: 'Frequency Count', group: 'O(n)' },
    ],
  },
  {
    categoryId: 'linkedList',
    categoryName: 'Linked List',
    topics: [
      { id: 'singly', name: 'Singly Linked List', group: 'Singly' },
      { id: 'reverse', name: 'Reverse Linked List', group: 'Singly' },
      { id: 'middleNode', name: 'Find Middle Node', group: 'Two-Pointers' },
      { id: 'detectCycle', name: 'Cycle Detection (Floyd)', group: 'Two-Pointers' },
      { id: 'doubly', name: 'Doubly Linked List', group: 'Doubly' },
      { id: 'circular', name: 'Circular Linked List', group: 'Circular' },
    ],
  },
  {
    categoryId: 'stackQueue',
    categoryName: 'Stack & Queue',
    topics: [
      { id: 'stack', name: 'Stack Primitive (LIFO)', group: 'Core' },
      { id: 'queue', name: 'Queue Primitive (FIFO)', group: 'Core' },
      { id: 'validParentheses', name: 'Valid Parentheses', group: 'Stack' },
      { id: 'minStack', name: 'Min Stack O(1)', group: 'Stack' },
      { id: 'postfixEval', name: 'Evaluate RPN / Postfix', group: 'Stack' },
      { id: 'dailyTemperatures', name: 'Daily Temperatures', group: 'Stack' },
      { id: 'simplifyPath', name: 'Simplify Path', group: 'Stack' },
      { id: 'removeAdjacentDuplicates', name: 'Remove Adjacent Duplicates', group: 'Stack' },
      { id: 'basicCalculator', name: 'Basic Calculator', group: 'Stack' },
      { id: 'decodeString', name: 'Decode String Pattern', group: 'Stack' },
      { id: 'trappingRainWater', name: 'Trapping Rain Water', group: 'Stack' },
      { id: 'largestRectangle', name: 'Largest Rectangle in Histogram', group: 'Stack' },
      { id: 'queueViaStacks', name: 'Queue using 2 Stacks', group: 'Queue' },
      { id: 'stackViaQueues', name: 'Stack using Queues', group: 'Queue' },
      { id: 'circularQueue', name: 'Circular Ring Queue', group: 'Queue' },
      { id: 'circularDeque', name: 'Design Circular Deque', group: 'Queue' },
      { id: 'slidingWindow', name: 'Sliding Window Maximum', group: 'Queue' },
      { id: 'firstNonRepeating', name: 'First Non-Repeating in Stream', group: 'Queue' },
      { id: 'movingAverage', name: 'Moving Average Data Stream', group: 'Queue' },
      { id: 'taskScheduler', name: 'Task Scheduler CPU Queue', group: 'Queue' },
      { id: 'rottingOranges', name: 'Rotting Oranges BFS Grid', group: 'Queue' },
      { id: 'dota2Senate', name: 'Dota2 Senate Round-Robin', group: 'Queue' },
    ],
  },

  // ── Searching ─────────────────────────────────────────────────
  {
    categoryId: 'binarySearch',
    categoryName: 'Binary Search',
    topics: [
      { id: 'binarySearch', name: 'Classic Binary Search', group: 'Standard' },
      { id: 'lowerBound', name: 'Lower Bound (First >= X)', group: 'Bounds' },
      { id: 'upperBound', name: 'Upper Bound (First > X)', group: 'Bounds' },
      { id: 'searchRotatedArray', name: 'Rotated Sorted Array', group: 'Pivoted' },
      { id: 'findPeakElement', name: 'Find Peak Element', group: 'Extremum' },
    ],
  },
  {
    categoryId: 'hashMaps',
    categoryName: 'Hash Maps',
    topics: [
      { id: 'twoSum', name: 'Two Sum', group: 'O(n)' },
      { id: 'duplicateDetect', name: 'Duplicate Detect', group: 'O(n)' },
      { id: 'frequencyMap', name: 'Frequency Map', group: 'O(n)' },
      { id: 'subarraySum', name: 'Subarray Sum', group: 'O(n)' },
    ],
  },

  // ── Non-Linear Data Structures ────────────────────────────────
  {
    categoryId: 'bst',
    categoryName: 'Trees',
    topics: [
      { id: 'bst', name: 'Binary Search Tree (BST)', group: 'Trees' },
      { id: 'avl', name: 'AVL Tree (Self-Balancing)', group: 'Balanced' },
      { id: 'rbt', name: 'Red-Black Tree', group: 'Balanced' },
      { id: 'heap', name: 'Binary Heap (Priority Queue)', group: 'Heaps' },
      { id: 'segTree', name: 'Segment Tree', group: 'Advanced' },
      { id: 'trie', name: 'Trie (Prefix Tree)', group: 'Strings' },
    ],
  },
  {
    categoryId: 'graph',
    categoryName: 'Graphs',
    topics: [
      { id: 'bfs', name: 'Breadth-First Search (BFS)', group: 'Traversals' },
      { id: 'dfs', name: 'Depth-First Search (DFS)', group: 'Traversals' },
      { id: 'dijkstra', name: "Dijkstra's Shortest Path", group: 'Shortest Path' },
      { id: 'bellmanFord', name: 'Bellman-Ford Algorithm', group: 'Shortest Path' },
      { id: 'prim', name: "Prim's Minimum Spanning Tree", group: 'MST' },
      { id: 'kruskal', name: "Kruskal's Minimum Spanning Tree", group: 'MST' },
      { id: 'aStar', name: 'A* Pathfinding', group: 'Pathfinding' },
      { id: 'topoSort', name: 'Topological Sort (Kahn)', group: 'Ordering' },
    ],
  },

  // ── Algorithmic Paradigms ─────────────────────────────────────
  {
    categoryId: 'recursion',
    categoryName: 'Recursion',
    topics: [
      { id: 'factorial', name: 'Factorial', group: 'O(n)' },
      { id: 'fibonacci', name: 'Fibonacci', group: 'O(2^n)' },
      { id: 'power', name: 'Power', group: 'O(n)' },
      { id: 'arraySum', name: 'Array Sum', group: 'O(n)' },
      { id: 'towerOfHanoi', name: 'Tower of Hanoi', group: 'O(2^n)' },
    ],
  },
  {
    categoryId: 'backtracking',
    categoryName: 'Backtracking',
    topics: [
      { id: 'subsets', name: 'Subsets', group: 'O(2^n)' },
      { id: 'permutations', name: 'Permutations', group: 'O(n!·n)' },
      { id: 'nQueens', name: 'N-Queens', group: 'O(n!)' },
      { id: 'combinationSum', name: 'Combination Sum', group: 'O(2^t)' },
    ],
  },
  {
    categoryId: 'greedy',
    categoryName: 'Greedy',
    topics: [
      { id: 'activitySelection', name: 'Activity Selection', group: 'O(n log n)' },
      { id: 'fractionalKnapsack', name: 'Fractional Knapsack', group: 'O(n log n)' },
      { id: 'jobScheduling', name: 'Job Scheduling', group: 'O(n·d)' },
      { id: 'huffmanCoding', name: 'Huffman Coding', group: 'O(n log n)' },
    ],
  },
  {
    categoryId: 'dp',
    categoryName: 'Dynamic Programming',
    topics: [
      { id: 'fibonacciDP', name: 'Fibonacci DP', group: 'O(n)' },
      { id: 'coinChange', name: 'Coin Change', group: 'O(n·c)' },
      { id: 'houseRobber', name: 'House Robber', group: 'O(n)' },
      { id: 'knapsack01', name: '0/1 Knapsack', group: 'O(n·W)' },
      { id: 'lcs', name: 'Longest Common Subseq', group: 'O(m·n)' },
      { id: 'lis', name: 'Longest Increasing Subseq', group: 'O(n²)' },
      { id: 'editDistance', name: 'Edit Distance', group: 'O(m·n)' },
      { id: 'uniquePaths', name: 'Unique Paths', group: 'O(m·n)' },
    ],
  },
  {
    categoryId: 'trie',
    categoryName: 'Trie',
    topics: [
      { id: 'trieInsert', name: 'Trie Insert', group: 'O(m)' },
      { id: 'trieSearch', name: 'Trie Search', group: 'O(m)' },
      { id: 'triePrefix', name: 'Prefix Search', group: 'O(p+k)' },
      { id: 'wordDictionary', name: 'Word Dictionary', group: 'O(m·b)' },
      { id: 'autocomplete', name: 'Autocomplete', group: 'O(p+k)' },
    ],
  },
];
