import type { LinkedListStep, LinkedListQuizData } from './linkedListEngine';
import type { LinkedListCategory } from './linkedListEngine';
import { buildOptions, type QuizCheckpoint, type QuizWeight , type QuizRevisionData } from '../../engine/types/Quiz';

/* ── Linked List quiz adapter ──────────────────────────────────────────
   Linked list steps carry `quizData?: LinkedListQuizData` with
   `{prompt, options, correctIndex, explanation}` on steps flagged
   `isQuizPoint`. This adapter maps those onto `QuizCheckpoint[]`,
   randomising the correct-answer position via `buildOptions`.
   ─────────────────────────────────────────────────────────────────── */

const CATEGORY_HINTS: Partial<Record<LinkedListCategory, string>> = {
  singly: 'Follow the next pointers from head to tail.',
  doubly: 'Doubly linked nodes carry both forward and backward pointers.',
  circular: 'A circular list has no null tail — the last node points back to the head.',
  doublyCircular: 'A doubly circular list joins tail.next to head and head.prev to tail.',
  reverse: "Reversing a list re-points each node's next to its predecessor.",
  detectCycle: "Floyd's algorithm uses a slow pointer and a fast pointer; they meet if and only if a cycle exists.",
  middleNode: 'The fast pointer moves twice as fast; when it reaches the end the slow pointer is at the middle.',
  josephus: 'Count around the circular list; after removing every kth node, restart at its successor.',
  reverseSublist: 'The L–R positions are 1-based and inclusive; reconnect the prefix and suffix around the reversed range.',
  reverseHalf: 'This visualizer assigns the middle node of an odd-length list to the first half.',
  reverseFromMiddle: 'Keep the middle node for odd-length lists, then reverse the suffix beginning immediately after it.',
  reverseKGroup: 'Only complete groups of k are reversed; a short suffix remains unchanged.',
  palindrome: 'Compare symmetric node values after reversing the second half, then restore the original links.',
  swapPairs: 'Swap links between adjacent nodes; leave node values attached to their original nodes.',
  mergeSort: 'Merge adjacent sorted runs and take from the left run on ties to preserve stability.',
  addTwoNumbers: 'Digits are stored least-significant first; propagate floor(sum / 10) as carry.',
  removeNthFromEnd: 'A fixed n-node gap makes slow stop just before the node to remove.',
  splitHalves: 'The first half gets ceil(n/2) nodes, so it receives the middle when length is odd.',
  splitKParts: 'Every part gets floor(n/k) nodes; the earliest n mod k parts each get one extra.',
  mergeKSorted: 'Select the minimum unconsumed head across the sorted input lists.',
  lruCache: 'The hash map finds a node; the doubly linked list tracks MRU at the head and LRU at the tail.',
};

const CATEGORY_CONCEPTS: Partial<Record<LinkedListCategory, string>> = {
  singly: 'Pointer manipulation',
  doubly: 'Bidirectional pointers',
  circular: 'Ring topology',
  doublyCircular: 'Bidirectional ring topology',
  reverse: 'Pointer reversal',
  detectCycle: 'Cycle detection',
  middleNode: 'Two-pointer technique',
  josephus: 'Circular elimination',
  reverseSublist: 'Range pointer reversal',
  reverseHalf: 'Partial list reversal',
  reverseFromMiddle: 'Midpoint suffix reversal',
  reverseKGroup: 'Grouped pointer reversal',
  palindrome: 'Symmetric pointer comparison',
  swapPairs: 'Adjacent link rewiring',
  mergeSort: 'Stable divide and merge',
  addTwoNumbers: 'Digit arithmetic and carry',
  removeNthFromEnd: 'Two-pointer gap',
  splitHalves: 'Slow/fast list split',
  splitKParts: 'Balanced list partition',
  mergeKSorted: 'K-way merge',
  lruCache: 'Hash map and recency list',
};

function weightFor(occurrence: number): QuizWeight {
  if (occurrence === 0) return 1;
  return occurrence <= 2 ? 2 : 3;
}

/**
 * Build checkpoints for one linked list operation.
 *
 * @param steps    the `LinkedListStep[]` produced by any operation generator
 * @param category which operation produced them
 */
export function buildLinkedListCheckpoints(
  steps: LinkedListStep[],
  category: LinkedListCategory
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const hint = CATEGORY_HINTS[category] ?? 'Follow the pointers to trace the list structure.';
  const concept = CATEGORY_CONCEPTS[category] ?? 'Pointer reasoning';
  let occurrence = 0;

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (!step.isQuizPoint || !step.quizData) continue;

    const data: LinkedListQuizData = step.quizData;
    const correct = data.options[data.correctIndex];
    if (correct === undefined) continue;

    const id = `ll-${category}-q-${index}`;
    const distractors = data.options.filter((_, position) => position !== data.correctIndex);
    const built = buildOptions(id, correct, distractors);

    checkpoints.push({
      stepIndex: index,
      question: {
        id,
        prompt: data.prompt,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: data.explanation,
        hint,
        concept,
        weight: weightFor(occurrence),
      },
    });
    occurrence += 1;
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<LinkedListCategory, QuizRevisionData> = {
  singly: {
    description: 'Traverse a singly linked list from head to tail',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Each node has only a next pointer—traversal is strictly forward',
    watchFor: ['Null termination', 'Pointer chasing', 'No backward movement'],
    quickTip: 'Always check for null before accessing node.next to avoid errors',
    example: 'List 1→2→3→null: start at head(1), follow next to 2, then 3, then null (end).',
  },
  doubly: {
    description: 'Traverse a doubly linked list with both next and prev pointers',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Bidirectional pointers allow forward and backward traversal',
    watchFor: ['Both pointer maintenance', 'Head and tail updates', 'Memory overhead'],
    quickTip: 'Doubly linked lists use 2x memory per node but enable O(1) deletion given a node reference',
    example: 'List 1⇄2⇄3⇄null: traverse forward 1→2→3 or backward 3→2→1 using prev pointers.',
  },
  circular: {
    description: 'A linked list where the last node points back to the head',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'No null terminator—traversal must track visited nodes to avoid infinite loops',
    watchFor: ['Cycle detection', 'Traversal termination', 'Head insertion/deletion'],
    quickTip: 'Use a visited set or slow/fast pointer to detect when you have looped back to head',
    example: 'List 1→2→3→1 (circular): traverse 1→2→3→1→… must stop when revisiting head to avoid infinite loop.',
  },
  doublyCircular: {
    description: 'Maintain forward and backward links in a circular doubly linked list',
    complexity: 'O(n) search, O(1) insert/delete given node',
    keyIdea: 'Every node has next and prev links; tail.next=head and head.prev=tail',
    watchFor: ['Repairing both links', 'Head and tail boundary updates', 'Stopping after one full loop'],
    quickTip: 'When inserting at either boundary, update both the forward and backward ring links',
    example: '1⇄2⇄3 with 3.next=1 and 1.prev=3; stop traversal when you return to the starting node.',
  },
  reverse: {
    description: 'Reverse a linked list by re-pointing each node to its predecessor',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Iteratively update next pointers to point backward instead of forward',
    watchFor: ['Three-pointer technique', 'Head/tail update', 'In-place requirement'],
    quickTip: 'Maintain prev, current, and next pointers—update current.next to prev, then advance all three',
    example: 'List 1→2→3→null: reverse step by step: 1←null, 2←1, 3←2 → result 3→2→1→null.',
  },
  detectCycle: {
    description: "Detect if a linked list contains a cycle using Floyd's algorithm",
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'A fast pointer (2x speed) and slow pointer meet if and only if a cycle exists',
    watchFor: ['Pointer speeds', 'Meeting condition', 'Cycle start detection'],
    quickTip: "After detection, reset one pointer to head and move both at 1x speed—they meet at cycle start",
    example: 'List 1→2→3→4→2 (cycle at 2): slow moves 1,2,3,4,2… fast moves 1,3,2,4,2… they meet inside the cycle.',
  },
  middleNode: {
    description: 'Find the middle node of a linked list in one pass',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'A fast pointer moving 2x reaches the end when the slow pointer is at the middle',
    watchFor: ['Pointer speeds', 'Even vs odd length', 'Termination condition'],
    quickTip: 'When fast reaches null (or fast.next is null), slow is at the middle',
    example: 'List 1→2→3→4→5: slow moves 1,2,3; fast moves 1,3,5. When fast hits end, slow=3 (middle).',
  },
  josephus: {
    description: 'Repeatedly remove every kth node from a circular linked list until one survivor remains',
    complexity: 'O(n·k) time, O(n) space for the step-by-step simulation',
    keyIdea: 'After each elimination, resume counting at the removed node’s successor',
    watchFor: ['Counting starts at 1', 'Reconnect the previous node to the successor', 'Continue until one node remains'],
    quickTip: 'For k = 1, the current head is removed each round; for k > 1, move k − 1 links before removing',
    example: 'Circle 1→2→3→4→5→6→7 with k=3: remove 3, 6, 2, 7, 5, 1; node 4 survives.',
  },
  removeNthFromEnd: {
    description: 'Remove the nth node from the end of a linked list',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Use two pointers with a gap of n—when the front reaches the end, the back is at the target',
    watchFor: ['Pointer gap maintenance', 'Edge cases (n = length)', 'Dummy node usage'],
    quickTip: 'Use a dummy node before head to handle removal of the head node cleanly',
    example: 'List 1→2→3→4→5, n=2: advance fast 2 steps to 3, then move both. When fast=5, slow=3. Remove 3.next(4) → 1→2→3→5.',
  },
  palindrome: {
    description: 'Check if a linked list is a palindrome',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Find middle, reverse second half, compare with first half',
    watchFor: ['Middle finding', 'In-place reversal', 'Restoration step'],
    quickTip: 'After comparison, reverse the second half back to restore the original list',
    example: 'List 1→2→3→2→1: find middle=3, reverse second half→1←2←3, compare 1=1,2=2 → palindrome.',
  },
  mergeSorted: {
    description: 'Merge two sorted linked lists into one sorted list',
    complexity: 'O(n + m) time, O(1) space',
    keyIdea: 'Compare heads of both lists, attach the smaller one, advance that list',
    watchFor: ['Dummy node usage', 'Pointer updates', 'Remaining list attachment'],
    quickTip: 'Use a dummy node and a tail pointer—always attach the smaller head to tail',
    example: 'List1: 1→3→5, List2: 2→4→6: merge → 1→2→3→4→5→6. Compare heads, pick smaller each time.',
  },
  intersection: {
    description: 'Find the intersection node of two linked lists',
    complexity: 'O(n + m) time, O(1) space',
    keyIdea: 'Two pointers traversing both lists will meet at the intersection or both reach null',
    watchFor: ['Length difference handling', 'Pointer switching', 'No intersection case'],
    quickTip: 'When a pointer reaches null, switch it to the other list head—they meet at intersection',
    example: 'Lists A: 1→2→3→4, B: 5→3→4 (intersect at 3): pointer from A walks 1,2,3,4,null,5,3; from B walks 5,3,4,null,1,2,3 → meet at 3.',
  },
  flatten: {
    description: 'Flatten a multi-level linked list into a single-level list',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a stack or recursion to process child pointers before next pointers',
    watchFor: ['Child pointer handling', 'Stack usage', 'Order preservation'],
    quickTip: 'Process nodes in the order: current, then child subtree, then next',
    example: 'Node 1 (child→3→4) next→2: flatten → 1→3→4→2. Process child before next at each node.',
  },
  lruCache: {
    description: 'Implement least recently used cache with O(1) get and put',
    complexity: 'O(1) time, O(capacity) space',
    keyIdea: 'Combine a hash map for O(1) lookup with a doubly linked list for O(1) reordering',
    watchFor: ['Eviction policy', 'Move-to-front on access', 'Hash map and list sync'],
    quickTip: 'On access, move node to front; on eviction, remove from back and delete from hash map',
    example: 'Cache(cap=2): put(1,a)→[1:a], put(2,b)→[2:b,1:a], get(1)→[1:a,2:b], put(3,c)→evict LRU(2)→[3:c,1:a].',
  },
  reverseSublist: {
    description: 'Reverse an inclusive sublist between 1-based positions L and R',
    complexity: 'O(n) time, O(1) extra space',
    keyIdea: 'Move each next node to the front of the selected range while preserving the prefix and suffix',
    watchFor: ['1-based inclusive positions', 'Reconnecting the prefix', 'Preserving the suffix'],
    quickTip: 'A dummy node simplifies the case where L is 1',
    example: '1→2→3→4→5, L=2, R=4 becomes 1→4→3→2→5.',
  },
  reverseHalf: {
    description: 'Reverse either the first or second half of a linked list',
    complexity: 'O(n) time, O(1) extra space',
    keyIdea: 'Find the selected half boundaries and reverse only the links within that range',
    watchFor: ['Choosing which half', 'Reconnecting boundaries', 'Odd-length midpoint rule'],
    quickTip: 'Here the first half receives the middle node when the list length is odd',
    example: '1→2→3→4→5, reverse first half (1,2,3) → 3→2→1→4→5.',
  },
  reverseFromMiddle: {
    description: 'Reverse the suffix of a singly linked list beginning after its midpoint',
    complexity: 'O(n) time, O(1) extra space',
    keyIdea: 'For odd length, keep the center node in the first half and reverse the remaining suffix',
    watchFor: ['Fast/slow midpoint', 'Center-node convention', 'Reconnect at the midpoint'],
    quickTip: 'The second half starts at ceil(n / 2) when indexes are zero-based',
    example: '1→2→3→4→5 keeps 3 in place and reverses 4→5, producing 1→2→3→5→4.',
  },
  reverseKGroup: {
    description: 'Reverse linked-list nodes in complete groups of k',
    complexity: 'O(n) time, O(1) extra space',
    keyIdea: 'Reverse each complete k-node segment and reconnect it to the previous and next segments',
    watchFor: ['Checking k nodes exist before mutation', 'Group boundary reconnection', 'Leaving an incomplete suffix unchanged'],
    quickTip: 'Do not reverse the final group unless it contains exactly k nodes',
    example: '1→2→3→4→5 with k=2 becomes 2→1→4→3→5.',
  },
  swapPairs: {
    description: 'Swap every adjacent pair by changing links, without changing node values',
    complexity: 'O(n) time, O(1) extra space',
    keyIdea: 'Reconnect before→second→first→after for each pair',
    watchFor: ['Head update', 'Saving the pair successor', 'Leaving a final unpaired node in place'],
    quickTip: 'Use a dummy node so the first pair can be handled like every later pair',
    example: '1→2→3→4→5 becomes 2→1→4→3→5.',
  },
  mergeSort: {
    description: 'Sort a linked list with stable bottom-up merge sort',
    complexity: 'O(n log n) time, O(n) auxiliary space in this bottom-up trace',
    keyIdea: 'Merge adjacent sorted runs of widths 1, 2, 4, and so on',
    watchFor: ['Stable tie handling', 'Run boundaries', 'Correctly relinking node order'],
    quickTip: 'Choose from the left run when values tie to preserve stability',
    example: '4→2→1→3 is merged as [4][2][1][3], then [2,4][1,3], then 1→2→3→4.',
  },
  addTwoNumbers: {
    description: 'Add two non-negative integers stored as reverse-order digit lists',
    complexity: 'O(max(n, m)) time, O(max(n, m)) result space',
    keyIdea: 'Add matching digits with carry and append sum modulo 10',
    watchFor: ['Least-significant digit first', 'Missing digits treated as zero', 'Appending a final carry'],
    quickTip: 'For 342, the input digits are 2→4→3',
    example: '2→4→3 represents 342; 5→6→4 represents 465; result is 7→0→8 (807).',
  },
  splitHalves: {
    description: 'Split one linked list into two independent lists near the midpoint',
    complexity: 'O(n) time, O(1) extra space',
    keyIdea: 'Slow and fast pointers locate the first half tail, then its next link is cut',
    watchFor: ['Empty and single-node lists', 'Cutting the link', 'Odd-length midpoint rule'],
    quickTip: 'This visualizer gives the first half the extra node when length is odd',
    example: '1→2→3→4→5 splits into 1→2→3 and 4→5.',
  },
  splitKParts: {
    description: 'Split a linked list into k consecutive parts with sizes differing by at most one',
    complexity: 'O(n + k) time, O(k) space for the returned part heads',
    keyIdea: 'Give every part floor(n/k) nodes, then distribute one extra node to each earliest part until the remainder is used',
    watchFor: ['Consecutive node order', 'Cutting each part tail link', 'Empty parts when k exceeds n'],
    quickTip: 'The first n mod k parts are one node larger than the rest',
    example: '1→2→3→4→5 with k=3 becomes [1,2], [3,4], [5].',
  },
  mergeKSorted: {
    description: 'Merge k sorted linked lists into one sorted list',
    complexity: 'O(Nk) for this head-scan trace; O(N log k) with a min-heap',
    keyIdea: 'Repeatedly append the smallest current head and advance only its source list',
    watchFor: ['Inputs must already be sorted', 'Advancing the correct source', 'Handling exhausted lists'],
    quickTip: 'A min-heap makes each smallest-head selection O(log k)',
    example: '[1,4,7], [2,5,8], [3,6,9] merge to 1→2→3→4→5→6→7→8→9.',
  },
};

export function buildRevisionData(key: LinkedListCategory): QuizRevisionData {
  return REVISION_DATA[key];
}
