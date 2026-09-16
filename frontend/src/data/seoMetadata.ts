export const SITE_URL = 'https://stem-studio-one.vercel.app';
export const SITE_NAME = 'STEM Studio';
export const DEFAULT_OG_IMAGE = 'https://stem-studio-one.vercel.app/og-image.jpg';

export interface RouteSEO {
  title: string;
  description: string;
  canonical: string;
}

export interface RouteSEO {
  title: string;
  description: string;
  canonical: string;
  keywords?: string;
  breadcrumbName?: string;
}

export const SEO_METADATA: Record<string, RouteSEO> = {
  '': {
    title: 'STEM Studio – Interactive DSA & Algorithm Visualizer',
    description: 'STEM Studio is an interactive Data Structures and Algorithms learning platform with step-by-step visualizers, multi-language debugger, quizzes, and 138+ topics designed to help students master algorithms.',
    canonical: '/dashboard',
    keywords: 'STEM Studio, STEM Studio DSA, STEM Studio algorithms, DSA visualizer, data structures and algorithms visualizer, algorithm visualizer, interactive DSA learning, learn data structures and algorithms, coding algorithm debugger, DSA quiz, algorithm learning platform',
    breadcrumbName: 'Home'
  },
  'dsa': {
    title: 'Data Structures & Algorithms | STEM Studio',
    description: 'Master Data Structures and Algorithms with our interactive, step-by-step visualizer and comprehensive learning modules spanning over 138 topics.',
    canonical: '/dashboard/dsa',
    keywords: 'DSA modules, data structures learning, algorithm suite, interactive algorithm learning, computer science algorithms',
    breadcrumbName: 'DSA Modules'
  },
  'complexity': {
    title: 'Complexity Analysis | STEM Studio',
    description: 'Learn Time and Space Complexity with interactive charts and Big O notation examples for real-world code snippets and algorithmic problems.',
    canonical: '/dashboard/complexity',
    keywords: 'Big O notation visualizer, time complexity, space complexity, algorithm complexity calculator, time complexity analysis',
    breadcrumbName: 'Complexity Analysis'
  },
  'sorting': {
    title: 'Sorting Algorithm Visualizer | STEM Studio',
    description: 'Visualize how sorting algorithms like Bubble, Merge, Quick, and Heap sort operate step-by-step with interactive array animations.',
    canonical: '/dashboard/sorting',
    keywords: 'sorting algorithm visualizer, bubble sort visualizer, merge sort visualizer, quicksort visualizer, heap sort animation',
    breadcrumbName: 'Sorting Algorithms'
  },
  'arrays': {
    title: 'Arrays Visualizer | STEM Studio',
    description: 'Interactive visualization of array operations, including insertion, deletion, searching, and memory allocation strategies.',
    canonical: '/dashboard/arrays',
    keywords: 'array operations visualizer, dynamic array animation, two pointers technique, sliding window visualizer',
    breadcrumbName: 'Arrays'
  },
  'strings': {
    title: 'Strings Visualizer | STEM Studio',
    description: 'Explore string algorithms, pattern matching, substring search, and string manipulation techniques through interactive step-by-step visualizations.',
    canonical: '/dashboard/strings',
    keywords: 'string algorithms visualizer, KMP algorithm animation, Rabin Karp visualizer, string pattern matching',
    breadcrumbName: 'Strings'
  },
  'linkedList': {
    title: 'Linked List Visualizer | STEM Studio',
    description: 'Visualize singly and doubly linked lists. Understand pointer manipulation, node insertion, and traversal with interactive animations.',
    canonical: '/dashboard/linkedList',
    keywords: 'linked list visualizer, singly linked list animation, doubly linked list visualizer, pointer manipulation animation',
    breadcrumbName: 'Linked List'
  },
  'stackQueue': {
    title: 'Stack & Queue Visualizer | STEM Studio',
    description: 'Learn stacks and queues with interactive push, pop, enqueue, and dequeue operations. Understand LIFO and FIFO structures visually.',
    canonical: '/dashboard/stackQueue',
    keywords: 'stack visualizer, queue visualizer, LIFO FIFO animation, stack overflow visualizer, priority queue',
    breadcrumbName: 'Stack & Queue'
  },
  'binarySearch': {
    title: 'Binary Search Visualizer | STEM Studio',
    description: 'Understand the binary search algorithm with interactive step-by-step visualizations on sorted arrays and trees.',
    canonical: '/dashboard/binarySearch',
    keywords: 'searching algorithm visualizer, binary search visualizer, binary search animation, logarithmic search demo',
    breadcrumbName: 'Binary Search'
  },
  'hashMaps': {
    title: 'Hash Maps Visualizer | STEM Studio',
    description: 'Visualize hash map data structures, hash functions, collision resolution techniques, and dynamic resizing operations.',
    canonical: '/dashboard/hashMaps',
    keywords: 'hash map visualizer, hash table animation, collision resolution visualizer, hash function demo',
    breadcrumbName: 'Hash Maps'
  },
  'bst': {
    title: 'Trees Visualizer | STEM Studio',
    description: 'Interactive visualizer for Binary Search Trees, AVL Trees, and Heaps. Learn insertions, deletions, and tree traversals step-by-step.',
    canonical: '/dashboard/bst',
    keywords: 'tree algorithm visualizer, binary search tree visualizer, BST animation, AVL tree visualizer, heap tree visualizer',
    breadcrumbName: 'Trees & BST'
  },
  'graph': {
    title: 'Graph Algorithm Visualizer | STEM Studio',
    description: 'Explore graph algorithms including BFS, DFS, and Dijkstra with an interactive node-and-edge visualizer for shortest path problems.',
    canonical: '/dashboard/graph',
    keywords: 'graph algorithm visualizer, BFS visualizer, DFS animation, Dijkstra algorithm visualizer, shortest path visualizer',
    breadcrumbName: 'Graph Algorithms'
  },
  'recursion': {
    title: 'Recursion Visualizer | STEM Studio',
    description: 'Visualize recursive function calls and call stack behavior step-by-step to intuitively understand base cases and recursive branching.',
    canonical: '/dashboard/recursion',
    keywords: 'recursion visualizer, call stack animation, recursive tree visualizer, fibonacci recursion stack',
    breadcrumbName: 'Recursion'
  },
  'backtracking': {
    title: 'Backtracking Visualizer | STEM Studio',
    description: 'Learn backtracking algorithms like N-Queens and Sudoku solver with interactive state-space tree visualizations.',
    canonical: '/dashboard/backtracking',
    keywords: 'backtracking visualizer, N Queens visualizer, Sudoku solver animation, state space tree visualizer',
    breadcrumbName: 'Backtracking'
  },
  'greedy': {
    title: 'Greedy Algorithms Visualizer | STEM Studio',
    description: 'Understand greedy algorithm approaches for optimization problems like fractional knapsack and Huffman coding through interactive examples.',
    canonical: '/dashboard/greedy',
    keywords: 'greedy algorithm visualizer, knapsack problem visualizer, huffman coding animation, activity selection',
    breadcrumbName: 'Greedy Algorithms'
  },
  'dp': {
    title: 'Dynamic Programming Visualizer | STEM Studio',
    description: 'Master dynamic programming with interactive 1D and 2D tabulation grids and memoization recursion tree visualizations.',
    canonical: '/dashboard/dp',
    keywords: 'dynamic programming visualizer, DP table animation, 01 knapsack DP visualizer, memoization tree animation',
    breadcrumbName: 'Dynamic Programming'
  },
  'trie': {
    title: 'Trie Visualizer | STEM Studio',
    description: 'Visualize Trie (prefix tree) data structures. Learn efficient string storage, prefix matching, and autocomplete algorithms interactively.',
    canonical: '/dashboard/trie',
    keywords: 'trie visualizer, prefix tree animation, autocomplete data structure visualizer, string trie demo',
    breadcrumbName: 'Trie Data Structure'
  },
  'os': {
    title: 'Operating Systems | STEM Studio',
    description: 'Learn fundamental Operating Systems concepts, memory management, process scheduling, and concurrency with interactive simulators.',
    canonical: '/dashboard/os',
    keywords: 'operating systems simulator, OS concepts, Linux OS learning, process scheduling simulator, Virtual File System simulator',
    breadcrumbName: 'Operating Systems'
  },
  'os/linux': {
    title: 'Linux OS | STEM Studio',
    description: 'Explore the Linux operating system architecture, kernel fundamentals, and system administration concepts through an interactive interface.',
    canonical: '/dashboard/os/linux',
    keywords: 'Linux OS simulator, Linux architecture, Linux kernel concepts, system administration basics',
    breadcrumbName: 'Linux OS'
  },
  'commands': {
    title: 'Linux Commands Reference | STEM Studio',
    description: 'Comprehensive interactive Linux commands reference. Learn essential CLI tools, file manipulation, and system management commands.',
    canonical: '/dashboard/os/commands',
    keywords: 'Linux commands reference, interactive terminal commands, bash command catalog, Linux CLI cheat sheet',
    breadcrumbName: 'Linux Commands'
  },
  'os/commands': {
    title: 'Linux Commands Reference | STEM Studio',
    description: 'Comprehensive interactive Linux commands reference. Learn essential CLI tools, file manipulation, and system management commands.',
    canonical: '/dashboard/os/commands',
    keywords: 'Linux commands reference, interactive terminal commands, bash command catalog, Linux CLI cheat sheet',
    breadcrumbName: 'Linux Commands'
  },
  'filesystem': {
    title: 'File System Simulator | STEM Studio',
    description: 'Interactive Virtual File System simulator. Understand directory structures, file permissions, and i-node concepts visually.',
    canonical: '/dashboard/os/filesystem',
    keywords: 'Virtual File System simulator, Linux FHS simulator, interactive bash terminal, VFS visualizer',
    breadcrumbName: 'File System Simulator'
  },
  'os/filesystem': {
    title: 'File System Simulator | STEM Studio',
    description: 'Interactive Virtual File System simulator. Understand directory structures, file permissions, and i-node concepts visually.',
    canonical: '/dashboard/os/filesystem',
    keywords: 'Virtual File System simulator, Linux FHS simulator, interactive bash terminal, VFS visualizer',
    breadcrumbName: 'File System Simulator'
  }
};

export function getSEOForRoute(pathname: string): RouteSEO {
  // Try exact match after removing '/dashboard' or trailing slashes
  const cleanPath = pathname.replace(/^\/dashboard\/?/, '').replace(/\/$/, '');
  
  if (SEO_METADATA[cleanPath]) {
    return SEO_METADATA[cleanPath];
  }
  
  // Try extracting the last segment
  const segments = cleanPath.split('/');
  const lastSegment = segments[segments.length - 1];
  
  if (SEO_METADATA[lastSegment]) {
    return SEO_METADATA[lastSegment];
  }
  
  // Default to homepage
  return SEO_METADATA[''];
}
