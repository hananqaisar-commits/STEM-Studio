import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion } from '../../engine/types/Quiz';
import { buildOptions } from '../../engine/types/Quiz';

type BacktrackingAlgorithmKey = 'subsets' | 'permutations' | 'nQueens' | 'combinationSum';

/* ── Anchor data per algorithm ────────────────────────────────────── */
interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<BacktrackingAlgorithmKey, Anchor> = {
  subsets: {
    prompt: 'Before it starts: how many subsets does a set of n elements have?',
    correct: '2^n — each element is independently included or excluded',
    distractors: [
      'n^2 — every pair forms a subset',
      'n! — every ordering is a distinct subset',
      '2n — each element contributes two subsets',
    ],
    explanation:
      'Each of the n elements has two independent choices: include or exclude. The total number of subsets is 2 × 2 × … × 2 = 2^n, forming a complete binary decision tree of depth n.',
    hint: 'Think about how many independent binary choices you make.',
    concept: 'Solution count',
  },
  permutations: {
    prompt: 'Before it starts: what is the time complexity of generating all permutations?',
    correct: 'O(n! · n) — there are n! permutations, each taking O(n) to record',
    distractors: [
      'O(2^n) — each position has two choices',
      'O(n^2) — nested loops over positions',
      'O(n · log n) — sorting-based approach',
    ],
    explanation:
      'There are n! permutations of n elements. At each leaf of the decision tree we copy or output the array, which takes O(n) time. So the total is O(n! · n).',
    hint: 'How many leaves does the permutation decision tree have?',
    concept: 'Time complexity',
  },
  nQueens: {
    prompt: 'Before it starts: what constraint does N-Queens check before placing a queen?',
    correct: 'No two queens share the same column, row, or diagonal',
    distractors: [
      'Queens must be placed in consecutive columns',
      'Each queen must be adjacent to the previous one',
      'Queens can share diagonals but not rows or columns',
    ],
    explanation:
      'A queen attacks along its row, column, and both diagonals. Since we place one queen per row, row conflicts are impossible. We only need to check column and diagonal conflicts with previously placed queens.',
    hint: 'Think about which directions a queen can attack in chess.',
    concept: 'Constraint checking',
  },
  combinationSum: {
    prompt: 'Before it starts: what is the backtracking condition in Combination Sum?',
    correct: 'Stop when remainder reaches 0 (solution) or goes negative (prune)',
    distractors: [
      'Stop when all candidates have been used exactly once',
      'Stop when the combination length equals the target',
      'Stop when the sum exceeds twice the target',
    ],
    explanation:
      'The algorithm tracks a running remainder (target minus current sum). When remainder = 0, a valid combination is found. When a candidate exceeds the remainder, that branch is pruned since all candidates are positive.',
    hint: 'What happens to the remainder as you add candidates to the combination?',
    concept: 'Pruning condition',
  },
};

/* ── Mid-execution question generators ────────────────────────────── */
function getMidQuestion(
  algorithm: BacktrackingAlgorithmKey,
  step: ArrayStep,
  _stepIndex: number,
): QuizQuestion {
  const { variables = {} } = step;

  switch (algorithm) {
    case 'subsets': {
      const level = typeof variables.level === 'number' ? variables.level : 0;
      const decision = (variables.decision as string) || '';
      const id = `backtracking-${algorithm}-mid`;
      const isInclude = decision.includes('Include');
      const built = buildOptions(
        id,
        isInclude
          ? 'The element at this level is added to the current subset'
          : 'The element at this level is excluded from the current subset',
        [
          isInclude
            ? 'The element at this level is excluded from the current subset'
            : 'The element at this level is added to the current subset',
          'The algorithm backtracks to the previous level',
          'The current subset is recorded as a final solution',
        ],
      );
      return {
        id,
        prompt: `At level ${level}, the decision is "${decision}". What happens to the current subset?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: isInclude
          ? `In the include branch, arr[${level}] is appended to the current subset before recursing deeper.`
          : `In the exclude branch, arr[${level}] is skipped, leaving the current subset unchanged.`,
        hint: 'Each level decides one element — include or exclude.',
        concept: 'Branch decision',
        weight: 2,
      };
    }

    case 'permutations': {
      const level = typeof variables.level === 'number' ? variables.level : 0;
      const fixedPrefix = (variables.fixedPrefix as string) || '[]';
      const id = `backtracking-${algorithm}-mid`;
      const built = buildOptions(
        id,
        'Fix the current position by swapping a remaining element into it',
        [
          'Remove the current element from the array permanently',
          'Sort the remaining elements before choosing',
          'Skip this position and move to the next',
        ],
      );
      return {
        id,
        prompt: `At level ${level}, fixed prefix is ${fixedPrefix}. What does the algorithm do next?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `At level ${level}, the algorithm fixes position ${level} by choosing one of the remaining elements (via swapping) and recurses to fix the next position.`,
        hint: 'In permutation generation, each level fixes one position.',
        concept: 'Position fixing',
        weight: 2,
      };
    }

    case 'nQueens': {
      const level = typeof variables.level === 'number' ? variables.level : 0;
      const hasConflict = variables.conflict === true;
      const id = `backtracking-${algorithm}-mid`;
      const built = buildOptions(
        id,
        hasConflict
          ? 'Skip this column and try the next one in the same row'
          : 'Place the queen and recurse to the next row',
        [
          hasConflict
            ? 'Place the queen and recurse to the next row'
            : 'Skip this column and try the next one in the same row',
          'Remove all previously placed queens and restart',
          'Move the conflicting queen to a different row',
        ],
      );
      return {
        id,
        prompt: `Row ${level}: ${hasConflict ? 'conflict detected' : 'valid placement found'}. What does the algorithm do?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: hasConflict
          ? 'A conflict means this column is attacked by an existing queen. The algorithm skips it and tries the next column in the same row.'
          : 'A valid placement means no conflicts, so the queen is placed and the algorithm recurses to the next row.',
        hint: 'What triggers backtracking in N-Queens?',
        concept: 'Conflict handling',
        weight: 2,
      };
    }

    case 'combinationSum': {
      const remainder = typeof variables.remainder === 'number' ? variables.remainder : 0;
      const id = `backtracking-${algorithm}-mid`;
      const built = buildOptions(
        id,
        remainder === 0
          ? 'Record the current combination as a valid solution'
          : 'Try picking the current candidate or skip to the next one',
        [
          remainder === 0
            ? 'Try picking the current candidate or skip to the next one'
            : 'Record the current combination as a valid solution',
          'Discard the combination and start over',
          'Double the current combination and check again',
        ],
      );
      return {
        id,
        prompt: `Remainder = ${remainder}. What does the algorithm do at this point?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: remainder === 0
          ? 'A remainder of 0 means the current combination sums exactly to the target — it is a valid solution.'
          : 'With a positive remainder, the algorithm tries to pick another candidate (if it fits) or skips to the next candidate index.',
        hint: 'What does a remainder of 0 signify?',
        concept: 'Base case',
        weight: 2,
      };
    }
  }
}

/* ── Main adapter entry point ─────────────────────────────────────── */
export function buildBacktrackingCheckpoints(
  steps: ArrayStep[],
  algorithm: BacktrackingAlgorithmKey,
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const anchor = ANCHORS[algorithm];

  // Anchor question at step 0
  const anchorId = `backtracking-${algorithm}-anchor`;
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

  // Mid-execution question at ~40% of steps
  if (steps.length > 5) {
    const midIdx = Math.floor(steps.length * 0.4);
    const midStep = steps[midIdx];
    const midQ = getMidQuestion(algorithm, midStep, midIdx);
    checkpoints.push({ stepIndex: midIdx, question: midQ });
  }

  // Late-execution reinforcement at ~75% for larger executions
  if (steps.length > 12) {
    const lateIdx = Math.floor(steps.length * 0.75);
    const lateStep = steps[lateIdx];
    const lateQ = getMidQuestion(algorithm, lateStep, lateIdx);
    lateQ.id = `${lateQ.id}-late`;
    lateQ.weight = 3;
    checkpoints.push({ stepIndex: lateIdx, question: lateQ });
  }

  return checkpoints;
}
