import React from 'react';
import { Target, BookOpen, Compass, Zap, RotateCcw, Eye, Sparkles } from 'lucide-react';
import { QuizPanel } from './QuizPanel';
import { QuizRevision } from './QuizRevision';
import { QuizReport } from './QuizReport';
import { Octa } from '../mascot';
import '../mascot/Mascot.css';
import {
  CADENCE_LABELS,
  CADENCE_IDENTITIES,
  CADENCE_DESCRIPTIONS,
  type QuizCadence,
} from '../../engine/types/Quiz';
import type { QuizSessionState } from '../../hooks/useQuizSession';
import './QuizPanel.css';

/* ── Quiz dock ─────────────────────────────────────────────────────────
   The slot the quiz lives in. Mounted once per page as the first card of
   the right-hand rail. Handles all quiz phases:

   off        → Observation Mode card (guidance for free watching + the
                 one-click path back into Quiz mode)
   idle       → mode cards + cadence selector + score summary
   revision   → QuizRevision card (pre-quiz review)
   asking     → QuizPanel (question active, timer if Challenge)
   retrying   → QuizPanel (hint shown, second attempt)
   revealed   → QuizPanel (answer locked, explanation shown)
   report     → QuizReport (post-quiz analysis, or the transfer verdict
                 when it concludes a "Prove You Understand" challenge)
   ─────────────────────────────────────────────────────────────────── */

const CADENCES: QuizCadence[] = ['light', 'normal', 'intensive'];

const MODE_ICONS: Record<QuizCadence, React.ReactNode> = {
  light: <BookOpen size={16} />,
  normal: <Compass size={16} />,
  intensive: <Zap size={16} />,
};

export interface QuizDockProps {
  session: QuizSessionState;
  cadence: QuizCadence;
  onCadenceChange: (cadence: QuizCadence) => void;
  /** Per-category wording for the resume button, e.g. "Resume traversal". */
  continueLabel?: string;
  /** Shown when the current selection has no authored checkpoints. */
  emptyMessage?: string;
  /** Algorithm display name for the revision card. */
  algorithmName?: string;
  /** Callback to retry quiz (resets session). */
  onRetry?: () => void;
  /** Callback to bump cadence up one level. */
  onHarderMode?: () => void;
  /** Callback to dismiss report and return to learning. */
  onBackToLearning?: () => void;
  /** Starts the transfer challenge ("Prove You Understand"): the page
   *  regenerates a fresh input and the session arms the first steps of
   *  the new execution as cold predictions. */
  onProveIt?: () => void;
  /** Turns quiz mode on from the Observation Mode card. */
  onEnableQuiz?: () => void;
}

export const QuizDock: React.FC<QuizDockProps> = ({
  session,
  cadence,
  onCadenceChange,
  continueLabel,
  emptyMessage = 'This selection has no prediction checkpoints yet.',
  algorithmName = 'This algorithm',
  onRetry,
  onHarderMode,
  onBackToLearning,
  onProveIt,
  onEnableQuiz,
}) => {
  const { phase, checkpoint, enabled } = session;

  /* ── Observation Mode (quiz off) ──────────────────────────────────
     Quiz mode off must not render a broken-looking empty quiz card.
     The dock becomes a watching guide: how to get real learning out of
     free playback, plus the one-click way back into the loop. */
  if (!enabled) {
    return (
      <div className="quiz-dock">
        <div className="quiz-dock-mascot">
          <Octa expression="neutral" size="small" interactive={false} />
        </div>
        <section className="quiz-panel" aria-label="Observation mode">
          <header className="quiz-head">
            <div className="quiz-head-text">
              <span className="quiz-eyebrow">
                <Eye size={13} />
                Free watching
              </span>
              <h3 className="quiz-title">Observation mode</h3>
            </div>
          </header>

          <div className="quiz-idle-body">
            <p className="quiz-observation-desc">
              Playback never pauses — watch the algorithm unfold at your own pace.
            </p>
            <ul className="quiz-observation-list">
              <li>Before each step, say out loud what you expect to happen.</li>
              <li>Wrong expectation? Rewind and replay that move until it clicks.</li>
              <li>Follow the highlighted code line to connect source with state.</li>
            </ul>
            <p className="quiz-observation-cta-text">Ready to test your mental model?</p>
            {onEnableQuiz && (
              <button type="button" className="quiz-action" onClick={onEnableQuiz}>
                <Zap size={14} />
                Turn on Quiz mode
              </button>
            )}
          </div>

          <footer className="quiz-foot">
            <span className="quiz-score">Quiz mode is off</span>
          </footer>
        </section>
      </div>
    );
  }

  /* ── Revision phase ─────────────────────────────────────────────── */
  if (phase === 'revision' && session.revisionData) {
    return (
      <div className="quiz-dock">
        <QuizRevision
          algorithmName={algorithmName}
          revisionData={session.revisionData}
          onBegin={session.dismissRevision}
        />
      </div>
    );
  }

  /* ── Report phase ───────────────────────────────────────────────── */
  if (phase === 'report') {
    return (
      <div className="quiz-dock">
        <div className="quiz-dock-mascot">
          <Octa
            expression={session.challengeMode ? 'review' : 'excited'}
            size="small"
            interactive={false}
            className="octa-wiggle"
          />
        </div>
        <QuizReport
          correctCount={session.correctCount}
          answeredCount={session.answeredCount}
          streak={session.streak}
          questionResults={session.questionResults}
          cadence={cadence}
          challengeMode={session.challengeMode}
          onProveIt={onProveIt}
          onRetry={() => {
            /* Retrying the transfer challenge wants a brand-new input,
             * which is exactly what the Prove It flow regenerates. */
            if (session.challengeMode && onProveIt) {
              onProveIt();
            } else {
              session.resetSession();
              onRetry?.();
            }
          }}
          onHarderMode={() => onHarderMode?.()}
          onBackToLearning={() => {
            session.dismissReport();
            onBackToLearning?.();
          }}
          canGoHarder={cadence !== 'intensive'}
        />
      </div>
    );
  }

  /* ── Active question phase ──────────────────────────────────────── */
  if (phase !== 'idle' && checkpoint) {
    return (
      <div className="quiz-dock">
        <QuizPanel
          key={`${checkpoint.question.id}:${phase}`}
          question={checkpoint.question}
          phase={phase as 'asking' | 'retrying' | 'revealed'}
          selectedIndex={session.selectedIndex}
          wasCorrect={session.wasCorrect}
          checkpointNumber={session.checkpointNumber}
          totalCheckpoints={session.totalCheckpoints}
          correctCount={session.correctCount}
          answeredCount={session.answeredCount}
          streak={session.streak}
          cadence={cadence}
          timeRemaining={session.timeRemaining}
          streakMultiplier={session.streakMultiplier}
          challengeMode={session.challengeMode}
          inspectPending={session.inspectPending}
          onAnswer={session.answer}
          onContinue={session.continueExecution}
          continueLabel={continueLabel}
        />
      </div>
    );
  }

  /* ── Idle phase ─────────────────────────────────────────────────── */
  const { totalCheckpoints, answeredCount, correctCount, lifetimeAccuracy, lifetimeStreak, quizCompleted } =
    session;

  return (
    <div className="quiz-dock">
      <div className="quiz-dock-mascot">
        <Octa expression="focused" size="small" interactive={false} />
      </div>
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
          {/* Transfer challenge armed — tell the student what to do next:
              the fresh input is on the canvas, they start the playback. */}
          {session.challengeMode && (
            <div className="quiz-challenge-armed">
              <Sparkles size={14} />
              <span>
                Transfer challenge armed — a fresh input is loaded. Press play and
                predict the first steps cold.
              </span>
            </div>
          )}
          {totalCheckpoints === 0 ? (
            <p className="quiz-idle-empty">{emptyMessage}</p>
          ) : (
            <>
              {/* Mode cards — visual identity for each cadence level */}
              <div className="quiz-mode-cards">
                {CADENCES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`quiz-mode-card${option === cadence ? ' is-active' : ''}`}
                    aria-pressed={option === cadence}
                    onClick={() => onCadenceChange(option)}
                  >
                    <span className="quiz-mode-icon">{MODE_ICONS[option]}</span>
                    <div className="quiz-mode-text">
                      <span className="quiz-mode-name">{CADENCE_LABELS[option]}</span>
                      <span className="quiz-mode-identity">{CADENCE_IDENTITIES[option]}</span>
                    </div>
                    {option === cadence && (
                      <span className="quiz-mode-check">
                        <Target size={12} />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Selected mode description */}
              <p className="quiz-mode-desc">{CADENCE_DESCRIPTIONS[cadence]}</p>

              {/* Checkpoint info */}
              <p className="quiz-idle-line">
                {totalCheckpoints} decision {totalCheckpoints === 1 ? 'point' : 'points'} at this level.
                Playback pauses so you can reason about each step.
              </p>

              {/* Start revision button */}
              {session.revisionData && (
                <button
                  type="button"
                  className="quiz-action quiz-action-secondary"
                  onClick={session.startRevision}
                >
                  <Eye size={14} />
                  Last-Minute Revision
                </button>
              )}

              {/* View report button if quiz was completed */}
              {quizCompleted && session.questionResults.length > 0 && (
                <button
                  type="button"
                  className="quiz-action quiz-action-secondary"
                  onClick={session.showReport}
                >
                  View Performance Report
                </button>
              )}
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
              {lifetimeStreak ? ` \u00b7 streak ${lifetimeStreak}` : ''}
            </span>
          )}
          {answeredCount > 0 && (
            <button
              type="button"
              className="quiz-score quiz-reset-mini"
              onClick={session.resetSession}
              title="Reset quiz"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
};
