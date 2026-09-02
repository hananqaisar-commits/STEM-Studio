import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers, CheckCircle2, ArrowDown, GitCommit, Zap, Network, Sparkles, Trash2, Maximize2, Hash
} from 'lucide-react';
import { SortingRenderer } from './SortingRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { ResizablePanelRow } from '../../components/layout/ResizablePanelRow';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildSortingCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { generateBubbleSortSteps } from './algorithms/bubbleSort';
import { generateSelectionSortSteps } from './algorithms/selectionSort';
import { generateInsertionSortSteps } from './algorithms/insertionSort';
import { generateMergeSortSteps } from './algorithms/mergeSort';
import { generateQuickSortSteps } from './algorithms/quickSort';
import { generateHeapSortSteps } from './algorithms/heapSort';
import { generateShellSortSteps } from './algorithms/shellSort';
import { generateCountingSortSteps } from './algorithms/countingSort';
import { generateRadixSortSteps } from './algorithms/radixSort';
import { generateBucketSortSteps } from './algorithms/bucketSort';

import './Sorting.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';
import { parseNumberList } from '../../utils/batchInputParser';
import { executeCustomCode } from '../../api/customCode';
import { mapArrayExecutionToSteps, resultsMatch } from '../../engine/customCodeSteps';
import type { CustomStubLanguage } from '../../data/customCode';

type AlgorithmKey = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap' | 'shell' | 'counting' | 'radix' | 'bucket';
type ArrayPattern = 'random' | 'reversed' | 'nearlySorted';

interface AlgMeta {
  key: AlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'bubble', name: 'Bubble Sort', complexity: 'O(n²)', icon: <Layers size={14} /> },
  { key: 'selection', name: 'Selection Sort', complexity: 'O(n²)', icon: <CheckCircle2 size={14} /> },
  { key: 'insertion', name: 'Insertion Sort', complexity: 'O(n²)', icon: <ArrowDown size={14} /> },
  { key: 'merge', name: 'Merge Sort', complexity: 'O(n log n)', icon: <GitCommit size={14} /> },
  { key: 'quick', name: 'Quick Sort', complexity: 'O(n log n)', icon: <Zap size={14} /> },
  { key: 'heap', name: 'Heap Sort', complexity: 'O(n log n)', icon: <Network size={14} /> },
  { key: 'shell', name: 'Shell Sort', complexity: 'O(n log n)', icon: <Sparkles size={14} /> },
  { key: 'counting', name: 'Counting Sort', complexity: 'O(n+k)', icon: <Hash size={14} /> },
  { key: 'radix', name: 'Radix Sort', complexity: 'O(d·(n+k))', icon: <Hash size={14} /> },
  { key: 'bucket', name: 'Bucket Sort', complexity: 'O(n+k)', icon: <Hash size={14} /> },
];

function generateArray(size: number, pattern: ArrayPattern): number[] {
  const arr: number[] = [];
  for (let i = 0; i < size; i++) {
    arr.push(Math.floor(Math.random() * 85) + 15);
  }

  if (pattern === 'reversed') {
    arr.sort((a, b) => b - a);
  } else if (pattern === 'nearlySorted') {
    arr.sort((a, b) => a - b);
    if (size > 4) {
      const idx1 = Math.floor(Math.random() * (size / 2));
      const idx2 = Math.floor(Math.random() * (size / 2)) + Math.floor(size / 2);
      const temp = arr[idx1];
      arr[idx1] = arr[idx2];
      arr[idx2] = temp;
    }
  }

  return arr;
}

export const SortingPage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<AlgorithmKey>('bubble');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as AlgorithmKey);
    }
  }, [searchParams]);

  const [arraySize, setArraySize] = useState<number>(12);
  const [arrayPattern, setArrayPattern] = useState<ArrayPattern>('random');
  const [initialArray, setInitialArray] = useState<number[]>(() => generateArray(12, 'random'));
  const [rawArrayInput, setRawArrayInput] = useState<string>(() => generateArray(12, 'random').join(', '));

  // Debugger & Modal state
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [customizeModeEnabled, setCustomizeModeEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  // Custom code execution state
  const [customSteps, setCustomSteps] = useState<import('../../engine/types/Step').ArrayStep[] | null>(null);
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const [sandboxMessage, setSandboxMessage] = useState<string | null>(null);

  // Generate algorithm steps
  const executionData = useMemo(() => {
    switch (selectedAlg) {
      case 'bubble':
        return generateBubbleSortSteps(initialArray);
      case 'selection':
        return generateSelectionSortSteps(initialArray);
      case 'insertion':
        return generateInsertionSortSteps(initialArray);
      case 'merge':
        return generateMergeSortSteps(initialArray);
      case 'quick':
        return generateQuickSortSteps(initialArray);
      case 'heap':
        return generateHeapSortSteps(initialArray);
      case 'shell':
        return generateShellSortSteps(initialArray);
      case 'counting':
        return generateCountingSortSteps(initialArray);
      case 'radix':
        return generateRadixSortSteps(initialArray);
      case 'bucket':
        return generateBucketSortSteps(initialArray);
      default:
        return generateBubbleSortSteps(initialArray);
    }
  }, [selectedAlg, initialArray]);

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
    seekTo,
    setSpeed,
  } = useStepPlayer({ steps: customSteps ?? executionData.steps });

  // Build quiz checkpoints from the current execution steps
  const quizCheckpoints = useMemo(
    () => buildSortingCheckpoints(customSteps ?? executionData.steps, selectedAlg),
    [customSteps, executionData.steps, selectedAlg]
  );

  const quizSession = useQuizSession({
    enabled: quizEnabled,
    checkpoints: quizCheckpoints,
    cadence,
    currentStepIndex,
    isPlaying,
    pause,
    stepForward,
    module: 'sorting',
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  // Clear custom steps when algorithm or array changes
  useEffect(() => {
    setCustomSteps(null);
    setSandboxMessage(null);
  }, [selectedAlg, initialArray]);

  // Callback: receive steps from custom code execution
  const handleCustomCodeRun = useCallback((steps: import('../../engine/types/Step').ArrayStep[]) => {
    setCustomSteps(steps);
    reset();
  }, [reset]);

  /* ── Custom Code sandbox execution (function-stub model) ─────────────
     The user fills in the pre-populated signature stub; the backend wraps it
     in the array_in harness with the current Values array, runs it in
     Judge0, and returns trace steps + final result for comparison against
     the reference sorted output. */
  const handleCustomExecute = useCallback(async (code: string, lang: CustomStubLanguage) => {
    if (initialArray.length === 0) {
      setSandboxMessage('Add array values first — the sandbox runs your code against the current Values input.');
      return;
    }
    setSandboxBusy(true);
    setSandboxMessage(null);
    try {
      const response = await executeCustomCode({
        algorithm_key: `sorting.${selectedAlg}`,
        language: lang,
        code,
        state: { args: { arr: initialArray } },
      });

      if (response.status === 'ok') {
        const expected = [...initialArray].sort((a, b) => a - b);
        const actual = response.result?.result;
        const correct = Array.isArray(actual) && resultsMatch(expected, actual);
        setCustomSteps(mapArrayExecutionToSteps(initialArray, response, expected));
        reset();
        setSandboxMessage(
          correct
            ? `Correct — your ${lang.toUpperCase()} code produced the expected sorted array.`
            : 'Ran successfully, but the output does not match the expected sorted array. Check your logic.'
        );
      } else {
        setSandboxMessage(`${response.status.replace('_', ' ')}: ${response.error ?? 'execution failed'}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Execution service unavailable.';
      setSandboxMessage(`Sandbox unavailable: ${message}`);
    } finally {
      setSandboxBusy(false);
    }
  }, [initialArray, selectedAlg, reset]);



  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    const arr = generateArray(arraySize, arrayPattern);
    setInitialArray(arr);
    setRawArrayInput(arr.join(', '));
  };

  const handleApplyCustomArray = (newArr: number[]) => {
    reset();
    quizSession.resetSession();
    setArraySize(newArr.length);
    setInitialArray(newArr);
    setRawArrayInput(newArr.join(', '));
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     A fresh, never-studied array becomes the execution the student must
     predict cold. startChallenge() must fire in the same handler as the
     input change so the armed challenge survives the checkpoint reset
     the new execution triggers. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    handleRandomize();
  };

  const handleBarElementClick = (index: number, currentValue: number) => {
    const valStr = prompt(`Edit value at index [${index}]:`, currentValue.toString());
    if (valStr !== null) {
      const num = parseInt(valStr, 10);
      if (!isNaN(num) && num > 0) {
        const updated = [...initialArray];
        updated[index] = num;
        handleApplyCustomArray(updated);
      }
    }
  };



  usePlaybackShortcuts({
    handlers: {
      onTogglePlay: isPlaying ? pause : play,
      onReset: reset,
    onStepForward: stepForward,
      onStepBack: stepBack,
      onStop: () => {
        pause();
        reset();
      },
      onResume: play,
    },
  });

  const renderFullscreenPlayerControls = () => (
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
        <span className="step-counter">Step {currentStepIndex + 1} / {totalSteps}</span>
      </div>
      <div className="player-right">
        <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
        </div>
    </div>
  );

  /* ── Shared toolbar controls ─────────────────────────────────────────
     Single source of truth for every input/button: rendered in the page
     toolbar AND passed to the fullscreen modal, so the two states can
     never drift out of sync. */
  const renderToolbarControls = () => (
    <>
      {/* Direct Batch Array Input */}
      <div className="bst-input-group" title="Enter custom comma-separated numbers (e.g. 8, 3, 5, 1, 9, 2)">
        <span style={{ fontWeight: 600 }}>Array:</span>
        <input
          type="text"
          value={rawArrayInput}
          onChange={(e) => {
            setRawArrayInput(e.target.value);
            const res = parseNumberList(e.target.value);
            if (res.isValid && res.values.length >= 2) {
              setInitialArray(res.values);
              setCustomSteps(null);
              reset();
            }
          }}
          className="bst-input"
          placeholder="e.g. 8, 3, 5, 1, 9, 2"
          style={{ minWidth: '150px' }}
        />
      </div>

      <div className="bst-input-group">
        <span>Pattern:</span>
        <select
          value={arrayPattern}
          onChange={(e) => {
            const pattern = e.target.value as ArrayPattern;
            setArrayPattern(pattern);
            reset();
            const newArr = generateArray(arraySize, pattern);
            setInitialArray(newArr);
            setRawArrayInput(newArr.join(', '));
          }}
          className="bst-select font-bold text-xs"
        >
          <option value="random">Random Unsorted</option>
          <option value="reversed">Worst Case (Reversed)</option>
          <option value="nearlySorted">Best Case (Nearly Sorted)</option>
        </select>
      </div>

      <div className="bst-input-group">
        <span>Size:</span>
        <input
          type="range"
          min={5}
          max={30}
          value={arraySize}
          onChange={(e) => {
            const size = parseInt(e.target.value);
            setArraySize(size);
            reset();
            const newArr = generateArray(size, arrayPattern);
            setInitialArray(newArr);
            setRawArrayInput(newArr.join(', '));
          }}
          className="toolbar-range cursor-pointer accent-amber-400 w-24"
        />
        <span className="text-xs font-mono font-bold text-amber-400">{arraySize}</span>
      </div>

      {/* Dataset Mode Selector */}
      <div className="dataset-mode-selector">
        <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([])} title="Empty Array">
          <Trash2 size={14} className="text-rose-400" />
          <span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([50, 20, 70, 10, 90, 40])} title="Sample Array">
          <Layers size={14} className="text-amber-400" />
          <span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random Array">
          <Sparkles size={14} className="text-emerald-400" />
          <span>Random</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Layers size={22} />}
        title="Sorting Algorithms Studio"
        subtitle="Interactive Comparison, Partitioning, & In-Place Array Sorting"
        items={ALGORITHMS.map((alg) => ({
          id: alg.key,
          name: alg.name,
          description: `Step-by-step ${alg.name} execution over a live memory array`,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as AlgorithmKey);
          reset();
          quizSession.resetSession();
        }}
        placeholder="Search sorting algorithm..."
        actions={
          <VisualizerActions
            quizEnabled={quizEnabled}
            onToggleQuiz={() => setQuizEnabled((v) => !v)}
            debuggerVisible={showDebugger}
            onToggleDebugger={() => setShowDebugger((v) => !v)}
            customizeModeEnabled={customizeModeEnabled}
            onToggleCustomizeMode={() => setCustomizeModeEnabled((v) => !v)}
            onResetLayout={() => setCustomizeModeEnabled(false)}
          >
            <button
              type="button"
              className="viz-action-btn"
              onClick={() => setIsFullScreenOpen(true)}
              title="Full Screen Canvas View"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </VisualizerActions>
        }
      />



      {/* Operations Toolbar Matching BST */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {renderToolbarControls()}
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace scene-workspace">
        {/* Left Column: Visual Canvas & Interactive Controls */}
        <div className="renderer-section">
          <SortingRenderer
            currentStep={currentStep}
            onElementClick={handleBarElementClick}
            onToggleFullscreen={() => setIsFullScreenOpen(true)}
          />

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

        {/* Right Column: Multi-Language Code Panel & Complexity Analysis */}
        <div className="quiz-rail">
          <QuizDock
            session={quizSession}
            cadence={cadence}
            onCadenceChange={setCadence}
            onEnableQuiz={() => setQuizEnabled(true)}
            onProveIt={handleProveIt}
          />
        </div>
        <ResizablePanelRow
          storageKey="sorting"
          customizeModeEnabled={customizeModeEnabled}
          visualizerPanel={
            <>
              <SortingRenderer
                currentStep={currentStep}
                onElementClick={handleBarElementClick}
                onToggleFullscreen={() => setIsFullScreenOpen(true)}
              />
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
            </>
          }
          debuggerPanel={showDebugger ? (
            <MultiLanguageCodePanel
              algorithmKey={selectedAlg}
              title="Sorting Algorithm"
              activeLine={currentStep?.codeLine}
              variables={currentStep?.variables}
              callStack={currentStep?.callStack}
              onCustomCodeRun={handleCustomCodeRun}
              currentArray={initialArray}
              categoryId="sorting"
              topicId={selectedAlg}
              onCustomExecute={handleCustomExecute}
              customBusy={sandboxBusy}
              customMessage={sandboxMessage}
            />
          ) : null}

          explanationPanel={<ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            steps={customSteps ?? executionData.steps}
            currentStepIndex={currentStepIndex}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
          }
        />
      </div>

      <TheoryPanel categoryId="sorting" activeTopic={selectedAlg} />

      {/* Reusable Native FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Sorting Algorithms | ${selectedAlg.toUpperCase()} SORT`}
        subtitle="Memory Array Inspector"
        toolbarControls={
          <div className="fs-floating-controls">
            {renderToolbarControls()}
            <VisualizerActions
              quizEnabled={quizEnabled}
              onToggleQuiz={() => setQuizEnabled((v) => !v)}
              debuggerVisible={showDebugger}
              onToggleDebugger={() => setShowDebugger((v) => !v)}
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
        <SortingRenderer
          currentStep={currentStep}
          onElementClick={handleBarElementClick}
        />
      </FullScreenCanvasModal>
    </div>
  );
};
