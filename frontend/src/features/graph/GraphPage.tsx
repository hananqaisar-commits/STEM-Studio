import React, { useState } from 'react';
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
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
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

  const [startNode, setStartNode] = useState<string>('A');
  const [nodes, setNodes] = useState<GraphNode[]>(() => getPresetGraph('standard').nodes);
  const [edges, setEdges] = useState<GraphEdge[]>(() => getPresetGraph('standard').edges);

  // Modes & Modals
  const [isPredictMode, setIsPredictMode] = useState<boolean>(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active steps dataset
  const [activeSteps, setActiveSteps] = useState<GraphStep[]>([]);

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

  const snippetKey = category;

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
      {category !== 'topoSort' && (
        <div className="bst-input-group">
          <span>Start:</span>
          <select
            className="bst-select"
            value={startNode}
            onChange={(e) => setStartNode(e.target.value)}
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                Vertex {n.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <button className="bst-btn btn-insert" onClick={handleRunAlgorithm}>
        <Play size={14} />
        <span>Run Traversal</span>
      </button>

      {(category === 'dijkstra' || category === 'prim') && (
        <button className="bst-btn btn-search" onClick={handleRandomizeWeights}>
          <Shuffle size={14} />
          <span>Random Weights</span>
        </button>
      )}

      <button className="bst-btn btn-search" onClick={handleReset}>
        <RotateCcw size={14} />
        <span>Reset</span>
      </button>

      <label className="predict-toggle-label" style={{ marginLeft: '0.5rem' }}>
        <HelpCircle size={16} />
        <span>Quiz Mode</span>
        <input type="checkbox" checked={isPredictMode} onChange={(e) => setIsPredictMode(e.target.checked)} />
      </label>
    </div>
  );

  return (
    <div className="graph-container">
      <VisualizerHeader
        icon={<Share2 size={22} />}
        title="Graph Algorithms Studio"
        subtitle="Interactive Network Traversals, Shortest Paths, & Minimum Spanning Trees"
        items={ALGORITHMS_LIST.map((alg) => ({ id: alg.id, name: alg.name, description: alg.description, group: alg.group }))}
        activeId={category}
        onSelect={(id) => handleSelectCategory(id as GraphCategory)}
        placeholder="Search graph algorithm, MST, or traversal..."
      />

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
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px' }}>
                Start:
              </span>
              <select
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id} style={{ background: 'var(--color-surface)' }}>
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
        <div className="renderer-section">
          {isPredictMode && currentStep?.isQuizPoint && currentStep.quizData && (
            <GraphPredictionQuiz quizData={currentStep.quizData} onCorrectAnswer={() => stepForward()} />
          )}

          <div className="graph-canvas-card">
            <div className="graph-canvas-header">
              <div className="ll-canvas-title">
                <Sparkles size={16} color="#c084fc" />
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

            <GraphRenderer step={currentStep} nodes={nodes} edges={edges} />
          </div>

          {renderPlayerControls()}
        </div>

        {/* Right Column: Code & Explanation */}
        <div className="explanation-section">
          <GraphCodePanel
            snippetKey={snippetKey}
            activeLine={currentStep?.codeLine}
            currentNodeId={currentStep?.currentNodeId}
            visitedCount={currentStep?.visitedNodeIds.length || 0}
            queueSize={currentStep?.queueOrStack.length || 0}
          />

          <ExplanationPanel
            description={currentStep?.explanation || 'Click Play to observe step-by-step execution.'}
          />
        </div>
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Graph Studio | ${category.toUpperCase()}`}
        subtitle="Interactive Network Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
      >
        {isPredictMode && currentStep?.isQuizPoint && currentStep.quizData && (
          <GraphPredictionQuiz quizData={currentStep.quizData} onCorrectAnswer={() => stepForward()} />
        )}
        <GraphRenderer step={currentStep} nodes={nodes} edges={edges} />
      </FullScreenCanvasModal>
    </div>
  );
};
