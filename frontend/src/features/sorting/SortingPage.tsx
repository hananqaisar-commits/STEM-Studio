import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Edit3, Layers, CheckCircle2, ArrowDown, GitCommit, Zap, Network, Sparkles, Trash2, Maximize2, HelpCircle
} from 'lucide-react';
import { SortingRenderer } from './SortingRenderer';
import { SortingPredictionQuiz } from './SortingPredictionQuiz';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { CustomArrayEditor } from '../../components/debugger/CustomArrayEditor';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { useStepPlayer } from '../../hooks/useStepPlayer';

import { generateBubbleSortSteps } from './algorithms/bubbleSort';
import { generateSelectionSortSteps } from './algorithms/selectionSort';
import { generateInsertionSortSteps } from './algorithms/insertionSort';
import { generateMergeSortSteps } from './algorithms/mergeSort';
import { generateQuickSortSteps } from './algorithms/quickSort';
import { generateHeapSortSteps } from './algorithms/heapSort';
import { generateShellSortSteps } from './algorithms/shellSort';

import './Sorting.css';

type AlgorithmKey = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap' | 'shell';
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
  const [arraySize, setArraySize] = useState<number>(12);
  const [arrayPattern, setArrayPattern] = useState<ArrayPattern>('random');
  const [initialArray, setInitialArray] = useState<number[]>(() => generateArray(12, 'random'));

  // Debugger & Modal & Predict state
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [isPredictMode, setIsPredictMode] = useState<boolean>(true);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);

  // Custom code execution state
  const [customSteps, setCustomSteps] = useState<import('../../engine/types/Step').ArrayStep[] | null>(null);

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
    setSpeed,
  } = useStepPlayer({ steps: customSteps ?? executionData.steps });

  // Clear custom steps when algorithm or array changes
  useEffect(() => {
    setCustomSteps(null);
  }, [selectedAlg, initialArray]);

  // Callback: receive steps from custom code execution
  const handleCustomCodeRun = useCallback((steps: import('../../engine/types/Step').ArrayStep[]) => {
    setCustomSteps(steps);
    reset();
  }, [reset]);

  const comparing = currentStep?.comparingIndices;
  const hasPrediction = isPredictMode && comparing && comparing.length >= 2 && currentStep?.array;
  const val1 = hasPrediction ? currentStep.array[comparing[0]] : undefined;
  const val2 = hasPrediction ? currentStep.array[comparing[1]] : undefined;

  useEffect(() => {
    if (hasPrediction && isPlaying) {
      pause();
    }
  }, [hasPrediction, isPlaying, pause]);

  const handleRandomize = () => {
    reset();
    setInitialArray(generateArray(arraySize, arrayPattern));
  };

  const handleApplyCustomArray = (newArr: number[]) => {
    reset();
    setArraySize(newArr.length);
    setInitialArray(newArr);
    setShowCustomEditor(false);
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

  const handleToggleBreakpoint = (lineNumber: number) => {
    setBreakpoints((prev) =>
      prev.includes(lineNumber) ? prev.filter((line) => line !== lineNumber) : [...prev, lineNumber]
    );
  };

  const renderPlayerControls = () => (
    <div className="player-bar" style={{ margin: 0 }}>
      <div className="player-left">
        <PlayPauseButton
          isPlaying={isPlaying}
          onToggle={isPlaying ? pause : play}
        />
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
          Step {currentStepIndex + 1} / {totalSteps}
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
            setInitialArray(generateArray(size, arrayPattern));
          }}
          className="toolbar-range w-24"
        />
        <span className="text-xs font-mono font-bold">{arraySize}</span>
      </div>

      <div className="dataset-mode-selector ml-1">
        <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([])} title="Empty Array">
          <Trash2 size={14} />
          <span>Empty</span>
        </button>
        <button
          className="bst-btn btn-mode"
          onClick={() => handleApplyCustomArray([50, 20, 70, 10, 90, 40])}
          title="Sample Array"
        >
          <Layers size={14} />
          <span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random Array">
          <Sparkles size={14} />
          <span>Random</span>
        </button>
      </div>

      <label className="predict-toggle-label ml-2">
        <HelpCircle size={16} />
        <span>Predict Mode</span>
        <input type="checkbox" checked={isPredictMode} onChange={(e) => setIsPredictMode(e.target.checked)} />
      </label>
    </div>
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
          group: alg.complexity,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as AlgorithmKey);
          reset();
        }}
        placeholder="Search sorting algorithm or complexity..."
      />

      {/* Category Tabs Bar Matching BST */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs flex-wrap">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.key}
              className={`category-tab ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedAlg(alg.key);
                reset();
              }}
            >
              {alg.icon}
              <span>{alg.name}</span>
              <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1.5 py-0.5 rounded ml-1">{alg.complexity}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operations Toolbar Matching BST */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          <button className="bst-btn btn-insert" onClick={() => setShowCustomEditor(true)}>
            <Edit3 size={14} />
            <span>Custom Values</span>
          </button>

          <div className="bst-input-group">
            <span>Pattern:</span>
            <select
              value={arrayPattern}
              onChange={(e) => {
                const pattern = e.target.value as ArrayPattern;
                setArrayPattern(pattern);
                reset();
                setInitialArray(generateArray(arraySize, pattern));
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
                setInitialArray(generateArray(size, arrayPattern));
              }}
              className="toolbar-range cursor-pointer accent-amber-400 w-24"
            />
            <span className="text-xs font-mono font-bold text-amber-400">{arraySize}</span>
          </div>

          {/* Dataset Mode Selector Matching BST */}
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
        </div>

        <div className="bst-toolbar-right">
          <div className="predict-mode-group flex items-center gap-2">
            <label className="predict-toggle-label">
              <HelpCircle size={16} />
              <span>Predict Mode</span>
              <input
                type="checkbox"
                checked={isPredictMode}
                onChange={(e) => setIsPredictMode(e.target.checked)}
              />
            </label>

            <button
              className="bst-btn btn-fullscreen"
              onClick={() => setIsFullScreenOpen(true)}
              title="Full Screen Canvas View"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace">
        {/* Left Column: Visual Canvas & Interactive Controls */}
        <div className="renderer-section">
          {hasPrediction && val1 !== undefined && val2 !== undefined && comparing && (
            <SortingPredictionQuiz
              val1={val1}
              val2={val2}
              idx1={comparing[0]}
              idx2={comparing[1]}
              onCorrectAnswer={() => stepForward()}
            />
          )}

          <SortingRenderer
            currentStep={currentStep}
            onElementClick={handleBarElementClick}
            onToggleFullscreen={() => setIsFullScreenOpen(true)}
          />

          {renderPlayerControls()}
        </div>

        {/* Right Column: Multi-Language Code Panel & Complexity Analysis */}
        <div className="explanation-section">
          <MultiLanguageCodePanel
            algorithmKey={selectedAlg}
            activeLine={currentStep?.codeLine}
            breakpoints={breakpoints}
            onToggleBreakpoint={handleToggleBreakpoint}
            variables={currentStep?.variables}
            callStack={currentStep?.callStack}
            onCustomCodeRun={handleCustomCodeRun}
            currentArray={initialArray}
          />

          <ExplanationPanel
            description={currentStep?.description || 'Click Play to observe step-by-step execution details.'}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      {/* Reusable Native FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Sorting Algorithms | ${selectedAlg.toUpperCase()} SORT`}
        subtitle="Memory Array Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
      >
        {hasPrediction && val1 !== undefined && val2 !== undefined && comparing && (
          <SortingPredictionQuiz
            val1={val1}
            val2={val2}
            idx1={comparing[0]}
            idx2={comparing[1]}
            onCorrectAnswer={() => stepForward()}
          />
        )}
        <SortingRenderer
          currentStep={currentStep}
          onElementClick={handleBarElementClick}
        />
      </FullScreenCanvasModal>

      {/* Custom Values Input Modal */}
      {showCustomEditor && (
        <CustomArrayEditor
          currentArray={initialArray}
          onApplyCustomArray={handleApplyCustomArray}
          onClose={() => setShowCustomEditor(false)}
        />
      )}
    </div>
  );
};
