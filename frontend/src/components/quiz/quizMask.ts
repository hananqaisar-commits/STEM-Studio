import type { QuizPhase } from '../../hooks/useQuizSession';

/* ── Narration masking ─────────────────────────────────────────────────
   Every visualizer page renders the current step's `description` in an
   explanation panel beside the canvas, and several engines put the
   verdict straight into that string:

     bstEngine.ts:161    "…Value 42 is LESS than 50, so it must go to the
                          LEFT subtree."
     mergeSort.ts:22     "Dividing sub-array range [0..7] at midpoint 3."
     stackQueueEngine.ts "Computing rear index: (2 + 1) % 5 = 3"

   With a prediction question open, that panel prints the answer next to
   it — which is the same defect as the old `SWAP (42 > 17)` button label,
   just one card over.

   So while a checkpoint is open the pages show the canvas without the
   narration. The state the student reasons about is still fully visible;
   only the commentary is withheld, which is exactly how predicting a step
   is supposed to work. Playback is paused at this point, so nothing is
   scrolling past unread.
   ─────────────────────────────────────────────────────────────────── */

export const QUIZ_MASKED_DESCRIPTION =
  'Prediction checkpoint. Read the canvas and answer in the quiz panel — the explanation for this step appears once you do.';

/** The description to render, given the session phase. */
export function maskNarration(description: string, phase: QuizPhase): string {
  return phase === 'idle' ? description : QUIZ_MASKED_DESCRIPTION;
}
