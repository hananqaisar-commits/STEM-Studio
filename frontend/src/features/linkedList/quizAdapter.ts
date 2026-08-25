import type { LinkedListStep, LinkedListQuizData } from './linkedListEngine';
import type { LinkedListCategory } from './linkedListEngine';
import { buildOptions, type QuizCheckpoint, type QuizWeight } from '../../engine/types/Quiz';

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
