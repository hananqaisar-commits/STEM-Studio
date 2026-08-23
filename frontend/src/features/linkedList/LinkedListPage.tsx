import React, { useState, useEffect, useRef } from 'react';
import {
  Link2,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  HelpCircle,
  Maximize2,
  Sparkles,
  Shuffle,
  RefreshCw,
  GitCommit,
  GitBranch,
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import {
  createInitialNodes,
  generateInsertHeadSteps,
  generateInsertTailSteps,
  generateDeleteHeadSteps,
  generateReverseSteps,
  generateCycleDetectionSteps,
  generateMiddleNodeSteps,
  generateDoublyInsertHeadSteps,
  type ListNodeItem,
  type LinkedListCategory,
  type LinkedListStep,
} from './linkedListEngine';
import { LinkedListRenderer } from './LinkedListRenderer';
import { LinkedListCodePanel } from './LinkedListCodePanel';
import { LinkedListPredictionQuiz } from './LinkedListPredictionQuiz';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import './LinkedList.css';

interface AlgorithmMeta {
  id: LinkedListCategory;
  name: string;
  group: 'Singly' | 'Doubly' | 'Circular' | 'Two-Pointers';
  description: string;
}

const ALGORITHMS_LIST: AlgorithmMeta[] = [
  { id: 'singly', name: 'Singly Linked List', group: 'Singly', description: 'Insert, delete, and traverse standard forward-linked list' },
  { id: 'reverse', name: 'Reverse Linked List', group: 'Singly', description: 'Classic 3-pointer (prev, curr, next) pointer reversal' },
  { id: 'middleNode', name: 'Find Middle Node', group: 'Two-Pointers', description: 'Fast & slow pointer technique to locate center element' },
  { id: 'detectCycle', name: 'Cycle Detection (Floyd)', group: 'Two-Pointers', description: "Floyd's Tortoise & Hare meeting point and cycle origin" },
  { id: 'doubly', name: 'Doubly Linked List', group: 'Doubly', description: 'Bidirectional nodes with forward and backward pointers' },
  { id: 'circular', name: 'Circular Linked List', group: 'Circular', description: 'Ring-buffered list where tail.next loops to head' },
];

export const LinkedListPage: React.FC = () => {
  const [category, setCategory] = useState<LinkedListCategory>('singly');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('42');

  // Interactive & Quiz Modes
  const [isPredictMode, setIsPredictMode] = useState<boolean>(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active step dataset
  const [activeSteps, setActiveSteps] = useState<LinkedListStep[]>([]);
  const [baseNodes, setBaseNodes] = useState<ListNodeItem[]>(() =>
    createInitialNodes([10, 20, 30, 40], 'singly')
  );

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
  } = useStepPlayer<LinkedListStep>({ steps: activeSteps });

  // Handle Category Switching
  const handleSelectCategory = (cat: LinkedListCategory) => {
    setCategory(cat);
    setIsSearchOpen(false);
    reset();

    if (cat === 'doubly') {
      const dNodes = createInitialNodes([15, 25, 35, 45], 'doubly');
      setBaseNodes(dNodes);
      setActiveSteps([]);
    } else if (cat === 'circular') {
      const cNodes = createInitialNodes([12, 24, 36, 48], 'circular');
      setBaseNodes(cNodes);
      setActiveSteps([]);
    } else if (cat === 'detectCycle') {
      const cycleNodes = createInitialNodes([10, 20, 30, 40, 50], 'singly', 2);
      setBaseNodes(cycleNodes);
      const steps = generateCycleDetectionSteps(cycleNodes, 2);
      setActiveSteps(steps);
    } else if (cat === 'reverse') {
      const rNodes = createInitialNodes([1, 2, 3, 4, 5], 'singly');
      setBaseNodes(rNodes);
      const steps = generateReverseSteps(rNodes);
      setActiveSteps(steps);
    } else if (cat === 'middleNode') {
      const mNodes = createInitialNodes([10, 20, 30, 40, 50, 60], 'singly');
      setBaseNodes(mNodes);
      const steps = generateMiddleNodeSteps(mNodes);
      setActiveSteps(steps);
    } else {
      const sNodes = createInitialNodes([10, 20, 30, 40], 'singly');
      setBaseNodes(sNodes);
      setActiveSteps([]);
    }
  };

  // ─── ACTION HANDLERS ────────────────────────────────────────────────────────

  const handleInsertHead = () => {
    const val = isNaN(Number(inputValue)) ? inputValue.trim() : Number(inputValue);
    const steps =
      category === 'doubly'
        ? generateDoublyInsertHeadSteps(baseNodes, val)
        : generateInsertHeadSteps(baseNodes, val);
    setActiveSteps(steps);
  };

  const handleInsertTail = () => {
    const val = isNaN(Number(inputValue)) ? inputValue.trim() : Number(inputValue);
    const steps = generateInsertTailSteps(baseNodes, val);
    setActiveSteps(steps);
  };

  const handleDeleteHead = () => {
    const steps = generateDeleteHeadSteps(baseNodes);
    setActiveSteps(steps);
  };

  const handleReverse = () => {
    const steps = generateReverseSteps(baseNodes);
    setActiveSteps(steps);
  };

  const handleCycleDetect = () => {
    const cycleNodes = createInitialNodes(
      baseNodes.map((n) => n.value),
      'singly',
      2
    );
    const steps = generateCycleDetectionSteps(cycleNodes, 2);
    setActiveSteps(steps);
  };

  const handleFindMiddle = () => {
    const steps = generateMiddleNodeSteps(baseNodes);
    setActiveSteps(steps);
  };

  const handleRandomize = () => {
    const randomVals = Array.from({ length: 5 }, () => Math.floor(Math.random() * 90) + 10);
    const newNodes = createInitialNodes(randomVals, category === 'doubly' ? 'doubly' : 'singly');
    setBaseNodes(newNodes);
    setActiveSteps([]);
  };

  const handleResetList = () => {
    const defaultNodes = createInitialNodes([10, 20, 30, 40], category === 'doubly' ? 'doubly' : 'singly');
    setBaseNodes(defaultNodes);
    setActiveSteps([]);
    reset();
  };

  const filteredAlgorithms = ALGORITHMS_LIST.filter(
    (alg) =>
      alg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alg.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const snippetKey =
    category === 'reverse'
      ? 'reverse'
      : category === 'detectCycle'
      ? 'detect_cycle'
      : category === 'middleNode'
      ? 'middle_node'
      : 'singly_insert_head';

  return (
    <div className="linked-list-container">
      {/* ─── TOP HEADER ──────────────────────────────────────────────────────── */}
      <header className="ll-header">
        <div className="ll-title-group">
          <div className="ll-title-icon">
            <Link2 size={22} />
          </div>
          <div className="ll-title-text">
            <h1>Linked List Visualizer</h1>
            <p>Interactive Pointer Manipulations, Reversals, & Cycle Detection</p>
          </div>
        </div>

        {/* Spotlight Command Palette Search */}
        <div className="ll-search-wrapper" ref={searchContainerRef}>
          <div className="ll-search-input-box" onClick={() => setIsSearchOpen(true)}>
            <Search size={15} className="text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              className="ll-search-input"
              placeholder="Search algorithm, operation, or concept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
            />
            <kbd className="ll-shortcut-badge">⌘K</kbd>
          </div>

          {isSearchOpen && (
            <div className="ll-search-dropdown">
              {filteredAlgorithms.map((alg) => (
                <div
                  key={alg.id}
                  className={`ll-search-item ${category === alg.id ? 'active' : ''}`}
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
      <div className="ll-tabs-bar">
        {ALGORITHMS_LIST.map((alg) => (
          <button
            key={alg.id}
            className={`ll-tab-btn ${category === alg.id ? 'active' : ''}`}
            onClick={() => handleSelectCategory(alg.id)}
          >
            {alg.id === 'doubly' ? (
              <GitBranch size={14} />
            ) : alg.id === 'reverse' ? (
              <RotateCcw size={14} />
            ) : (
              <GitCommit size={14} />
            )}
            <span>{alg.name}</span>
          </button>
        ))}
      </div>

      {/* ─── ACTION TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="ll-toolbar">
        <div className="ll-toolbar-actions">
          {/* Custom Input */}
          <div className="ll-input-group">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
              Val:
            </span>
            <input
              type="text"
              className="ll-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>

          <button className="ll-btn ll-btn-primary" onClick={handleInsertHead}>
            <Plus size={14} />
            <span>Insert Head</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleInsertTail}>
            <Plus size={14} />
            <span>Insert Tail</span>
          </button>

          <button className="ll-btn ll-btn-danger" onClick={handleDeleteHead}>
            <Trash2 size={14} />
            <span>Delete Head</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleReverse}>
            <RotateCcw size={14} />
            <span>Reverse</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleCycleDetect}>
            <RefreshCw size={14} />
            <span>Detect Cycle</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleFindMiddle}>
            <Sparkles size={14} />
            <span>Find Mid</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleRandomize}>
            <Shuffle size={14} />
            <span>Random</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleResetList}>
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        {/* Mode Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={`ll-btn ${isPredictMode ? 'll-btn-primary' : 'll-btn-secondary'}`}
            onClick={() => setIsPredictMode(!isPredictMode)}
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
      <div className="ll-workspace">
        {/* Visualizer Canvas & Controls Card */}
        <div className="ll-canvas-card">
          <div className="ll-canvas-header">
            <div className="ll-canvas-title">
              <Link2 size={16} className="text-accent" />
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
              <LinkedListPredictionQuiz
                quizData={currentStep.quizData}
                onCorrectAnswer={() => stepForward()}
              />
            </div>
          )}

          {/* Canvas Renderer */}
          <LinkedListRenderer step={currentStep} nodes={baseNodes} />

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
          <LinkedListCodePanel
            snippetKey={snippetKey}
            activeLine={currentStep?.codeLine}
            pointers={currentStep?.pointers}
            nodesCount={currentStep ? currentStep.nodes.length : baseNodes.length}
          />
        </div>
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title="Linked List Full-Screen Visualizer"
      >
        <LinkedListRenderer step={currentStep} nodes={baseNodes} />
      </FullScreenCanvasModal>
    </div>
  );
};
