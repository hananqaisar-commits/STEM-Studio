import React, {useState, useMemo, useEffect} from 'react';
import { useSearchParams } from 'react-router-dom';
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
      setCategory(topic as GraphCategory);
    }
  }, [searchParams]);

  const [startNode, setStartNode] = useState<string>('A');
  const [nodes, setNodes] = useState<GraphNode[]>(() => getPresetGraph('standard').nodes);
  const [edges, setEdges] = useState<GraphEdge[]>(() => getPresetGraph('standard').edges);

  // A* specific state
  const [aStarGrid, setAStarGrid] = useState<AStarCell[][]>(() => getDefaultAStarGrid());
  const [aStarSteps, setAStarSteps] = useState<AStarStep[]>([]);
  const isAStarMode = category === 'aStar';

  // Modes & Modals
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [customizeModeEnabled, setCustomizeModeEnabled] = useState<boolean>(false);
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
      return;
    }

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
      return;
    }
    let steps: GraphStep[] = [];
    if (category === 'bfs') {
      steps = generateBFSSteps(nodes, edges, startNode);
    } else if (category === 'dfs') {
      steps = generateDFSSteps(nodes, edges, startNode);
    } else if (category === 'dijkstra') {
      steps = generateDijkstraSteps(nodes, edges, startNode, 'F');
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
    quizSession.resetSession();
  };

  const handleRandomizeWeights = () => {
    const updatedEdges = edges.map((e) => ({
      ...e,
      weight: e.weight !== undefined ? Math.floor(Math.random() * 9) + 1 : undefined,
    }));
    setEdges(updatedEdges);

    if (category === 'dijkstra') {
      setActiveSteps(generateDijkstraSteps(nodes, updatedEdges, startNode, 'F'));
    } else if (category === 'bellmanFord') {
      setActiveSteps(generateBellmanFordSteps(nodes, updatedEdges, startNode));
    } else if (category === 'prim') {
      setActiveSteps(generatePrimsSteps(nodes, updatedEdges, startNode));
    } else if (category === 'kruskal') {
      setActiveSteps(generateKruskalSteps(nodes, updatedEdges));
    }
  };

  const handleReset = () => {
    handleSelectCategory(category);
  };

  const handleEmpty = () => {
    const preset = getPresetGraph(category === 'topoSort' ? 'dag' : 'standard');
    const minimalNodes = preset.nodes.slice(0, 2);
    const minimalEdges = preset.edges.filter(
      (e) => minimalNodes.some((n) => n.id === e.from) && minimalNodes.some((n) => n.id === e.to)
    );
    setNodes(minimalNodes);
    setEdges(minimalEdges);
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
        <button className="bst-btn btn-mode" onClick={handleReset} title="Random">
          <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
        </button>
      </div>
    </>
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
      <div className="graph-toolbar">
        <div className="graph-toolbar-actions">
          {renderToolbarControls()}
        </div>
      </div>

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
        <ResizablePanelRow
          storageKey="graph"
          customizeModeEnabled={customizeModeEnabled}
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
              debuggerVisible={showDebugger}
              onToggleDebugger={() => setShowDebugger((v) => !v)}
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
