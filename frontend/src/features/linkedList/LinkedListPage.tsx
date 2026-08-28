import React, {useState, useMemo, useEffect} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Link2,
  Plus,
  Trash2,
  RotateCcw,
  HelpCircle,
  Maximize2,
  Sparkles,
  Shuffle,
  RefreshCw,
  GitCommit,
  GitBranch,
  Layers,
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildLinkedListCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';
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
import { LINKED_LIST_SNIPPETS } from './linkedListSnippets';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import './LinkedList.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';
import { parseNumberList } from '../../utils/batchInputParser';

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
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS_LIST.some((a) => a.id === topic)) {
      setCategory(topic as LinkedListCategory);
    }
  }, [searchParams]);

  const [inputValue, setInputValue] = useState<string>('10, 20, 30, 40');
  const [inputError, setInputError] = useState<string | null>(null);

  // Interactive & Quiz Modes
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active step dataset
  const [activeSteps, setActiveSteps] = useState<LinkedListStep[]>([]);
  const [baseNodes, setBaseNodes] = useState<ListNodeItem[]>(() =>
    createInitialNodes([10, 20, 30, 40], 'singly')
  );

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
    } = useStepPlayer<LinkedListStep>({ steps: activeSteps });

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
    () => buildLinkedListCheckpoints(activeSteps, category),
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
    module: 'linkedList',
    algorithmId: category,
    revisionData: buildRevisionData(category),
  });

  // Handle Category Switching
  const handleSelectCategory = (cat: LinkedListCategory) => {
    setCategory(cat);
    reset();
    quizSession.resetSession();

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

  // ─── ACTION HANDLERS (UNIVERSAL BATCH SEQUENTIAL EXECUTION) ─────────────────

  const handleInsertHead = () => {
    const res = parseNumberList(inputValue);
    const rawValues: (number | string)[] = res.isValid && res.values.length > 0
      ? res.values
      : inputValue.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

    if (rawValues.length === 0) {
      setInputError('Please enter at least one value');
      return;
    }
    setInputError(null);

    let current = [...baseNodes];
    const allSteps: LinkedListStep[] = [];

    for (const val of rawValues) {
      const opSteps =
        category === 'doubly'
          ? generateDoublyInsertHeadSteps(current, val)
          : generateInsertHeadSteps(current, val);
      allSteps.push(...opSteps);
      if (opSteps.length > 0) {
        current = opSteps[opSteps.length - 1].nodes;
      }
    }

    setBaseNodes(current);
    setActiveSteps(allSteps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleInsertTail = () => {
    const res = parseNumberList(inputValue);
    const rawValues: (number | string)[] = res.isValid && res.values.length > 0
      ? res.values
      : inputValue.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

    if (rawValues.length === 0) {
      setInputError('Please enter at least one value');
      return;
    }
    setInputError(null);

    let current = [...baseNodes];
    const allSteps: LinkedListStep[] = [];

    for (const val of rawValues) {
      const opSteps = generateInsertTailSteps(current, val);
      allSteps.push(...opSteps);
      if (opSteps.length > 0) {
        current = opSteps[opSteps.length - 1].nodes;
      }
    }

    setBaseNodes(current);
    setActiveSteps(allSteps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleBuildList = () => {
    const res = parseNumberList(inputValue);
    const rawValues: (number | string)[] = res.isValid && res.values.length > 0
      ? res.values
      : inputValue.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

    if (rawValues.length === 0) {
      setInputError('Please enter at least one value');
      return;
    }
    setInputError(null);

    let current: ListNodeItem[] = [];
    const allSteps: LinkedListStep[] = [];

    for (const val of rawValues) {
      const opSteps =
        category === 'doubly'
          ? generateInsertTailSteps(current, val)
          : generateInsertTailSteps(current, val);
      allSteps.push(...opSteps);
      if (opSteps.length > 0) {
        current = opSteps[opSteps.length - 1].nodes;
      }
    }

    setBaseNodes(current);
    setActiveSteps(allSteps);
    reset();
    quizSession.resetSession();
    play();
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

  const handleEmpty = () => {
    const emptyNodes = createInitialNodes([0], category === 'doubly' ? 'doubly' : 'singly');
    setBaseNodes(emptyNodes);
    setActiveSteps([]);
    reset();
    quizSession.resetSession();
  };

  const handleSample = () => {
    const sampleNodes = createInitialNodes([10, 20, 30, 40], category === 'doubly' ? 'doubly' : 'singly');
    setBaseNodes(sampleNodes);
    setActiveSteps([]);
    reset();
    quizSession.resetSession();
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     Fresh node values AND the operation steps generated immediately —
     unlike handleRandomize, which empties the canvas until the student
     runs an operation (that second input change would disarm the
     challenge). */
  const handleProveIt = () => {
    quizSession.startChallenge();
    reset();
    const randomVals = Array.from(
      { length: category === 'middleNode' ? 5 : 4 },
      () => Math.floor(Math.random() * 90) + 10
    );
    if (category === 'reverse') {
      const nodes = createInitialNodes(randomVals, 'singly');
      setBaseNodes(nodes);
      setActiveSteps(generateReverseSteps(nodes));
    } else if (category === 'middleNode') {
      const nodes = createInitialNodes(randomVals, 'singly');
      setBaseNodes(nodes);
      setActiveSteps(generateMiddleNodeSteps(nodes));
    } else if (category === 'detectCycle') {
      const nodes = createInitialNodes(randomVals, 'singly', 2);
      setBaseNodes(nodes);
      setActiveSteps(generateCycleDetectionSteps(nodes, 2));
    } else {
      const kind = category === 'doubly' ? 'doubly' : category === 'circular' ? 'circular' : 'singly';
      const nodes = createInitialNodes(randomVals, kind);
      setBaseNodes(nodes);
      setActiveSteps(
        kind === 'doubly'
          ? generateDoublyInsertHeadSteps(nodes, randomVals[0])
          : generateInsertHeadSteps(nodes, randomVals[0])
      );
    }
  };

  const snippetKey =
    category === 'reverse'
      ? 'reverse'
      : category === 'detectCycle'
      ? 'detect_cycle'
      : category === 'middleNode'
      ? 'middle_node'
      : 'singly_insert_head';

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

  const renderFloatingControls = () => (
    <div className="fs-floating-controls">
      <div className="bst-input-group">
        <span>Values:</span>
        <input
          type="text"
          className="bst-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. 10, 20, 30"
          style={{ width: '130px' }}
        />
      </div>

      <button className="bst-btn btn-insert" onClick={handleBuildList} title="Build complete list sequentially">
        <Sparkles size={14} />
        <span>Build</span>
      </button>

      <button className="bst-btn btn-insert" onClick={handleInsertTail}>
        <Plus size={14} />
        <span>Tail</span>
      </button>

      <button className="bst-btn btn-insert" onClick={handleInsertHead}>
        <Plus size={14} />
        <span>Head</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleDeleteHead}>
        <Trash2 size={14} />
        <span>Delete</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleReverse}>
        <RotateCcw size={14} />
        <span>Reverse</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleCycleDetect}>
        <RefreshCw size={14} />
        <span>Cycle</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleFindMiddle}>
        <Sparkles size={14} />
        <span>Mid</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleRandomize}>
        <Shuffle size={14} />
        <span>Random</span>
      </button>

      <button className="bst-btn btn-search" onClick={handleResetList}>
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
    <div className="linked-list-container">
      <VisualizerHeader
        icon={<Link2 size={22} />}
        title="Linked List Visualizer"
        subtitle="Interactive Pointer Manipulations, Reversals, & Cycle Detection"
        items={ALGORITHMS_LIST.map((alg) => ({ id: alg.id, name: alg.name, description: alg.description, group: alg.group }))}
        activeId={category}
        onSelect={(id) => handleSelectCategory(id as LinkedListCategory)}
        placeholder="Search algorithm, operation, or concept..."
      />

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
          {/* Batch Custom Input */}
          <div className="ll-input-group" title="Enter comma-separated values (e.g. 10, 20, 30, 40)">
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px', fontWeight: 600 }}>
              Values:
            </span>
            <input
              type="text"
              className="ll-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="e.g. 10, 20, 30, 40"
              style={{ width: '160px' }}
            />
          </div>

          <button className="ll-btn ll-btn-primary" onClick={handleBuildList} title="Build complete list sequentially">
            <Sparkles size={14} />
            <span>Build List</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleInsertTail} title="Insert values at tail sequentially">
            <Plus size={14} />
            <span>Insert Tail</span>
          </button>

          <button className="ll-btn ll-btn-secondary" onClick={handleInsertHead} title="Insert values at head sequentially">
            <Plus size={14} />
            <span>Insert Head</span>
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
      <div className="ll-workspace scene-workspace">
        <div className="renderer-section">
          <div className="ll-canvas-card">
            <div className="ll-canvas-header">
              <div className="ll-canvas-title">
                <Link2 size={16} className="text-accent" />
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

            <LinkedListRenderer step={currentStep} nodes={baseNodes} />
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
        <div className="bottom-row">
          <MultiLanguageCodePanel
            algorithmKey={category}
            title="Linked List"
            snippets={LINKED_LIST_SNIPPETS[snippetKey]}
            activeLine={currentStep?.codeLine}
            variables={{
              nodes_count: currentStep ? currentStep.nodes.length : baseNodes.length,
              ...(currentStep?.pointers ?? {}),
            }}
          />

          <ExplanationPanel
            description={maskNarration(currentStep?.explanation || 'Run an operation to observe step-by-step execution.', quizSession.phase)}
            steps={activeSteps}
            currentStepIndex={currentStepIndex}
          />
        </div>
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Linked List Visualizer | ${category.toUpperCase()}`}
        subtitle="Interactive Pointer Inspector"
        toolbarControls={renderFloatingControls()}
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
        <LinkedListRenderer step={currentStep} nodes={baseNodes} />
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="linkedList" activeTopic={category} />

    </div>
  );
};
