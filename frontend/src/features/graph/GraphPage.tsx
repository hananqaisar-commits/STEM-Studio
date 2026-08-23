import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  RotateCcw,
  HelpCircle,
  Maximize2,
  Sparkles,
  Shuffle,
  Play,
  Waypoints,
  Network,
  GitMerge,
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import {
  getPresetGraph,
  generateBFSSteps,
  generateDFSSteps,
  generateDijkstraSteps,
  generatePrimsSteps,
  generateTopoSortSteps,
  type GraphCategory,
  type GraphStep,
  type GraphNode,
  type GraphEdge,
} from './graphEngine';
import { GraphRenderer } from './GraphRenderer';
import { GraphCodePanel } from './GraphCodePanel';
import { GraphPredictionQuiz } from './GraphPredictionQuiz';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import './Graph.css';

interface AlgorithmMeta {
  id: GraphCategory;
  name: string;
  group: 'Traversals' | 'Shortest Path' | 'MST' | 'Ordering';
  description: string;
}

const ALGORITHMS_LIST: AlgorithmMeta[] = [
  { id: 'bfs', name: 'Breadth-First Search (BFS)', group: 'Traversals', description: 'Level-by-level queue traversal across reachable nodes' },
  { id: 'dfs', name: 'Depth-First Search (DFS)', group: 'Traversals', description: 'Deep recursion call-stack exploration with backtracking' },
  { id: 'dijkstra', name: "Dijkstra's Shortest Path", group: 'Shortest Path', description: 'Greedy min-priority queue edge relaxation for optimal paths' },
  { id: 'prim', name: "Prim's Minimum Spanning Tree", group: 'MST', description: 'Greedy cut-set growing tree spanning all graph vertices' },
  { id: 'topoSort', name: 'Topological Sort (Kahn)', group: 'Ordering', description: 'Linear vertex dependency ordering using in-degree queue' },
];

export const GraphPage: React.FC = () => {
  const [category, setCategory] = useState<GraphCategory>('bfs');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const [startNode, setStartNode] = useState<string>('A');
  const [nodes, setNodes] = useState<GraphNode[]>(() => getPresetGraph('standard').nodes);
  const [edges, setEdges] = useState<GraphEdge[]>(() => getPresetGraph('standard').edges);

  // Modes & Modals
  const [isPredictMode, setIsPredictMode] = useState<boolean>(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active steps dataset
  const [activeSteps, setActiveSteps] = useState<GraphStep[]>([]);

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
  } = useStepPlayer<GraphStep>({ steps: activeSteps });

  // Handle Category Switching
  const handleSelectCategory = (cat: GraphCategory) => {
    setCategory(cat);
    setIsSearchOpen(false);
    reset();

    const topologyType = cat === 'topoSort' ? 'dag' : 'standard';
    const preset = getPresetGraph(topologyType);
    setNodes(preset.nodes);
    setEdges(preset.edges);

    let steps: GraphStep[] = [];
    if (cat === 'bfs') {
      steps = generateBFSSteps(preset.nodes, preset.edges, 'A');
    } else if (cat === 'dfs') {
      steps = generateDFSSteps(preset.nodes, preset.edges, 'A');
    } else if (cat === 'dijkstra') {
      steps = generateDijkstraSteps(preset.nodes, preset.edges, 'A', 'F');
    } else if (cat === 'prim') {
      steps = generatePrimsSteps(preset.nodes, preset.edges, 'A');
    } else if (cat === 'topoSort') {
      steps = generateTopoSortSteps(preset.nodes, preset.edges);
    }
    setActiveSteps(steps);
  };

  // Run Traversal on Demand
  const handleRunAlgorithm = () => {
    let steps: GraphStep[] = [];
    if (category === 'bfs') {
      steps = generateBFSSteps(nodes, edges, startNode);
    } else if (category === 'dfs') {
      steps = generateDFSSteps(nodes, edges, startNode);
    } else if (category === 'dijkstra') {
      steps = generateDijkstraSteps(nodes, edges, startNode, 'F');
    } else if (category === 'prim') {
      steps = generatePrimsSteps(nodes, edges, startNode);
    } else if (category === 'topoSort') {
      steps = generateTopoSortSteps(nodes, edges);
    }
    setActiveSteps(steps);
  };

  const handleRandomizeWeights = () => {
    const updatedEdges = edges.map((e) => ({
      ...e,
      weight: e.weight !== undefined ? Math.floor(Math.random() * 9) + 1 : undefined,
    }));
    setEdges(updatedEdges);

    if (category === 'dijkstra') {
      setActiveSteps(generateDijkstraSteps(nodes, updatedEdges, startNode, 'F'));
    } else if (category === 'prim') {
      setActiveSteps(generatePrimsSteps(nodes, updatedEdges, startNode));
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

  const snippetKey = category;

  return (
    <div className="graph-container">
      {/* ─── TOP HEADER ──────────────────────────────────────────────────────── */}
      <header className="graph-header">
        <div className="graph-title-group">
          <div className="graph-title-icon">
            <Share2 size={22} />
          </div>
          <div className="graph-title-text">
            <h1>Graph Algorithms Studio</h1>
            <p>Interactive Network Traversals, Shortest Paths, & Minimum Spanning Trees</p>
          </div>
        </div>

        {/* Spotlight Command Palette Search */}
        <div className="graph-search-wrapper" ref={searchContainerRef}>
          <div className="graph-search-input-box" onClick={() => setIsSearchOpen(true)}>
            <Share2 size={15} className="text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              className="graph-search-input"
              placeholder="Search graph algorithm, MST, or traversal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
            />
            <kbd className="ll-shortcut-badge">⌘K</kbd>
          </div>

          {isSearchOpen && (
            <div className="graph-search-dropdown">
              {filteredAlgorithms.map((alg) => (
                <div
                  key={alg.id}
                  className={`graph-search-item ${category === alg.id ? 'active' : ''}`}
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
      <div className="graph-tabs-bar">
        {ALGORITHMS_LIST.map((alg) => (
          <button
            key={alg.id}
            className={`graph-tab-btn ${category === alg.id ? 'active' : ''}`}
            onClick={() => handleSelectCategory(alg.id)}
          >
            {alg.id === 'dijkstra' ? (
              <Waypoints size={14} />
            ) : alg.id === 'topoSort' ? (
              <GitMerge size={14} />
            ) : (
              <Network size={14} />
            )}
            <span>{alg.name}</span>
          </button>
        ))}
      </div>

      {/* ─── ACTION TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="graph-toolbar">
        <div className="graph-toolbar-actions">
          {category !== 'topoSort' && (
            <div className="bs-input-group">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
                Start:
              </span>
              <select
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id} style={{ background: 'var(--bg-card)' }}>
                    Vertex {n.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="ll-btn ll-btn-primary"
            onClick={handleRunAlgorithm}
            style={{ background: '#c084fc', color: '#0f172a' }}
          >
            <Play size={14} />
            <span>Run Traversal</span>
          </button>

          {(category === 'dijkstra' || category === 'prim') && (
            <button className="ll-btn ll-btn-secondary" onClick={handleRandomizeWeights}>
              <Shuffle size={14} />
              <span>Random Weights</span>
            </button>
          )}

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
            style={isPredictMode ? { background: '#c084fc', color: '#0f172a' } : {}}
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
      <div className="graph-workspace">
        {/* Visualizer Canvas & Controls Card */}
        <div className="graph-canvas-card">
          <div className="graph-canvas-header">
            <div className="ll-canvas-title">
              <Sparkles size={16} color="#c084fc" />
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
              <GraphPredictionQuiz
                quizData={currentStep.quizData}
                onCorrectAnswer={() => stepForward()}
              />
            </div>
          )}

          {/* Visual Canvas Renderer */}
          <GraphRenderer step={currentStep} nodes={nodes} edges={edges} />

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
          <GraphCodePanel
            snippetKey={snippetKey}
            activeLine={currentStep?.codeLine}
            currentNodeId={currentStep?.currentNodeId}
            visitedCount={currentStep?.visitedNodeIds.length || 0}
            queueSize={currentStep?.queueOrStack.length || 0}
          />
        </div>
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title="Graph Algorithms Full-Screen Studio"
      >
        <GraphRenderer step={currentStep} nodes={nodes} edges={edges} />
      </FullScreenCanvasModal>
    </div>
  );
};
