import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
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
import { BinarySearchCodePanel } from './BinarySearchCodePanel';
import { BinarySearchPredictionQuiz } from './BinarySearchPredictionQuiz';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const [array, setArray] = useState<number[]>([4, 8, 15, 23, 42, 56, 77, 89, 94]);
  const [targetInput, setTargetInput] = useState<string>('42');
  const [customArrayInput, setCustomArrayInput] = useState<string>('4, 8, 15, 23, 42, 56, 77, 89, 94');

  // Modes & Modals
  const [isPredictMode, setIsPredictMode] = useState<boolean>(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active steps dataset
  const [activeSteps, setActiveSteps] = useState<BinarySearchStep[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Handle Category Switching
  const handleSelectCategory = (cat: BinarySearchCategory) => {
    setCategory(cat);
    setIsSearchOpen(false);
    reset();

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
  };

  const handleReset = () => {
    handleSelectCategory(category);
  };

  const filteredAlgorithms = ALGORITHMS_LIST.filter(
    (alg) =>
      alg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alg.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const snippetKey =
    category === 'lowerBound'
      ? 'lowerBound'
      : category === 'searchRotatedArray'
      ? 'searchRotatedArray'
      : 'binarySearch';

  const currentTarget = Number(targetInput) || 0;

  return (
    <div className="bs-container">
      {/* ─── TOP HEADER ──────────────────────────────────────────────────────── */}
      <header className="bs-header">
        <div className="bs-title-group">
          <div className="bs-title-icon">
            <Search size={22} />
          </div>
          <div className="bs-title-text">
            <h1>Binary Search Studio</h1>
            <p>Interactive Logarithmic Search, Bounds, & Pivoted Rotations</p>
          </div>
        </div>

        {/* Spotlight Command Palette Search */}
        <div className="bs-search-wrapper" ref={searchContainerRef}>
          <div className="bs-search-input-box" onClick={() => setIsSearchOpen(true)}>
            <Search size={15} className="text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              className="bs-search-input"
              placeholder="Search algorithm or pattern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
            />
            <kbd className="ll-shortcut-badge">⌘K</kbd>
          </div>

          {isSearchOpen && (
            <div className="bs-search-dropdown">
              {filteredAlgorithms.map((alg) => (
                <div
                  key={alg.id}
                  className={`bs-search-item ${category === alg.id ? 'active' : ''}`}
                  onClick={() => handleSelectCategory(alg.id)}
                >
                  <div>
                    <div className="ll-item-name">{alg.name}</div>
                    <div className="ll-item-desc">{alg.description}</div>
                  </div>
                  <span className="ll-shortcut-badge">{alg.group}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
              Arr:
            </span>
            <input
              type="text"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
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
        </div>

        {/* Mode Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={`ll-btn ${isPredictMode ? 'll-btn-primary' : 'll-btn-secondary'}`}
            onClick={() => setIsPredictMode(!isPredictMode)}
            style={isPredictMode ? { background: '#38bdf8', color: '#0f172a' } : {}}
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
        {/* Visualizer Canvas & Controls Card */}
        <div className="bs-canvas-card">
          <div className="bs-canvas-header">
            <div className="ll-canvas-title">
              <Sparkles size={16} color="#38bdf8" />
              <span>
                {category.toUpperCase()} CANVAS {currentStep ? `• Phase: ${currentStep.phase}` : ''}
              </span>
            </div>
            {totalSteps > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            )}
          </div>

          {/* Interactive Prediction Quiz Banner */}
          {isPredictMode && currentStep?.isQuizPoint && currentStep.quizData && (
            <div style={{ padding: '1rem 1.25rem 0' }}>
              <BinarySearchPredictionQuiz
                quizData={currentStep.quizData}
                onCorrectAnswer={() => stepForward()}
              />
            </div>
          )}

          {/* Visual Canvas Renderer */}
          <BinarySearchRenderer step={currentStep} array={array} target={currentTarget} />

          {/* Playback Controls & Speed */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlayPauseButton isPlaying={isPlaying} onPlay={play} onPause={pause} />
              <StepControls
                onStepBack={stepBack}
                onStepForward={stepForward}
                onReset={reset}
                canStepBack={currentStepIndex > 0}
                canStepForward={currentStepIndex < totalSteps - 1}
              />
            </div>

            <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
          </div>

          {/* Explanation Panel */}
          {currentStep && (
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <ExplanationPanel
                stepNumber={currentStepIndex + 1}
                totalSteps={totalSteps}
                explanation={currentStep.explanation}
              />
            </div>
          )}
        </div>

        {/* Multi-Language Code Panel */}
        <div style={{ height: '100%' }}>
          <BinarySearchCodePanel
            snippetKey={snippetKey}
            activeLine={currentStep?.codeLine}
            left={currentStep?.left}
            mid={currentStep?.mid}
            right={currentStep?.right}
            target={currentTarget}
          />
        </div>
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title="Binary Search Full-Screen Studio"
      >
        <BinarySearchRenderer step={currentStep} array={array} target={currentTarget} />
      </FullScreenCanvasModal>
    </div>
  );
};
