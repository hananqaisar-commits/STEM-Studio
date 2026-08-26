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
  reverse: "Reversing a list re-points each node's next to its predecessor.",
  detectCycle: "Floyd's algorithm uses a slow pointer and a fast pointer; they meet if and only if a cycle exists.",
  middleNode: 'The fast pointer moves twice as fast; when it reaches the end the slow pointer is at the middle.',
};

const CATEGORY_CONCEPTS: Partial<Record<LinkedListCategory, string>> = {
  singly: 'Pointer manipulation',
  doubly: 'Bidirectional pointers',
  circular: 'Ring topology',
  reverse: 'Pointer reversal',
  detectCycle: 'Cycle detection',
  middleNode: 'Two-pointer technique',
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
};

export function buildRevisionData(key: LinkedListCategory): QuizRevisionData {
  return REVISION_DATA[key];
}
