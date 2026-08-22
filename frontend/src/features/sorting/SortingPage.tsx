import React, { useState, useMemo, useEffect } from 'react';
import { Shuffle, ArrowUpDown, Edit3 } from 'lucide-react';
import { SortingRenderer } from './SortingRenderer';
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

  // Debugger state
  const [showCustomEditor, setShowCustomEditor] = useState(false);
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

  // Breakpoints Auto-Pause Listener
  useEffect(() => {
    if (isPlaying && currentStep?.codeLine && breakpoints.includes(currentStep.codeLine)) {
      pause();
    }
  }, [isPlaying, currentStep, breakpoints, pause]);

  const handleToggleBreakpoint = (lineNumber: number) => {
    setBreakpoints((prev) =>
      prev.includes(lineNumber) ? prev.filter((line) => line !== lineNumber) : [...prev, lineNumber]
    );
  };

  const handleGenerateNewArray = () => {
    reset();
    setInitialArray(generateArray(arraySize, arrayPattern));
  };

  const handleApplyCustomArray = (newArray: number[]) => {
    setArraySize(newArray.length);
    reset();
    setInitialArray(newArray);
  };

  const handleBarElementClick = (index: number, val: number) => {
    const newValueStr = prompt(`Edit value for array element at index [${index}]:`, String(val));
    if (newValueStr !== null) {
      const num = Number(newValueStr);
      if (!isNaN(num) && num > 0) {
        const updated = [...initialArray];
        updated[index] = Math.min(100, Math.max(5, num));
        reset();
        setInitialArray(updated);
      }
    }
  };

  return (
    <div className="sorting-page-container">
      {/* Top Header & Algorithm Selector Toolbar */}
      <div className="sorting-toolbar animate-fade-in">
        <div className="toolbar-left">
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

        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={() => handleApplyCustomArray([45, 12, 89, 34, 67, 23])} title="Load 6-item sample preset">
            <span>Sample (6)</span>
          </button>

          <button className="toolbar-btn" onClick={() => setShowCustomEditor(true)}>
            <Edit3 size={16} />
            <span>Custom Values</span>
          </button>

          <button className="toolbar-btn" onClick={handleGenerateNewArray} title="Generate Random Array">
            <Shuffle size={16} />
            <span>Randomize</span>
          </button>

          <div className="toolbar-select-group">
            <ArrowUpDown size={14} />
            <select
              value={arrayPattern}
              onChange={(e) => {
                const pat = e.target.value as ArrayPattern;
                setArrayPattern(pat);
                reset();
                setInitialArray(generateArray(arraySize, pat));
              }}
              className="toolbar-select"
            >
              <option value="random">Random</option>
              <option value="nearlySorted">Nearly Sorted</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>

          <div className="toolbar-slider-group">
            <span>Size: {arraySize}</span>
            <input
              type="range"
              min="6"
              max="35"
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
          />

          {/* Interactive Player Controls */}
          <div className="player-bar">
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
        </div>

        {/* Right Column: Multi-Language Code Panel & Complexity Analysis */}
        <div className="explanation-section">
          {/* Multi-Language Code Debugger */}
          <MultiLanguageCodePanel
            algorithmKey={selectedAlg}
            activeLine={currentStep?.codeLine}
            breakpoints={breakpoints}
            onToggleBreakpoint={handleToggleBreakpoint}
            variables={currentStep?.variables}
            callStack={currentStep?.callStack}
          />

          {/* Real-time Complexity & Description Panel */}
          <ExplanationPanel
            description={currentStep?.description || 'Click Play to observe step-by-step execution details.'}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

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
