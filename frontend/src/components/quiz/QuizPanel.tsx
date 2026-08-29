import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Lightbulb, XCircle, Zap, Search } from 'lucide-react';
import type { QuizQuestion, QuizCadence } from '../../engine/types/Quiz';
import { Octa } from '../mascot';
import '../mascot/Mascot.css';

/* ── Quiz panel ────────────────────────────────────────────────────────
   The question card, shared by all categories.

   Answering is two-stage — select, then check. The old cards committed
   on the first click, which punished a misclick with a permanent wrong
   mark, and gave keyboard users nothing to press Enter on.

   Two question kinds share one card:
   - 'predict' → "Predict the next step" (mentally execute the algorithm)
   - 'reason'  → "Why does this happen?" (justify a visible step)

   When the student exhausts both attempts the reveal carries the
   "Let's inspect this step" cue, and Continue advances the canvas to
   the exact step that was mispredicted — the visualization itself
   closes the feedback loop.

   Enhanced features per mode:
   - Concept (light): Key Idea insight box after answer
   - Guided (normal): progress bar, enhanced hint display
   - Challenge (intensive): countdown timer bar, streak multiplier
   ─────────────────────────────────────────────────────────────────── */

export interface QuizPanelProps {
  question: QuizQuestion;
  /** 'asking' = first attempt, 'retrying' = second, 'revealed' = locked. */
  phase: 'asking' | 'retrying' | 'revealed';
  /** The committed answer; null until the student checks one. */
  selectedIndex: number | null;
  wasCorrect: boolean;
  checkpointNumber: number;
  totalCheckpoints: number;
  correctCount: number;
  answeredCount: number;
  streak: number;
  /** Current cadence mode — drives per-mode visual features. */
  cadence?: QuizCadence;
  /** Seconds remaining on timer (Challenge mode only); null otherwise. */
  timeRemaining?: number | null;
  /** Streak multiplier: x1, x2 (3+ streak), x3 (5+ streak). */
  streakMultiplier?: number;
  /** True while the transfer challenge (fresh input) is in play. */
  challengeMode?: boolean;
  /** True when the reveal follows a final wrong attempt — Continue then
   *  advances the canvas to the mispredicted step ("watch the step"). */
  inspectPending?: boolean;
  onAnswer: (index: number) => void;
  onContinue: () => void;
  /** Per-category wording, e.g. "Resume traversal". */
  continueLabel?: string;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({
  question,
  phase,
  selectedIndex,
  wasCorrect,
  checkpointNumber,
  totalCheckpoints,
  correctCount,
  answeredCount,
  streak,
  cadence = 'normal',
  timeRemaining = null,
  streakMultiplier = 1,
  challengeMode = false,
  inspectPending = false,
  onAnswer,
  onContinue,
  continueLabel = 'Continue',
}) => {
  const [pending, setPending] = useState<number | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const continueRef = useRef<HTMLButtonElement | null>(null);

  const locked = phase === 'revealed';
  const optionCount = question.options.length;
  const isConcept = cadence === 'light';

  /* Move focus to the card when it opens. */
  useEffect(() => {
    if (locked) continueRef.current?.focus({ preventScroll: true });
    else optionRefs.current[0]?.focus({ preventScroll: true });
  }, [locked]);

  const focusOption = useCallback((index: number) => {
    setPending(index);
    optionRefs.current[index]?.focus({ preventScroll: true });
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;

    if (event.key >= '1' && event.key <= '9') {
      const index = Number(event.key) - 1;
      if (index < optionCount) {
        event.preventDefault();
        focusOption(index);
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusOption(((pending ?? 0) + 1) % optionCount);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusOption(((pending ?? 0) - 1 + optionCount) % optionCount);
      return;
    }

    if (event.key === 'Enter' && pending !== null) {
      event.preventDefault();
      onAnswer(pending);
    }
  };

  const optionClass = (index: number): string => {
    if (!locked) return 'quiz-option';
    if (index === question.correctIndex) return 'quiz-option is-correct';
    if (index === selectedIndex) return 'quiz-option is-wrong';
    return 'quiz-option is-muted';
  };

  const eyebrow = challengeMode
    ? `Transfer challenge \u00b7 ${checkpointNumber} of ${totalCheckpoints}`
    : phase === 'retrying'
      ? `Checkpoint ${checkpointNumber} of ${totalCheckpoints} \u00b7 attempt 2 of 2`
      : `Checkpoint ${checkpointNumber} of ${totalCheckpoints}`;

  /* The card title states what the question trains. 'reason' questions
   * ask for justification of a visible step; everything else is a
   * prediction the student must mentally execute. */
  const title = challengeMode
    ? 'Prove it — new input'
    : question.kind === 'reason'
      ? 'Why does this happen?'
      : 'Predict the next step';

  /* After a final wrong answer, Continue becomes an inspection: the
   * canvas advances to the mispredicted step so the student watches the
   * ground truth instead of just reading it. */
  const effectiveContinueLabel =
    phase === 'revealed' && !wasCorrect && inspectPending
      ? 'Watch the step'
      : continueLabel;

  /* Timer bar width percentage (the shared Challenge limit is 10 seconds). */
  const timerPct = timeRemaining !== null ? Math.max(0, (timeRemaining / 10) * 100) : 100;
  const timerUrgent = timeRemaining !== null && timeRemaining <= 5;

  /* Progress percentage for Guided mode. */
  const progressPct = totalCheckpoints > 0 ? (checkpointNumber / totalCheckpoints) * 100 : 0;

  return (
    <section className="quiz-panel" aria-label="Prediction checkpoint">
      {/* Timer bar — Challenge mode only */}
      {timeRemaining !== null && (
        <div className={`quiz-timer-bar${timerUrgent ? ' is-urgent' : ''}`}>
          <div
            className="quiz-timer-fill"
            style={{ width: `${timerPct}%` }}
          />
          <span className="quiz-timer-label">{timeRemaining}s</span>
        </div>
      )}

      {/* Progress bar — Guided mode */}
      {cadence === 'normal' && (
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <header className="quiz-head">
        <div className="quiz-head-text">
          <span className="quiz-eyebrow">{eyebrow}</span>
          <h3 className="quiz-title">{title}</h3>
        </div>
        <div className="quiz-head-mascot">
          <Octa
            expression={
              phase === 'revealed'
                ? wasCorrect
                  ? 'happy'
                  : 'confused'
                : phase === 'retrying'
                  ? 'thinking'
                  : 'focused'
            }
            size="small"
            interactive={false}
          />
        </div>
        <div className="quiz-head-right">
          <span className="quiz-concept">{question.concept}</span>
          {streakMultiplier > 1 && (
            <span className="quiz-streak-badge">
              <Zap size={11} />
              x{streakMultiplier}
            </span>
          )}
        </div>
      </header>

      <p className="quiz-prompt">{question.prompt}</p>

      <div
        className="quiz-options"
        role="radiogroup"
        aria-label="Answer choices"
        onKeyDown={handleKeyDown}
      >
        {question.options.map((option, index) => {
          const checked = locked ? index === selectedIndex : index === pending;
          return (
            <button
              key={`${question.id}-${index}`}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              className={optionClass(index)}
              disabled={locked}
              tabIndex={index === (pending ?? 0) ? 0 : -1}
              onClick={() => setPending(index)}
              onDoubleClick={() => onAnswer(index)}
            >
              <span className="quiz-option-key" aria-hidden="true">
                {index + 1}
              </span>
              <span className="quiz-option-label">{option}</span>
              {locked && index === question.correctIndex && (
                <span className="quiz-option-mark">
                  <CheckCircle2 size={15} />
                </span>
              )}
              {locked && index === selectedIndex && index !== question.correctIndex && (
                <span className="quiz-option-mark">
                  <XCircle size={15} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="quiz-feedback-region" aria-live="polite">
        {phase === 'retrying' && (
          <div className="quiz-feedback is-hint">
            <Lightbulb size={15} />
            <span>
              <span className="quiz-feedback-title">Not quite — try once more.</span>
              {question.hint}
            </span>
          </div>
        )}

        {phase === 'revealed' && (
          <div className={`quiz-feedback ${wasCorrect ? 'is-ok' : 'is-bad'}`}>
            {wasCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>
              <span className="quiz-feedback-title">
                {wasCorrect
                  ? 'Correct.'
                  : inspectPending
                    ? "Let's inspect this step."
                    : 'The correct answer is shown above.'}
              </span>
              {question.explanation}
            </span>
          </div>
        )}

        {/* Inspect-the-step cue — wrong on the final attempt. Learning does
            not stop at the wrong answer: Continue runs the exact step on
            the canvas so the student sees where their model broke. */}
        {phase === 'revealed' && !wasCorrect && inspectPending && (
          <div className="quiz-inspect-note">
            <Search size={14} />
            <span>
              Press <strong>Watch the step</strong> — the canvas will run the very step you
              predicted. Compare it with what you expected, then try the next prediction.
            </span>
          </div>
        )}

        {/* Key Idea insight — Concept mode only, shown after reveal */}
        {isConcept && phase === 'revealed' && (
          <div className="quiz-insight-box">
            <Lightbulb size={14} />
            <span>
              <strong>Key Idea:</strong> {question.explanation.split('.')[0]}.
            </span>
          </div>
        )}
      </div>

      <footer className="quiz-foot">
        <span className="quiz-score">
          {answeredCount === 0
            ? 'First checkpoint'
            : `${correctCount}/${answeredCount} correct${streak > 1 ? ` \u00b7 streak ${streak}` : ''}`}
        </span>

        {locked ? (
          <button ref={continueRef} type="button" className="quiz-action" onClick={onContinue}>
            {effectiveContinueLabel}
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="quiz-action"
            disabled={pending === null}
            onClick={() => pending !== null && onAnswer(pending)}
          >
            Check answer
          </button>
        )}
      </footer>
    </section>
  );
};
