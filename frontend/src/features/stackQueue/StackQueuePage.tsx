import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers, Plus, Trash2, Code, CheckCircle2, Filter, HelpCircle, Maximize2, Sparkles
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildStackQueueCheckpoints, buildRevisionData } from './quizAdapter';
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
  generateBasicCalculatorSteps,
  generateDecodeStringSteps,
  generateTrappingRainWaterSteps,
  generateLargestRectangleSteps,
  generateStackViaQueuesSteps,
  generateCircularDequeSteps,
  generateFirstNonRepeatingSteps,
  generateMovingAverageSteps,
  generateTaskSchedulerSteps,
  generateRottingOrangesSteps,
  generateDota2SenateSteps,
  type StackQueueCategory,
  type StackQueueStep
} from './stackQueueEngine';
import { StackRenderer } from './StackRenderer';
import { QueueRenderer } from './QueueRenderer';
import { CircularQueueRenderer } from './CircularQueueRenderer';
import { ProblemRenderer } from './ProblemRenderer';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { StackQueueCodePanel } from './StackQueueCodePanel';
import './StackQueue.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

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

// Circular Deque ring capacity shared by state, handlers and the engine
const CD_CAPACITY = 5;

export const StackQueuePage: React.FC = () => {
  const [category, setCategory] = useState<StackQueueCategory>('stack');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && PROBLEMS_LIST.some((a) => a.id === topic)) {
      setCategory(topic as StackQueueCategory);
    }
  }, [searchParams]);

  const [inputValue, setInputValue] = useState<string>('42');

  // Modes & Modals matching BST
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
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

  // Stack via Two Queues state (main queue holds the stack, aux drains on push)
  const [svqMain, setSvqMain] = useState<(number | string)[]>([10, 20, 30]);
  const [svqAux, setSvqAux] = useState<(number | string)[]>([]);

  // Circular Deque ring state (CD_CAPACITY slots, front/rear point at elements)
  const [cdElements, setCdElements] = useState<(number | string | null)[]>([10, 20, null, null, null]);
  const [cdFront, setCdFront] = useState<number>(0);
  const [cdRear, setCdRear] = useState<number>(1);

  // Code Debugger Visibility State
  const [showDebugger, setShowDebugger] = useState<boolean>(true);

  // Step Player Hook
  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    isPlaying,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
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
    revisionData: buildRevisionData(category),
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

  const parseNumArray = (fallback: number[]): number[] => {
    const nums = inputValue.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    return nums.length > 0 ? nums : fallback;
  };

  const handleBasicCalculator = () => {
    const expr = inputValue.trim() || '2-(3+4)';
    setActiveSteps(generateBasicCalculatorSteps(expr));
    reset();
    play();
  };

  const handleDecodeString = () => {
    const s = inputValue.trim() || '3[a2[c]]';
    setActiveSteps(generateDecodeStringSteps(s));
    reset();
    play();
  };

  const handleTrappingRainWater = () => {
    const heights = parseNumArray([4, 2, 0, 3, 2, 5]);
    setActiveSteps(generateTrappingRainWaterSteps(heights));
    reset();
    play();
  };

  const handleLargestRectangle = () => {
    const heights = parseNumArray([2, 1, 5, 6, 2, 3]);
    setActiveSteps(generateLargestRectangleSteps(heights));
    reset();
    play();
  };

  const handleStackViaQueuesPush = () => {
    const raw = inputValue.trim();
    const val: number | string = raw === '' ? 42 : isNaN(Number(raw)) ? raw : Number(raw);
    const res = generateStackViaQueuesSteps(svqMain, svqAux, 'push', val);
    setSvqMain(res.newMain);
    setSvqAux(res.newAux);
    setActiveSteps(res.steps);
    reset();
    play();
  };

  const handleStackViaQueuesPop = () => {
    const res = generateStackViaQueuesSteps(svqMain, svqAux, 'pop');
    setSvqMain(res.newMain);
    setSvqAux(res.newAux);
    setActiveSteps(res.steps);
    reset();
    play();
  };

  const handleCircularDeque = (
    op: 'insertFront' | 'insertLast' | 'deleteFront' | 'deleteLast'
  ) => {
    let value: number | string | undefined;
    if (op === 'insertFront' || op === 'insertLast') {
      const raw = inputValue.trim();
      value = raw === '' ? 42 : isNaN(Number(raw)) ? raw : Number(raw);
    }
    const res = generateCircularDequeSteps(cdElements, cdFront, cdRear, CD_CAPACITY, op, value);
    setCdElements(res.newElements);
    setCdFront(res.newFront);
    setCdRear(res.newRear);
    setActiveSteps(res.steps);
    reset();
    play();
  };

  const handleFirstNonRepeating = () => {
    const stream = inputValue.trim().replace(/[^a-zA-Z]/g, '') || 'aabc';
    setActiveSteps(generateFirstNonRepeatingSteps(stream));
    reset();
    play();
  };

  const handleMovingAverage = () => {
    const parts = inputValue.split('|');
    const nums = parts[0].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    const k = parts[1] ? Math.max(1, Number(parts[1]) || 3) : 3;
    setActiveSteps(generateMovingAverageSteps(nums.length > 0 ? nums : [1, 10, 3, 5], k));
    reset();
    play();
  };

  const handleTaskScheduler = () => {
    const tokens = inputValue.trim().split(/[\s,]+/).filter(Boolean);
    let cooldown = 2;
    let taskStr = tokens.join('');
    if (tokens.length > 1 && !isNaN(Number(tokens[tokens.length - 1]))) {
      cooldown = Math.max(0, Number(tokens[tokens.length - 1]));
      taskStr = tokens.slice(0, -1).join('');
    }
    const tasks = taskStr.toUpperCase().replace(/[^A-Z]/g, '').split('').filter(Boolean);
    setActiveSteps(
      generateTaskSchedulerSteps(
        tasks.length > 0 ? tasks : ['A', 'A', 'A', 'B', 'B', 'B'],
        cooldown
      )
    );
    reset();
    play();
  };

  const handleRottingOranges = () => {
    const rows = inputValue.trim().split(';').map((r) => r.trim().split(/[\s,]+/).map(Number));
    const valid =
      rows.length > 0 && rows.every((r) => r.length > 0 && r.every((c) => !isNaN(c) && c >= 0 && c <= 2));
    setActiveSteps(
      generateRottingOrangesSteps(valid ? rows : [[2, 1, 1], [1, 1, 0], [0, 1, 1]])
    );
    reset();
    play();
  };

  const handleDota2Senate = () => {
    const senate = inputValue.trim().toUpperCase().replace(/[^RD]/g, '') || 'RDDR';
    setActiveSteps(generateDota2SenateSteps(senate));
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
    currQvsOut: (number | string)[] = qvsOut,
    currSvqMain: (number | string)[] = svqMain,
    currSvqAux: (number | string)[] = svqAux,
    currCd: (number | string | null)[] = cdElements,
    currCdFront: number = cdFront,
    currCdRear: number = cdRear
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
      case 'basicCalculator':
        return generateBasicCalculatorSteps('2-(3+4)');
      case 'decodeString':
        return generateDecodeStringSteps('3[a2[c]]');
      case 'trappingRainWater':
        return generateTrappingRainWaterSteps([4, 2, 0, 3, 2, 5]);
      case 'largestRectangle':
        return generateLargestRectangleSteps([2, 1, 5, 6, 2, 3]);
      case 'stackViaQueues':
        return generateStackViaQueuesSteps(
          currSvqMain.length ? currSvqMain : [10, 20, 30],
          currSvqAux,
          'push',
          42
        ).steps;
      case 'circularDeque':
        return generateCircularDequeSteps(
          currCd.some((e) => e !== null) ? currCd : [10, 20, null, null, null],
          currCdFront >= 0 ? currCdFront : 0,
          currCdRear >= 0 ? currCdRear : 1,
          CD_CAPACITY,
          'insertLast',
          30
        ).steps;
      case 'firstNonRepeating':
        return generateFirstNonRepeatingSteps('aabc');
      case 'movingAverage':
        return generateMovingAverageSteps([1, 10, 3, 5], 3);
      case 'taskScheduler':
        return generateTaskSchedulerSteps(['A', 'A', 'A', 'B', 'B', 'B'], 2);
      case 'rottingOranges':
        return generateRottingOrangesSteps([[2, 1, 1], [1, 1, 0], [0, 1, 1]]);
      case 'dota2Senate':
        return generateDota2SenateSteps('RDDR');
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
    const sampleSvqMain = [10, 20, 30];
    const sampleCd: (number | string | null)[] = [10, 20, null, null, null];

    setStackData(sampleStack);
    setQueueData(sampleQueue);
    setCqElements(sampleCq);
    setCqFront(0);
    setCqRear(3);
    setMinMainStack(sampleMinMain);
    setMinAuxStack(sampleMinAux);
    setQvsIn(sampleQvsIn);
    setQvsOut(sampleQvsOut);
    setSvqMain(sampleSvqMain);
    setSvqAux([]);
    setCdElements(sampleCd);
    setCdFront(0);
    setCdRear(1);

    const steps = getCategoryDefaultSteps(
      category,
      sampleStack,
      sampleQueue,
      sampleCq,
      0,
      3,
      sampleMinMain,
      sampleMinAux,
      sampleQvsIn,
      sampleQvsOut,
      sampleSvqMain,
      [],
      sampleCd,
      0,
      1
    );
    setActiveSteps(steps);
    reset();
    play();
  };

  const handleRandomData = () => {
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Problem categories roll a fresh expression / array input so the
    // "Prove You Understand" transfer challenge always runs on unseen data.
    switch (category) {
      case 'validParentheses': {
        const pairs = ['()', '[]', '{}'];
        let expr = '';
        for (let i = 0; i < randInt(3, 5); i++) {
          const p = pairs[randInt(0, 2)];
          expr += Math.random() < 0.75 ? p : p[1] + p[0];
        }
        setInputValue(expr);
        setActiveSteps(generateValidParenthesesSteps(expr));
        break;
      }
      case 'minStack': {
        const main = Array.from({ length: randInt(3, 4) }, () => randInt(1, 30));
        const aux = main.map((_, i) => Math.min(...main.slice(0, i + 1)));
        const pushVal = randInt(1, 30);
        setMinMainStack(main);
        setMinAuxStack(aux);
        setInputValue(String(pushVal));
        setActiveSteps(generateMinStackPushSteps(main, aux, pushVal).steps);
        break;
      }
      case 'postfixEval': {
        const ops = ['+', '-', '*'];
        const nums = Array.from({ length: 3 }, () => randInt(2, 20));
        const expr = `${nums[0]} ${nums[1]} ${ops[randInt(0, 2)]} ${nums[2]} ${ops[randInt(0, 2)]}`;
        setInputValue(expr);
        setActiveSteps(generatePostfixEvalSteps(expr));
        break;
      }
      case 'dailyTemperatures': {
        const temps = Array.from({ length: randInt(6, 8) }, () => randInt(68, 85));
        setInputValue(temps.join(' '));
        setActiveSteps(generateDailyTemperaturesSteps(temps));
        break;
      }
      case 'simplifyPath': {
        const segs = ['a', 'b', 'c', '.', '..'];
        const path =
          '/' + ['a', 'b', 'c'][randInt(0, 2)] +
          '/' +
          Array.from({ length: randInt(2, 4) }, () => segs[randInt(0, 4)]).join('/') +
          '/';
        setInputValue(path);
        setActiveSteps(generateSimplifyPathSteps(path));
        break;
      }
      case 'removeAdjacentDuplicates': {
        let s = '';
        for (let i = 0; i < randInt(5, 8); i++) s += 'abc'[randInt(0, 2)];
        setInputValue(s);
        setActiveSteps(generateRemoveAdjacentDuplicatesSteps(s));
        break;
      }
      case 'basicCalculator': {
        const a = randInt(1, 9), b = randInt(1, 9), c = randInt(1, 9), d = randInt(1, 9);
        const variants = [
          `${a}+${b}-${c}`,
          `${a}-(${b}+${c})`,
          `${a}+(${b}-${c})`,
          `${a}-${b}+(${c}-${d})`,
          `(${a}+${b})-(${c}-${d})`,
        ];
        const expr = variants[randInt(0, variants.length - 1)];
        setInputValue(expr);
        setActiveSteps(generateBasicCalculatorSteps(expr));
        break;
      }
      case 'decodeString': {
        const randLetters = () => Array.from({ length: 2 }, () => 'abc'[randInt(0, 2)]).join('');
        const variants = [
          `${randInt(2, 3)}[${randLetters()}]`,
          `${randInt(2, 3)}[${randLetters()}]${randInt(2, 3)}[${randLetters()}]`,
          `${randInt(2, 3)}[${randLetters()}${randInt(2, 3)}[${randLetters()}]]`,
          `${randLetters()}${randInt(2, 3)}[${randLetters()}]`,
        ];
        const s = variants[randInt(0, variants.length - 1)];
        setInputValue(s);
        setActiveSteps(generateDecodeStringSteps(s));
        break;
      }
      case 'trappingRainWater': {
        const n = randInt(6, 8);
        const heights = Array.from(
          { length: n },
          (_, i) => (i === 0 || i === n - 1 ? randInt(3, 5) : randInt(0, 4))
        );
        setInputValue(heights.join(' '));
        setActiveSteps(generateTrappingRainWaterSteps(heights));
        break;
      }
      case 'largestRectangle': {
        const heights = Array.from({ length: randInt(5, 7) }, () => randInt(1, 6));
        setInputValue(heights.join(' '));
        setActiveSteps(generateLargestRectangleSteps(heights));
        break;
      }
      case 'queueViaStacks': {
        const inStack = Array.from({ length: randInt(2, 3) }, () => randInt(5, 60));
        const outStack = [randInt(5, 60)];
        const val = randInt(5, 60);
        setQvsIn(inStack);
        setQvsOut(outStack);
        setInputValue(String(val));
        setActiveSteps(generateQueueViaStacksSteps(inStack, outStack, 'enqueue', val).steps);
        break;
      }
      case 'stackViaQueues': {
        const main = Array.from({ length: randInt(2, 4) }, () => randInt(5, 60));
        const val = randInt(5, 60);
        setSvqMain(main);
        setSvqAux([]);
        setInputValue(String(val));
        setActiveSteps(generateStackViaQueuesSteps(main, [], 'push', val).steps);
        break;
      }
      case 'circularDeque': {
        const elems: (number | string | null)[] = [randInt(5, 60), randInt(5, 60), null, null, null];
        const op = Math.random() < 0.5 ? 'insertFront' : 'insertLast';
        const val = randInt(5, 60);
        const res = generateCircularDequeSteps(elems, 0, 1, CD_CAPACITY, op, val);
        setCdElements(res.newElements);
        setCdFront(res.newFront);
        setCdRear(res.newRear);
        setInputValue(String(val));
        setActiveSteps(res.steps);
        break;
      }
      case 'slidingWindow': {
        const nums = Array.from({ length: 8 }, () => randInt(-5, 10));
        setInputValue(nums.join(' '));
        setActiveSteps(generateSlidingWindowSteps(nums, 3));
        break;
      }
      case 'firstNonRepeating': {
        let stream = '';
        for (let i = 0; i < randInt(6, 8); i++) stream += 'abcd'[randInt(0, 3)];
        setInputValue(stream);
        setActiveSteps(generateFirstNonRepeatingSteps(stream));
        break;
      }
      case 'movingAverage': {
        const nums = Array.from({ length: 6 }, () => randInt(1, 20));
        setInputValue(nums.join(' '));
        setActiveSteps(generateMovingAverageSteps(nums, 3));
        break;
      }
      case 'taskScheduler': {
        const tasks = Array.from({ length: randInt(6, 8) }, () => 'ABC'[randInt(0, 2)]);
        setInputValue([...tasks, '2'].join(' '));
        setActiveSteps(generateTaskSchedulerSteps(tasks, 2));
        break;
      }
      case 'rottingOranges': {
        let grid: number[][];
        do {
          grid = Array.from({ length: 3 }, () =>
            Array.from({ length: 3 }, () => [0, 1, 1, 2][randInt(0, 3)])
          );
        } while (!grid.some((r) => r.includes(2)) || !grid.some((r) => r.includes(1)));
        setInputValue(grid.map((r) => r.join(' ')).join(';'));
        setActiveSteps(generateRottingOrangesSteps(grid));
        break;
      }
      case 'dota2Senate': {
        let senate = '';
        for (let i = 0; i < randInt(5, 8); i++) senate += Math.random() < 0.5 ? 'R' : 'D';
        setInputValue(senate);
        setActiveSteps(generateDota2SenateSteps(senate));
        break;
      }
      default: {
        // Core primitives keep the shared random structure roll
        const rndStack = Array.from({ length: 4 }, () => Math.floor(Math.random() * 85) + 10);
        const rndQueue = Array.from({ length: 4 }, () => Math.floor(Math.random() * 85) + 10);
        const rndCq = [rndStack[0], rndStack[1], rndStack[2], null, null, null];

        setStackData(rndStack);
        setQueueData(rndQueue);
        setCqElements(rndCq);
        setCqFront(0);
        setCqRear(2);

        setActiveSteps(getCategoryDefaultSteps(category, rndStack, rndQueue, rndCq, 0, 2));
        break;
      }
    }
    reset();
    play();
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     Fresh input rolled for the active problem, predicted cold.
     startChallenge() must fire in the same handler as the input
     change so the armed challenge survives the checkpoint reset. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    handleRandomData();
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
    setSvqMain([]);
    setSvqAux([]);
    setCdElements([null, null, null, null, null]);
    setCdFront(-1);
    setCdRear(-1);
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

      {category === 'basicCalculator' && (
        <button className="bst-btn btn-insert" onClick={handleBasicCalculator}>
          <CheckCircle2 size={14} />
          <span>Evaluate Expression</span>
        </button>
      )}

      {category === 'decodeString' && (
        <button className="bst-btn btn-insert" onClick={handleDecodeString}>
          <CheckCircle2 size={14} />
          <span>Decode String</span>
        </button>
      )}

      {category === 'trappingRainWater' && (
        <button className="bst-btn btn-insert" onClick={handleTrappingRainWater}>
          <CheckCircle2 size={14} />
          <span>Compute Trapped Water</span>
        </button>
      )}

      {category === 'largestRectangle' && (
        <button className="bst-btn btn-insert" onClick={handleLargestRectangle}>
          <CheckCircle2 size={14} />
          <span>Compute Max Area</span>
        </button>
      )}

      {category === 'stackViaQueues' && (
        <>
          <button className="bst-btn btn-insert" onClick={handleStackViaQueuesPush}>
            <Plus size={14} />
            <span>Push (Drain)</span>
          </button>
          <button className="bst-btn btn-search" onClick={handleStackViaQueuesPop}>
            <span>Pop</span>
          </button>
        </>
      )}

      {category === 'circularDeque' && (
        <>
          <button className="bst-btn btn-insert" onClick={() => handleCircularDeque('insertFront')}>
            <Plus size={14} />
            <span>Insert Front</span>
          </button>
          <button className="bst-btn btn-insert" onClick={() => handleCircularDeque('insertLast')}>
            <Plus size={14} />
            <span>Insert Last</span>
          </button>
          <button className="bst-btn btn-search" onClick={() => handleCircularDeque('deleteFront')}>
            <span>Delete Front</span>
          </button>
          <button className="bst-btn btn-search" onClick={() => handleCircularDeque('deleteLast')}>
            <span>Delete Last</span>
          </button>
        </>
      )}

      {category === 'firstNonRepeating' && (
        <button className="bst-btn btn-insert" onClick={handleFirstNonRepeating}>
          <CheckCircle2 size={14} />
          <span>Process Stream</span>
        </button>
      )}

      {category === 'movingAverage' && (
        <button className="bst-btn btn-insert" onClick={handleMovingAverage}>
          <CheckCircle2 size={14} />
          <span>Stream Averages</span>
        </button>
      )}

      {category === 'taskScheduler' && (
        <button className="bst-btn btn-insert" onClick={handleTaskScheduler}>
          <CheckCircle2 size={14} />
          <span>Run Scheduler</span>
        </button>
      )}

      {category === 'rottingOranges' && (
        <button className="bst-btn btn-insert" onClick={handleRottingOranges}>
          <CheckCircle2 size={14} />
          <span>Run BFS Rot</span>
        </button>
      )}

      {category === 'dota2Senate' && (
        <button className="bst-btn btn-insert" onClick={handleDota2Senate}>
          <CheckCircle2 size={14} />
          <span>Run Election</span>
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

  usePlaybackShortcuts({
    handlers: {
      onTogglePlay: isPlaying ? pause : play,
      onReset: reset,
      onStepForward: stepForward,
      onStepBack: stepBack,
      onStop: () => { pause(); reset(); },
      onResume: play,
    },
  });

  const renderFullscreenPlayerControls = () => (
    <div className="player-bar" style={{ margin: 0 }}>
      <div className="player-left">
        <span className="step-counter font-mono text-xs">
          Step {totalSteps > 0 ? currentStepIndex + 1 : 0} / {totalSteps}
        </span>
      </div>
      <div className="player-center">
        <div className="step-progress-bar">
          <div
            className="step-progress-fill"
            style={{ width: `${(currentStepIndex / Math.max(1, totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
      <div className="player-right" />
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

      <label className="predict-toggle-label" style={{ marginLeft: '0.5rem' }}>
        <HelpCircle size={16} />
        <span>Quiz Mode</span>
        <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
      </label>
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
          <div className="predict-mode-group flex items-center gap-2">
            <label className="predict-toggle-label">
              <HelpCircle size={16} />
              <span>Quiz Mode</span>
              <input
                type="checkbox"
                checked={quizEnabled}
                onChange={(e) => setQuizEnabled(e.target.checked)}
              />
            </label>

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
      </div>

      {/* Main Workspace Layout (Canvas + Code Debugger) */}
      <div className="sorting-workspace scene-workspace">
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

          <FloatingController
            isPlaying={isPlaying}
            canStepBack={currentStepIndex > 0}
            canStepForward={currentStepIndex < totalSteps - 1}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            onStepBack={stepBack}
            onStepForward={stepForward}
            onStop={() => { pause(); reset(); }}
            onResume={play}
            quizMode={quizEnabled}
          />
        </div>

        {/* Right Panel: Code Debugger + Explanation */}
        {showDebugger && (
          <>
            <div className="quiz-rail">
              <QuizDock
                session={quizSession}
                cadence={cadence}
                onCadenceChange={setCadence}
                onEnableQuiz={() => setQuizEnabled(true)}
                onProveIt={handleProveIt}
              />
            </div>
            <div className="bottom-row">
              <StackQueueCodePanel
                category={category}
                activeLine={currentStep?.codeLine ?? 1}
              />

              <ExplanationPanel
                description={maskNarration(currentStep?.description ?? 'Run an operation to observe step-by-step execution.', quizSession.phase)}
                steps={activeSteps}
                currentStepIndex={currentStepIndex}
              />
            </div>
          </>
        )}
      </div>

      {/* FullScreen Canvas Modal matching BST */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Stack & Queue Studio | ${(PROBLEMS_LIST.find((p) => p.id === category)?.name ?? 'Visualizer').toUpperCase()}`}
        subtitle="Interactive LIFO / FIFO Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderFullscreenPlayerControls()}

        floatingControls={
          <FloatingController
            isPlaying={isPlaying}
            canStepBack={currentStepIndex > 0}
            canStepForward={currentStepIndex < totalSteps - 1}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            onStepBack={stepBack}
            onStepForward={stepForward}
            onStop={() => { pause(); reset(); }}
            onResume={play}
            quizMode={quizEnabled}
          />
        }
      >
        {renderCanvas()}
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="stackQueue" activeTopic={category} />

    </div>
  );
};
