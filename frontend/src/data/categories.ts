/**
 * Central registry for all DSA module categories.
 * Single source of truth for the hub card grid, sidebar, and navbar.
 */

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface CategoryDef {
  /** Route segment — matches App.tsx route path */
  id: string;
  /** Display name */
  name: string;
  /** Short description shown on the card */
  description: string;
  /** Number of algorithms / topics inside this category */
  topicCount: number;
  /** Difficulty badge */
  difficulty: Difficulty;
  /** Whether this category is live or a "Coming Soon" placeholder */
  available: boolean;
  /** Lucide icon name — resolved at render time */
  iconName: string;
}

export const DSA_CATEGORIES: CategoryDef[] = [
  // ── Foundations ─────────────────────────────────────────────
  {
    id: 'complexity',
    name: 'Complexity Analysis',
    description: 'Big O, Ω, Θ — Time & Space complexity, loops, recursion, amortized analysis, and reference tables',
    topicCount: 12,
    difficulty: 'Beginner',
    available: true,
    iconName: 'Activity',
  },

  // ── Linear Data Structures ──────────────────────────────────
  {
    id: 'sorting',
    name: 'Sorting Algorithms',
    description: 'Bubble, Selection, Insertion, Merge, Quick, Heap, Shell, Counting, Radix, Bucket — comparison & non-comparison sorting',
    topicCount: 10,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'BarChart2',
  },
  {
    id: 'arrays',
    name: 'Arrays',
    description: 'Traversal, Insert/Delete, Prefix Sum, Sliding Window, Two Pointers, Kadane\'s, Rotation',
    topicCount: 6,
    difficulty: 'Beginner',
    available: true,
    iconName: 'LayoutList',
  },
  {
    id: 'strings',
    name: 'Strings',
    description: 'Pattern Matching, KMP, Palindrome, Anagram, Frequency Counting, String Reversal',
    topicCount: 4,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Type',
  },
  {
    id: 'linkedList',
    name: 'Linked List',
    description: 'Singly, Doubly, Circular — Insert/Delete, Reverse, Floyd\'s Cycle Detection, Middle Node',
    topicCount: 6,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'GitCommit',
  },
  {
    id: 'stackQueue',
    name: 'Stack & Queue',
    description: 'Valid Parentheses, Min Stack, RPN Calculator, Monotonic Stacks, Circular Queue & Deque, Sliding Window Max, Task Scheduler, Rotting Oranges',
    topicCount: 22,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Layers',
  },

  // ── Searching ───────────────────────────────────────────────
  {
    id: 'binarySearch',
    name: 'Binary Search',
    description: 'Classic Search, Lower/Upper Bound, Search in Rotated Array, Peak Element',
    topicCount: 5,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Search',
  },
  {
    id: 'hashMaps',
    name: 'Hash Maps',
    description: 'HashMap, HashSet, Frequency Maps, Two Sum, Duplicate Detection, Prefix Sum + HashMap',
    topicCount: 4,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Hash',
  },

  // ── Non-Linear Data Structures ──────────────────────────────
  {
    id: 'bst',
    name: 'Trees',
    description: 'BST, AVL, Heap, Trie — insert, search, depth-first traversals, balancing rotations, heapify',
    topicCount: 4,
    difficulty: 'Advanced',
    available: true,
    iconName: 'GitPullRequest',
  },
  {
    id: 'graph',
    name: 'Graphs',
    description: 'BFS, DFS, Dijkstra, Prim\'s, Topological Sort',
    topicCount: 5,
    difficulty: 'Advanced',
    available: true,
    iconName: 'Share2',
  },

  // ── Algorithmic Paradigms ───────────────────────────────────
  {
    id: 'recursion',
    name: 'Recursion',
    description: 'Base Case, Call Stack, Factorial, Fibonacci, Power, Array Sum, Tower of Hanoi',
    topicCount: 5,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Repeat',
  },
  {
    id: 'backtracking',
    name: 'Backtracking',
    description: 'Subsets, Permutations, N-Queens, Combination Sum',
    topicCount: 4,
    difficulty: 'Advanced',
    available: true,
    iconName: 'CornerDownRight',
  },
  {
    id: 'greedy',
    name: 'Greedy',
    description: 'Activity Selection, Fractional Knapsack, Job Scheduling, Huffman Coding',
    topicCount: 4,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Zap',
  },
  {
    id: 'dp',
    name: 'Dynamic Programming',
    description: 'Fibonacci, Coin Change, House Robber, 0/1 Knapsack, LCS, LIS, Edit Distance, Unique Paths',
    topicCount: 8,
    difficulty: 'Advanced',
    available: true,
    iconName: 'Grid3x3',
  },
  {
    id: 'trie',
    name: 'Trie',
    description: 'Construction, Insert/Search, Prefix Search, Word Dictionary, Autocomplete',
    topicCount: 5,
    difficulty: 'Advanced',
    available: true,
    iconName: 'Binary',
  },
];

/**
 * Module definitions — top-level subjects shown in the sidebar.
 */
export interface ModuleDef {
  id: string;
  name: string;
  description: string;
  available: boolean;
  /** Lucide icon name — resolved at render time */
  iconName: string;
  /** Number of categories in this module */
  categoryCount: number;
}

export const MODULES: ModuleDef[] = [
  {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    description: 'Core DSA concepts, visualizers, and quizzes',
    available: true,
    iconName: 'BookOpen',
    categoryCount: 15,
  },
  {
    id: 'dld',
    name: 'Digital Logic Design',
    description: 'Boolean algebra, gates, combinational & sequential circuits',
    available: false,
    iconName: 'Cpu',
    categoryCount: 0,
  },
  {
    id: 'os',
    name: 'Operating Systems',
    description: 'Processes, scheduling, memory management, file systems',
    available: false,
    iconName: 'Monitor',
    categoryCount: 0,
  },
];

/**
 * Look up a category by its route id.
 */
export function getCategoryById(id: string): CategoryDef | undefined {
  return DSA_CATEGORIES.find((c) => c.id === id);
}
