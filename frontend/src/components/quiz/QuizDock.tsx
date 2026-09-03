import React, { useState } from 'react';
import { Target, BookOpen, Zap, RotateCcw, Eye, Sparkles } from 'lucide-react';
import { QuizPanel } from './QuizPanel';
import { QuizEngine } from './QuizEngine';
import { QuizRevision } from './QuizRevision';
import { QuizReport } from './QuizReport';
import { Octa } from '../mascot';
import '../mascot/Mascot.css';
import { type QuizCadence } from '../../engine/types/Quiz';
import type { QuizSessionState } from '../../hooks/useQuizSession';
import './QuizPanel.css';

/* ── Quiz dock ─────────────────────────────────────────────────────────
   Handles the full quiz UI. Three entry points from the idle screen:

     1. Concept Mode  → QuizEngine (standalone MCQ, no step playback)
     2. Flow Mode     → existing QuizPanel / useQuizSession pipeline
                        (live step prediction with 15s timer)
     3. Revision Mode → QuizEngine focused on weak areas from history

   No "Checkpoint" language anywhere. Smooth natural flow throughout.
   ─────────────────────────────────────────────────────────────────── */

type ActiveMode = 'concept' | 'flow' | 'revision' | null;

const MODES: { id: ActiveMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'concept',  label: 'Concept Mode',  desc: 'Test your understanding with 10-15 questions',  icon: <BookOpen size={16} /> },
  { id: 'flow',     label: 'Flow Mode',     desc: 'Predict each step as the algorithm runs, live', icon: <Zap size={16} /> },
  { id: 'revision', label: 'Revision Mode', desc: "Focus on the topics you've struggled with",      icon: <RotateCcw size={16} /> },
];

export interface QuizDockProps {
  session: QuizSessionState;
  cadence: QuizCadence;
  onCadenceChange: (cadence: QuizCadence) => void;
  /** Per-category wording for the resume button, e.g. "Resume traversal". */
  continueLabel?: string;
  /** Shown when the current algorithm has no step checkpoints. */
  emptyMessage?: string;
  /** Algorithm display name for the revision card. */
  algorithmName?: string;
  onRetry?: () => void;
  onHarderMode?: () => void;
  onBackToLearning?: () => void;
  onProveIt?: () => void;
  /** Turns quiz mode on from the Observation Mode card. */
  onEnableQuiz?: () => void;
}

export const QuizDock: React.FC<QuizDockProps> = ({
  session,
  cadence,
  continueLabel,
  emptyMessage = 'No step checkpoints for this selection yet.',
  algorithmName = 'This algorithm',
  onRetry,
  onHarderMode,
  onBackToLearning,
  onProveIt,
  onEnableQuiz,
}) => {
  const { phase, checkpoint, enabled } = session;

  /** Which of the 3 entry modes the user has picked (null = selection screen). */
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);

  const handleBack = () => setActiveMode(null);

  /* ── Observation Mode (quiz off) ─────────────────────────────────── */
  if (!enabled) {
    return (
      <div className="quiz-dock">
        <div className="quiz-dock-mascot">
          <Octa expression="neutral" size="small" interactive={false} />
        </div>
        <section className="quiz-panel" aria-label="Observation mode">
          <header className="quiz-head">
            <div className="quiz-head-text">
              <span className="quiz-eyebrow"><Eye size={13} /> Free watching</span>
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
                <Zap size={14} /> Turn on Quiz mode
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

  /* ── Concept Mode ────────────────────────────────────────────────── */
  if (activeMode === 'concept') {
    return <QuizEngine mode="concept" onBack={handleBack} />;
  }

  /* ── Revision Mode ───────────────────────────────────────────────── */
  if (activeMode === 'revision') {
    return <QuizEngine mode="revision" onBack={handleBack} />;
  }

  /* ── Flow Mode: revision pre-card ────────────────────────────────── */
  if (activeMode === 'flow' && phase === 'revision' && session.revisionData) {
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

  /* ── Flow Mode: post-quiz report ─────────────────────────────────── */
  if (activeMode === 'flow' && phase === 'report') {
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
            setActiveMode(null);
            onBackToLearning?.();
          }}
          canGoHarder={cadence !== 'intensive'}
        />
      </div>
    );
  }

  /* ── Flow Mode: active prediction question ───────────────────────── */
  if (activeMode === 'flow' && phase !== 'idle' && checkpoint) {
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
          onAnswer={session.answer}
          onContinue={session.continueExecution}
          continueLabel={continueLabel}
        />
      </div>
    );
  }

  /* ── Flow Mode idle: watching, waiting for a step checkpoint ─────── */
  if (activeMode === 'flow') {
    const { totalCheckpoints, answeredCount, correctCount, lifetimeAccuracy, lifetimeStreak, quizCompleted } = session;
    return (
      <div className="quiz-dock">
        <div className="quiz-dock-mascot">
          <Octa expression="focused" size="small" interactive={false} />
        </div>
        <section className="quiz-panel" aria-label="Flow mode active">
          <header className="quiz-head">
            <div className="quiz-head-text">
              <span className="quiz-eyebrow"><Zap size={13} /> Flow Mode</span>
              <h3 className="quiz-title">Predicting live steps</h3>
            </div>
          </header>
          <div className="quiz-idle-body">
            {session.challengeMode && (
              <div className="quiz-challenge-armed">
                <Sparkles size={14} />
                <span>Fresh input loaded — press play and predict the first steps cold.</span>
              </div>
            )}
            {totalCheckpoints === 0 ? (
              <p className="quiz-idle-empty">{emptyMessage}</p>
            ) : (
              <p className="quiz-idle-line">
                Press play — the algorithm will pause at key decision points for your predictions.
                {quizCompleted && session.questionResults.length > 0 && ' Session complete!'}
              </p>
            )}
            {quizCompleted && session.questionResults.length > 0 && (
              <button type="button" className="quiz-action quiz-action-secondary" onClick={session.showReport}>
                View results
              </button>
            )}
          </div>
          <footer className="quiz-foot">
            <span className="quiz-score">
              {answeredCount === 0 ? 'Waiting for first question…' : `${correctCount}/${answeredCount} correct`}
            </span>
            {lifetimeAccuracy !== null && (
              <span className="quiz-score">
                {Math.round(lifetimeAccuracy)}% overall{lifetimeStreak ? ` · streak ${lifetimeStreak}` : ''}
              </span>
            )}
            <button type="button" className="quiz-score" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }} onClick={handleBack}>
              ← Back
            </button>
          </footer>
        </section>
      </div>
    );
  }

  /* ── Mode selection screen (default idle) ────────────────────────── */
  return (
    <div className="quiz-dock">
      <div className="quiz-dock-mascot">
        <Octa expression="focused" size="small" interactive={false} />
      </div>
      <section className="quiz-panel" aria-label="Quiz mode">
        <header className="quiz-head">
          <div className="quiz-head-text">
            <span className="quiz-eyebrow"><Target size={13} /> Interactive learning</span>
            <h3 className="quiz-title">Quiz mode</h3>
          </div>
        </header>

        <div className="quiz-idle-body">
          <div className="quiz-mode-cards" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="quiz-mode-card"
                onClick={() => setActiveMode(option.id)}
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <span className="quiz-mode-icon" style={{ color: 'var(--quiz-accent)' }}>{option.icon}</span>
                <div className="quiz-mode-text" style={{ flex: 1 }}>
                  <span className="quiz-mode-name" style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{option.label}</span>
                  <span className="quiz-mode-identity" style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>{option.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <footer className="quiz-foot">
          <span className="quiz-score">Choose a mode to begin</span>
        </footer>
      </section>
    </div>
  );
};
