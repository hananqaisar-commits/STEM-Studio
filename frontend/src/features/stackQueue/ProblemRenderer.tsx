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
          <span className="chamber-title">QUEUE VIA TWO STACKS (LIFO TO FIFO TRANSFORMATION)</span>
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

  // 8. Basic Calculator Renderer (Context Stack + Running State)
  if (category === 'basicCalculator') {
    const expr = currentStep.inputString ?? '';
    const activeIdx = currentStep.currentInputIndex ?? 0;
    const running = currentStep.auxElements?.[0];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">BASIC CALCULATOR (SIGN + CONTEXT STACK)</span>
          <span className="chamber-subtitle">'(' pushes saved (result, sign) contexts · ')' pops and applies them</span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">EXPRESSION STREAM:</span>
          <div className="char-stream">
            {expr.split('').map((char, idx) => (
              <span
                key={idx}
                className={`stream-char ${idx === activeIdx ? 'char-active' : ''} ${idx < activeIdx ? 'char-processed' : ''}`}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        <div className="dual-chamber-workspace">
          <div className="chamber-column">
            <span className="column-title text-violet-400">SAVED CONTEXT STACK</span>
            <div className="stack-glass-tube min-tube border-violet-500/40">
              <div className="stack-elements-wrapper">
                {currentStep.elements.length === 0 ? (
                  <div className="stack-empty-notice">
                    <span>No Saved Context</span>
                  </div>
                ) : (
                  currentStep.elements.map((el) => (
                    <div
                      key={el.id}
                      className={`stack-3d-plate ${el.state === 'active' ? 'plate-pushed border-violet-400' : 'plate-default'}`}
                    >
                      <span className="plate-value font-mono text-violet-200">{el.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="chamber-column">
            <span className="column-title text-cyan-400">RUNNING EVALUATION STATE</span>
            <div className="stack-glass-tube min-tube border-cyan-500/40">
              <div className="stack-elements-wrapper">
                <div className="stack-3d-plate plate-pushed border-cyan-400">
                  <span className="plate-value font-mono text-cyan-300">{running?.value ?? 'res=0'}</span>
                </div>
                <div className="stack-3d-plate plate-default">
                  <span className="plate-value font-mono text-slate-300">{running?.auxValue ?? 'sgn=+'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 9. Decode String Renderer (Dual Stack: Segments + Counts)
  if (category === 'decodeString') {
    const s = currentStep.inputString ?? '';
    const activeIdx = currentStep.currentInputIndex ?? 0;
    const strEls = currentStep.elements;
    const cntEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">DECODE STRING (NESTED k[str] EXPANSION)</span>
          <span className="chamber-subtitle">'[' pushes (string, count) pairs · ']' pops and repeats the inner segment</span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">ENCODED STREAM:</span>
          <div className="char-stream">
            {s.split('').map((char, idx) => (
              <span
                key={idx}
                className={`stream-char ${idx === activeIdx ? 'char-active' : ''} ${idx < activeIdx ? 'char-processed' : ''}`}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        <div className="dual-chamber-workspace">
          <div className="chamber-column">
            <span className="column-title text-violet-400">STRING SEGMENT STACK</span>
            <div className="stack-glass-tube min-tube border-violet-500/40">
              <div className="stack-elements-wrapper">
                {strEls.length === 0 ? (
                  <div className="stack-empty-notice">
                    <span>Stack Empty</span>
                  </div>
                ) : (
                  strEls.map((el) => (
                    <div
                      key={el.id}
                      className={`stack-3d-plate ${el.state === 'sorted' ? 'plate-pushed border-violet-400' : 'plate-default'}`}
                    >
                      <span className="plate-value plate-value-truncate font-mono text-violet-200">{el.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="chamber-column">
            <span className="column-title text-amber-400">REPEAT COUNT STACK</span>
            <div className="stack-glass-tube min-tube border-amber-500/40">
              <div className="stack-elements-wrapper">
                {cntEls.length === 0 ? (
                  <div className="stack-empty-notice">
                    <span>Stack Empty</span>
                  </div>
                ) : (
                  cntEls.map((el) => (
                    <div
                      key={el.id}
                      className={`stack-3d-plate ${el.state === 'pushed' ? 'plate-pushed border-amber-400' : 'plate-default'}`}
                    >
                      <span className="plate-value font-mono text-amber-300">× {el.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 10. Trapping Rain Water Renderer (Histogram + Monotonic Stack)
  if (category === 'trappingRainWater') {
    const heights = (currentStep.inputString ?? '')
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));
    const waterEls = currentStep.auxElements ?? [];
    const waterAt = (idx: number): number => {
      const el = waterEls.find((w) => w.value === `i=${idx}`);
      return typeof el?.auxValue === 'number' ? el.auxValue : 0;
    };
    const totalWater = waterEls.reduce(
      (sum, w) => sum + (typeof w.auxValue === 'number' ? w.auxValue : 0),
      0
    );
    const maxH = Math.max(...heights, 1);
    const activeIdx = currentStep.currentInputIndex ?? 0;

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">TRAPPING RAIN WATER (MONOTONIC DECREASING STACK)</span>
          <span className="chamber-subtitle">
            A taller bar pops the trapped boundary · Total trapped = {totalWater} units
          </span>
        </div>

        <div className="problem-histogram">
          {heights.map((h, idx) => (
            <div key={idx} className="hist-column">
              {waterAt(idx) > 0 && (
                <div
                  className="hist-water"
                  style={{ height: `${(waterAt(idx) / maxH) * 120}px` }}
                  title={`Bar ${idx}: ${waterAt(idx)} water units`}
                />
              )}
              <div
                className={`hist-bar ${idx === activeIdx ? 'hist-bar-active' : ''}`}
                style={{ height: `${(h / maxH) * 120}px` }}
                title={`Bar ${idx}: height ${h}`}
              />
              <span className="hist-label">{h}</span>
            </div>
          ))}
        </div>

        <div className="queue-channel-workspace">
          <div>
            <span className="column-title text-sky-400 mb-1 block">MONOTONIC STACK (RIGHT = TOP)</span>
            <div className="queue-glass-tube">
              {currentStep.elements.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Stack Empty</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {currentStep.elements.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'pushed'
                          ? 'border-emerald-400 bg-emerald-500/15'
                          : 'border-sky-500/60 bg-sky-500/10'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-xs text-sky-200">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 11. Largest Rectangle Renderer (Histogram + Stack + Best Area)
  if (category === 'largestRectangle') {
    const heights = (currentStep.inputString ?? '')
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));
    const stackIndices = currentStep.elements
      .map((el) => Number(String(el.value).match(/\(i=(\d+)\)/)?.[1] ?? -1))
      .filter((i) => i >= 0);
    const bestArea = currentStep.auxElements?.[0]?.auxValue ?? 0;
    const maxH = Math.max(...heights, 1);
    const activeIdx = currentStep.currentInputIndex ?? 0;

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">LARGEST RECTANGLE IN HISTOGRAM (MONOTONIC INCREASING STACK)</span>
          <span className="chamber-subtitle">
            Bars stay stacked while rising · A shorter bar pops rectangles · Best area = {bestArea}
          </span>
        </div>

        <div className="problem-histogram">
          {heights.map((h, idx) => (
            <div key={idx} className="hist-column">
              <div
                className={`hist-bar ${
                  idx === activeIdx && activeIdx < heights.length
                    ? 'hist-bar-active'
                    : stackIndices.includes(idx)
                      ? 'hist-bar-stacked'
                      : ''
                }`}
                style={{ height: `${(h / maxH) * 120}px` }}
                title={`Bar ${idx}: height ${h}${stackIndices.includes(idx) ? ' · in stack' : ''}`}
              />
              <span className="hist-label">{h}</span>
            </div>
          ))}
        </div>

        <div className="queue-channel-workspace">
          <div>
            <span className="column-title text-emerald-400 mb-1 block">MONOTONIC STACK (RIGHT = TOP)</span>
            <div className="queue-glass-tube">
              {currentStep.elements.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Stack Empty</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {currentStep.elements.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'pushed'
                          ? 'border-emerald-400 bg-emerald-500/15'
                          : 'border-emerald-500/60 bg-emerald-500/10'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-xs text-emerald-200">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 12. Stack via Two Queues Renderer (Dual Queue Lanes)
  if (category === 'stackViaQueues') {
    const mainEls = currentStep.elements;
    const auxEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">STACK VIA TWO QUEUES (COSTLY PUSH ROTATION)</span>
          <span className="chamber-subtitle">
            Push enqueues into aux then drains main behind it · Front of main = stack top
          </span>
        </div>

        <div className="queue-channel-workspace">
          <div>
            <span className="column-title text-sky-400 mb-1 block">MAIN QUEUE (FRONT = STACK TOP)</span>
            <div className="queue-glass-tube">
              {mainEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Main Queue Empty</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {mainEls.map((el, idx) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        idx === 0 ? 'border-sky-400 bg-sky-500/15' : 'border-sky-500/50'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-sm text-sky-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="column-title text-amber-400 mb-1 block">AUX QUEUE (PUSH DRAIN BUFFER)</span>
            <div className="queue-glass-tube">
              {auxEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Aux Queue Empty</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {auxEls.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'pushed' ? 'border-amber-400 bg-amber-500/15' : 'border-amber-500/50'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-sm text-amber-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 13. Circular Deque Ring Renderer
  if (category === 'circularDeque') {
    const capacity = currentStep.capacity ?? 5;
    const front = currentStep.frontIndex ?? -1;
    const rear = currentStep.rearIndex ?? -1;
    const elements = currentStep.elements;
    const radius = 120;
    const centerX = 200;
    const centerY = 170;

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">CIRCULAR DEQUE RING (DOUBLE-ENDED BUFFER)</span>
          <span className="chamber-subtitle">
            Capacity: {capacity} · FRONT = {front === -1 ? 'None' : front} · REAR = {rear === -1 ? 'None' : rear} · Both
            ends wrap with modulo
          </span>
        </div>

        <div className="circular-workspace">
          <svg className="ring-svg-canvas" width="400" height="340" viewBox="0 0 400 340">
            <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="20" />
            {Array.from({ length: capacity }).map((_, idx) => {
              const angle = (idx * (360 / capacity) - 90) * (Math.PI / 180);
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              const isFront = idx === front;
              const isRear = idx === rear;
              const elData = elements[idx];
              const hasVal = elData && elData.value !== '-';

              let fillColor = 'rgba(30, 41, 59, 0.9)';
              let strokeColor = '#475569';
              if (isFront) strokeColor = '#38bdf8';
              if (isRear) strokeColor = '#f59e0b';
              if (hasVal) fillColor = 'rgba(99, 102, 241, 0.25)';
              if (elData?.state === 'pushed') fillColor = 'rgba(129, 140, 248, 0.45)';
              if (elData?.state === 'error') {
                fillColor = 'rgba(244, 63, 94, 0.25)';
                strokeColor = '#f43f5e';
              }

              return (
                <g key={idx} className="cq-slot-group">
                  <circle
                    cx={x}
                    cy={y}
                    r="24"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isFront || isRear ? '3' : '2'}
                    className="cq-circle"
                  />
                  <text x={x} y={y + 36} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
                    [{idx}]
                  </text>
                  <text x={x} y={y + 4} textAnchor="middle" fill={hasVal ? '#ffffff' : '#64748b'} fontSize="13" fontWeight="800">
                    {elData ? elData.value : '-'}
                  </text>
                  {isFront && (
                    <text x={x} y={y - 32} textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="900">
                      FRONT
                    </text>
                  )}
                  {isRear && (
                    <text x={x} y={y + (isFront ? -42 : -32)} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="900">
                      REAR
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  // 14. First Non-Repeating Stream Renderer (Candidate Queue + Timeline)
  if (category === 'firstNonRepeating') {
    const stream = currentStep.inputString ?? '';
    const activeIdx = currentStep.currentInputIndex ?? 0;
    const queueEls = currentStep.elements;
    const timelineEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">FIRST NON-REPEATING CHARACTER IN A STREAM</span>
          <span className="chamber-subtitle">
            Queue keeps first-seen candidates · Repeats are lazily dequeued from the head
          </span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">CHARACTER STREAM:</span>
          <div className="char-stream">
            {stream.split('').map((char, idx) => (
              <span
                key={idx}
                className={`stream-char ${idx === activeIdx ? 'char-active' : ''} ${idx < activeIdx ? 'char-processed' : ''}`}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        <div className="queue-channel-workspace">
          <div>
            <span className="column-title text-sky-400 mb-1 block">CANDIDATE QUEUE (HEAD = FIRST NON-REPEATING)</span>
            <div className="queue-glass-tube">
              {queueEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>No Candidates — All Repeated</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {queueEls.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'highlight' ? 'border-emerald-400 bg-emerald-500/15' : 'border-sky-500/50'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-sm text-sky-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="column-title text-cyan-400 mb-1 block">FIRST NON-REPEATING TIMELINE</span>
            <div className="queue-glass-tube">
              <div className="queue-elements-wrapper">
                {timelineEls.map((el) => (
                  <div
                    key={el.id}
                    className={`queue-3d-block ${
                      el.state === 'sorted' ? 'border-cyan-400 bg-cyan-500/15' : 'border-cyan-500/40'
                    }`}
                  >
                    <span
                      className={`font-mono font-extrabold text-sm ${el.value === '-' ? 'text-slate-500' : 'text-cyan-100'}`}
                    >
                      {el.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 15. Moving Average Renderer (Window Queue + Averages Strip)
  if (category === 'movingAverage') {
    const nums = (currentStep.inputString ?? '')
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));
    const activeIdx = currentStep.currentInputIndex ?? 0;
    const [winA, winB] = currentStep.slidingWindowRange ?? [0, activeIdx];
    const windowEls = currentStep.elements;
    const avgEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">MOVING AVERAGE FROM DATA STREAM (SLIDING WINDOW)</span>
          <span className="chamber-subtitle">Sum += new · Sum −= evicted · Average = sum / window size</span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">NUMBER STREAM:</span>
          <div className="char-stream">
            {nums.map((n, idx) => (
              <span
                key={idx}
                className={`stream-char ${idx === activeIdx ? 'char-active' : ''} ${
                  idx >= winA && idx <= winB ? 'char-window' : ''
                } ${idx < winA ? 'char-processed' : ''}`}
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        <div className="queue-channel-workspace">
          <div>
            <span className="column-title text-sky-400 mb-1 block">CURRENT WINDOW QUEUE</span>
            <div className="queue-glass-tube">
              {windowEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Window Empty</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {windowEls.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'pushed' ? 'border-sky-400 bg-sky-500/15' : 'border-sky-500/50'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-sm text-sky-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="column-title text-emerald-400 mb-1 block">EMITTED AVERAGES</span>
            <div className="queue-glass-tube">
              <div className="queue-elements-wrapper">
                {avgEls.map((el) => (
                  <div
                    key={el.id}
                    className={`queue-3d-block ${
                      el.state === 'sorted' ? 'border-emerald-400 bg-emerald-500/15' : 'border-emerald-500/40'
                    }`}
                  >
                    <span className="font-mono font-extrabold text-sm text-emerald-100">{el.auxValue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 16. Task Scheduler Renderer (CPU Timeline + Cooling Queue)
  if (category === 'taskScheduler') {
    const schedule = currentStep.inputString ?? '';
    const executed = schedule.length;
    const readyEls = currentStep.elements;
    const coolEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">TASK SCHEDULER (GREEDY + COOLING QUEUE)</span>
          <span className="chamber-subtitle">
            Each tick runs the highest-count ready task · Cooled tasks wait n+1 ticks · '·' = IDLE
          </span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">CPU TIMELINE ({executed} TICKS):</span>
          <div className="char-stream">
            {schedule.split('').map((char, idx) => (
              <span
                key={idx}
                className={`stream-char ${idx === executed - 1 ? 'char-active' : 'char-processed'} ${
                  char === '·' ? 'opacity-60' : ''
                }`}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        <div className="queue-channel-workspace">
          <div>
            <span className="column-title text-sky-400 mb-1 block">READY TASKS (HIGHEST COUNT FIRST)</span>
            <div className="queue-glass-tube">
              {readyEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>No Ready Tasks</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {readyEls.map((el) => (
                    <div key={el.id} className="queue-3d-block queue-3d-block-wide border-sky-500/50">
                      <span className="font-mono font-extrabold text-xs text-sky-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="column-title text-amber-400 mb-1 block">COOLING QUEUE (GREEN = READY NEXT TICK)</span>
            <div className="queue-glass-tube">
              {coolEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Nothing Cooling</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {coolEls.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block queue-3d-block-wide ${
                        el.state === 'highlight'
                          ? 'border-emerald-400 bg-emerald-500/15'
                          : 'border-amber-500/50 bg-amber-500/5'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-xs text-amber-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 17. Rotting Oranges Renderer (BFS Grid + Rot Queue)
  if (category === 'rottingOranges') {
    const rows = (currentStep.inputString ?? '')
      .split(';')
      .map((r) => r.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n)))
      .filter((r) => r.length > 0);
    const queueEls = currentStep.elements;
    const freshEl = currentStep.auxElements?.[0];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">ROTTING ORANGES (MULTI-SOURCE BFS)</span>
          <span className="chamber-subtitle">
            All rotten sources spread one ring per minute · Fresh left: {freshEl?.auxValue ?? 0}
          </span>
        </div>

        <div className="queue-channel-workspace" style={{ alignItems: 'center' }}>
          <div
            className="orange-grid"
            style={{ gridTemplateColumns: `repeat(${rows[0]?.length ?? 3}, 58px)` }}
          >
            {rows.flatMap((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`orange-cell ${cell === 2 ? 'orange-rotten' : cell === 1 ? 'orange-fresh' : 'orange-empty'}`}
                  title={`R${r}C${c}: ${cell === 2 ? 'Rotten source' : cell === 1 ? 'Fresh orange' : 'Empty cell'}`}
                >
                  {cell === 2 ? 'R' : cell === 1 ? 'F' : '·'}
                </div>
              ))
            )}
          </div>

          <div className="w-full">
            <span className="column-title text-rose-400 mb-1 block">BFS QUEUE (ROTTING SOURCES)</span>
            <div className="queue-glass-tube">
              {queueEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>BFS Queue Empty</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {queueEls.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'pushed' ? 'border-rose-400 bg-rose-500/15' : 'border-rose-500/50'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-xs text-rose-200">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 18. Dota2 Senate Renderer (Dual Party Queues)
  if (category === 'dota2Senate') {
    const senate = currentStep.inputString ?? '';
    const round = currentStep.currentInputIndex ?? 0;
    const rEls = currentStep.elements;
    const dEls = currentStep.auxElements ?? [];

    return (
      <div className="problem-container animate-fade-in">
        <div className="chamber-header">
          <span className="chamber-title">DOTA2 SENATE (ROUND-ROBIN BAN SIMULATION)</span>
          <span className="chamber-subtitle">
            Earlier senator bans the rival head · Winner re-enqueues at index + n · Round {round}
          </span>
        </div>

        <div className="input-string-ribbon">
          <span className="ribbon-label">SENATE SEATING:</span>
          <div className="char-stream">
            {senate.split('').map((char, idx) => (
              <span
                key={idx}
                className={`stream-char ${char === 'R' ? 'text-emerald-300' : 'text-rose-300'}`}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        <div className="queue-channel-workspace">
          <div>
            <span className="column-title text-emerald-400 mb-1 block">RADIANT QUEUE (FRONT = NEXT R VOTER)</span>
            <div className="queue-glass-tube">
              {rEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Radiant Eliminated</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {rEls.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'pushed' ? 'border-emerald-400 bg-emerald-500/15' : 'border-emerald-500/50'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-sm text-emerald-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="column-title text-rose-400 mb-1 block">DIRE QUEUE (FRONT = NEXT D VOTER)</span>
            <div className="queue-glass-tube">
              {dEls.length === 0 ? (
                <div className="queue-empty-notice">
                  <span>Dire Eliminated</span>
                </div>
              ) : (
                <div className="queue-elements-wrapper">
                  {dEls.map((el) => (
                    <div
                      key={el.id}
                      className={`queue-3d-block ${
                        el.state === 'pushed' ? 'border-rose-400 bg-rose-500/15' : 'border-rose-500/50'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-sm text-rose-100">{el.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
