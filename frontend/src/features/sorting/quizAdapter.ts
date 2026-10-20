import type { ArrayStep } from '../../engine/types/Step';
import { buildOptions, type QuizCheckpoint, type QuizWeight , type QuizRevisionData } from '../../engine/types/Quiz';

/* ── Sorting quiz adapter ──────────────────────────────────────────────
   Sorting had no quiz data of any kind: SortingPage derived one
   swap-or-not question inline and printed the deciding comparison on the
   buttons (`SWAP (42 > 17)`), so the student answered by reading which
   inequality was already true.

   This selector reads the existing `ArrayStep` stream instead — the seven
   algorithm files are untouched. Every checkpoint sits on step i and asks
   what step i+1 will do, so the canvas the student is looking at is
   exactly the state the question is about, and Continue reveals the
   answer by advancing one step.

   Question types are chosen per algorithm from what that algorithm
   actually emits, and only where BOTH outcomes occur. Insertion and
   shell sort, for instance, emit a comparison step only when the shift
   happens (`insertionSort.ts:31` — the push is inside the while body), so
   "does it shift?" would always be yes there; they get questions whose
   answer genuinely varies instead.
   ─────────────────────────────────────────────────────────────────── */

export type SortingAlgorithmKey =
  | 'bubble'
  | 'selection'
  | 'insertion'
  | 'merge'
  | 'quick'
  | 'heap'
  | 'shell'
  | 'counting'
  | 'radix'
  | 'bucket';

/** SortingRenderer.tsx:138 stops drawing `[i]` labels past this size, so
 *  an index-based question is unanswerable on bigger arrays. */
const INDEX_LABEL_LIMIT = 30;

type Kind = 'compare' | 'partition' | 'minimum' | 'lockIn' | 'landing' | 'shift' | 'midpoint';

/** Derived question types per algorithm, in placement priority order. */
const KINDS: Record<SortingAlgorithmKey, readonly Kind[]> = {
  bubble: ['lockIn', 'compare'],
  selection: ['lockIn', 'minimum'],
  quick: ['lockIn', 'partition'],
  heap: ['lockIn'],
  insertion: ['landing'],
  shell: ['shift'],
  merge: ['midpoint'],
  counting: ['lockIn'],
  radix: ['lockIn'],
  bucket: ['lockIn'],
};

/* ── Conceptual anchor ─────────────────────────────────────────────────
   One per algorithm, on step 0 where the canvas is untouched. Weight 1,
   so Light cadence asks exactly this and nothing else. */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<SortingAlgorithmKey, Anchor[]> = {
  bubble: [
    {
      prompt: 'What does one full pass of bubble sort guarantee?',
      correct: 'The largest unsorted value reaches the end of the unsorted region',
      distractors: [
        'The array becomes fully sorted',
        'The smallest value reaches index 0',
        'Exactly one swap takes place',
      ],
      explanation:
        'Adjacent comparisons move larger values rightward, so the largest unsorted value bubbles to the end of the active region.',
      hint: 'Follow a large value during left-to-right adjacent swaps.',
      concept: 'Pass invariant',
    },
    {
      prompt: 'Why is bubble sort called a stable sorting algorithm?',
      correct: 'Equal elements can keep their original relative order',
      distractors: [
        'It always uses constant memory',
        'It always runs in O(n)',
        'It never performs swaps',
      ],
      explanation:
        'Standard bubble sort swaps only when the left value is strictly greater, so equal elements are not unnecessarily reordered.',
      hint: 'Think about what happens when two compared values are equal.',
      concept: 'Stability',
    },
    {
      prompt: 'What is bubble sort’s worst-case time complexity?',
      correct: 'O(n²)',
      distractors: ['O(n log n)', 'O(n)', 'O(log n)'],
      explanation:
        'In the worst case, bubble sort performs quadratic numbers of comparisons and swaps.',
      hint: 'Think about a reverse-sorted array.',
      concept: 'Complexity',
    },
    {
      prompt: 'What is bubble sort’s best-case complexity when an early-exit flag is used?',
      correct: 'O(n)',
      distractors: ['O(n²)', 'O(n log n)', 'O(log n)'],
      explanation:
        'If the array is already sorted, one pass makes no swaps and the algorithm can terminate immediately.',
      hint: 'What happens when a complete pass performs zero swaps?',
      concept: 'Best case',
    },
    {
      prompt: 'Why does bubble sort need at most n - 1 passes?',
      correct: 'Each pass can place one more maximum value into its final position',
      distractors: [
        'Each pass removes two elements',
        'Each pass sorts the entire array',
        'The algorithm always performs exactly n² swaps',
      ],
      explanation:
        'After each pass, one additional element is fixed at the right end of the unsorted region, leaving at most n - 1 positions to settle.',
      hint: 'Count how many positions become permanently correct.',
      concept: 'Pass count',
    },
  ],

  selection: [
    {
      prompt: 'What is the main invariant of selection sort after each pass?',
      correct: 'The first position of the unsorted region contains its minimum value',
      distractors: [
        'The entire array is sorted',
        'The last position contains the global maximum',
        'Every adjacent pair is sorted',
      ],
      explanation:
        'Selection sort scans the unsorted region for its minimum and places it into the first unsorted position.',
      hint: 'Where does the minimum of the remaining region go?',
      concept: 'Selection invariant',
    },
    {
      prompt: 'How many swaps does selection sort perform at most in its standard implementation?',
      correct: 'O(n) swaps',
      distractors: ['O(n²) swaps', 'O(log n) swaps', 'Exactly one swap total'],
      explanation:
        'Each outer pass performs at most one swap after finding the minimum.',
      hint: 'Separate comparisons from writes/swaps.',
      concept: 'Write cost',
    },
    {
      prompt: 'What is selection sort’s typical time complexity?',
      correct: 'O(n²)',
      distractors: ['O(n)', 'O(n log n)', 'O(log n)'],
      explanation:
        'Every pass scans the remaining unsorted portion to find the minimum, resulting in quadratic comparisons.',
      hint: 'How many candidates are searched on each pass?',
      concept: 'Complexity',
    },
    {
      prompt: 'Does selection sort normally become linear on an already sorted array?',
      correct: 'No — it still scans the remaining elements',
      distractors: [
        'Yes — it immediately stops',
        'Yes — sorting is unnecessary after one comparison',
        'Only when all values are equal',
      ],
      explanation:
        'Selection sort still searches for the minimum on every pass even when the array is already sorted.',
      hint: 'The algorithm must still verify the minimum.',
      concept: 'Best-case behavior',
    },
    {
      prompt: 'Why is selection sort often useful when writes are expensive?',
      correct: 'It performs relatively few swaps compared with many other quadratic sorts',
      distractors: [
        'It never compares elements',
        'It always runs in O(n log n)',
        'It uses no comparisons at all',
      ],
      explanation:
        'Selection sort may perform many comparisons but only about one swap per pass.',
      hint: 'Compare the number of comparisons with the number of swaps.',
      concept: 'Write efficiency',
    },
  ],

  insertion: [
    {
      prompt: 'What is true about the region to the left of the current key in insertion sort?',
      correct: 'It is already sorted internally',
      distractors: [
        'It contains only the globally smallest values',
        'Every element is already in its final global position',
        'It is guaranteed to be unchanged from the input',
      ],
      explanation:
        'Insertion sort maintains a sorted prefix and inserts the next key into the correct position within that prefix.',
      hint: 'Think about the invariant of the sorted prefix.',
      concept: 'Sorted prefix',
    },
    {
      prompt: 'What does insertion sort do when the key is smaller than preceding sorted values?',
      correct: 'Shift larger values right until the key can be inserted',
      distractors: [
        'Delete the key',
        'Move the key directly to index 0 without shifts',
        'Restart the entire algorithm',
      ],
      explanation:
        'Larger elements in the sorted prefix are shifted one position right to make room for the key.',
      hint: 'The key moves left by opening a gap.',
      concept: 'Shifting',
    },
    {
      prompt: 'What is insertion sort’s worst-case time complexity?',
      correct: 'O(n²)',
      distractors: ['O(n)', 'O(n log n)', 'O(log n)'],
      explanation:
        'A reverse-sorted array can require each new key to shift across most of the sorted prefix.',
      hint: 'Think about maximum shifts for every insertion.',
      concept: 'Complexity',
    },
    {
      prompt: 'What is insertion sort’s best-case time complexity?',
      correct: 'O(n)',
      distractors: ['O(n²)', 'O(n log n)', 'O(log n)'],
      explanation:
        'When the input is already sorted, each key needs only one comparison with the preceding element and no shifts.',
      hint: 'Consider an already sorted array.',
      concept: 'Best case',
    },
    {
      prompt: 'Why is insertion sort effective on nearly sorted data?',
      correct: 'Most elements need only a small number of shifts',
      distractors: [
        'It ignores already sorted elements completely',
        'It always uses a heap',
        'It guarantees O(1) time per insertion',
      ],
      explanation:
        'When elements are close to their final positions, insertion sort performs little movement and can approach linear time.',
      hint: 'Think about the amount of disorder rather than only n.',
      concept: 'Adaptive behavior',
    },
  ],

  merge: [
    {
      prompt: 'Why can two sorted halves be merged in one linear scan?',
      correct: 'The smallest remaining value must be at the front of one of the two halves',
      distractors: [
        'The halves are always equal in size',
        'The halves never contain equal values',
        'Merging re-sorts each half from scratch',
      ],
      explanation:
        'Because each half is already sorted, comparing only their current front elements is sufficient to determine the next output.',
      hint: 'Only the smallest unmerged value from each half matters.',
      concept: 'Merge invariant',
    },
    {
      prompt: 'What is the time complexity of merge sort?',
      correct: 'O(n log n)',
      distractors: ['O(n²)', 'O(n)', 'O(log n)'],
      explanation:
        'There are O(log n) levels of splitting and O(n) work at each level during merging.',
      hint: 'Think depth of recursion × work per level.',
      concept: 'Complexity',
    },
    {
      prompt: 'Why does merge sort usually require O(n) auxiliary space?',
      correct: 'The merge step needs temporary storage for the combined result',
      distractors: [
        'Each comparison creates a new array',
        'The recursion tree stores every permutation',
        'The input must be duplicated n times',
      ],
      explanation:
        'The standard array-based merge implementation uses temporary space to combine the two sorted halves.',
      hint: 'Focus on where merged output is temporarily stored.',
      concept: 'Space complexity',
    },
    {
      prompt: 'Why is merge sort stable in a standard implementation?',
      correct: 'Equal elements can be taken from the left half before the right half',
      distractors: [
        'It never compares equal values',
        'It sorts only distinct values',
        'It places equal values randomly',
      ],
      explanation:
        'When equal keys are encountered, choosing the left element first preserves their original relative ordering.',
      hint: 'Look at the tie-breaking rule during merge.',
      concept: 'Stability',
    },
    {
      prompt: 'What is the main divide-and-conquer idea of merge sort?',
      correct: 'Split into smaller subarrays, sort them recursively, then merge them',
      distractors: [
        'Select one global minimum repeatedly',
        'Build a heap before every comparison',
        'Use hashing to count every value',
      ],
      explanation:
        'Merge sort recursively solves smaller halves and combines their sorted results.',
      hint: 'Think split → solve → combine.',
      concept: 'Divide and conquer',
    },
  ],

  quick: [
    {
      prompt: 'What is true of the pivot after a correct quicksort partition?',
      correct: 'The pivot is in its final sorted position',
      distractors: [
        'The pivot is guaranteed to be the median',
        'The pivot moves to index 0',
        'The pivot must be compared again with both sorted halves',
      ],
      explanation:
        'Partitioning places smaller values on one side and larger values on the other, leaving the pivot where it belongs in the final sorted array.',
      hint: 'What becomes permanently true after partitioning?',
      concept: 'Partitioning',
    },
    {
      prompt: 'What is quicksort’s average-case time complexity?',
      correct: 'O(n log n)',
      distractors: ['O(n²)', 'O(n)', 'O(log n)'],
      explanation:
        'Balanced partitions produce about log n levels with O(n) partition work per level.',
      hint: 'Think of balanced divide-and-conquer.',
      concept: 'Average complexity',
    },
    {
      prompt: 'What is quicksort’s worst-case time complexity?',
      correct: 'O(n²)',
      distractors: ['O(n log n)', 'O(n)', 'O(log n)'],
      explanation:
        'Highly unbalanced partitions can leave one side with n-1 elements repeatedly.',
      hint: 'What happens if the pivot is always near an extreme?',
      concept: 'Worst-case complexity',
    },
    {
      prompt: 'Why can choosing a good pivot improve quicksort performance?',
      correct: 'Balanced partitions reduce recursion depth and total work',
      distractors: [
        'It eliminates all comparisons',
        'It makes every partition O(1)',
        'It removes the need for recursion',
      ],
      explanation:
        'A pivot near the middle tends to produce balanced subproblems, leading toward O(n log n) behavior.',
      hint: 'Compare balanced and highly unbalanced partitions.',
      concept: 'Pivot selection',
    },
    {
      prompt: 'Why can quicksort be implemented in-place?',
      correct: 'Partitioning can rearrange elements within the existing array',
      distractors: [
        'It never moves elements',
        'It requires a second full array by definition',
        'It uses hashing instead of memory',
      ],
      explanation:
        'Many quicksort implementations partition directly inside the input array, using only recursion-stack space aside from the array.',
      hint: 'Where does the partitioned data live?',
      concept: 'In-place sorting',
    },
  ],

  heap: [
    {
      prompt: 'What does the max-heap property guarantee?',
      correct: 'The largest remaining value is at the root',
      distractors: [
        'The entire array is sorted',
        'Every level is sorted left to right',
        'The smallest value is always at the root',
      ],
      explanation:
        'Every parent is at least as large as its children, which places the maximum element at the root.',
      hint: 'Focus on the parent-child rule.',
      concept: 'Heap property',
    },
    {
      prompt: 'What does heap sort do after moving the maximum to the end?',
      correct: 'Shrink the heap and restore the heap property',
      distractors: [
        'Delete the entire heap',
        'Restart from the original array',
        'Sort the array using merge sort',
      ],
      explanation:
        'The sorted suffix grows by one while the remaining prefix is re-heapified.',
      hint: 'One maximum becomes fixed at the right edge.',
      concept: 'Heap extraction',
    },
    {
      prompt: 'What is heap sort’s time complexity?',
      correct: 'O(n log n)',
      distractors: ['O(n²)', 'O(n)', 'O(log n)'],
      explanation:
        'Building/maintaining the heap and extracting n elements each cost logarithmic work per relevant operation.',
      hint: 'Think n extractions × log n heap repair.',
      concept: 'Complexity',
    },
    {
      prompt: 'What is an important property of standard in-place heap sort?',
      correct: 'It uses O(1) auxiliary array space',
      distractors: [
        'It requires O(n) extra arrays',
        'It needs a hash table of all values',
        'It requires recursion depth O(n)',
      ],
      explanation:
        'Heap sort can rearrange the input array directly and maintain the heap inside it.',
      hint: 'The heap can live inside the input array.',
      concept: 'Space efficiency',
    },
    {
      prompt: 'Why is heap order not the same as sorted-array order?',
      correct: 'A heap only guarantees parent-child ordering, not complete left-to-right ordering',
      distractors: [
        'A heap has no ordering at all',
        'A heap sorts only odd indices',
        'Every heap is automatically sorted',
      ],
      explanation:
        'A heap imposes local parent-child constraints, which are weaker than the total ordering of a sorted array.',
      hint: 'Compare local ordering with global ordering.',
      concept: 'Heap vs sorted array',
    },
  ],

  shell: [
    {
      prompt: 'What does sorting at a large gap accomplish in Shell sort?',
      correct: 'It moves far-apart values closer to their final positions efficiently',
      distractors: [
        'It completely sorts the array in the first pass',
        'It guarantees every gap-spaced value is final',
        'It removes the need for the final gap of 1',
      ],
      explanation:
        'Large gaps allow elements to move many positions in one insertion-style shift, reducing disorder before the final pass.',
      hint: 'Think about moving an element six positions using one gap-six operation.',
      concept: 'Gap sequence',
    },
    {
      prompt: 'What happens when Shell sort eventually uses gap = 1?',
      correct: 'The algorithm performs a final insertion-sort-like pass',
      distractors: [
        'The algorithm switches to merge sort',
        'Only even indices are processed',
        'The array is guaranteed sorted before the pass begins',
      ],
      explanation:
        'Gap 1 compares adjacent positions and effectively becomes insertion sort over the nearly sorted array.',
      hint: 'What does an insertion sort look like when the gap is one?',
      concept: 'Final pass',
    },
    {
      prompt: 'Why can Shell sort be faster than plain insertion sort?',
      correct: 'Large gaps reduce long-distance disorder before local insertion passes',
      distractors: [
        'It never performs comparisons',
        'It uses a hash table',
        'It guarantees O(n) for every input',
      ],
      explanation:
        'Shell sort lets elements travel farther per operation, so the final insertion-style pass has less work.',
      hint: 'Compare one-step movement with gap-based movement.',
      concept: 'Performance improvement',
    },
    {
      prompt: 'What determines Shell sort’s performance substantially?',
      correct: 'The chosen gap sequence',
      distractors: [
        'Only the array’s first element',
        'The name of the programming language',
        'Whether the array is stored as a linked list',
      ],
      explanation:
        'Different gap sequences produce different numbers of comparisons and movements.',
      hint: 'The algorithm is defined by how its gaps shrink.',
      concept: 'Gap sequence',
    },
    {
      prompt: 'Is Shell sort generally stable?',
      correct: 'No, standard gap-based movement can reorder equal elements',
      distractors: [
        'Yes, always',
        'Only when the gap is greater than 1',
        'Only for numeric arrays',
      ],
      explanation:
        'Elements can move across equal elements during gapped insertion, so relative order of equal keys is not guaranteed.',
      hint: 'Can an element jump over another equal element?',
      concept: 'Stability',
    },
  ],

  counting: [
    {
      prompt: 'What makes counting sort fundamentally different from comparison sorting?',
      correct: 'It uses value frequencies instead of comparing elements',
      distractors: [
        'It uses a binary search tree for every value',
        'It compares every possible pair',
        'It always divides the array recursively',
      ],
      explanation:
        'Counting sort maps values to count positions, avoiding element-to-element comparison.',
      hint: 'Think about a count table indexed by values.',
      concept: 'Non-comparison sorting',
    },
    {
      prompt: 'What input condition is especially important for counting sort?',
      correct: 'The range of values should be reasonably small relative to n',
      distractors: [
        'The array must be sorted already',
        'All values must be distinct',
        'The array must contain only negative values',
      ],
      explanation:
        'Counting sort allocates storage based on the value range, so a huge sparse range can make it impractical.',
      hint: 'The count array size depends on max - min.',
      concept: 'Value range',
    },
    {
      prompt: 'What is counting sort’s typical time complexity when the value range is k?',
      correct: 'O(n + k)',
      distractors: ['O(n log n)', 'O(n²)', 'O(log n)'],
      explanation:
        'The algorithm processes n input elements and the count range of size k.',
      hint: 'Account for both input size and count-array range.',
      concept: 'Complexity',
    },
    {
      prompt: 'Why can counting sort be stable in its standard prefix-sum form?',
      correct: 'Elements are placed according to cumulative counts while preserving encounter order',
      distractors: [
        'It compares equal values by index',
        'It never stores counts',
        'It sorts equal values randomly',
      ],
      explanation:
        'Prefix positions and reverse/forward traversal can preserve the relative order of equal elements.',
      hint: 'Think about where equal elements are placed in output.',
      concept: 'Stability',
    },
    {
      prompt: 'What is a major weakness of counting sort?',
      correct: 'Its auxiliary memory depends on the value range',
      distractors: [
        'It always takes O(n²)',
        'It cannot sort integers',
        'It requires recursion depth O(n)',
      ],
      explanation:
        'A sparse or enormous range can require a very large count array even when n is modest.',
      hint: 'Compare n with maxValue - minValue.',
      concept: 'Space trade-off',
    },
  ],

  radix: [
    {
      prompt: 'Why does LSD radix sort process digits from least significant to most significant?',
      correct: 'Stable digit sorting preserves the ordering established by previous less-significant passes',
      distractors: [
        'The most significant digit is always zero',
        'Digit order never matters',
        'It avoids using any auxiliary storage',
      ],
      explanation:
        'Stability ensures that when a more significant digit is processed, ties retain the order established by less-significant digits.',
      hint: 'Think about what must happen to equal digits from an earlier pass.',
      concept: 'Stability',
    },
    {
      prompt: 'What kind of inner sorting method is commonly used by LSD radix sort?',
      correct: 'A stable counting sort by the current digit',
      distractors: [
        'An unstable quicksort',
        'A recursive binary search',
        'Selection sort without extra space',
      ],
      explanation:
        'Stable counting sort efficiently groups values by one digit while preserving the order from earlier passes.',
      hint: 'The digit range is usually small and fixed.',
      concept: 'Digit sorting',
    },
    {
      prompt: 'What does radix sort process at each pass?',
      correct: 'One digit position of every number',
      distractors: [
        'A random subset of numbers',
        'Only the largest number',
        'The entire numeric value as one comparison',
      ],
      explanation:
        'Radix sort resolves ordering digit by digit across several passes.',
      hint: 'Units, tens, hundreds, and so on.',
      concept: 'Digit-wise processing',
    },
    {
      prompt: 'What is a common time complexity expression for radix sort?',
      correct: 'O(d(n + k))',
      distractors: ['O(n²)', 'O(log n)', 'O(d log n) only'],
      explanation:
        'With d digit positions and a stable O(n+k) inner sort per pass, the total is O(d(n+k)).',
      hint: 'Multiply the number of digit passes by the cost of each pass.',
      concept: 'Complexity',
    },
    {
      prompt: 'Why is stability essential in LSD radix sort?',
      correct: 'It preserves previous digit ordering when later, more significant digits tie',
      distractors: [
        'It guarantees no digit is ever zero',
        'It removes the need for multiple passes',
        'It makes the input range smaller',
      ],
      explanation:
        'Without stability, a later digit pass could destroy ordering established by previous less-significant digits.',
      hint: 'Imagine two numbers tied on the current digit.',
      concept: 'Stable processing',
    },
  ],

  bucket: [
    {
      prompt: 'What is the basic idea of bucket sort?',
      correct: 'Distribute values into ranges or buckets, sort within each bucket, then concatenate them',
      distractors: [
        'Compare every pair directly',
        'Build a binary search tree from the whole array',
        'Hash every value only to detect duplicates',
      ],
      explanation:
        'Bucket sort separates the input by value ranges, performs local sorting, then combines the buckets in order.',
      hint: 'Think distribute → sort locally → concatenate.',
      concept: 'Bucket strategy',
    },
    {
      prompt: 'What input distribution usually makes bucket sort efficient?',
      correct: 'Values are reasonably and evenly distributed across buckets',
      distractors: [
        'All values fall into one bucket',
        'All values are identical and one bucket is required',
        'Values are already reverse sorted',
      ],
      explanation:
        'Even distribution keeps individual buckets small, making their internal sorting inexpensive.',
      hint: 'Small buckets mean less work inside each bucket.',
      concept: 'Input distribution',
    },
    {
      prompt: 'What causes bucket sort’s worst-case behavior with a quadratic inner sort?',
      correct: 'Most elements fall into one bucket',
      distractors: [
        'Every bucket has one element',
        'Buckets are perfectly balanced',
        'The number of buckets equals n',
      ],
      explanation:
        'If many elements collapse into one bucket, the internal sorting method may have to process nearly all n elements together.',
      hint: 'Think about the bucket containing almost the entire input.',
      concept: 'Worst case',
    },
    {
      prompt: 'What does increasing the number of buckets generally try to achieve?',
      correct: 'Reduce the number of elements that need to be sorted inside each bucket',
      distractors: [
        'Guarantee O(1) total runtime',
        'Eliminate the need for internal sorting',
        'Make all buckets contain identical values',
      ],
      explanation:
        'More appropriate buckets can spread values out, reducing local sorting work, although too many buckets also cost extra space.',
      hint: 'Balance distribution against bucket overhead.',
      concept: 'Bucket sizing',
    },
    {
      prompt: 'Why can bucket sort approach linear time under favorable assumptions?',
      correct: 'Distribution is near-uniform and each bucket stays small',
      distractors: [
        'It avoids all sorting operations',
        'It always uses one bucket',
        'It compares no values in any implementation',
      ],
      explanation:
        'With a suitable distribution, distributing elements and sorting tiny buckets can produce near-linear expected work.',
      hint: 'Think about average bucket size.',
      concept: 'Average-case performance',
    },
  ],
};

/* ── Lock-in wording ───────────────────────────────────────────────────
   Four algorithms lock exactly one position per outer iteration, and the
   *reason* differs in each — which is the whole point of asking. */

const LOCK_IN_COPY: Partial<
  Record<SortingAlgorithmKey, { prompt: string; explanation: (index: number) => string; hint: string }>
> = {
  bubble: {
    prompt: 'This pass is ending. Which position is now guaranteed to hold its final value?',
    explanation: (index) =>
      `Index ${index}. A pass carries the largest unsorted value to the far right of the unsorted region, so the rightmost unsorted position is the one that locks in.`,
    hint: 'Adjacent swaps push large values right. Which end of the unsorted region benefits?',
  },
  selection: {
    prompt: 'This pass is ending. Which position is now guaranteed to hold its final value?',
    explanation: (index) =>
      `Index ${index}. The pass scanned for the smallest remaining value and swapped it into the first unsorted slot, so that slot is done.`,
    hint: 'The pass found the minimum. Where does a minimum belong?',
  },
  quick: {
    prompt: 'Partitioning is finishing. Which position will the pivot end up in?',
    explanation: (index) =>
      `Index ${index}. The pivot goes directly after the last value smaller than it, so its final index is the range start plus the count of smaller values.`,
    hint: 'Count the values in this range that are smaller than the pivot.',
  },
  heap: {
    prompt: 'The heap root holds the largest remaining value. Which position does it move into?',
    explanation: (index) =>
      `Index ${index}. Heap sort swaps the root with the last slot of the current heap, shrinks the heap by one, and re-heapifies — so the largest value lands at the end of the unsorted region.`,
    hint: 'The heap shrinks by one each round. Which slot leaves the heap?',
  },
};

/** Quick sort and heap sort also mark indices sorted without an
 *  explaining step (`quickSort.ts:27` pushes `low` for a single-element
 *  range silently), so require a visible swap on the revealing step. */
const LOCK_IN_NEEDS_SWAP = new Set<SortingAlgorithmKey>(['quick', 'heap']);

/* ── Derivation helpers ──────────────────────────────────────────────── */

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function hasSwap(step: ArrayStep): boolean {
  return (step.swappingIndices?.length ?? 0) > 0;
}

/** Did anything actually move between these two steps? A self-swap
 *  leaves the array identical, so check the flag as well as the values. */
function moves(current: ArrayStep, next: ArrayStep): boolean {
  return hasSwap(next) || !arraysEqual(current.array, next.array);
}

/** The single index that becomes final on the transition, if exactly one
 *  does. The closing "all sorted" step adds every remaining index at once
 *  and is deliberately excluded. */
function newlySorted(current: ArrayStep, next: ArrayStep): number | null {
  const before = new Set(current.sortedIndices ?? []);
  const added = (next.sortedIndices ?? []).filter((index) => !before.has(index));
  return added.length === 1 ? added[0] : null;
}

function numberVar(step: ArrayStep, key: string): number | null {
  const value = step.variables?.[key];
  return typeof value === 'number' ? value : null;
}

function indexLabel(index: number): string {
  return `Index ${index}`;
}

/**
 * Build an index-answer option set. `candidates` is an ordered preference
 * list of distractors; the caller decides which indices are legitimate
 * alternatives. Returns null when no usable distractor exists.
 */
function indexOptions(
  id: string,
  correct: number,
  candidates: number[],
  size: number
): { options: string[]; correctIndex: number } | null {
  const seen = new Set<number>([correct]);
  const kept: number[] = [];
  for (const candidate of candidates) {
    if (kept.length === 3) break;
    if (candidate < 0 || candidate >= size || seen.has(candidate)) continue;
    seen.add(candidate);
    kept.push(candidate);
  }
  if (kept.length === 0) return null;
  return buildOptions(id, indexLabel(correct), kept.map(indexLabel));
}

/** Nearest-neighbour indices first: an off-by-one is the mistake worth
 *  catching, and the ends of the range catch a wrong mental model. */
function nearbyIndices(correct: number, size: number): number[] {
  return [correct - 1, correct + 1, correct - 2, correct + 2, 0, size - 1];
}

/** Weight by how many of this kind have already been placed: the first
 *  three reinforce (Normal), the rest are drilling (Intensive). */
function weightFor(occurrence: number): QuizWeight {
  return occurrence < 3 ? 2 : 3;
}

/** Insertion sort's own answer, taken from the step that performs the
 *  insert, so a question can never disagree with the visualization. */
function insertionLanding(steps: ArrayStep[], from: number): number | null {
  for (let k = from + 1; k < steps.length; k++) {
    const inserted = numberVar(steps[k], 'insertedAt');
    if (inserted !== null) return inserted;
  }
  return null;
}

/** A step that selects an element to insert, rather than compare or
 *  shift one. Shared by insertion sort and shell sort. */
function isSelectionStep(step: ArrayStep): boolean {
  return (
    step.pivotIndex !== undefined &&
    (step.comparingIndices?.length ?? 0) === 0 &&
    !hasSwap(step)
  );
}

/** Merge sort's divide steps highlight the whole range being split
 *  (`mergeSort.ts:21`); its merge comparisons highlight exactly two
 *  positions. Ranges of three or more are therefore unambiguous. */
function dividedRange(step: ArrayStep): { left: number; right: number } | null {
  const highlighted = step.comparingIndices ?? [];
  if (highlighted.length < 3) return null;
  for (let k = 1; k < highlighted.length; k++) {
    if (highlighted[k] !== highlighted[k - 1] + 1) return null;
  }
  return { left: highlighted[0], right: highlighted[highlighted.length - 1] };
}

/* ── Selector ──────────────────────────────────────────────────────────── */

/**
 * Pick instructive checkpoints out of a generated sorting execution.
 *
 * @param steps the `ArrayStep[]` produced by any of the seven algorithms
 * @param algorithm which one produced them
 */
export function buildSortingCheckpoints(
  steps: ArrayStep[],
  algorithm: SortingAlgorithmKey
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const size = steps[0].array.length;
  const kinds = KINDS[algorithm];
  const anchors = ANCHORS[algorithm];
  const anchorIndex = steps.length % anchors.length;
  const anchor = anchors[anchorIndex];
  const checkpoints: QuizCheckpoint[] = [];

  const anchorId = `sorting-${algorithm}-anchor-${anchorIndex}`;
  const anchorOptions = buildOptions(anchorId, anchor.correct, anchor.distractors);
  checkpoints.push({
    stepIndex: 0,
    question: {
      id: anchorId,
      prompt: anchor.prompt,
      options: anchorOptions.options,
      correctIndex: anchorOptions.correctIndex,
      explanation: anchor.explanation,
      hint: anchor.hint,
      concept: anchor.concept,
      weight: 1,
    },
  });

  /* Index-answer questions need the renderer's `[i]` labels. */
  const indexQuestionsUsable = size > 0 && size <= INDEX_LABEL_LIMIT;

  /* Where a lock-in question can go, computed up front so a cheaper
     question is not placed one step earlier and blocked by the spacing
     rule below — for bubble sort that would suppress lock-ins almost
     every pass, since the last comparison of a pass usually swaps. */
  const lockInSteps = new Set<number>();
  if (kinds.includes('lockIn') && indexQuestionsUsable) {
    for (let index = 1; index < steps.length - 1; index++) {
      const next = steps[index + 1];
      if (LOCK_IN_NEEDS_SWAP.has(algorithm) && !hasSwap(next)) continue;
      if (newlySorted(steps[index], next) !== null) lockInSteps.add(index);
    }
  }

  const counts: Record<Kind, number> = {
    compare: 0,
    partition: 0,
    minimum: 0,
    lockIn: 0,
    landing: 0,
    shift: 0,
    midpoint: 0,
  };

  /* At least one uninterrupted step between questions — back-to-back
     prompts turn the visualization into a form to fill in. */
  let lastAsked = 0;

  for (let index = 1; index < steps.length - 1; index++) {
    if (index - lastAsked < 2) continue;

    const current = steps[index];
    const next = steps[index + 1];

    /* ── Which position becomes final? ── */
    if (lockInSteps.has(index)) {
      const locked = newlySorted(current, next);
      const copy = LOCK_IN_COPY[algorithm];
      if (locked !== null && copy) {
        const sorted = new Set(current.sortedIndices ?? []);
        const id = `sorting-${algorithm}-lock-${index}`;
        /* Only positions still in play are honest alternatives. */
        const built = indexOptions(
          id,
          locked,
          nearbyIndices(locked, size).filter((candidate) => !sorted.has(candidate)),
          size
        );
        if (built) {
          checkpoints.push({
            stepIndex: index,
            question: {
              id,
              prompt: copy.prompt,
              options: built.options,
              correctIndex: built.correctIndex,
              explanation: copy.explanation(locked),
              hint: copy.hint,
              concept: 'Final position',
              weight: weightFor(counts.lockIn),
            },
          });
          counts.lockIn += 1;
          lastAsked = index;
          continue;
        }
      }
    }

    /* Leave the step before a lock-in free for it. */
    if (lockInSteps.has(index + 1)) continue;

    /* ── Bubble sort: swap this adjacent pair or not? ── */
    if (kinds.includes('compare')) {
      const pair = current.comparingIndices ?? [];
      if (pair.length === 2 && pair.every((i) => i >= 0 && i < size)) {
        const willSwap = moves(current, next);
        const id = `sorting-${algorithm}-compare-${index}`;
        const built = buildOptions(
          id,
          willSwap ? 'Swap them' : 'Leave them and move on',
          [
            willSwap ? 'Leave them and move on' : 'Swap them',
            'Mark the larger one as sorted and skip past it',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `Indices ${pair[0]} and ${pair[1]} are being compared. What happens next?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willSwap
              ? 'The earlier index holds the larger value, which breaks ascending order, so the pair is swapped and the larger value keeps moving right.'
              : 'The pair is already in ascending order relative to each other, so nothing moves and the scan continues to the next pair.',
            hint: 'Read the two highlighted bars, then ask which value an ascending sort wants first.',
            concept: 'Comparison rule',
            weight: weightFor(counts.compare),
          },
        });
        counts.compare += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Quick sort: does this value belong in the left partition? ── */
    if (kinds.includes('partition')) {
      const pair = current.comparingIndices ?? [];
      const j = numberVar(current, 'j');
      if (pair.length === 2 && j !== null && j >= 0 && j < size) {
        /* A swap on the next step is the loop's swap only if it is not
           the pivot being dropped into place at the end of the loop. */
        const isPivotPlacement = numberVar(next, 'pivotPlacedAt') !== null;
        const willMove = hasSwap(next) && !isPivotPlacement;
        const id = `sorting-${algorithm}-partition-${index}`;
        const built = buildOptions(
          id,
          willMove
            ? 'Move it into the region of smaller values'
            : 'Leave it where it is and advance',
          [
            willMove
              ? 'Leave it where it is and advance'
              : 'Move it into the region of smaller values',
            'Swap it with the pivot itself',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `The value at index ${j} is being compared with the pivot. What does partitioning do with it?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willMove
              ? 'It is smaller than the pivot, so it belongs on the pivot’s left. The boundary i advances and this value is swapped down into the smaller-value region.'
              : 'It is not smaller than the pivot, so it already belongs on the pivot’s right. The boundary i does not move and the scan advances.',
            hint: 'Compare this bar against the pivot bar. Which side of the pivot does it belong on?',
            concept: 'Partitioning',
            weight: weightFor(counts.partition),
          },
        });
        counts.partition += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Selection sort: does minIdx move to this candidate? ── */
    if (kinds.includes('minimum')) {
      const currentMin = numberVar(current, 'minIdx');
      const pair = current.comparingIndices ?? [];
      const candidate = currentMin === null ? undefined : pair.find((i) => i !== currentMin);
      if (currentMin !== null && candidate !== undefined) {
        /* selectionSort.ts:49 renames the variable to `newMinIdx` on the
           step that moves it, which is the cleanest signal available. */
        const willMove = numberVar(next, 'newMinIdx') !== null;
        const id = `sorting-${algorithm}-min-${index}`;
        const built = buildOptions(
          id,
          willMove
            ? `Yes — minIdx moves to index ${candidate}`
            : `No — minIdx stays at index ${currentMin}`,
          [
            willMove
              ? `No — minIdx stays at index ${currentMin}`
              : `Yes — minIdx moves to index ${candidate}`,
            'The two values are swapped straight away',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `minIdx points at index ${currentMin}. After comparing it with index ${candidate}, does minIdx change?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willMove
              ? `The candidate is smaller than the value minIdx currently points at, so minIdx moves to index ${candidate}. Nothing is swapped yet — selection sort waits until the pass ends.`
              : `The candidate is not smaller than the value minIdx currently points at, so minIdx is unchanged and the scan carries on.`,
            hint: 'minIdx moves only when the scan finds something strictly smaller than what it already holds.',
            concept: 'Minimum tracking',
            weight: weightFor(counts.minimum),
          },
        });
        counts.minimum += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Insertion sort: where does this key land? ── */
    if (kinds.includes('landing') && indexQuestionsUsable && isSelectionStep(current)) {
      const key = numberVar(current, 'key');
      const from = current.pivotIndex;
      const landing = insertionLanding(steps, index);
      if (key !== null && from !== undefined && landing !== null && landing !== from) {
        const id = `sorting-${algorithm}-landing-${index}`;
        /* Every position in the sorted prefix, plus the key's own slot,
           is a legitimate answer here. */
        const built = indexOptions(
          id,
          landing,
          [...nearbyIndices(landing, from + 1), from],
          from + 1
        );
        if (built) {
          checkpoints.push({
            stepIndex: index,
            question: {
              id,
              prompt: `The key ${key} at index ${from} is about to be inserted into the sorted region on its left. Which index does it land at?`,
              options: built.options,
              correctIndex: built.correctIndex,
              explanation: `Index ${landing}. Everything larger than ${key} shifts one place right, so the key settles just after the last value that is not larger than it.`,
              hint: 'Scan the sorted region right to left and stop at the first value that is not larger than the key.',
              concept: 'Insertion point',
              weight: weightFor(counts.landing),
            },
          });
          counts.landing += 1;
          lastAsked = index;
          continue;
        }
      }
    }

    /* ── Shell sort: does this element move at the current gap? ── */
    if (kinds.includes('shift') && isSelectionStep(current)) {
      const from = current.pivotIndex;
      if (from !== undefined) {
        /* A comparison step follows only when the while condition held,
           i.e. only when a shift is about to happen. */
        const willShift = (next.comparingIndices?.length ?? 0) > 0;
        const id = `sorting-${algorithm}-shift-${index}`;
        const built = buildOptions(
          id,
          willShift
            ? 'Yes — it shifts left along the gap'
            : 'No — it is already in order within its gapped subsequence',
          [
            willShift
              ? 'No — it is already in order within its gapped subsequence'
              : 'Yes — it shifts left along the gap',
            'It swaps with the element immediately to its left',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `The element at index ${from} is being inserted into its gapped subsequence. Does it move?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willShift
              ? 'The element one gap to its left is larger, so that larger value shifts right and this element keeps stepping left by one gap at a time.'
              : 'The element one gap to its left is not larger, so this element is already correctly placed within its gapped subsequence and nothing moves.',
            hint: 'Shell sort only ever compares along the gap, never with the immediate neighbour.',
            concept: 'Gapped insertion',
            weight: weightFor(counts.shift),
          },
        });
        counts.shift += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Merge sort: where does this range split? ── */
    if (kinds.includes('midpoint') && indexQuestionsUsable) {
      const range = dividedRange(current);
      if (range) {
        const midpoint = range.left + Math.floor((range.right - range.left) / 2);
        const id = `sorting-${algorithm}-midpoint-${index}`;
        const built = indexOptions(
          id,
          midpoint,
          [midpoint + 1, midpoint - 1, range.right, range.left],
          size
        );
        if (built) {
          checkpoints.push({
            stepIndex: index,
            question: {
              id,
              prompt: `The highlighted range ${range.left}–${range.right} is being divided. Which index is the last one in the left half?`,
              options: built.options,
              correctIndex: built.correctIndex,
              explanation: `Index ${midpoint}. Merge sort splits by position, never by value: the midpoint is the range start plus half its length, rounded down, so the left half gets the extra element when the length is odd.`,
              hint: 'Count how many positions the range covers, then halve it — the values in the bars are irrelevant here.',
              concept: 'Divide step',
              weight: weightFor(counts.midpoint),
            },
          });
          counts.midpoint += 1;
          lastAsked = index;
        }
      }
    }
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<SortingAlgorithmKey, QuizRevisionData> = {
  bubble: {
    description: 'Repeatedly swap adjacent elements if they are in wrong order',
    complexity: 'O(n²) time, O(1) space',
    keyIdea: 'After each pass, the largest unsorted element bubbles to its correct position',
    watchFor: ['Number of passes needed', 'When swaps occur', 'Early termination condition'],
    quickTip: 'Track the last swap position to skip already-sorted tail elements',
    example: 'Input [5,3,8,1]: Pass 1 swaps (5,3)→[3,5,8,1], no swap (5,8), swaps (8,1)→[3,5,1,8]. Value 8 is now locked at the end.',
  },
  selection: {
    description: 'Find the minimum element and place it at the current position',
    complexity: 'O(n²) time, O(1) space',
    keyIdea: 'The array is divided into sorted (left) and unsorted (right) regions',
    watchFor: ['Minimum finding process', 'Swap count', 'Comparison with bubble sort'],
    quickTip: 'Selection sort always makes exactly n-1 swaps regardless of input',
    example: 'Input [7,3,5,2]: Pass 1 scans all, finds min=2 at index 3, swaps with index 0→[2,3,5,7]. One write per pass.',
  },
  insertion: {
    description: 'Build sorted array one element at a time by inserting each into correct position',
    complexity: 'O(n²) time, O(1) space',
    keyIdea: 'Maintain a sorted prefix; insert each new element by shifting larger elements right',
    watchFor: ['Shift operations', 'Best case (already sorted)', 'Comparison with selection sort'],
    quickTip: 'Best case is O(n) when array is already sorted—no shifts needed',
    example: 'Input [4,2,7,1]: key=2 shifts 4 right→[2,4,7,1]; key=7 no shift; key=1 shifts 7,4,2 right→[1,2,4,7].',
  },
  merge: {
    description: 'Divide array in half, recursively sort, then merge the sorted halves',
    complexity: 'O(n log n) time, O(n) space',
    keyIdea: 'Two sorted arrays can be merged in linear time by comparing front elements',
    watchFor: ['Divide step', 'Merge process', 'Space complexity reason'],
    quickTip: 'Merge sort needs O(n) extra space for the merge operation',
    example: 'Input [38,27,43,3]: split [38,27]→[38],[27]→merge [27,38]; split [43,3]→[43],[3]→merge [3,43]; final merge→[3,27,38,43].',
  },
  quick: {
    description: 'Pick a pivot, partition around it, recursively sort subarrays',
    complexity: 'O(n log n) avg time, O(log n) space',
    keyIdea: 'After partitioning, the pivot is in its final sorted position',
    watchFor: ['Pivot selection', 'Partition logic', 'Worst case scenario'],
    quickTip: 'Worst case O(n²) occurs with poor pivot choice (e.g., always picking min/max)',
    example: 'Input [8,3,1,7,0,10,2], pivot=2: partition puts smaller left, larger right→[0,1,2,7,3,10,8]. Pivot 2 is now at its final index 2.',
  },
  heap: {
    description: 'Build a max heap, then repeatedly extract the maximum to sort',
    complexity: 'O(n log n) time, O(1) space',
    keyIdea: 'A max heap keeps the largest element at the root for O(1) access',
    watchFor: ['Heapify process', 'Heap property maintenance', 'In-place sorting'],
    quickTip: 'Heap sort is in-place but not stable—equal elements may change relative order',
    example: 'Input [4,10,3,5,1]: build max-heap→[10,5,3,4,1]; swap root 10 with last→[1,5,3,4,10]; heapify→[5,4,3,1,10]; repeat until sorted.',
  },
  shell: {
    description: 'Insertion sort with decreasing gap sequences for faster convergence',
    complexity: 'O(n log²n) time, O(1) space',
    keyIdea: 'Sorting with large gaps first allows elements to move far in few swaps',
    watchFor: ['Gap sequence', 'Comparison with insertion sort', 'Why gaps help'],
    quickTip: 'Shell sort is insertion sort applied to widely spaced elements first',
    example: 'Input [35,33,42,10,14,19,27,44], gap=4: sort sub-sequences → gap=2: sort → gap=1: final insertion sort on nearly-sorted array.',
  },
  counting: {
    description: 'Count occurrences of each value, then reconstruct sorted array',
    complexity: 'O(n + k) time, O(k) space',
    keyIdea: 'If values are in a small range k, we can count them directly',
    watchFor: ['Count array construction', 'Stable reconstruction', 'Range limitation'],
    quickTip: 'Only works when the range k of values is not much larger than n',
    example: 'Input [4,2,2,8,3,3,1]: count=[0,1,2,2,1,0,0,0,1]; prefix sum gives positions; place each value→[1,2,2,3,3,4,8].',
  },
  radix: {
    description: 'Sort by each digit position from least to most significant',
    complexity: 'O(d·(n + k)) time, O(n + k) space',
    keyIdea: 'Stable sorting by each digit preserves order from previous passes',
    watchFor: ['Digit extraction', 'Stability requirement', 'Number of passes'],
    quickTip: 'Radix sort requires a stable subroutine like counting sort per digit',
    example: 'Input [170,45,75,90,802,24,2,66]: sort by ones→[170,90,802,2,24,45,75,66]; sort by tens→[802,2,24,45,66,170,75,90]; sort by hundreds→[2,24,45,66,75,90,170,802].',
  },
  bucket: {
    description: 'Distribute elements into buckets, sort each bucket, concatenate',
    complexity: 'O(n + k) avg time, O(n) space',
    keyIdea: 'Uniformly distributed data means each bucket has O(1) elements',
    watchFor: ['Bucket distribution', 'Sorting within buckets', 'When it degrades'],
    quickTip: 'Works best when input is uniformly distributed across a known range',
    example: 'Input [0.42,0.32,0.82,0.12,0.52]: distribute into 5 buckets by range→bucket[0]=[0.12], bucket[1]=[0.22], …; sort each bucket; concatenate.',
  },
};

export function buildRevisionData(key: SortingAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
