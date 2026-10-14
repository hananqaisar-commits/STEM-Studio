import React, {useState, useMemo, useEffect} from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEOHead } from '../../components/common/SEOHead';
import { getSEOForRoute } from '../../data/seoMetadata';
import {
  Link2,
  Plus,
  Trash2,
  RotateCcw,
  Maximize2,
  Sparkles,
  Shuffle,
  RefreshCw,
  GitCommit,
  GitBranch,
  Layers,
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildLinkedListCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';
import {
  createInitialNodes,
  generateInsertHeadSteps,
  generateInsertTailSteps,
  generateInsertAtIndexSteps,
  generateDeleteHeadSteps,
  generateDeleteAtIndexSteps,
  generateReverseSteps,
  generateCycleDetectionSteps,
  generateMiddleNodeSteps,
  generateJosephusSteps,
  generateReverseSublistSteps,
  generateReverseHalfSteps,
  generateReverseFromMiddleSteps,
  generateReverseKGroupSteps,
  generatePalindromeListSteps,
  generateSwapPairsSteps,
  generateMergeSortSteps,
  generateAddTwoNumbersSteps,
  generateRemoveNthFromEndSteps,
  generateSplitHalvesSteps,
  generateSplitKPartsSteps,
  generateMergeKSortedSteps,
  generateLRUCacheSteps,
  type LRUOperation,
  type LinkedListStructureType,
  type ListNodeItem,
  type LinkedListCategory,
  type LinkedListStep,
} from './linkedListEngine';
import { LinkedListRenderer } from './LinkedListRenderer';
import { LINKED_LIST_SNIPPETS } from './linkedListSnippets';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { ResizablePanelRow } from '../../components/layout/ResizablePanelRow';
import { ResizableWorkspaceHandle } from '../../components/layout/ResizableWorkspaceHandle';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import './LinkedList.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';
import { parseNumberList } from '../../utils/batchInputParser';
import { useTutorContext } from '../../contexts/TutorContext';
import { StateSummaryBar, type StateSummaryItem } from '../../components/common/StateSummaryBar';
import { DefinitionCardPanel, type DefinitionItem } from '../../components/common/DefinitionCardPanel';
import { traceRemoveNthFromEndSource } from './linkedListCodeTrace';
import type { CustomLanguage } from '../../engine/customCodeTemplates';

interface AlgorithmMeta {
  id: LinkedListCategory;
  name: string;
  group: 'Singly' | 'Doubly' | 'Circular' | 'Two-Pointers' | 'Classic Problems';
  description: string;
}

const ALGORITHMS_LIST: AlgorithmMeta[] = [
  { id: 'singly', name: 'Singly Linked List', group: 'Singly', description: 'Insert, delete, and traverse standard forward-linked list' },
  { id: 'reverse', name: 'Reverse Linked List', group: 'Singly', description: 'Classic 3-pointer (prev, curr, next) pointer reversal' },
  { id: 'middleNode', name: 'Find Middle Node', group: 'Two-Pointers', description: 'Fast & slow pointer technique to locate center element' },
  { id: 'detectCycle', name: 'Cycle Detection (Floyd)', group: 'Two-Pointers', description: "Floyd's Tortoise & Hare meeting point and cycle origin" },
  { id: 'josephus', name: 'Josephus Problem', group: 'Circular', description: 'Count around a circular list, remove every kth node, and find the survivor' },
  { id: 'reverseSublist', name: 'Reverse Sublist (L–R)', group: 'Classic Problems', description: 'Reverse only an inclusive 1-based range while preserving the prefix and suffix' },
  { id: 'reverseHalf', name: 'Reverse a Half', group: 'Classic Problems', description: 'Choose and reverse the first or second half; the middle belongs to the first half' },
  { id: 'reverseFromMiddle', name: 'Reverse from Middle', group: 'Classic Problems', description: 'Reverse from the midpoint through the tail; even lengths use the upper middle node' },
  { id: 'reverseKGroup', name: 'Reverse in K Groups', group: 'Classic Problems', description: 'Reverse complete groups of k nodes and leave a short final group unchanged' },
  { id: 'palindrome', name: 'Palindrome Check', group: 'Classic Problems', description: 'Reverse the second half, compare symmetric nodes, then restore the original list' },
  { id: 'swapPairs', name: 'Swap Nodes in Pairs', group: 'Classic Problems', description: 'Swap adjacent node links in place without swapping their values' },
  { id: 'mergeSort', name: 'Merge Sort a List', group: 'Classic Problems', description: 'Stable bottom-up merge sort with O(n log n) time' },
  { id: 'addTwoNumbers', name: 'Add Two Numbers', group: 'Classic Problems', description: 'Add reverse-order digit lists with a carry at each position' },
  { id: 'removeNthFromEnd', name: 'Remove Nth from End', group: 'Classic Problems', description: 'Keep a fixed two-pointer gap to remove the nth node from the tail' },
  { id: 'splitHalves', name: 'Split into Two Halves', group: 'Classic Problems', description: 'Split the list into two independent lanes; the first gets the middle when odd' },
  { id: 'splitKParts', name: 'Split into K Parts', group: 'Classic Problems', description: 'Split a list into balanced consecutive parts, with earlier parts receiving extra nodes' },
  { id: 'mergeKSorted', name: 'Merge K Sorted Lists', group: 'Classic Problems', description: 'Merge any number of sorted inputs by repeatedly selecting the smallest current head' },
  { id: 'lruCache', name: 'LRU Cache', group: 'Classic Problems', description: 'Trace cache hits, key lookup, recency movement, and least-recently-used eviction' },
  { id: 'doubly', name: 'Doubly Linked List', group: 'Doubly', description: 'Bidirectional nodes with forward and backward pointers' },
  { id: 'circular', name: 'Circular Linked List', group: 'Circular', description: 'Ring-buffered list where tail.next loops to head' },
  { id: 'doublyCircular', name: 'Doubly Circular Linked List', group: 'Circular', description: 'Bidirectional ring with head.prev and tail.next connected' },
];

const isClassicProblem = (category: LinkedListCategory) =>
  ['reverseSublist', 'reverseHalf', 'reverseFromMiddle', 'reverseKGroup', 'palindrome', 'swapPairs', 'mergeSort', 'addTwoNumbers', 'removeNthFromEnd', 'splitHalves', 'splitKParts', 'mergeKSorted', 'lruCache'].includes(category);

const parseListValues = (input: string): (number | string)[] => input
  .split(/[\s,;]+/)
  .map((part) => part.trim())
  .filter(Boolean)
  .map((part) => Number.isFinite(Number(part)) ? Number(part) : part);

function parseLRUOperations(input: string): LRUOperation[] | null {
  const entries = input.split(/[;\n]+/).map((entry) => entry.trim()).filter(Boolean);
  if (!entries.length || entries.length > 24) return null;
  const operations: LRUOperation[] = [];
  for (const entry of entries) {
    const getMatch = entry.match(/^get\s*\(([^()]+)\)$/i);
    const putMatch = entry.match(/^put\s*\(([^(),]+)\s*,\s*([^()]+)\)$/i);
    if (getMatch?.[1]?.trim()) {
      operations.push({ type: 'get', key: getMatch[1].trim() });
    } else if (putMatch?.[1]?.trim() && putMatch[2]?.trim()) {
      operations.push({ type: 'put', key: putMatch[1].trim(), value: putMatch[2].trim() });
    } else {
      return null;
    }
  }
  return operations;
}

const getStructureType = (category: LinkedListCategory): LinkedListStructureType => {
  if (category === 'josephus') return 'circular';
  if (category === 'doubly' || category === 'doublyCircular' || category === 'circular') return category;
  return 'singly';
};

export const LinkedListPage: React.FC = () => {
  const { setTutorContext } = useTutorContext();
  const [category, setCategory] = useState<LinkedListCategory>('singly');
  const structureType = getStructureType(category);
  const [searchParams] = useSearchParams();

  const [inputValue, setInputValue] = useState<string>('10, 20, 30, 40');
  const [inputError, setInputError] = useState<string | null>(null);
  const [positionOperation, setPositionOperation] = useState<'insertAt' | 'insertMiddle' | 'insertBefore' | 'insertAfter' | 'deleteAt' | 'deleteMiddle' | 'deleteBefore' | 'deleteAfter'>('insertAt');
  const [operationValue, setOperationValue] = useState('25');
  const [operationIndex, setOperationIndex] = useState('1');
  const [operationTarget, setOperationTarget] = useState('30');
  const [josephusStep, setJosephusStep] = useState('3');
  const [secondListInput, setSecondListInput] = useState('5, 6, 4');
  const [mergeKInputs, setMergeKInputs] = useState(['2, 5, 8', '3, 6, 9']);
  const [rangeLeft, setRangeLeft] = useState('2');
  const [rangeRight, setRangeRight] = useState('4');
  const [groupSize, setGroupSize] = useState('2');
  const [selectedHalf, setSelectedHalf] = useState<'first' | 'second'>('first');
  const [nthFromEnd, setNthFromEnd] = useState('2');
  const [partCount, setPartCount] = useState('3');
  const [lruCapacity, setLruCapacity] = useState('2');
  const [lruOperationsInput, setLruOperationsInput] = useState('put(1,A); put(2,B); get(1); put(3,C); get(2)');

  // Interactive & Quiz Modes
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [showDefinitions, setShowDefinitions] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active step dataset
  const [activeSteps, setActiveSteps] = useState<LinkedListStep[]>([]);
  const [baseNodes, setBaseNodes] = useState<ListNodeItem[]>(() =>
    createInitialNodes([10, 20, 30, 40], 'singly')
  );

  useEffect(() => {
    const topic = searchParams.get('topic') as LinkedListCategory | null;
    if (!topic || !ALGORITHMS_LIST.some((algorithm) => algorithm.id === topic)) return;

    const kind = getStructureType(topic);
    const values = topic === 'doubly' || topic === 'circular' || topic === 'doublyCircular'
      ? [12, 24, 36, 48]
      : topic === 'josephus'
      ? [1, 2, 3, 4, 5, 6, 7]
      : topic === 'reverse'
      ? [1, 2, 3, 4, 5]
      : topic === 'middleNode'
      ? [10, 20, 30, 40, 50, 60]
      : topic === 'detectCycle'
      ? [10, 20, 30, 40, 50]
      : topic === 'addTwoNumbers'
      ? [2, 4, 3]
      : topic === 'mergeKSorted'
      ? [1, 4, 7]
      : topic === 'mergeSort'
      ? [4, 2, 1, 3, 5]
      : topic === 'lruCache'
      ? [1, 2]
      : topic === 'palindrome'
      ? [1, 2, 3, 2, 1]
      : [10, 20, 30, 40];
    const nodes = createInitialNodes(values, kind, topic === 'detectCycle' ? 2 : -1);
    setCategory(topic);
    setBaseNodes(topic === 'lruCache' ? [] : nodes);
    if (isClassicProblem(topic)) {
      setInputValue(values.join(', '));
      setSecondListInput(topic === 'addTwoNumbers' ? '5, 6, 4' : '2, 5, 8');
      setMergeKInputs(['2, 5, 8', '3, 6, 9']);
      setRangeLeft('2');
      setRangeRight(String(Math.min(4, values.length)));
      setGroupSize('2');
      setNthFromEnd('2');
      setPartCount('3');
      setLruCapacity('2');
      setLruOperationsInput('put(1,A); put(2,B); get(1); put(3,C); get(2)');
    }
    if (topic === 'addTwoNumbers') setSecondListInput('5, 6, 4');
    if (topic === 'mergeKSorted') {
      setMergeKInputs(['2, 5, 8', '3, 6, 9']);
    }
    if (topic === 'josephus') {
      setInputValue(values.join(', '));
      setJosephusStep('3');
    }
    setActiveSteps(
      topic === 'reverse'
        ? generateReverseSteps(nodes)
        : topic === 'middleNode'
        ? generateMiddleNodeSteps(nodes)
        : topic === 'detectCycle'
        ? generateCycleDetectionSteps(nodes, 2)
        : topic === 'josephus'
        ? generateJosephusSteps(nodes, 3)
        : []
    );
  }, [searchParams]);

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
    seekTo,
  } = useStepPlayer<LinkedListStep>({ steps: activeSteps });

  const summaryItems: StateSummaryItem[] = useMemo(() => {
    const nodes = currentStep ? currentStep.nodes : baseNodes;
    const cacheLane = currentStep?.lanes?.find((lane) => lane.kind === 'doublyList');
    const outputLane = currentStep?.lanes?.find((lane) => lane.label.startsWith('Merged output'));
    const firstLaneNodes = cacheLane?.nodes ?? currentStep?.lanes?.[0]?.nodes;
    const lastLaneNodes = cacheLane?.nodes ?? currentStep?.lanes?.[currentStep.lanes.length - 1]?.nodes;
    const structureSize = cacheLane?.nodes.length ?? outputLane?.nodes.length ?? nodes.length;
    const headVal = firstLaneNodes?.length ? firstLaneNodes[0].value : nodes.length > 0 ? nodes[0].value : 'NULL';
    const tailVal = lastLaneNodes?.length ? lastLaneNodes[lastLaneNodes.length - 1].value : nodes.length > 0 ? nodes[nodes.length - 1].value : 'NULL';
    const ruleMap: Record<string, string> = {
      singly: 'Singly Linked',
      doubly: 'Doubly Linked',
      circular: 'Circular Ring',
      doublyCircular: 'Doubly Circular Ring',
      detectCycle: 'Floyd Cycle',
      reverse: '3-Pointer Reverse',
      middleNode: 'Fast/Slow Pointer',
      josephus: 'Circular Elimination',
      reverseSublist: 'Inclusive Range Reverse',
      reverseHalf: 'Selected Half Reverse',
      reverseFromMiddle: 'Reverse from Middle to Tail',
      reverseKGroup: 'Complete K-Group Reverse',
      palindrome: 'Symmetric Node Comparison',
      swapPairs: 'Link Pair Swap',
      mergeSort: 'Stable Merge Sort',
      addTwoNumbers: 'Digit Carry Addition',
      removeNthFromEnd: 'Two-Pointer Gap',
      splitHalves: 'Two-List Split',
      mergeKSorted: 'K-Way Head Selection',
    };
    return [
      { key: 'HEAD', value: headVal },
      { key: 'TAIL', value: tailVal },
      { key: 'Size', value: structureSize },
      { key: 'Rule', value: ruleMap[category] || 'Singly Linked' },
    ];
  }, [currentStep, baseNodes, category]);

  const definitions: DefinitionItem[] = useMemo(
    () => [
      { term: 'NODE', explanation: structureType === 'doubly' || structureType === 'doublyCircular' ? 'Element containing data plus next and previous pointer links.' : 'Element containing data value and next pointer link.' },
      { term: 'POINTER', explanation: 'Reference storing target node location.' },
      { term: 'HEAD / TAIL', explanation: structureType === 'circular' || structureType === 'doublyCircular' ? 'Head is the entry point; the tail links back to the head to close the ring.' : 'Head is the first node; the tail marks the end of the chain.' },
      { term: 'NULL', explanation: structureType === 'circular' || structureType === 'doublyCircular' ? 'The ring has no null tail; the last node links back to the head.' : 'Explicit marker denoting the end of a linear chain.' },
      { term: 'REVERSAL', explanation: 'Pointer mutation technique reversing link direction in-place.' },
    ],
    [structureType]
  );

  // Publish active context to Octa AI Tutor
  useEffect(() => {
    const algObj = ALGORITHMS_LIST.find((a) => a.id === category);

    setTutorContext({
      algorithmName: algObj?.name || category,
      algorithmId: category,
      category: 'linkedList',
      currentStepDescription: currentStep?.explanation || '',
      currentStepIndex,
      totalSteps,
      currentStep,
      steps: activeSteps,
      play,
      pause,
      stepForward,
      reset,
      setShowDebugger,
      onLaunchQuiz: () => setQuizEnabled(true),
    });
  }, [category, currentStepIndex, totalSteps, currentStep, activeSteps, setTutorContext, play, pause, stepForward, reset]);

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

  // Build quiz checkpoints from the current active steps
  const quizCheckpoints = useMemo(
    () => buildLinkedListCheckpoints(activeSteps, category),
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
    module: 'linkedList',
    algorithmId: category,
    revisionData: buildRevisionData(category),
  });

  const runPastedRemoveNthFromEnd = (code: string, language: CustomLanguage) => {
    const runNodes = createInitialNodes(parseListValues(inputValue), 'singly');
    const trace = traceRemoveNthFromEndSource(code, language, runNodes, Number(nthFromEnd));
    if (!trace.error) {
      setInputError(null);
      setBaseNodes(runNodes);
      setActiveSteps(trace.steps);
      reset();
      quizSession.resetSession();
      play();
    }
    return trace;
  };

  // Handle Category Switching
  const handleSelectCategory = (cat: LinkedListCategory) => {
    setCategory(cat);
    reset();
    quizSession.resetSession();
    setInputError(null);

    if (cat === 'doubly') {
      const dNodes = createInitialNodes([15, 25, 35, 45], 'doubly');
      setBaseNodes(dNodes);
      setActiveSteps([]);
    } else if (cat === 'circular') {
      const cNodes = createInitialNodes([12, 24, 36, 48], 'circular');
      setBaseNodes(cNodes);
      setActiveSteps([]);
    } else if (cat === 'doublyCircular') {
      const dcNodes = createInitialNodes([12, 24, 36, 48], 'doublyCircular');
      setBaseNodes(dcNodes);
      setActiveSteps([]);
    } else if (cat === 'detectCycle') {
      const cycleNodes = createInitialNodes([10, 20, 30, 40, 50], 'singly', 2);
      setBaseNodes(cycleNodes);
      const steps = generateCycleDetectionSteps(cycleNodes, 2);
      setActiveSteps(steps);
    } else if (cat === 'reverse') {
      const rNodes = createInitialNodes([1, 2, 3, 4, 5], 'singly');
      setBaseNodes(rNodes);
      const steps = generateReverseSteps(rNodes);
      setActiveSteps(steps);
    } else if (cat === 'middleNode') {
      const mNodes = createInitialNodes([10, 20, 30, 40, 50, 60], 'singly');
      setBaseNodes(mNodes);
      const steps = generateMiddleNodeSteps(mNodes);
      setActiveSteps(steps);
    } else if (cat === 'josephus') {
      const values = [1, 2, 3, 4, 5, 6, 7];
      const jNodes = createInitialNodes(values, 'circular');
      setBaseNodes(jNodes);
      setInputValue(values.join(', '));
      setJosephusStep('3');
      setActiveSteps([]);
    } else if (isClassicProblem(cat)) {
      const sampleValues = cat === 'addTwoNumbers'
        ? [2, 4, 3]
        : cat === 'palindrome'
        ? [1, 2, 3, 2, 1]
        : cat === 'mergeKSorted'
        ? [1, 4, 7]
        : cat === 'mergeSort'
        ? [4, 2, 1, 3, 5]
        : cat === 'lruCache'
        ? [1, 2]
        : [10, 20, 30, 40, 50];
      const nodes = createInitialNodes(sampleValues, 'singly');
      setBaseNodes(cat === 'lruCache' ? [] : nodes);
      setInputValue(sampleValues.join(', '));
      setActiveSteps([]);
      setSecondListInput(cat === 'addTwoNumbers' ? '5, 6, 4' : '2, 5, 8');
      setMergeKInputs(['2, 5, 8', '3, 6, 9']);
      setRangeLeft('2');
      setRangeRight(String(Math.min(4, sampleValues.length)));
      setGroupSize('2');
      setNthFromEnd('2');
      setPartCount('3');
      setLruCapacity('2');
      setLruOperationsInput('put(1,A); put(2,B); get(1); put(3,C); get(2)');
      setSelectedHalf('first');
    } else {
      const sNodes = createInitialNodes([10, 20, 30, 40], 'singly');
      setBaseNodes(sNodes);
      setActiveSteps([]);
    }
  };

  // ─── ACTION HANDLERS (UNIVERSAL BATCH SEQUENTIAL EXECUTION) ─────────────────

  const handleInsertHead = () => {
    const res = parseNumberList(inputValue);
    const rawValues: (number | string)[] = res.isValid && res.values.length > 0
      ? res.values
      : inputValue.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

    if (rawValues.length === 0) {
      setInputError('Please enter at least one value');
      return;
    }
    setInputError(null);

    let current = [...baseNodes];
    const allSteps: LinkedListStep[] = [];

    for (const val of rawValues) {
      const opSteps = generateInsertHeadSteps(current, val, structureType);
      allSteps.push(...opSteps);
      if (opSteps.length > 0) {
        current = opSteps[opSteps.length - 1].nodes;
      }
    }

    setBaseNodes(current);
    setActiveSteps(allSteps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleInsertTail = () => {
    const res = parseNumberList(inputValue);
    const rawValues: (number | string)[] = res.isValid && res.values.length > 0
      ? res.values
      : inputValue.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

    if (rawValues.length === 0) {
      setInputError('Please enter at least one value');
      return;
    }
    setInputError(null);

    let current = [...baseNodes];
    const allSteps: LinkedListStep[] = [];

    for (const val of rawValues) {
      const opSteps = generateInsertTailSteps(current, val, structureType);
      allSteps.push(...opSteps);
      if (opSteps.length > 0) {
        current = opSteps[opSteps.length - 1].nodes;
      }
    }

    setBaseNodes(current);
    setActiveSteps(allSteps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleBuildList = () => {
    const res = parseNumberList(inputValue);
    const rawValues: (number | string)[] = res.isValid && res.values.length > 0
      ? res.values
      : inputValue.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

    if (rawValues.length === 0) {
      setInputError('Please enter at least one value');
      return;
    }
    setInputError(null);

    let current: ListNodeItem[] = [];
    const allSteps: LinkedListStep[] = [];

    for (const val of rawValues) {
      const opSteps = generateInsertTailSteps(current, val, structureType);
      allSteps.push(...opSteps);
      if (opSteps.length > 0) {
        current = opSteps[opSteps.length - 1].nodes;
      }
    }

    setBaseNodes(current);
    setActiveSteps(allSteps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleDeleteHead = () => {
    const steps = generateDeleteHeadSteps(baseNodes, structureType);
    setActiveSteps(steps);
    if (steps.length > 0) setBaseNodes(steps[steps.length - 1].nodes);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleReverse = () => {
    const steps = generateReverseSteps(baseNodes, structureType);
    setActiveSteps(steps);
    if (steps.length > 0) setBaseNodes(steps[steps.length - 1].nodes);
    reset();
    quizSession.resetSession();
    play();
  };

  const handlePositionOperation = () => {
    const inserts = positionOperation.startsWith('insert');
    const middle = positionOperation.endsWith('Middle');
    let index: number;

    if (middle) {
      index = inserts ? Math.floor(baseNodes.length / 2) : Math.floor((baseNodes.length - 1) / 2);
    } else if (positionOperation.endsWith('Before') || positionOperation.endsWith('After')) {
      const targetIndex = baseNodes.findIndex((node) => String(node.value) === operationTarget.trim());
      if (targetIndex < 0) {
        setInputError(`Value ${operationTarget || '(empty)'} is not in the list`);
        return;
      }
      index = targetIndex + (positionOperation.endsWith('After') ? 1 : 0);
      if (!inserts && positionOperation.endsWith('Before')) index = targetIndex - 1;
      if (!inserts && positionOperation.endsWith('After')) index = targetIndex + 1;
    } else {
      index = Number(operationIndex);
      if (!Number.isInteger(index)) {
        setInputError('Enter a whole-number, zero-based index');
        return;
      }
    }

    if (inserts && !operationValue.trim()) {
      setInputError('Enter a value to insert');
      return;
    }
    if (inserts && (index < 0 || index > baseNodes.length)) {
      setInputError(`Insert index must be between 0 and ${baseNodes.length}`);
      return;
    }
    if (!inserts && (index < 0 || index >= baseNodes.length)) {
      setInputError('There is no node at that position to delete');
      return;
    }

    const steps = inserts
      ? generateInsertAtIndexSteps(baseNodes, operationValue.trim(), index, structureType)
      : generateDeleteAtIndexSteps(baseNodes, index, structureType);
    if (steps.length === 0) {
      setInputError('The list is empty');
      return;
    }
    setInputError(null);
    setBaseNodes(steps[steps.length - 1].nodes);
    setActiveSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleCycleDetect = () => {
    const cycleIndex = structureType === 'singly' ? 2 : 0;
    const cycleNodes = createInitialNodes(
      baseNodes.map((n) => n.value),
      structureType,
      structureType === 'singly' ? 2 : -1
    );
    const steps = generateCycleDetectionSteps(cycleNodes, cycleIndex, structureType);
    setActiveSteps(steps);
  };

  const handleFindMiddle = () => {
    const steps = generateMiddleNodeSteps(baseNodes, structureType);
    setActiveSteps(steps);
  };

  const handleRunJosephus = () => {
    const parsed = parseNumberList(inputValue);
    const values: (number | string)[] = parsed.isValid && parsed.values.length > 0
      ? parsed.values
      : inputValue.split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean);
    const stepSize = Number(josephusStep);

    if (values.length === 0) {
      setInputError('Enter at least one list value');
      return;
    }
    if (!Number.isInteger(stepSize) || stepSize < 1 || stepSize > 50) {
      setInputError('Enter a whole-number step size from 1 to 50');
      return;
    }

    const ring = createInitialNodes(values, 'circular');
    const steps = generateJosephusSteps(ring, stepSize);
    if (steps.length === 0) {
      setInputError('Build a non-empty circular list first');
      return;
    }

    setInputValue(values.join(', '));
    setInputError(null);
    setBaseNodes(steps[steps.length - 1].nodes);
    setActiveSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleRunClassicProblem = () => {
    const values = parseListValues(inputValue);
    if (category !== 'lruCache' && !values.length) {
      setInputError('Enter at least one list value');
      return;
    }
    const numericValues = values.map(Number);
    const allNumeric = values.every((value) => Number.isFinite(Number(value)));
    const makeNodes = () => createInitialNodes(values, 'singly');
    let steps: LinkedListStep[] = [];
    let nextBaseNodes = category === 'lruCache' ? [] : makeNodes();

    if (category === 'lruCache') {
      const capacity = Number(lruCapacity);
      const operations = parseLRUOperations(lruOperationsInput);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
        setInputError('Cache capacity must be a whole number from 1 to 20');
        return;
      }
      if (!operations) {
        setInputError('Use one operation per line or semicolon, like put(1,A); get(1). Enter 1–24 operations.');
        return;
      }
      steps = generateLRUCacheSteps(operations, capacity);
    } else if (category === 'reverseSublist') {
      const left = Number(rangeLeft);
      const right = Number(rangeRight);
      if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right > values.length || left > right) {
        setInputError(`Enter a valid 1-based range with 1 ≤ L ≤ R ≤ ${values.length}`);
        return;
      }
      steps = generateReverseSublistSteps(nextBaseNodes, left, right);
    } else if (category === 'reverseHalf') {
      steps = generateReverseHalfSteps(nextBaseNodes, selectedHalf);
    } else if (category === 'reverseFromMiddle') {
      steps = generateReverseFromMiddleSteps(nextBaseNodes);
    } else if (category === 'reverseKGroup') {
      const k = Number(groupSize);
      if (!Number.isInteger(k) || k < 1 || k > values.length) {
        setInputError(`Group size k must be between 1 and ${values.length}`);
        return;
      }
      steps = generateReverseKGroupSteps(nextBaseNodes, k);
    } else if (category === 'palindrome') {
      steps = generatePalindromeListSteps(nextBaseNodes);
    } else if (category === 'swapPairs') {
      steps = generateSwapPairsSteps(nextBaseNodes);
    } else if (category === 'mergeSort') {
      if (!allNumeric) {
        setInputError('Merge sort needs numeric values so it can compare nodes in ascending order');
        return;
      }
      steps = generateMergeSortSteps(nextBaseNodes);
    } else if (category === 'removeNthFromEnd') {
      const n = Number(nthFromEnd);
      if (!Number.isInteger(n) || n < 1 || n > values.length) {
        setInputError(`n must be between 1 and ${values.length}`);
        return;
      }
      steps = generateRemoveNthFromEndSteps(nextBaseNodes, n);
    } else if (category === 'splitHalves') {
      steps = generateSplitHalvesSteps(nextBaseNodes);
    } else if (category === 'splitKParts') {
      const k = Number(partCount);
      if (!Number.isInteger(k) || k < 1 || k > 12) {
        setInputError('Choose a whole-number part count from 1 to 12');
        return;
      }
      steps = generateSplitKPartsSteps(nextBaseNodes, k);
    } else if (category === 'addTwoNumbers') {
      const digitsA = numericValues;
      const digitsB = parseListValues(secondListInput).map(Number);
      if (!allNumeric || !digitsB.length || !digitsA.every((digit) => Number.isInteger(digit) && digit >= 0 && digit <= 9) || !digitsB.every((digit) => Number.isInteger(digit) && digit >= 0 && digit <= 9)) {
        setInputError('Enter both numbers as comma-separated digits from 0 to 9, least-significant digit first');
        return;
      }
      steps = generateAddTwoNumbersSteps(digitsA, digitsB);
      nextBaseNodes = createInitialNodes(digitsA, 'singly');
    } else if (category === 'mergeKSorted') {
      const lists = [values, ...mergeKInputs.map(parseListValues)];
      if (lists.some((list) => !list.length || list.some((value) => !Number.isFinite(Number(value))))) {
        setInputError('Enter numeric values for every sorted list');
        return;
      }
      const sortedLists = lists.map((list) => list.map(Number));
      if (sortedLists.some((list) => list.some((value, index) => index > 0 && list[index - 1] > value))) {
        setInputError('Each input list must already be sorted in ascending order');
        return;
      }
      steps = generateMergeKSortedSteps(sortedLists);
    }

    if (!steps.length) {
      setInputError('This operation needs at least two nodes to show a meaningful trace');
      return;
    }
    setInputError(null);
    setBaseNodes(nextBaseNodes);
    setActiveSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleResetClassicInputs = () => {
    const values = category === 'addTwoNumbers'
      ? [2, 4, 3]
      : category === 'palindrome'
      ? [1, 2, 3, 2, 1]
      : category === 'mergeKSorted'
      ? [1, 4, 7]
      : category === 'mergeSort'
      ? [4, 2, 1, 3, 5]
      : category === 'lruCache'
      ? [1, 2]
      : [10, 20, 30, 40, 50];
    setInputValue(values.join(', '));
    setSecondListInput(category === 'addTwoNumbers' ? '5, 6, 4' : '2, 5, 8');
    setMergeKInputs(['2, 5, 8', '3, 6, 9']);
    setRangeLeft('2');
    setRangeRight(String(Math.min(4, values.length)));
    setGroupSize('2');
    setNthFromEnd('2');
    setPartCount('3');
    setLruCapacity('2');
    setLruOperationsInput('put(1,A); put(2,B); get(1); put(3,C); get(2)');
    setSelectedHalf('first');
    setInputError(null);
    setBaseNodes(category === 'lruCache' ? [] : createInitialNodes(values, 'singly'));
    setActiveSteps([]);
    reset();
    quizSession.resetSession();
  };

  const handleRandomize = () => {
    const randomVals = Array.from({ length: 5 }, () => Math.floor(Math.random() * 90) + 10);
    const newNodes = createInitialNodes(randomVals, structureType);
    if (category === 'josephus') setInputValue(randomVals.join(', '));
    setBaseNodes(newNodes);
    setActiveSteps([]);
  };

  const handleResetList = () => {
    const values = category === 'josephus' ? [1, 2, 3, 4, 5, 6, 7] : [10, 20, 30, 40];
    const defaultNodes = createInitialNodes(values, structureType);
    if (category === 'josephus') {
      setInputValue(values.join(', '));
      setJosephusStep('3');
    }
    setBaseNodes(defaultNodes);
    setActiveSteps([]);
    reset();
  };

  const handleEmpty = () => {
    if (category === 'josephus') setInputValue('');
    setBaseNodes([]);
    setActiveSteps([]);
    reset();
    quizSession.resetSession();
  };

  const handleSample = () => {
    const values = category === 'josephus' ? [1, 2, 3, 4, 5, 6, 7] : [10, 20, 30, 40];
    const sampleNodes = createInitialNodes(values, structureType);
    if (category === 'josephus') {
      setInputValue(values.join(', '));
      setJosephusStep('3');
    }
    setBaseNodes(sampleNodes);
    setActiveSteps([]);
    reset();
    quizSession.resetSession();
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     Fresh node values AND the operation steps generated immediately —
     unlike handleRandomize, which empties the canvas until the student
     runs an operation (that second input change would disarm the
     challenge). */
  const handleProveIt = () => {
    quizSession.startChallenge();
    reset();
    const randomVals = Array.from(
      { length: category === 'middleNode' ? 5 : 4 },
      () => Math.floor(Math.random() * 90) + 10
    );
    if (category === 'reverse') {
      const nodes = createInitialNodes(randomVals, 'singly');
      setBaseNodes(nodes);
      setActiveSteps(generateReverseSteps(nodes));
    } else if (category === 'middleNode') {
      const nodes = createInitialNodes(randomVals, 'singly');
      setBaseNodes(nodes);
      setActiveSteps(generateMiddleNodeSteps(nodes));
    } else if (category === 'reverseFromMiddle') {
      const nodes = createInitialNodes(randomVals, 'singly');
      setBaseNodes(nodes);
      setActiveSteps(generateReverseFromMiddleSteps(nodes));
    } else if (category === 'reverseKGroup') {
      const nodes = createInitialNodes(randomVals, 'singly');
      setBaseNodes(nodes);
      setActiveSteps(generateReverseKGroupSteps(nodes, Number(groupSize)));
    } else if (category === 'palindrome') {
      const values = [randomVals[0], randomVals[1], randomVals[1], randomVals[0]];
      const nodes = createInitialNodes(values, 'singly');
      setBaseNodes(nodes);
      setInputValue(values.join(', '));
      setActiveSteps(generatePalindromeListSteps(nodes));
    } else if (category === 'detectCycle') {
      const nodes = createInitialNodes(randomVals, 'singly', 2);
      setBaseNodes(nodes);
      setActiveSteps(generateCycleDetectionSteps(nodes, 2));
    } else if (category === 'josephus') {
      const nodes = createInitialNodes(randomVals, 'circular');
      setInputValue(randomVals.join(', '));
      setBaseNodes(nodes);
      setActiveSteps(generateJosephusSteps(nodes, Number(josephusStep)));
    } else {
      const kind = structureType;
      const nodes = createInitialNodes(randomVals, kind);
      setBaseNodes(nodes);
      setActiveSteps(
        generateInsertHeadSteps(nodes, randomVals[0], kind)
      );
    }
  };

  const snippetKey = category === 'reverseSublist'
      ? 'reverse_sublist'
    : category === 'reverseHalf'
      ? 'reverse_half'
      : category === 'reverseFromMiddle'
      ? 'reverse_from_middle'
      : category === 'reverseKGroup'
      ? 'reverse_k_group'
      : category === 'palindrome'
      ? 'palindrome'
      : category === 'swapPairs'
      ? 'swap_pairs'
      : category === 'mergeSort'
      ? 'merge_sort'
      : category === 'addTwoNumbers'
      ? 'add_two_numbers'
      : category === 'removeNthFromEnd'
      ? 'remove_nth_from_end'
      : category === 'splitHalves'
      ? 'split_halves'
      : category === 'splitKParts'
      ? 'split_k_parts'
      : category === 'mergeKSorted'
      ? 'merge_k_sorted'
      : category === 'lruCache'
      ? 'lru_cache'
      : category === 'josephus'
      ? 'josephus'
      : category === 'reverse'
      ? 'reverse'
      : category === 'detectCycle'
      ? 'detect_cycle'
      : category === 'middleNode'
      ? 'middle_node'
      : category === 'doubly'
      ? 'doubly'
      : category === 'circular'
      ? 'circular'
      : category === 'doublyCircular'
      ? 'doubly_circular'
      : category === 'singly' && positionOperation.startsWith('delete')
      ? 'position_delete'
      : category === 'singly' && positionOperation.startsWith('insert')
      ? 'position_insert'
      : 'singly_insert_head';

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
          {totalSteps > 0 && (
            <input
              type="range"
              min={0}
              max={Math.max(0, totalSteps - 1)}
              value={currentStepIndex}
              onChange={(e) => seekTo(parseInt(e.target.value))}
              className="timeline-scrubber"
              title="Scrub timeline"
            />
          )}
        </div>
      </div>
      <div className="player-right" />
    </div>
  );

  /* ── Shared toolbar controls ─────────────────────────────────────────
     Single source of truth for every input/button: rendered in the page
     toolbar AND passed to the fullscreen modal, so the two states can
     never drift out of sync. */
  const renderToolbarControls = () => {
    if (isClassicProblem(category)) {
      const valueLabel = category === 'addTwoNumbers'
        ? 'Number A digits:'
        : category === 'mergeKSorted'
        ? 'Sorted list 1:'
        : 'Values:';
      const inputPlaceholder = category === 'addTwoNumbers' ? '2, 4, 3' : category === 'mergeKSorted' ? '1, 4, 7' : '10, 20, 30, 40';
      const helpText: Partial<Record<LinkedListCategory, string>> = {
        reverseSublist: 'L and R are 1-based and inclusive. Example: L=2, R=4 reverses only positions 2 through 4.',
        reverseHalf: 'For an odd-sized list, the first half receives the middle node.',
        reverseFromMiddle: 'The midpoint is included. For even lengths, the upper of the two middle nodes starts the reversal.',
        reverseKGroup: 'Only complete groups are reversed. A shorter final group stays in order.',
        palindrome: 'Find the midpoint, reverse and compare the second half, then restore the original links.',
        swapPairs: 'Swaps node links; values stay attached to their original nodes.',
        mergeSort: 'Enter numeric values. The sort is stable and orders ascending.',
        addTwoNumbers: 'Digits are entered least-significant first. Example: 2,4,3 represents 342.',
        removeNthFromEnd: 'n=1 removes the tail; n equal to the list length removes the head.',
        splitHalves: 'The first half gets ceil(n/2) nodes; the second half gets the rest.',
        splitKParts: 'Parts stay consecutive and differ in size by at most one; earlier parts get any extra nodes. Empty parts are allowed when K > n.',
        mergeKSorted: 'Enter two or more ascending numeric lists. Add or remove input lists below.',
        lruCache: 'put(key,value) inserts or updates. get(key) is a hit or miss. Separate operations with semicolons or new lines.',
      };
      const renderListInput = (label: string, value: string, setValue: (next: string) => void, placeholder: string) => (
        <label className="ll-input-group" title={label}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px', fontWeight: 600 }}>{label}</span>
          <input
            type="text"
            className="ll-input"
            value={value}
            onChange={(event) => { setValue(event.target.value); if (inputError) setInputError(null); }}
            aria-label={label}
            placeholder={placeholder}
            style={{ width: '150px' }}
          />
        </label>
      );
      return (
        <>
          {category !== 'lruCache' && renderListInput(valueLabel, inputValue, setInputValue, inputPlaceholder)}
          {category === 'addTwoNumbers' && renderListInput('Number B digits:', secondListInput, setSecondListInput, '5, 6, 4')}
          {category === 'mergeKSorted' && <>
            {mergeKInputs.map((value, index) => (
              <div className="ll-input-group" key={`merge-list-input-${index}`}>
                {renderListInput(`Sorted list ${index + 2}:`, value, (next) => setMergeKInputs((current) => current.map((item, itemIndex) => itemIndex === index ? next : item)), index === 0 ? '2, 5, 8' : '3, 6, 9')}
                {mergeKInputs.length > 1 && <button type="button" className="ll-btn ll-btn-danger" aria-label={`Remove sorted list ${index + 2}`} title={`Remove sorted list ${index + 2}`} onClick={() => setMergeKInputs((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} /></button>}
              </div>
            ))}
            <button type="button" className="ll-btn ll-btn-secondary" disabled={mergeKInputs.length >= 7} title="Add another sorted input list (up to 8 total)" onClick={() => setMergeKInputs((current) => [...current, '0, 5, 10'])}><Plus size={14} /><span>Add list</span></button>
          </>}
          {category === 'reverseSublist' && <>
            <label className="ll-input-group"><span className="ll-position-help">L:</span><input className="ll-input" aria-label="Left position L, 1-based" type="number" min={1} value={rangeLeft} onChange={(event) => setRangeLeft(event.target.value)} style={{ width: '58px' }} /></label>
            <label className="ll-input-group"><span className="ll-position-help">R:</span><input className="ll-input" aria-label="Right position R, 1-based" type="number" min={1} value={rangeRight} onChange={(event) => setRangeRight(event.target.value)} style={{ width: '58px' }} /></label>
          </>}
          {category === 'reverseHalf' && <label className="ll-input-group"><span className="ll-position-help">Half:</span><select className="ll-input" aria-label="Half to reverse" value={selectedHalf} onChange={(event) => setSelectedHalf(event.target.value as 'first' | 'second')}><option value="first">First half</option><option value="second">Second half</option></select></label>}
          {category === 'reverseKGroup' && <label className="ll-input-group"><span className="ll-position-help">k:</span><input className="ll-input" aria-label="Group size k" type="number" min={1} value={groupSize} onChange={(event) => setGroupSize(event.target.value)} style={{ width: '58px' }} /></label>}
          {category === 'removeNthFromEnd' && <label className="ll-input-group"><span className="ll-position-help">n from end:</span><input className="ll-input" aria-label="Nth node from end" type="number" min={1} value={nthFromEnd} onChange={(event) => setNthFromEnd(event.target.value)} style={{ width: '58px' }} /></label>}
          {category === 'splitKParts' && <label className="ll-input-group"><span className="ll-position-help">Parts k:</span><input className="ll-input" aria-label="Number of parts k" type="number" min={1} max={12} value={partCount} onChange={(event) => setPartCount(event.target.value)} style={{ width: '64px' }} /></label>}
          {category === 'lruCache' && <>
            <label className="ll-input-group"><span className="ll-position-help">Capacity:</span><input className="ll-input" aria-label="LRU cache capacity" type="number" min={1} max={20} value={lruCapacity} onChange={(event) => setLruCapacity(event.target.value)} style={{ width: '64px' }} /></label>
            <label className="ll-input-group ll-lru-operation-group"><span className="ll-position-help">Operations:</span><textarea className="ll-input ll-lru-operations" aria-label="LRU cache operations" rows={2} value={lruOperationsInput} onChange={(event) => { setLruOperationsInput(event.target.value); if (inputError) setInputError(null); }} placeholder={'put(1,A); get(1); put(2,B)'} /></label>
          </>}
          <button className="ll-btn ll-btn-primary" onClick={handleRunClassicProblem}>
            <Sparkles size={14} /><span>Run visualization</span>
          </button>
          <button className="ll-btn ll-btn-secondary" onClick={handleResetClassicInputs} title="Restore the example inputs">
            <RotateCcw size={14} /><span>Reset sample</span>
          </button>
          <span className="ll-position-help">{helpText[category]}</span>
        </>
      );
    }

    if (category === 'josephus') {
      return (
        <>
          <div className="ll-input-group" title="Enter the values that make up the circular list">
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px', fontWeight: 600 }}>
              Values:
            </span>
            <input
              type="text"
              className="ll-input"
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                if (inputError) setInputError(null);
              }}
              aria-label="Josephus list values"
              placeholder="1, 2, 3, 4, 5, 6, 7"
              style={{ width: '160px' }}
            />
          </div>
          <label className="ll-input-group" title="The count restarts at the next node after each removal">
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px', fontWeight: 600 }}>
              k:
            </span>
            <input
              type="number"
              className="ll-input"
              min={1}
              max={50}
              value={josephusStep}
              onChange={(event) => {
                setJosephusStep(event.target.value);
                if (inputError) setInputError(null);
              }}
              aria-label="Josephus step size k"
              style={{ width: '48px' }}
            />
          </label>
          <button className="ll-btn ll-btn-primary" onClick={handleRunJosephus} title="Animate circular elimination until one node survives">
            <RefreshCw size={14} />
            <span>Run Josephus</span>
          </button>
          <button className="ll-btn ll-btn-secondary" onClick={handleResetList} title="Reset to the seven-node example">
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <div className="dataset-mode-selector" style={{ marginLeft: '0.5rem' }}>
            <button className="bst-btn btn-mode" onClick={handleEmpty} title="Empty list">
              <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleSample} title="Load the seven-node example">
              <Layers size={14} className="text-amber-400" /><span>Sample</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleRandomize} title="Create a random circle">
              <Shuffle size={14} className="text-emerald-400" /><span>Random</span>
            </button>
          </div>
          <span className="ll-position-help">Count starts at HEAD; each kth node leaves the circle, and counting resumes at its next node. For 1–7 with k=3, node 4 survives.</span>
        </>
      );
    }

    return (
      <>
      {/* Batch Custom Input */}
      <div className="ll-input-group" title="Enter comma-separated values (e.g. 10, 20, 30, 40)">
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px', fontWeight: 600 }}>
          Values:
        </span>
        <input
          type="text"
          className="ll-input"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (inputError) setInputError(null);
          }}
          placeholder="e.g. 10, 20, 30, 40"
          style={{ width: '160px' }}
        />
      </div>

      <button className="ll-btn ll-btn-primary" onClick={handleBuildList} title="Build complete list sequentially">
        <Sparkles size={14} />
        <span>Build List</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleInsertTail} title="Insert values at tail sequentially">
        <Plus size={14} />
        <span>Insert Tail</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleInsertHead} title="Insert values at head sequentially">
        <Plus size={14} />
        <span>Insert Head</span>
      </button>

      <button className="ll-btn ll-btn-danger" onClick={handleDeleteHead}>
        <Trash2 size={14} />
        <span>Delete Head</span>
      </button>

      <details className="ll-position-controls">
        <summary>Insert / delete at a position</summary>
        <div className="ll-position-controls-body">
          <label>
            Operation
            <select value={positionOperation} onChange={(e) => setPositionOperation(e.target.value as typeof positionOperation)}>
              <option value="insertAt">Insert at index</option>
              <option value="insertMiddle">Insert in middle</option>
              <option value="insertBefore">Insert before value</option>
              <option value="insertAfter">Insert after value</option>
              <option value="deleteAt">Delete at index</option>
              <option value="deleteMiddle">Delete middle</option>
              <option value="deleteBefore">Delete node before value</option>
              <option value="deleteAfter">Delete node after value</option>
            </select>
          </label>
          {positionOperation.startsWith('insert') && (
            <label>
              New value
              <input value={operationValue} onChange={(e) => setOperationValue(e.target.value)} aria-label="Value to insert" />
            </label>
          )}
          {(positionOperation === 'insertAt' || positionOperation === 'deleteAt') && (
            <label>
              Index (0-based)
              <input type="number" min={0} value={operationIndex} onChange={(e) => setOperationIndex(e.target.value)} />
            </label>
          )}
          {(positionOperation.endsWith('Before') || positionOperation.endsWith('After')) && (
            <label>
              Target value
              <input value={operationTarget} onChange={(e) => setOperationTarget(e.target.value)} />
            </label>
          )}
          <button className="ll-btn ll-btn-primary" onClick={handlePositionOperation}>
            Apply operation
          </button>
          <span className="ll-position-help">Indices start at 0. For even-sized lists, “middle” selects the left middle node. Before / after uses the first matching value.</span>
        </div>
      </details>

      <button className="ll-btn ll-btn-secondary" onClick={handleReverse}>
        <RotateCcw size={14} />
        <span>Reverse</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleCycleDetect}>
        <RefreshCw size={14} />
        <span>Detect Cycle</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleFindMiddle}>
        <Sparkles size={14} />
        <span>Find Mid</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleRandomize}>
        <Shuffle size={14} />
        <span>Random</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleResetList}>
        <RotateCcw size={14} />
        <span>Reset</span>
      </button>

      {/* dataset-mode-selector */}
      <div className="dataset-mode-selector" style={{ marginLeft: '0.5rem' }}>
        <button className="bst-btn btn-mode" onClick={handleEmpty} title="Empty">
          <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleSample} title="Sample">
          <Layers size={14} className="text-amber-400" /><span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random">
          <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
        </button>
      </div>
      </>
    );
  };

  return (
    <div className="linked-list-container">
      <SEOHead {...getSEOForRoute('/dashboard/linkedList')} />
      <VisualizerHeader
        icon={<Link2 size={22} />}
        title="Linked List Visualizer"
        subtitle="Interactive Pointer Manipulations, Reversals, Cycle Detection, & Josephus Elimination"
        items={ALGORITHMS_LIST.map((alg) => ({ id: alg.id, name: alg.name, description: alg.description, group: alg.group }))}
        activeId={category}
        onSelect={(id) => handleSelectCategory(id as LinkedListCategory)}
        placeholder="Search algorithm, operation, or concept..."
        actions={
          <VisualizerActions
            quizEnabled={quizEnabled}
            onToggleQuiz={() => setQuizEnabled((v) => !v)}
            debuggerVisible={showDebugger}
            onToggleDebugger={() => setShowDebugger((v) => !v)}
          >
            <button
              type="button"
              className="viz-action-btn"
              onClick={() => setIsFullScreenOpen(true)}
              title="Full Screen Canvas"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </VisualizerActions>
        }
      />



      {/* ─── ACTION TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="ll-toolbar">
        <div className="ll-toolbar-actions">
          {renderToolbarControls()}
        </div>
        {inputError && <span className="ll-input-error" role="alert">{inputError}</span>}
      </div>

      {/* ─── MAIN WORKSPACE ──────────────────────────────────────────────────── */}
      <div className="ll-workspace scene-workspace">
        <div className="renderer-section">
          <div className="ll-canvas-card" style={{ position: 'relative' }}>
            <div className="ll-canvas-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="ll-canvas-title">
                <Link2 size={16} className="text-accent" />
                <span>
                  {category.toUpperCase()} CANVAS {currentStep ? `• Phase: ${currentStep.phase}` : ''}
                </span>
              </div>
              <StateSummaryBar items={summaryItems} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DefinitionCardPanel
                  definitions={definitions}
                  visible={showDefinitions}
                  onToggle={() => setShowDefinitions((v) => !v)}
                />
                <button
                  className="bst-btn btn-fullscreen"
                  onClick={() => setIsFullScreenOpen(true)}
                  title="Full Screen Canvas"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            <LinkedListRenderer step={currentStep} nodes={baseNodes} listType={structureType} />
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

        {/* Right Column: Code & Explanation */}

        <div className="quiz-rail">
          <QuizDock
            session={quizSession}
            cadence={cadence}
            onCadenceChange={setCadence}
            onEnableQuiz={() => setQuizEnabled(true)}
            onProveIt={handleProveIt}
          />
        </div>
        <ResizableWorkspaceHandle storageKey="linkedList" />
        <ResizablePanelRow
          storageKey="linkedList"
          debuggerPanel={showDebugger ? (
            <MultiLanguageCodePanel
              algorithmKey={category}
              title="Linked List"
              categoryId="linkedList"
              topicId={category}
              snippets={LINKED_LIST_SNIPPETS[snippetKey]}
              onLinkedListCodeRun={category === 'removeNthFromEnd' ? runPastedRemoveNthFromEnd : undefined}
              activeLine={currentStep?.codeLine}
              variables={{
                nodes_count: currentStep ? currentStep.nodes.length : baseNodes.length,
                ...(currentStep?.pointers ?? {}),
              }}
            />
          ) : null}

          explanationPanel={<ExplanationPanel
            description={maskNarration(currentStep?.explanation || 'Run an operation to observe step-by-step execution.', quizSession.phase)}
            steps={activeSteps}
            currentStepIndex={currentStepIndex}
          />
          }
        />
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Linked List Visualizer | ${category.toUpperCase()}`}
        subtitle="Interactive Pointer Inspector"
        explanationPanel={<ExplanationPanel description={maskNarration(currentStep?.explanation || 'Run an operation to observe step-by-step execution.', quizSession.phase)} steps={activeSteps} currentStepIndex={currentStepIndex} />}
        toolbarControls={
          <div className="fs-floating-controls">
            {renderToolbarControls()}
            <VisualizerActions
              quizEnabled={quizEnabled}
              onToggleQuiz={() => setQuizEnabled((v) => !v)}
            />
          </div>
        }
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
        <LinkedListRenderer step={currentStep} nodes={baseNodes} listType={structureType} />
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="linkedList" activeTopic={category} />

    </div>
  );
};
