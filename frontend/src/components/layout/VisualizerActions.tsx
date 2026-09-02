import React from 'react';
import { HelpCircle, Terminal, Sparkles, Layout, RefreshCw } from 'lucide-react';

interface VisualizerActionsProps {
  /** Whether Quiz Mode is currently on. */
  quizEnabled: boolean;
  onToggleQuiz: () => void;
  /** Standalone quiz entry. */
  onStartQuiz?: () => void;
  /** Omit both debugger props on pages without a debugger panel. */
  debuggerVisible?: boolean;
  onToggleDebugger?: () => void;
  
  /** Layout customization props */
  customizeModeEnabled?: boolean;
  onToggleCustomizeMode?: () => void;
  onResetLayout?: () => void;

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
  customizeModeEnabled,
  onToggleCustomizeMode,
  onResetLayout,
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

      {onToggleCustomizeMode && (
        <button
          type="button"
          className={`viz-action-btn viz-action-layout ${customizeModeEnabled ? 'is-active' : ''}`}
          aria-pressed={customizeModeEnabled}
          onClick={onToggleCustomizeMode}
          title={customizeModeEnabled ? 'Exit layout customization' : 'Customize layout'}
        >
          <Layout size={14} />
          <span>{customizeModeEnabled ? 'Done Customizing' : 'Customize Layout'}</span>
        </button>
      )}

      {customizeModeEnabled && onResetLayout && (
        <button
          type="button"
          className="viz-action-btn viz-action-reset"
          onClick={onResetLayout}
          title="Reset to default layout"
        >
          <RefreshCw size={14} />
          <span>Reset Layout</span>
        </button>
      )}

      {children}
    </div>
  );
};
