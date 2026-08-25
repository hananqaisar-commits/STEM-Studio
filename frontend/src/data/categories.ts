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
    description: 'Big O, Ω, Θ — Time & Space complexity, Best/Average/Worst case, Recurrence relations',
    topicCount: 6,
    difficulty: 'Beginner',
    available: true,
    iconName: 'Activity',
  },

  // ── Linear Data Structures ──────────────────────────────────
  {
    id: 'sorting',
    name: 'Sorting Algorithms',
    description: 'Bubble, Selection, Insertion, Merge, Quick, Heap, Shell — comparison & in-place sorting',
    topicCount: 7,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'BarChart2',
  },
  {
    id: 'arrays',
    name: 'Arrays',
    description: 'Traversal, Insert/Delete, Prefix Sum, Sliding Window, Two Pointers, Kadane\'s, Rotation',
    topicCount: 12,
    difficulty: 'Beginner',
    available: true,
    iconName: 'LayoutList',
  },
  {
    id: 'strings',
    name: 'Strings',
    description: 'Pattern Matching, KMP, Palindrome, Anagram, Frequency Counting, String Reversal',
    topicCount: 9,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Type',
  },
  {
    id: 'linkedList',
    name: 'Linked List',
    description: 'Singly, Doubly, Circular — Insert/Delete, Reverse, Floyd\'s Cycle Detection, Merge',
    topicCount: 10,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'GitCommit',
  },
  {
    id: 'stackQueue',
    name: 'Stack & Queue',
    description: 'Balanced Parentheses, Monotonic Stack, Next Greater Element, Deque, Priority Queue',
    topicCount: 11,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Layers',
  },

  // ── Searching ───────────────────────────────────────────────
  {
    id: 'binarySearch',
    name: 'Binary Search',
    description: 'Lower/Upper Bound, Search in Rotated Array, Binary Search on Answer, Peak Element',
    topicCount: 8,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Search',
  },
  {
    id: 'hashMaps',
    name: 'Hash Maps',
    description: 'HashMap, HashSet, Frequency Maps, Two Sum, Duplicate Detection, Prefix Sum + HashMap',
    topicCount: 7,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Hash',
  },

  // ── Non-Linear Data Structures ──────────────────────────────
  {
    id: 'bst',
    name: 'Trees',
    description: 'BST, AVL, Heap, Trie — Insert/Search/Delete, Traversals, Diameter, LCA, Balanced Trees',
    topicCount: 14,
    difficulty: 'Advanced',
    available: true,
    iconName: 'GitPullRequest',
  },
  {
    id: 'graph',
    name: 'Graphs',
    description: 'BFS, DFS, Dijkstra, Prim\'s, Topological Sort, Cycle Detection, MST, Union Find',
    topicCount: 13,
    difficulty: 'Advanced',
    available: true,
    iconName: 'Share2',
  },

  // ── Algorithmic Paradigms ───────────────────────────────────
  {
    id: 'recursion',
    name: 'Recursion',
    description: 'Base Case, Call Stack, Factorial, Fibonacci, Tower of Hanoi, Array & String Recursion',
    topicCount: 8,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Repeat',
  },
  {
    id: 'backtracking',
    name: 'Backtracking',
    description: 'Subsets, Permutations, N-Queens, Sudoku Solver, Maze Problems, Combination Sum',
    topicCount: 7,
    difficulty: 'Advanced',
    available: true,
    iconName: 'CornerDownRight',
  },
  {
    id: 'greedy',
    name: 'Greedy',
    description: 'Activity Selection, Fractional Knapsack, Job Scheduling, Huffman Coding, Interval Problems',
    topicCount: 6,
    difficulty: 'Intermediate',
    available: true,
    iconName: 'Zap',
  },
  {
    id: 'dp',
    name: 'Dynamic Programming',
    description: '1D/2D DP, Knapsack, LCS, LIS, Edit Distance, Coin Change, DP on Trees & Grids',
    topicCount: 14,
    difficulty: 'Advanced',
    available: false,
    iconName: 'Grid3x3',
  },
  {
    id: 'trie',
    name: 'Trie',
    description: 'Construction, Insert/Search, Prefix Search, Word Dictionary, Autocomplete, XOR Trie',
    topicCount: 6,
    difficulty: 'Advanced',
    available: false,
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
}

export const MODULES: ModuleDef[] = [
  {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    description: 'Core DSA concepts, visualizers, and quizzes',
    available: true,
  },
  {
    id: 'dld',
    name: 'Digital Logic Design',
    description: 'Boolean algebra, gates, combinational & sequential circuits',
    available: false,
  },
  {
    id: 'os',
    name: 'Operating Systems',
    description: 'Processes, scheduling, memory management, file systems',
    available: false,
  },
];

/**
 * Look up a category by its route id.
 */
export function getCategoryById(id: string): CategoryDef | undefined {
  return DSA_CATEGORIES.find((c) => c.id === id);
}
