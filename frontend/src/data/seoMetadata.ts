export const SITE_URL = 'https://stem-studio-one.vercel.app';
export const SITE_NAME = 'STEM Studio';
export const DEFAULT_OG_IMAGE = 'https://stem-studio-one.vercel.app/og-image.jpg';

export interface RouteSEO {
  title: string;
  description: string;
  canonical: string;
}

export const SEO_METADATA: Record<string, RouteSEO> = {
  '': {
    title: 'STEM Studio – Interactive DSA & Algorithm Visualizer',
    description: 'STEM Studio is an interactive Data Structures and Algorithms learning platform with step-by-step visualizers, multi-language debugger, quizzes, and 138+ topics designed to help students master algorithms.',
    canonical: '/dashboard'
  },
  'dsa': {
    title: 'Data Structures & Algorithms | STEM Studio',
    description: 'Master Data Structures and Algorithms with our interactive, step-by-step visualizer and comprehensive learning modules spanning over 138 topics.',
    canonical: '/dashboard/dsa'
  },
  'complexity': {
    title: 'Complexity Analysis | STEM Studio',
    description: 'Learn Time and Space Complexity with interactive charts and Big O notation examples for real-world code snippets and algorithmic problems.',
    canonical: '/dashboard/complexity'
  },
  'sorting': {
    title: 'Sorting Algorithm Visualizer | STEM Studio',
    description: 'Visualize how sorting algorithms like Bubble, Merge, Quick, and Heap sort operate step-by-step with interactive array animations.',
    canonical: '/dashboard/sorting'
  },
  'arrays': {
    title: 'Arrays Visualizer | STEM Studio',
    description: 'Interactive visualization of array operations, including insertion, deletion, searching, and memory allocation strategies.',
    canonical: '/dashboard/arrays'
  },
  'strings': {
    title: 'Strings Visualizer | STEM Studio',
    description: 'Explore string algorithms, pattern matching, substring search, and string manipulation techniques through interactive step-by-step visualizations.',
    canonical: '/dashboard/strings'
  },
  'linkedList': {
    title: 'Linked List Visualizer | STEM Studio',
    description: 'Visualize singly and doubly linked lists. Understand pointer manipulation, node insertion, and traversal with interactive animations.',
    canonical: '/dashboard/linkedList'
  },
  'stackQueue': {
    title: 'Stack & Queue Visualizer | STEM Studio',
    description: 'Learn stacks and queues with interactive push, pop, enqueue, and dequeue operations. Understand LIFO and FIFO structures visually.',
    canonical: '/dashboard/stackQueue'
  },
  'binarySearch': {
    title: 'Binary Search Visualizer | STEM Studio',
    description: 'Understand the binary search algorithm with interactive step-by-step visualizations on sorted arrays and trees.',
    canonical: '/dashboard/binarySearch'
  },
  'hashMaps': {
    title: 'Hash Maps Visualizer | STEM Studio',
    description: 'Visualize hash map data structures, hash functions, collision resolution techniques, and dynamic resizing operations.',
    canonical: '/dashboard/hashMaps'
  },
  'bst': {
    title: 'Trees Visualizer | STEM Studio',
    description: 'Interactive visualizer for Binary Search Trees, AVL Trees, and Heaps. Learn insertions, deletions, and tree traversals step-by-step.',
    canonical: '/dashboard/bst'
  },
  'graph': {
    title: 'Graph Algorithm Visualizer | STEM Studio',
    description: 'Explore graph algorithms including BFS, DFS, and Dijkstra with an interactive node-and-edge visualizer for shortest path problems.',
    canonical: '/dashboard/graph'
  },
  'recursion': {
    title: 'Recursion Visualizer | STEM Studio',
    description: 'Visualize recursive function calls and call stack behavior step-by-step to intuitively understand base cases and recursive branching.',
    canonical: '/dashboard/recursion'
  },
  'backtracking': {
    title: 'Backtracking Visualizer | STEM Studio',
    description: 'Learn backtracking algorithms like N-Queens and Sudoku solver with interactive state-space tree visualizations.',
    canonical: '/dashboard/backtracking'
  },
  'greedy': {
    title: 'Greedy Algorithms Visualizer | STEM Studio',
    description: 'Understand greedy algorithm approaches for optimization problems like fractional knapsack and Huffman coding through interactive examples.',
    canonical: '/dashboard/greedy'
  },
  'dp': {
    title: 'Dynamic Programming Visualizer | STEM Studio',
    description: 'Master dynamic programming with interactive 1D and 2D tabulation grids and memoization recursion tree visualizations.',
    canonical: '/dashboard/dp'
  },
  'trie': {
    title: 'Trie Visualizer | STEM Studio',
    description: 'Visualize Trie (prefix tree) data structures. Learn efficient string storage, prefix matching, and autocomplete algorithms interactively.',
    canonical: '/dashboard/trie'
  },
  'os': {
    title: 'Operating Systems | STEM Studio',
    description: 'Learn fundamental Operating Systems concepts, memory management, process scheduling, and concurrency with interactive simulators.',
    canonical: '/dashboard/os'
  },
  'os/linux': {
    title: 'Linux OS | STEM Studio',
    description: 'Explore the Linux operating system architecture, kernel fundamentals, and system administration concepts through an interactive interface.',
    canonical: '/dashboard/os/linux'
  },
  'commands': {
    title: 'Linux Commands Reference | STEM Studio',
    description: 'Comprehensive interactive Linux commands reference. Learn essential CLI tools, file manipulation, and system management commands.',
    canonical: '/dashboard/os/commands'
  },
  'os/commands': {
    title: 'Linux Commands Reference | STEM Studio',
    description: 'Comprehensive interactive Linux commands reference. Learn essential CLI tools, file manipulation, and system management commands.',
    canonical: '/dashboard/os/commands'
  },
  'filesystem': {
    title: 'File System Simulator | STEM Studio',
    description: 'Interactive Virtual File System simulator. Understand directory structures, file permissions, and i-node concepts visually.',
    canonical: '/dashboard/os/filesystem'
  },
  'os/filesystem': {
    title: 'File System Simulator | STEM Studio',
    description: 'Interactive Virtual File System simulator. Understand directory structures, file permissions, and i-node concepts visually.',
    canonical: '/dashboard/os/filesystem'
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
