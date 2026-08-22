import React, { useState } from 'react';
import {
  Layers, Plus, Trash2, Code, CheckCircle2
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import {
  generateStackPushSteps,
  generateStackPopSteps,
  generateQueueEnqueueSteps,
  generateQueueDequeueSteps,
  generateCircularQueueEnqueueSteps,
  generateValidParenthesesSteps,
  generateMinStackPushSteps,
  generatePostfixEvalSteps,
  generateQueueViaStacksSteps,
  generateDailyTemperaturesSteps,
  type StackQueueCategory,
  type StackQueueStep
} from './stackQueueEngine';
import { StackRenderer } from './StackRenderer';
import { QueueRenderer } from './QueueRenderer';
import { CircularQueueRenderer } from './CircularQueueRenderer';
import { ProblemRenderer } from './ProblemRenderer';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { StackQueueCodePanel } from './StackQueueCodePanel';
import './StackQueue.css';

export const StackQueuePage: React.FC = () => {
  const [category, setCategory] = useState<StackQueueCategory>('stack');
  const [inputValue, setInputValue] = useState<string>('42');

  // Active step dataset
  const [activeSteps, setActiveSteps] = useState<StackQueueStep[]>([]);

  // Internal Data Structure States
  const [stackData, setStackData] = useState<(number | string)[]>([10, 25, 30]);
  const [queueData, setQueueData] = useState<(number | string)[]>([15, 28, 40]);
  const [cqElements, setCqElements] = useState<(number | string | null)[]>([10, 20, 30, null, null, null]);
  const [cqFront, setCqFront] = useState<number>(0);
  const [cqRear, setCqRear] = useState<number>(2);

  const [minMainStack, setMinMainStack] = useState<number[]>([5, 2, 8]);
  const [minAuxStack, setMinAuxStack] = useState<number[]>([5, 2, 2]);

  // Queue via Two Stacks state
  const [qvsIn, setQvsIn] = useState<(number | string)[]>([10, 20]);
  const [qvsOut, setQvsOut] = useState<(number | string)[]>([5]);

  // Code Debugger Visibility State
  const [showDebugger, setShowDebugger] = useState<boolean>(true);

  // Step Player Hook
  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    isPlaying,
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
    setSpeed,
  } = useStepPlayer<StackQueueStep>({ steps: activeSteps });

  // ─── ACTION HANDLERS ─────────────────────────────────────────────

  const handlePush = () => {
    if (!inputValue.trim()) return;
    const val = isNaN(Number(inputValue)) ? inputValue.trim() : Number(inputValue);
    const steps = generateStackPushSteps(stackData, val);
    setStackData([...stackData, val]);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handlePop = () => {
    const steps = generateStackPopSteps(stackData);
    if (stackData.length > 0) setStackData(stackData.slice(0, -1));
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleEnqueue = () => {
    if (!inputValue.trim()) return;
    const val = isNaN(Number(inputValue)) ? inputValue.trim() : Number(inputValue);
    const steps = generateQueueEnqueueSteps(queueData, val);
    setQueueData([...queueData, val]);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleDequeue = () => {
    const steps = generateQueueDequeueSteps(queueData);
    if (queueData.length > 0) setQueueData(queueData.slice(1));
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleCircularEnqueue = () => {
    if (!inputValue.trim()) return;
    const val = isNaN(Number(inputValue)) ? inputValue.trim() : Number(inputValue);
    const res = generateCircularQueueEnqueueSteps(cqElements, cqFront, cqRear, 6, val);
    setCqElements(res.newElements);
    setCqFront(res.newFront);
    setCqRear(res.newRear);
    setActiveSteps(res.steps);
    reset();
    play();
  };

  const handleValidParentheses = () => {
    const expr = inputValue.trim() || '({[]})';
    const steps = generateValidParenthesesSteps(expr);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleMinStackPush = () => {
    const num = Number(inputValue) || 1;
    const res = generateMinStackPushSteps(minMainStack, minAuxStack, num);
    setMinMainStack(res.newMain);
    setMinAuxStack(res.newMin);
    setActiveSteps(res.steps);
    reset();
    play();
  };

  const handlePostfixEval = () => {
    const expr = inputValue.trim() || '3 4 + 2 *';
    const steps = generatePostfixEvalSteps(expr);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleQueueViaStacksEnqueue = () => {
    const val = isNaN(Number(inputValue)) ? inputValue.trim() : Number(inputValue) || 99;
    const res = generateQueueViaStacksSteps(qvsIn, qvsOut, 'enqueue', val);
    setQvsIn(res.newIn);
    setQvsOut(res.newOut);
    setActiveSteps(res.steps);
    reset();
    play();
  };

  const handleQueueViaStacksDequeue = () => {
    const res = generateQueueViaStacksSteps(qvsIn, qvsOut, 'dequeue');
    setQvsIn(res.newIn);
    setQvsOut(res.newOut);
    setActiveSteps(res.steps);
    reset();
    play();
  };

  const handleDailyTemperatures = () => {
    const inputTemps = inputValue.trim()
      ? inputValue.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n))
      : [73, 74, 75, 71, 69, 72, 76, 73];
    const steps = generateDailyTemperaturesSteps(inputTemps);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleClearAll = () => {
    setStackData([]);
    setQueueData([]);
    setCqElements([null, null, null, null, null, null]);
    setCqFront(-1);
    setCqRear(-1);
    setMinMainStack([]);
    setMinAuxStack([]);
    setQvsIn([]);
    setQvsOut([]);
    setActiveSteps([]);
    reset();
  };

  return (
    <div className="bst-page-container">
      {/* Category Header */}
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title text-xl font-bold flex items-center gap-2">
            <Layers className="text-amber-400" size={24} />
            <span>Stack & Queue Learning Studio</span>
          </h1>
          <p className="page-subtitle text-xs text-slate-400">
            Interactive 3D Visualizer for Linear Data Structures & Classical Interview Problems
          </p>
        </div>

        {/* Debugger Toggle */}
        <button
          className={`bst-btn ${showDebugger ? 'active' : ''}`}
          onClick={() => setShowDebugger(!showDebugger)}
        >
          <Code size={14} />
          <span>{showDebugger ? 'Hide Debugger' : 'Show Debugger'}</span>
        </button>
      </header>

      {/* Control Toolbar */}
      <div className="bst-toolbar">
        <div className="bst-toolbar-left flex flex-wrap gap-2 items-center">
          {/* Category Selector */}
          <select
            className="bst-select font-bold text-xs"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as StackQueueCategory);
              setActiveSteps([]);
              reset();
            }}
          >
            <optgroup label="Core Data Structures">
              <option value="stack">Stack (LIFO)</option>
              <option value="queue">Queue (FIFO)</option>
              <option value="circularQueue">Circular Ring Queue</option>
            </optgroup>
            <optgroup label="Top 5 Classical LeetCode Problems">
              <option value="validParentheses">1. Valid Parentheses (#20)</option>
              <option value="minStack">2. Min Stack O(1) (#155)</option>
              <option value="postfixEval">3. Evaluate RPN / Postfix (#150)</option>
              <option value="queueViaStacks">4. Queue using 2 Stacks (#232)</option>
              <option value="dailyTemperatures">5. Daily Temperatures / Monotonic (#739)</option>
            </optgroup>
          </select>

          {/* Action Input */}
          <input
            type="text"
            className="bst-input w-36"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Val / Expr / Temps"
          />

          {/* Category Specific Action Buttons */}
          {category === 'stack' && (
            <>
              <button className="bst-btn btn-insert" onClick={handlePush}>
                <Plus size={14} />
                <span>Push</span>
              </button>
              <button className="bst-btn btn-search" onClick={handlePop}>
                <span>Pop</span>
              </button>
            </>
          )}

          {category === 'queue' && (
            <>
              <button className="bst-btn btn-insert" onClick={handleEnqueue}>
                <Plus size={14} />
                <span>Enqueue</span>
              </button>
              <button className="bst-btn btn-search" onClick={handleDequeue}>
                <span>Dequeue</span>
              </button>
            </>
          )}

          {category === 'circularQueue' && (
            <button className="bst-btn btn-insert" onClick={handleCircularEnqueue}>
              <Plus size={14} />
              <span>Enqueue Slot</span>
            </button>
          )}

          {category === 'validParentheses' && (
            <button className="bst-btn btn-insert" onClick={handleValidParentheses}>
              <CheckCircle2 size={14} />
              <span>Evaluate String</span>
            </button>
          )}

          {category === 'minStack' && (
            <button className="bst-btn btn-insert" onClick={handleMinStackPush}>
              <Plus size={14} />
              <span>Push Value</span>
            </button>
          )}

          {category === 'postfixEval' && (
            <button className="bst-btn btn-insert" onClick={handlePostfixEval}>
              <CheckCircle2 size={14} />
              <span>Evaluate Postfix</span>
            </button>
          )}

          {category === 'queueViaStacks' && (
            <>
              <button className="bst-btn btn-insert" onClick={handleQueueViaStacksEnqueue}>
                <Plus size={14} />
                <span>Enqueue In-Stack</span>
              </button>
              <button className="bst-btn btn-search" onClick={handleQueueViaStacksDequeue}>
                <span>Dequeue Out-Stack</span>
              </button>
            </>
          )}

          {category === 'dailyTemperatures' && (
            <button className="bst-btn btn-insert" onClick={handleDailyTemperatures}>
              <CheckCircle2 size={14} />
              <span>Compute Warmer Days</span>
            </button>
          )}

          <button className="bst-btn btn-mode" onClick={handleClearAll}>
            <Trash2 size={14} className="text-rose-400" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (Canvas + Code Debugger) */}
      <div className="sorting-workspace">
        <div className="renderer-section flex-1">
          {category === 'stack' && <StackRenderer currentStep={currentStep} />}
          {category === 'queue' && <QueueRenderer currentStep={currentStep} />}
          {category === 'circularQueue' && <CircularQueueRenderer currentStep={currentStep} />}
          {['validParentheses', 'minStack', 'postfixEval', 'queueViaStacks', 'dailyTemperatures'].includes(category) && (
            <ProblemRenderer category={category} currentStep={currentStep} />
          )}

          {/* Player Control Bar */}
          <div className="player-bar mt-4 flex items-center justify-between">
            <div className="player-left flex items-center gap-2">
              <PlayPauseButton
                isPlaying={isPlaying}
                onToggle={() => (isPlaying ? pause() : play())}
              />
              <StepControls
                onStepForward={stepForward}
                onStepBack={stepBack}
                onReset={reset}
                canStepForward={currentStepIndex < totalSteps - 1}
                canStepBack={currentStepIndex > 0}
              />
            </div>

            <div className="player-center flex items-center gap-3">
              <span className="step-counter font-mono text-xs text-slate-400">
                Step {totalSteps > 0 ? currentStepIndex + 1 : 0} of {totalSteps}
              </span>
              <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
            </div>
          </div>
        </div>

        {/* Right Panel: Code Debugger Panel */}
        {showDebugger && (
          <div className="debugger-sidebar w-80">
            <StackQueueCodePanel
              category={category}
              activeLine={currentStep?.codeLine ?? 1}
            />
          </div>
        )}
      </div>
    </div>
  );
};
