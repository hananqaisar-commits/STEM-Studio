import type { ArrayStep } from '../../engine/types/Step';
import { buildOptions, type QuizCheckpoint, type QuizWeight , type QuizRevisionData } from '../../engine/types/Quiz';

/* ── Recursion quiz adapter ────────────────────────────────────────────
   Builds conceptual checkpoints for each recursion algorithm.
   Since recursion steps don't have simple compare/swap semantics like
   sorting, we rely on conceptual anchor questions + step-based
   "what happens next?" questions derived from the call tree state.
   ─────────────────────────────────────────────────────────────────── */

export type RecursionAlgorithmKey =
  | 'factorial'
  | 'fibonacci'
  | 'power'
  | 'arraySum'
  | 'towerOfHanoi';

/* ── Conceptual anchors (one per algorithm, asked at step 0) ────────── */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<RecursionAlgorithmKey, Anchor> = {
  factorial: {
    prompt: 'What is the base case for factorial?',
    correct: 'fact(0) = 1',
    distractors: ['fact(1) = 0', 'fact(n) = n', 'fact(0) = 0'],
    explanation:
      'The base case is fact(0) = 1. Every recursive factorial call chain terminates at n=0, which returns 1. The multiplicative identity (1) is used because factorial is a product.',
    hint: 'What value of n stops the recursion, and what does it return?',
    concept: 'Base case',
  },
  fibonacci: {
    prompt: 'Why does naive recursive fibonacci have exponential time complexity?',
    correct: 'Each call branches into two sub-calls, creating an exponentially growing tree of redundant computations',
    distractors: [
      'Because each call does an expensive addition operation',
      'Because the base case is reached exponentially many times',
      'Because the recursion depth grows linearly',
    ],
    explanation:
      'fib(n) calls fib(n-1) and fib(n-2), so the call tree roughly doubles at each level. Many sub-problems are solved repeatedly — fib(2) is computed many times for fib(5). This gives O(2^n) total calls.',
    hint: 'Count how many times fib(2) appears in the call tree for fib(5).',
    concept: 'Exponential branching',
  },
  power: {
    prompt: 'What is the base case for recursive power(base, exp)?',
    correct: 'power(b, 0) = 1 — any number to the power 0 is 1',
    distractors: [
      'power(b, 1) = b',
      'power(0, e) = 0',
      'power(b, 0) = 0',
    ],
    explanation:
      'The base case is exp = 0, which returns 1 (the multiplicative identity). This mirrors the mathematical convention b^0 = 1, and ensures the chain b * b * ... * 1 is correct.',
    hint: 'What exponent makes any base equal to 1?',
    concept: 'Base case',
  },
  arraySum: {
    prompt: 'How does recursive array sum decompose the problem?',
    correct: 'It takes the current element plus the sum of the remaining elements: arr[idx] + sum(arr, idx+1)',
    distractors: [
      'It splits the array in half and sums each half',
      'It accumulates a running total in a parameter',
      'It sorts the array first then adds elements',
    ],
    explanation:
      'The recursion processes one element at a time: the sum starting at index idx is arr[idx] plus the sum starting at idx+1. The base case (idx past the end) returns 0.',
    hint: 'Think about what each recursive call is responsible for.',
    concept: 'Problem decomposition',
  },
  towerOfHanoi: {
    prompt: 'How many moves are required to solve Tower of Hanoi with n disks?',
    correct: '2^n - 1 moves — each disk configuration must be visited',
    distractors: [
      'n moves — one per disk',
      'n^2 moves — one per pair of disks',
      '2n moves — twice the number of disks',
    ],
    explanation:
      'Tower of Hanoi with n disks requires exactly 2^n - 1 moves. Moving n-1 disks aside takes 2^(n-1)-1 moves, then 1 move for the largest disk, then 2^(n-1)-1 moves to stack them back — totaling 2^n - 1.',
    hint: 'For 3 disks the answer is 7. What formula gives 7 when n=3?',
    concept: 'Move count',
  },
};

/* ── Step-based questions (asked during playback) ──────────────────── */

interface StepQuestion {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

/**
 * For "returning" steps, ask what value the call returns.
 * For "active" steps at base cases, ask what the base case returns.
 */
function buildStepQuestion(
  steps: ArrayStep[],
  stepIdx: number,
  _alg: RecursionAlgorithmKey,
): StepQuestion | null {
  const step = steps[stepIdx];
  if (!step?.variables) return null;

  const nodeLabels = String(step.variables.nodeLabels || '').split(',');
  const retVals    = String(step.variables.returnValues || '').split(',');
  const active     = step.comparingIndices ?? [];

  // For active base-case steps: ask what the base case returns
  if (active.length === 1) {
    const idx = active[0];
    const label = nodeLabels[idx];
    if (label && (
      label.includes('fact(0)') ||
      label.includes('fib(0)') ||
      label.includes('fib(1)') ||
      label.includes('pow(') && label.includes(',0)') ||
      label.includes('H(1,')
    )) {
      return {
        prompt: `This is a base case call: ${label}. What value does it return?`,
        correct: retVals[idx] ?? '1',
        distractors: ['0', '-1', 'n'],
        explanation: `The base case ${label} returns the identity value for this operation, which terminates the recursion.`,
        hint: 'What stops the recursion at this point?',
        concept: 'Base case return',
      };
    }
  }

  return null;
}

/* ── Main builder ────────────────────────────────────────────────────── */

export function buildRecursionCheckpoints(
  steps: ArrayStep[],
  algorithm: RecursionAlgorithmKey,
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];

  // 1. Anchor question at step 0
  const anchor = ANCHORS[algorithm];
  const anchorId = `recursion-${algorithm}-anchor`;
  const anchorOpts = buildOptions(anchorId, anchor.correct, anchor.distractors);
  checkpoints.push({
    stepIndex: 0,
    question: {
      id: anchorId,
      prompt: anchor.prompt,
      options: anchorOpts.options,
      correctIndex: anchorOpts.correctIndex,
      explanation: anchor.explanation,
      hint: anchor.hint,
      concept: anchor.concept,
      weight: 1 as QuizWeight,
    },
  });

  // 2. Step-based questions — at most one every 4 steps
  let lastAsked = 0;
  for (let i = 1; i < steps.length - 1; i++) {
    if (i - lastAsked < 4) continue;

    const q = buildStepQuestion(steps, i, algorithm);
    if (!q) continue;

    const id = `recursion-${algorithm}-step-${i}`;
    const opts = buildOptions(id, q.correct, q.distractors);
    checkpoints.push({
      stepIndex: i,
      question: {
        id,
        prompt: q.prompt,
        options: opts.options,
        correctIndex: opts.correctIndex,
        explanation: q.explanation,
        hint: q.hint,
        concept: q.concept,
        weight: 2 as QuizWeight,
      },
    });
    lastAsked = i;
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<RecursionAlgorithmKey, QuizRevisionData> = {
  factorial: {
    description: 'Compute n! by multiplying n × (n-1) × ... × 1',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Base case: fact(0) = 1; recursive: fact(n) = n × fact(n-1)',
    watchFor: ['Base case', 'Recursive decomposition', 'Stack depth'],
    quickTip: 'The recursion depth equals n—each call waits for the one below it to return',
    example: 'fact(4) = 4×fact(3) = 4×3×fact(2) = 4×3×2×fact(1) = 4×3×2×1×fact(0) = 24.',
  },
  fibonacci: {
    description: 'Compute nth Fibonacci number using recursion',
    complexity: 'O(2^n) time, O(n) space',
    keyIdea: 'fib(n) = fib(n-1) + fib(n-2) with base cases fib(0)=0, fib(1)=1',
    watchFor: ['Exponential branching', 'Overlapping subproblems', 'Memoization opportunity'],
    quickTip: 'Naive recursion recomputes the same values many times—memoization reduces to O(n)',
    example: 'fib(5) = fib(4)+fib(3) = (fib(3)+fib(2))+(fib(2)+fib(1)) = … = 5. Note fib(2) is computed 3 times.',
  },
  power: {
    description: 'Compute base^exp using recursion',
    complexity: 'O(exp) time, O(exp) space',
    keyIdea: 'Base case: power(b, 0) = 1; recursive: power(b, e) = b × power(b, e-1)',
    watchFor: ['Base case (exp=0)', 'Negative exponent handling', 'Optimization (fast power)'],
    quickTip: 'Fast exponentiation: power(b, e) = power(b, e/2)² × (b if e is odd) gives O(log e)',
    example: 'power(2, 4) = 2×power(2,3) = 2×2×power(2,2) = … = 16. Fast power: 2^4 = (2^2)^2 = 4^2 = 16 in 2 calls.',
  },
  arraySum: {
    description: 'Sum array elements recursively',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'sum(arr, i) = arr[i] + sum(arr, i+1) with base case i >= length returning 0',
    watchFor: ['Index progression', 'Base case (past end)', 'Accumulation pattern'],
    quickTip: 'Each recursive call handles one element—the rest is delegated to the next call',
    example: 'Array [3,1,4]: sum(arr,0) = 3+sum(arr,1) = 3+1+sum(arr,2) = 3+1+4+sum(arr,3) = 3+1+4+0 = 8.',
  },
  towerOfHanoi: {
    description: 'Move n disks from source to destination using an auxiliary peg',
    complexity: 'O(2^n) time, O(n) space',
    keyIdea: 'Move n-1 disks aside, move largest disk, move n-1 disks on top—3 recursive steps',
    watchFor: ['Three-peg logic', 'Move count (2^n - 1)', 'Peg role swapping'],
    quickTip: 'The auxiliary peg in one call becomes the destination in another—roles rotate',
    example: '3 disks: move 2 to aux (3 moves), move disk 3 to dest (1 move), move 2 to dest (3 moves) = 7 total moves.',
  },
};

export function buildRevisionData(key: RecursionAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
