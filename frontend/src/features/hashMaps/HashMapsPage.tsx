import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Edit3, Search, Hash, Maximize2, HelpCircle, Sparkles, Trash2, Layers, Copy, Map
} from 'lucide-react';
import { HashMapRenderer } from './HashMapRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { CustomArrayEditor } from '../../components/debugger/CustomArrayEditor';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildHashMapsCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';
import type { HashMapsAlgorithmKey } from './quizAdapter';

import { runTwoSum } from './algorithms/twoSum';
import { runDuplicateDetect } from './algorithms/duplicateDetect';
import { runFrequencyMap } from './algorithms/frequencyMap';
import { runSubarraySum } from './algorithms/subarraySum';

import '../sorting/Sorting.css';
import './HashMaps.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

interface AlgMeta {
  key: HashMapsAlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'twoSum', name: 'Two Sum', complexity: 'O(n)', icon: <Search size={14} /> },
  { key: 'duplicateDetect', name: 'Duplicate Detect', complexity: 'O(n)', icon: <Copy size={14} /> },
  { key: 'frequencyMap', name: 'Frequency Map', complexity: 'O(n)', icon: <Hash size={14} /> },
  { key: 'subarraySum', name: 'Subarray Sum', complexity: 'O(n)', icon: <Map size={14} /> },
];

// Default inputs per algorithm
const DEFAULT_INPUTS: Record<HashMapsAlgorithmKey, { arr: number[]; target?: number }> = {
  twoSum:         { arr: [2, 7, 11, 15], target: 9 },
  duplicateDetect:{ arr: [3, 1, 4, 1, 5, 9, 2, 6] },
  frequencyMap:   { arr: [1, 2, 2, 3, 3, 3, 4, 4, 4, 4] },
  subarraySum:    { arr: [1, 4, 20, 3, 10, 5], target: 33 },
};

export const HashMapsPage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<HashMapsAlgorithmKey>('twoSum');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as HashMapsAlgorithmKey);
    }
  }, [searchParams]);


  // Custom input state
  const [inputArr, setInputArr] = useState<number[]>(DEFAULT_INPUTS.twoSum.arr);
  const [target, setTarget] = useState<number>(DEFAULT_INPUTS.twoSum.target ?? 9);

  // UI state
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  // Sync inputs when algorithm changes
  useEffect(() => {
    const defaults = DEFAULT_INPUTS[selectedAlg];
    setInputArr(defaults.arr);
    if (defaults.target !== undefined) setTarget(defaults.target);
  }, [selectedAlg]);

  // Generate algorithm steps
  const executionData = useMemo(() => {
    switch (selectedAlg) {
      case 'twoSum':
        return runTwoSum(inputArr, target);
      case 'duplicateDetect':
        return runDuplicateDetect(inputArr);
      case 'frequencyMap':
        return runFrequencyMap(inputArr);
      case 'subarraySum':
        return runSubarraySum(inputArr, target);
      default:
        return runTwoSum(inputArr, target);
    }
  }, [selectedAlg, inputArr, target]);

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

  // Build quiz checkpoints
  const quizCheckpoints = useMemo(
    () => buildHashMapsCheckpoints(executionData.steps, selectedAlg),
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
    module: 'hashMaps' as any,
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  // Clear quiz when algorithm or array changes
  useEffect(() => {
    quizSession.resetSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlg, inputArr]);

  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    const size = Math.floor(Math.random() * 8) + 5;
    const newArr: number[] = [];
    for (let i = 0; i < size; i++) {
      newArr.push(Math.floor(Math.random() * 20) + 1);
    }
    setInputArr(newArr);
    if (selectedAlg === 'twoSum' && newArr.length >= 2) {
      setTarget(newArr[0] + newArr[newArr.length - 1]);
    } else if (selectedAlg === 'subarraySum' && newArr.length >= 3) {
      setTarget(newArr[1] + newArr[2] + newArr[3]);
    }
  };

  const handleApplyCustomArray = (newArr: number[]) => {
    reset();
    quizSession.resetSession();
    setInputArr(newArr);
    setShowCustomEditor(false);
    if (selectedAlg === 'twoSum' && newArr.length >= 2) {
      setTarget(newArr[0] + newArr[newArr.length - 1]);
    }
  };

  const handleBarElementClick = (index: number, currentValue: number) => {
    const valStr = prompt(`Edit value at index [${index}]:`, currentValue.toString());
    if (valStr !== null) {
      const num = parseInt(valStr, 10);
      if (!isNaN(num)) {
        const updated = [...inputArr];
        updated[index] = num;
        handleApplyCustomArray(updated);
      }
    }
  };

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
      <div className="dataset-mode-selector ml-1">
        <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([])} title="Empty Array">
          <Trash2 size={14} />
          <span>Empty</span>
        </button>
        <button
          className="bst-btn btn-mode"
          onClick={() => {
            const defaults = DEFAULT_INPUTS[selectedAlg];
            handleApplyCustomArray(defaults.arr);
            if (defaults.target !== undefined) setTarget(defaults.target);
          }}
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
      case 'twoSum':
        return (
          <div className="hashmaps-target-input">
            <Search size={14} />
            <span>Target Sum:</span>
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
      case 'subarraySum':
        return (
          <div className="hashmaps-target-input">
            <Map size={14} />
            <span>Target Sum:</span>
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
      default:
        return null;
    }
  };

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Hash size={22} />}
        title="Hash Map Algorithms Studio"
        subtitle="Interactive HashMap & HashSet Techniques — Lookup, Frequency, Subarrays"
        items={ALGORITHMS.map((alg) => ({
          id: alg.key,
          name: alg.name,
          description: `Step-by-step ${alg.name} execution with live HashMap visualization`,
          group: alg.complexity,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as HashMapsAlgorithmKey);
          reset();
          quizSession.resetSession();
        }}
        placeholder="Search hash map algorithm or technique..."
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

          {renderAlgorithmInputs()}

          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={() => handleApplyCustomArray([])} title="Empty Array">
              <Trash2 size={14} className="text-rose-400" />
              <span>Empty</span>
            </button>
            <button
              className="bst-btn btn-mode"
              onClick={() => {
                const defaults = DEFAULT_INPUTS[selectedAlg];
                reset();
                quizSession.resetSession();
                setInputArr(defaults.arr);
                if (defaults.target !== undefined) setTarget(defaults.target);
              }}
              title="Sample Array"
            >
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
          <HashMapRenderer
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
            title="Hash Map"
            activeLine={currentStep?.codeLine}
            variables={currentStep?.variables}
            callStack={currentStep?.callStack}
            currentArray={inputArr}
          />

          <ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
            steps={executionData.steps}
            currentStepIndex={currentStepIndex}
          />
        </div>
      </div>

      <TheoryPanel categoryId="hashMaps" activeTopic={selectedAlg} />

      {/* Reusable Native FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Hash Map Algorithms | ${selectedAlg.toUpperCase()}`}
        subtitle="HashMap Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderFullscreenPlayerControls()}
      >
        <HashMapRenderer
          currentStep={currentStep}
          onElementClick={handleBarElementClick}
        />
      </FullScreenCanvasModal>

      {/* Custom Values Input Modal */}
      {showCustomEditor && (
        <CustomArrayEditor
          currentArray={inputArr}
          onApplyCustomArray={handleApplyCustomArray}
          onClose={() => setShowCustomEditor(false)}
        />
      )}
    </div>
  );
};
