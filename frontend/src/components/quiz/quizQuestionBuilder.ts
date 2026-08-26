import type { ArrayStep } from '../../engine/types/Step';
import { buildOptions, type QuizCheckpoint, type QuizWeight } from '../../engine/types/Quiz';

/* ── quizQuestionBuilder ───────────────────────────────────────────────
   Shared utilities for generating dynamic quiz questions from
   ArrayStep data. Each function returns null when the question
   can't be meaningfully generated.
   ─────────────────────────────────────────────────────────────────── */

/**
 * Ask whether two compared elements will be swapped.
 * Returns null if comparingIndices is missing/empty or the array is too short.
 */
export function compareStepQuestion(
  step: ArrayStep,
  nextStep: ArrayStep | undefined,
  stepIdx: number,
): QuizCheckpoint | null {
  const indices = step.comparingIndices;
  if (!indices || indices.length < 2) return null;

  const [i, j] = indices;
  if (i >= step.array.length || j >= step.array.length) return null;
  if (!nextStep) return null;

  const valI = step.array[i];
  const valJ = step.array[j];
  const nextI = nextStep.array[i];
  const nextJ = nextStep.array[j];

  // Swapped if positions changed
  const wasSwapped = nextI !== valI || nextJ !== valJ;

  const questionId = `compare-${stepIdx}`;
  const correct = wasSwapped ? 'Yes, they will be swapped' : 'No, they stay in place';
  const distractors = wasSwapped
    ? ['No, they stay in place', 'They will both be removed', 'Only one will move']
    : ['Yes, they will be swapped', 'They will both be removed', 'One will be marked as sorted'];

  const assembled = buildOptions(questionId, correct, distractors);

  return {
    stepIndex: stepIdx,
    question: {
      id: questionId,
      prompt: `Comparing elements ${valI} (index ${i}) and ${valJ} (index ${j}). Will these elements be swapped?`,
      options: assembled.options,
      correctIndex: assembled.correctIndex,
      explanation: wasSwapped
        ? `Because ${valI} ${valI > valJ ? '>' : '<'} ${valJ}, the algorithm swaps them to move towards sorted order.`
        : `Since ${valI} and ${valJ} are already in the correct relative order, no swap is needed.`,
      hint: 'Think about whether the two elements are in the correct relative order for this algorithm.',
      concept: 'Comparison',
      weight: 2 as QuizWeight,
    },
  };
}

/**
 * Ask what value is at a given position.
 * Returns null if idx is out of bounds.
 */
export function valueAtQuestion(
  step: ArrayStep,
  idx: number,
  label: string,
  stepIdx: number,
): QuizCheckpoint | null {
  if (idx < 0 || idx >= step.array.length) return null;

  const correct = String(step.array[idx]);
  const questionId = `value-at-${stepIdx}-${idx}`;

  // Build distractors from nearby array values
  const distractors: string[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    const ni = idx + offset;
    if (ni >= 0 && ni < step.array.length && ni !== idx) {
      const v = String(step.array[ni]);
      if (v !== correct) distractors.push(v);
    }
  }
  // Pad with close numeric neighbours if needed
  const num = step.array[idx];
  if (distractors.length < 2) {
    if (String(num + 1) !== correct) distractors.push(String(num + 1));
    if (String(num - 1) !== correct) distractors.push(String(num - 1));
  }

  const assembled = buildOptions(questionId, correct, distractors);

  return {
    stepIndex: stepIdx,
    question: {
      id: questionId,
      prompt: `What value is currently at position ${idx}${label ? ` (${label})` : ''}?`,
      options: assembled.options,
      correctIndex: assembled.correctIndex,
      explanation: `The value at index ${idx} is ${correct}.`,
      hint: `Look carefully at the array display — count positions from the left.`,
      concept: 'Array State',
      weight: 3 as QuizWeight,
    },
  };
}

/**
 * Generic: ask what changes in a state field between two steps.
 * Works with step.variables or sortedIndices, etc.
 * Returns null if no meaningful change is detected.
 */
export function stateTransitionQuestion(
  step: ArrayStep,
  nextStep: ArrayStep | undefined,
  stateField: string,
  stepIdx: number,
  stateLabel: string,
): QuizCheckpoint | null {
  if (!nextStep) return null;

  const current = step.variables?.[stateField];
  const next = nextStep.variables?.[stateField];

  // Also handle sortedIndices as a special field
  if (current === undefined && next === undefined && stateField !== 'sortedIndices') {
    return null;
  }

  const questionId = `state-${stateField}-${stepIdx}`;

  let correct: string;
  let distractors: string[];

  if (stateField === 'sortedIndices') {
    const curLen = step.sortedIndices?.length ?? 0;
    const nextLen = nextStep.sortedIndices?.length ?? 0;
    if (curLen === nextLen) return null;
    correct = String(nextLen);
    distractors = [String(curLen), String(Math.max(0, nextLen - 1)), String(nextLen + 1)]
      .filter((v) => v !== correct);
  } else {
    if (current === next) return null;
    correct = String(next);
    distractors = [String(current)]
      .filter((v) => v !== correct);
    // Add plausible alternatives
    if (typeof next === 'number') {
      const n = next as number;
      if (String(n + 1) !== correct) distractors.push(String(n + 1));
      if (String(n - 1) !== correct) distractors.push(String(n - 1));
    }
  }

  if (distractors.length === 0) return null;

  const assembled = buildOptions(questionId, correct, distractors);

  return {
    stepIndex: stepIdx,
    question: {
      id: questionId,
      prompt: `After this step, what will ${stateLabel} be?`,
      options: assembled.options,
      correctIndex: assembled.correctIndex,
      explanation: `${stateLabel} changes from ${String(current ?? 0)} to ${correct}.`,
      hint: `Watch how the algorithm updates ${stateLabel.toLowerCase()} between steps.`,
      concept: 'State Transition',
      weight: 2 as QuizWeight,
    },
  };
}

/**
 * Ask how many elements are in their final sorted position.
 * Returns null if sortedIndices is not available.
 */
export function sortedCountQuestion(
  step: ArrayStep,
  stepIdx: number,
): QuizCheckpoint | null {
  const count = step.sortedIndices?.length ?? 0;
  if (!step.sortedIndices) return null;

  const questionId = `sorted-count-${stepIdx}`;
  const correct = String(count);

  const distractors: string[] = [];
  if (count > 0) distractors.push(String(count - 1));
  if (count < step.array.length) distractors.push(String(count + 1));
  if (count + 2 <= step.array.length) distractors.push(String(count + 2));
  if (count - 2 >= 0) distractors.push(String(count - 2));

  const assembled = buildOptions(questionId, correct, distractors);

  return {
    stepIndex: stepIdx,
    question: {
      id: questionId,
      prompt: 'How many elements are currently in their final sorted position?',
      options: assembled.options,
      correctIndex: assembled.correctIndex,
      explanation: `${count} element${count !== 1 ? 's' : ''} ${count !== 1 ? 'have' : 'has'} been placed in the final sorted position.`,
      hint: 'Count the elements highlighted as sorted in the visualizer.',
      concept: 'Sorted Position',
      weight: 2 as QuizWeight,
    },
  };
}

/**
 * Ask what the algorithm will do next based on comparing step to nextStep.
 * Returns null if nextStep is unavailable.
 */
export function nextActionQuestion(
  step: ArrayStep,
  nextStep: ArrayStep | undefined,
  stepIdx: number,
  algorithmName: string,
): QuizCheckpoint | null {
  if (!nextStep) return null;

  const questionId = `next-action-${stepIdx}`;

  // Determine what changed
  let correct: string;

  const hasSwap = nextStep.swappingIndices && nextStep.swappingIndices.length >= 2;
  const hasCompare = nextStep.comparingIndices && nextStep.comparingIndices.length >= 2;
  const sortedGrew =
    (nextStep.sortedIndices?.length ?? 0) > (step.sortedIndices?.length ?? 0);

  // Check if array shifted (values moved without explicit swap indices)
  let arrayChanged = false;
  for (let i = 0; i < step.array.length; i++) {
    if (step.array[i] !== nextStep.array[i]) {
      arrayChanged = true;
      break;
    }
  }

  if (hasSwap || (arrayChanged && !sortedGrew)) {
    correct = 'Swap or move elements';
  } else if (sortedGrew) {
    correct = 'Mark a position as sorted';
  } else if (hasCompare) {
    correct = 'Compare two elements';
  } else if (arrayChanged) {
    correct = 'Shift elements';
  } else {
    correct = 'Compare two elements';
  }

  const allOptions = [
    'Compare two elements',
    'Swap or move elements',
    'Mark a position as sorted',
    'Shift elements',
  ];
  const distractors = allOptions.filter((o) => o !== correct);
  const assembled = buildOptions(questionId, correct, distractors);

  return {
    stepIndex: stepIdx,
    question: {
      id: questionId,
      prompt: `What will ${algorithmName} do next?`,
      options: assembled.options,
      correctIndex: assembled.correctIndex,
      explanation: `The next step involves: ${correct.toLowerCase()}.`,
      hint: `Watch the visualizer carefully — what changes between the current state and the next?`,
      concept: 'Algorithm Flow',
      weight: 1 as QuizWeight,
    },
  };
}
