import React, {useState, useMemo, useEffect} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  Maximize2,
  Sparkles,
  Shuffle,
  Play,
  TrendingUp,
  Compass,
  Trash2,
  Layers,
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildBinarySearchCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';
import {
  generateBinarySearchSteps,
  generateLowerBoundSteps,
  generateUpperBoundSteps,
  generateRotatedSearchSteps,
  generatePeakElementSteps,
  type BinarySearchCategory,
  type BinarySearchStep,
} from './binarySearchEngine';
import { BinarySearchRenderer } from './BinarySearchRenderer';
import { BINARY_SEARCH_SNIPPETS } from './binarySearchSnippets';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { ResizablePanelRow } from '../../components/layout/ResizablePanelRow';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { useTutorContext } from '../../contexts/TutorContext';
import './BinarySearch.css';

import { TheoryPanel } from '../../components/layout/TheoryPanel';

interface AlgorithmMeta {
  id: BinarySearchCategory;
  name: string;
  group: 'Standard' | 'Bounds' | 'Pivoted' | 'Extremum';
  description: string;
}

const ALGORITHMS_LIST: AlgorithmMeta[] = [
  { id: 'binarySearch', name: 'Classic Binary Search', group: 'Standard', description: 'Logarithmic O(log N) lookup in sorted array' },
  { id: 'lowerBound', name: 'Lower Bound (First >= X)', group: 'Bounds', description: 'Smallest index where arr[i] is at least target' },
  { id: 'upperBound', name: 'Upper Bound (First > X)', group: 'Bounds', description: 'Smallest index strictly greater than target' },
  { id: 'searchRotatedArray', name: 'Rotated Sorted Array', group: 'Pivoted', description: 'Pivoted array search using sorted-half detection' },
  { id: 'findPeakElement', name: 'Find Peak Element', group: 'Extremum', description: 'Slope binary search to find a local maximum' },
];

export const BinarySearchPage: React.FC = () => {
  const { setTutorContext } = useTutorContext();
  const [category, setCategory] = useState<BinarySearchCategory>('binarySearch');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS_LIST.some((a) => a.id === topic)) {
      setCategory(topic as BinarySearchCategory);
    }
  }, [searchParams]);


  const [array, setArray] = useState<number[]>([4, 8, 15, 23, 42, 56, 77, 89, 94]);
  const [targetInput, setTargetInput] = useState<string>('42');
  const [customArrayInput, setCustomArrayInput] = useState<string>('4, 8, 15, 23, 42, 56, 77, 89, 94');

  // Modes & Modals
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [customizeModeEnabled, setCustomizeModeEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active steps dataset
  const [activeSteps, setActiveSteps] = useState<BinarySearchStep[]>([]);

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
    } = useStepPlayer<BinarySearchStep>({ steps: activeSteps });

  // Publish active context to Octa AI Tutor
  useEffect(() => {
    const algObj = ALGORITHMS_LIST.find((a) => a.id === category);

    setTutorContext({
      algorithmName: algObj?.name || category,
      algorithmId: category,
      category: 'binarySearch',
      currentStepDescription: currentStep?.explanation || '',
      currentStepIndex,
      totalSteps,
      currentStep,
      steps: activeSteps,
      onSetInput: (newArr: number[]) => {
        reset();
        setArray(newArr);
        setCustomArrayInput(newArr.join(', '));
      },
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
    () => buildBinarySearchCheckpoints(activeSteps, category),
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
    module: 'binarySearch',
    algorithmId: category,
    revisionData: buildRevisionData(category),
  });

  // Handle Category Switching
  const handleSelectCategory = (cat: BinarySearchCategory) => {
    setCategory(cat);
    reset();
    quizSession.resetSession();

    if (cat === 'searchRotatedArray') {
      const rotated = [30, 45, 60, 75, 5, 12, 18, 24];
      setArray(rotated);
      setCustomArrayInput(rotated.join(', '));
      setTargetInput('18');
      const steps = generateRotatedSearchSteps(rotated, 18);
      setActiveSteps(steps);
    } else if (cat === 'findPeakElement') {
      const peakArr = [1, 3, 20, 4, 1, 0];
      setArray(peakArr);
      setCustomArrayInput(peakArr.join(', '));
      setTargetInput('0');
      const steps = generatePeakElementSteps(peakArr);
      setActiveSteps(steps);
    } else {
      const sorted = [4, 8, 15, 23, 42, 56, 77, 89, 94];
      setArray(sorted);
      setCustomArrayInput(sorted.join(', '));
      setTargetInput('42');
      const steps =
        cat === 'lowerBound'
          ? generateLowerBoundSteps(sorted, 42)
          : cat === 'upperBound'
          ? generateUpperBoundSteps(sorted, 42)
          : generateBinarySearchSteps(sorted, 42);
      setActiveSteps(steps);
    }
  };

  // ─── ACTION HANDLERS ────────────────────────────────────────────────────────

  const handleRunSearch = () => {
    const target = Number(targetInput) || 0;
    let steps: BinarySearchStep[] = [];

    if (category === 'lowerBound') {
      steps = generateLowerBoundSteps(array, target);
    } else if (category === 'upperBound') {
      steps = generateUpperBoundSteps(array, target);
    } else if (category === 'searchRotatedArray') {
      steps = generateRotatedSearchSteps(array, target);
    } else if (category === 'findPeakElement') {
      steps = generatePeakElementSteps(array);
    } else {
      steps = generateBinarySearchSteps(array, target);
    }

    setActiveSteps(steps);
    quizSession.resetSession();
  };

  const handleApplyCustomArray = () => {
    const parsed = customArrayInput
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n));

    if (parsed.length === 0) return;

    if (category !== 'searchRotatedArray' && category !== 'findPeakElement') {
      parsed.sort((a, b) => a - b);
    }

    setArray(parsed);
    setCustomArrayInput(parsed.join(', '));
    const target = Number(targetInput) || parsed[Math.floor(parsed.length / 2)];
    setTargetInput(String(target));

    const steps =
      category === 'lowerBound'
        ? generateLowerBoundSteps(parsed, target)
        : category === 'upperBound'
        ? generateUpperBoundSteps(parsed, target)
        : category === 'searchRotatedArray'
        ? generateRotatedSearchSteps(parsed, target)
        : category === 'findPeakElement'
        ? generatePeakElementSteps(parsed)
        : generateBinarySearchSteps(parsed, target);

    setActiveSteps(steps);
    quizSession.resetSession();
  };

  const handleRandomize = () => {
    if (category === 'searchRotatedArray') {
      /* Unique sorted values rotated at a random pivot — a genuinely
         fresh rotation every run (this also powers the transfer
         challenge, where a fixed array could be answered from memory). */
      const len = 7 + Math.floor(Math.random() * 3);
      const unique = new Set<number>();
      while (unique.size < len) unique.add(Math.floor(Math.random() * 95) + 5);
      const sorted = Array.from(unique).sort((a, b) => a - b);
      const pivot = Math.floor(Math.random() * (len - 2)) + 1;
      const rotated = [...sorted.slice(pivot), ...sorted.slice(0, pivot)];
      setArray(rotated);
      setCustomArrayInput(rotated.join(', '));
      const target = rotated[Math.floor(Math.random() * rotated.length)];
      setTargetInput(String(target));
      setActiveSteps(generateRotatedSearchSteps(rotated, target));
    } else if (category === 'findPeakElement') {
      /* Random mountain: one dominant peak at a random index. */
      const len = 6 + Math.floor(Math.random() * 2);
      const peakIdx = Math.floor(Math.random() * (len - 2)) + 1;
      const peakArr = Array.from(
        { length: len },
        (_, i) => (i === peakIdx ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 5)
      );
      setArray(peakArr);
      setCustomArrayInput(peakArr.join(', '));
      setActiveSteps(generatePeakElementSteps(peakArr));
    } else {
      const randomVals = Array.from({ length: 9 }, () => Math.floor(Math.random() * 95) + 5).sort(
        (a, b) => a - b
      );
      setArray(randomVals);
      setCustomArrayInput(randomVals.join(', '));
      const target = randomVals[Math.floor(Math.random() * randomVals.length)];
      setTargetInput(String(target));
      const steps =
        category === 'lowerBound'
          ? generateLowerBoundSteps(randomVals, target)
          : category === 'upperBound'
          ? generateUpperBoundSteps(randomVals, target)
          : generateBinarySearchSteps(randomVals, target);
      setActiveSteps(steps);
    }
    quizSession.resetSession();
  };

  const handleReset = () => {
    handleSelectCategory(category);
  };

  const handleEmpty = () => {
    setArray([]);
    setCustomArrayInput('');
    setActiveSteps([]);
    reset();
    quizSession.resetSession();
  };

  const handleSample = () => {
    handleSelectCategory(category);
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     Fresh array + target, predicted cold. startChallenge() must fire in
     the same handler as the input change so the armed challenge survives
     the checkpoint reset the new execution triggers. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    reset();
    handleRandomize();
  };

  const snippetKey =
    category === 'lowerBound'
      ? 'lowerBound'
      : category === 'searchRotatedArray'
      ? 'searchRotatedArray'
      : 'binarySearch';

  const currentTarget = Number(targetInput) || 0;

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
      {/* Target Input */}
      <div className="bs-input-group">
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px' }}>
          Target:
        </span>
        <input
          type="text"
          className="bs-input"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
        />
      </div>

      {/* Array Input */}
      <div className="bs-input-group" style={{ minWidth: '220px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px' }}>
          Arr:
        </span>
        <input
          type="text"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text)',
            fontSize: '0.8rem',
            width: '100%',
            fontFamily: 'monospace',
          }}
          value={customArrayInput}
          onChange={(e) => setCustomArrayInput(e.target.value)}
          onBlur={handleApplyCustomArray}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomArray()}
        />
      </div>

      <button
        className="ll-btn ll-btn-primary"
        onClick={handleRunSearch}
        style={{ background: '#38bdf8', color: '#0f172a' }}
      >
        <Play size={14} />
        <span>Search</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleRandomize}>
        <Shuffle size={14} />
        <span>Random</span>
      </button>

      <button className="ll-btn ll-btn-secondary" onClick={handleReset}>
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

  return (
    <div className="bs-container">
      <VisualizerHeader
        icon={<Search size={22} />}
        title="Binary Search Studio"
        subtitle="Interactive Logarithmic Search, Bounds, & Pivoted Rotations"
        items={ALGORITHMS_LIST.map((alg) => ({ id: alg.id, name: alg.name, description: alg.description, group: alg.group }))}
        activeId={category}
        onSelect={(id) => handleSelectCategory(id as BinarySearchCategory)}
        placeholder="Search algorithm or pattern..."
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
              title="Full Screen Canvas"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </VisualizerActions>
        }
      />



      {/* ─── ACTION TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="bs-toolbar">
        <div className="bs-toolbar-actions">
          {renderToolbarControls()}
        </div>
      </div>

      {/* ─── MAIN WORKSPACE ──────────────────────────────────────────────────── */}
      <div className="bs-workspace scene-workspace">
        <div className="renderer-section">
          <div className="bs-canvas-card">
            <div className="bs-canvas-header">
              <div className="ll-canvas-title">
                <Sparkles size={16} color="#38bdf8" />
                <span>
                  {category.toUpperCase()} CANVAS {currentStep ? `• Phase: ${currentStep.phase}` : ''}
                </span>
              </div>
              <button
                className="bst-btn btn-fullscreen"
                onClick={() => setIsFullScreenOpen(true)}
                title="Full Screen Canvas"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            <BinarySearchRenderer step={currentStep} array={array} target={currentTarget} />
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
        <ResizablePanelRow
          storageKey="binarySearch"
          customizeModeEnabled={customizeModeEnabled}
          debuggerPanel={showDebugger ? (
            <MultiLanguageCodePanel
              algorithmKey={category}
              title="Binary Search"
              categoryId="binarySearch"
              topicId={category}
              snippets={BINARY_SEARCH_SNIPPETS[snippetKey]}
              activeLine={currentStep?.codeLine}
              variables={{
                target: currentTarget,
                left: currentStep?.left ?? null,
                mid: currentStep?.mid ?? null,
                right: currentStep?.right ?? null,
              }}
            />
          ) : null}

          explanationPanel={<ExplanationPanel
            description={maskNarration(currentStep?.explanation || 'Click Search to observe step-by-step execution.', quizSession.phase)}
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
        title={`Binary Search Studio | ${category.toUpperCase()}`}
        subtitle="Interactive Logarithmic Search Inspector"
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
        <BinarySearchRenderer step={currentStep} array={array} target={currentTarget} />
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="binarySearch" activeTopic={category} />

    </div>
  );
};
