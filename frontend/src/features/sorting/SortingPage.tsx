import React, { useState, useMemo } from 'react';
import { Shuffle, ArrowUpDown } from 'lucide-react';
import { SortingRenderer } from './SortingRenderer';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
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
    // Swap 2 random pairs
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
  const [arraySize, setArraySize] = useState<number>(15);
  const [arrayPattern, setArrayPattern] = useState<ArrayPattern>('random');

  // Initial array state
  const [initialArray, setInitialArray] = useState<number[]>(() => generateArray(15, 'random'));

  // Generate algorithm steps whenever initialArray or selectedAlg changes
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

  const handleGenerateNewArray = () => {
    reset();
    setInitialArray(generateArray(arraySize, arrayPattern));
  };

  const handleSizeChange = (newSize: number) => {
    setArraySize(newSize);
    reset();
    setInitialArray(generateArray(newSize, arrayPattern));
  };

  const handlePatternChange = (pattern: ArrayPattern) => {
    setArrayPattern(pattern);
    reset();
    setInitialArray(generateArray(arraySize, pattern));
  };

  return (
    <div className="sorting-page-container">
      {/* Algorithm Header & Controls Toolbar */}
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
          <button className="toolbar-btn" onClick={handleGenerateNewArray} title="Generate New Data">
            <Shuffle size={16} />
            <span>New Array</span>
          </button>

          <div className="toolbar-select-group">
            <ArrowUpDown size={14} />
            <select
              value={arrayPattern}
              onChange={(e) => handlePatternChange(e.target.value as ArrayPattern)}
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
              min="8"
              max="40"
              value={arraySize}
              onChange={(e) => handleSizeChange(parseInt(e.target.value))}
              className="toolbar-range"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="sorting-workspace">
        <div className="renderer-section">
          <SortingRenderer currentStep={currentStep} />

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

        {/* Explanation & Complexity Panel */}
        <div className="explanation-section">
          <ExplanationPanel
            description={currentStep?.description || ''}
            codeLine={currentStep?.codeLine}
            pseudocode={executionData.pseudocode}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>
    </div>
  );
};
