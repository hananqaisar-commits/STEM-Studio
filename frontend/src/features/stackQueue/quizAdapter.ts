import type { StackQueueStep } from './stackQueueEngine';
import type { StackQueueCategory } from './stackQueueEngine';
import { buildOptions, type QuizCheckpoint } from '../../engine/types/Quiz';

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
