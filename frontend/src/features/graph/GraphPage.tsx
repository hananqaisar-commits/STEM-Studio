import React, {useState, useMemo, useEffect} from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEOHead } from '../../components/common/SEOHead';
import { getSEOForRoute } from '../../data/seoMetadata';
import {
  Share2,
  RotateCcw,
  Maximize2,
  Sparkles,
  Shuffle,
  Play,
  Waypoints,
  Network,
  GitMerge,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildGraphCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';
import {
  getPresetGraph,
  getChallengeGraph,
  generateBFSSteps,
  generateDFSSteps,
  generateDijkstraSteps,
  generatePrimsSteps,
  generateKruskalSteps,
  generateBellmanFordSteps,
  generateAStarSteps,
  getDefaultAStarGrid,
  generateTopoSortSteps,
  type GraphCategory,
  type GraphStep,
  type GraphNode,
  type GraphEdge,
  type AStarStep,
  type AStarCell,
} from './graphEngine';
import { GraphRenderer } from './GraphRenderer';
import { GridPathfindingRenderer } from '../../components/renderers/GridPathfindingRenderer';
import { SortedEdgePanel } from '../../components/renderers/SortedEdgePanel';
import { GRAPH_SNIPPETS } from './graphSnippets';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { ResizablePanelRow } from '../../components/layout/ResizablePanelRow';
import { ResizableWorkspaceHandle } from '../../components/layout/ResizableWorkspaceHandle';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import './Graph.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';
import { useTutorContext } from '../../contexts/TutorContext';

interface AlgorithmMeta {
  id: GraphCategory;
  name: string;
  group: 'Traversals' | 'Shortest Path' | 'MST' | 'Ordering' | 'Pathfinding';
  description: string;
}

const ALGORITHMS_LIST: AlgorithmMeta[] = [
  { id: 'bfs', name: 'Breadth-First Search (BFS)', group: 'Traversals', description: 'Level-by-level queue traversal across reachable nodes' },
  { id: 'dfs', name: 'Depth-First Search (DFS)', group: 'Traversals', description: 'Deep recursion call-stack exploration with backtracking' },
  { id: 'dijkstra', name: "Dijkstra's Shortest Path", group: 'Shortest Path', description: 'Greedy min-priority queue edge relaxation for optimal paths' },
  { id: 'bellmanFord', name: 'Bellman-Ford Algorithm', group: 'Shortest Path', description: 'V-1 relaxation passes with negative cycle detection' },
  { id: 'prim', name: "Prim's Minimum Spanning Tree", group: 'MST', description: 'Greedy cut-set growing tree spanning all graph vertices' },
  { id: 'kruskal', name: "Kruskal's Minimum Spanning Tree", group: 'MST', description: 'DSU-based greedy edge selection for minimum spanning tree' },
  { id: 'aStar', name: 'A* Pathfinding', group: 'Pathfinding', description: 'f = g + h heuristic grid search for optimal shortest path' },
  { id: 'topoSort', name: 'Topological Sort (Kahn)', group: 'Ordering', description: 'Linear vertex dependency ordering using in-degree queue' },
];

export const GraphPage: React.FC = () => {
  const { setTutorContext } = useTutorContext();
  const [category, setCategory] = useState<GraphCategory>('bfs');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS_LIST.some((a) => a.id === topic)) {
      const selected = topic as GraphCategory;
      setCategory(selected);
      setGraphError(null);
      if (selected === 'aStar') {
        const grid = getDefaultAStarGrid();
        setAStarGrid(grid);
        setAStarSteps(generateAStarSteps(grid));
        setActiveSteps([]);
      } else {
        const preset = getPresetGraph(selected === 'topoSort' ? 'dag' : 'standard');
        setNodes(preset.nodes);
        setEdges(preset.edges);
        setStartNode(preset.nodes[0]?.id ?? '');
        setEndNode(preset.nodes[preset.nodes.length - 1]?.id ?? '');
        setDirectedEdges(selected === 'topoSort');
        setWeightedEdges(preset.edges.some((edge) => edge.weight !== undefined));
        setActiveSteps([]);
      }
    }
  }, [searchParams]);

  const [startNode, setStartNode] = useState<string>('A');
  const [endNode, setEndNode] = useState<string>('F');
  const [nodes, setNodes] = useState<GraphNode[]>(() => getPresetGraph('standard').nodes);
  const [edges, setEdges] = useState<GraphEdge[]>(() => getPresetGraph('standard').edges);
  const [edgeFrom, setEdgeFrom] = useState('A');
  const [edgeTo, setEdgeTo] = useState('B');
  const [edgeWeight, setEdgeWeight] = useState('1');
  const [directedEdges, setDirectedEdges] = useState(false);
  const [weightedEdges, setWeightedEdges] = useState(true);
  const [removeNodeId, setRemoveNodeId] = useState('F');
  const [removeEdgeId, setRemoveEdgeId] = useState('');
  const [graphError, setGraphError] = useState<string | null>(null);

  const nextVertexLabel = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((label) => !nodes.some((node) => node.id === label));

  useEffect(() => {
    if (nodes.length === 0) return;
    const firstId = nodes[0].id;
    const secondId = nodes.find((node) => node.id !== firstId)?.id ?? firstId;
    if (!nodes.some((node) => node.id === startNode)) setStartNode(firstId);
    if (!nodes.some((node) => node.id === endNode)) setEndNode(nodes[nodes.length - 1].id);
    if (!nodes.some((node) => node.id === edgeFrom)) setEdgeFrom(firstId);
    if (!nodes.some((node) => node.id === edgeTo) || edgeTo === edgeFrom) setEdgeTo(secondId);
    if (!nodes.some((node) => node.id === removeNodeId)) setRemoveNodeId(nodes[nodes.length - 1].id);
  }, [nodes, startNode, endNode, edgeFrom, edgeTo, removeNodeId]);

  useEffect(() => {
    if (edges.length > 0 && !edges.some((edge) => edge.id === removeEdgeId)) setRemoveEdgeId(edges[0].id);
  }, [edges, removeEdgeId]);

  // A* specific state
  const [aStarGrid, setAStarGrid] = useState<AStarCell[][]>(() => getDefaultAStarGrid());
  const [aStarSteps, setAStarSteps] = useState<AStarStep[]>([]);
  const isAStarMode = category === 'aStar';

  // Modes & Modals
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [cadence, setCadence] = React.useState<QuizCadence>('normal');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);

  // Active steps dataset
  const [activeSteps, setActiveSteps] = useState<GraphStep[]>([]);

  // Step Player Hook — feeds either graph steps or A* steps (same length-based index)
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
  } = useStepPlayer<GraphStep>({ steps: activeSteps });

  // Publish active context to Octa AI Tutor
  useEffect(() => {
    const algObj = ALGORITHMS_LIST.find((a) => a.id === category);

    setTutorContext({
      algorithmName: algObj?.name || category.toUpperCase(),
      algorithmId: category,
      category: 'graph',
      currentStepDescription: currentStep?.explanation || '',
      currentStepIndex,
      totalSteps,
      currentStep,
      steps: activeSteps,
      play,
      pause,
      stepForward,
      reset,
      setShowDebugger,
      onLaunchQuiz: () => setQuizEnabled(true),
    });
  }, [category, currentStepIndex, totalSteps, currentStep, activeSteps, setTutorContext, play, pause, stepForward, reset]);

  // A* steps have a different type; derive current A* step from same index
  const aStarCurrentStep = isAStarMode ? (aStarSteps[currentStepIndex] ?? null) : null;
  const aStarTotalSteps = aStarSteps.length;

  // Sync A* steps length into the graph step player via fake GraphStep array
  const aStarPlayerProxy = React.useMemo(
    () => aStarSteps.map(() => ({} as GraphStep)),
    [aStarSteps]
  );
  // Use the proxy when in A* mode
  const effectiveSteps = isAStarMode ? aStarPlayerProxy : activeSteps;

  const {
    currentStepIndex: aStarIndex,
    totalSteps: aStarTotal,
    isPlaying: aStarPlaying,
    play: aStarPlay,
    pause: aStarPause,
    stepForward: aStarStepForward,
    stepBack: aStarStepBack,
    reset: aStarReset,
    seekTo: aStarSeekTo,
  } = useStepPlayer<GraphStep>({ steps: aStarPlayerProxy });

  // Unified control surface
  const unifiedIndex = isAStarMode ? aStarIndex : currentStepIndex;
  const unifiedTotal = isAStarMode ? aStarTotal : totalSteps;
  const unifiedPlaying = isAStarMode ? aStarPlaying : isPlaying;
  const unifiedPlay = isAStarMode ? aStarPlay : play;
  const unifiedPause = isAStarMode ? aStarPause : pause;
  const unifiedStepForward = isAStarMode ? aStarStepForward : stepForward;
  const unifiedStepBack = isAStarMode ? aStarStepBack : stepBack;
  const unifiedReset = isAStarMode ? aStarReset : reset;
  const unifiedSeekTo = isAStarMode ? aStarSeekTo : seekTo;


  // Build quiz checkpoints from the current active steps
  const quizCheckpoints = useMemo(
    () => buildGraphCheckpoints(activeSteps, category),
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
    module: 'graph',
    algorithmId: category,
    revisionData: buildRevisionData(category),
  });

  // Handle Category Switching
  const handleSelectCategory = (cat: GraphCategory) => {
    setCategory(cat);
    reset();
    quizSession.resetSession();

    if (cat === 'aStar') {
      const grid = getDefaultAStarGrid();
      setAStarGrid(grid);
      setAStarSteps(generateAStarSteps(grid));
      setActiveSteps([]);
      setGraphError(null);
      return;
    }

    const topologyType = cat === 'topoSort' ? 'dag' : 'standard';
    const preset = getPresetGraph(topologyType);
    setNodes(preset.nodes);
    setEdges(preset.edges);
    setStartNode(preset.nodes[0]?.id ?? '');
    setEndNode(preset.nodes[preset.nodes.length - 1]?.id ?? '');
    setDirectedEdges(cat === 'topoSort');
    setWeightedEdges(preset.edges.some((edge) => edge.weight !== undefined));
    setGraphError(null);

    let steps: GraphStep[] = [];
    if (cat === 'bfs') {
      steps = generateBFSSteps(preset.nodes, preset.edges, 'A');
    } else if (cat === 'dfs') {
      steps = generateDFSSteps(preset.nodes, preset.edges, 'A');
    } else if (cat === 'dijkstra') {
      steps = generateDijkstraSteps(preset.nodes, preset.edges, 'A', 'F');
    } else if (cat === 'bellmanFord') {
      steps = generateBellmanFordSteps(preset.nodes, preset.edges, 'A');
    } else if (cat === 'prim') {
      steps = generatePrimsSteps(preset.nodes, preset.edges, 'A');
    } else if (cat === 'kruskal') {
      steps = generateKruskalSteps(preset.nodes, preset.edges);
    } else if (cat === 'topoSort') {
      steps = generateTopoSortSteps(preset.nodes, preset.edges);
    }
    setActiveSteps(steps);
  };

  // Run Traversal on Demand
  const handleRunAlgorithm = () => {
    if (category === 'aStar') {
      const newSteps = generateAStarSteps(aStarGrid);
      setAStarSteps(newSteps);
      quizSession.resetSession();
      aStarReset();
      if (!quizEnabled) aStarPlay();
      return;
    }
    if (nodes.length === 0) {
      setGraphError('Add at least one vertex before running an algorithm.');
      return;
    }
    if (!nodes.some((node) => node.id === startNode)) {
      setGraphError('Choose a source vertex that exists in this graph.');
      return;
    }
    if (category === 'dijkstra' && !nodes.some((node) => node.id === endNode)) {
      setGraphError('Choose a destination vertex that exists in this graph.');
      return;
    }
    if (category === 'dijkstra' && edges.some((edge) => (edge.weight ?? 1) < 0)) {
      setGraphError('Dijkstra requires non-negative edge weights. Use Bellman-Ford for negative edges.');
      return;
    }
    if ((category === 'prim' || category === 'kruskal') && edges.some((edge) => edge.directed)) {
      setGraphError('Minimum spanning trees require undirected edges. Turn off “New edges are directed” or switch algorithms.');
      return;
    }
    if (category === 'topoSort' && edges.some((edge) => !edge.directed)) {
      setGraphError('Topological sort requires directed edges. Mark each edge as directed before running it.');
      return;
    }
    setGraphError(null);
    let steps: GraphStep[] = [];
    if (category === 'bfs') {
      steps = generateBFSSteps(nodes, edges, startNode);
    } else if (category === 'dfs') {
      steps = generateDFSSteps(nodes, edges, startNode);
    } else if (category === 'dijkstra') {
      steps = generateDijkstraSteps(nodes, edges, startNode, endNode);
    } else if (category === 'bellmanFord') {
      steps = generateBellmanFordSteps(nodes, edges, startNode);
    } else if (category === 'prim') {
      steps = generatePrimsSteps(nodes, edges, startNode);
    } else if (category === 'kruskal') {
      steps = generateKruskalSteps(nodes, edges);
    } else if (category === 'topoSort') {
      steps = generateTopoSortSteps(nodes, edges);
    }
    setActiveSteps(steps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  const handleRandomizeWeights = () => {
    const updatedEdges = edges.map((e) => ({
      ...e,
      weight: e.weight !== undefined ? Math.floor(Math.random() * 9) + 1 : undefined,
    }));
    setEdges(updatedEdges);
    setGraphError(null);

    if (category === 'dijkstra') {
      setActiveSteps(generateDijkstraSteps(nodes, updatedEdges, startNode, endNode));
    } else if (category === 'bellmanFord') {
      setActiveSteps(generateBellmanFordSteps(nodes, updatedEdges, startNode));
    } else if (category === 'prim') {
      setActiveSteps(generatePrimsSteps(nodes, updatedEdges, startNode));
    } else if (category === 'kruskal') {
      setActiveSteps(generateKruskalSteps(nodes, updatedEdges));
    }
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  const handleReset = () => {
    handleSelectCategory(category);
  };

  const handleEmpty = () => {
    setNodes([]);
    setEdges([]);
    setStartNode('');
    setEndNode('');
    setGraphError(null);
    setActiveSteps([]);
    reset();
    quizSession.resetSession();
  };

  const handleSample = () => {
    handleSelectCategory(category);
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     The alternate challenge topology is a graph the student has never
     traversed — same algorithm, unseen edges and weights, so every
     prediction must come from the mental model, not memory. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    reset();
    const preset = getChallengeGraph(category === 'topoSort' ? 'dag' : 'standard');
    setNodes(preset.nodes);
    setEdges(preset.edges);
    setStartNode(preset.nodes[0]?.id ?? '');
    setEndNode(preset.nodes[preset.nodes.length - 1]?.id ?? '');
    let steps: GraphStep[] = [];
    if (category === 'bfs') {
      steps = generateBFSSteps(preset.nodes, preset.edges, 'A');
    } else if (category === 'dfs') {
      steps = generateDFSSteps(preset.nodes, preset.edges, 'A');
    } else if (category === 'dijkstra') {
      steps = generateDijkstraSteps(preset.nodes, preset.edges, 'A', 'F');
    } else if (category === 'prim') {
      steps = generatePrimsSteps(preset.nodes, preset.edges, 'A');
    } else if (category === 'topoSort') {
      steps = generateTopoSortSteps(preset.nodes, preset.edges);
    }
    setActiveSteps(steps);
  };

  const resetGraphPlayback = () => {
    setActiveSteps([]);
    setGraphError(null);
    reset();
    quizSession.resetSession();
  };

  const handleAddVertex = () => {
    if (!nextVertexLabel || nodes.length >= 12) {
      setGraphError('This canvas supports up to 12 vertices.');
      return;
    }
    const allNodes = [...nodes, { id: nextVertexLabel, label: nextVertexLabel, x: 0, y: 0, state: 'default' as const }];
    const laidOutNodes = allNodes.map((node, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / allNodes.length;
      return { ...node, x: Math.round(280 + Math.cos(angle) * 210), y: Math.round(150 + Math.sin(angle) * 112) };
    });
    setNodes(laidOutNodes);
    if (nodes.length === 0) {
      setStartNode(nextVertexLabel);
      setEndNode(nextVertexLabel);
    }
    resetGraphPlayback();
  };

  const handleRemoveVertex = () => {
    if (!removeNodeId) return;
    setNodes(nodes.filter((node) => node.id !== removeNodeId));
    setEdges(edges.filter((edge) => edge.from !== removeNodeId && edge.to !== removeNodeId));
    resetGraphPlayback();
  };

  const handleAddEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) {
      setGraphError('Choose two different vertices for an edge.');
      return;
    }
    const duplicate = edges.some((edge) =>
      edge.from === edgeFrom && edge.to === edgeTo || (!directedEdges && edge.from === edgeTo && edge.to === edgeFrom)
    );
    if (duplicate) {
      setGraphError('Those vertices already have an edge between them.');
      return;
    }
    const weight = Number(edgeWeight);
    if (weightedEdges && (!edgeWeight.trim() || !Number.isFinite(weight))) {
      setGraphError('Enter a numeric edge weight.');
      return;
    }
    const edge: GraphEdge = {
      id: `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      from: edgeFrom,
      to: edgeTo,
      ...(weightedEdges ? { weight } : {}),
      directed: directedEdges,
      state: 'default',
    };
    setEdges([...edges, edge]);
    resetGraphPlayback();
  };

  const handleRemoveEdge = () => {
    if (!removeEdgeId) return;
    setEdges(edges.filter((edge) => edge.id !== removeEdgeId));
    resetGraphPlayback();
  };

  const snippetKey = category;

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

  /* ── Shared toolbar controls ─────────────────────────────────────────
     Single source of truth for every input/button: rendered in the page
     toolbar AND passed to the fullscreen modal, so the two states can
     never drift out of sync. */
  const renderToolbarControls = () => (
    <>
      {category !== 'topoSort' && !isAStarMode && (
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
      {category === 'dijkstra' && (
        <div className="bs-input-group">
          <span className="graph-control-label">Target:</span>
          <select value={endNode} onChange={(e) => setEndNode(e.target.value)} aria-label="Destination vertex">
            {nodes.map((node) => <option key={node.id} value={node.id}>Vertex {node.label}</option>)}
          </select>
        </div>
      )}

      <button
        className="ll-btn ll-btn-primary"
        onClick={handleRunAlgorithm}
        style={{ background: '#c084fc', color: '#0f172a' }}
      >
        <Play size={14} />
        <span>Run Algorithm</span>
      </button>

      {(category === 'dijkstra' || category === 'bellmanFord' || category === 'prim' || category === 'kruskal') && (
        <button className="ll-btn ll-btn-secondary" onClick={handleRandomizeWeights}>
          <Shuffle size={14} />
          <span>Random Weights</span>
        </button>
      )}

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
      </div>
    </>
  );

  const renderGraphEditor = () => (
    <section className="graph-editor" aria-label="Graph builder">
      <div className="graph-editor-heading">
        <div>
          <h2>Build your graph</h2>
          <p>Add vertices and connect them, then choose a source and run the selected algorithm.</p>
        </div>
        <span className="graph-editor-count">{nodes.length} / 12 vertices · {edges.length} edges</span>
      </div>
      <div className="graph-editor-grid">
        <div className="graph-editor-group">
          <strong>Vertices</strong>
          <button className="graph-editor-button graph-editor-primary" onClick={handleAddVertex} disabled={!nextVertexLabel || nodes.length >= 12}>
            <Plus size={15} aria-hidden="true" /> Add Vertex {nextVertexLabel ?? ''}
          </button>
          <div className="graph-editor-inline">
            <label htmlFor="graph-remove-node">Remove</label>
            <select id="graph-remove-node" value={removeNodeId} onChange={(e) => setRemoveNodeId(e.target.value)} disabled={nodes.length === 0}>
              {nodes.map((node) => <option key={node.id} value={node.id}>Vertex {node.label}</option>)}
            </select>
            <button className="graph-editor-button graph-editor-danger" onClick={handleRemoveVertex} disabled={nodes.length === 0} aria-label="Remove selected vertex and its edges">
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          </div>
        </div>

        <div className="graph-editor-group">
          <strong>Edges</strong>
          <div className="graph-editor-inline">
            <label htmlFor="graph-edge-from">From</label>
            <select id="graph-edge-from" value={edgeFrom} onChange={(e) => setEdgeFrom(e.target.value)} disabled={nodes.length < 2}>
              {nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
            </select>
            <label htmlFor="graph-edge-to">To</label>
            <select id="graph-edge-to" value={edgeTo} onChange={(e) => setEdgeTo(e.target.value)} disabled={nodes.length < 2}>
              {nodes.filter((node) => node.id !== edgeFrom).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
            </select>
          </div>
          <div className="graph-editor-inline">
            <label className="graph-editor-check">
              <input type="checkbox" checked={directedEdges} onChange={(e) => setDirectedEdges(e.target.checked)} />
              New edges are directed
            </label>
            <label className="graph-editor-check">
              <input type="checkbox" checked={weightedEdges} onChange={(e) => setWeightedEdges(e.target.checked)} />
              Add a weight
            </label>
            {weightedEdges && <input aria-label="New edge weight" type="number" value={edgeWeight} onChange={(e) => setEdgeWeight(e.target.value)} className="graph-editor-weight" />}
            <button className="graph-editor-button graph-editor-primary" onClick={handleAddEdge} disabled={nodes.length < 2}>
              <Plus size={15} aria-hidden="true" /> Add Edge
            </button>
          </div>
          <div className="graph-editor-inline">
            <label htmlFor="graph-remove-edge">Remove</label>
            <select id="graph-remove-edge" value={removeEdgeId} onChange={(e) => setRemoveEdgeId(e.target.value)} disabled={edges.length === 0}>
              {edges.map((edge) => {
                const from = nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
                const to = nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
                return <option key={edge.id} value={edge.id}>{from} {edge.directed ? '→' : '—'} {to}{edge.weight !== undefined ? ` · ${edge.weight}` : ''}</option>;
              })}
            </select>
            <button className="graph-editor-button graph-editor-danger" onClick={handleRemoveEdge} disabled={edges.length === 0}>
              <Trash2 size={14} aria-hidden="true" /> Remove Edge
            </button>
          </div>
        </div>
      </div>
      <p className="graph-editor-hint">Directed edges have one-way arrows. Undirected edges can be traversed both ways. Bellman-Ford supports negative weights; Dijkstra does not. Prim and Kruskal need undirected edges.</p>
      {graphError && <p className="graph-editor-error" role="alert">{graphError}</p>}
    </section>
  );

  return (
    <div className="graph-container">
      <SEOHead {...getSEOForRoute('/dashboard/graph')} />
      <VisualizerHeader
        icon={<Share2 size={22} />}
        title="Graph Algorithms Studio"
        subtitle="Interactive Network Traversals, Shortest Paths, & Minimum Spanning Trees"
        items={ALGORITHMS_LIST.map((alg) => ({ id: alg.id, name: alg.name, description: alg.description, group: alg.group }))}
        activeId={category}
        onSelect={(id) => handleSelectCategory(id as GraphCategory)}
        placeholder="Search graph algorithm, MST, or traversal..."
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
              title="Full Screen Canvas"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </VisualizerActions>
        }
      />



      {/* ─── ACTION TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="graph-toolbar">
        <div className="graph-toolbar-actions">
          {renderToolbarControls()}
        </div>
      </div>
      {!isAStarMode && renderGraphEditor()}

      {/* ─── MAIN WORKSPACE ──────────────────────────────────────────────────── */}
      <div className="graph-workspace scene-workspace">
        {/* Visualizer Canvas & Controls Card */}
        <div className="renderer-section">
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

            {isAStarMode ? (
              <GridPathfindingRenderer
                step={aStarSteps[aStarIndex] ?? null}
                onToggleFullscreen={() => setIsFullScreenOpen(true)}
              />
            ) : (
              <>
                <GraphRenderer step={currentStep} nodes={nodes} edges={edges} onToggleFullscreen={() => setIsFullScreenOpen(true)} />
                {/* Kruskal edge panel overlay */}
                {category === 'kruskal' && currentStep?.sortedEdges && (
                  <div style={{ padding: '0 12px 8px' }}>
                    <SortedEdgePanel
                      edges={currentStep.sortedEdges}
                      dsuComponents={currentStep.dsuComponents}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <FloatingController
            isPlaying={unifiedPlaying}
            canStepBack={unifiedIndex > 0}
            canStepForward={unifiedIndex < unifiedTotal - 1}
            onPlay={unifiedPlay}
            onPause={unifiedPause}
            onReset={unifiedReset}
            onStepBack={unifiedStepBack}
            onStepForward={unifiedStepForward}
            onStop={() => { unifiedPause(); unifiedReset(); }}
            onResume={unifiedPlay}
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
        <ResizableWorkspaceHandle storageKey="graph" />
        <ResizablePanelRow
          storageKey="graph"
          debuggerPanel={showDebugger ? (
            <MultiLanguageCodePanel
              algorithmKey={category}
              title="Graph Traversal"
              categoryId="graph"
              topicId={category}
              snippets={GRAPH_SNIPPETS[snippetKey]}
              activeLine={currentStep?.codeLine}
              variables={{
                curr_vertex: currentStep?.currentNodeId ?? null,
                visited_count: currentStep?.visitedNodeIds.length ?? 0,
                frontier_size: currentStep?.queueOrStack.length ?? 0,
              }}
            />
          ) : null}

          explanationPanel={<ExplanationPanel
            description={maskNarration(
              isAStarMode
                ? (aStarSteps[aStarIndex]?.explanation || 'Click Play to start A* Search.')
                : (currentStep?.explanation || 'Click Play to observe step-by-step execution.'),
              quizSession.phase
            )}
            steps={isAStarMode ? [] : activeSteps}
            currentStepIndex={isAStarMode ? aStarIndex : currentStepIndex}
          />
          }
        />
      </div>

      {/* ─── FULL SCREEN MODAL ───────────────────────────────────────────────── */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Graph Studio | ${category.toUpperCase()}`}
        subtitle="Interactive Network Inspector"
        explanationPanel={<ExplanationPanel description={maskNarration(currentStep?.explanation || 'Click Play to observe step-by-step execution.', quizSession.phase)} steps={activeSteps} currentStepIndex={currentStepIndex} />}
        toolbarControls={
          <div className="fs-floating-controls">
            {renderToolbarControls()}
            <VisualizerActions
              quizEnabled={quizEnabled}
              onToggleQuiz={() => setQuizEnabled((v) => !v)}
            />
          </div>
        }
        playbackControls={renderFullscreenPlayerControls()}

        floatingControls={
          <FloatingController
            isPlaying={unifiedPlaying}
            canStepBack={unifiedIndex > 0}
            canStepForward={unifiedIndex < unifiedTotal - 1}
            onPlay={unifiedPlay}
            onPause={unifiedPause}
            onReset={unifiedReset}
            onStepBack={unifiedStepBack}
            onStepForward={unifiedStepForward}
            onStop={() => { unifiedPause(); unifiedReset(); }}
            onResume={unifiedPlay}
            quizMode={quizEnabled}
          />
        }
      >
        {isAStarMode ? (
          <GridPathfindingRenderer step={aStarSteps[aStarIndex] ?? null} />
        ) : (
          <GraphRenderer step={currentStep} nodes={nodes} edges={edges} />
        )}
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="graph" activeTopic={category} />

    </div>
  );
};
