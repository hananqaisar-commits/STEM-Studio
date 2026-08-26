/**
 * Educational complexity-learning content for the Complexity module.
 * Each topic is a self-contained learning unit that explains the
 * time/space characteristics of a DSA category.
 */

export interface ComplexityTable {
  headers: string[];
  rows: string[][];
}

export interface ComplexitySection {
  title: string;
  body?: string;
  table?: ComplexityTable;
  list?: string[];
  code?: string;
  takeaway?: string;
}

export interface ComplexityTopic {
  id: string;
  name: string;
  headline: string;
  intro: string;
  sections: ComplexitySection[];
}

export const COMPLEXITY_TOPICS: ComplexityTopic[] = [
  {
    id: 'general',
    name: 'General Complexity',
    headline: 'Understanding Algorithmic Efficiency',
    intro:
      'Computational complexity describes how the resources an algorithm needs — mainly time and memory — grow as the input size grows. It lets us predict performance, compare algorithms, and choose the right tool for the job without relying on raw benchmarks alone.',
    sections: [
      {
        title: 'What Complexity Means',
        body:
          'Complexity abstracts away hardware speed, language, and implementation details. It focuses on the growth rate of an algorithm\'s cost as the input size n becomes very large.',
      },
      {
        title: 'Why Complexity Matters',
        body:
          'An O(n) algorithm will eventually outperform an O(n²) algorithm as n grows, no matter how fast the machine running the slower algorithm is. Complexity tells us which algorithm scales.',
        list: [
          'Predict whether a solution will finish within time limits.',
          'Compare two algorithms independently of hardware.',
          'Identify bottlenecks before they reach production.',
        ],
      },
      {
        title: 'Time Complexity',
        body:
          'Time complexity measures how the number of basic operations grows with input size. It answers: "If I double the input, how much longer does the algorithm take?"',
      },
      {
        title: 'Space Complexity',
        body:
          'Space complexity measures total memory used relative to input size. Auxiliary space is the extra memory beyond the input itself.',
      },
      {
        title: 'Big-O Notation',
        body:
          'Big-O describes an upper bound on growth. It drops constants and lower-order terms because they become irrelevant at scale.',
        list: [
          'O(1) — constant time',
          'O(log n) — logarithmic growth',
          'O(n) — linear growth',
          'O(n log n) — linearithmic growth',
          'O(n²) — quadratic growth',
          'O(2ⁿ) — exponential growth',
        ],
      },
      {
        title: 'Best, Average and Worst Case',
        body:
          'The same algorithm performs differently depending on input arrangement. Best case is the luckiest input, average case is expected performance over random inputs, and worst case is the input that maximizes work.',
      },
      {
        title: 'Common Complexity Classes',
        body: 'A quick reference for the complexity classes you will meet most often.',
        table: {
          headers: ['Class', 'Name', 'Example'],
          rows: [
            ['O(1)', 'Constant', 'Array index access'],
            ['O(log n)', 'Logarithmic', 'Binary search'],
            ['O(n)', 'Linear', 'Scanning an array once'],
            ['O(n log n)', 'Linearithmic', 'Merge sort, heap sort'],
            ['O(n²)', 'Quadratic', 'Bubble sort, nested loops'],
            ['O(2ⁿ)', 'Exponential', 'Generating all subsets'],
          ],
        },
      },
      {
        title: 'How to Compare Algorithms',
        body:
          'Drop constants and lower-order terms, then compare the dominant term. For example, 3n² + 5n + 7 is O(n²), and for large n it will dominate any O(n log n) algorithm.',
      },
      {
        title: 'Why Input Size Matters',
        body:
          'An O(n²) algorithm may be faster than an O(n log n) algorithm for tiny n because of lower constant factors. Complexity only guarantees behavior as n grows large.',
      },
      {
        title: 'Practical Example',
        body:
          'Searching a sorted array of 1,000,000 items: linear search could take 1,000,000 steps, while binary search takes about 20 steps. That is the difference between O(n) and O(log n).',
        takeaway:
          'Complexity is the language we use to reason about scalability. Master it and you can evaluate algorithms before writing a single line of code.',
      },
    ],
  },

  {
    id: 'sorting',
    name: 'Sorting Algorithms',
    headline: 'Ordering Data Efficiently',
    intro:
      'Sorting arranges elements in a specific order. The best algorithm depends on whether you need stability, in-place sorting, guaranteed worst-case performance, or simplicity.',
    sections: [
      {
        title: 'What Sorting Does',
        body:
          'A sorting algorithm reorders a collection so that every element is less than or equal to the next, according to some comparison rule.',
      },
      {
        title: 'Comparison-Based Sorts',
        body:
          'These algorithms decide order by comparing pairs of elements. Their worst-case time complexity cannot be better than O(n log n).',
        table: {
          headers: ['Algorithm', 'Best', 'Average', 'Worst', 'Space', 'Stable'],
          rows: [
            ['Bubble Sort', 'O(n)', 'O(n²)', 'O(n²)', 'O(1)', 'Yes'],
            ['Selection Sort', 'O(n²)', 'O(n²)', 'O(n²)', 'O(1)', 'No'],
            ['Insertion Sort', 'O(n)', 'O(n²)', 'O(n²)', 'O(1)', 'Yes'],
            ['Merge Sort', 'O(n log n)', 'O(n log n)', 'O(n log n)', 'O(n)', 'Yes'],
            ['Quick Sort', 'O(n log n)', 'O(n log n)', 'O(n²)', 'O(log n)', 'No'],
            ['Heap Sort', 'O(n log n)', 'O(n log n)', 'O(n log n)', 'O(1)', 'No'],
          ],
        },
      },
      {
        title: 'Why the Bounds Differ',
        body:
          'Bubble and insertion sort can finish early if the data is already sorted. Quick sort\'s worst case appears when the pivot is always the smallest or largest element. Merge sort and heap sort keep a consistent O(n log n) by design.',
      },
      {
        title: 'Space Complexity',
        body:
          'In-place sorts like heap sort and insertion sort use O(1) extra space. Merge sort needs O(n) auxiliary space to merge subarrays.',
      },
      {
        title: 'Stability',
        body:
          'A stable sort preserves the relative order of equal elements. This matters when sorting records by multiple keys.',
      },
      {
        title: 'Simple Example',
        code: `[5, 2, 8, 1] → compare and swap → [1, 2, 5, 8]`,
        takeaway:
          'No sort is perfect for every situation. Choose merge sort for stability and guarantees, quick sort for average speed, and insertion sort for small or nearly sorted data.',
      },
    ],
  },

  {
    id: 'stack',
    name: 'Stack',
    headline: 'Last-In, First-Out (LIFO)',
    intro:
      'A stack is a linear structure where elements are added and removed from the same end, called the top. The last element inserted is the first one removed.',
    sections: [
      {
        title: 'What a Stack Does',
        body:
          'Stacks model real-world piles: plates, undo history, or nested function calls. Operations only touch the top.',
      },
      {
        title: 'Core Operations',
        table: {
          headers: ['Operation', 'Time', 'Description'],
          rows: [
            ['Push', 'O(1)', 'Add an element to the top'],
            ['Pop', 'O(1)', 'Remove the top element'],
            ['Peek / Top', 'O(1)', 'Read the top element without removing it'],
            ['Search', 'O(n)', 'Look for an element anywhere in the stack'],
            ['Access', 'O(n)', 'Reach an element that is not on top'],
          ],
        },
      },
      {
        title: 'Space Complexity',
        body: 'A stack holding n elements uses O(n) space.',
      },
      {
        title: 'Why Push and Pop are O(1)',
        body:
          'They only update the top pointer. No shifting or traversal is needed because the structure intentionally restricts access to one end.',
      },
      {
        title: 'Simple Example',
        code: `Push 3 → [3]
Push 7 → [3, 7]
Peek   → 7
Pop    → [3]`,
        takeaway:
          'Use a stack whenever you need to reverse a sequence, track nested structures, or model function-call behavior.',
      },
    ],
  },

  {
    id: 'queue',
    name: 'Queue',
    headline: 'First-In, First-Out (FIFO)',
    intro:
      'A queue is a linear structure where elements are inserted at the rear and removed from the front. The first element inserted is the first one removed.',
    sections: [
      {
        title: 'What a Queue Does',
        body:
          'Queues model waiting lines, printer jobs, and breadth-first search. Fairness comes from serving the longest-waiting element first.',
      },
      {
        title: 'Core Operations',
        table: {
          headers: ['Operation', 'Time', 'Description'],
          rows: [
            ['Enqueue', 'O(1)', 'Add an element to the rear'],
            ['Dequeue', 'O(1)', 'Remove the front element'],
            ['Front / Peek', 'O(1)', 'Read the front element'],
            ['Search', 'O(n)', 'Look for an element anywhere in the queue'],
            ['Access', 'O(n)', 'Reach an element that is not at the front'],
          ],
        },
      },
      {
        title: 'Space Complexity',
        body: 'A queue holding n elements uses O(n) space.',
      },
      {
        title: 'Why Enqueue and Dequeue are O(1)',
        body:
          'With head and tail pointers, both operations update only pointers. A circular buffer avoids shifting elements during dequeue.',
      },
      {
        title: 'Simple Example',
        code: `Enqueue 4 → [4]
Enqueue 9 → [4, 9]
Front     → 4
Dequeue   → [9]`,
        takeaway:
          'Use a queue for scheduling, buffering, and any scenario where order of arrival must be preserved.',
      },
    ],
  },

  {
    id: 'linkedList',
    name: 'Linked List',
    headline: 'Dynamic Node-Based Storage',
    intro:
      'A linked list stores elements in nodes that point to each other. Unlike arrays, linked lists do not require contiguous memory and can grow and shrink efficiently.',
    sections: [
      {
        title: 'What a Linked List Does',
        body:
          'Each node contains data and a pointer to the next node. Doubly linked lists also store a pointer to the previous node.',
      },
      {
        title: 'Core Operations',
        table: {
          headers: ['Operation', 'Average', 'Worst', 'Notes'],
          rows: [
            ['Access', 'O(n)', 'O(n)', 'No random access'],
            ['Search', 'O(n)', 'O(n)', 'Must traverse from head'],
            ['Insert at head', 'O(1)', 'O(1)', 'Just rewire the head pointer'],
            ['Insert elsewhere', 'O(n)', 'O(n)', 'Find position first'],
            ['Delete at head', 'O(1)', 'O(1)', 'Rehead the list'],
            ['Delete elsewhere', 'O(n)', 'O(n)', 'Find node first'],
            ['Traversal', 'O(n)', 'O(n)', 'Visit every node once'],
          ],
        },
      },
      {
        title: 'Space Complexity',
        body:
          'A linked list uses O(n) space for the data plus O(n) extra for pointers. Each doubly linked node needs two pointers instead of one.',
      },
      {
        title: 'Why Access is O(n)',
        body:
          'Nodes are not stored contiguously, so you cannot jump to index i. You must follow pointers from the head.',
      },
      {
        title: 'Simple Example',
        code: `head → [3|•] → [7|•] → [1|null]`,
        takeaway:
          'Linked lists excel at frequent insertions and deletions at the head. They lose to arrays when random access is required.',
      },
    ],
  },

  {
    id: 'bst',
    name: 'Binary Search Tree',
    headline: 'Ordered Hierarchical Search',
    intro:
      'A binary search tree keeps keys in sorted order: every left child is smaller than its parent, and every right child is larger. This ordering enables fast search, insertion, and deletion.',
    sections: [
      {
        title: 'What a BST Does',
        body:
          'BSTs combine the flexibility of linked structures with the speed of binary search. They are the foundation of ordered maps and sets.',
      },
      {
        title: 'Core Operations',
        table: {
          headers: ['Operation', 'Average', 'Worst', 'Notes'],
          rows: [
            ['Search', 'O(log n)', 'O(n)', 'Follows left/right branches'],
            ['Insert', 'O(log n)', 'O(n)', 'Find leaf, attach node'],
            ['Delete', 'O(log n)', 'O(n)', 'Handle 0, 1, or 2 children'],
            ['Traversal', 'O(n)', 'O(n)', 'Visit every node once'],
          ],
        },
      },
      {
        title: 'Space Complexity',
        body: 'A BST storing n nodes uses O(n) space.',
      },
      {
        title: 'Balanced vs Unbalanced',
        body:
          'In a balanced tree, operations are O(log n). In a degenerate tree where every node has only one child, the tree becomes a linked list and operations degrade to O(n). Self-balancing trees like AVL prevent this.',
      },
      {
        title: 'Simple Example',
        code: `     8
    / \
   3   10
  / \
 1   6`,
        takeaway:
          'Use a BST when you need ordered data with dynamic insertions and deletions. For guaranteed performance, prefer a self-balancing variant.',
      },
    ],
  },

  {
    id: 'binarySearch',
    name: 'Binary Search',
    headline: 'Divide the Search Space in Half',
    intro:
      'Binary search finds an element in a sorted collection by repeatedly dividing the search interval in half. It is one of the most important O(log n) algorithms.',
    sections: [
      {
        title: 'What Binary Search Does',
        body:
          'Compare the target with the middle element. If it matches, return it. If the target is smaller, search the left half; otherwise search the right half.',
      },
      {
        title: 'Complexity Cases',
        table: {
          headers: ['Case', 'Time', 'Reason'],
          rows: [
            ['Best', 'O(1)', 'Target is the middle element immediately'],
            ['Average', 'O(log n)', 'Search space halves each step'],
            ['Worst', 'O(log n)', 'Target is at the final position checked'],
          ],
        },
      },
      {
        title: 'Space Complexity',
        body:
          'The iterative version uses O(1) extra space. A recursive version uses O(log n) space for the call stack.',
      },
      {
        title: 'Iterative vs Recursive',
        body:
          'Both have the same time complexity. The iterative form saves stack space and is preferred in production, while the recursive form is often easier to read.',
      },
      {
        title: 'Simple Example',
        code: `Sorted: [2, 5, 8, 12, 16, 23, 38]
Find 16:
  mid = 12 → search right
  mid = 23 → search left
  mid = 16 → found`,
        takeaway:
          'Binary search only works on sorted data, but when it applies it is dramatically faster than linear search.',
      },
    ],
  },

  {
    id: 'graph',
    name: 'Graph',
    headline: 'Modeling Relationships',
    intro:
      'A graph is a collection of vertices connected by edges. Graphs model networks, maps, dependencies, and relationships of all kinds.',
    sections: [
      {
        title: 'What a Graph Does',
        body:
          'Graphs generalize trees: any node can connect to any other node, and cycles are allowed. They are defined by a set of vertices V and edges E.',
      },
      {
        title: 'Representations',
        table: {
          headers: ['Representation', 'Space', 'When to Use'],
          rows: [
            ['Adjacency Matrix', 'O(V²)', 'Dense graphs, fast edge lookup'],
            ['Adjacency List', 'O(V + E)', 'Sparse graphs, memory efficient'],
          ],
        },
      },
      {
        title: 'Traversal Complexity',
        table: {
          headers: ['Algorithm', 'Time', 'Space'],
          rows: [
            ['BFS', 'O(V + E)', 'O(V)'],
            ['DFS', 'O(V + E)', 'O(V)'],
          ],
        },
      },
      {
        title: 'Shortest Path',
        body:
          "Dijkstra's algorithm finds shortest paths from a source to all other vertices in a weighted graph with non-negative edges. Using a min-heap, it runs in O((V + E) log V) time.",
      },
      {
        title: 'Why BFS and DFS are O(V + E)',
        body:
          'Each vertex is visited once and each edge is examined once in the adjacency-list representation. The space is dominated by the queue or recursion stack plus the visited set.',
      },
      {
        title: 'Simple Example',
        code: `A -- B -- C
|    |
D -- E

BFS from A visits A, B, D, C, E by level.`,
        takeaway:
          'Graphs are the right abstraction whenever your data has connections. Choose the representation and algorithm based on density, weights, and the question you need to answer.',
      },
    ],
  },
];
