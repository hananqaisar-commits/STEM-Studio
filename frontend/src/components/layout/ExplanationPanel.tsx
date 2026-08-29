import React, { useRef, useEffect } from 'react';
import { Code, Info, Clock, HardDrive, List } from 'lucide-react';
import { Octa } from '../mascot';
import '../mascot/Mascot.css';
import './Layout.css';

interface TimeComplexity {
  best: string;
  average: string;
  worst: string;
}

interface StepLike {
  description?: string;
  explanation?: string;
  phase?: string;
  [key: string]: any;
}

export interface ExplanationPanelProps {
  /** Single-step fallback text (legacy). */
  description?: string;
  explanation?: string;
  /** Single-step fallback counter (legacy). */
  stepNumber?: number;
  totalSteps?: number;
  codeLine?: number;
  pseudocode?: string[];
  timeComplexity?: TimeComplexity;
  spaceComplexity?: string;
  /** Full step history for cumulative bullet rendering. */
  steps?: StepLike[];
  /** Currently highlighted step index. */
  currentStepIndex?: number;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  description,
  explanation,
  stepNumber,
  totalSteps,
  codeLine,
  pseudocode = [],
  timeComplexity,
  spaceComplexity,
  steps,
  currentStepIndex,
}) => {
  const historyListRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  const hasHistory = Array.isArray(steps) && steps.length > 0;
  const currentIdx = currentStepIndex ?? 0;

  // Legacy single-step text used when no step history is provided.
  const fallbackText = explanation || description || 'Select an algorithm and click Play to start visualization.';
  const headerText =
    stepNumber !== undefined && totalSteps !== undefined
      ? `STEP ${stepNumber} OF ${totalSteps}`
      : hasHistory
        ? `EXECUTION TRACE • ${Math.min(currentIdx + 1, steps.length)} OF ${steps.length}`
        : 'CURRENT STEP EXPLANATION';

  // Auto-scroll the active bullet into view when the step changes.
  useEffect(() => {
    if (hasHistory && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIdx, hasHistory]);

  // Array engines use `description`; graph, list and search engines use
  // `explanation`. Resolve both at the shared boundary so every visualizer
  // describes the real algorithm action instead of falling back to “Step n”.
  const getStepText = (step: StepLike, idx: number) => {
    const text = step.description?.trim() || step.explanation?.trim();
    if (text) return text;
    return step.phase
      ? `${step.phase}: the visualizer is applying this operation to the current state.`
      : `The algorithm is updating the highlighted values for operation ${idx + 1}.`;
  };

  const activeIndex = hasHistory ? Math.min(currentIdx, steps.length - 1) : 0;
  const activeStepText = hasHistory ? getStepText(steps[activeIndex], activeIndex) : fallbackText;

  // Keep a concise trace for context while giving the active step priority.
  const historyBullets = hasHistory
    ? steps.slice(0, currentIdx + 1).map((step, idx) => {
        const text = getStepText(step, idx);
        const isActive = idx === currentIdx;
        return { text, isActive, idx };
      })
    : [];

  return (
    <div className="explanation-panel">
      {/* Step Explanation Header */}
      <div className="panel-section step-explanation">
        <div className="section-title">
          <Info size={16} />
          <span>{headerText}</span>
          <div className="explanation-mascot">
            <Octa expression="reading" size="small" interactive={false} className="octa-nod" />
          </div>
        </div>

        <div className="explanation-current-action">
          <span className="explanation-current-label">Now executing</span>
          <p className="explanation-text">{activeStepText}</p>
        </div>

        {hasHistory && historyBullets.length > 1 && (
          <details className="explanation-history-box">
            <summary className="history-box-header">
              <List size={13} />
              <span>Execution trace</span>
            </summary>
            <ul ref={historyListRef} className="explanation-history-list">
              {historyBullets.map((bullet) => (
                <li
                  key={bullet.idx}
                  ref={bullet.isActive ? activeItemRef : null}
                  className={`history-bullet ${bullet.isActive ? 'is-active' : 'is-past'}`}
                >
                  <span className="history-bullet-dot" aria-hidden="true" />
                  <span className="history-bullet-text">{bullet.text}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Compact Horizontal Complexity Ribbon */}
      {(timeComplexity || spaceComplexity) && (
        <div className="complexity-ribbon">
          {timeComplexity && (
            <div className="complexity-pill">
              <Clock size={13} className="complexity-icon" />
              <span className="complexity-title">Time:</span>
              <span className="complexity-badge">Best <strong>{timeComplexity.best}</strong></span>
              <span className="complexity-sep">•</span>
              <span className="complexity-badge">Avg <strong>{timeComplexity.average}</strong></span>
              <span className="complexity-sep">•</span>
              <span className="complexity-badge">Worst <strong>{timeComplexity.worst}</strong></span>
            </div>
          )}
          {spaceComplexity && (
            <div className="complexity-pill">
              <HardDrive size={13} className="complexity-icon" />
              <span className="complexity-title">Space:</span>
              <span className="complexity-badge"><strong>{spaceComplexity}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Pseudocode Tracker */}
      {pseudocode.length > 0 && (
        <div className="panel-section pseudocode-section">
          <div className="section-title">
            <Code size={16} />
            <span>PSEUDOCODE TRACKER</span>
          </div>
          <pre className="pseudocode-container">
            {pseudocode.map((line, idx) => (
              <div
                key={idx}
                className={`code-line ${codeLine === idx + 1 ? 'active-line' : ''}`}
              >
                <span className="line-num">{idx + 1}</span>
                <span className="line-code">{line}</span>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
};
