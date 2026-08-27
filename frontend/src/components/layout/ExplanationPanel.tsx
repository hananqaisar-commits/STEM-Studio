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

  // Build the cumulative history bullets from step descriptions.
  const historyBullets = hasHistory
    ? steps.slice(0, currentIdx + 1).map((step, idx) => {
        const text = step.description?.trim() || `Step ${idx + 1}`;
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

        {hasHistory ? (
          <div className="explanation-history-box">
            <div className="history-box-header">
              <List size={13} />
              <span>What happened so far</span>
            </div>
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
          </div>
        ) : (
          <p className="explanation-text">{fallbackText}</p>
        )}
      </div>

      {/* Complexity Cards */}
      {(timeComplexity || spaceComplexity) && (
        <div className="panel-section complexity-section">
          <div className="complexity-grid">
            {timeComplexity && (
              <div className="complexity-card">
                <div className="complexity-header">
                  <Clock size={14} />
                  <span>Time Complexity</span>
                </div>
                <div className="complexity-body">
                  <span>Best: <strong>{timeComplexity.best}</strong></span>
                  <span>Avg: <strong>{timeComplexity.average}</strong></span>
                  <span>Worst: <strong>{timeComplexity.worst}</strong></span>
                </div>
              </div>
            )}

            {spaceComplexity && (
              <div className="complexity-card">
                <div className="complexity-header">
                  <HardDrive size={14} />
                  <span>Space Complexity</span>
                </div>
                <div className="complexity-body">
                  <span>Space: <strong>{spaceComplexity}</strong></span>
                </div>
              </div>
            )}
          </div>
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
