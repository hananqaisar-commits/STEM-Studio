import React from 'react';
import { HelpCircle, Terminal, Sparkles } from 'lucide-react';

interface VisualizerActionsProps {
  /** Whether Quiz Mode is currently on. */
  quizEnabled: boolean;
  onToggleQuiz: () => void;
  /** Standalone quiz entry. Predict mode remains the step-pausing workflow. */
  onStartQuiz?: () => void;
  /** Omit both debugger props on pages without a debugger panel. */
  debuggerVisible?: boolean;
  onToggleDebugger?: () => void;
  /** Extra page-level buttons (e.g. fullscreen) rendered in the same group. */
  children?: React.ReactNode;
}

/**
 * Unified professional action group for every visualizer header:
 * [Quiz Mode] [Hide/Show Debugger] (+ page extras).
 *
 * Replaces the old checkbox-style toggles with compact pill buttons so all
 * categories expose the same navigation/control treatment. Pure presentation —
 * all state lives in the page, so toggling the debugger never resets execution.
 */
export const VisualizerActions: React.FC<VisualizerActionsProps> = ({
  quizEnabled,
  onToggleQuiz,
  onStartQuiz,
  debuggerVisible,
  onToggleDebugger,
  children,
}) => {
  return (
    <div className="viz-actions">
      <button
        type="button"
        className="viz-action-btn viz-action-quiz"
        onClick={onStartQuiz ?? onToggleQuiz}
        title="Start Quiz Mode"
      >
        <HelpCircle size={14} />
        <span>Quiz Mode</span>
      </button>
      <button
        type="button"
        className={`viz-action-btn viz-action-predict ${quizEnabled ? 'is-active' : ''}`}
        aria-pressed={quizEnabled}
        onClick={onToggleQuiz}
        title="Toggle Predict Mode"
      >
        <Sparkles size={14} />
        <span>Predict Mode</span>
      </button>

      {onToggleDebugger && (
        <button
          type="button"
          className={`viz-action-btn viz-action-debugger ${debuggerVisible ? '' : 'is-active'}`}
          aria-pressed={!debuggerVisible}
          onClick={onToggleDebugger}
          title={debuggerVisible ? 'Hide the code debugger' : 'Show the code debugger'}
        >
          <Terminal size={14} />
          <span>{debuggerVisible ? 'Hide Debugger' : 'Show Debugger'}</span>
        </button>
      )}

      {children}
    </div>
  );
};
