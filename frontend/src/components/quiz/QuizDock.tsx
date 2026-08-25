import React from 'react';
import { Target } from 'lucide-react';
import { QuizPanel } from './QuizPanel';
import {
  CADENCE_HINTS,
  CADENCE_LABELS,
  type QuizCadence,
} from '../../engine/types/Quiz';
import type { QuizSessionState } from '../../hooks/useQuizSession';
import './QuizPanel.css';

/* ── Quiz dock ─────────────────────────────────────────────────────────
   The slot the quiz lives in. Mounted once per page as the first card of
   the right-hand rail, so the canvas — in the grid's left column — never
   moves when a checkpoint opens. The old cards were inserted directly
   above the renderer (SortingPage.tsx:381), which shoved the
   visualization down and back up on every question.

   The dock also reserves its height, so the code and explanation cards
   beneath it in the same rail hold still between the idle and active
   states.
   ─────────────────────────────────────────────────────────────────── */

const CADENCES: QuizCadence[] = ['light', 'normal', 'intensive'];

export interface QuizDockProps {
  session: QuizSessionState;
  cadence: QuizCadence;
  onCadenceChange: (cadence: QuizCadence) => void;
  /** Per-category wording for the resume button, e.g. "Resume traversal". */
  continueLabel?: string;
  /** Shown when the current selection has no authored checkpoints. */
  emptyMessage?: string;
}

export const QuizDock: React.FC<QuizDockProps> = ({
  session,
  cadence,
  onCadenceChange,
  continueLabel,
  emptyMessage = 'This selection has no prediction checkpoints yet.',
}) => {
  const { phase, checkpoint } = session;

  if (phase !== 'idle' && checkpoint) {
    return (
      <div className="quiz-dock">
        <QuizPanel
          /* Remount per question and per phase so the panel's pending
             selection resets without an effect. */
          key={`${checkpoint.question.id}:${phase}`}
          question={checkpoint.question}
          phase={phase}
          selectedIndex={session.selectedIndex}
          wasCorrect={session.wasCorrect}
          checkpointNumber={session.checkpointNumber}
          totalCheckpoints={session.totalCheckpoints}
          correctCount={session.correctCount}
          answeredCount={session.answeredCount}
          streak={session.streak}
          onAnswer={session.answer}
          onContinue={session.continueExecution}
          continueLabel={continueLabel}
        />
      </div>
    );
  }

  const { totalCheckpoints, answeredCount, correctCount, lifetimeAccuracy, lifetimeStreak } =
    session;

  return (
    <div className="quiz-dock">
      <section className="quiz-panel" aria-label="Quiz mode">
        <header className="quiz-head">
          <div className="quiz-head-text">
            <span className="quiz-eyebrow">
              <Target size={13} />
              Interactive learning
            </span>
            <h3 className="quiz-title">Quiz mode</h3>
          </div>
        </header>

        <div className="quiz-idle-body">
          {totalCheckpoints === 0 ? (
            <p className="quiz-idle-empty">{emptyMessage}</p>
          ) : (
            <>
              <p className="quiz-idle-line">
                Play or step forward. You&apos;ll be asked to predict what the algorithm does
                next at {totalCheckpoints} decision {totalCheckpoints === 1 ? 'point' : 'points'}
                {' '}— playback pauses so the canvas still shows the state you&apos;re reasoning
                about.
              </p>

              <div className="quiz-cadence">
                <span className="quiz-cadence-label" id="quiz-cadence-label">
                  How often to ask
                </span>
                <div
                  className="quiz-cadence-group"
                  role="group"
                  aria-labelledby="quiz-cadence-label"
                >
                  {CADENCES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="quiz-cadence-btn"
                      aria-pressed={option === cadence}
                      onClick={() => onCadenceChange(option)}
                    >
                      {CADENCE_LABELS[option]}
                    </button>
                  ))}
                </div>
                <p className="quiz-cadence-hint">{CADENCE_HINTS[cadence]}</p>
              </div>
            </>
          )}
        </div>

        <footer className="quiz-foot">
          <span className="quiz-score">
            {answeredCount === 0
              ? 'No answers yet this run'
              : `${correctCount}/${answeredCount} correct this run`}
          </span>
          {lifetimeAccuracy !== null && (
            <span className="quiz-score">
              {Math.round(lifetimeAccuracy)}% overall
              {lifetimeStreak ? ` · streak ${lifetimeStreak}` : ''}
            </span>
          )}
        </footer>
      </section>
    </div>
  );
};
