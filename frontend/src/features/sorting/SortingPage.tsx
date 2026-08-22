import React, { useState, useMemo } from 'react';
import { Shuffle, Edit3 } from 'lucide-react';
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

const ALGORITHMS: { key: AlgorithmKey; name: string }[] = [
  { key: 'bubble', name: 'Bubble Sort' },
  { key: 'selection', name: 'Selection Sort' },
  { key: 'insertion', name: 'Insertion Sort' },
  { key: 'merge', name: 'Merge Sort' },
  { key: 'quick', name: 'Quick Sort' },
  { key: 'heap', name: 'Heap Sort' },
  { key: 'shell', name: 'Shell Sort' },
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
      {/* Algorithm Selector Bar */}
      <div className="algorithm-tabs-bar animate-fade-in">
        <div className="algorithm-tabs">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.key}
              className={`alg-tab ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedAlg(alg.key);
                reset();
              }}
            >
              {alg.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dataset & Parameter Toolbar */}
      <div className="sorting-toolbar animate-fade-in">
        <div className="toolbar-left">
          <button className="toolbar-btn primary" onClick={handleRandomize}>
            <Shuffle size={16} />
            <span>Generate New Array</span>
          </button>

          <button className="toolbar-btn secondary" onClick={() => setShowCustomEditor(true)}>
            <Edit3 size={16} />
            <span>Custom Values</span>
          </button>

          <div className="toolbar-divider" />

          {/* Sample Presets Dropdown */}
          <div className="toolbar-select-group">
            <span className="toolbar-label">Pattern:</span>
            <select
              value={arrayPattern}
              onChange={(e) => {
                const pattern = e.target.value as ArrayPattern;
                setArrayPattern(pattern);
                reset();
                setInitialArray(generateArray(arraySize, pattern));
              }}
              className="toolbar-select"
            >
              <option value="random">🎲 Random Unsorted</option>
              <option value="reversed">⬇️ Worst Case (Reversed)</option>
              <option value="nearlySorted">⚡ Best Case (Nearly Sorted)</option>
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="toolbar-slider-group">
            <div className="slider-label-row">
              <span className="toolbar-label">Array Size:</span>
              <span className="slider-value">{arraySize} elements</span>
            </div>
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
              className="toolbar-range"
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
