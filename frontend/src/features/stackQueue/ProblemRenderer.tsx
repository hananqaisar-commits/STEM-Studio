import React from 'react';
import type { StackQueueStep } from './stackQueueEngine';
import './StackQueue.css';

interface ProblemRendererProps {
  category: string;
  currentStep: StackQueueStep | null;
}

export const ProblemRenderer: React.FC<ProblemRendererProps> = ({ category, currentStep }) => {
  if (!currentStep) return null;

  // 1. Valid Parentheses Problem Renderer
  if (category === 'validParentheses') {
    const inputStr = currentStep.inputString ?? '';
    const activeIdx = currentStep.currentInputIndex ?? 0;

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">VALID PARENTHESES EVALUATOR</span>
          <span className="chamber-subtitle">Evaluate matching brackets step-by-step using LIFO Stack</span>
        </div>

        {/* Input String Visualization Ribbon */}
        <div className="input-string-ribbon">
          <span className="ribbon-label">EXPRESSION STREAM:</span>
          <div className="char-stream">
            {inputStr.split('').map((char, idx) => (
              <span
                key={idx}
                className={`stream-char ${idx === activeIdx ? 'char-active' : ''} ${idx < activeIdx ? 'char-processed' : ''}`}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Stack Visualizer */}
        <div className="stack-chamber-workspace">
          <div className="stack-glass-tube">
            <div className="tube-base-plate">OPEN BRACKETS STACK</div>
            {currentStep.elements.length === 0 ? (
              <div className="stack-empty-notice">
                <span>Stack Empty</span>
              </div>
            ) : (
              <div className="stack-elements-wrapper">
                {currentStep.elements.map((el) => (
                  <div key={el.id} className={`stack-3d-plate ${el.state === 'error' ? 'plate-error' : 'plate-default'}`}>
                    <div className="plate-inner-content">
                      <span className="plate-value font-mono">{el.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Min Stack Problem Renderer (Dual Chamber)
  if (category === 'minStack') {
    const mainEls = currentStep.elements;
    const minEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">MIN STACK (DUAL CHAMBER O(1) MINIMUM RECOVERY)</span>
          <span className="chamber-subtitle">Main Stack tracks values · Min Stack tracks minimum so far</span>
        </div>

        <div className="dual-chamber-workspace">
          {/* Main Stack */}
          <div className="chamber-column">
            <span className="column-title">MAIN VALUE STACK</span>
            <div className="stack-glass-tube min-tube">
              <div className="stack-elements-wrapper">
                {mainEls.map((el) => (
                  <div key={el.id} className="stack-3d-plate plate-default">
                    <span className="plate-value">{el.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Min Stack */}
          <div className="chamber-column">
            <span className="column-title text-amber-400">AUXILIARY MIN STACK</span>
            <div className="stack-glass-tube min-tube border-amber-500/40">
              <div className="stack-elements-wrapper">
                {minEls.map((el) => (
                  <div key={el.id} className="stack-3d-plate plate-pushed border-amber-400">
                    <span className="plate-value text-amber-300">{el.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
