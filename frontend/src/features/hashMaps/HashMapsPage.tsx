import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Hash, Maximize2, Sparkles, Trash2, Layers, Copy, Map
} from 'lucide-react';
import { HashMapRenderer } from './HashMapRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
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
import { parseNumberList } from '../../utils/batchInputParser';

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
  const [rawArrInput, setRawArrInput] = useState<string>(DEFAULT_INPUTS.twoSum.arr.join(', '));

  // UI state
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  // Sync inputs when algorithm changes
  useEffect(() => {
    const defaults = DEFAULT_INPUTS[selectedAlg];
    setInputArr(defaults.arr);
    setRawArrInput(defaults.arr.join(', '));
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
  seekTo,
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
    setRawArrInput(newArr.join(', '));
    if (selectedAlg === 'twoSum' && newArr.length >= 2) {
      setTarget(newArr[0] + newArr[newArr.length - 1]);
    }
  };

  const handleApplyCustomArray = (newArr: number[]) => {
    reset();
    quizSession.resetSession();
    setInputArr(newArr);
    setRawArrInput(newArr.join(', '));
    if (selectedAlg === 'twoSum' && newArr.length >= 2) {
      setTarget(newArr[0] + newArr[newArr.length - 1]);
    }
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     Fresh array + target, predicted cold. startChallenge() must fire in
     the same handler as the input change so the armed challenge survives
     the checkpoint reset the new execution triggers. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    handleRandomize();
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
  const renderToolbarControls = () => (
    <>
      {/* Direct Batch Array Input */}
      <div className="bst-input-group" title="Enter custom comma-separated numbers (e.g. 2, 7, 11, 15)">
        <span style={{ fontWeight: 600 }}>Array:</span>
        <input
          type="text"
          value={rawArrInput}
          onChange={(e) => {
            setRawArrInput(e.target.value);
            const res = parseNumberList(e.target.value);
            if (res.isValid && res.values.length > 0) {
              const newArr = res.values;
              setInputArr(newArr);
              if (selectedAlg === 'twoSum' && newArr.length >= 2) {
                setTarget(newArr[0] + newArr[newArr.length - 1]);
              }
              reset();
            }
          }}
          className="bst-input"
          placeholder="e.g. 2, 7, 11, 15"
          style={{ minWidth: '150px' }}
        />
      </div>

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
            setRawArrInput(defaults.arr.join(', '));
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
    </>
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
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as HashMapsAlgorithmKey);
          reset();
          quizSession.resetSession();
        }}
        placeholder="Search hash map algorithm or technique..."
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
              title="Full Screen Canvas View"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </VisualizerActions>
        }
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
            </button>
          ))}
        </div>
      </div>

      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {renderToolbarControls()}
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
        <div className="quiz-rail">
          <QuizDock
            session={quizSession}
            cadence={cadence}
            onCadenceChange={setCadence}
            onEnableQuiz={() => setQuizEnabled(true)}
            onProveIt={handleProveIt}
          />
        </div>
        <div className={`bottom-row ${showDebugger ? '' : 'bottom-row--single'}`}>
          {showDebugger && (
            <MultiLanguageCodePanel
              algorithmKey={selectedAlg}
              title="Hash Map"
              activeLine={currentStep?.codeLine}
              variables={currentStep?.variables}
              callStack={currentStep?.callStack}
              currentArray={inputArr}
            />
          )}

          <ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            stepNumber={currentStepIndex + 1}
            totalSteps={totalSteps}
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
        <HashMapRenderer
          currentStep={currentStep}
          onElementClick={handleBarElementClick}
        />
      </FullScreenCanvasModal>
    </div>
  );
};
