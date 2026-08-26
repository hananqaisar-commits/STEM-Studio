import React, { useMemo } from 'react';
import {
  RotateCcw,
  ArrowUpCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import type { QuestionResult, QuizCadence } from '../../engine/types/Quiz';
import { CADENCE_LABELS } from '../../engine/types/Quiz';

/* ── QuizReport ────────────────────────────────────────────────────────
   Performance report shown AFTER all quiz questions are answered.
   Groups results by concept, surfaces weak points, and offers
   retry / harder-mode / back-to-learning actions.
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
}) => {
  const pct = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);
  const allCorrect = correctCount === answeredCount && answeredCount > 0;

  const conceptStats = useMemo(() => groupByConcept(questionResults), [questionResults]);
  const weakConcepts = useMemo(
    () => conceptStats.filter((c) => c.accuracy < 1),
    [conceptStats],
  );
  const weakest = weakConcepts.length > 0 ? weakConcepts[0].concept : null;
  const advice = adviceText(pct, weakest, allCorrect, cadence);

  return (
    <section className="quiz-panel quiz-report" aria-label="Quiz performance report">
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
      {weakConcepts.length > 0 && (
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
      {weakConcepts.length > 0 && (
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
      <footer className="quiz-foot quiz-report-actions">
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
      </footer>
    </section>
  );
};
