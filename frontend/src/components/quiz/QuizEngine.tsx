import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BookOpen,
  RotateCcw,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useConceptQuiz } from '../../hooks/useConceptQuiz';
import { Octa } from '../mascot';
import '../mascot/Mascot.css';

/* ── QuizEngine ────────────────────────────────────────────────────────
   Standalone MCQ engine for Concept Mode and Revision Mode.
   Reuses all QuizPanel CSS tokens — no new design language.
   ─────────────────────────────────────────────────────────────────── */

export interface QuizEngineProps {
  mode: 'concept' | 'revision';
  onBack: () => void;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({ mode, onBack }) => {
  const quiz = useConceptQuiz(mode);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const firstOptionRef = useRef<HTMLButtonElement | null>(null);

  const locked = quiz.phase === 'revealed';

  useEffect(() => {
    if (locked) continueRef.current?.focus({ preventScroll: true });
    else firstOptionRef.current?.focus({ preventScroll: true });
  }, [locked, quiz.questionNumber]);

  /* ── Done screen ─────────────────────────────────────────────────── */
  if (quiz.phase === 'done' || !quiz.question) {
    const accuracy = quiz.results.length > 0
      ? Math.round((quiz.correctCount / quiz.results.length) * 100)
      : 0;

    // Tally by concept for the breakdown
    const byTopic = quiz.results.reduce<Record<string, { correct: number; total: number }>>((acc, r) => {
      const entry = acc[r.concept] ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (r.wasCorrect) entry.correct += 1;
      acc[r.concept] = entry;
      return acc;
    }, {});

    return (
      <div className="quiz-dock">
        <div className="quiz-dock-mascot">
          <Octa expression={accuracy >= 70 ? 'excited' : 'review'} size="small" interactive={false} className="octa-wiggle" />
        </div>
        <section className="quiz-panel" aria-label="Quiz complete">
          <header className="quiz-head">
            <div className="quiz-head-text">
              <span className="quiz-eyebrow">
                {mode === 'concept' ? <BookOpen size={13} /> : <RotateCcw size={13} />}
                {mode === 'concept' ? 'Concept Mode' : 'Revision Mode'}
              </span>
              <h3 className="quiz-title">Session complete</h3>
            </div>
          </header>

          <div className="quiz-idle-body">
            {/* Score summary */}
            <div className="quiz-report-score" style={{ textAlign: 'center', margin: '8px 0 16px' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 700, color: accuracy >= 70 ? 'var(--green-400, #4ade80)' : 'var(--yellow-400, #facc15)' }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {quiz.correctCount} correct out of {quiz.results.length} questions
              </div>
            </div>

            {/* Concept breakdown — only show wrong topics */}
            {Object.entries(byTopic).some(([, s]) => s.correct < s.total) && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Review these topics
                </div>
                {Object.entries(byTopic)
                  .filter(([, s]) => s.correct < s.total)
                  .map(([concept, s]) => (
                    <div key={concept} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span>{concept}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{s.correct}/{s.total}</span>
                    </div>
                  ))}
              </div>
            )}

            {accuracy >= 70 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--quiz-ok-soft)', borderRadius: '8px', fontSize: '13px' }}>
                <Trophy size={14} style={{ color: 'var(--green-400, #4ade80)', flexShrink: 0 }} />
                <span>Great job! Your weak-area history has been updated for Revision Mode.</span>
              </div>
            )}
          </div>

          <footer className="quiz-foot">
            <button type="button" className="quiz-action quiz-action-secondary" onClick={onBack}>
              <ArrowLeft size={14} /> Back
            </button>
            <button type="button" className="quiz-action" onClick={onBack} style={{ marginLeft: 'auto' }}>
              <TrendingUp size={14} /> Done
            </button>
          </footer>
        </section>
      </div>
    );
  }

  /* ── Active question ─────────────────────────────────────────────── */
  const { question, phase, questionNumber, totalQuestions, selectedIndex, wasCorrect } = quiz;
  const progressPct = (questionNumber / totalQuestions) * 100;

  const optionClass = (index: number): string => {
    if (!locked) return 'quiz-option';
    if (index === question.correctIndex) return 'quiz-option is-correct';
    if (index === selectedIndex) return 'quiz-option is-wrong';
    return 'quiz-option is-muted';
  };

  return (
    <div className="quiz-dock">
      <div className="quiz-dock-mascot">
        <Octa
          expression={
            phase === 'revealed' ? (wasCorrect ? 'happy' : 'confused') :
            phase === 'retrying' ? 'thinking' : 'focused'
          }
          size="small"
          interactive={false}
        />
      </div>

      <section className="quiz-panel" aria-label={mode === 'concept' ? 'Concept mode question' : 'Revision mode question'}>

        {/* Fallback notice for Revision Mode */}
        {quiz.usedFallback && questionNumber === 1 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '-8px' }}>
            <Lightbulb size={13} style={{ flexShrink: 0, marginTop: '1px', color: '#a855f7' }} />
            <span>Not enough history yet — here's a general review to get you started.</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <header className="quiz-head">
          <div className="quiz-head-text">
            <span className="quiz-eyebrow">
              {mode === 'concept' ? <BookOpen size={13} /> : <RotateCcw size={13} />}
              {mode === 'concept' ? 'Concept Mode' : 'Revision Mode'} · Step {questionNumber} of {totalQuestions}
            </span>
            <h3 className="quiz-title">
              {question.kind === 'reason' ? 'Why does this work?' : 'Predict the answer'}
            </h3>
          </div>
          <div className="quiz-head-right">
            <span className="quiz-concept">{question.concept}</span>
          </div>
        </header>

        <div className="quiz-content-animate">
          <p className="quiz-prompt">{question.prompt}</p>

          <div className="quiz-options" role="radiogroup" aria-label="Answer choices">
            {question.options.map((option, index) => (
              <button
                key={`${questionNumber}-${index}`}
                ref={index === 0 ? firstOptionRef : undefined}
                type="button"
                role="radio"
                aria-checked={index === selectedIndex}
                className={optionClass(index)}
                disabled={locked}
                onClick={() => quiz.answer(index)}
              >
                <span className="quiz-option-key" aria-hidden="true">{index + 1}</span>
                <span className="quiz-option-label">{option}</span>
                {locked && index === question.correctIndex && (
                  <span className="quiz-option-mark"><CheckCircle2 size={15} /></span>
                )}
                {locked && index === selectedIndex && index !== question.correctIndex && (
                  <span className="quiz-option-mark"><XCircle size={15} /></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback region */}
        <div className="quiz-feedback-region" aria-live="polite">
          {phase === 'retrying' && (
            <div className="quiz-feedback is-hint">
              <Lightbulb size={15} />
              <span>{question.hint}</span>
            </div>
          )}
          {phase === 'revealed' && (
            <div className={`quiz-feedback ${wasCorrect ? 'is-ok' : 'is-bad'}`}>
              {wasCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              <span>{question.explanation}</span>
            </div>
          )}
        </div>

        <footer className="quiz-foot">
          <button type="button" className="quiz-score" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={onBack}>
            <ArrowLeft size={12} /> Back
          </button>

          {locked ? (
            <button ref={continueRef} type="button" className="quiz-action" onClick={quiz.continueNext}>
              {questionNumber < totalQuestions ? 'Next question' : 'See results'}
              <ArrowRight size={14} />
            </button>
          ) : (
            <span className="quiz-score">
              {quiz.correctCount}/{Math.max(0, questionNumber - 1)} correct
            </span>
          )}
        </footer>
      </section>
    </div>
  );
};
