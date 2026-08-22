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

  // 3. Postfix Evaluation Renderer
  if (category === 'postfixEval') {
    const exprStr = currentStep.inputString ?? '';
    const activeIdx = currentStep.currentInputIndex ?? 0;
    const tokens = exprStr.trim().split(/\s+/);

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">POSTFIX (RPN) EXPRESSION EVALUATOR</span>
          <span className="chamber-subtitle">Push operands · Pop & compute when operator is encountered</span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">TOKEN STREAM:</span>
          <div className="char-stream">
            {tokens.map((tok, idx) => (
              <span
                key={idx}
                className={`stream-char ${idx === activeIdx ? 'char-active' : ''} ${idx < activeIdx ? 'char-processed' : ''}`}
              >
                {tok}
              </span>
            ))}
          </div>
        </div>

        <div className="stack-chamber-workspace">
          <div className="stack-glass-tube">
            <div className="tube-base-plate">OPERAND EVALUATION STACK</div>
            {currentStep.elements.length === 0 ? (
              <div className="stack-empty-notice">
                <span>Stack Empty</span>
              </div>
            ) : (
              <div className="stack-elements-wrapper">
                {currentStep.elements.map((el) => (
                  <div key={el.id} className={`stack-3d-plate ${el.state === 'sorted' ? 'plate-pushed' : 'plate-default'}`}>
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

  // 4. Queue via Two Stacks Renderer
  if (category === 'queueViaStacks') {
    const inEls = currentStep.elements;
    const outEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">QUEUE VIA TWO STACKS (LIFO ➔ FIFO TRANSFORMATION)</span>
          <span className="chamber-subtitle">In-Stack (Buffer) receives Enqueues · Out-Stack handles Dequeues in order</span>
        </div>

        <div className="dual-chamber-workspace">
          <div className="chamber-column">
            <span className="column-title text-sky-400">IN-STACK (INPUT BUFFER)</span>
            <div className="stack-glass-tube min-tube border-sky-500/40">
              <div className="stack-elements-wrapper">
                {inEls.map((el) => (
                  <div key={el.id} className="stack-3d-plate plate-default">
                    <span className="plate-value">{el.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chamber-column">
            <span className="column-title text-emerald-400">OUT-STACK (OUTPUT DEQUEUE)</span>
            <div className="stack-glass-tube min-tube border-emerald-500/40">
              <div className="stack-elements-wrapper">
                {outEls.map((el) => (
                  <div key={el.id} className="stack-3d-plate plate-pushed border-emerald-400">
                    <span className="plate-value text-emerald-300">{el.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Daily Temperatures Renderer (Monotonic Stack)
  if (category === 'dailyTemperatures') {
    const stackEls = currentStep.elements;
    const ansEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">DAILY TEMPERATURES (MONOTONIC STACK - NEXT GREATER ELEMENT)</span>
          <span className="chamber-subtitle">Monotonic Decreasing Stack stores day indices to find next warmer day</span>
        </div>

        <div className="dual-chamber-workspace">
          <div className="chamber-column">
            <span className="column-title text-orange-400">MONOTONIC INDEX STACK</span>
            <div className="stack-glass-tube min-tube border-orange-500/40">
              <div className="stack-elements-wrapper">
                {stackEls.map((el) => (
                  <div key={el.id} className={`stack-3d-plate ${el.state === 'pushed' ? 'plate-pushed' : 'plate-default'}`}>
                    <span className="plate-value text-orange-300">{el.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chamber-column">
            <span className="column-title text-cyan-400">WAITING DAYS ANSWER ARRAY</span>
            <div className="stack-glass-tube min-tube border-cyan-500/40">
              <div className="stack-elements-wrapper">
                {ansEls.map((el) => (
                  <div key={el.id} className={`stack-3d-plate ${el.state === 'sorted' ? 'plate-pushed' : 'plate-default'}`}>
                    <span className="plate-value text-cyan-300">Days: {el.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. Simplify Path & Remove Duplicates Renderer
  if (category === 'simplifyPath' || category === 'removeAdjacentDuplicates') {
    const inputStr = currentStep.inputString ?? '';

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">{category === 'simplifyPath' ? 'CANONICAL PATH SIMPLIFIER' : 'REMOVE ADJACENT DUPLICATES'}</span>
          <span className="chamber-subtitle">Step-by-step LIFO Stack string transformation</span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">INPUT STRING:</span>
          <span className="font-mono text-sm text-amber-300 font-bold ml-2">{inputStr}</span>
        </div>

        <div className="stack-chamber-workspace">
          <div className="stack-glass-tube">
            <div className="tube-base-plate">STACK DISCOVERY CHAMBER</div>
            {currentStep.elements.length === 0 ? (
              <div className="stack-empty-notice">
                <span>Stack Empty</span>
              </div>
            ) : (
              <div className="stack-elements-wrapper">
                {currentStep.elements.map((el) => (
                  <div key={el.id} className={`stack-3d-plate ${el.state === 'sorted' ? 'plate-pushed' : 'plate-default'}`}>
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

  // 7. Sliding Window Maximum Renderer
  if (category === 'slidingWindow') {
    const deqEls = currentStep.elements;
    const resEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">SLIDING WINDOW MAXIMUM (MONOTONIC DEQUE)</span>
          <span className="chamber-subtitle">Monotonic Deque tracks maximum values in sliding window</span>
        </div>

        <div className="dual-chamber-workspace">
          <div className="chamber-column">
            <span className="column-title text-sky-400">MONOTONIC DEQUE (MAX INDEX AT FRONT)</span>
            <div className="stack-glass-tube min-tube border-sky-500/40">
              <div className="stack-elements-wrapper">
                {deqEls.map((el) => (
                  <div key={el.id} className="stack-3d-plate plate-default">
                    <span className="plate-value">{el.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chamber-column">
            <span className="column-title text-emerald-400">WINDOW MAX ANSWERS</span>
            <div className="stack-glass-tube min-tube border-emerald-500/40">
              <div className="stack-elements-wrapper">
                {resEls.map((el) => (
                  <div key={el.id} className="stack-3d-plate plate-pushed border-emerald-400">
                    <span className="plate-value text-emerald-300">Max: {el.value}</span>
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
