import { buildOptions, type QuizQuestion, type QuizWeight } from '../engine/types/Quiz';

/* ── Concept Question Bank ─────────────────────────────────────────────
   Standalone MCQ questions for Concept Mode and Revision Mode.
   Each entry is tagged with a `topic` used by weak-area tracking.
   Questions are authored once and pool-sampled at runtime.
   ─────────────────────────────────────────────────────────────────── */

export interface ConceptQuestion extends Omit<QuizQuestion, 'id'> {
  /** Category this question belongs to, matches QuizModule keys. */
  topic: string;
}

/** Stable identity for per-question review scheduling. */
export function conceptQuestionId(question: ConceptQuestion): string {
  return `${question.topic}:${question.concept}:${question.prompt}`;
}

/** Structural validation for the checked-in (never live-generated) bank. */
export function validateConceptQuestionBank(questions: ConceptQuestion[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  questions.forEach((question, index) => {
    const id = conceptQuestionId(question);
    if (seen.has(id)) errors.push(`Duplicate question at index ${index}`);
    seen.add(id);
    if (!question.prompt.trim() || !question.topic.trim() || !question.concept.trim()) errors.push(`Missing metadata at index ${index}`);
    if (question.options.length !== 4) errors.push(`Question at index ${index} must have four options`);
    if (question.correctIndex < 0 || question.correctIndex >= question.options.length) errors.push(`Question at index ${index} has invalid answer index`);
    if (new Set(question.options.map((option) => option.trim().toLowerCase())).size !== question.options.length) errors.push(`Question at index ${index} has duplicate options`);
    if (question.options.some((option) => !option.trim()) || !question.explanation.trim() || !question.hint.trim()) errors.push(`Question at index ${index} has an empty field`);
  });
  return errors;
}

function q(
  topic: string,
  concept: string,
  prompt: string,
  correct: string,
  distractors: string[],
  explanation: string,
  hint: string,
  weight: QuizWeight = 1
): ConceptQuestion {
  const seed = `${topic}-${concept}-${prompt.slice(0, 20)}`;
  const { options, correctIndex } = buildOptions(seed, correct, distractors);
  return { topic, concept, prompt, options, correctIndex, explanation, hint, weight, kind: 'reason' };
}

export const CONCEPT_QUESTIONS: ConceptQuestion[] = [
  // ── Sorting ──────────────────────────────────────────────────────────
  q('sorting', 'Bubble Sort', 'What is the worst-case time complexity of Bubble Sort?',
    'O(n²)', ['O(n)', 'O(n log n)', 'O(log n)'],
    'In the worst case, Bubble Sort performs n*(n-1)/2 comparisons, giving O(n²).',
    'Think about how many comparisons are needed when the array is fully reversed.'),

  q('sorting', 'Bubble Sort', 'What invariant does Bubble Sort maintain after each full pass?',
    'The largest unsorted element is placed at its correct position',
    ['The smallest element moves to the front', 'All elements are in final position', 'The middle element is sorted'],
    'Each full pass "bubbles" the current maximum to the end of the unsorted region.',
    'What happens to the biggest element when pairs are repeatedly compared?'),

  q('sorting', 'Merge Sort', 'What is the space complexity of Merge Sort?',
    'O(n)', ['O(1)', 'O(log n)', 'O(n²)'],
    'Merge Sort requires O(n) auxiliary space for the temporary merge buffer.',
    'Merging two halves requires storing elements somewhere — how much space?'),

  q('sorting', 'Quick Sort', 'What is Quick Sort\'s best-case time complexity?',
    'O(n log n)', ['O(n)', 'O(n²)', 'O(log n)'],
    'When the pivot always splits the array into two equal halves, we get O(n log n).',
    'Consider the case where every pivot divides the array perfectly in half.'),

  q('sorting', 'Quick Sort', 'What makes Quick Sort\'s worst case O(n²)?',
    'The pivot is always the smallest or largest element',
    ['Random pivot selection', 'The array is nearly sorted', 'Recursion depth exceeds stack'],
    'If the pivot is always an extreme value, one partition has n-1 elements and the other 0, causing O(n²) behavior.',
    'What happens to partitioning when the pivot is the minimum or maximum?', 2),

  q('sorting', 'Insertion Sort', 'Insertion Sort is most efficient when the input is:',
    'Nearly sorted', ['Completely random', 'Reversed', 'All identical values'],
    'Insertion Sort makes at most O(k) shifts per element when each element is at most k positions out of order, giving nearly O(n).',
    'Think about how many shifts are needed when elements are close to their correct positions.'),

  q('sorting', 'Selection Sort', 'How many swaps does Selection Sort perform in the worst case?',
    'O(n)', ['O(n²)', 'O(n log n)', 'O(1)'],
    'Selection Sort performs exactly n-1 swaps — one per pass — regardless of input order.',
    'Selection Sort always selects the minimum and places it: how many selections are needed?'),

  q('sorting', 'Heap Sort', 'What data structure does Heap Sort rely on?',
    'Max-heap', ['Min-heap', 'BST', 'Stack'],
    'Heap Sort builds a max-heap, then repeatedly extracts the maximum to sort in ascending order.',
    'What property ensures the root is always the largest element?'),

  q('sorting', 'Stability', 'Which of the following sorting algorithms is stable?',
    'Merge Sort', ['Quick Sort', 'Heap Sort', 'Selection Sort'],
    'Merge Sort preserves the relative order of equal elements because merging never reorders ties.',
    'A stable sort preserves original ordering of equal elements — which sort merges without reordering?', 2),

  // ── Binary Search ─────────────────────────────────────────────────
  q('binarySearch', 'Binary Search', 'What is the time complexity of Binary Search?',
    'O(log n)', ['O(n)', 'O(n log n)', 'O(1)'],
    'Each iteration halves the search space, giving a depth of log₂(n).',
    'After each comparison the problem size is cut in half — what does that give you?'),

  q('binarySearch', 'Binary Search', 'What precondition must the array satisfy for Binary Search to work?',
    'The array must be sorted', ['The array must have unique elements', 'The array must have even length', 'The array must be in descending order'],
    'Binary Search compares the target to the midpoint and discards half the array, which only works when the array is sorted.',
    'What assumption lets you discard half the remaining elements at each step?'),

  q('binarySearch', 'Binary Search', 'What is the maximum number of comparisons for Binary Search on an array of 16 elements?',
    '5', ['4', '8', '16'],
    'log₂(16) = 4, but we may need one extra comparison to confirm the result, so at most 5.',
    'How many times can you halve 16 before reaching 1?', 2),

  // ── BST ───────────────────────────────────────────────────────────
  q('bst', 'BST', 'In a BST, where is the in-order successor of a node with two children?',
    'Leftmost node of the right subtree',
    ['Rightmost node of the left subtree', 'Parent node', 'Right child'],
    'The in-order successor is the smallest node greater than the current node, found by going right then all the way left.',
    'To find the next-largest value, go right once, then keep going left.'),

  q('bst', 'BST Property', 'Which traversal of a BST yields elements in sorted order?',
    'In-order (left → root → right)', ['Pre-order', 'Post-order', 'Level-order'],
    'In-order traversal visits left subtree, then root, then right subtree, which produces sorted output in a BST.',
    'Which traversal visits the smallest element (leftmost) first?'),

  q('bst', 'BST Height', 'What is the worst-case height of a BST with n elements?',
    'O(n)', ['O(log n)', 'O(n log n)', 'O(√n)'],
    'If elements are inserted in sorted order, the BST degenerates into a linked list with height n.',
    'What happens to BST shape when you insert already-sorted values?', 2),

  // ── Linked List ───────────────────────────────────────────────────
  q('linkedList', 'Linked List', 'What is the time complexity of accessing the k-th element in a singly linked list?',
    'O(k)', ['O(1)', 'O(log k)', 'O(n²)'],
    'There is no random access in a linked list — you must traverse from the head, taking O(k) time.',
    'Can you jump directly to position k, or do you have to follow links one by one?'),

  q('linkedList', 'Linked List', 'Which operation is O(1) in a singly linked list with a tail pointer?',
    'Appending to the end', ['Deleting from the end', 'Searching for a value', 'Accessing by index'],
    'With a tail pointer, appending only updates the tail\'s next and moves the pointer — O(1).',
    'Which operation benefits directly from knowing exactly where the last node is?'),

  // ── Stack & Queue ──────────────────────────────────────────────────
  q('stackQueue', 'Stack', 'Which of the following correctly describes a Stack?',
    'Last In, First Out (LIFO)', ['First In, First Out (FIFO)', 'Random access', 'Priority-based ordering'],
    'A stack allows insertion and removal only from the top — the last element pushed is the first popped.',
    'Think of a stack of plates: which plate do you take first?'),

  q('stackQueue', 'Queue', 'Which algorithm is best modelled with a queue?',
    'Breadth-First Search', ['Depth-First Search', 'Binary Search', 'Quick Sort'],
    'BFS explores nodes level by level, processing each node before moving to the next level — matching FIFO order.',
    'Which traversal visits all neighbours before going deeper?'),

  q('stackQueue', 'Stack', 'Which problem is naturally solved with a stack?',
    'Balanced parentheses checking', ['Shortest path in a graph', 'Finding duplicates in an array', 'Sorting a linked list'],
    'A stack lets you push opening brackets and pop them when a matching closing bracket is found.',
    'Think about matching the most recently opened bracket — which data structure keeps the "most recent" at top?'),

  // ── Graph ─────────────────────────────────────────────────────────
  q('graph', 'BFS', 'BFS finds the shortest path in an unweighted graph. Why?',
    'It explores nodes in order of their distance from the source',
    ['It tries all paths simultaneously', 'It uses a priority queue', 'It backtracks when stuck'],
    'By processing nodes level-by-level, the first time BFS reaches a node is always via the shortest path.',
    'If you explore all nodes at distance 1 before distance 2, can you ever find a shorter path later?'),

  q('graph', 'DFS', 'DFS uses which data structure implicitly (via recursion)?',
    'Stack', ['Queue', 'Heap', 'Array'],
    'Recursive DFS uses the call stack; iterative DFS explicitly uses a stack.',
    'What does the function call stack actually implement in terms of data structure?'),

  q('graph', 'Dijkstra', 'What data structure makes Dijkstra\'s algorithm efficient?',
    'Min-heap (priority queue)', ['Stack', 'Queue', 'Hash table'],
    'A min-heap always extracts the node with the smallest tentative distance in O(log n), making the algorithm O((V+E) log V).',
    'You always want to process the node with the smallest known distance next — what structure is best for that?', 2),

  // ── Recursion ─────────────────────────────────────────────────────
  q('recursion', 'Recursion', 'What must every recursive function have to avoid infinite recursion?',
    'A base case', ['A loop', 'A return value', 'A stack'],
    'Without a base case, the recursion never stops and eventually causes a stack overflow.',
    'What stops the recursive calls from going on forever?'),

  q('recursion', 'Recursion', 'What is the time complexity of computing Fibonacci(n) naively with recursion?',
    'O(2ⁿ)', ['O(n)', 'O(n²)', 'O(n log n)'],
    'Each call branches into two, and the depth is n, resulting in about 2ⁿ total calls.',
    'Draw the recursion tree for Fibonacci — how many nodes does it have at depth d?', 2),

  // ── Dynamic Programming ───────────────────────────────────────────
  q('dp', 'Memoization', 'What is memoization?',
    'Caching results of expensive function calls to avoid recomputation',
    ['A form of recursion', 'An in-place sorting technique', 'A graph traversal strategy'],
    'Memoization stores the result of each unique call so repeated subproblems are answered in O(1) instead of recomputed.',
    'If you\'ve already solved a subproblem, do you need to solve it again?'),

  q('dp', 'Overlapping Subproblems', 'Which characteristic distinguishes a problem solvable by DP?',
    'Overlapping subproblems and optimal substructure',
    ['Subproblems are independent', 'The input must be sorted', 'A greedy choice always works'],
    'DP is applicable when subproblems recur and optimal solutions can be built from optimal subsolutions.',
    'What two properties must hold for DP to be the right approach?', 2),

  // ── Greedy ────────────────────────────────────────────────────────
  q('greedy', 'Greedy', 'What is the key property of a greedy algorithm?',
    'It makes the locally optimal choice at each step',
    ['It explores all possibilities', 'It always backtracks', 'It requires sorted input'],
    'Greedy algorithms commit to the best-looking choice at each step without reconsidering past decisions.',
    'Does a greedy algorithm look ahead or only at the current step?'),

  q('greedy', 'Greedy', 'For which problem does a greedy algorithm give the optimal solution?',
    'Activity selection (interval scheduling maximization)',
    ['0/1 Knapsack', 'Longest Common Subsequence', 'Travelling Salesman Problem'],
    'Activity selection has a "greedy stays ahead" proof: always picking the earliest-ending activity is globally optimal.',
    'Which classic scheduling problem can be solved greedily by always picking the earliest finish time?', 2),

  // ── Strings ────────────────────────────────────────────────────────
  q('strings', 'Substring Search', 'What is the time complexity of the naive substring search algorithm?',
    'O(n × m)', ['O(n + m)', 'O(n log n)', 'O(m)'],
    'The naive approach tries every starting position (n) and checks each character of the pattern (m), giving O(n×m).',
    'For each of the n positions, how many characters of the pattern might you check?'),

  q('strings', 'KMP', 'What does the KMP failure function store?',
    'The length of the longest proper prefix that is also a suffix',
    ['The position of the first mismatch', 'The index to restart search from', 'Character frequencies'],
    'The failure function lets KMP skip re-examining characters it has already matched, achieving O(n+m).',
    'What information lets KMP avoid restarting the pattern match from scratch on mismatch?', 2),

  // ── Arrays ────────────────────────────────────────────────────────
  q('arrays', 'Two Pointers', 'The two-pointer technique is best applied when:',
    'The array is sorted and you need pairs satisfying a condition',
    ['The array contains duplicates', 'You need to find the median', 'The array has negative numbers'],
    'Two pointers work efficiently on sorted arrays because moving pointers inward monotonically narrows the search space.',
    'In a sorted array, if the sum of two values is too large, which pointer should you move?'),

  q('arrays', 'Sliding Window', 'What problem type is best solved with a sliding window?',
    'Finding a contiguous subarray satisfying a constraint',
    ['Searching for a single element', 'Reversing an array', 'Finding the k-th largest element'],
    'Sliding window efficiently tracks a window of elements moving across the array without recomputing from scratch.',
    'Think about maintaining a running computation as you move a fixed-size range across the array.'),

  // ── Hash Maps ─────────────────────────────────────────────────────
  q('hashMaps', 'Hash Map', 'What is the average-case time complexity for lookup in a hash map?',
    'O(1)', ['O(n)', 'O(log n)', 'O(n²)'],
    'With a good hash function and load factor, hash maps provide constant-time lookup on average.',
    'How does hashing avoid scanning all elements during lookup?'),

  q('hashMaps', 'Collision', 'What is chaining in the context of hash maps?',
    'Each bucket stores a list of entries that hash to the same slot',
    ['A form of probing', 'Resizing the hash table', 'A type of hash function'],
    'Chaining handles collisions by linking all entries with the same hash value into a list at that bucket.',
    'When two keys hash to the same bucket, where do they both go with chaining?', 2),

  // ── Backtracking ──────────────────────────────────────────────────
  q('backtracking', 'Backtracking', 'When does a backtracking algorithm prune a branch?',
    'When the current partial solution cannot lead to a valid complete solution',
    ['When the solution is found', 'When the input is sorted', 'When all options are exhausted'],
    'Pruning cuts off branches early when a constraint is violated, avoiding needless exploration.',
    'If you already know the current path can\'t work, do you continue exploring it?'),

  q('backtracking', 'Backtracking', 'What is the key difference between backtracking and brute force?',
    'Backtracking prunes invalid branches early; brute force checks all possibilities',
    ['Backtracking uses recursion; brute force doesn\'t', 'They are the same', 'Brute force is always faster'],
    'Backtracking avoids exploring paths that already violate constraints, making it more efficient than pure brute force.',
    'Does backtracking always explore every possible combination?', 2),

  // ── Trie ──────────────────────────────────────────────────────────
  q('trie', 'Trie', 'What is a Trie primarily used for?',
    'Prefix-based string lookup and storage',
    ['Sorting numbers', 'Graph traversal', 'Finding shortest paths'],
    'A Trie stores strings character by character, making prefix search and autocomplete very efficient.',
    'What structure naturally shares common prefixes across stored strings?'),

  q('trie', 'Trie', 'What is the time complexity of searching for a string of length m in a Trie?',
    'O(m)', ['O(n)', 'O(m log n)', 'O(n × m)'],
    'You traverse exactly m nodes — one per character — regardless of how many strings are stored.',
    'How many nodes do you visit to follow a word of length m in a Trie?', 2),
];

/** All unique topics present in the bank. */
export const ALL_TOPICS = [...new Set(CONCEPT_QUESTIONS.map((q) => q.topic))];
