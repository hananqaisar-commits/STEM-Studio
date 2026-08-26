import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Plus, Trash2, Code, CheckCircle2, Filter, HelpCircle, Maximize2, Sparkles
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildStackQueueCheckpoints } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';
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
  generateSimplifyPathSteps,
  generateRemoveAdjacentDuplicatesSteps,
  generateSlidingWindowSteps,
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
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { StackQueueCodePanel } from './StackQueueCodePanel';
import './StackQueue.css';

interface ProblemMeta {
  id: StackQueueCategory;
  name: string;
  group: 'Stack' | 'Queue' | 'Core';
  leetcodeId?: string;
  description: string;
}

const PROBLEMS_LIST: ProblemMeta[] = [
  { id: 'stack', name: 'Stack Primitive (LIFO)', group: 'Core', description: 'Basic LIFO push & pop operations' },
  { id: 'queue', name: 'Queue Primitive (FIFO)', group: 'Core', description: 'Basic FIFO enqueue & dequeue operations' },
  
  // Stack Problems
  { id: 'validParentheses', name: 'Valid Parentheses', group: 'Stack', leetcodeId: '#20', description: 'Matching brackets evaluation using LIFO stack' },
  { id: 'minStack', name: 'Min Stack O(1)', group: 'Stack', leetcodeId: '#155', description: 'Stack with O(1) minimum value tracking' },
  { id: 'postfixEval', name: 'Evaluate RPN / Postfix', group: 'Stack', leetcodeId: '#150', description: 'Evaluate Reverse Polish Notation expressions' },
  { id: 'dailyTemperatures', name: 'Daily Temperatures', group: 'Stack', leetcodeId: '#739', description: 'Monotonic decreasing stack for next warmer day' },
  { id: 'simplifyPath', name: 'Simplify Path', group: 'Stack', leetcodeId: '#71', description: 'Canonical Unix directory path simplification' },
  { id: 'removeAdjacentDuplicates', name: 'Remove Adjacent Duplicates', group: 'Stack', leetcodeId: '#1047', description: 'Remove consecutive matching characters' },
  { id: 'basicCalculator', name: 'Basic Calculator', group: 'Stack', leetcodeId: '#224', description: 'Evaluate math expression string with signs & brackets' },
  { id: 'decodeString', name: 'Decode String Pattern', group: 'Stack', leetcodeId: '#394', description: 'Expand nested repeated pattern string k[str]' },
  { id: 'trappingRainWater', name: 'Trapping Rain Water', group: 'Stack', leetcodeId: '#42', description: 'Monotonic stack elevation boundary calculation' },
  { id: 'largestRectangle', name: 'Largest Rectangle in Histogram', group: 'Stack', leetcodeId: '#84', description: 'Monotonic stack maximum rectangle area' },

  // Queue Problems
  { id: 'queueViaStacks', name: 'Queue using 2 Stacks', group: 'Queue', leetcodeId: '#232', description: 'Simulate FIFO queue using 2 LIFO stacks' },
  { id: 'stackViaQueues', name: 'Stack using Queues', group: 'Queue', leetcodeId: '#225', description: 'Simulate LIFO stack using FIFO queues' },
  { id: 'circularQueue', name: 'Circular Ring Queue', group: 'Queue', leetcodeId: '#622', description: 'Ring buffer queue with modular index wrapping' },
  { id: 'circularDeque', name: 'Design Circular Deque', group: 'Queue', leetcodeId: '#641', description: 'Double-ended ring queue with front/rear ops' },
  { id: 'slidingWindow', name: 'Sliding Window Maximum', group: 'Queue', leetcodeId: '#239', description: 'Monotonic Deque maximum tracking in sliding window' },
  { id: 'firstNonRepeating', name: 'First Non-Repeating in Stream', group: 'Queue', description: 'Queue-based character frequency stream lookup' },
  { id: 'movingAverage', name: 'Moving Average Data Stream', group: 'Queue', leetcodeId: '#346', description: 'Sliding window moving average calculation' },
  { id: 'taskScheduler', name: 'Task Scheduler CPU Queue', group: 'Queue', leetcodeId: '#621', description: 'CPU cooling interval task execution queue' },
  { id: 'rottingOranges', name: 'Rotting Oranges BFS Grid', group: 'Queue', leetcodeId: '#994', description: 'Multi-source BFS grid level queue traversal' },
  { id: 'dota2Senate', name: 'Dota2 Senate Round-Robin', group: 'Queue', leetcodeId: '#649', description: 'Round-robin voting ban queue strategy' },
];

export const StackQueuePage: React.FC = () => {
  const [category, setCategory] = useState<StackQueueCategory>('stack');
  const [inputValue, setInputValue] = useState<string>('42');

  // Modes & Modals matching BST
  const [quizEnabled, setQuizEnabled] = useState<boolean>(true);
  const [cadence, setCadence] = useState<QuizCadence>('normal');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

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

  // Build quiz checkpoints from the current active steps
  const quizCheckpoints = useMemo(
    () => buildStackQueueCheckpoints(activeSteps, category),
    [activeSteps, category]
  );

  const quizSession = useQuizSession({
    enabled: quizEnabled,
    checkpoints: quizCheckpoints,
    cadence,
    currentStepIndex,
    isPlaying,
    pause,
    stepForward,
    module: 'stackQueue',
    algorithmId: category,
  });

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

  const handleSimplifyPath = () => {
    const p = inputValue.trim() || '/a/./b/../../c/';
    const steps = generateSimplifyPathSteps(p);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleRemoveDuplicates = () => {
    const s = inputValue.trim() || 'abbaca';
    const steps = generateRemoveAdjacentDuplicatesSteps(s);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleSlidingWindow = () => {
    const nums = inputValue.trim()
      ? inputValue.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n))
      : [1, 3, -1, -3, 5, 3, 6, 7];
    const steps = generateSlidingWindowSteps(nums, 3);
    setActiveSteps(steps);
    reset();
    play();
  };

  // ─── DEFAULT CATEGORY STEP GENERATOR ─────────────────────────────────────
  const getCategoryDefaultSteps = (
    cat: StackQueueCategory,
    currStack: (number | string)[] = stackData,
    currQueue: (number | string)[] = queueData,
    currCq: (number | string | null)[] = cqElements,
    currFront: number = cqFront,
    currRear: number = cqRear,
    currMinMain: number[] = minMainStack,
    currMinAux: number[] = minAuxStack,
    currQvsIn: (number | string)[] = qvsIn,
    currQvsOut: (number | string)[] = qvsOut
  ): StackQueueStep[] => {
    switch (cat) {
      case 'stack':
        return generateStackPushSteps(currStack.length ? currStack : [10, 25, 30], 42);
      case 'queue':
        return generateQueueEnqueueSteps(currQueue.length ? currQueue : [15, 28, 40], 42);
      case 'circularQueue':
        return generateCircularQueueEnqueueSteps(currCq, currFront, currRear, 6, 50).steps;
      case 'validParentheses':
        return generateValidParenthesesSteps('({[]})');
      case 'minStack':
        return generateMinStackPushSteps(currMinMain.length ? currMinMain : [5, 2, 8], currMinAux.length ? currMinAux : [5, 2, 2], 3).steps;
      case 'postfixEval':
        return generatePostfixEvalSteps('3 4 + 2 *');
      case 'queueViaStacks':
        return generateQueueViaStacksSteps(currQvsIn, currQvsOut, 'enqueue', 42).steps;
      case 'dailyTemperatures':
        return generateDailyTemperaturesSteps([73, 74, 75, 71, 69, 72, 76, 73]);
      case 'simplifyPath':
        return generateSimplifyPathSteps('/a/./b/../../c/');
      case 'removeAdjacentDuplicates':
        return generateRemoveAdjacentDuplicatesSteps('abbaca');
      case 'slidingWindow':
        return generateSlidingWindowSteps([1, 3, -1, -3, 5, 3, 6, 7], 3);
      default:
        return generateStackPushSteps([10, 25, 30], 42);
    }
  };

  // Auto-generate step sequence whenever category changes
  useEffect(() => {
    const steps = getCategoryDefaultSteps(category);
    setActiveSteps(steps);
    reset();
  }, [category]);

  const handleSampleData = () => {
    const sampleStack = [10, 25, 30, 45];
    const sampleQueue = [15, 28, 40, 52];
    const sampleCq = [10, 20, 30, 40, null, null];
    const sampleMinMain = [8, 4, 12, 2];
    const sampleMinAux = [8, 4, 4, 2];
    const sampleQvsIn = [10, 20, 30];
    const sampleQvsOut = [5];

    setStackData(sampleStack);
    setQueueData(sampleQueue);
    setCqElements(sampleCq);
    setCqFront(0);
    setCqRear(3);
    setMinMainStack(sampleMinMain);
    setMinAuxStack(sampleMinAux);
    setQvsIn(sampleQvsIn);
    setQvsOut(sampleQvsOut);

    const steps = getCategoryDefaultSteps(category, sampleStack, sampleQueue, sampleCq, 0, 3, sampleMinMain, sampleMinAux, sampleQvsIn, sampleQvsOut);
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleRandomData = () => {
    const rndStack = Array.from({ length: 4 }, () => Math.floor(Math.random() * 85) + 10);
    const rndQueue = Array.from({ length: 4 }, () => Math.floor(Math.random() * 85) + 10);
    const rndCq = [rndStack[0], rndStack[1], rndStack[2], null, null, null];

    setStackData(rndStack);
    setQueueData(rndQueue);
    setCqElements(rndCq);
    setCqFront(0);
    setCqRear(2);

    const steps = getCategoryDefaultSteps(category, rndStack, rndQueue, rndCq, 0, 2);
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

  const handleSelectProblem = (id: StackQueueCategory) => {
    setCategory(id);
    const steps = getCategoryDefaultSteps(id);
    setActiveSteps(steps);
    reset();
    quizSession.resetSession();
  };

  /* Operation buttons for the active category. Shared by the page toolbar and the
     full-screen toolbar so both always expose the exact same actions. */
  const renderCategoryActions = () => (
    <>
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

      {category === 'simplifyPath' && (
        <button className="bst-btn btn-insert" onClick={handleSimplifyPath}>
          <CheckCircle2 size={14} />
          <span>Simplify Path</span>
        </button>
      )}

      {category === 'removeAdjacentDuplicates' && (
        <button className="bst-btn btn-insert" onClick={handleRemoveDuplicates}>
          <CheckCircle2 size={14} />
          <span>Remove Duplicates</span>
        </button>
      )}

      {category === 'slidingWindow' && (
        <button className="bst-btn btn-insert" onClick={handleSlidingWindow}>
          <CheckCircle2 size={14} />
          <span>Compute Window Max</span>
        </button>
      )}
    </>
  );

  const renderCanvas = () => (
    <>
      {category === 'stack' && <StackRenderer currentStep={currentStep} />}
      {category === 'queue' && <QueueRenderer currentStep={currentStep} />}
      {category === 'circularQueue' && <CircularQueueRenderer currentStep={currentStep} />}
      {!['stack', 'queue', 'circularQueue'].includes(category) && (
        <ProblemRenderer category={category} currentStep={currentStep} />
      )}
    </>
  );

  const renderPlayerControls = () => (
    <div className="player-bar" style={{ margin: 0 }}>
      <div className="player-left">
        <PlayPauseButton isPlaying={isPlaying} onToggle={isPlaying ? pause : play} />
        <StepControls
          onStepBack={stepBack}
          onStepForward={stepForward}
          onReset={reset}
          canStepBack={currentStepIndex > 0}
          canStepForward={currentStepIndex < totalSteps - 1}
        />
      </div>

      <div className="player-center">
        <div className="step-progress-bar">
          <div
            className="step-progress-fill"
            style={{ width: `${(currentStepIndex / Math.max(1, totalSteps - 1)) * 100}%` }}
          />
        </div>
        <span className="step-counter">
          Step {totalSteps > 0 ? currentStepIndex + 1 : 0} / {totalSteps}
        </span>
      </div>

      <div className="player-right">
        <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
      </div>
    </div>
  );

  const renderFloatingControls = () => (
    <div className="fs-floating-controls">
      <div className="bst-input-group">
        <span>Value:</span>
        <input
          type="text"
          className="bst-input"
          style={{ width: '90px' }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Val / Expr"
        />
      </div>

      {renderCategoryActions()}

      <div className="dataset-mode-selector">
        <button className="bst-btn btn-mode" onClick={handleClearAll}>
          <Trash2 size={14} />
          <span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleSampleData}>
          <Layers size={14} />
          <span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomData}>
          <Sparkles size={14} />
          <span>Random</span>
        </button>
      </div>

      <button
        className={`quiz-mode-btn ${quizEnabled ? 'is-active' : ''}`}
        onClick={() => setQuizEnabled((prev) => !prev)}
        title="Toggle Quiz Mode"
        style={{ marginLeft: '0.5rem' }}
      >
        <HelpCircle size={16} />
        <span>Quiz Mode</span>
      </button>
    </div>
  );

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Layers size={22} />}
        title="Stack & Queue Studio"
        subtitle="Interactive LIFO / FIFO Primitives & 20 Classical Interview Problems"
        items={PROBLEMS_LIST.map((prob) => ({
          id: prob.id,
          name: prob.leetcodeId ? `${prob.name}  ${prob.leetcodeId}` : prob.name,
          description: prob.description,
          group: prob.group,
        }))}
        activeId={category}
        onSelect={(id) => handleSelectProblem(id as StackQueueCategory)}
        placeholder="Search 20 DSA problems (#739, Water, Min)..."
      />

      {/* Category Tabs Bar Matching BST */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs">
          <button
            className={`category-tab ${['stack', 'queue', 'circularQueue'].includes(category) ? 'active' : ''}`}
            onClick={() => {
              setCategory('stack');
              setActiveSteps([]);
              reset();
            }}
          >
            <Layers size={16} />
            <span>Core Primitives (LIFO & FIFO)</span>
          </button>

          <button
            className={`category-tab ${PROBLEMS_LIST.filter((p) => p.group === 'Stack').some((p) => p.id === category) ? 'active' : ''}`}
            onClick={() => {
              setCategory('validParentheses');
              setActiveSteps([]);
              reset();
            }}
          >
            <CheckCircle2 size={16} />
            <span>10 Stack Classical Problems</span>
          </button>

          <button
            className={`category-tab ${PROBLEMS_LIST.filter((p) => p.group === 'Queue').some((p) => p.id === category) ? 'active' : ''}`}
            onClick={() => {
              setCategory('queueViaStacks');
              setActiveSteps([]);
              reset();
            }}
          >
            <Filter size={16} />
            <span>10 Queue Classical Problems</span>
          </button>
        </div>
      </div>

      {/* Operations Control Toolbar Matching BST */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {/* Problem Selector Dropdown (⌘K search lives in the shared page header) */}
          <select
            className="bst-select font-bold text-xs"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as StackQueueCategory);
              setActiveSteps([]);
              reset();
            }}
          >
            <optgroup label="── Core Primitives ──">
              <option value="stack">Stack Primitive (LIFO)</option>
              <option value="queue">Queue Primitive (FIFO)</option>
            </optgroup>
            <optgroup label="── Stack Classical Problems (10) ──">
              <option value="validParentheses">1. Valid Parentheses (#20)</option>
              <option value="minStack">2. Min Stack O(1) (#155)</option>
              <option value="postfixEval">3. Evaluate RPN / Postfix (#150)</option>
              <option value="dailyTemperatures">4. Daily Temperatures / Monotonic (#739)</option>
              <option value="simplifyPath">5. Simplify Path (#71)</option>
              <option value="removeAdjacentDuplicates">6. Remove Adjacent Duplicates (#1047)</option>
              <option value="basicCalculator">7. Basic Calculator Expression (#224)</option>
              <option value="decodeString">8. Decode String Pattern (#394)</option>
              <option value="trappingRainWater">9. Trapping Rain Water (#42)</option>
              <option value="largestRectangle">10. Largest Rectangle in Histogram (#84)</option>
            </optgroup>
            <optgroup label="── Queue Classical Problems (10) ──">
              <option value="queueViaStacks">1. Queue using 2 Stacks (#232)</option>
              <option value="stackViaQueues">2. Stack using Queues (#225)</option>
              <option value="circularQueue">3. Circular Queue Ring Buffer (#622)</option>
              <option value="circularDeque">4. Design Circular Deque (#641)</option>
              <option value="slidingWindow">5. Sliding Window Maximum (#239)</option>
              <option value="firstNonRepeating">6. First Non-Repeating in Stream</option>
              <option value="movingAverage">7. Moving Average Data Stream (#346)</option>
              <option value="taskScheduler">8. Task Scheduler CPU Queue (#621)</option>
              <option value="rottingOranges">9. Rotting Oranges BFS Grid (#994)</option>
              <option value="dota2Senate">10. Dota2 Senate Round-Robin (#649)</option>
            </optgroup>
          </select>

          {/* Input Group Matching BST */}
          <div className="bst-input-group">
            <span>Value:</span>
            <input
              type="text"
              className="bst-input"
              style={{ width: '90px' }}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Val / Expr"
            />
          </div>

          {/* Category Action Buttons */}
          {renderCategoryActions()}

          {/* Dataset Selector Group Matching BST */}
          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={handleClearAll}>
              <Trash2 size={14} className="text-rose-400" />
              <span>Empty</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleSampleData}>
              <Layers size={14} className="text-amber-400" />
              <span>Sample</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleRandomData}>
              <Sparkles size={14} className="text-emerald-400" />
              <span>Random</span>
            </button>
          </div>
        </div>

        {/* Toolbar Right Matching BST */}
        <div className="bst-toolbar-right">
          <button
            className={`quiz-mode-btn ${quizEnabled ? 'is-active' : ''}`}
            onClick={() => setQuizEnabled((prev) => !prev)}
            title="Toggle Quiz Mode"
          >
            <HelpCircle size={16} />
            <span>Quiz Mode</span>
          </button>

          <button
            className="bst-btn btn-fullscreen"
            onClick={() => setIsFullScreenOpen(true)}
            title="Full Screen Canvas View"
          >
            <Maximize2 size={14} />
          </button>

          <button
            className={`bst-btn ${showDebugger ? 'active' : ''}`}
            onClick={() => setShowDebugger(!showDebugger)}
          >
            <Code size={14} />
            <span>{showDebugger ? 'Hide Debugger' : 'Show Debugger'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (Canvas + Code Debugger) */}
      <div className="sorting-workspace">
        <div className="renderer-section">
          <div className="bst-canvas-card">
            <div className="bst-canvas-header">
              <div className="ll-canvas-title">
                <Layers size={16} className="text-accent" />
                <span>
                  {(PROBLEMS_LIST.find((p) => p.id === category)?.name ?? category).toUpperCase()} CANVAS
                </span>
              </div>
              <button
                className="bst-btn btn-fullscreen"
                onClick={() => setIsFullScreenOpen(true)}
                title="Full Screen Canvas View"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            {renderCanvas()}
          </div>

          {renderPlayerControls()}
        </div>

        {/* Right Panel: Code Debugger + Explanation */}
        {showDebugger && (
          <div className="explanation-section">
            <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />

            <MultiLanguageCodePanel
              algorithmKey={category}
              breakpoints={[]}
              onToggleBreakpoint={() => {}}
            />

            <StackQueueCodePanel
              category={category}
              activeLine={currentStep?.codeLine ?? 1}
            />

            <ExplanationPanel
              description={maskNarration(currentStep?.description ?? 'Run an operation to observe step-by-step execution.', quizSession.phase)}
            />
          </div>
        )}
      </div>

      {/* FullScreen Canvas Modal matching BST */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Stack & Queue Studio | ${(PROBLEMS_LIST.find((p) => p.id === category)?.name ?? 'Visualizer').toUpperCase()}`}
        subtitle="Interactive LIFO / FIFO Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
      >
        {renderCanvas()}
      </FullScreenCanvasModal>
    </div>
  );
};
