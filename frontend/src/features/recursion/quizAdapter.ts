import type { ArrayStep } from '../../engine/types/Step';
import { buildOptions, type QuizCheckpoint, type QuizWeight } from '../../engine/types/Quiz';

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
