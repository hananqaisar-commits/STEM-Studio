import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  HelpCircle,
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
import { buildBinarySearchCheckpoints } from './quizAdapter';
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
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import './BinarySearch.css';

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
  const [category, setCategory] = useState<BinarySearchCategory>('binarySearch');

  const [array, setArray] = useState<number[]>([4, 8, 15, 23, 42, 56, 77, 89, 94]);
  const [targetInput, setTargetInput] = useState<string>('42');
  const [customArrayInput, setCustomArrayInput] = useState<string>('4, 8, 15, 23, 42, 56, 77, 89, 94');

  // Modes & Modals
  const [quizEnabled, setQuizEnabled] = useState<boolean>(true);
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
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
    setSpeed,
  } = useStepPlayer<BinarySearchStep>({ steps: activeSteps });

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
      const sorted = Array.from({ length: 8 }, (_, i) => (i + 1) * 10);
      const pivot = 3;
      const rotated = [...sorted.slice(pivot), ...sorted.slice(0, pivot)];
      setArray(rotated);
      setCustomArrayInput(rotated.join(', '));
      const target = rotated[Math.floor(Math.random() * rotated.length)];
      setTargetInput(String(target));
      setActiveSteps(generateRotatedSearchSteps(rotated, target));
    } else if (category === 'findPeakElement') {
      const peakArr = [2, 8, 25, 45, 14, 9, 3];
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

  const snippetKey =
    category === 'lowerBound'
      ? 'lowerBound'
      : category === 'searchRotatedArray'
      ? 'searchRotatedArray'
      : 'binarySearch';

  const currentTarget = Number(targetInput) || 0;

  const renderPlayerControls = () => (
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
        </div>
        <span className="step-counter">Step {currentStepIndex + 1} / {totalSteps}</span>
      </div>

      <div className="player-right">
        <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
      </div>
    </div>
  );

  const renderFloatingControls = () => (
    <div className="fs-floating-controls">
      <div className="bst-input-group">
        <span>Target:</span>
        <input
          type="text"
          className="bst-input"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
        />
      </div>

      <button className="bst-btn btn-insert" onClick={handleRunSearch}>
        <Play size={14} />
        <span>Search</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleRandomize}>
        <Shuffle size={14} />
        <span>Random</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleReset}>
        <RotateCcw size={14} />
        <span>Reset</span>
      </button>

      {/* dataset-mode-selector */}
      <div className="dataset-mode-selector ml-1">
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

      <button
        className={`quiz-mode-btn ${quizEnabled ? 'is-active' : ''}`}
        onClick={() => setQuizEnabled((prev) => !prev)}
        title="Toggle Quiz Mode"
        style={{ marginLeft: '0.5rem' }}
      >
        <HelpCircle size={16} />
        <span>Quiz Mode</span>
      </button>
    </div>
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
      />

      {/* ─── CATEGORY TABS ───────────────────────────────────────────────────── */}
      <div className="bs-tabs-bar">
        {ALGORITHMS_LIST.map((alg) => (
          <button
            key={alg.id}
            className={`bs-tab-btn ${category === alg.id ? 'active' : ''}`}
            onClick={() => handleSelectCategory(alg.id)}
          >
            {alg.id === 'searchRotatedArray' ? (
              <Compass size={14} />
            ) : alg.id === 'findPeakElement' ? (
              <TrendingUp size={14} />
            ) : (
              <Search size={14} />
            )}
            <span>{alg.name}</span>
          </button>
        ))}
      </div>

      {/* ─── ACTION TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="bs-toolbar">
        <div className="bs-toolbar-actions">
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
        </div>

        {/* Mode Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={`ll-btn ${quizEnabled ? 'll-btn-primary' : 'll-btn-secondary'}`}
            onClick={() => setQuizEnabled(!quizEnabled)}
            style={quizEnabled ? { background: '#38bdf8', color: '#0f172a' } : {}}
          >
            <HelpCircle size={14} />
            <span>Quiz Mode</span>
          </button>

          <button
            className="ll-btn ll-btn-secondary"
            onClick={() => setIsFullScreenOpen(true)}
            title="Full Screen Canvas"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE ──────────────────────────────────────────────────── */}
      <div className="bs-workspace">
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

          {renderPlayerControls()}
        </div>

        {/* Right Column: Code & Explanation */}
        <div className="explanation-section">
          <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />

          <MultiLanguageCodePanel
            algorithmKey={category}
            title="Binary Search"
            snippets={BINARY_SEARCH_SNIPPETS[snippetKey]}
            activeLine={currentStep?.codeLine}
            variables={{
              target: currentTarget,
              left: currentStep?.left ?? null,
              mid: currentStep?.mid ?? null,
              right: currentStep?.right ?? null,
            }}
          />

          <ExplanationPanel
            description={maskNarration(currentStep?.explanation || 'Click Search to observe step-by-step execution.', quizSession.phase)}
          />
        </div>
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Binary Search Studio | ${category.toUpperCase()}`}
        subtitle="Interactive Logarithmic Search Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
      >
        <BinarySearchRenderer step={currentStep} array={array} target={currentTarget} />
      </FullScreenCanvasModal>
    </div>
  );
};
