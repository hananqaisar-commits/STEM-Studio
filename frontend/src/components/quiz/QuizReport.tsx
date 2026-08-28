import React, { useMemo } from 'react';
import {
  RotateCcw,
  ArrowUpCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { QuestionResult, QuizCadence } from '../../engine/types/Quiz';
import { CADENCE_LABELS, TRANSFER_CHALLENGE_STEPS } from '../../engine/types/Quiz';

/* ── QuizReport ────────────────────────────────────────────────────────
   Performance report shown AFTER all quiz questions are answered.
   Groups results by concept, surfaces weak points, and offers
   retry / harder-mode / back-to-learning actions.

   Two faces:
   - Regular report → ends with the "Prove You Understand" transfer
         challenge CTA: a fresh input, first steps predicted cold.
   - Transfer verdict (challengeMode) → judges the mental model itself:
     all first predictions correct = concept mastered, anything less =
     execution model needs practice. A 10/10 quiz score can come from
     memory; a correct cold prediction on a new input cannot.
   ─────────────────────────────────────────────────────────────────── */

export interface QuizReportProps {
  correctCount: number;
  answeredCount: number;
  streak: number;
  questionResults: QuestionResult[];
  cadence: QuizCadence;
  onRetry: () => void;
  onHarderMode: () => void;
  onBackToLearning: () => void;
  canGoHarder: boolean;
  /** True when this report concludes a transfer challenge — renders the
   *  mastered / needs-practice verdict instead of the regular advice. */
  challengeMode?: boolean;
  /** Starts the transfer challenge: caller regenerates the input. */
  onProveIt?: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

interface ConceptStat {
  concept: string;
  correct: number;
  total: number;
  accuracy: number;
}

function groupByConcept(results: QuestionResult[]): ConceptStat[] {
  const map = new Map<string, { correct: number; total: number }>();
  for (const r of results) {
    const entry = map.get(r.concept) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (r.wasCorrect) entry.correct += 1;
    map.set(r.concept, entry);
  }
  return Array.from(map.entries())
    .map(([concept, { correct, total }]) => ({
      concept,
      correct,
      total,
      accuracy: total === 0 ? 0 : correct / total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

function adviceText(
  pct: number,
  weakest: string | null,
  allCorrect: boolean,
  cadence: QuizCadence,
): string {
  if (allCorrect) {
    return `Perfect score! You've mastered this at ${CADENCE_LABELS[cadence]} level.`;
  }
  if (pct >= 80) {
    return 'Great understanding! Challenge yourself with harder mode.';
  }
  if (pct >= 50) {
    return `Good progress. Focus on ${weakest ?? 'the missed concepts'} to strengthen your understanding.`;
  }
  return 'Keep practicing. Start with Concept mode to build a solid foundation, then move to Guided.';
}

function scoreColor(pct: number): string {
  if (pct >= 70) return 'var(--success-color)';
  if (pct >= 50) return '#f59e0b';
  return 'var(--error-color)';
}

function conceptBarColor(accuracy: number): string {
  if (accuracy === 1) return 'var(--success-color)';
  if (accuracy > 0) return '#f59e0b';
  return 'var(--error-color)';
}

/* ── Component ──────────────────────────────────────────────────────── */

export const QuizReport: React.FC<QuizReportProps> = ({
  correctCount,
  answeredCount,
  streak,
  questionResults,
  cadence,
  onRetry,
  onHarderMode,
  onBackToLearning,
  canGoHarder,
  challengeMode = false,
  onProveIt,
}) => {
  const pct = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);
  const allCorrect = correctCount === answeredCount && answeredCount > 0;

  /* Transfer verdict counts FIRST attempts only — a retry-corrected
   * answer is learning, not mastery. */
  const firstAttemptResults = useMemo(
    () => questionResults.filter((r) => r.wasFirstAttempt),
    [questionResults],
  );
  const firstAttemptCorrect = firstAttemptResults.filter((r) => r.wasCorrect).length;
  const mastered =
    firstAttemptResults.length > 0 && firstAttemptCorrect === firstAttemptResults.length;

  const conceptStats = useMemo(() => groupByConcept(questionResults), [questionResults]);
  const weakConcepts = useMemo(
    () => conceptStats.filter((c) => c.accuracy < 1),
    [conceptStats],
  );
  const weakest = weakConcepts.length > 0 ? weakConcepts[0].concept : null;
  const advice = adviceText(pct, weakest, allCorrect, cadence);

  return (
    <section className="quiz-panel quiz-report" aria-label="Quiz performance report">
      {/* ── Transfer verdict ─────────────────────────────────────────── */}
      {challengeMode ? (
        <div className={`quiz-verdict ${mastered ? 'is-mastered' : 'is-practice'}`}>
          <div className="quiz-verdict-icon">
            {mastered ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </div>
          <div className="quiz-verdict-body">
            <span className="quiz-verdict-title">
              {mastered ? 'Concept Mastered' : 'Execution model needs practice'}
            </span>
            <p className="quiz-verdict-text">
              {mastered
                ? `You predicted ${firstAttemptCorrect} of ${firstAttemptResults.length} steps correctly on an input you had never seen. That is a working mental model — not just a good memory of this run.`
                : `Your answers were right on the studied input, but on this fresh input ${firstAttemptCorrect} of ${firstAttemptResults.length} first predictions were correct. Re-run the visualization, watch the steps you missed, then prove it again.`}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Score Summary ──────────────────────────────────────────── */}
      <div className="quiz-report-score-block">
        <span
          className="quiz-report-pct"
          style={{ color: scoreColor(pct) }}
        >
          {pct}%
        </span>
        <span className="quiz-report-summary">
          {correctCount}/{answeredCount} correct
        </span>
        <span className="quiz-report-streak">
          <TrendingUp size={13} />
          Best streak: {streak}
        </span>
        <div className="quiz-report-bar">
          <div
            className="quiz-report-bar-fill"
            style={{
              width: `${pct}%`,
              background: scoreColor(pct),
            }}
          />
        </div>
      </div>

      {/* ── Concept Breakdown ──────────────────────────────────────── */}
      {!challengeMode && weakConcepts.length > 0 && (
        <div className="quiz-report-section">
          <h4 className="quiz-report-section-title">Concept Breakdown</h4>
          <div className="quiz-report-concepts">
            {conceptStats.map((stat) => (
              <div key={stat.concept} className="quiz-report-concept-row">
                <span className="quiz-report-concept-name">{stat.concept}</span>
                <span className="quiz-report-concept-count">
                  {stat.correct}/{stat.total}
                </span>
                <div className="quiz-report-concept-bar">
                  <div
                    className="quiz-report-concept-bar-fill"
                    style={{
                      width: `${stat.accuracy * 100}%`,
                      background: conceptBarColor(stat.accuracy),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Weak Points ────────────────────────────────────────────── */}
      {!challengeMode && weakConcepts.length > 0 && (
        <div className="quiz-report-section">
          <h4 className="quiz-report-section-title">Weak Points</h4>
          <ul className="quiz-report-weak-list">
            {weakConcepts.map((w) => (
              <li key={w.concept} className="quiz-report-weak-item">
                <span className="quiz-report-weak-chip">
                  <XCircle size={12} />
                  {w.concept}
                </span>
                <span className="quiz-report-weak-advice">
                  Review how {w.concept} works — try Guided mode to build intuition step by step
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Advice ─────────────────────────────────────────────────── */}
      <div className="quiz-report-advice">
        {allCorrect ? (
          <CheckCircle2 size={15} />
        ) : pct >= 50 ? (
          <TrendingUp size={15} />
        ) : (
          <RotateCcw size={15} />
        )}
        <span>{advice}</span>
      </div>

      {/* ── Actions ────────────────────────────────────────────────── */}
      {/* Transfer challenge CTA — the strongest close a quiz can have:
          a fresh input where every studied answer must be re-derived. */}
      {!challengeMode && onProveIt && (
        <div className="quiz-prove-cta">
          <div className="quiz-prove-cta-text">
            <span className="quiz-prove-cta-title">
              <ShieldCheck size={15} />
              Prove You Understand
            </span>
            <span className="quiz-prove-cta-sub">
              New input · predict the first {TRANSFER_CHALLENGE_STEPS} steps cold.
              Correct predictions are stronger proof than any score.
            </span>
          </div>
          <button type="button" className="quiz-action quiz-prove-btn" onClick={onProveIt}>
            <Sparkles size={14} />
            Start Challenge
          </button>
        </div>
      )}

      <footer className="quiz-foot quiz-report-actions">
        {challengeMode ? (
          <>
            <button
              type="button"
              className="quiz-action"
              onClick={onRetry}
            >
              <RotateCcw size={14} />
              Retry Challenge
            </button>
            <button
              type="button"
              className="quiz-report-text-btn"
              onClick={onBackToLearning}
            >
              Back to Learning
              <ArrowRight size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="quiz-action"
              onClick={onRetry}
            >
              <RotateCcw size={14} />
              Retry Quiz
            </button>
            <button
              type="button"
              className="quiz-action quiz-action-secondary"
              onClick={onHarderMode}
              disabled={!canGoHarder}
            >
              <ArrowUpCircle size={14} />
              Try Harder Mode
            </button>
            <button
              type="button"
              className="quiz-report-text-btn"
              onClick={onBackToLearning}
            >
              Back to Learning
              <ArrowRight size={13} />
            </button>
          </>
        )}
      </footer>
    </section>
  );
};
