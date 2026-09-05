/**
 * Centralized theory content for every DSA category.
 * Used by the TheoryPanel component rendered at the bottom of each category page.
 */

export interface TheoryTopic {
  id: string;
  name: string;
  /** Optional complexity badge shown on the topic header. */
  complexity?: string;
  description?: string;
  keyPoints?: string[];
  steps?: string[];
  example?: string;
  codeSnippet?: string;
  applications?: string[];
}

export interface CategoryTheory {
  categoryId: string;
  overview: string;
  topics: TheoryTopic[];
}

export const THEORY_CONTENT: Record<string, CategoryTheory> = {
  sorting: {
    categoryId: 'sorting',
    overview:
      'Sorting arranges elements in a specific order. Understanding each algorithm\'s invariants, stability, and complexity is essential for choosing the right tool.',
    topics: [
      {
        id: 'bubble',
        name: 'Bubble Sort',
        complexity: 'O(n²)',
        description:
          'Bubble Sort repeatedly steps through the array, compares adjacent elements, and swaps them if they are in the wrong order.',
        keyPoints: [
          'Simple but inefficient for large datasets.',
          'Can be optimized with a flag to stop early if the array becomes sorted.',
          'Stable sort: equal elements keep their relative order.',
        ],
        steps: [
          'Start at the beginning of the array.',
          'Compare each pair of adjacent elements.',
          'Swap them if they are out of order.',
          'Repeat until no swaps are needed.',
        ],
        example:
          'Input: [5, 3, 8, 1]\nPass 1: [3, 5, 1, 8]  (8 bubbles to the end)\nPass 2: [3, 1, 5, 8]\nPass 3: [1, 3, 5, 8]',
        applications: ['Educational purposes', 'Small or nearly sorted datasets'],
      },
      {
        id: 'selection',
        name: 'Selection Sort',
        complexity: 'O(n²)',
        description:
          'Selection Sort divides the array into a sorted and unsorted region, then repeatedly selects the minimum element from the unsorted region.',
        keyPoints: [
          'Always performs O(n²) comparisons regardless of input.',
          'Performs exactly n−1 swaps, which is minimal.',
          'Not stable by default (can be made stable with extra effort).',
        ],
        steps: [
          'Find the minimum element in the unsorted part.',
          'Swap it with the first unsorted element.',
          'Expand the sorted boundary by one.',
          'Repeat until the entire array is sorted.',
        ],
        example:
          'Input: [7, 3, 5, 2]\nPass 1: min=2 → [2, 3, 5, 7]\nPass 2: min=3 (already in place)\nPass 3: min=5 (already in place)',
        applications: ['When swaps are expensive', 'Small datasets'],
      },
      {
        id: 'insertion',
        name: 'Insertion Sort',
        complexity: 'O(n²)',
        description:
          'Insertion Sort builds the final sorted array one element at a time by inserting each new element into its correct position.',
        keyPoints: [
          'Efficient for small or nearly sorted data.',
          'Adaptive: best case is O(n) when input is already sorted.',
          'Stable and in-place.',
        ],
        steps: [
          'Assume the first element is sorted.',
          'Pick the next element and compare it with elements in the sorted part.',
          'Shift larger elements one position to the right.',
          'Insert the element into its correct position.',
        ],
        example:
          'Input: [4, 2, 7, 1]\nStep 1: [2, 4, 7, 1]\nStep 2: [2, 4, 7, 1] (7 in place)\nStep 3: [1, 2, 4, 7]',
        applications: ['Nearly sorted data', 'Small arrays', 'Online algorithms'],
      },
      {
        id: 'merge',
        name: 'Merge Sort',
        complexity: 'O(n log n)',
        description:
          'Merge Sort is a divide-and-conquer algorithm that splits the array in half, recursively sorts each half, and merges them.',
        keyPoints: [
          'Guaranteed O(n log n) time in all cases.',
          'Requires O(n) auxiliary space.',
          'Stable sort.',
        ],
        steps: [
          'Divide the array into two halves.',
          'Recursively sort each half.',
          'Merge the two sorted halves into one.',
        ],
        example:
          'Input: [38, 27, 43, 3]\nDivide: [38,27] [43,3]\nSort: [27,38] [3,43]\nMerge: [3, 27, 38, 43]',
        applications: ['Linked lists', 'External sorting', 'Stable sorting required'],
      },
      {
        id: 'quick',
        name: 'Quick Sort',
        complexity: 'O(n log n) avg',
        description:
          'Quick Sort picks a pivot, partitions the array around it, and recursively sorts the subarrays.',
        keyPoints: [
          'Very fast in practice due to good cache performance.',
          'Worst case is O(n²) with poor pivot choices.',
          'Not stable; in-place with O(log n) stack space.',
        ],
        steps: [
          'Choose a pivot element.',
          'Partition so smaller elements are left and larger are right.',
          'Recursively sort the left and right partitions.',
        ],
        example:
          'Input: [8, 3, 1, 7, 0, 10, 2], pivot=2\nPartition: [0, 1, 2, 7, 3, 10, 8]\nRecursively sort [0,1] and [7,3,10,8]',
        applications: ['General-purpose sorting', 'Systems with memory constraints'],
      },
      {
        id: 'heap',
        name: 'Heap Sort',
        complexity: 'O(n log n)',
        description:
          'Heap Sort builds a max heap and repeatedly extracts the maximum element to produce a sorted array.',
        keyPoints: [
          'In-place sorting with O(1) extra space.',
          'Not stable.',
          'Guaranteed O(n log n) time.',
        ],
        steps: [
          'Build a max heap from the input array.',
          'Swap the root (max) with the last element.',
          'Heapify the reduced heap.',
          'Repeat until the heap is empty.',
        ],
        example:
          'Input: [4, 10, 3, 5, 1]\nMax heap: [10, 5, 3, 4, 1]\nSwap 10↔1 → [1,5,3,4,10]\nHeapify → [5,4,3,1,10]\nRepeat until sorted',
        applications: ['Priority queue implementations', 'When O(1) extra space matters'],
      },
      {
        id: 'shell',
        name: 'Shell Sort',
        complexity: 'O(n log² n)',
        description:
          'Shell Sort generalizes insertion sort by comparing and swapping elements that are far apart, then reducing the gap.',
        keyPoints: [
          'Performance depends heavily on the gap sequence.',
          'In-place and easy to implement.',
          'Not stable.',
        ],
        steps: [
          'Choose a gap sequence (e.g., n/2, n/4, ..., 1).',
          'Perform insertion sort on elements separated by the gap.',
          'Reduce the gap and repeat until gap = 1.',
        ],
        example:
          'Input: [35, 33, 42, 10, 14], gap=2\nSort subsequences [35,42,14] and [33,10]\nThen gap=1 final insertion sort',
        applications: ['Embedded systems', 'When simple code with good average performance is needed'],
      },
      {
        id: 'counting',
        name: 'Counting Sort',
        complexity: 'O(n + k)',
        description:
          'Counting Sort counts the occurrences of each value and uses the counts to determine positions.',
        keyPoints: [
          'Only works for integers or enumerable keys in a small range.',
          'Stable when implemented with prefix sums.',
          'Time depends on the range k of values.',
        ],
        steps: [
          'Find the range of input values.',
          'Count occurrences of each value.',
          'Compute prefix sums to get positions.',
          'Place elements into the output array.',
        ],
        example:
          'Input: [4, 2, 2, 8, 3, 3, 1]\nCount: [0,1,2,2,1,0,0,0,1]\nOutput: [1,2,2,3,3,4,8]',
        applications: ['Sorting integers', 'Subroutine in radix sort'],
      },
      {
        id: 'radix',
        name: 'Radix Sort',
        complexity: 'O(d·(n + k))',
        description:
          'Radix Sort sorts numbers digit by digit, typically using counting sort as a stable subroutine.',
        keyPoints: [
          'Stable sort.',
          'Processes digits from least significant to most significant (LSD) or vice versa.',
          'Efficient when the number of digits d is small.',
        ],
        steps: [
          'Determine the maximum number of digits d.',
          'For each digit position from LSD to MSD, sort using a stable sort.',
        ],
        example:
          'Input: [170, 45, 75, 90, 802, 24, 2, 66]\nBy ones: [170,90,802,2,24,45,75,66]\nBy tens: [802,2,24,45,66,170,75,90]\nBy hundreds: [2,24,45,66,75,90,170,802]',
        applications: ['Sorting integers', 'String sorting', 'Large datasets with fixed-length keys'],
      },
      {
        id: 'bucket',
        name: 'Bucket Sort',
        complexity: 'O(n + k) avg',
        description:
          'Bucket Sort distributes elements into a number of buckets, sorts each bucket individually, then concatenates.',
        keyPoints: [
          'Best performance when input is uniformly distributed.',
          'Can degrade to O(n²) if all elements fall into one bucket.',
          'Often combined with insertion sort for small buckets.',
        ],
        steps: [
          'Create empty buckets.',
          'Distribute elements into buckets based on value range.',
          'Sort each bucket.',
          'Concatenate the buckets.',
        ],
        example:
          'Input: [0.42, 0.32, 0.82, 0.12, 0.52]\nBuckets: [0.12], [0.32], [0.42,0.52], [], [0.82]\nConcatenate: [0.12,0.32,0.42,0.52,0.82]',
        applications: ['Floating-point sorting', 'Histogram generation'],
      },
    ],
  },

  arrays: {
    categoryId: 'arrays',
    overview:
      'Array techniques form the foundation of problem solving: scanning, two pointers, sliding windows, and prefix sums turn brute force into efficient solutions.',
    topics: [
      {
        id: 'linearSearch',
        name: 'Linear Search',
        complexity: 'O(n)',
        description:
          'Linear Search scans each element sequentially until the target is found or the array ends.',
        keyPoints: [
          'Works on unsorted arrays.',
          'Best case O(1), worst and average O(n).',
          'Simple to implement.',
        ],
        example: 'Array [4, 2, 7, 1, 9], target=7\nCheck 4, 2, then 7 → found at index 2.',
        applications: ['Small datasets', 'Unsorted data'],
      },
      {
        id: 'kadane',
        name: "Kadane's Algorithm",
        complexity: 'O(n)',
        description:
          "Kadane's Algorithm finds the maximum sum subarray in a single pass by tracking the best subarray ending at each index.",
        keyPoints: [
          'Greedy DP approach.',
          'At each index, decide whether to extend the previous subarray or start fresh.',
          'Can be modified to track the subarray indices.',
        ],
        example:
          'Array [-2, 1, -3, 4, -1, 2, 1, -5, 4]\ncurrentSum: -2 → 1 → -2 → 4 → 3 → 5 → 6 → 1 → 5\nMax sum = 6 from subarray [4, -1, 2, 1]',
        applications: ['Finance (stock trading)', 'Signal processing'],
      },
      {
        id: 'twoPointer',
        name: 'Two Pointers',
        complexity: 'O(n)',
        description:
          'Two Pointers technique uses two indices that move toward each other or in the same direction to solve problems efficiently.',
        keyPoints: [
          'Requires sorted array for many variants.',
          'Reduces nested loops to a single pass.',
          'Common for pair-sum and palindrome problems.',
        ],
        example:
          'Sorted [1,3,5,8,11], target=13\nleft=0(1), right=4(11) → sum=12 < 13 → move left\nleft=1(3), right=4(11) → sum=14 > 13 → move right\nleft=1(3), right=3(8) → sum=11 < 13 → move left\nleft=2(5), right=3(8) → sum=13 ✓',
        applications: ['Pair sum', 'Container with most water', '3Sum'],
      },
      {
        id: 'slidingWindow',
        name: 'Sliding Window',
        complexity: 'O(n)',
        description:
          'Sliding Window maintains a subarray or substring that satisfies a condition and slides it across the input.',
        keyPoints: [
          'Avoids recomputing overlapping parts.',
          'Works for fixed-size and variable-size windows.',
          'Useful for substring/subarray problems.',
        ],
        example:
          'Array [2,1,5,3,6], k=3\nWindow [2,1,5] sum=8\nSlide: [1,5,3] sum=9\nSlide: [5,3,6] sum=14\nMax = 14',
        applications: ['Maximum subarray of size k', 'Longest substring without repeats'],
      },
      {
        id: 'rotation',
        name: 'Array Rotation',
        complexity: 'O(n)',
        description:
          'Array Rotation shifts elements left or right. The reversal algorithm rotates in-place with three reversals.',
        keyPoints: [
          'Reversal method uses O(1) extra space.',
          'Rotate left by k: reverse first k, reverse rest, reverse all.',
          'Effective k = k % n to avoid full rotations.',
        ],
        example:
          'Rotate [1,2,3,4,5] left by 2\nReverse [0..1]: [2,1,3,4,5]\nReverse [2..4]: [2,1,5,4,3]\nReverse all: [3,4,5,1,2]',
        applications: ['Circular buffers', 'String rotations'],
      },
      {
        id: 'prefixSum',
        name: 'Prefix Sum',
        complexity: 'O(n) build, O(1) query',
        description:
          'Prefix Sum preprocesses an array so that range sum queries can be answered in constant time.',
        keyPoints: [
          'prefix[i] = sum of arr[0..i-1].',
          'Range sum [l..r] = prefix[r+1] - prefix[l].',
          'Can be extended to 2D arrays.',
        ],
        example:
          'Array [3,1,4,1,5]\nPrefix: [0,3,4,8,9,14]\nSum of indices 1..3 = prefix[4] - prefix[1] = 9 - 3 = 6',
        applications: ['Range sum queries', 'Subarray sum equals k'],
      },
    ],
  },

  strings: {
    categoryId: 'strings',
    overview:
      'String algorithms exploit patterns, frequencies, and two-pointer techniques to solve text-processing problems efficiently.',
    topics: [
      {
        id: 'palindrome',
        name: 'Palindrome Check',
        complexity: 'O(n)',
        description:
          'A palindrome reads the same forwards and backwards. The two-pointer approach verifies this in linear time.',
        keyPoints: [
          'Compare characters from both ends moving inward.',
          'Handle case sensitivity and non-alphanumeric characters as needed.',
        ],
        example: 'Check "racecar"\nCompare r-r, a-a, c-c, e-e → palindrome.',
        applications: ['Text validation', 'DNA sequence analysis'],
      },
      {
        id: 'anagram',
        name: 'Anagram Check',
        complexity: 'O(n)',
        description:
          'Anagrams contain the same characters with the same frequencies. Frequency maps make checking efficient.',
        keyPoints: [
          'Sort both strings and compare for O(n log n).',
          'Use a frequency counter for O(n) time and O(1) space (fixed alphabet).',
        ],
        example: '"listen" vs "silent"\nBoth have l:1, i:1, s:1, t:1, e:1, n:1 → anagrams.',
        applications: ['Word games', 'Cryptography'],
      },
      {
        id: 'reverse',
        name: 'String Reversal',
        complexity: 'O(n)',
        description:
          'Reversing a string can be done in-place with two pointers or by building a new string.',
        keyPoints: [
          'Two-pointer swap is in-place for mutable arrays.',
          'Immutable strings require O(n) extra space.',
        ],
        example: '"hello" → two-pointer swap → "olleh"',
        applications: ['Palindrome detection', 'String manipulation'],
      },
      {
        id: 'frequency',
        name: 'Frequency Count',
        complexity: 'O(n)',
        description:
          'Frequency counts map each character to its occurrences and enable many string analytics.',
        keyPoints: [
          'Use an array for fixed alphabets or a hash map for Unicode.',
          'Enables anagram, first unique character, and compression problems.',
        ],
        example: '"banana" → {b:1, a:3, n:2}',
        applications: ['Compression', 'Pattern matching'],
      },
    ],
  },

  linkedList: {
    categoryId: 'linkedList',
    overview:
      'Linked lists store elements in nodes connected by pointers. They enable efficient insertion and deletion but sacrifice random access.',
    topics: [
      {
        id: 'singly',
        name: 'Singly Linked List',
        complexity: 'O(n) search, O(1) head insert',
        description:
          'Each node holds data and a pointer to the next node. Traversal is sequential from the head.',
        keyPoints: [
          'Dynamic size.',
          'No random access.',
          'Insertion at head is O(1).',
        ],
        applications: ['Implementing stacks/queues', 'Undo functionality'],
      },
      {
        id: 'reverse',
        name: 'Reverse Linked List',
        complexity: 'O(n)',
        description:
          'Reverse a linked list iteratively by rewiring next pointers to point to the previous node.',
        keyPoints: [
          'Use three pointers: prev, curr, next.',
          'Iterative version uses O(1) extra space.',
        ],
        example: '1 → 2 → 3 → null\nReverse: 3 → 2 → 1 → null',
        applications: ['Palindrome detection', 'Reordering lists'],
      },
      {
        id: 'middleNode',
        name: 'Find Middle Node',
        complexity: 'O(n)',
        description:
          'The slow/fast pointer technique finds the middle in a single pass.',
        keyPoints: [
          'Slow moves one step, fast moves two steps.',
          'When fast reaches the end, slow is at the middle.',
        ],
        example: '1 → 2 → 3 → 4 → 5\nSlow stops at 3.',
        applications: ['Merge sort on linked lists', 'Cycle detection'],
      },
      {
        id: 'detectCycle',
        name: 'Cycle Detection (Floyd)',
        complexity: 'O(n)',
        description:
          "Floyd's Cycle-Finding Algorithm uses two pointers moving at different speeds to detect a loop.",
        keyPoints: [
          'If there is a cycle, fast and slow pointers will eventually meet.',
          'After meeting, reset one pointer to head and move both one step to find the cycle start.',
        ],
        example: '1 → 2 → 3 → 4 → 2 (cycle)\nFast and slow meet inside cycle.',
        applications: ['Memory leak detection', 'Duplicate number detection'],
      },
      {
        id: 'doubly',
        name: 'Doubly Linked List',
        complexity: 'O(n) search, O(1) insert/delete given node',
        description:
          'Each node stores both next and previous pointers, allowing bidirectional traversal.',
        keyPoints: [
          'More memory per node.',
          'Allows reverse traversal.',
          'Useful for navigation history and LRU caches.',
        ],
        applications: ['Browser history', 'LRU cache'],
      },
      {
        id: 'circular',
        name: 'Circular Linked List',
        complexity: 'O(n)',
        description:
          'The last node points back to the head, forming a circle.',
        keyPoints: [
          'Useful for round-robin scheduling.',
          'Traversal must avoid infinite loops.',
        ],
        applications: ['CPU scheduling', 'Multiplayer game turns'],
      },
    ],
  },

  stackQueue: {
    categoryId: 'stackQueue',
    overview:
      'Stacks (LIFO) and queues (FIFO) are fundamental linear structures that underpin expression evaluation, scheduling, and graph traversals.',
    topics: [
      {
        id: 'stack',
        name: 'Stack Primitive (LIFO)',
        complexity: 'O(1) push/pop',
        description:
          'A stack supports push and pop at one end only; the last element in is the first out.',
        keyPoints: [
          'Can be implemented with arrays or linked lists.',
          'Applications include recursion simulation and backtracking.',
        ],
        applications: ['Function call stack', 'Undo operations', 'DFS'],
      },
      {
        id: 'queue',
        name: 'Queue Primitive (FIFO)',
        complexity: 'O(1) enqueue/dequeue',
        description:
          'A queue inserts at the rear and removes from the front; the first in is the first out.',
        keyPoints: [
          'Array implementation needs circular buffer for O(1) operations.',
          'Linked list implementation is naturally O(1).',
        ],
        applications: ['BFS', 'Print queues', 'CPU scheduling'],
      },
      {
        id: 'validParentheses',
        name: 'Valid Parentheses',
        complexity: 'O(n)',
        description:
          'Use a stack to match opening and closing brackets in the correct order.',
        keyPoints: [
          'Push opening brackets.',
          'On closing bracket, check it matches the top of the stack.',
        ],
        example: '"{[()]}" → valid\n"{[(])}" → invalid',
        applications: ['Compiler syntax checking', 'Expression validation'],
      },
      {
        id: 'minStack',
        name: 'Min Stack O(1)',
        complexity: 'O(1)',
        description:
          'A stack that supports push, pop, and retrieving the minimum element in constant time.',
        keyPoints: [
          'Store pairs (value, current minimum) on the stack.',
          'Alternatively maintain a separate min-tracking stack.',
        ],
        applications: ['Sliding window minimums', 'Real-time statistics'],
      },
      {
        id: 'postfixEval',
        name: 'Evaluate RPN / Postfix',
        complexity: 'O(n)',
        description:
          'Reverse Polish Notation is evaluated with a stack: push operands, apply operators to the top two values.',
        keyPoints: [
          'No parentheses needed.',
          'Stack naturally handles operator precedence.',
        ],
        example: '"3 4 + 2 *" → ((3+4)*2) = 14',
        applications: ['Calculator implementations', 'Expression compilers'],
      },
      {
        id: 'dailyTemperatures',
        name: 'Daily Temperatures',
        complexity: 'O(n)',
        description:
          'Monotonic stack tracks indices of temperatures waiting for a warmer day.',
        keyPoints: [
          'Maintain a decreasing stack.',
          'When a warmer day appears, pop and compute the wait.',
        ],
        example: 'T = [73,74,75,71,69,72,76,73]\nOutput: [1,1,4,2,1,1,0,0]',
        applications: ['Stock span', 'Next greater element'],
      },
      {
        id: 'trappingRainWater',
        name: 'Trapping Rain Water',
        complexity: 'O(n)',
        description:
          'Compute water trapped between bars using precomputed left/right maxima or two pointers.',
        keyPoints: [
          'Water at index i = min(maxLeft, maxRight) - height[i].',
          'Two-pointer version uses O(1) space.',
        ],
        example: 'Height [0,1,0,2,1,0,1,3,2,1,2,1] → trapped = 6',
        applications: ['Terrain water retention', 'Histogram problems'],
      },
      {
        id: 'largestRectangle',
        name: 'Largest Rectangle in Histogram',
        complexity: 'O(n)',
        description:
          'Use a monotonic stack to find the largest rectangular area in a histogram.',
        keyPoints: [
          'Push indices with increasing heights.',
          'When a smaller height appears, pop and calculate area.',
        ],
        example: 'Heights [2,1,5,6,2,3] → largest area = 10',
        applications: ['Image processing', 'Stock analysis'],
      },
      {
        id: 'rottingOranges',
        name: 'Rotting Oranges BFS Grid',
        complexity: 'O(m·n)',
        description:
          'Multi-source BFS spreads rotting oranges level by level to find the minimum time.',
        keyPoints: [
          'Enqueue all initially rotten oranges.',
          'Process level by level counting minutes.',
        ],
        example: 'Fresh oranges become rotten only if adjacent to rotten ones each minute.',
        applications: ['Infection spread simulation', 'Grid propagation'],
      },
      {
        id: 'simplifyPath',
        name: 'Simplify Path',
        complexity: 'O(n)',
        description:
          'Canonicalize a Unix path by splitting on "/" and using a stack: names push, ".." pops, "." is skipped.',
        keyPoints: [
          '".." at the root does nothing — the stack is checked before popping.',
          'Multiple and trailing slashes produce empty tokens, which are skipped.',
        ],
        example: '"/a/./b/../../c/" → "/c"',
        applications: ['Filesystem navigation', 'URL normalization'],
      },
      {
        id: 'removeAdjacentDuplicates',
        name: 'Remove Adjacent Duplicates',
        complexity: 'O(n)',
        description:
          'Repeatedly remove pairs of adjacent equal characters; a stack makes the cascading removals automatic.',
        keyPoints: [
          'Push when the character differs from the top.',
          'Pop when it matches — the incoming character is never pushed.',
          'Newly exposed tops can match later characters, so removals cascade.',
        ],
        example: '"abbaca" → "ca"',
        applications: ['Text editors', 'Syntax simplification'],
      },
      {
        id: 'basicCalculator',
        name: 'Basic Calculator',
        complexity: 'O(n)',
        description:
          'Evaluate expressions with +, −, and parentheses using a context stack that saves (result, sign) at each "(".',
        keyPoints: [
          '"(" pushes the running result and pending sign, then resets.',
          '")" pops the context and folds the inner value back in.',
          'Multi-digit numbers are built one digit at a time.',
        ],
        example: '"2-(3+4)" → 2 − 7 = −5',
        applications: ['Expression parsers', 'Spreadsheet engines'],
      },
      {
        id: 'decodeString',
        name: 'Decode String',
        complexity: 'O(n · repeat)',
        description:
          'Decode nested patterns like "3[a2[c]]" with two parallel stacks: repeat counts and outer string segments.',
        keyPoints: [
          '"[" pushes (current string, repeat count) as a pair.',
          '"]" pops both, repeats the segment, and prepends the outer string.',
          'Counts can be multi-digit, like "12[ab]".',
        ],
        example: '"3[a2[c]]" → "accaccacc"',
        applications: ['Data decompression', 'Template expansion'],
      },
      {
        id: 'queueViaStacks',
        name: 'Queue via Two Stacks',
        complexity: 'O(1) amortized',
        description:
          'Implement FIFO with two LIFO stacks: an input stack for enqueue and an output stack for dequeue.',
        keyPoints: [
          'Transfer only when the output stack is empty.',
          'The transfer reverses arrival order, putting the oldest value on top.',
          'Each element moves at most twice → amortized O(1).',
        ],
        example: 'Enqueue 1,2,3 → dequeue returns 1',
        applications: ['Queue libraries', 'Message buffering'],
      },
      {
        id: 'stackViaQueues',
        name: 'Stack via Two Queues',
        complexity: 'O(n) push, O(1) pop',
        description:
          'Implement LIFO with two FIFO queues by making push expensive: rotate the new value to the front.',
        keyPoints: [
          'Push enqueues into the empty aux queue, then drains the main queue in behind it.',
          'Swapping the queues leaves the newest value at the front — the stack top.',
          'Pop is then a single O(1) dequeue.',
        ],
        example: 'Push 1,2,3 → pop returns 3',
        applications: ['Stack emulation', 'Interview fundamentals'],
      },
      {
        id: 'circularQueue',
        name: 'Circular Queue',
        complexity: 'O(1) per operation',
        description:
          'A fixed-capacity queue that wraps rear and front indices with modulo arithmetic, reusing freed slots.',
        keyPoints: [
          'REAR = (rear + 1) % capacity on enqueue.',
          'Wraparound avoids the O(n) shifting of a naive array queue.',
          'A size counter distinguishes full from empty.',
        ],
        example: 'Capacity 3 full → dequeue frees slot 0 → enqueue wraps into it',
        applications: ['Ring buffers', 'Keyboard buffers', 'Streaming'],
      },
      {
        id: 'circularDeque',
        name: 'Circular Deque',
        complexity: 'O(1) per operation',
        description:
          'A double-ended queue on a ring buffer: insert and delete at both ends with wraparound.',
        keyPoints: [
          'Front moves with (front − 1 + capacity) % capacity.',
          'FRONT and REAR wrap in opposite directions.',
          'Overflow and underflow checks guard every operation.',
        ],
        example: 'insertFront(1), insertLast(2), deleteLast() → [1]',
        applications: ['Sliding windows', 'Undo/redo history', 'CPU scheduling'],
      },
      {
        id: 'slidingWindow',
        name: 'Sliding Window Maximum',
        complexity: 'O(n)',
        description:
          'A monotonic deque of indices tracks the maximum of every window of size k in a single pass.',
        keyPoints: [
          'The front of the deque is always the current window maximum.',
          'Smaller values are evicted from the back before inserting.',
          'Out-of-window indices are evicted from the front.',
        ],
        example: '[1,3,-1,-3,5,3,6,7], k=3 → [3,3,5,5,6,7]',
        applications: ['Real-time analytics', 'Stock tickers', 'Rate limiting'],
      },
      {
        id: 'firstNonRepeating',
        name: 'First Non-Repeating Character',
        complexity: 'O(n)',
        description:
          'Track the first non-repeating character of a growing stream with a candidate queue and a frequency map.',
        keyPoints: [
          'A first sighting enqueues the character.',
          'Cleanup is lazy: repeated heads are dequeued only when they reach the front.',
          'Every step is O(1); the head is always the current answer.',
        ],
        example: 'Stream "aabc" → a, -, b, b',
        applications: ['Stream analytics', 'Chat badges'],
      },
      {
        id: 'movingAverage',
        name: 'Moving Average from Stream',
        complexity: 'O(1) per value',
        description:
          'Maintain the average of the last k stream values with a window queue and a running sum.',
        keyPoints: [
          'Add the incoming value to the sum, subtract the evicted one.',
          'One add and one subtract — never a re-add of the whole window.',
          'The queue holds the window; the sum holds the total.',
        ],
        example: '[1,10,3,5], k=3 → 1.0, 5.5, 4.67, 6.0',
        applications: ['Sensor smoothing', 'Financial indicators', 'Load metrics'],
      },
      {
        id: 'taskScheduler',
        name: 'Task Scheduler',
        complexity: 'O(n log k)',
        description:
          'Schedule tasks with a cooldown between identical tasks; greedy always runs the highest-count ready task.',
        keyPoints: [
          'Ready tasks are ordered by remaining count.',
          'Executing a task starts its cooldown timer.',
          'When nothing is ready, the CPU idles one tick.',
        ],
        example: 'AAABBB, n=2 → A B · A B · A B → 8 ticks',
        applications: ['CPU scheduling', 'Rate-limited API calls'],
      },
      {
        id: 'dota2Senate',
        name: 'Dota2 Senate',
        complexity: 'O(n log n)',
        description:
          'Two queues simulate round-robin voting; the senator with the earlier index bans an opponent each round.',
        keyPoints: [
          'The fronts of both party queues compare original indices.',
          'The winner re-enqueues with index + n for the next round.',
          'A party wins when the opponent queue empties.',
        ],
        example: '"RD" → R bans D → Radiant wins',
        applications: ['Turn-based simulation', 'Voting systems'],
      },
    ],
  },

  binarySearch: {
    categoryId: 'binarySearch',
    overview:
      'Binary search halves the search space each step, turning O(n) scans into O(log n) lookups on sorted or monotonic data.',
    topics: [
      {
        id: 'binarySearch',
        name: 'Classic Binary Search',
        complexity: 'O(log n)',
        description:
          'Find a target in a sorted array by repeatedly comparing with the middle element and halving the range.',
        keyPoints: [
          'Requires sorted input.',
          'Avoid overflow when computing mid: use lo + (hi - lo) / 2.',
          'Terminate when lo > hi.',
        ],
        example:
          'Array [1,3,5,7,9,11], target=7\nlo=0, hi=5, mid=2 (5) → go right\nlo=3, hi=5, mid=4 (9) → go left\nlo=3, hi=3, mid=3 (7) → found',
        applications: ['Dictionary lookup', 'Database indexing'],
      },
      {
        id: 'lowerBound',
        name: 'Lower Bound (First >= X)',
        complexity: 'O(log n)',
        description:
          'Find the first position where the value is greater than or equal to the target.',
        keyPoints: [
          'Move hi left when mid satisfies the condition.',
          'Answer is usually lo after the loop.',
        ],
        example: '[1,3,3,5,7], x=3 → lower bound index 1',
        applications: ['Insertion position', 'Range queries'],
      },
      {
        id: 'upperBound',
        name: 'Upper Bound (First > X)',
        complexity: 'O(log n)',
        description:
          'Find the first position where the value is strictly greater than the target.',
        keyPoints: [
          'Similar to lower bound but with strict inequality.',
          'Gives the end of the equal-value range.',
        ],
        example: '[1,3,3,5,7], x=3 → upper bound index 3',
        applications: ['Counting occurrences', 'Range queries'],
      },
      {
        id: 'searchRotatedArray',
        name: 'Rotated Sorted Array',
        complexity: 'O(log n)',
        description:
          'Search in a sorted array that has been rotated at some pivot. Determine which half is sorted each iteration.',
        keyPoints: [
          'One half is always sorted.',
          'Check if target lies within the sorted half.',
        ],
        example: '[4,5,6,7,0,1,2], target=0\nMid=7, left half sorted, 0 not in it → search right.',
        applications: ['Rotated logs', 'Circular buffers'],
      },
      {
        id: 'findPeakElement',
        name: 'Find Peak Element',
        complexity: 'O(log n)',
        description:
          'Find an index where the element is greater than its neighbors using binary search on monotonic slopes.',
        keyPoints: [
          'Move toward the larger neighbor.',
          'Guaranteed to find a peak.',
        ],
        example: '[1,2,3,1] → peak index 2 (value 3)',
        applications: ['Local maxima', 'Optimization landscapes'],
      },
    ],
  },

  hashMaps: {
    categoryId: 'hashMaps',
    overview:
      'Hash maps provide average-case O(1) insertion, deletion, and lookup by mapping keys to array indices via a hash function.',
    topics: [
      {
        id: 'twoSum',
        name: 'Two Sum',
        complexity: 'O(n)',
        description:
          'Find two indices whose values sum to a target using a hash map to store seen values.',
        keyPoints: [
          'For each value, check if complement (target - value) exists.',
          'Single pass with hash map.',
        ],
        example: 'Array [2,7,11,15], target=9\ni=0: complement 7 not seen\ni=1: complement 2 seen at index 0 → [0,1]',
        applications: ['Pair matching', 'Financial transactions'],
      },
      {
        id: 'duplicateDetect',
        name: 'Duplicate Detect',
        complexity: 'O(n)',
        description:
          'Detect duplicates in an array by tracking elements in a hash set.',
        keyPoints: [
          'Insert each element into a set.',
          'If insertion fails, a duplicate exists.',
        ],
        example: '[1,2,3,2,4] → duplicate 2',
        applications: ['Data cleaning', 'Voter fraud detection'],
      },
      {
        id: 'frequencyMap',
        name: 'Frequency Map',
        complexity: 'O(n)',
        description:
          'Count occurrences of each element using a hash map keyed by element value.',
        keyPoints: [
          'Iterate once and increment counts.',
          'Supports mode, anagram, and majority element problems.',
        ],
        example: '[1,2,2,3,3,3] → {1:1, 2:2, 3:3}',
        applications: ['Statistics', 'Compression'],
      },
      {
        id: 'subarraySum',
        name: 'Subarray Sum',
        complexity: 'O(n)',
        description:
          'Count subarrays with a given sum by tracking prefix sums and their frequencies.',
        keyPoints: [
          'If prefix[j] - prefix[i] = k, then subarray (i+1..j) sums to k.',
          'Use a map from prefix sum to count.',
        ],
        example: '[1,2,3], k=3\nPrefix sums: 0,1,3,6\nPairs with difference 3: (0,3), (3,6) → 2 subarrays',
        applications: ['Financial analysis', 'Signal processing'],
      },
    ],
  },

  bst: {
    categoryId: 'bst',
    overview:
      'Trees organize hierarchical data. Binary Search Trees, AVL trees, heaps, and tries each optimize different access patterns.',
    topics: [
      {
        id: 'bst',
        name: 'Binary Search Tree (BST)',
        complexity: 'O(h) ops',
        description:
          'A BST maintains the invariant that left children are smaller and right children are larger than their parent.',
        keyPoints: [
          'Inorder traversal yields sorted order.',
          'Height h determines operation cost: O(log n) balanced, O(n) skewed.',
          'Search, insert, delete follow the BST property.',
        ],
        applications: ['Ordered map', 'Database indexing'],
      },
      {
        id: 'avl',
        name: 'AVL Tree (Self-Balancing)',
        complexity: 'O(log n)',
        description:
          'AVL trees maintain a balance factor in {-1,0,1} by performing rotations after insertions and deletions.',
        keyPoints: [
          'Guarantees O(log n) height.',
          'Rotations restore balance in O(1).',
          'Four rotation cases: LL, RR, LR, RL.',
        ],
        applications: ['In-memory databases', 'Real-time systems'],
      },
      {
        id: 'heap',
        name: 'Binary Heap (Priority Queue)',
        complexity: 'O(log n) insert/extract',
        description:
          'A complete binary tree where each node satisfies the heap property (max-heap or min-heap).',
        keyPoints: [
          'Array representation: parent at i, children at 2i+1 and 2i+2.',
          'Heapify restores the heap property in O(log n).',
          'Peek min/max is O(1).',
        ],
        applications: ['Priority queues', 'Heap sort', 'Dijkstra'],
      },
      {
        id: 'trie',
        name: 'Trie (Prefix Tree)',
        complexity: 'O(m) insert/search',
        description:
          'A trie stores strings in a tree of characters, enabling efficient prefix-based queries.',
        keyPoints: [
          'Each edge represents a character.',
          'Nodes mark the end of a word.',
          'Space can be high: O(ALPHABET_SIZE × m × N).',
        ],
        applications: ['Autocomplete', 'Spell checking', 'IP routing'],
      },
    ],
  },

  graph: {
    categoryId: 'graph',
    overview:
      'Graph algorithms traverse, search, and optimize relationships modeled as vertices and edges.',
    topics: [
      {
        id: 'bfs',
        name: 'Breadth-First Search (BFS)',
        complexity: 'O(V + E)',
        description:
          'BFS explores all vertices at the present depth before moving on to vertices at the next depth level.',
        keyPoints: [
          'Uses a queue.',
          'Finds shortest path in unweighted graphs.',
          'Tracks visited vertices to avoid cycles.',
        ],
        example: 'Graph A-B, A-C, B-D, C-D\nQueue: A → B,C → D\nOrder: A, B, C, D',
        applications: ['Shortest path', 'Social networks', 'Web crawling'],
      },
      {
        id: 'dfs',
        name: 'Depth-First Search (DFS)',
        complexity: 'O(V + E)',
        description:
          'DFS explores as far as possible along each branch before backtracking.',
        keyPoints: [
          'Uses a stack (explicit or recursion).',
          'Useful for cycle detection and topological sort.',
          'Can get stuck in deep paths.',
        ],
        example: 'Graph A-B, A-C, B-D, C-D\nDFS from A: A → B → D → C',
        applications: ['Maze solving', 'Cycle detection', 'Topological sort'],
      },
      {
        id: 'dijkstra',
        name: "Dijkstra's Shortest Path",
        complexity: 'O((V+E) log V)',
        description:
          "Dijkstra's algorithm finds the shortest path from a source to all other vertices in a weighted graph with non-negative edges.",
        keyPoints: [
          'Greedy: always expand the closest unvisited vertex.',
          'Use a min-heap for efficient extraction.',
          'Fails with negative weights.',
        ],
        example: 'A→B(4), A→C(2), C→B(1)\nShortest A→B = 3 via C',
        applications: ['GPS navigation', 'Network routing'],
      },
      {
        id: 'prim',
        name: "Prim's Minimum Spanning Tree",
        complexity: 'O((V+E) log V)',
        description:
          "Prim's algorithm grows an MST by adding the cheapest edge from the tree to a non-tree vertex.",
        keyPoints: [
          'Greedy edge selection.',
          'Use a min-heap keyed by minimum edge weight.',
        ],
        example: 'Triangle A-B(1), B-C(2), A-C(3)\nPick A-B(1), then B-C(2). MST weight = 3.',
        applications: ['Network design', 'Cluster analysis'],
      },
      {
        id: 'topoSort',
        name: 'Topological Sort (Kahn)',
        complexity: 'O(V + E)',
        description:
          'Topological Sort orders vertices in a DAG so every directed edge goes from earlier to later.',
        keyPoints: [
          'Only defined for DAGs.',
          "Kahn's algorithm repeatedly removes vertices with in-degree 0.",
        ],
        example: 'DAG A→B, A→C, B→D, C→D\nOrder: A, B, C, D',
        applications: ['Task scheduling', 'Course prerequisites', 'Compilation order'],
      },
    ],
  },

  recursion: {
    categoryId: 'recursion',
    overview:
      'Recursion solves problems by breaking them into smaller self-similar subproblems and combining their results.',
    topics: [
      {
        id: 'factorial',
        name: 'Factorial',
        complexity: 'O(n)',
        description:
          'n! = n × (n-1)! with base case 0! = 1.',
        keyPoints: [
          'Each recursive call reduces n by 1.',
          'Stack depth is O(n).',
        ],
        example: '5! = 5 × 4! = 5 × 4 × 3 × 2 × 1 = 120',
        applications: ['Combinatorics', 'Probability'],
      },
      {
        id: 'fibonacci',
        name: 'Fibonacci',
        complexity: 'O(2ⁿ) naive, O(n) memoized',
        description:
          'Fibonacci numbers are defined by F(n) = F(n-1) + F(n-2).',
        keyPoints: [
          'Naive recursion recomputes values many times.',
          'Memoization reduces time to O(n).',
        ],
        example: 'F(5) = F(4) + F(3) = 5',
        applications: ['Dynamic programming intro', 'Nature modeling'],
      },
      {
        id: 'power',
        name: 'Power',
        complexity: 'O(log n)',
        description:
          'Compute xⁿ efficiently using divide-and-conquer: xⁿ = (xⁿ/²)² for even n.',
        keyPoints: [
          'Halves the exponent each step.',
          'Handles negative exponents with reciprocal.',
        ],
        example: '2¹⁰ = (2⁵)² = (2×2⁴)² = 1024',
        applications: ['Modular arithmetic', 'Cryptography'],
      },
      {
        id: 'arraySum',
        name: 'Array Sum',
        complexity: 'O(n)',
        description:
          'Sum all elements recursively by adding the first element to the sum of the rest.',
        keyPoints: [
          'Base case: empty array returns 0.',
          'Tail-recursive version possible.',
        ],
        example: 'sum([1,2,3,4]) = 1 + sum([2,3,4]) = 10',
        applications: ['Functional programming', 'Divide-and-conquer basics'],
      },
      {
        id: 'towerOfHanoi',
        name: 'Tower of Hanoi',
        complexity: 'O(2ⁿ)',
        description:
          'Move n disks from one peg to another following size ordering rules.',
        keyPoints: [
          'Move n-1 disks to auxiliary peg.',
          'Move largest disk to target.',
          'Move n-1 disks to target.',
        ],
        example: 'For 3 disks, minimum moves = 2³ - 1 = 7',
        applications: ['Puzzle solving', 'Recursion teaching'],
      },
    ],
  },

  backtracking: {
    categoryId: 'backtracking',
    overview:
      'Backtracking incrementally builds candidates and abandons a candidate as soon as it determines the candidate cannot be completed to a valid solution.',
    topics: [
      {
        id: 'subsets',
        name: 'Subsets',
        complexity: 'O(2ⁿ)',
        description:
          'Generate all subsets by making an include/exclude decision for each element.',
        keyPoints: [
          'Binary choice per element.',
          'Total subsets = 2ⁿ.',
        ],
        example: '[1,2] → [], [1], [2], [1,2]',
        applications: ['Power set', 'Feature selection'],
      },
      {
        id: 'permutations',
        name: 'Permutations',
        complexity: 'O(n!·n)',
        description:
          'Generate all orderings of elements by swapping or selecting the next element.',
        keyPoints: [
          'Total permutations = n!.',
          'Swap-based backtracking is in-place.',
        ],
        example: '[1,2] → [1,2], [2,1]',
        applications: ['Scheduling', 'Anagram generation'],
      },
      {
        id: 'nQueens',
        name: 'N-Queens',
        complexity: 'O(n!)',
        description:
          'Place n queens on an n×n chessboard so no two attack each other.',
        keyPoints: [
          'Place one queen per row.',
          'Check column and diagonal safety.',
        ],
        example: '4-Queens has 2 distinct solutions.',
        applications: ['Constraint satisfaction', 'Chess puzzles'],
      },
      {
        id: 'combinationSum',
        name: 'Combination Sum',
        complexity: 'O(2^t)',
        description:
          'Find combinations of candidates that sum to a target, allowing reuse.',
        keyPoints: [
          'Sort candidates to prune.',
          'Backtrack when remaining target becomes negative.',
        ],
        example: 'candidates [2,3,6,7], target=7 → [[7], [2,2,3]]',
        applications: ['Coin change', 'Subset sum'],
      },
    ],
  },

  greedy: {
    categoryId: 'greedy',
    overview:
      'Greedy algorithms make the locally optimal choice at each step, hoping to find a global optimum. They work when the problem has optimal substructure and the greedy choice property.',
    topics: [
      {
        id: 'activitySelection',
        name: 'Activity Selection',
        complexity: 'O(n log n)',
        description:
          'Select the maximum number of non-overlapping activities by always choosing the activity that ends earliest.',
        keyPoints: [
          'Sort by finish time.',
          'Greedy choice: earliest finishing compatible activity.',
        ],
        example: 'Activities [(1,3),(2,5),(4,6)] → select (1,3) and (4,6)',
        applications: ['Scheduling', 'Resource allocation'],
      },
      {
        id: 'fractionalKnapsack',
        name: 'Fractional Knapsack',
        complexity: 'O(n log n)',
        description:
          'Maximize value in a knapsack by taking items with highest value-to-weight ratio first, allowing fractions.',
        keyPoints: [
          'Sort by value/weight ratio.',
          'Take as much as possible of the best ratio item.',
        ],
        example: 'Items [(v=60,w=10),(v=100,w=20)], capacity=50 → take all of both, value=160',
        applications: ['Cargo loading', 'Investment portfolios'],
      },
      {
        id: 'jobScheduling',
        name: 'Job Scheduling',
        complexity: 'O(n·d)',
        description:
          'Schedule jobs with deadlines and profits to maximize total profit.',
        keyPoints: [
          'Sort jobs by decreasing profit.',
          'Place each job in the latest available slot before its deadline.',
        ],
        example: 'Jobs [(p=20,d=2), (p=15,d=2), (p=10,d=1)] → select first and third',
        applications: ['Task deadlines', 'Project management'],
      },
      {
        id: 'huffmanCoding',
        name: 'Huffman Coding',
        complexity: 'O(n log n)',
        description:
          'Build an optimal prefix-free binary code based on character frequencies.',
        keyPoints: [
          'Use a min-heap to combine lowest-frequency nodes.',
          'Higher-frequency characters get shorter codes.',
        ],
        example: 'a:5, b:9, c:12 → combine a+b first, then with c',
        applications: ['File compression', 'Data transmission'],
      },
    ],
  },

  dp: {
    categoryId: 'dp',
    overview:
      'Dynamic Programming breaks problems into overlapping subproblems, solves each once, and stores results to avoid recomputation.',
    topics: [
      {
        id: 'fibonacciDP',
        name: 'Fibonacci DP',
        complexity: 'O(n) time, O(n) space',
        description:
          'Store Fibonacci values in an array to avoid exponential recomputation.',
        keyPoints: [
          'dp[i] = dp[i-1] + dp[i-2].',
          'Can be optimized to O(1) space.',
        ],
        example: 'dp = [0,1,1,2,3,5,8,13]',
        applications: ['Sequence problems', 'Recursion optimization'],
      },
      {
        id: 'coinChange',
        name: 'Coin Change',
        complexity: 'O(n·amount)',
        description:
          'Find the minimum coins needed to make a given amount.',
        keyPoints: [
          'dp[i] = minimum coins for amount i.',
          'Initialize with infinity except dp[0] = 0.',
        ],
        example: 'Coins [1,3,4], amount=6 → 3+3 = 2 coins',
        applications: ['Currency systems', 'Change-making'],
      },
      {
        id: 'houseRobber',
        name: 'House Robber',
        complexity: 'O(n) time, O(1) space',
        description:
          'Maximize loot from houses where adjacent picks are forbidden: rob(i) = max(rob(i−1), rob(i−2) + value[i]).',
        keyPoints: [
          'At each house: rob it (plus the best up to i−2) or skip it (best up to i−1).',
          'Two rolling variables replace the full dp array.',
          'The recurrence is the template for every non-adjacent selection problem.',
        ],
        example: '[2,7,9,3,1] → 2 + 9 + 1 = 12',
        applications: ['Scheduling with cooldowns', 'Resource selection'],
      },
      {
        id: 'knapsack01',
        name: '0/1 Knapsack',
        complexity: 'O(n·W)',
        description:
          'Select items with maximum value without exceeding weight capacity; each item can be taken once.',
        keyPoints: [
          'dp[i][w] = max value using first i items with capacity w.',
          'Choice: include item i or not.',
        ],
        example: 'Items [(w=2,v=3),(w=3,v=4)], W=5 → value 7',
        applications: ['Resource allocation', 'Portfolio optimization'],
      },
      {
        id: 'lcs',
        name: 'Longest Common Subsequence',
        complexity: 'O(m·n)',
        description:
          'Find the longest subsequence present in both strings.',
        keyPoints: [
          'If characters match: dp[i][j] = dp[i-1][j-1] + 1.',
          'If they differ: dp[i][j] = max(dp[i-1][j], dp[i][j-1]).',
        ],
        example: '"ABCBDAB" and "BDCAB" → LCS "BCAB" (length 4)',
        applications: ['Diff tools', 'Bioinformatics'],
      },
      {
        id: 'lis',
        name: 'Longest Increasing Subsequence',
        complexity: 'O(n²) or O(n log n)',
        description:
          'Find the length of the longest subsequence where elements are strictly increasing.',
        keyPoints: [
          'dp[i] = length of LIS ending at i.',
          'Patience sorting achieves O(n log n).',
        ],
        example: '[10,9,2,5,3,7,101,18] → LIS length 4 ([2,5,7,101])',
        applications: ['Sequence analysis', 'Card sorting'],
      },
      {
        id: 'editDistance',
        name: 'Edit Distance',
        complexity: 'O(m·n)',
        description:
          'Minimum operations (insert, delete, replace) to convert one string to another.',
        keyPoints: [
          'If chars match: no cost.',
          'If chars differ: 1 + min(insert, delete, replace).',
        ],
        example: '"kitten" → "sitting" = 3 edits',
        applications: ['Spell checking', 'DNA alignment'],
      },
      {
        id: 'uniquePaths',
        name: 'Unique Paths',
        complexity: 'O(m·n)',
        description:
          'Count paths from top-left to bottom-right in a grid moving only right or down.',
        keyPoints: [
          'dp[i][j] = dp[i-1][j] + dp[i][j-1].',
          'First row and column are all 1.',
        ],
        example: '3×3 grid → 6 paths',
        applications: ['Robot navigation', 'Combinatorics'],
      },
    ],
  },

  trie: {
    categoryId: 'trie',
    overview:
      'Tries (prefix trees) store strings character-by-character, enabling fast prefix searches and autocomplete.',
    topics: [
      {
        id: 'trieInsert',
        name: 'Trie Insert',
        complexity: 'O(m)',
        description:
          'Insert a word by creating nodes for each character, marking the final node as the end of a word.',
        keyPoints: [
          'Reuses existing prefix nodes — shared prefixes cost nothing extra.',
          'Each edge represents a character.',
        ],
        example: 'Insert "cat", "car", "card" → shared path c-a-t/r-d',
        applications: ['Autocomplete', 'Spell checker'],
      },
      {
        id: 'trieSearch',
        name: 'Trie Search',
        complexity: 'O(m)',
        description:
          'Search follows character edges; a word exists only if the final node is marked as an end.',
        keyPoints: [
          'Prefix search stops at any node.',
          'Word search requires the isEndOfWord flag.',
        ],
        example: 'Search "cat" in trie with "cat", "car" → found.',
        applications: ['Dictionary lookups', 'Prefix matching'],
      },
      {
        id: 'triePrefix',
        name: 'Prefix Search',
        complexity: 'O(p)',
        description:
          'Check whether any stored word starts with a prefix by walking the prefix path and testing for descendants.',
        keyPoints: [
          'Traverse the prefix in O(p).',
          'A node with children (or an end flag) confirms a match.',
        ],
        example: 'Prefix "ca" in ["cat", "car"] → true',
        applications: ['Search-as-you-type', 'Domain lookups'],
      },
      {
        id: 'wordDictionary',
        name: 'Word Dictionary (Wildcards)',
        complexity: 'O(m · b)',
        description:
          'Match words containing wildcard dots by branching at every "." to try each child edge.',
        keyPoints: [
          'A literal character follows exactly one edge.',
          'A "." branches into all children — backtracking.',
          'Failing fast at each level keeps deep searches cheap.',
        ],
        example: 'Words "hello hall ham", query "h.l." → matches "hello" and "hall"',
        applications: ['Regex-lite search', ' crossword solvers'],
      },
      {
        id: 'autocomplete',
        name: 'Autocomplete',
        complexity: 'O(p + k)',
        description:
          'Collect all words sharing a prefix: walk to the prefix node, then gather every end-flagged descendant.',
        keyPoints: [
          'Traverse the prefix in O(p).',
          'DFS from the prefix node collects k results.',
          'Sorting results by frequency turns it into a real suggestion engine.',
        ],
        example: 'Prefix "car" in "cat car card care careful" → car, card, care, careful',
        applications: ['Search suggestions', 'IDE completion', 'Hashtag lookup'],
      },
    ],
  },
  commands: {
    categoryId: 'commands',
    overview:
      'Linux Terminal Commands provide powerful control over operating system resources, filesystem navigation, permissions, user management, and process execution.',
    topics: [
      {
        id: 'path-concepts',
        name: 'Path Concepts',
        complexity: 'O(1)',
        description: 'Understanding absolute paths starting from root / versus relative paths starting from current working directory.',
        keyPoints: [
          'Absolute paths begin with / (e.g. /home/octa/docs).',
          'Relative paths start from current directory (e.g. ./docs or ../var).',
          '~ expands to current user home directory (/home/octa).',
        ],
        steps: [
          'Identify root directory / as anchor.',
          'Use . for current directory, .. for parent directory.',
          'Combine path segments separated by forward slash /.',
        ],
        example: 'cd /etc (absolute) vs cd ../tmp (relative)',
        applications: ['Scripting', 'Filesystem traversal', 'System administration'],
      },
      {
        id: 'navigation',
        name: 'Directory Navigation',
        complexity: 'O(1)',
        description: 'Core navigation utilities for inspecting working directory (pwd), changing directories (cd), and listing contents (ls).',
        keyPoints: [
          'pwd prints the absolute path of current working directory.',
          'cd changes active directory, cd - toggles back to previous directory.',
          'ls lists files and directories with permissions, owner, and size.',
        ],
        example: 'ls -la /home/octa',
        applications: ['Command line navigation', 'Directory auditing'],
      },
      {
        id: 'file-ops',
        name: 'File & Directory Operations',
        complexity: 'O(1) - O(n)',
        description: 'Creating, copying, moving, renaming, removing, and reading files and folders.',
        keyPoints: [
          'mkdir -p creates nested directory trees.',
          'touch updates timestamp or creates empty file.',
          'cp copies files/dirs (-r for recursive), mv moves or renames.',
          'rm deletes files, rm -rf recursively removes directories.',
        ],
        example: 'mkdir -p project/src && touch project/src/index.js',
        applications: ['File management', 'Build pipelines', 'Deployment scripts'],
      },
      {
        id: 'search-lookup',
        name: 'Search & Lookup',
        complexity: 'O(n)',
        description: 'Grep regex search and Find file tree matching utilities.',
        keyPoints: [
          'grep pattern searches file streams or text line by line.',
          'find starting_path -name pattern searches filesystem hierarchy.',
          'which locates binary executables in PATH.',
        ],
        example: 'grep -rn "TODO" src/ || find /var/log -name "*.log"',
        applications: ['Log analysis', 'Code auditing', 'System troubleshooting'],
      },
      {
        id: 'editors',
        name: 'Text Editors (Nano & Vim)',
        complexity: 'Interactive',
        description: 'In-terminal text editors. Vim utilizes 3 distinct modes (Normal, Insert, Visual/Command).',
        keyPoints: [
          'Nano is simple modeless editor with bottom shortcut keys (^O save, ^X exit).',
          'Vim Normal Mode is for navigation & d/y/p commands.',
          'Vim Insert Mode (i) is for typing text; ESC returns to Normal mode.',
          'Vim Command-line Mode (:) is for saving (:w) and quitting (:q).',
        ],
        example: 'vim /etc/hosts (i to edit, ESC then :wq to save and exit)',
        applications: ['Remote server configuration', 'Quick text edits without GUI'],
      },
      {
        id: 'user-management',
        name: 'User Management',
        complexity: 'Admin / root',
        description: 'System user creation, deletion, modification, and identity inspection.',
        keyPoints: [
          'useradd -m creates user home directory.',
          'usermod -aG adds user to supplementary groups (e.g. sudo).',
          'whoami prints current logged-in username; id prints UID and GIDs.',
        ],
        example: 'sudo useradd -m -s /bin/bash octa',
        applications: ['Multi-tenant OS security', 'User access control'],
      },
      {
        id: 'permissions',
        name: 'Permissions & Ownership',
        complexity: 'POSIX ACL',
        description: 'POSIX file permissions (rwx) in user/group/others bits, numeric octal modes (755, 644), and Sticky Bit (1777).',
        keyPoints: [
          'r=4, w=2, x=1. Octal 755 = rwxr-xr-x (User full, Group/Others read+execute).',
          'chmod modifies mode bits, chown modifies owner and group.',
          'Sticky Bit (1777) on /tmp ensures users can only delete their own files.',
        ],
        example: 'chmod 755 script.sh && chown octa:developers script.sh',
        applications: ['System security', 'Web server document root permissions'],
      },
    ],
  },
  filesystem: {
    categoryId: 'filesystem',
    overview:
      'The Linux Virtual File System (VFS) abstracts disk and memory structures into a unified tree hierarchy governed by the Filesystem Hierarchy Standard (FHS).',
    topics: [
      {
        id: 'virtual-file-system',
        name: 'Virtual File System (VFS)',
        complexity: 'O(log n) tree ops',
        description:
          'In-memory hierarchical tree representation of Linux directory structures with live node state, permissions, owner tracking, and bash stateful interpreter.',
        keyPoints: [
          'FHS defines root /, /etc (configs), /home (users), /var (logs), /tmp (temp).',
          'In-memory single source of truth snapshot tracks every node modification.',
          'Stateful execution updates PWD, creates/deletes nodes, and tracks permission changes.',
          'Tree Visualizer dynamically animates active paths and updates PWD focus.',
        ],
        steps: [
          'User enters bash command in interactive terminal.',
          'VFS interpreter parses command arguments & active PWD context.',
          'Snapshot mutates node tree (mkdir/touch/rm/chmod/chown).',
          'Tree visualizer highlights target node & updates active path.',
          'Step history records diff, explanation, and command log for playback & Octa Tutor.',
        ],
        example: 'mkdir -p /home/octa/code && touch /home/octa/code/main.py',
        applications: ['OS kernel design', 'Virtual file systems', 'Cloud container rootfs'],
      },
    ],
  },
};

