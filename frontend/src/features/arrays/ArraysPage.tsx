import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Edit3, Search, Zap, ArrowRightLeft, RotateCw, Hash, Maximize2, HelpCircle, Sparkles, Trash2, Layers
} from 'lucide-react';
import { ArrayRenderer } from './ArrayRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { CustomArrayEditor } from '../../components/debugger/CustomArrayEditor';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildArraysCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { generateLinearSearchSteps } from './algorithms/linearSearch';
import { generateKadaneSteps } from './algorithms/kadane';
import { generateTwoPointerSteps } from './algorithms/twoPointer';
import { generateSlidingWindowSteps } from './algorithms/slidingWindow';
import { generateRotationSteps } from './algorithms/arrayRotation';
import { generatePrefixSumSteps } from './algorithms/prefixSum';

import '../sorting/Sorting.css';
import './Arrays.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

type AlgorithmKey = 'linearSearch' | 'kadane' | 'twoPointer' | 'slidingWindow' | 'rotation' | 'prefixSum';
type ArrayPattern = 'random' | 'sorted' | 'reversed';

interface AlgMeta {
  key: AlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'linearSearch', name: 'Linear Search', complexity: 'O(n)', icon: <Search size={14} /> },
  { key: 'kadane', name: "Kadane's Algorithm", complexity: 'O(n)', icon: <Zap size={14} /> },
  { key: 'twoPointer', name: 'Two Pointers', complexity: 'O(n)', icon: <ArrowRightLeft size={14} /> },
  { key: 'slidingWindow', name: 'Sliding Window', complexity: 'O(n)', icon: <ArrowRightLeft size={14} /> },
  { key: 'rotation', name: 'Array Rotation', complexity: 'O(n)', icon: <RotateCw size={14} /> },
  { key: 'prefixSum', name: 'Prefix Sum', complexity: 'O(n)', icon: <Hash size={14} /> },
];

function generateArray(size: number, pattern: ArrayPattern): number[] {
  const arr: number[] = [];
  for (let i = 0; i < size; i++) {
    arr.push(Math.floor(Math.random() * 85) + 15);
  }

  if (pattern === 'sorted') {
    arr.sort((a, b) => a - b);
  } else if (pattern === 'reversed') {
    arr.sort((a, b) => b - a);
  }

  return arr;
}

export const ArraysPage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<AlgorithmKey>('linearSearch');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as AlgorithmKey);
    }
  }, [searchParams]);

  const [arraySize, setArraySize] = useState<number>(10);
  const [arrayPattern, setArrayPattern] = useState<ArrayPattern>('random');
  const [initialArray, setInitialArray] = useState<number[]>(() => generateArray(10, 'random'));

  // Debugger & Modal & Predict state
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  // Algorithm-specific parameters
  const [target, setTarget] = useState<number>(() => {
    const arr = generateArray(10, 'random');
    return arr[Math.floor(Math.random() * arr.length)];
  });
  const [windowSize, setWindowSize] = useState<number>(3);
  const [rotations, setRotations] = useState<number>(2);
  const [targetSum, setTargetSum] = useState<number>(0);

  // Initialize target and targetSum after first array generation
  useEffect(() => {
    setTarget(initialArray[Math.floor(Math.random() * initialArray.length)]);
    if (initialArray.length > 7) {
      setTargetSum(initialArray[2] + initialArray[7]);
    } else if (initialArray.length > 2) {
      setTargetSum(initialArray[0] + initialArray[initialArray.length - 1]);
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate algorithm steps
  const executionData = useMemo(() => {
    switch (selectedAlg) {
      case 'linearSearch':
        return generateLinearSearchSteps(initialArray, target);
      case 'kadane':
        return generateKadaneSteps(initialArray);
      case 'twoPointer':
        return generateTwoPointerSteps(initialArray, targetSum);
      case 'slidingWindow':
        return generateSlidingWindowSteps(initialArray, windowSize);
      case 'rotation':
        return generateRotationSteps(initialArray, rotations);
      case 'prefixSum':
        return generatePrefixSumSteps(initialArray);
      default:
        return generateLinearSearchSteps(initialArray, target);
    }
  }, [selectedAlg, initialArray, target, targetSum, windowSize, rotations]);

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
  } = useStepPlayer({ steps: executionData.steps });

  // Build quiz checkpoints from the current execution steps
  const quizCheckpoints = useMemo(
    () => buildArraysCheckpoints(executionData.steps, selectedAlg),
    [executionData.steps, selectedAlg]
  );

  const quizSession = useQuizSession({
    enabled: quizEnabled,
    checkpoints: quizCheckpoints,
    cadence,
    currentStepIndex,
    isPlaying,
    pause,
    stepForward,
    module: 'arrays' as any,
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  // Clear quiz when algorithm or array changes
  useEffect(() => {
    quizSession.resetSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlg, initialArray]);

  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    const newArr = generateArray(arraySize, arrayPattern);
    setInitialArray(newArr);
    setTarget(newArr[Math.floor(Math.random() * newArr.length)]);
    if (newArr.length > 7) {
      setTargetSum(newArr[2] + newArr[7]);
    } else if (newArr.length > 2) {
      setTargetSum(newArr[0] + newArr[newArr.length - 1]);
    }
  };

  const handleApplyCustomArray = (newArr: number[]) => {
    reset();
    quizSession.resetSession();
    setArraySize(newArr.length);
    setInitialArray(newArr);
    setShowCustomEditor(false);
    if (newArr.length > 0) {
      setTarget(newArr[Math.floor(Math.random() * newArr.length)]);
      if (newArr.length > 7) {
        setTargetSum(newArr[2] + newArr[7]);
      } else if (newArr.length > 2) {
        setTargetSum(newArr[0] + newArr[newArr.length - 1]);
      }
    }
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
            setTarget(newArr[Math.floor(Math.random() * newArr.length)]);
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
        <span>Quiz Mode</span>
        <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
      </label>
    </div>
  );

  /* ── Algorithm-specific toolbar inputs ─────────────────────────────── */
  const renderAlgorithmInputs = () => {
    switch (selectedAlg) {
      case 'linearSearch':
        return (
          <div className="arrays-target-input">
            <Search size={14} />
            <span>Target:</span>
            <input
              type="number"
              value={target}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setTarget(val);
                  reset();
                }
              }}
            />
          </div>
        );
      case 'slidingWindow':
        return (
          <div className="bst-input-group">
            <span>Window Size:</span>
            <input
              type="range"
              min={2}
              max={Math.min(arraySize, 10)}
              value={windowSize}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setWindowSize(val);
                reset();
              }}
              className="toolbar-range cursor-pointer accent-amber-400 w-20"
            />
            <span className="text-xs font-mono font-bold text-amber-400">{windowSize}</span>
          </div>
        );
      case 'rotation':
        return (
          <div className="bst-input-group">
            <span>Rotations:</span>
            <input
              type="range"
              min={1}
              max={Math.min(arraySize, 15)}
              value={rotations}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setRotations(val);
                reset();
              }}
              className="toolbar-range cursor-pointer accent-amber-400 w-20"
            />
            <span className="text-xs font-mono font-bold text-amber-400">{rotations}</span>
          </div>
        );
      case 'twoPointer':
        return (
          <div className="arrays-target-input">
            <ArrowRightLeft size={14} />
            <span>Target Sum:</span>
            <input
              type="number"
              value={targetSum}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setTargetSum(val);
                  reset();
                }
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Search size={22} />}
        title="Array Algorithms Studio"
        subtitle="Interactive Search, Subarray, Window, & Transformation Techniques"
        items={ALGORITHMS.map((alg) => ({
          id: alg.key,
          name: alg.name,
          description: `Step-by-step ${alg.name} execution over a live array`,
          group: alg.complexity,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as AlgorithmKey);
          reset();
          quizSession.resetSession();
        }}
        placeholder="Search array algorithm or technique..."
      />

      {/* Category Tabs Bar */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs flex-wrap">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.key}
              className={`category-tab ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedAlg(alg.key);
                reset();
                quizSession.resetSession();
              }}
            >
              {alg.icon}
              <span>{alg.name}</span>
              <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1.5 py-0.5 rounded ml-1">{alg.complexity}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operations Toolbar */}
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
              <option value="random">Random</option>
              <option value="sorted">Sorted Ascending</option>
              <option value="reversed">Sorted Descending</option>
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
                setTarget(newArr[Math.floor(Math.random() * newArr.length)]);
              }}
              className="toolbar-range cursor-pointer accent-amber-400 w-24"
            />
            <span className="text-xs font-mono font-bold text-amber-400">{arraySize}</span>
          </div>

          {/* Algorithm-specific inputs */}
          {renderAlgorithmInputs()}

          {/* Dataset Mode Selector */}
          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([])} title="Empty Array">
              <Trash2 size={14} className="text-rose-400" />
              <span>Empty</span>
            </button>
            <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([50, 20, 70, 10, 90, 40, 30, 80])} title="Sample Array">
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
          </div>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace scene-workspace">
        {/* Left Column: Visual Canvas & Interactive Controls */}
        <div className="renderer-section">
          <ArrayRenderer
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

        {/* Right Column: Quiz & Explanation */}
        <div className="explanation-section">
          <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />

          <MultiLanguageCodePanel
            algorithmKey={selectedAlg}
            title="Array Technique"
            currentArray={initialArray}
          />

          <ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            steps={executionData.steps}
            currentStepIndex={currentStepIndex}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      <TheoryPanel categoryId="arrays" activeTopic={selectedAlg} />

      {/* Reusable Native FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Array Algorithms | ${selectedAlg.toUpperCase()}`}
        subtitle="Array Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderFullscreenPlayerControls()}
      >
        <ArrayRenderer
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
