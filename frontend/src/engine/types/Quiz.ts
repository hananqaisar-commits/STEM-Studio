/* ── Canonical quiz model ──────────────────────────────────────────────
   One shape for all six visualizer modules. Before this existed, each
   feature carried its own quiz payload: Graph, Binary Search and Linked
   List agreed on `{ prompt, options, correctIndex, explanation }`, BST
   used a bespoke `PredictionPoint`, and Sorting had no data at all (its
   question was derived inline in the page). Feature adapters now map
   whatever the engine produces onto `QuizQuestion`, so the UI, the flow
   state machine and the scoring path are written exactly once.
   ─────────────────────────────────────────────────────────────────── */

/** Which module a checkpoint belongs to. Matches the keys the backend
 *  expects in `QuizSubmissionRequest.module_name`
 *  (see backend/app/api/routes/progress.py MODULE_ALGORITHM_COUNTS). */
export type QuizModule =
  | 'sorting'
  | 'stackQueue'
  | 'linkedList'
  | 'bst'
  | 'binarySearch'
  | 'graph'
  | 'strings'
  | 'arrays'
  | 'recursion'
  | 'greedy'
  | 'hashMaps'
  | 'backtracking';

/**
 * How essential a checkpoint is.
 *   1 — the decision the algorithm is fundamentally *about*
 *   2 — a worthwhile reinforcement of that same decision
 *   3 — fine detail, useful only when the student wants maximum drilling
 *
 * Adapters assign this; `cadenceCeiling` turns the student's chosen
 * cadence into the highest weight that still gets asked.
 */
export type QuizWeight = 1 | 2 | 3;

/** How often checkpoints should interrupt playback. */
export type QuizCadence = 'light' | 'normal' | 'intensive';

export interface QuizQuestion {
  /** Stable within one execution; used as a React key and for dedupe. */
  id: string;
  /** The question. Must be answerable from the canvas alone. */
  prompt: string;
  /**
   * Answer choices.
   *
   * These must NOT contain the comparison that decides the answer. The
   * previous implementation rendered labels like `SWAP (42 > 17)` and
   * `MOVE LEFT SUBTREE (5 < 8)`, which let the student pick by reading
   * which inequality was already true instead of reasoning about the
   * algorithm — the one thing a prediction quiz exists to prevent.
   */
  options: string[];
  correctIndex: number;
  /** Full reasoning, shown once the answer is revealed. */
  explanation: string;
  /** Nudge shown after a first wrong attempt. Must not give the answer away. */
  hint: string;
  /** Short chip label naming the idea under test, e.g. "Partitioning". */
  concept: string;
  weight: QuizWeight;
}

/**
 * A checkpoint bound to a position in the step timeline. Adapters return
 * these; `useQuizSession` fires one when playback reaches `stepIndex`.
 */
export interface QuizCheckpoint {
  stepIndex: number;
  question: QuizQuestion;
}

/** Highest `QuizWeight` still asked at a given cadence. */
export function cadenceCeiling(cadence: QuizCadence): QuizWeight {
  switch (cadence) {
    case 'light':
      return 1;
    case 'normal':
      return 2;
    case 'intensive':
      return 3;
  }
}

/**
 * Narrow a full checkpoint list down to the student's chosen cadence.
 * Adapters stay cadence-agnostic — they describe every checkpoint they
 * can justify and tag each with a weight; this decides what is asked.
 */
export function filterByCadence(
  checkpoints: QuizCheckpoint[],
  cadence: QuizCadence
): QuizCheckpoint[] {
  const ceiling = cadenceCeiling(cadence);
  return checkpoints.filter((c) => c.question.weight <= ceiling);
}

export const CADENCE_LABELS: Record<QuizCadence, string> = {
  light: 'Light',
  normal: 'Normal',
  intensive: 'Intensive',
};

export const CADENCE_HINTS: Record<QuizCadence, string> = {
  light: 'Only the defining decision of the algorithm',
  normal: 'Key decisions, reinforced a few times',
  intensive: 'Every decision point, including fine detail',
};

/* ── Option assembly ───────────────────────────────────────────────────
   Every question the old implementation authored put the right answer
   first (`correctIndex: 0` in graphEngine.ts, binarySearchEngine.ts and
   linkedListEngine.ts alike), which is guessable after two questions.
   Adapters build options through `buildOptions` instead, which spreads
   the answer across positions.

   Placement is hashed from the question id rather than randomised, so
   the order is stable across re-renders — a shuffle on every render
   would move options under the student's cursor mid-question.
   ─────────────────────────────────────────────────────────────────── */

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Assemble an answer list from one correct option and some distractors.
 * Distractors that duplicate the answer or each other are dropped, and
 * at most three are kept, so every question offers 2-4 choices.
 */
export function buildOptions(
  questionId: string,
  correct: string,
  distractors: string[]
): { options: string[]; correctIndex: number } {
  const seen = new Set<string>([correct]);
  const kept: string[] = [];
  for (const option of distractors) {
    if (kept.length === 3) break;
    if (seen.has(option)) continue;
    seen.add(option);
    kept.push(option);
  }

  const correctIndex = hashString(questionId) % (kept.length + 1);
  const options = [...kept];
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

