import React, { useState } from 'react';
import { ArrowRight, Check, Clock, Code, HardDrive, List, AlertTriangle } from 'lucide-react';
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
  /** Full step history for the shared algorithm-flow navigator. */
  steps?: StepLike[];
  /** Currently highlighted step index. */
  currentStepIndex?: number;
  /** Selecting a flow item seeks the visualizer to that exact step. */
  onStepSelect?: (index: number) => void;
  isCustomCodeRunning?: boolean;
}

type TraceTab = 'flow' | 'pseudocode' | 'explanation';

const DETAIL_KEYS = [
  'variables', 'distances', 'queueOrStack', 'visitedNodeIds', 'currentNodeId', 'currentEdgeId',
  'low', 'high', 'mid', 'left', 'right', 'index', 'pivot', 'target', 'value', 'heldValue',
  'top', 'size', 'passNumber', 'mstWeight', 'windowStart', 'windowEnd', 'windowSum',
  'output', 'stack', 'queue', 'path', 'result', 'operation', 'comparison', 'action',
];

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (Array.isArray(value)) {
    const shown = value.slice(0, 7).map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item));
    return `${shown.join(', ')}${value.length > 7 ? ` … +${value.length - 7}` : ''}` || 'empty';
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 6);
    return entries.map(([key, entry]) => `${key}: ${String(entry)}`).join(' · ') || 'empty';
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function getStepText(step: StepLike, index: number): string {
  const text = step.description?.trim() || step.explanation?.trim();
  if (text) return text;
  return step.phase
    ? `${step.phase}: the visualizer is applying this operation to the current state.`
    : `The algorithm is updating the highlighted values for operation ${index + 1}.`;
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
  onStepSelect,
  isCustomCodeRunning = false,
}) => {
  const hasHistory = Array.isArray(steps) && steps.length > 0;
  const maxIndex = hasHistory ? steps.length - 1 : 0;
  const activeIndex = Math.min(Math.max(currentStepIndex ?? 0, 0), maxIndex);
  const activeStep = hasHistory ? steps[activeIndex] : undefined;
  const fallbackText = explanation || description || 'Select an algorithm and click Play to start visualization.';
  const activeStepText = activeStep ? getStepText(activeStep, activeIndex) : fallbackText;
  const stepTitle = activeStep?.phase?.trim() || activeStep?.description?.trim() || activeStep?.explanation?.trim() || `Step ${activeIndex + 1}`;
  const details = activeStep
    ? DETAIL_KEYS.flatMap((key) => {
        const value = activeStep[key];
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) return [];
        return [{ key, value: formatValue(value) }];
      }).slice(0, 8)
    : [];
  const [tab, setTab] = useState<TraceTab>('flow');
  const activeTab = tab === 'pseudocode' && pseudocode.length === 0 ? 'flow' : tab;
  const currentLine = activeStep?.codeLine ?? codeLine;
  const headerText = isCustomCodeRunning
    ? 'Pasted code trace'
    : hasHistory ? 'Execution trace' : 'Current step';

  return (
    <section className="explanation-panel" aria-label="Execution trace">
      {isCustomCodeRunning && (
        <div className="pasted-code-notice animate-fade-in">
          <AlertTriangle size={15} className="pasted-code-notice-icon" />
          <div>
            <strong>Custom Code Execution Active</strong>
            <p>This trace follows your pasted debugger code. Its steps may differ from the standard algorithm.</p>
          </div>
        </div>
      )}

      <header className="trace-header">
        <div>
          <div className="trace-overline"><List size={15} /><span>{headerText}</span></div>
          <h2 className="trace-title">{hasHistory ? 'Algorithm flow' : 'Understand this step'}</h2>
        </div>
        {hasHistory && <span className="trace-counter">Step {activeIndex + 1} <span>of</span> {steps!.length}</span>}
        {!hasHistory && stepNumber !== undefined && totalSteps !== undefined && (
          <span className="trace-counter">Step {stepNumber} <span>of</span> {totalSteps}</span>
        )}
        <div className="explanation-mascot">
          <Octa expression="reading" size="small" interactive={false} className="octa-nod" />
        </div>
      </header>

      {hasHistory ? (
        <>
          <div className="trace-tabs" role="tablist" aria-label="Execution trace views">
            <button type="button" role="tab" aria-selected={activeTab === 'flow'} className={activeTab === 'flow' ? 'is-active' : ''} onClick={() => setTab('flow')}>
              <List size={14} /> Algorithm flow
            </button>
            {pseudocode.length > 0 && (
              <button type="button" role="tab" aria-selected={activeTab === 'pseudocode'} className={activeTab === 'pseudocode' ? 'is-active' : ''} onClick={() => setTab('pseudocode')}>
                <Code size={14} /> Pseudocode
              </button>
            )}
            <button type="button" role="tab" aria-selected={activeTab === 'explanation'} className={activeTab === 'explanation' ? 'is-active' : ''} onClick={() => setTab('explanation')}>
              <ArrowRight size={14} /> Step explanation
            </button>
          </div>

          {activeTab === 'flow' && (
            <div className="trace-workspace" role="tabpanel">
              <div className="trace-flow-list" aria-label="Algorithm steps">
                {steps!.map((step, index) => {
                  const isCurrent = index === activeIndex;
                  const isDone = index < activeIndex;
                  const label = step.phase?.trim() || step.description?.trim() || step.explanation?.trim() || `Step ${index + 1}`;
                  const content = (
                    <>
                      <span className="trace-step-marker" aria-hidden="true">
                        {isDone ? <Check size={13} /> : index + 1}
                      </span>
                      <span className="trace-step-copy">{label}</span>
                      {isCurrent && <ArrowRight size={16} className="trace-step-current-icon" aria-hidden="true" />}
                    </>
                  );
                  return onStepSelect ? (
                    <button
                      type="button"
                      key={index}
                      className={`trace-step${isCurrent ? ' is-current' : ''}${isDone ? ' is-complete' : ''}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => onStepSelect(index)}
                    >{content}</button>
                  ) : (
                    <div key={index} className={`trace-step${isCurrent ? ' is-current' : ''}${isDone ? ' is-complete' : ''}`} aria-current={isCurrent ? 'step' : undefined}>{content}</div>
                  );
                })}
              </div>

              <article className="trace-step-detail">
                <div className="trace-detail-heading">
                  <span className="trace-detail-kicker">Current focus</span>
                  <h3>Step {activeIndex + 1}: {stepTitle}</h3>
                </div>
                <p className="trace-detail-explanation">{activeStepText}</p>
                {details.length > 0 && (
                  <dl className="trace-detail-grid">
                    {details.map(({ key, value }) => (
                      <div key={key}>
                        <dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</dt>
                        <dd title={value}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {currentLine !== undefined && <span className="trace-code-reference">Code line {currentLine}</span>}
              </article>
            </div>
          )}

          {activeTab === 'pseudocode' && pseudocode.length > 0 && (
            <pre className="trace-pseudocode" role="tabpanel">
              {pseudocode.map((line, index) => (
                <div key={index} className={currentLine === index + 1 ? 'is-active' : ''}>
                  <span>{index + 1}</span><code>{line}</code>
                </div>
              ))}
            </pre>
          )}

          {activeTab === 'explanation' && (
            <article className="trace-explanation-panel" role="tabpanel">
              <span className="trace-detail-kicker">Why this step matters</span>
              <h3>{stepTitle}</h3>
              <p>{activeStepText}</p>
              {details.length > 0 && <p className="trace-explanation-context">State at this point: {details.map(({ key, value }) => `${key} = ${value}`).join(' · ')}</p>}
            </article>
          )}
        </>
      ) : (
        <div className="explanation-current-action">
          <span className="explanation-current-label">Now executing</span>
          <p className="explanation-text">{activeStepText}</p>
        </div>
      )}

      {(timeComplexity || spaceComplexity) && (
        <div className="complexity-ribbon" aria-label="Algorithm complexity">
          {timeComplexity && (
            <div className="complexity-pill">
              <Clock size={13} className="complexity-icon" />
              <span className="complexity-title">Time</span>
              <span className="complexity-badge">Best <strong>{timeComplexity.best}</strong></span>
              <span className="complexity-sep">·</span>
              <span className="complexity-badge">Average <strong>{timeComplexity.average}</strong></span>
              <span className="complexity-sep">·</span>
              <span className="complexity-badge">Worst <strong>{timeComplexity.worst}</strong></span>
            </div>
          )}
          {spaceComplexity && (
            <div className="complexity-pill">
              <HardDrive size={13} className="complexity-icon" />
              <span className="complexity-title">Space</span>
              <span className="complexity-badge"><strong>{spaceComplexity}</strong></span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
