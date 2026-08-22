import React, { useState, useMemo } from 'react';
import {
  Shuffle, Edit3, Layers, CheckCircle2, ArrowDown, GitCommit, Zap, Network, Sparkles, BarChart3, Sliders, ArrowUpDown, Trash2, Maximize2
} from 'lucide-react';
import { SortingRenderer } from './SortingRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { CustomArrayEditor } from '../../components/debugger/CustomArrayEditor';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
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

  // Debugger & Modal state
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);

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
  } = useStepPlayer({ steps: executionData.steps });

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

  return (
    <div className="sorting-page-container">
      {/* Category Header */}
      <header className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-amber-400" size={24} />
            <span>Sorting Algorithms Studio</span>
          </h1>
          <p className="page-subtitle text-xs text-slate-400">
            Interactive Step-by-Step 3D Visualizer & Time-Complexity Inspector for Classical Sorting Algorithms
          </p>
        </div>

        {/* Header Right Actions matching BST */}
        <div className="flex items-center gap-2">
          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([])} title="Empty Array">
              <Trash2 size={13} className="text-rose-400" />
              <span>Empty</span>
            </button>
            <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([50, 20, 70, 10, 90, 40])} title="Sample Array">
              <Layers size={13} className="text-amber-400" />
              <span>Sample</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random Array">
              <Sparkles size={13} className="text-emerald-400" />
              <span>Random</span>
            </button>
          </div>

          <button
            className="bst-btn btn-fullscreen p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-amber-400 text-slate-300"
            onClick={() => setIsFullScreenOpen(true)}
            title="Full Screen Canvas View"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </header>

      {/* Algorithm Vector Tabs Bar */}
      <div className="algorithm-tabs-bar animate-fade-in">
        <div className="algorithm-tabs flex flex-wrap gap-2">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.key}
              className={`alg-tab flex items-center gap-2 ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedAlg(alg.key);
                reset();
              }}
            >
              {alg.icon}
              <span className="font-semibold">{alg.name}</span>
              <span className="text-[10px] opacity-75 font-mono bg-black/20 px-1.5 py-0.5 rounded">{alg.complexity}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dataset & Parameter Control Toolbar */}
      <div className="sorting-toolbar animate-fade-in flex flex-wrap justify-between items-center gap-4">
        <div className="toolbar-left flex flex-wrap items-center gap-2">
          <button className="toolbar-btn primary font-bold text-xs flex items-center gap-1.5" onClick={handleRandomize}>
            <Shuffle size={14} className="text-amber-400" />
            <span>Generate New Array</span>
          </button>

          <button className="toolbar-btn secondary font-bold text-xs flex items-center gap-1.5" onClick={() => setShowCustomEditor(true)}>
            <Edit3 size={14} className="text-sky-400" />
            <span>Custom Values</span>
          </button>

          <div className="toolbar-divider" />

          {/* Sample Presets Dropdown */}
          <div className="toolbar-select-group">
            <span className="toolbar-label text-xs font-bold text-slate-400 flex items-center gap-1">
              <Sliders size={12} className="text-amber-400" /> Pattern:
            </span>
            <select
              value={arrayPattern}
              onChange={(e) => {
                const pattern = e.target.value as ArrayPattern;
                setArrayPattern(pattern);
                reset();
                setInitialArray(generateArray(arraySize, pattern));
              }}
              className="toolbar-select font-bold text-xs"
            >
              <option value="random">Random Unsorted</option>
              <option value="reversed">Worst Case (Reversed)</option>
              <option value="nearlySorted">Best Case (Nearly Sorted)</option>
            </select>
          </div>
        </div>

        <div className="toolbar-right flex items-center gap-3">
          <div className="toolbar-slider-group flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <span className="toolbar-label text-xs font-bold text-slate-400 flex items-center gap-1">
              <ArrowUpDown size={12} className="text-amber-400" /> Size:
            </span>
            <span className="slider-value text-xs font-mono font-bold text-amber-400">{arraySize}</span>
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
              className="toolbar-range cursor-pointer accent-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace">
        {/* Left Column: Visual Canvas & Interactive Controls */}
        <div className="renderer-section">
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
        playbackControls={renderPlayerControls()}
      >
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
