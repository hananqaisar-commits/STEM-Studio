import type { StackQueueStep } from './stackQueueEngine';
import type { StackQueueCategory } from './stackQueueEngine';
import { buildOptions, type QuizCheckpoint , type QuizRevisionData } from '../../engine/types/Quiz';

/* ── Stack & Queue quiz adapter ────────────────────────────────────────
   StackQueue steps do NOT carry quizData, so this adapter creates
   conceptual anchor questions based on the category. Each question is
   placed at step 0 (before any execution) so the student reasons
   about the concept before watching it unfold.
   ─────────────────────────────────────────────────────────────────── */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const STACK_ANCHOR: Anchor = {
  prompt: 'What does a stack push operation do?',
  correct: 'Adds an element to the top of the stack',
  distractors: [
    'Adds an element to the bottom of the stack',
    'Removes the top element from the stack',
    'Moves the top element to the bottom',
  ],
  explanation: 'A stack is last in, first out (LIFO). A push always places the new element on top, so it will be the first one popped.',
  hint: 'Think about which end of the stack the new element appears at.',
  concept: 'LIFO ordering',
};

const QUEUE_ANCHOR: Anchor = {
  prompt: 'What does a queue enqueue operation do?',
  correct: 'Adds an element to the rear of the queue',
  distractors: [
    'Adds an element to the front of the queue',
    'Removes the front element from the queue',
    'Replaces the front element with the new value',
  ],
  explanation: 'A queue is first in, first out (FIFO). Enqueue adds at the rear, so the element that has been waiting longest (at the front) is served first.',
  hint: 'Think about which end of the queue the new element enters from.',
  concept: 'FIFO ordering',
};

const PARENTHESES_ANCHOR: Anchor = {
  prompt: 'How does a stack determine if a sequence of brackets is valid?',
  correct: 'Each closing bracket must match the most recently opened unmatched bracket on top of the stack',
  distractors: [
    'Each closing bracket must match the earliest opened bracket at the bottom of the stack',
    'The total count of opening and closing brackets must be equal, regardless of order',
    'Brackets must alternate between opening and closing at every position',
  ],
  explanation: 'A stack remembers the most recent unmatched opener on top. A closer pops that opener and checks the match — if they disagree or the stack is empty, the sequence is invalid.',
  hint: 'What does the stack look like just before a closing bracket is processed?',
  concept: 'Bracket matching',
};

function anchorForCategory(category: StackQueueCategory): Anchor {
  switch (category) {
    case 'stack':
    case 'minStack':
    case 'postfixEval':
    case 'dailyTemperatures':
    case 'simplifyPath':
    case 'removeAdjacentDuplicates':
    case 'basicCalculator':
    case 'decodeString':
    case 'trappingRainWater':
    case 'largestRectangle':
      return STACK_ANCHOR;
    case 'queue':
    case 'queueViaStacks':
    case 'stackViaQueues':
    case 'circularQueue':
    case 'circularDeque':
    case 'slidingWindow':
    case 'firstNonRepeating':
    case 'taskScheduler':
    case 'movingAverage':
    case 'rottingOranges':
    case 'dota2Senate':
      return QUEUE_ANCHOR;
    case 'validParentheses':
      return PARENTHESES_ANCHOR;
    default:
      return STACK_ANCHOR;
  }
}

/**
 * Build checkpoints for one stack/queue operation.
 *
 * @param steps    the `StackQueueStep[]` produced by any operation generator
 * @param category which operation produced them
 */
export function buildStackQueueCheckpoints(
  steps: StackQueueStep[],
  category: StackQueueCategory
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const anchor = anchorForCategory(category);
  const id = `sq-${category}-anchor`;
  const built = buildOptions(id, anchor.correct, anchor.distractors);

  return [
    {
      stepIndex: 0,
      question: {
        id,
        prompt: anchor.prompt,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: anchor.explanation,
        hint: anchor.hint,
        concept: anchor.concept,
        weight: 1,
      },
    },
  ];
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<StackQueueCategory, QuizRevisionData> = {
  stack: {
    description: 'Last-in-first-out data structure with push and pop operations',
    complexity: 'O(1) time per operation, O(n) space',
    keyIdea: 'The most recently added element is always the first to be removed (LIFO)',
    watchFor: ['Push/pop operations', 'Top access', 'Underflow handling'],
    quickTip: 'Use a stack when you need to process items in reverse order of arrival',
    example: 'Push 1,2,3 → stack=[1,2,3]. Pop→3, pop→2, pop→1. Last in, first out.',
  },
  queue: {
    description: 'First-in-first-out data structure with enqueue and dequeue operations',
    complexity: 'O(1) time per operation, O(n) space',
    keyIdea: 'The earliest added element is always the first to be removed (FIFO)',
    watchFor: ['Enqueue/dequeue operations', 'Front/rear pointers', 'Empty queue handling'],
    quickTip: 'Use a queue when processing order should match arrival order (e.g., BFS)',
    example: 'Enqueue 1,2,3 → queue=[1,2,3]. Dequeue→1, dequeue→2, dequeue→3. First in, first out.',
  },
  validParentheses: {
    description: 'Check if a string of brackets is properly nested',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Each closing bracket must match the most recent unmatched opening bracket on the stack',
    watchFor: ['Stack push/pop', 'Matching logic', 'Empty stack at end'],
    quickTip: 'Push opening brackets, pop and match on closing brackets—stack must be empty at end',
    example: '"([{}])": push (, push [, push {, pop }matches{, pop ]matches[, pop )matches(, stack empty → valid.',
  },
  minStack: {
    description: 'Stack that supports O(1) retrieval of the minimum element',
    complexity: 'O(1) time per operation, O(n) space',
    keyIdea: 'Maintain a second stack tracking the minimum at each level',
    watchFor: ['Auxiliary stack', 'Min updates on push/pop', 'Space optimization'],
    quickTip: 'Push to min stack only when new value ≤ current min; pop when values match',
    example: 'Push 5,3,4: main=[5,3,4], minStack=[5,3,3]. getMin()=3. Pop 4→minStack=[5,3]. Pop 3→minStack=[5]. getMin()=5.',
  },
  postfixEval: {
    description: 'Evaluate a postfix (reverse Polish notation) expression',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Push operands, pop two on operator, push result back',
    watchFor: ['Operand vs operator detection', 'Stack order for binary ops', 'Final result'],
    quickTip: 'For subtraction/division, the first pop is the right operand, second pop is the left',
    example: '"3 4 + 2 ×": push 3, push 4, + →pop 4,3→push 7, push 2, × →pop 2,7→push 14. Result: 14.',
  },
  dailyTemperatures: {
    description: 'Find days until a warmer temperature for each day',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a monotonic decreasing stack—each element is popped when a warmer day arrives',
    watchFor: ['Stack stores indices', 'Monotonic property', 'Distance calculation'],
    quickTip: 'Stack holds indices of days waiting for warmer weather—pop when current temp exceeds stack top',
    example: 'Temps [73,74,75,71,69,72,76,73]: day 0(73)→wait 1 day for 74; day 4(69)→wait 1 for 72; day 6(76)→no warmer day.',
  },
  trappingRainWater: {
    description: 'Calculate water trapped between bars of varying heights',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Water at each position is bounded by the minimum of max heights on left and right',
    watchFor: ['Left/right max tracking', 'Stack-based vs two-pointer', 'Width calculation'],
    quickTip: 'Use a stack to track bars—when a taller bar appears, calculate trapped water in the valley',
    example: 'Heights [0,1,0,2,1,0,1,3,2,1,2,1]: total trapped water = 6 units across all valleys.',
  },
  largestRectangle: {
    description: 'Find the largest rectangular area in a histogram',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'For each bar, find how far left and right it can extend at its height',
    watchFor: ['Monotonic stack', 'Width calculation', 'Sentinel usage'],
    quickTip: 'Use a monotonic increasing stack—when a shorter bar appears, calculate area for popped bars',
    example: 'Histogram [2,1,5,6,2,3]: bar 5 can extend width 2 (area=10), bar 6 width 1 (area=6). Max area = 10.',
  },
  simplifyPath: {
    description: 'Simplify a Unix-style file path',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a stack to handle directory navigation—push on names, pop on "..", ignore "."',
    watchFor: ['Split by "/"', 'Stack operations', 'Path reconstruction'],
    quickTip: 'Split path by "/", push valid names, pop on "..", skip empty and ".", then join with "/"',
    example: 'Path "/a/./b/../../c/": split→[a,.,b,..,.., c]. Stack: push a, skip ., push b, pop b, pop a, push c → "/c".',
  },
  decodeString: {
    description: 'Decode a string with nested repetition patterns like "3[a2[b]]"',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a stack to handle nested brackets—push context on "[", pop and repeat on "]"',
    watchFor: ['Number parsing', 'Nested handling', 'Stack of strings and counts'],
    quickTip: 'Maintain two stacks: one for repeat counts, one for string segments before each "["',
    example: '"3[a2[b]]": inner 2[b]=bb, then 3[abb]=abbabbabb.',
  },
  basicCalculator: {
    description: 'Evaluate a mathematical expression with +, -, and parentheses',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a stack to track signs across nested parentheses',
    watchFor: ['Sign management', 'Multi-digit numbers', 'Parenthesis nesting'],
    quickTip: 'Push current sign onto stack when entering "(", pop when exiting—apply sign to each number',
    example: '"1 - (2+3)": result=1, push sign -, evaluate (2+3)=5, apply -5 → result=1-5=-4.',
  },
  removeAdjacentDuplicates: {
    description: 'Remove adjacent duplicate characters from a string',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a stack—push characters, pop when the top matches the current character',
    watchFor: ['Stack top comparison', 'Cascading removals', 'Final string construction'],
    quickTip: 'After popping a match, the new top might match the next character—cascading removals happen naturally',
    example: '"abbaca": push a, push b, b matches top b→pop b, push a, a matches top a→pop a, push c, push a → "ca".',
  },
  queueViaStacks: {
    description: 'Implement a queue using two stacks',
    complexity: 'O(1) amortized time, O(n) space',
    keyIdea: 'One stack for enqueue, one for dequeue—transfer when dequeue stack is empty',
    watchFor: ['Transfer condition', 'Amortized analysis', 'Empty queue check'],
    quickTip: 'Only transfer from input to output stack when output stack is empty—this gives amortized O(1)',
    example: 'Enqueue 1,2,3: inStack=[1,2,3]. Dequeue: transfer to outStack=[3,2,1], pop→1. Next dequeue pop→2.',
  },
  stackViaQueues: {
    description: 'Implement a stack using two queues',
    complexity: 'O(n) time for push, O(1) for pop',
    keyIdea: 'On push, add to empty queue then transfer all elements from other queue',
    watchFor: ['Push cost', 'Queue roles', 'Top access'],
    quickTip: 'Make push expensive: new element goes to empty queue, then move all others—top is always front',
    example: 'Push 1, push 2: q1=[], q2=[2], transfer q1→q2 → q2=[2,1]. Pop returns front=2 (LIFO).',
  },
  circularQueue: {
    description: 'Fixed-size queue that wraps around using modulo arithmetic',
    complexity: 'O(1) time per operation, O(n) space',
    keyIdea: 'Use modulo to wrap front and rear pointers around the array',
    watchFor: ['Full vs empty detection', 'Modulo arithmetic', 'Size tracking'],
    quickTip: 'Keep a size counter or sacrifice one slot to distinguish full from empty',
    example: 'Queue(cap=3): enqueue 1,2,3→[1,2,3]. Dequeue→1. Enqueue 4→[4,2,3] with front=1, rear=0 (wrapped).',
  },
  circularDeque: {
    description: 'Double-ended queue with circular buffer implementation',
    complexity: 'O(1) time per operation, O(n) space',
    keyIdea: 'Both ends support insertion and deletion with wraparound',
    watchFor: ['Front/rear movement', 'Full condition', 'Bidirectional operations'],
    quickTip: 'Use modulo for both front (subtract) and rear (add) movements to handle wraparound',
    example: 'Deque(cap=3): addFront(1), addRear(2), addFront(3)→[3,1,2]. deleteFront()→[1,2]. deleteRear()→[1].',
  },
  slidingWindow: {
    description: 'Find maximum in each sliding window of size k',
    complexity: 'O(n) time, O(k) space',
    keyIdea: 'Use a deque storing indices—maintain decreasing order, evict out-of-window elements',
    watchFor: ['Deque stores indices', 'Monotonic property', 'Window boundary'],
    quickTip: 'Front of deque is always the max—remove from back elements smaller than current',
    example: 'Array [1,3,-1,-3,5,3,6,7], k=3: windows [1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, … Max values: [3,3,5,5,6,7].',
  },
  firstNonRepeating: {
    description: 'Find the first non-repeating character in a stream',
    complexity: 'O(n) time, O(k) space',
    keyIdea: 'Use a queue of unique characters and a frequency map',
    watchFor: ['Queue maintenance', 'Frequency updates', 'Stale queue entries'],
    quickTip: 'Add to queue on first occurrence, mark in frequency map—skip queue front if frequency > 1',
    example: 'Stream "aabc": read a(freq=1, queue=[a]), read a(freq=2, skip), read b(freq=1, queue=[b]), answer=b.',
  },
  taskScheduler: {
    description: 'Schedule tasks with cooldown period between identical tasks',
    complexity: 'O(n) time, O(k) space',
    keyIdea: 'Use a queue to track when each task becomes available again',
    watchFor: ['Cooldown tracking', 'Queue of (task, available_time)', 'Idle time calculation'],
    quickTip: 'Pop from queue when current time ≥ available time—if queue is full, advance time',
    example: 'Tasks AAABBB, n=2: schedule A,idle,idle,B,A,idle,idle,B,A,idle,idle,B → total 12 slots (with idle time).',
  },
  movingAverage: {
    description: 'Calculate moving average of last k values in a stream',
    complexity: 'O(1) time per value, O(k) space',
    keyIdea: 'Maintain a circular buffer or queue of size k and a running sum',
    watchFor: ['Window size', 'Sum update (add new, remove old)', 'Initial fill phase'],
    quickTip: 'Add new value to sum, if window is full subtract the oldest, then add new to queue',
    example: 'Stream [1,10,3,5], k=3: avg(1)=1.0, avg(1,10)=5.5, avg(1,10,3)=4.67, avg(10,3,5)=6.0.',
  },
  rottingOranges: {
    description: 'Find time for all fresh oranges to rot using BFS',
    complexity: 'O(m·n) time, O(m·n) space',
    keyIdea: 'Multi-source BFS from all initially rotten oranges simultaneously',
    watchFor: ['Initial queue setup', 'Level-by-level BFS', 'Remaining fresh count'],
    quickTip: 'Start BFS with all rotten oranges at time 0—each BFS level is one minute',
    example: 'Grid [[2,1,1],[1,1,0],[0,1,1]]: minute 0: (0,0) rotten; minute 1: (0,1),(1,0) rot; minute 2: (1,1),(0,2) rot; minute 3: (2,1),(1,2) rot; answer=4.',
  },
  dota2Senate: {
    description: 'Simulate voting rounds where senators ban each other',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use two queues (one per party)—earlier index bans later opponent',
    watchFor: ['Queue comparison', 'Round wrapping (add n)', 'Empty queue victory'],
    quickTip: 'Compare queue fronts—smaller index wins, add winner back with index + n for next round',
    example: '"RD": R(0) vs D(1) → R wins, R re-enqueues as (0+2=2). D queue empty → Radiant wins.',
  },
};

export function buildRevisionData(key: StackQueueCategory): QuizRevisionData {
  return REVISION_DATA[key];
}
