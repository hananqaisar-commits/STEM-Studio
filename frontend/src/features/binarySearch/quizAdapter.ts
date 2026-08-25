import type { BinarySearchStep, BinarySearchQuizData } from './binarySearchEngine';
import type { BinarySearchCategory } from './binarySearchEngine';
import { buildOptions, type QuizCheckpoint, type QuizWeight } from '../../engine/types/Quiz';

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
