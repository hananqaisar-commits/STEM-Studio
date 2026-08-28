import type { StackQueueStep } from './stackQueueEngine';
import type { StackQueueCategory } from './stackQueueEngine';
import {
  buildOptions,
  type QuizCheckpoint,
  type QuizQuestion,
  type QuizRevisionData,
  type QuizWeight,
} from '../../engine/types/Quiz';

/* ── Stack & Queue quiz adapter ────────────────────────────────────────
   Two layers of questions:

   1. A conceptual 'reason' anchor at step 0, before any execution, so
      the student states the invariant they are about to watch.
   2. Step-prediction checkpoints sitting on step i and asking what
      step i+1 will do — the canvas the student is looking at is exactly
      the state the question is about, and Continue reveals the answer
      by advancing one step. For stack & queue problems, mentally
      executing the next micro-step IS the skill, so most categories get
      a dedicated predictor that reads the generated step stream; the
      rest fall back to a structural enter/leave question.
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

/* ── Category-specific anchors ───────────────────────────────────────
   The flagship problems get an anchor about their ONE central idea,
   not a generic push/pop definition. */

const SPECIFIC_ANCHORS: Partial<Record<StackQueueCategory, Anchor>> = {
  dailyTemperatures: {
    prompt: 'Before it starts: why does the monotonic stack store INDICES instead of temperatures?',
    correct: 'The answer is a distance between days — indices are needed to compute i − j',
    distractors: [
      'Indices are smaller numbers and save memory',
      'Temperatures can repeat, but indices cannot',
      'The stack must stay sorted, and indices already are',
    ],
    explanation:
      'When a warmer day pops the stack top, the waiting time is the current index minus the stored index. Storing temperatures would lose the position the answer depends on.',
    hint: 'The answer for each day is a NUMBER OF DAYS. What do you need to compute a distance?',
    concept: 'Index stack',
  },
  trappingRainWater: {
    prompt: 'Before it starts: why must the stack hold strictly DECREASING heights?',
    correct: 'A shorter-or-equal top means no right boundary has arrived — water can only be measured when a taller bar pops it',
    distractors: [
      'So the tallest bar is always on top',
      'Decreasing order keeps the bars sorted by index',
      'It is a coincidence of the input order',
    ],
    explanation:
      'When a taller bar arrives, the popped bar is the valley floor: left wall = new stack top, right wall = current bar. If taller tops were allowed, valleys would be buried before their water could be measured.',
    hint: 'What does it mean for the water when the incoming bar is taller than the top?',
    concept: 'Monotonic boundary',
  },
  largestRectangle: {
    prompt: 'Before it starts: a sentinel bar of height 0 is appended to the histogram. Why?',
    correct: 'Height 0 is shorter than every real bar, so it forces the stack to flush and every rectangle to be measured',
    distractors: [
      'It marks the middle of the histogram',
      'It stores the best area found so far',
      'It reserves space for one more bar',
    ],
    explanation:
      "A bar's rectangle is only measured when a shorter bar pops it. Without the sentinel, bars still rising at the end of the histogram would never be popped and never measured.",
    hint: 'Which single bar can guarantee to be shorter than all the rest?',
    concept: 'Sentinel flush',
  },
  basicCalculator: {
    prompt: "Before it starts: when the scanner hits '(', what must be saved before the inner expression is evaluated?",
    correct: 'The running result and the pending sign, so they can be restored at the matching ")"',
    distractors: [
      'The entire expression string, to scan it again later',
      'The final answer so far and the stack depth',
      "Nothing — '(' is simply skipped",
    ],
    explanation:
      "'(' starts a fresh sub-expression, so the running result resets to 0. The only way to keep the outer work is to push (result, sign) on the context stack; ')' pops it and folds the inner value back in with the saved sign.",
    hint: 'The scanner moves forward only and never comes back. What would be lost?',
    concept: 'Context stack',
  },
  decodeString: {
    prompt: "Before it starts: what PAIR of values must be pushed when '[' is read?",
    correct: 'The string built so far and the repeat count that precedes the bracket',
    distractors: [
      'Only the repeat count — the string can be rebuilt later',
      'The full decoded result so far',
      "The position of the matching ']'",
    ],
    explanation:
      "']' needs two facts to expand: how many times to repeat (the count) and what to prepend (the outer string). Pushing both makes every nesting level self-contained.",
    hint: "']' must repeat something AND attach it to something. Where do both come from?",
    concept: 'Paired stacks',
  },
  stackViaQueues: {
    prompt: 'Before it starts: push is made O(n) on purpose. What does push do so that pop stays O(1)?',
    correct: 'Enqueue the new value into the empty aux queue, drain the main queue in behind it, then swap the two queues',
    distractors: [
      'Enqueue at the rear of the main queue and bubble it to the front',
      'Keep both queues balanced at all times',
      'Move half the elements so the cost amortizes',
    ],
    explanation:
      'After the rotation the newest value sits at the FRONT of the main queue — exactly where a stack top must be for pop to be a single O(1) dequeue.',
    hint: 'LIFO means the newest element must be reached first. Which end of a queue is reached first?',
    concept: 'Costly push rotation',
  },
  circularDeque: {
    prompt: 'Before it starts: insertFront computes (front − 1 + capacity) % capacity. Why add capacity before the modulo?',
    correct: 'front − 1 can be −1; the shift keeps the index inside the ring instead of going negative',
    distractors: [
      'It reserves one extra slot for overflow',
      'It doubles the capacity when the deque is full',
      'It is just another way to write front + 1',
    ],
    explanation:
      'Modulo on a negative dividend stays negative. Adding capacity lands on the same residue in [0, capacity), wrapping slot 0 back to capacity − 1 exactly as a ring should.',
    hint: 'What is (0 − 1) % 5 in most languages?',
    concept: 'Ring wraparound',
  },
  firstNonRepeating: {
    prompt: 'Before it starts: why can the candidate queue still contain characters that are no longer valid answers?',
    correct: 'Cleanup is lazy — a repeated character is only dequeued once it actually reaches the head',
    distractors: [
      'The queue is rebuilt from scratch on every step',
      'Because the frequency map is only checked at the end',
      'Invalid candidates are kept for the final timeline',
    ],
    explanation:
      'A character that repeats later stays queued until it reaches the head and is needed. This keeps every step O(1): no scanning, just one frequency check of the head.',
    hint: 'Nothing ever scans the middle of the queue. When is the head examined?',
    concept: 'Lazy cleanup',
  },
  movingAverage: {
    prompt: 'Before it starts: how does the average stay O(1) to compute when the window slides?',
    correct: 'Keep a running sum: add the incoming value and subtract the one that just left',
    distractors: [
      'Re-add the whole window on every step',
      'Store all previous averages and interpolate',
      'The queue is sorted, so the middle element is the average',
    ],
    explanation:
      'Recomputing a k-length sum costs O(k) per step. One add and one subtract keep every step constant time — the whole reason the window queue exists.',
    hint: 'Only two numbers change when the window slides. Which two?',
    concept: 'Running sum',
  },
  taskScheduler: {
    prompt: 'Before it starts: what does the greedy rule pick on every tick that has ready work?',
    correct: 'The ready task with the highest remaining count',
    distractors: [
      'The task that has been cooling the longest',
      'Round-robin over all task names in order',
      'A random ready task — the order does not matter',
    ],
    explanation:
      'Finishing high-count tasks early lets their cooldowns overlap with other work. Burning low-count tasks first strands the frequent ones, forcing idle ticks later.',
    hint: 'Which choice leaves the least work cooling down later?',
    concept: 'Greedy ordering',
  },
  rottingOranges: {
    prompt: 'Before it starts: why do ALL rotten oranges enter the BFS queue at minute 0?',
    correct: 'They are all sources — BFS then spreads one ring per minute simultaneously from every one of them',
    distractors: [
      'To sort them by position before spreading',
      'Because the queue cannot hold more than one source',
      'So the grid can be scanned level by level later',
    ],
    explanation:
      'One BFS level equals one minute of simultaneous spread. Seeding every source at depth 0 is what makes the level count equal the answer — a single-source BFS would report the wrong time.',
    hint: 'What does one BFS level represent in this problem?',
    concept: 'Multi-source BFS',
  },
  dota2Senate: {
    prompt: 'Before it starts: why does each round winner re-enqueue at (original index + n)?',
    correct: 'It must act again in the NEXT round — adding n keeps the turn order consistent as rounds repeat',
    distractors: [
      'It is banned and leaves the queue forever',
      'n is its new voting power',
      'To mark it as having already voted this round',
    ],
    explanation:
      'The simulation is round-robin: survivors act once per round, and the original index decides who is earlier. Shifting by n preserves that comparison across rounds.',
    hint: 'Every surviving senator acts again. When is this one\'s next turn?',
    concept: 'Round-robin simulation',
  },
  minStack: {
    prompt: 'Before it starts: what does the auxiliary stack hold at every moment?',
    correct: 'The minimum of the main stack at that depth — every push records min(new value, current min)',
    distractors: [
      'A sorted copy of the main stack',
      'Only the single smallest value ever pushed',
      'Nothing — it is filled only when getMin is called',
    ],
    explanation:
      'Popping the main stack must also RESTORE the previous minimum, and a plain variable cannot remember history. Recording the min-at-each-depth on a parallel stack makes both push and pop O(1): pop simply pops the min stack too.',
    hint: 'After the smallest value is popped away, how would you know what the new minimum is?',
    concept: 'Min at each depth',
  },
  postfixEval: {
    prompt: 'Before it starts: why does postfix need no parentheses and no precedence rules?',
    correct: 'The order values sit on the stack IS the grouping — every operator consumes the two values waiting above it',
    distractors: [
      'Postfix operators are always evaluated by precedence anyway',
      'Parentheses are silently inserted around every triple',
      'The expression is converted to infix first',
    ],
    explanation:
      'In postfix an operator can only fire once both operands exist, so "3 4 −" can only mean 3 − 4. The stack holds the pending work; grouping is a property of positions, not symbols.',
    hint: 'When an operator arrives, where are its two operands standing?',
    concept: 'Stack as pending work',
  },
  simplifyPath: {
    prompt: 'Before it starts: what does the directory stack remember that a string split alone cannot?',
    correct: 'Only the directories still in effect — ".." cancels the most recent one, "." cancels nothing',
    distractors: [
      'Every token, including "." and ".."',
      'The original path, for error checking',
      'The number of slashes seen so far',
    ],
    explanation:
      'A canonical path is just the surviving directories joined with "/". ".." popping the top mirrors exactly how real filesystems climb one level, and "." is a no-op — so the stack ends up holding the answer directly.',
    hint: 'When you type "cd ..", which directory stops counting?',
    concept: 'Stack as path state',
  },
  removeAdjacentDuplicates: {
    prompt: 'Before it starts: why does a stack remove pairs that only become adjacent AFTER earlier removals?',
    correct: 'Each pop exposes a new top, and the next character is compared against that new top — cancellations cascade naturally',
    distractors: [
      'The string is re-scanned from the start after every removal',
      'A frequency map decides which characters to drop',
      'Adjacent pairs are marked first and deleted in one sweep',
    ],
    explanation:
      'In "abbaca" the second b pops the first, then the second a meets the newly exposed a and pops it too. One left-to-right pass with a stack handles cascades that would otherwise need repeated rescans.',
    hint: 'After "bb" disappears, what is now next to the incoming "a"?',
    concept: 'Cascading cancellation',
  },
  queueViaStacks: {
    prompt: 'Before it starts: the Out-Stack only receives a transfer when it is completely empty. Why not top it up on every enqueue?',
    correct: 'The Out-Stack is already in dequeue order — mixing a fresh transfer into it would break the FIFO sequence',
    distractors: [
      'Transfers are expensive, so they are batched for no other reason',
      'The In-Stack would overflow otherwise',
      'It simply makes the code shorter',
    ],
    explanation:
      'A transfer reverses the In-Stack, putting the oldest value on top of the Out-Stack. If a second reversal landed on a non-empty Out-Stack, newer values would bury the older ones still waiting, and dequeue would return the wrong element. Waiting for empty preserves the order — and amortizes the transfer cost.',
    hint: 'A transfer reverses arrival order. What happens if a second reversal lands on top of an unfinished one?',
    concept: 'Transfer on empty',
  },
  circularQueue: {
    prompt: 'Before it starts: enqueue computes REAR = (rear + 1) % capacity. What does the modulo buy?',
    correct: 'The index wraps to slot 0 after the last slot — the queue reuses freed space instead of shifting',
    distractors: [
      'It prevents the queue from ever being full',
      'It keeps the queue sorted by insertion order',
      'It halves the memory the queue needs',
    ],
    explanation:
      'A naive array queue must shift every element forward after a dequeue (O(n)). With wraparound, dequeue just moves FRONT ahead and the freed slots at the start become the new REAR — every operation stays O(1).',
    hint: 'After the last slot is used and the front has moved forward, where can new elements go?',
    concept: 'Ring wraparound',
  },
  slidingWindow: {
    prompt: 'Before it starts: why is storing INDICES in the deque enough to know both the max and whether an entry has slid out?',
    correct: 'An index answers position (still inside the window?) and, through the array, value — one fact covers both checks',
    distractors: [
      'Indices keep the deque shorter than values would',
      'The window boundary is recomputed from scratch each step anyway',
      'Only indices can legally be stored in a deque',
    ],
    explanation:
      'The deque front must always be the max, and any entry older than the window start is dead. Indices let one eviction rule (front too old) and one insertion rule (back smaller than the newcomer) maintain both properties in O(1) per element.',
    hint: 'The window moves by POSITION. What must each deque entry reveal about position?',
    concept: 'Index deque',
  },
};

function anchorForCategory(category: StackQueueCategory): Anchor {
  /* Flagship problems carry their own anchor about the ONE idea that
     makes them work; only the primitives fall back to the generic
     LIFO/FIFO/bracket definitions. */
  const specific = SPECIFIC_ANCHORS[category];
  if (specific) return specific;
  switch (category) {
    case 'queue':
      return QUEUE_ANCHOR;
    case 'validParentheses':
      return PARENTHESES_ANCHOR;
    default:
      return STACK_ANCHOR;
  }
}

/* ── Step predictors ──────────────────────────────────────────────
   Each predictor sits on step `index` — the canvas the student is
   looking at — reads step `index + 1` — what Continue will reveal —
   and asks the student to mentally execute that transition. A
   predictor returns null for steps not worth interrupting; rarer,
   more decisive moments are protected by leaving the step before them
   free (the same trick the sorting adapter uses for lock-in questions).

   Every question is answerable from the canvas alone, and options
   never print the deciding comparison — the student applies it. */

type QuestionBody = Omit<QuizQuestion, 'weight' | 'kind'>;

type Predictor = (
  steps: StackQueueStep[],
  index: number,
  occurrence: number
) => QuestionBody | null;

/** Weight by how many have already been placed: the first three
 *  reinforce (Normal cadence), the rest are drilling (Intensive). */
function weightFor(occurrence: number): QuizWeight {
  return occurrence < 3 ? 2 : 3;
}

/** The character the next step processes, for char-indexed streams. */
function nextChar(steps: StackQueueStep[], index: number): string | null {
  const next = steps[index + 1];
  if (!next || !next.inputString || next.currentInputIndex === undefined) return null;
  return next.inputString[next.currentInputIndex] ?? null;
}

/** Format a computed number the way the engine describes it. */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function predictValidParentheses(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  const c = nextChar(steps, index);
  if (!c) return null;

  /* A mismatch is the rare, decisive moment — leave the step before
     it free so the mismatch itself gets asked. */
  const after = steps[index + 2];
  if (after && after.codeLine === 6) return null;

  const top = current.elements[current.elements.length - 1]?.value ?? 'nothing';

  if (next.codeLine === 5) {
    const id = `sq-validParentheses-pop-${index}`;
    const built = buildOptions(id, `Pop the stack top — it is the matching opener`, [
      `Push '${c}' onto the stack`,
      `Stop — '${c}' cannot match, the expression is invalid`,
      `Swap '${c}' with the stack top`,
    ]);
    return {
      id,
      prompt: `The next character is '${c}' and the stack top is '${top}'. What does the scanner do?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: `'${c}' must close the most recently opened unmatched bracket. The top '${top}' is exactly its partner, so it pops — the group it opened is now complete.`,
      hint: `Which bracket does '${c}' close? Look at what was opened most recently.`,
      concept: 'Closer matching',
    };
  }

  if (next.codeLine === 6) {
    const id = `sq-validParentheses-mismatch-${index}`;
    const built = buildOptions(id, `Stop — '${c}' does not match the top, the expression is invalid`, [
      `Pop the stack top — it is the matching opener`,
      `Push '${c}' onto the stack and continue`,
      `Empty the stack and restart the scan`,
    ]);
    return {
      id,
      prompt: `The next character is '${c}' and the stack top is '${top}'. What does the scanner do?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: `A closer may only ever match the TOP of the stack. '${c}' and '${top}' are different bracket families, so no amount of further scanning can fix this position — the whole expression fails here.`,
      hint: `Do '${c}' and '${top}' belong to the same bracket family?`,
      concept: 'Mismatch detection',
    };
  }

  if (next.codeLine === 8 || next.codeLine === 9) {
    const valid = next.codeLine === 8;
    const id = `sq-validParentheses-verdict-${index}`;
    const correct = valid
      ? 'Valid — the stack finished empty'
      : 'Invalid — unclosed brackets remain on the stack';
    const built = buildOptions(id, correct, [
      valid
        ? 'Invalid — unclosed brackets remain on the stack'
        : 'Valid — the stack finished empty',
      'Valid only if the bracket counts differ by one',
      'Invalid — the last bracket never matched its opener',
    ]);
    return {
      id,
      prompt: 'That was the last character. What is the verdict?',
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: valid
        ? 'Every closer matched its opener exactly, so the stack drained to empty. A valid sequence is precisely one that leaves nothing waiting.'
        : 'Brackets that opened but never closed are still sitting on the stack. Even with every closer matched, leftover openers mean the sequence is invalid.',
      hint: 'Look at the stack right now. What is still waiting on it?',
      concept: 'Final verdict',
    };
  }

  /* Openers always push — readable straight off the ribbon. */
  return null;
}

function predictPostfixEval(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (next.codeLine !== 5) return null; // operators only — operand pushes are readable

  if (!next.inputString || next.currentInputIndex === undefined) return null;
  const tokens = next.inputString.trim().split(/\s+/);
  const token = tokens[next.currentInputIndex];
  if (!token) return null;

  const els = current.elements;
  if (els.length < 2) return null;
  const b = Number(els[els.length - 1].value); // top → right operand
  const a = Number(els[els.length - 2].value); // below → left operand
  if (Number.isNaN(a) || Number.isNaN(b)) return null;

  /* Operand order only matters for − and ÷, and only when the two
     values differ — otherwise both orders compute the same result. */
  if ((token === '-' || token === '/') && a !== b) {
    const result = token === '-' ? a - b : Math.floor(a / b);
    const flipped = token === '-' ? b - a : Math.floor(b / a);
    const id = `sq-postfixEval-order-${index}`;
    const built = buildOptions(id, `Push ${a} ${token} ${b} = ${result}`, [
      `Push ${b} ${token} ${a} = ${flipped}`,
      `Push ${a} + ${b} = ${a + b}`,
      `Discard both operands`,
    ]);
    return {
      id,
      prompt: `The next token is '${token}'. The stack's top two values are ${b} (top) and ${a} (below it). What result is pushed?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: `The FIRST pop becomes the RIGHT operand and the SECOND pop the LEFT one. The machine computes ${a} ${token} ${b} — not ${b} ${token} ${a}. Pop order is the classic RPN mistake.`,
      hint: 'Which of the two values was pushed first? That one sits deeper in the stack.',
      concept: 'Operand order',
    };
  }

  const id = `sq-postfixEval-op-${index}`;
  const built = buildOptions(id, `Pop the top two values, apply '${token}', push the result`, [
    `Push '${token}' onto the stack`,
    `Pop only the top value and keep it aside`,
    `Clear the stack — the expression is complete`,
  ]);
  return {
    id,
    prompt: `The next token is the operator '${token}'. What does the machine do?`,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation: `Operators never live on the stack — they consume it. '${token}' takes the two operands waiting on top and replaces them with a single computed value, shrinking the stack by one.`,
    hint: `An operator needs values to work on. Where have those values been waiting?`,
    concept: 'Operator evaluation',
  };
}

function predictDailyTemperatures(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (current.codeLine !== 3) return null; // only the day-arrival step

  const top = current.elements[current.elements.length - 1];
  if (!top) return null; // empty stack — the push is inevitable and visible

  const day = current.currentInputIndex ?? 0;
  const willPop = next.codeLine === 6;
  const id = `sq-dailyTemperatures-${index}`;
  const hint =
    "Compare today's temperature with the temperature inside the top chip. Which one is warmer?";
  const prompt = `Day ${day} arrives and the stack top is '${top.value}'. What happens next?`;

  if (willPop) {
    const built = buildOptions(id, 'The top pops — its waiting time is now known', [
      'The top stays — it keeps waiting for warmth',
      'The whole stack flushes — the pattern resets',
      "Today's index replaces the top in place",
    ]);
    return {
      id,
      prompt,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'A new day pops every stored index that is COLDER than itself. The top is colder, so its wait ends here — its answer is the distance between the two stored indices.',
      hint,
      concept: 'Warmer-day pop',
    };
  }

  const built = buildOptions(id, "Today's index pushes on top — the top keeps waiting", [
    'The top pops — its waiting time is now known',
    "Today is discarded — the stack is full",
    'The stack is reversed to coldest-first',
  ]);
  return {
    id,
    prompt,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation:
      'The stack only pops for a STRICTLY warmer day. Today is not warmer than the top, so the top keeps waiting — and today’s own index joins the stack to wait in turn.',
    hint,
    concept: 'Colder-day push',
  };
}

function predictSimplifyPath(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (!next.inputString || next.currentInputIndex === undefined) return null;
  const parts = next.inputString.split('/');
  const token = parts[next.currentInputIndex];
  if (!token) return null;

  /* '..' handling is the heart of this problem — leave the step before
     it free. */
  const after = steps[index + 2];
  if (after && (after.codeLine === 5 || after.codeLine === 6)) return null;

  if (token === '..' && next.codeLine === 5) {
    const top = current.elements[current.elements.length - 1]?.value ?? 'nothing';
    const id = `sq-simplifyPath-pop-${index}`;
    const built = buildOptions(id, `Pop '${top}' — '..' climbs one level up`, [
      `Push '..' onto the stack as a name`,
      `Clear the whole stack — back to root`,
      `Skip '..' — it is ignored like '.'`,
    ]);
    return {
      id,
      prompt: `The next token is '..' and the stack top is '${top}'. What happens?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "'..' means go up: the most recently entered directory stops counting, so it pops. If '..' were pushed as a name, the final path would literally contain '..' — exactly what canonical form forbids.",
      hint: '"cd .." leaves one directory behind. Which one?',
      concept: 'Parent traversal',
    };
  }

  if (token === '..' && next.codeLine === 6) {
    const id = `sq-simplifyPath-root-${index}`;
    const built = buildOptions(id, `Nothing — the stack is empty, so '..' stays at root`, [
      `Pop the bottom of the stack`,
      `Push '..' as a directory name`,
      `Report an invalid path error`,
    ]);
    return {
      id,
      prompt: `The next token is '..' and the directory stack is empty. What happens?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "There is no directory above root — climbing further is a no-op. The algorithm checks the stack before popping, which is what keeps '/..' from crashing or inventing a parent.",
      hint: 'What is above the root directory?',
      concept: 'Root clamp',
    };
  }

  if (next.codeLine === 4) {
    const id = `sq-simplifyPath-push-${index}`;
    const built = buildOptions(id, `Push '${token}' onto the stack`, [
      `Pop the current top — the new name replaces it`,
      `Ignore it — only '..' changes the stack`,
      `Append it to the final path string directly`,
    ]);
    return {
      id,
      prompt: `The next token is the directory name '${token}'. What happens?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "A plain name enters the current directory level, so it joins the stack. The final canonical path is just the surviving stack joined with '/' — no string surgery needed.",
      hint: "Entering a folder adds it to where you are. Where does 'where you are' live?",
      concept: 'Directory push',
    };
  }

  return null;
}

function predictRemoveAdjacent(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  const c = nextChar(steps, index);
  if (!c) return null;
  if (next.codeLine !== 3 && next.codeLine !== 4) return null;

  const top = current.elements[current.elements.length - 1]?.value ?? 'nothing';
  const willPop = next.codeLine === 4;
  const id = `sq-removeAdjacentDuplicates-${index}`;
  const prompt = `The next character is '${c}' and the stack top is '${top}'. What happens?`;
  const hint = 'Look closely at the top chip and the next character. Are they the same letter?';

  if (willPop) {
    const built = buildOptions(id, `The top pops — the pair cancels out`, [
      `'${c}' is pushed onto the stack`,
      `'${c}' is skipped — it was seen earlier`,
      `The whole stack clears`,
    ]);
    return {
      id,
      prompt,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: `'${c}' equals the top, and a matching pair of neighbours must BOTH disappear. The incoming character is never pushed — it annihilates the top instead. That is also why removals cascade: the newly exposed top can match the character after '${c}'.`,
      hint,
      concept: 'Pair cancellation',
    };
  }

  const built = buildOptions(id, `'${c}' is pushed onto the stack`, [
    `The top pops — the pair cancels out`,
    `'${c}' replaces the current top`,
    `'${c}' is skipped — it was seen earlier`,
  ]);
  return {
    id,
    prompt,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation: `Only an EXACT match with the top cancels. '${c}' differs from the top, so it simply becomes the new top — and the reference point for the next comparison.`,
    hint,
    concept: 'No-match push',
  };
}

function predictTrappingRainWater(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (current.codeLine !== 3) return null;

  const top = current.elements[current.elements.length - 1];
  if (!top) return null;

  const bar = current.currentInputIndex ?? 0;
  const willPop = next.codeLine === 5 || next.codeLine === 6;
  const id = `sq-trappingRainWater-${index}`;
  const prompt = `Bar ${bar} arrives and the stack top is '${top.value}'. What happens next?`;
  const hint = 'Which is taller: the incoming bar or the bar named in the top chip?';

  if (willPop) {
    const built = buildOptions(id, `The top pops — the new bar is taller and becomes its right wall`, [
      `The new bar pushes on top — heights still decrease`,
      `The stack flushes completely`,
      `Water is poured onto the new bar itself`,
    ]);
    return {
      id,
      prompt,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'The stack keeps strictly decreasing heights. A taller incoming bar completes a valley: the popped top is the valley floor, the new stack top is the left wall, and the incoming bar is the right wall — water is (min(left, right) − floor) × width.',
      hint,
      concept: 'Valley detection',
    };
  }

  const built = buildOptions(id, `The new bar pushes on top — heights still decrease`, [
    `The top pops — the new bar is taller`,
    `The new bar is discarded`,
    `The stack reverses to increasing order`,
  ]);
  return {
    id,
    prompt,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation:
      'No right wall has arrived yet: the incoming bar is not taller than the top, so no valley is completed. It joins the stack and waits for a future taller bar to measure water against.',
    hint,
    concept: 'Boundary wait',
  };
}

function predictLargestRectangle(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (current.codeLine !== 3) return null;

  const top = current.elements[current.elements.length - 1];
  if (!top) return null;

  const bar = current.currentInputIndex ?? 0;
  const willPop = next.codeLine === 6;
  const id = `sq-largestRectangle-${index}`;
  const prompt = `Bar ${bar} arrives and the stack top is '${top.value}'. What happens next?`;

  if (willPop) {
    const built = buildOptions(id, `The top pops — its rectangle gets measured now`, [
      `The new bar pushes — heights still increase`,
      `The stack is cleared for the next pass`,
      `The top moves to the end of the histogram`,
    ]);
    return {
      id,
      prompt,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'The stack keeps increasing heights. A bar’s rectangle is only finished when a SHORTER bar closes its right edge — the incoming bar is shorter than the top, so the top can no longer extend right and its area is computed with the width now known.',
      hint: 'Can the top bar keep extending right past a shorter bar?',
      concept: 'Right-edge close',
    };
  }

  const built = buildOptions(id, `The new bar pushes — heights still increase`, [
    `The top pops — its rectangle gets measured now`,
    `The new bar replaces the top`,
    `Both bars merge into one wider bar`,
  ]);
  return {
    id,
    prompt,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation:
      'The top is not taller than the incoming bar, so it can still extend right — nothing is finished yet. The incoming bar joins the stack and waits for its own shorter right edge (the sentinel guarantees one always comes).',
    hint: "A bar's rectangle stops at the first SHORTER bar on its right. Has one arrived?",
    concept: 'Extension wait',
  };
}

function predictBasicCalculator(steps: StackQueueStep[], index: number): QuestionBody | null {
  const next = steps[index + 1];
  const c = nextChar(steps, index);
  if (!c) return null;

  /* Parentheses are the decisive moments — leave the step before them
     free for the bracket question. */
  const after = steps[index + 2];
  if (after && (after.codeLine === 5 || after.codeLine === 7)) return null;

  if (next.codeLine === 5) {
    const id = `sq-basicCalculator-open-${index}`;
    const built = buildOptions(
      id,
      `It is saved on the context stack with its pending sign, then reset to 0`,
      [
        `It is added to the context stack unchanged`,
        `Nothing — '(' is skipped entirely`,
        `The context stack is cleared for the inner expression`,
      ]
    );
    return {
      id,
      prompt: `The next character is '('. What happens to the running result?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "'(' begins a fresh sub-expression whose value is not yet known. The only way to resume the outer work later is to push (result, sign) now; ')' will pop exactly this pair and fold the inner value back in.",
      hint: 'The scanner never moves backwards. What would be lost if nothing was saved?',
      concept: 'Context save',
    };
  }

  if (next.codeLine === 7) {
    const id = `sq-basicCalculator-close-${index}`;
    const built = buildOptions(id, `Pop the saved context and add the inner result with its stored sign`, [
      `Push the inner result onto the context stack`,
      `Reset the running result to 0`,
      `Multiply the inner result by the stored sign`,
    ]);
    return {
      id,
      prompt: `The next character is ')'. What happens?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "')' means the sub-expression is complete. The context stack top holds exactly the (result, sign) saved at the matching '(' — popping it resumes the outer expression with the inner value folded in.",
      hint: "What was pushed when the matching '(' was read?",
      concept: 'Context restore',
    };
  }

  if (next.codeLine === 4) {
    const id = `sq-basicCalculator-op-${index}`;
    const built = buildOptions(
      id,
      `The built number is flushed into the result, then the sign updates`,
      [
        `'${c}' is pushed onto the context stack`,
        `The built number resets with the result unchanged`,
        `The context stack pops one level`,
      ]
    );
    return {
      id,
      prompt: `The next character is the operator '${c}'. What happens?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'An operator ends the current number: result += sign × number. Then the sign is set from the operator so the NEXT number accumulates correctly.',
      hint: 'An operator sits BETWEEN two numbers. What must happen to the number that just ended?',
      concept: 'Sign flush',
    };
  }

  return null;
}

function predictDecodeString(steps: StackQueueStep[], index: number): QuestionBody | null {
  const next = steps[index + 1];
  const c = nextChar(steps, index);
  if (!c) return null;

  /* Brackets are the decisive moments — leave the step before them free. */
  const after = steps[index + 2];
  if (after && (after.codeLine === 4 || after.codeLine === 6)) return null;

  if (next.codeLine === 4) {
    const id = `sq-decodeString-open-${index}`;
    const built = buildOptions(id, `The current segment AND the repeat count, as a pair`, [
      `Only the repeat count`,
      `Only the current segment`,
      `The whole decoded output so far`,
    ]);
    return {
      id,
      prompt: `The next character is '['. What gets pushed?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "']' will need two facts to expand: how many times to repeat (the count) and what to prepend (the outer segment). Pushing both makes every nesting level self-contained.",
      hint: "When ']' arrives it must repeat something AND attach it to something. Where would each fact come from?",
      concept: 'Paired push',
    };
  }

  if (next.codeLine === 6) {
    const id = `sq-decodeString-close-${index}`;
    const built = buildOptions(id, `Pop the count and the outer segment, then build: outer + segment × count`, [
      `Push ']' and keep reading`,
      `Reset the current segment to empty`,
      `Use the count to index into the segment`,
    ]);
    return {
      id,
      prompt: `The next character is ']'. What happens?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "']' closes one repetition block. The two pops restore exactly what '[' saved; the current segment is repeated count times and glued onto the outer segment.",
      hint: "Think back to what was pushed at the matching '['.",
      concept: 'Pop and repeat',
    };
  }

  if (next.codeLine === 3) {
    const id = `sq-decodeString-digit-${index}`;
    const built = buildOptions(id, `It extends the repeat count being built`, [
      `It is pushed onto the string stack`,
      `It starts a new output segment`,
      `Digits are ignored in decoding`,
    ]);
    return {
      id,
      prompt: `The next character is the digit '${c}'. What happens?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        "Counts can be multi-digit (like '12[a]'). Each digit shifts the count being built one decimal place left.",
      hint: "What if the number before '[' had two digits?",
      concept: 'Count building',
    };
  }

  return null;
}

function predictStackViaQueues(steps: StackQueueStep[], index: number): QuestionBody | null {
  const next = steps[index + 1];

  /* The swap is the payoff of the whole rotation — leave the step
     before it free. */
  const after = steps[index + 2];
  if (after && after.codeLine === 6) return null;

  if (next.codeLine === 6) {
    const id = `sq-stackViaQueues-swap-${index}`;
    const built = buildOptions(
      id,
      `The two queues swap roles — the new value is now at the FRONT of main`,
      [
        `The new value bubbles to the front of the main queue`,
        `The main queue is reversed in place`,
        `Nothing — a separate pointer tracks the top`,
      ]
    );
    return {
      id,
      prompt: `The drain just finished. What makes the new value the stack top?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'The rotation ended with the new value at the FRONT of the aux queue and every older element behind it. Swapping the two queue references promotes that arrangement to the main queue — and the front of the main queue is exactly what pop dequeues, so pop stays O(1).',
      hint: 'After the drain, where does the new value sit inside the aux queue?',
      concept: 'Queue swap',
    };
  }

  if (next.codeLine === 4) {
    const id = `sq-stackViaQueues-drain-${index}`;
    const built = buildOptions(id, `Dequeued from the front of main, enqueued at the rear of aux`, [
      `Into a temporary array for later`,
      `Back into the main queue, behind the new value`,
      `Discarded — only the new value is kept`,
    ]);
    return {
      id,
      prompt: `The drain loop is about to move a main-queue element. Where does it go?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'Every drained element joins the REAR of the aux queue, landing behind the new value. When the drain finishes the order is fully reversed — newest at the front, oldest at the back — which is exactly LIFO.',
      hint: 'The new value must end up FIRST. Where does everyone else have to go?',
      concept: 'Drain rotation',
    };
  }

  return null;
}

function predictQueueViaStacks(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (current.codeLine !== 5 || next.codeLine !== 7) return null;

  const out = current.auxElements ?? [];
  if (out.length < 2) return null;

  const top = out[out.length - 1].value; // top of the Out-Stack
  const bottom = out[0].value; // bottom of the Out-Stack
  const id = `sq-queueViaStacks-${index}`;
  const built = buildOptions(id, `'${top}' — the first value enqueued, now on top of the Out-Stack`, [
    `'${bottom}' — it sat on top of the In-Stack`,
    `Nothing — the In-Stack still holds the answer`,
    `The transfer must run a second time first`,
  ]);
  return {
    id,
    prompt: `The transfer just finished and the Out-Stack reads [${out
      .map((e) => e.value)
      .join(', ')}] from bottom to top. Which value does the dequeue return?`,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation: `FIFO means the OLDEST value leaves. The transfer reversed the arrival order into the Out-Stack, so the oldest value — '${top}', enqueued first — ended up on TOP, exactly where a stack pop looks.`,
    hint: 'Which of these values entered the queue FIRST? Where did the reversal put it?',
    concept: 'Reversal preserves FIFO',
  };
}

function predictFirstNonRepeating(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];

  /* Cleanups are the rare, decisive moment — leave the step before
     them free. */
  const after = steps[index + 2];
  if (after && after.codeLine === 5) return null;

  if (next.codeLine === 5) {
    const head = current.elements[0]?.value;
    if (head === undefined) return null;
    const id = `sq-firstNonRepeating-clean-${index}`;
    const built = buildOptions(id, `It is dequeued from the head — no longer a candidate`, [
      `It stays — the head never changes`,
      `It moves to the rear for another chance`,
      `The whole queue is emptied and rebuilt`,
    ]);
    return {
      id,
      prompt: `The queue head '${head}' has now been seen more than once. What happens next?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'A repeated character can never be the first non-repeating one, so it must not sit at the head pretending to be the answer. Dequeueing it exposes the next candidate — and the cleanup is lazy: it happens only now that the head actually needs replacing, keeping every step O(1).',
      hint: 'Can a character that appears twice ever be the answer? What is it still doing at the front?',
      concept: 'Lazy cleanup',
    };
  }

  if (current.codeLine === 7 && next.codeLine === 3) {
    const c = nextChar(steps, index);
    if (!c) return null;
    const willEnqueue = next.elements.length === current.elements.length + 1;
    const id = `sq-firstNonRepeating-sighting-${index}`;
    const correct = willEnqueue
      ? `Enqueued — '${c}' has never appeared before`
      : `Nothing joins — '${c}' has already appeared`;
    const built = buildOptions(id, correct, [
      willEnqueue
        ? `Nothing joins — '${c}' has already appeared`
        : `Enqueued — '${c}' has never appeared before`,
      `It dequeues the current head first`,
      `It is pushed onto a stack instead`,
    ]);
    return {
      id,
      prompt: `The next character in the stream is '${c}'. What happens to the candidate queue?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: willEnqueue
        ? `The frequency map has no entry for '${c}' yet, so this is its first sighting — the only moment a character becomes a candidate. It joins the rear of the queue to wait its turn.`
        : `'${c}' is being seen again, so it can never be the answer. It never enters the queue — and if an earlier copy is queued, it will be cleaned up lazily when it reaches the head.`,
      hint: 'Scan the stream ribbon to the left of the active character. Has this letter appeared before?',
      concept: willEnqueue ? 'First sighting' : 'Repeat rejection',
    };
  }

  return null;
}

function predictMovingAverage(
  steps: StackQueueStep[],
  index: number,
  occurrence: number
): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  /* Alternate the two flavours: the eviction (window mechanics) and
     the emitted average (the actual computation). */
  const preferEvict = occurrence % 2 === 0;

  if (next.codeLine === 5) {
    if (!preferEvict) return null;
    const oldest = current.elements[0]?.value;
    if (oldest === undefined) return null;
    const id = `sq-movingAverage-evict-${index}`;
    const built = buildOptions(id, `'${oldest}' leaves the front — subtracted from the running sum`, [
      `The newest value is rejected instead`,
      `The window keeps growing`,
      `The sum resets and is recomputed from scratch`,
    ]);
    return {
      id,
      prompt: `The window just grew past its size limit. What happens first?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        `A fixed size is what makes the average "moving". The value that has waited longest — '${oldest}' — is now outside the window: it is dequeued and subtracted from the running sum, one add and one subtract per step, never a re-add of the whole window.`,
      hint: 'Which value has been inside the window the longest?',
      concept: 'Window slide',
    };
  }

  if (next.codeLine === 7 && current.elements.length >= 2) {
    if (preferEvict) return null;
    const values = current.elements.map((el) => Number(el.value));
    if (values.some((v) => Number.isNaN(v))) return null;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    const id = `sq-movingAverage-average-${index}`;
    const built = buildOptions(id, fmt(avg), [
      String(sum),
      String(Math.max(...values)),
      String(values.length),
    ]);
    return {
      id,
      prompt: `The window holds [${values.join(', ')}]. What average is emitted next?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: `Average = sum ÷ size = ${sum} ÷ ${values.length} = ${fmt(avg)}. The running sum already equals ${sum} — one add for the newcomer and one subtract for the departed keep it current without ever re-adding the window.`,
      hint: 'Add every value in the window, then divide by how many values there are.',
      concept: 'Average computation',
    };
  }

  return null;
}

function predictTaskScheduler(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];

  /* An idle tick is the rare, decisive moment — leave the step before
     it free. */
  const after = steps[index + 2];
  if (after && after.codeLine === 6) return null;

  const tick = next.currentInputIndex !== undefined ? next.currentInputIndex - 1 : 0;

  if (next.codeLine === 6) {
    const id = `sq-taskScheduler-idle-${index}`;
    const built = buildOptions(id, `Idle — the CPU waits for the earliest cooldown to expire`, [
      `Execute a cooling task anyway — work beats waiting`,
      `Skip the cooldown and reset it`,
      `End the schedule early`,
    ]);
    return {
      id,
      prompt: `Tick ${tick}: the ready lane is empty and every remaining task is cooling. What does the scheduler do?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'No task is available, and running a cooling task would break the cooldown rule the whole problem is built on. The tick is spent idle; the ready lane refills the moment the earliest readyAt arrives.',
      hint: 'Look at the ready lane. Is any task actually available right now?',
      concept: 'Idle tick',
    };
  }

  if (next.codeLine === 4 && current.elements.length > 0) {
    const pick = current.elements[0].value;
    const id = `sq-taskScheduler-execute-${index}`;
    const built = buildOptions(id, `'${pick}' — the ready task with the highest remaining count`, [
      `The task that has been cooling the longest`,
      `Round-robin — whoever ran least recently`,
      `Whichever task name comes first alphabetically`,
    ]);
    return {
      id,
      prompt: `Tick ${tick}: the ready lane holds ${current.elements
        .map((el) => el.value)
        .join(', ')}. Which task executes now?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation:
        'Greedy always takes the ready task with the most remaining copies. Finishing high-count tasks early lets their cooldowns overlap with other work; burning low-count tasks first strands the frequent ones and forces idle ticks later.',
      hint: 'Which choice leaves the least work cooling down later?',
      concept: 'Greedy pick',
    };
  }

  return null;
}

function predictRottingOranges(steps: StackQueueStep[], index: number): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (current.codeLine !== 5 || next.codeLine !== 5) return null;

  const freshNow = current.auxElements?.[0]?.auxValue;
  const freshNext = next.auxElements?.[0]?.auxValue;
  if (typeof freshNow !== 'number' || typeof freshNext !== 'number') return null;

  const minute = current.currentInputIndex ?? 0;
  const rotted = freshNow - freshNext;
  const id = `sq-rottingOranges-${index}`;
  const built = buildOptions(id, String(freshNext), [
    String(freshNow),
    String(freshNow - 1),
    '0',
  ]);
  return {
    id,
    prompt: `Minute ${minute} finished and queued ${current.elements.length} newly-rotten source(s). How many fresh oranges remain after minute ${minute + 1}?`,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation: `Every queued source rots its fresh 4-neighbours simultaneously — one BFS level is exactly one minute. Counting the fresh cells adjacent to the queued sources gives ${freshNow} − ${rotted} = ${freshNext} fresh left.`,
    hint: 'Look at the grid cells next to each queued source. How many of them are still fresh?',
    concept: 'Level spread',
  };
}

function predictDota2Senate(
  steps: StackQueueStep[],
  index: number,
  occurrence: number
): QuestionBody | null {
  const current = steps[index];
  const next = steps[index + 1];
  if (next.codeLine !== 4 && next.codeLine !== 6) return null;

  const rFront = current.elements[0]?.value;
  const dFront = current.auxElements?.[0]?.value;
  if (!rFront || !dFront) return null;

  const radiantBans = next.codeLine === 4;
  const round = next.currentInputIndex ?? 0;
  const id = `sq-dota2Senate-${index}`;

  /* Alternate: WHO wins the exchange vs WHAT happens to the winner. */
  if (occurrence % 2 === 0) {
    const correct = radiantBans
      ? `'${rFront}' bans '${dFront}' — the earlier index acts first`
      : `'${dFront}' bans '${rFront}' — the earlier index acts first`;
    const built = buildOptions(id, correct, [
      radiantBans ? `'${dFront}' bans '${rFront}'` : `'${rFront}' bans '${dFront}'`,
      'Both ban each other simultaneously',
      'The round ends in a draw and repeats',
    ]);
    return {
      id,
      prompt: `Round ${round}: the two queue fronts are '${rFront}' and '${dFront}'. Who bans whom?`,
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: radiantBans
        ? `Both fronts compare ORIGINAL indices: ${rFront} appears earlier in the senate string, so Radiant acts first and removes ${dFront} from the simulation — the Dire queue shrinks by one.`
        : `Both fronts compare ORIGINAL indices: ${dFront} appears earlier in the senate string, so Dire acts first and removes ${rFront} from the simulation — the Radiant queue shrinks by one.`,
      hint: 'The senate ribbon shows the original seating order. Which of the two front senators sits earlier?',
      concept: 'Earlier index wins',
    };
  }

  const built = buildOptions(
    id,
    `Re-enqueued at the back of its own queue, index shifted by n for the next round`,
    [
      `Removed from the simulation — its work is done`,
      `Moved to the opponent's queue`,
      `Bans again immediately in the same round`,
    ]
  );
  return {
    id,
    prompt: `A senator wins this round's exchange and bans an opponent. What happens to the winner next?`,
    options: built.options,
    correctIndex: built.correctIndex,
    explanation:
      'The war is round-robin: every surviving senator acts once per round. The winner re-enters its own queue with its index shifted by n (the senate size), which keeps “earlier index wins” meaningful when rounds repeat.',
    hint: 'One ban does not end the war. When is this senator’s next turn?',
    concept: 'Winner re-enqueue',
  };
}

const PREDICTORS: Partial<Record<StackQueueCategory, Predictor>> = {
  validParentheses: predictValidParentheses,
  postfixEval: predictPostfixEval,
  dailyTemperatures: predictDailyTemperatures,
  simplifyPath: predictSimplifyPath,
  removeAdjacentDuplicates: predictRemoveAdjacent,
  trappingRainWater: predictTrappingRainWater,
  largestRectangle: predictLargestRectangle,
  basicCalculator: predictBasicCalculator,
  decodeString: predictDecodeString,
  stackViaQueues: predictStackViaQueues,
  queueViaStacks: predictQueueViaStacks,
  firstNonRepeating: predictFirstNonRepeating,
  movingAverage: predictMovingAverage,
  taskScheduler: predictTaskScheduler,
  rottingOranges: predictRottingOranges,
  dota2Senate: predictDota2Senate,
};

/**
 * Build checkpoints for one stack/queue execution: a conceptual
 * 'reason' anchor at step 0, plus step-prediction checkpoints wherever
 * the category has a predictor and the stream is long enough to
 * interrupt.
 *
 * @param steps    the `StackQueueStep[]` produced by any operation generator
 * @param category which operation produced them
 */
export function buildStackQueueCheckpoints(
  steps: StackQueueStep[],
  category: StackQueueCategory
): QuizCheckpoint[] {
  if (steps.length < 1) return [];

  const anchor = anchorForCategory(category);
  const checkpoints: QuizCheckpoint[] = [];

  const anchorId = `sq-${category}-anchor`;
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
      kind: 'reason',
    },
  });

  const predictor = PREDICTORS[category];
  if (!predictor) return checkpoints;

  /* At least one uninterrupted step between questions — back-to-back
     prompts turn the visualization into a form to fill in. */
  let lastAsked = 0;
  let asked = 0;

  for (let index = 1; index < steps.length - 1; index++) {
    if (index - lastAsked < 2) continue;
    const body = predictor(steps, index, asked);
    if (!body) continue;
    checkpoints.push({
      stepIndex: index,
      question: { ...body, weight: weightFor(asked), kind: 'predict' },
    });
    asked += 1;
    lastAsked = index;
  }

  return checkpoints;
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
