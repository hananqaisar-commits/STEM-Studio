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

const makeAnchor = (
  prompt: string,
  correct: string,
  distractors: string[],
  explanation: string,
  hint: string,
  concept: string,
): Anchor => ({
  prompt,
  correct,
  distractors,
  explanation,
  hint,
  concept,
});

/* ── Five fixed conceptual anchors per flagship problem ────────────
   These rotate deterministically between runs while the existing
   generated step-prediction questions remain completely untouched. */

const SPECIFIC_ANCHORS: Partial<Record<StackQueueCategory, Anchor[]>> = {

  validParentheses: [
    makeAnchor(
      'Why does a valid-parentheses algorithm need a stack?',
      'Because the most recently opened unmatched bracket must be closed first',
      [
        'Because brackets are processed from right to left',
        'Because a stack automatically sorts bracket types',
        'Because the total number of brackets must stay even',
      ],
      'Nested brackets require last-opened-first-closed behavior, which is exactly LIFO.',
      'Think about nested parentheses like (( )).',
      'LIFO matching',
    ),
    makeAnchor(
      'When processing a closing bracket, what should be checked first?',
      'Whether the stack is non-empty and its top matches the closing bracket',
      [
        'Whether the bottom bracket matches',
        'Whether the input contains an even number of characters',
        'Whether every opening bracket appeared before every closing bracket',
      ],
      'A closing bracket can only match the latest unmatched opener, which is at the top.',
      'The next closer only cares about one pending opener.',
      'Top-of-stack validation',
    ),
    makeAnchor(
      'What does an empty stack at the end mean in valid-parentheses checking?',
      'Every opening bracket has been matched and closed',
      [
        'There were no brackets in the input',
        'Every bracket appeared twice',
        'The stack automatically discarded invalid brackets',
      ],
      'No unmatched opener remains when the stack is empty after the full scan.',
      'Ask: what would still be waiting if something were unmatched?',
      'Final emptiness',
    ),
    makeAnchor(
      'What is the usual time complexity of valid-parentheses checking?',
      'O(n)',
      [
        'O(n²)',
        'O(log n)',
        'O(2ⁿ)',
      ],
      'Each bracket is pushed and popped at most once, so the scan is linear.',
      'Count how many times one character can be processed.',
      'Linear scan',
    ),
    makeAnchor(
      'What is the main failure case for a closing bracket?',
      'The stack is empty or its top bracket has the wrong type',
      [
        'The string contains too many opening brackets before the scan',
        'The stack contains more than three elements',
        'The closing bracket appears at an odd index',
      ],
      'A closer is invalid if nothing is waiting or the most recent opener is incompatible.',
      'A closer needs exactly one valid partner.',
      'Mismatch detection',
    ),
  ],

  minStack: [
    makeAnchor(
      'Why does Min Stack usually keep a second stack?',
      'To remember the minimum value at every stack depth',
      [
        'To sort the main stack',
        'To duplicate every value for faster push',
        'To store only values that are negative',
      ],
      'The auxiliary stack preserves the previous minimum when the current minimum is popped.',
      'A single minimum variable loses history after a pop.',
      'Minimum history',
    ),
    makeAnchor(
      'What should be pushed onto the minimum stack when value x arrives?',
      'min(x, currentMinimum)',
      [
        'Always x',
        'Always the previous minimum',
        'The average of x and the previous minimum',
      ],
      'Each depth stores the smallest value visible at that depth.',
      'Ask what the minimum should be immediately after this push.',
      'Running minimum',
    ),
    makeAnchor(
      'Why can getMin() be O(1) in a Min Stack?',
      'The current minimum is kept at the top of the auxiliary stack',
      [
        'The main stack is kept sorted',
        'The stack scans every element in advance',
        'The smallest value is always pushed first',
      ],
      'The current minimum is directly available without scanning.',
      'No search is needed when the answer is already stored.',
      'Constant-time minimum',
    ),
    makeAnchor(
      'What must happen to the minimum stack when the main stack pops?',
      'Its top must also be popped',
      [
        'It must be sorted again',
        'It must be cleared',
        'Nothing ever changes',
      ],
      'Both stacks represent the same depth, so popping one depth must pop the other.',
      'Both stacks have synchronized history.',
      'Synchronized depth',
    ),
    makeAnchor(
      'What extra space does a Min Stack typically use?',
      'O(n)',
      [
        'O(1)',
        'O(log n)',
        'O(n²)',
      ],
      'The auxiliary stack can contain one minimum entry per main-stack element.',
      'Count the possible auxiliary entries.',
      'Auxiliary space',
    ),
  ],

  postfixEval: [
    makeAnchor(
      'What does the stack hold while evaluating a postfix expression?',
      'Operands whose results are waiting for a later operator',
      [
        'Operators waiting for operands',
        'Parentheses waiting to be closed',
        'Every token in sorted order',
      ],
      'Operands stay on the stack until an operator consumes them.',
      'Think about what must survive until an operator appears.',
      'Pending operands',
    ),
    makeAnchor(
      'When an operator appears, which operand is popped first?',
      'The top value is the right operand and the next value is the left operand',
      [
        'The bottom value is always the right operand',
        'Operands are interchangeable for every operator',
        'The top value is always the left operand',
      ],
      'For subtraction and division, stack order matters: a = left, b = right, then a op b.',
      'Use 8 2 − as a test.',
      'Operand order',
    ),
    makeAnchor(
      'Why does postfix evaluation not require precedence rules?',
      'The token order already determines exactly when each operator executes',
      [
        'Every operator has equal precedence',
        'The stack sorts operators by precedence',
        'Parentheses are inserted automatically',
      ],
      'Postfix places each operator after its operands, so grouping is implicit.',
      'The operator cannot execute before its operands exist.',
      'Implicit grouping',
    ),
    makeAnchor(
      'What is the usual time complexity of postfix evaluation?',
      'O(n)',
      [
        'O(n²)',
        'O(log n)',
        'O(2ⁿ)',
      ],
      'Each token is processed once and each operand is pushed and popped at most once.',
      'Count work per token.',
      'Linear evaluation',
    ),
    makeAnchor(
      'What happens when the final postfix evaluation finishes correctly?',
      'Exactly one result remains on the stack',
      [
        'The stack must contain all original operands',
        'The stack must contain every operator',
        'The stack must be empty before reading the final token',
      ],
      'A valid expression reduces all operands and operators to one final result.',
      'One complete expression should produce one value.',
      'Single final result',
    ),
  ],

  dailyTemperatures: [
    makeAnchor(
      'Why does Daily Temperatures store indices instead of temperatures?',
      'The answer is a day distance, so the algorithm needs i − j',
      [
        'Indices are always smaller than temperatures',
        'Temperatures cannot be stored in a stack',
        'Indices are already sorted by temperature',
      ],
      'The number of days waited depends on positions, not just values.',
      'The answer is literally a distance between days.',
      'Index stack',
    ),
    makeAnchor(
      'What makes the stack in Daily Temperatures monotonic?',
      'Temperatures represented by indices remain in decreasing order',
      [
        'Indices remain in decreasing order',
        'All temperatures are globally sorted',
        'The stack contains only the maximum temperature',
      ],
      'A warmer incoming day pops every cooler unresolved day.',
      'Ask what must be true before a warmer day arrives.',
      'Monotonic decrease',
    ),
    makeAnchor(
      'When does an index finally receive its answer?',
      'When a warmer temperature causes that index to be popped',
      [
        'As soon as the index is pushed',
        'Only after the complete array is scanned twice',
        'When it reaches the bottom of the stack',
      ],
      'The current index is the first later day known to be warmer, so the difference gives the answer.',
      'A pop means the waiting period has just been resolved.',
      'Resolution on pop',
    ),
    makeAnchor(
      'Why are multiple indices popped by one warmer temperature?',
      'One warmer day can resolve several earlier days waiting for any warmer value',
      [
        'All earlier days have the same answer',
        'The stack must always have one element',
        'The warmer value replaces every previous temperature',
      ],
      'Every popped temperature is smaller than the current one, so the current day resolves each of them.',
      'Imagine several consecutive cooler days.',
      'Batch resolution',
    ),
    makeAnchor(
      'What is the typical time complexity of the monotonic-stack solution?',
      'O(n)',
      [
        'O(n²)',
        'O(log n)',
        'O(n³)',
      ],
      'Each index is pushed once and popped at most once.',
      'Can one index be popped more than once?',
      'Amortized linear time',
    ),
  ],

  trappingRainWater: [
    makeAnchor(
      'What does a popped bar represent in the monotonic-stack solution?',
      'The middle valley whose trapped water can now be bounded by left and right walls',
      [
        'The global maximum bar',
        'A bar that can never trap water',
        'The final answer for the entire array',
      ],
      'When a taller right wall arrives, the popped bar becomes the basin floor.',
      'Think left wall, bottom, right wall.',
      'Valley discovery',
    ),
    makeAnchor(
      'What determines the water height above a valley?',
      'The smaller of the left and right boundary heights',
      [
        'The taller boundary only',
        'The valley floor only',
        'The average of all bars',
      ],
      'Water cannot rise above the shorter wall.',
      'A container is limited by its shorter wall.',
      'Boundary minimum',
    ),
    makeAnchor(
      'Why does the stack maintain decreasing heights?',
      'A taller incoming bar is needed to reveal a trapped basin',
      [
        'To keep indices sorted',
        'To guarantee the tallest bar is at the top',
        'Because equal heights cannot exist',
      ],
      'Until a taller bar appears, the right boundary needed to calculate the basin is missing.',
      'Ask what event makes a valley measurable.',
      'Monotonic boundary',
    ),
    makeAnchor(
      'What information is required to calculate a newly discovered water region?',
      'Left boundary, right boundary, valley bottom, and their horizontal distance',
      [
        'Only the tallest bar',
        'Only the current bar height',
        'Only the array length',
      ],
      'Area depends on bounded height and width.',
      'Area is height multiplied by width.',
      'Water geometry',
    ),
    makeAnchor(
      'What is the typical time complexity of the monotonic-stack solution?',
      'O(n)',
      [
        'O(n²)',
        'O(log n)',
        'O(2ⁿ)',
      ],
      'Every index enters and leaves the stack at most once.',
      'Count pushes and pops over the whole scan.',
      'Linear water trapping',
    ),
  ],

  largestRectangle: [
    makeAnchor(
      'Why is a histogram bar popped when a shorter bar arrives?',
      'Its maximum possible rectangle width is now determined by the new right boundary',
      [
        'The bar is globally the shortest',
        'The algorithm wants to sort the histogram',
        'Every shorter bar must be deleted',
      ],
      'A shorter bar proves the taller bar cannot extend farther right.',
      'A rectangle ends when you meet a shorter height.',
      'Right boundary discovery',
    ),
    makeAnchor(
      'Why is a sentinel height 0 appended?',
      'To force remaining bars to pop at the end',
      [
        'To represent the median bar',
        'To store the best area',
        'To increase the histogram capacity',
      ],
      'Without a shorter final bar, increasing bars could remain unresolved.',
      'What if the histogram keeps rising until its last element?',
      'Sentinel flush',
    ),
    makeAnchor(
      'How is the width of a popped rectangle found?',
      'Using the current index as the right boundary and the new stack top as the left boundary',
      [
        'Using only the popped bar index',
        'Using the histogram midpoint',
        'Using the global maximum index',
      ],
      'The new stack top marks the first smaller bar on the left.',
      'Width lies between the two smaller boundaries.',
      'Rectangle width',
    ),
    makeAnchor(
      'What does an increasing stack of heights represent?',
      'Bars that can still extend farther to the right without hitting a shorter bar',
      [
        'Bars already at their maximum area',
        'Bars sorted by index',
        'Bars that must be removed immediately',
      ],
      'Each unresolved bar still has the possibility of gaining width.',
      'No shorter right boundary has appeared yet.',
      'Unresolved extension',
    ),
    makeAnchor(
      'What is the typical time complexity of the monotonic-stack solution?',
      'O(n)',
      [
        'O(n²)',
        'O(n log n)',
        'O(2ⁿ)',
      ],
      'Each histogram bar is pushed once and popped at most once.',
      'Count total stack operations.',
      'Linear histogram scan',
    ),
  ],

  simplifyPath: [
    makeAnchor(
      'What should a directory stack do when it sees ".."?',
      'Pop the most recent directory when one exists',
      [
        'Push ".." as a literal directory',
        'Clear the entire stack',
        'Move to the first directory',
      ],
      'Parent navigation cancels the current directory.',
      'Think about `cd ..`.',
      'Parent navigation',
    ),
    makeAnchor(
      'What should happen when simplifyPath sees "."?',
      'Nothing',
      [
        'Push "." onto the stack',
        'Pop two directories',
        'Reset to the root',
      ],
      'A single dot refers to the current directory and does not change the canonical path.',
      '`.` means stay here.',
      'No-op directory',
    ),
    makeAnchor(
      'Why does a stack naturally fit canonical path simplification?',
      'A later ".." cancels the most recently accepted directory',
      [
        'Paths are automatically sorted by a stack',
        'A stack removes every duplicate directory',
        'Stacks always store absolute paths',
      ],
      'The latest directory is exactly the one that parent navigation removes.',
      'Which directory is affected by the next `..`?',
      'LIFO path state',
    ),
    makeAnchor(
      'What should multiple consecutive slashes generally do?',
      'They do not create additional directory entries',
      [
        'They create empty directories',
        'They reset the stack',
        'They reverse the path',
      ],
      'Canonical Unix paths treat repeated separators as separators, not directories.',
      'Split into meaningful path components.',
      'Path normalization',
    ),
    makeAnchor(
      'What is the typical complexity of simplifying a path?',
      'O(n)',
      [
        'O(n²)',
        'O(log n)',
        'O(2ⁿ)',
      ],
      'Each path component is processed once and pushed or popped at most once.',
      'Count the number of path components.',
      'Linear path processing',
    ),
  ],

  decodeString: [
    makeAnchor(
      'What two pieces of context are saved when `[` is encountered?',
      'The current built string and the repeat count',
      [
        'Only the repeat count',
        'Only the final decoded result',
        'The matching bracket index',
      ],
      'Nested decoding needs both the outer string and how many times the inner part repeats.',
      'At `]`, what two facts are needed to rebuild the result?',
      'Paired context',
    ),
    makeAnchor(
      'What does the repeat count before `[` represent?',
      'How many times the bracketed substring should be repeated',
      [
        'The substring length',
        'The stack depth',
        'The index of the closing bracket',
      ],
      'The number directly controls expansion at the matching `]`.',
      'Read `3[a]` literally.',
      'Repeat multiplier',
    ),
    makeAnchor(
      'Why does decoding use a stack for nested brackets?',
      'Each nesting level has its own string and repeat count that must be restored later',
      [
        'The stack sorts characters',
        'The stack prevents digits from appearing',
        'The stack removes duplicate substrings',
      ],
      'Nested contexts must be suspended and resumed in LIFO order.',
      'Inner work finishes before outer work resumes.',
      'Nested context',
    ),
    makeAnchor(
      'What happens at a closing bracket `]`?',
      'The inner decoded string is expanded and combined with the saved outer string',
      [
        'The entire expression is restarted',
        'The current result is discarded',
        'The repeat count is ignored',
      ],
      'The matching saved context tells the algorithm how to rebuild this level.',
      'This is where the suspended outer context returns.',
      'Context restoration',
    ),
    makeAnchor(
      'Why is a string stack and count stack often conceptually paired?',
      'Each nested level needs both its previous string state and its multiplier',
      [
        'Strings and counts always have equal numeric values',
        'One stack stores errors',
        'Both stacks are required only for memory allocation',
      ],
      'The two values belong to the same nesting level and are restored together.',
      'Think of them as one saved frame.',
      'Nested frame',
    ),
  ],

  basicCalculator: [
    makeAnchor(
      'What must be saved when `(` begins a sub-expression?',
      'The current result and sign from the outer expression',
      [
        'Only the full input string',
        'Only the current number',
        'Nothing',
      ],
      'The inner expression temporarily replaces the outer running state.',
      'Ask what would be lost when the result resets for the inner expression.',
      'Context stack',
    ),
    makeAnchor(
      'Why can a sign be stored as context for a parenthesized expression?',
      'It tells how the completed inner result should be combined with the outer result',
      [
        'It stores the next digit',
        'It identifies the matching parenthesis index',
        'It sorts operators',
      ],
      'After `)` the saved sign determines whether the inner value is added or subtracted.',
      'The outer operator still matters after the inner expression finishes.',
      'Saved operator context',
    ),
    makeAnchor(
      'What happens when `)` is encountered?',
      'The inner result is folded back into the saved outer result',
      [
        'The expression is discarded',
        'The stack is cleared completely',
        'The scanner jumps to the start',
      ],
      'The closing parenthesis restores the suspended outer context.',
      'Think: resume the expression that was waiting.',
      'Sub-expression return',
    ),
    makeAnchor(
      'Why can this calculator be evaluated in one left-to-right pass?',
      'Parentheses context is stored explicitly, so earlier text never needs to be rescanned',
      [
        'All expressions are automatically sorted',
        'Parentheses have no effect',
        'Numbers are always single-digit',
      ],
      'The stack carries exactly the information needed to resume outer expressions.',
      'A good stack stores context instead of restarting work.',
      'Single-pass evaluation',
    ),
    makeAnchor(
      'What is the typical time complexity of this stack-based calculator?',
      'O(n)',
      [
        'O(n²)',
        'O(log n)',
        'O(2ⁿ)',
      ],
      'Each character is scanned a constant number of times.',
      'Count work per character.',
      'Linear expression evaluation',
    ),
  ],

  removeAdjacentDuplicates: [
    makeAnchor(
      'Why does a stack naturally remove adjacent duplicates in one pass?',
      'The stack top is the last surviving character, so it can be compared with the next character',
      [
        'The stack sorts characters alphabetically',
        'The stack counts frequencies globally',
        'The stack scans the string backwards',
      ],
      'The top represents exactly the character immediately before the incoming one in the reduced string.',
      'Compare the incoming character with the current reduced-string end.',
      'Local cancellation',
    ),
    makeAnchor(
      'What causes cascading removals?',
      'A pop exposes a new stack top that may now match the incoming character',
      [
        'The whole string is rescanned every time',
        'A frequency map deletes all copies',
        'The stack reverses the entire input',
      ],
      'Removing one pair can make a new pair adjacent.',
      'What becomes adjacent after a pop?',
      'Cascading cancellation',
    ),
    makeAnchor(
      'What happens when the incoming character differs from the stack top?',
      'It is pushed',
      [
        'It is discarded',
        'The whole stack is cleared',
        'The previous top is duplicated',
      ],
      'A mismatch means no adjacent pair exists at that point.',
      'Different neighbors should both survive.',
      'Push on mismatch',
    ),
    makeAnchor(
      'What happens when the incoming character equals the stack top?',
      'The top is popped instead of pushing another copy',
      [
        'Both characters stay',
        'The entire stack is reversed',
        'Only the incoming character remains',
      ],
      'Matching adjacent characters cancel as a pair.',
      'Equal neighboring characters disappear together.',
      'Pair cancellation',
    ),
    makeAnchor(
      'What is the typical time complexity of this algorithm?',
      'O(n)',
      [
        'O(n²)',
        'O(log n)',
        'O(2ⁿ)',
      ],
      'Each character is pushed at most once and popped at most once.',
      'Total stack operations stay linear.',
      'Linear cancellation',
    ),
  ],

  queueViaStacks: [
    makeAnchor(
      'Why are two stacks enough to implement a queue?',
      'A second reversal restores FIFO order when elements move from input to output',
      [
        'Two stacks automatically sort values',
        'One stack stores only even elements',
        'A stack is already FIFO',
      ],
      'The first stack records arrival order and the second reverses it for removal order.',
      'One reversal changes LIFO into FIFO.',
      'Two-stack reversal',
    ),
    makeAnchor(
      'When should elements be transferred from In-Stack to Out-Stack?',
      'When Out-Stack is empty and a dequeue is needed',
      [
        'After every enqueue',
        'After every dequeue no matter what',
        'Only when In-Stack is empty',
      ],
      'If Out-Stack still contains older elements, moving newer values into it would break FIFO.',
      'Do not disturb already-ready oldest elements.',
      'Transfer on empty',
    ),
    makeAnchor(
      'Why can dequeue be O(1) after a transfer?',
      'The oldest element is on top of Out-Stack',
      [
        'The entire queue is sorted',
        'Out-Stack contains one element only',
        'Dequeues never modify the stack',
      ],
      'The reversal puts the oldest arrival at the accessible top.',
      'FIFO becomes LIFO after one controlled reversal.',
      'Constant dequeue',
    ),
    makeAnchor(
      'What is the amortized complexity of queue operations with two stacks?',
      'O(1) amortized per operation',
      [
        'O(n) for every operation',
        'O(n²) amortized',
        'O(log n) always',
      ],
      'An element can be transferred only a constant number of times across the two stacks.',
      'Expensive transfers are spread across many operations.',
      'Amortized analysis',
    ),
    makeAnchor(
      'Which stack receives new enqueued elements first?',
      'The In-Stack',
      [
        'The Out-Stack',
        'Both equally',
        'Neither until dequeue',
      ],
      'In-Stack records the incoming order before any reversal.',
      'Think of one stack as the arrival lane.',
      'Input stack',
    ),
  ],

  stackViaQueues: [
    makeAnchor(
      'Why can push be made O(n) in a stack implemented with queues?',
      'The new element can be rotated to the front so pop becomes O(1)',
      [
        'Queues are naturally LIFO',
        'The stack can never contain more than one value',
        'Push never changes queue order',
      ],
      'After rotation, the newest value is at the front of the main queue.',
      'The stack top must be the next value dequeued.',
      'Costly push',
    ),
    makeAnchor(
      'Why is the newest value moved to the front of the main queue?',
      'Because the front is the position used for the O(1) pop',
      [
        'Because the rear is inaccessible',
        'Because queues automatically reverse themselves',
        'Because the newest value is always the smallest',
      ],
      'Pop is implemented as dequeue, so the desired stack top must already be at the front.',
      'Where does dequeue remove from?',
      'Front-as-top',
    ),
    makeAnchor(
      'Why is an auxiliary queue useful during push?',
      'It lets the newly inserted value become first while preserving the old values behind it',
      [
        'It sorts the old values',
        'It stores only duplicate values',
        'It replaces the main queue permanently',
      ],
      'Rotating values into a fresh queue builds the desired LIFO-facing order.',
      'Imagine inserting x before the old queue contents.',
      'Auxiliary rotation',
    ),
    makeAnchor(
      'What is the typical time complexity of pop in the one-costly-operation design?',
      'O(1)',
      [
        'O(n)',
        'O(n²)',
        'O(log n)',
      ],
      'The newest element has already been arranged at the front.',
      'All expensive reordering happened during push.',
      'Constant pop',
    ),
    makeAnchor(
      'What trade-off does this queue-based stack implementation make?',
      'It spends more time on push to make pop fast',
      [
        'It uses no memory but slower push',
        'It makes both operations O(n²)',
        'It removes LIFO behavior entirely',
      ],
      'The design chooses where to pay the reordering cost.',
      'One operation is intentionally expensive.',
      'Time trade-off',
    ),
  ],

  circularQueue: [
    makeAnchor(
      'Why does a circular queue use modulo arithmetic for the rear index?',
      'To wrap the index back to slot 0 after the last slot',
      [
        'To sort the queue',
        'To increase capacity automatically',
        'To prevent dequeue',
      ],
      'Modulo implements ring wraparound without moving existing elements.',
      'What should happen after the last array position?',
      'Ring wraparound',
    ),
    makeAnchor(
      'Why is a circular queue more space-efficient than a naive array queue?',
      'Freed slots at the front can be reused after dequeue',
      [
        'It doubles the array size',
        'It compresses every stored value',
        'It removes the need for a rear pointer',
      ],
      'Wraparound lets later enqueues use positions that earlier dequeues freed.',
      'Picture the array as a ring instead of a line.',
      'Space reuse',
    ),
    makeAnchor(
      'What does the front index represent?',
      'The position of the current oldest queue element',
      [
        'The position of the newest element',
        'The next free slot only',
        'The queue midpoint',
      ],
      'FIFO removal always happens from the oldest element.',
      'Front means where dequeue looks.',
      'Front pointer',
    ),
    makeAnchor(
      'What does the rear index represent?',
      'The position associated with the newest enqueued element',
      [
        'The oldest element',
        'The queue midpoint',
        'The current capacity',
      ],
      'Enqueue advances the rear around the ring.',
      'Rear means where new data arrives.',
      'Rear pointer',
    ),
    makeAnchor(
      'What is the main advantage of circular indexing?',
      'Enqueue and dequeue can remain O(1) without shifting elements',
      [
        'Sorting becomes automatic',
        'Memory becomes unlimited',
        'Every queue becomes priority-based',
      ],
      'Only index pointers move; stored elements do not need to be shifted.',
      'A good queue implementation moves pointers, not all elements.',
      'Constant-time queue operations',
    ),
  ],

  circularDeque: [
    makeAnchor(
      'Why does insertFront use `(front - 1 + capacity) % capacity`?',
      'It wraps front backward safely even when front is 0',
      [
        'It doubles the capacity',
        'It moves the front forward',
        'It prevents every insertion',
      ],
      'Adding capacity before modulo avoids a negative index.',
      'Test the formula with front = 0.',
      'Backward wraparound',
    ),
    makeAnchor(
      'What makes a deque different from a normal queue?',
      'Insertion and removal are supported at both ends',
      [
        'It only removes from the rear',
        'It always sorts values',
        'It has no front pointer',
      ],
      'A deque exposes both front and rear operations.',
      'Think double-ended queue.',
      'Double-ended access',
    ),
    makeAnchor(
      'Why is modulo important in a circular deque?',
      'It keeps both front and rear positions inside the fixed-size ring',
      [
        'It makes every value unique',
        'It sorts the deque',
        'It increases the number of stored items',
      ],
      'Both ends may move backward or forward and need wraparound.',
      'Both directions need ring arithmetic.',
      'Circular indexing',
    ),
    makeAnchor(
      'What problem does adding capacity before modulo solve?',
      'Negative intermediate indices',
      [
        'Duplicate values',
        'Queue overflow',
        'Unsorted elements',
      ],
      'Many languages can produce a negative remainder from a negative dividend.',
      'Consider `(0 - 1) % capacity`.',
      'Safe modulo',
    ),
    makeAnchor(
      'What is the typical goal of a circular deque implementation?',
      'O(1) insertion and removal at both ends',
      [
        'O(n) insertion so values stay sorted',
        'O(log n) access to arbitrary positions',
        'Automatic priority scheduling',
      ],
      'Pointer arithmetic gives constant-time end operations.',
      'Only the ends need to move.',
      'Constant-time deque',
    ),
  ],

  slidingWindow: [
    makeAnchor(
      'Why does a monotonic deque store indices rather than just values?',
      'Indices reveal both the value through the array and whether an entry has left the window',
      [
        'Indices always take less memory',
        'Only indices can be stored in a deque',
        'Indices keep the input sorted',
      ],
      'Window membership depends on position, while value comparisons still use the array.',
      'The window moves by index.',
      'Index deque',
    ),
    makeAnchor(
      'Why are smaller values removed from the deque back when a larger value arrives?',
      'They can never become the maximum while the larger newer value remains in the window',
      [
        'Smaller values are invalid input',
        'The deque only stores equal values',
        'The algorithm needs sorted input',
      ],
      'The newer larger value dominates them for every future window containing both.',
      'Ask: can the smaller value ever beat the larger one later?',
      'Dominance pruning',
    ),
    makeAnchor(
      'Why must expired indices be removed from the deque front?',
      'They are no longer inside the current sliding window',
      [
        'They have the smallest values',
        'They were inserted first',
        'They are always duplicates',
      ],
      'An expired value cannot contribute to the current maximum.',
      'Window boundaries matter.',
      'Expiry eviction',
    ),
    makeAnchor(
      'What should the deque front represent after maintenance?',
      'The index of the maximum value in the current window',
      [
        'The oldest index regardless of value',
        'The minimum value in the window',
        'The last inserted index only',
      ],
      'The monotonic decreasing structure keeps the largest value at the front.',
      'Front is the answer candidate.',
      'Maximum-at-front',
    ),
    makeAnchor(
      'What is the typical complexity of monotonic-deque sliding window maximum?',
      'O(n)',
      [
        'O(n²)',
        'O(n log n)',
        'O(2ⁿ)',
      ],
      'Each index enters and leaves the deque at most once.',
      'Amortized work per element stays constant.',
      'Linear sliding window',
    ),
  ],

  firstNonRepeating: [
    makeAnchor(
      'Why does the algorithm need both a frequency map and a queue?',
      'The map tracks counts while the queue preserves candidate order',
      [
        'Both structures store identical data',
        'The queue sorts frequencies',
        'The map stores only positions',
      ],
      'Frequency answers validity; queue order answers which valid character came first.',
      'One structure answers how many, the other who came first.',
      'Map plus queue',
    ),
    makeAnchor(
      'Why can the queue contain a repeated character temporarily?',
      'Cleanup is lazy and happens when that character reaches the front',
      [
        'Repeated characters are always valid',
        'The queue cannot remove from the front',
        'The map is checked only once',
      ],
      'Removing every invalid character immediately would require more work than necessary.',
      'Ask when the algorithm actually needs to inspect a candidate.',
      'Lazy cleanup',
    ),
    makeAnchor(
      'What does the queue front represent?',
      'The earliest candidate that has not yet been proven invalid',
      [
        'The most frequent character',
        'The latest character seen',
        'The alphabetically smallest character',
      ],
      'FIFO preserves arrival order among possible non-repeating candidates.',
      'Earliest candidate comes first.',
      'Candidate order',
    ),
    makeAnchor(
      'What happens when the queue front has frequency greater than one?',
      'It is removed because it can no longer be the answer',
      [
        'Its frequency is increased',
        'It is moved to the rear',
        'It becomes the answer',
      ],
      'A frequency above one proves the character repeats.',
      'The front is checked for current validity.',
      'Invalidation',
    ),
    makeAnchor(
      'What is the usual complexity of the first-non-repeating-character stream algorithm?',
      'O(n) total time',
      [
        'O(n²)',
        'O(log n)',
        'O(2ⁿ)',
      ],
      'Each character is enqueued once and removed from the queue at most once.',
      'Count total map and queue operations.',
      'Linear stream processing',
    ),
  ],

  taskScheduler: [
    makeAnchor(
      'Why does the scheduler prioritize the task with the highest remaining count?',
      'Using frequent tasks early helps their cooldowns overlap with other work',
      [
        'Frequent tasks always have the shortest execution time',
        'The alphabet requires that order',
        'Rare tasks cannot be scheduled later',
      ],
      'The main risk is leaving a highly frequent task stranded by cooldown gaps.',
      'Which task is hardest to fit later?',
      'Greedy frequency choice',
    ),
    makeAnchor(
      'What does the cooldown queue usually track?',
      'Tasks that have run recently and the time when they become available again',
      [
        'Only completed tasks',
        'Only the least frequent task',
        'All tasks sorted alphabetically',
      ],
      'A cooling task cannot return to the ready pool until its cooldown expires.',
      'A cooldown is a future availability event.',
      'Cooldown tracking',
    ),
    makeAnchor(
      'When can the scheduler execute a task?',
      'When its remaining count is positive and it is not cooling down',
      [
        'Whenever its count is highest, even during cooldown',
        'Only when every task has equal count',
        'Only after all tasks finish',
      ],
      'Both frequency and availability constraints must hold.',
      'Ready work is different from total work.',
      'Ready-set condition',
    ),
    makeAnchor(
      'What should happen if no task is ready but work remains?',
      'Advance time, representing an idle slot',
      [
        'Delete the cooling tasks',
        'Reset all task counts',
        'Execute a random cooling task',
      ],
      'The CPU may need to wait until a task exits cooldown.',
      'No ready work means time still moves.',
      'Idle tick',
    ),
    makeAnchor(
      'Why can a max-heap be useful in this problem?',
      'It gives fast access to the ready task with the largest remaining frequency',
      [
        'It stores cooldown times in sorted order only',
        'It guarantees zero idle time',
        'It removes the need for a queue',
      ],
      'Priority by remaining count is exactly what a max-heap provides.',
      'We need the largest count quickly.',
      'Priority queue',
    ),
  ],

  movingAverage: [
    makeAnchor(
      'Why does a queue fit a fixed-size moving average?',
      'The oldest value leaves exactly when the newest value enters',
      [
        'Queues automatically calculate averages',
        'Queues sort the values',
        'Only queues support numeric values',
      ],
      'FIFO order matches the sliding window’s entering and leaving behavior.',
      'Which value should leave first?',
      'FIFO window',
    ),
    makeAnchor(
      'How can the average be updated in O(1)?',
      'Add the incoming value and subtract the outgoing value from a running sum',
      [
        'Recompute every value in the window',
        'Sort the window first',
        'Store every previous average',
      ],
      'Only two values change when the window slides.',
      'Only one enters and one leaves.',
      'Running sum',
    ),
    makeAnchor(
      'What should happen before the window reaches its full size?',
      'The running sum is divided by the current number of elements',
      [
        'Always divide by the maximum window size',
        'Return zero',
        'Discard the new value',
      ],
      'The current window may contain fewer than the target number of elements.',
      'The divisor is the current count.',
      'Partial window',
    ),
    makeAnchor(
      'What value must be removed from the queue when the window is full and a new value arrives?',
      'The oldest value',
      [
        'The largest value',
        'The smallest value',
        'The newest value',
      ],
      'FIFO removal preserves the sliding-window boundary.',
      'Think first-in, first-out.',
      'Window eviction',
    ),
    makeAnchor(
      'What is the typical complexity per new sample?',
      'O(1)',
      [
        'O(k)',
        'O(n log n)',
        'O(n²)',
      ],
      'One enqueue, one possible dequeue, and constant-time arithmetic are enough.',
      'No full-window scan is needed.',
      'Constant-time update',
    ),
  ],

  rottingOranges: [
    makeAnchor(
      'Why do all rotten oranges enter the BFS queue at minute 0?',
      'They are simultaneous sources of the spread',
      [
        'They need to be sorted first',
        'Only one source is allowed per BFS',
        'The queue requires one orange per minute',
      ],
      'Multi-source BFS measures the earliest spread from every rotten orange at once.',
      'All sources start at the same time.',
      'Multi-source BFS',
    ),
    makeAnchor(
      'What does one BFS level represent in Rotting Oranges?',
      'One minute of spread',
      [
        'One orange processed',
        'One row of the grid',
        'One completed path',
      ],
      'All nodes in the same BFS level are reached at the same elapsed time.',
      'BFS depth maps directly to minutes.',
      'Time by BFS level',
    ),
    makeAnchor(
      'When does a fresh orange become rotten?',
      'When it is first reached by a neighboring rotten orange',
      [
        'Only after scanning the whole grid',
        'When it reaches the queue rear',
        'When all fresh oranges are adjacent',
      ],
      'The first BFS arrival is the minimum time to that cell.',
      'BFS discovers the earliest possible minute.',
      'First-arrival infection',
    ),
    makeAnchor(
      'How do you know whether the final answer is impossible?',
      'At the end, at least one fresh orange remains',
      [
        'The queue is empty at the start',
        'There are no rotten oranges',
        'The grid has an even number of cells',
      ],
      'Any unreachable fresh orange can never rot.',
      'Look for fresh cells after BFS finishes.',
      'Unreachable fresh cells',
    ),
    makeAnchor(
      'What is the typical time complexity?',
      'O(R × C)',
      [
        'O((R × C)²)',
        'O(log(R × C))',
        'O(2^(R×C))',
      ],
      'Each grid cell is enqueued and processed at most once.',
      'Count the cells, not all possible paths.',
      'Grid-linear BFS',
    ),
  ],

  dota2Senate: [
    makeAnchor(
      'Why are senate members stored by their original positions?',
      'Relative order determines whose turn comes first',
      [
        'Positions determine voting power',
        'Positions determine party membership',
        'Positions are used only for sorting by name',
      ],
      'The simulation is round-robin, so the original turn order matters.',
      'The earlier senator acts earlier in each round.',
      'Turn order',
    ),
    makeAnchor(
      'Why is a surviving senator re-enqueued at index + n?',
      'It represents that senator’s next turn in the following round',
      [
        'It removes the senator from future rounds',
        'It increases voting power',
        'It marks the senator as defeated',
      ],
      'Adding n moves the same relative position into the next round.',
      'Every survivor gets another future turn.',
      'Round advancement',
    ),
    makeAnchor(
      'What does comparing the two queue fronts tell us?',
      'Which party member gets to act first',
      [
        'Which party has more total senators',
        'Which senator has greater voting power',
        'Which party has the alphabetically earlier name',
      ],
      'The smallest scheduled index acts first.',
      'Front means earliest upcoming turn.',
      'Scheduled turn',
    ),
    makeAnchor(
      'What happens to the senator who wins a ban?',
      'That senator survives and is scheduled again for a later round',
      [
        'The winner also leaves forever',
        'The winner changes party',
        'The winner loses voting rights',
      ],
      'Only the banned opponent is removed; the winner remains eligible.',
      'Winning an interaction does not end the winner’s participation.',
      'Survivor requeue',
    ),
    makeAnchor(
      'What is the core data-structure idea behind the efficient simulation?',
      'Two queues preserve each party’s next scheduled turn',
      [
        'A stack sorts both parties',
        'A hash map replaces turn order',
        'A tree stores every possible vote',
      ],
      'Queues model repeated round-robin turns naturally.',
      'Future turns are consumed from the front.',
      'Two-queue simulation',
    ),
  ],
};

function anchorForCategory(
  category: StackQueueCategory,
  stepCount: number,
): Anchor {
  /* Flagship problems carry their own rotating conceptual anchors;
     primitives fall back to the generic LIFO/FIFO/bracket definitions. */
  const specific = SPECIFIC_ANCHORS[category];
  if (specific?.length) {
    return specific[stepCount % specific.length];
  }

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

  const anchor = anchorForCategory(category, steps.length);
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
