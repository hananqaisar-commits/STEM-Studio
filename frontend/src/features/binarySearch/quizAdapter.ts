import type { BinarySearchStep, BinarySearchQuizData } from './binarySearchEngine';
import type { BinarySearchCategory } from './binarySearchEngine';
import { buildOptions, type QuizCheckpoint, type QuizWeight , type QuizRevisionData } from '../../engine/types/Quiz';

/* ── Binary Search quiz adapter ────────────────────────────────────────
   Binary search steps already carry `quizData?: BinarySearchQuizData`
   with `{prompt, options, correctIndex, explanation}` on steps flagged
   `isQuizPoint`. This adapter maps those onto `QuizCheckpoint[]`,
   randomising the correct-answer position via `buildOptions` so the
   answer is no longer pinned to index 0.
   ─────────────────────────────────────────────────────────────────── */

const CATEGORY_HINTS: Partial<Record<BinarySearchCategory, string>> = {
  binarySearch: 'Binary search narrows the search space by half each iteration.',
  lowerBound: 'Lower bound finds the first position where the value is at least the target.',
  upperBound: 'Upper bound finds the first position strictly greater than the target.',
  searchRotatedArray: 'A rotated sorted array still has one half that is sorted — figure out which one.',
  findPeakElement: 'A peak is an element greater than its neighbours; binary search on the slope.',
};

const CATEGORY_CONCEPTS: Partial<Record<BinarySearchCategory, string>> = {
  binarySearch: 'Halving the search space',
  lowerBound: 'Lower bound',
  upperBound: 'Upper bound',
  searchRotatedArray: 'Rotated array invariant',
  findPeakElement: 'Slope analysis',
};

function weightFor(occurrence: number): QuizWeight {
  if (occurrence === 0) return 1;
  return occurrence <= 2 ? 2 : 3;
}

/**
 * Build checkpoints for one binary search run.
 *
 * @param steps    the `BinarySearchStep[]` produced by any category generator
 * @param category which generator produced them
 */
export function buildBinarySearchCheckpoints(
  steps: BinarySearchStep[],
  category: BinarySearchCategory
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const hint = CATEGORY_HINTS[category] ?? 'Binary search narrows the search space by half each iteration.';
  const concept = CATEGORY_CONCEPTS[category] ?? 'Search decision';
  let occurrence = 0;

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (!step.isQuizPoint || !step.quizData) continue;

    const data: BinarySearchQuizData = step.quizData;
    const correct = data.options[data.correctIndex];
    if (correct === undefined) continue;

    const id = `bs-${category}-q-${index}`;
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

const REVISION_DATA: Record<BinarySearchCategory, QuizRevisionData> = {
  binarySearch: {
    description: 'Find target in sorted array by repeatedly halving search space',
    complexity: 'O(log n) time, O(1) space',
    keyIdea: 'Compare target with middle element, eliminate half that cannot contain target',
    watchFor: ['Mid calculation', 'Loop condition', 'Boundary updates'],
    quickTip: 'Use left <= right for inclusive bounds; mid = left + (right - left) / 2 avoids overflow',
    example: 'Array [1,3,5,7,9,11], target=7: mid=5(11)>7→right=4; mid=2(5)<7→left=3; mid=3(7)=7 → found at index 3.',
  },
  lowerBound: {
    description: 'Find first position where value is >= target',
    complexity: 'O(log n) time, O(1) space',
    keyIdea: 'Maintain invariant: answer is in [left, right+1]—narrow until left > right',
    watchFor: ['Comparison operator (>=)', 'Return value (left index)', 'Out-of-bounds case'],
    quickTip: 'If arr[mid] < target, move left = mid + 1; otherwise right = mid - 1; return left',
    example: 'Array [1,2,4,4,6], target=4: lower bound returns index 2 (first 4).',
  },
  upperBound: {
    description: 'Find first position where value is > target',
    complexity: 'O(log n) time, O(1) space',
    keyIdea: 'Like lower bound but with strict inequality—finds insertion point after all equals',
    watchFor: ['Comparison operator (>)', 'Difference from lower bound', 'Equal element handling'],
    quickTip: 'If arr[mid] <= target, move left = mid + 1; otherwise right = mid - 1; return left',
    example: 'Array [1,2,4,4,6], target=4: upper bound returns index 4 (value 6, first >4).',
  },
  searchRotatedArray: {
    description: 'Search in a sorted array that has been rotated at some pivot',
    complexity: 'O(log n) time, O(1) space',
    keyIdea: 'One half is always sorted—determine which half, then check if target is in it',
    watchFor: ['Sorted half identification', 'Pivot detection', 'Target range check'],
    quickTip: 'If arr[left] <= arr[mid], left half is sorted; check if target is in that range',
    example: 'Array [4,5,6,7,0,1,2], target=0: mid=3(7), left half [4,5,6,7] sorted but 0 not in range→search right half→found at index 4.',
  },
  findPeakElement: {
    description: 'Find an element greater than its neighbors',
    complexity: 'O(log n) time, O(1) space',
    keyIdea: 'If arr[mid] < arr[mid+1], a peak exists to the right; otherwise to the left',
    watchFor: ['Slope direction', 'Boundary handling', 'Multiple peaks'],
    quickTip: 'Follow the upward slope—binary search on the gradient, not the value',
    example: 'Array [1,3,5,4,2]: mid=2(5), arr[2]>arr[3]→peak at or left of mid → index 2 (value 5) is a peak.',
  },
  firstLastPosition: {
    description: 'Find the first and last occurrence of a target in a sorted array',
    complexity: 'O(log n) time, O(1) space',
    keyIdea: 'Run binary search twice—once for lower bound, once for upper bound minus one',
    watchFor: ['Two separate searches', 'Lower vs upper bound logic', 'Target not found case'],
    quickTip: 'Use lower_bound for first position and upper_bound - 1 for last position',
    example: 'Array [1,2,2,2,3,4], target=2: lower_bound=1, upper_bound-1=3 → result [1, 3].',
  },
};

export function buildRevisionData(key: BinarySearchCategory): QuizRevisionData {
  return REVISION_DATA[key];
}
