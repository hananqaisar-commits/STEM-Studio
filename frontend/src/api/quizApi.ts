import { apiClient } from './apiClient';
import type { QuizModule } from '../engine/types/Quiz';

/* ── Quiz progress API ─────────────────────────────────────────────────
   Thin binding to the quiz endpoints that already exist in the backend
   (backend/app/api/routes/progress.py) but had no frontend caller at all.
   Shapes mirror QuizSubmissionRequest / QuizSubmissionResponse and
   UserStatsResponse in backend/app/api/schemas.py.
   ─────────────────────────────────────────────────────────────────── */

export interface QuizSubmission {
  module_name: QuizModule;
  /** Which algorithm/operation was running, e.g. "bubble", "dijkstra". */
  algorithm_id: string;
  /** Backend caps this at 500 chars. */
  question_prompt: string;
  /** Backend caps this at 255 chars. The option text the student picked. */
  selected_option: string;
  is_correct: boolean;
}

export interface QuizResult {
  attempt_id: number;
  is_correct: boolean;
  total_quizzes_taken: number;
  accuracy_percentage: number;
  current_streak: number;
  message: string;
}

/** Backend field limits, applied here so a long prompt can never 422. */
const MAX_PROMPT = 500;
const MAX_OPTION = 255;

/**
 * Record one attempt and return the user's updated accuracy and streak.
 *
 * Only call this for signed-in users — the endpoint depends on
 * `get_current_user` and will 401 for guests. Callers are expected to
 * treat a rejection as non-fatal: a learner should never be blocked from
 * continuing because a stats write failed.
 */
export async function submitQuizAttempt(submission: QuizSubmission): Promise<QuizResult> {
  return apiClient<QuizResult>('/api/progress/quiz-submit', {
    method: 'POST',
    requiresAuth: true,
    body: {
      ...submission,
      question_prompt: submission.question_prompt.slice(0, MAX_PROMPT),
      selected_option: submission.selected_option.slice(0, MAX_OPTION),
    },
  });
}
