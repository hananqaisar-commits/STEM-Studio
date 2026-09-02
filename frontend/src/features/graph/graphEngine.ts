export type GraphCategory =
  | 'bfs'
  | 'dfs'
  | 'dijkstra'
  | 'prim'
  | 'kruskal'
  | 'bellmanFord'
  | 'aStar'
  | 'topoSort';

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  state: 'default' | 'current' | 'visited' | 'queued' | 'shortest' | 'mst';
  distance?: number;
  inDegree?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  weight?: number;
  directed?: boolean;
  state: 'default' | 'traversing' | 'visited' | 'relaxed' | 'mst' | 'backtrack';
}

export interface GraphQuizData {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GraphStep {
  nodes: GraphNode[];
  edges: GraphEdge[];
  currentNodeId: string | null;
  currentEdgeId: string | null;
  visitedNodeIds: string[];
  queueOrStack: string[];
  distances?: Record<string, number>;
  mstWeight?: number;
  // Kruskal extras
  sortedEdges?: { edgeId: string; from: string; to: string; weight: number; state: 'pending' | 'current' | 'accepted' | 'rejected' }[];
  dsuComponents?: string[][];
  // Bellman-Ford extras
  passNumber?: number;
  relaxation?: { edgeId: string; success: boolean; oldDist: number; newDist: number };
  hasNegativeCycle?: boolean;
  // A* extras
  gScore?: Record<string, number>;
  hScore?: Record<string, number>;
  fScore?: Record<string, number>;
  openSet?: string[];
  closedSet?: string[];
  path?: string[];
  phase: string;
  explanation: string;
  codeLine: number;
  isQuizPoint?: boolean;
  quizData?: GraphQuizData;
}

// ─── PRESET GRAPH TOPOLOGIES ──────────────────────────────────────────────────

export function getPresetGraph(type: 'standard' | 'dag' | 'tree'): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  if (type === 'dag') {
    // Directed Acyclic Graph for Topological Sort
    const nodes: GraphNode[] = [
      { id: 'A', label: 'A', x: 80, y: 80, state: 'default' },
      { id: 'B', label: 'B', x: 80, y: 220, state: 'default' },
      { id: 'C', label: 'C', x: 260, y: 60, state: 'default' },
      { id: 'D', label: 'D', x: 260, y: 240, state: 'default' },
      { id: 'E', label: 'E', x: 440, y: 80, state: 'default' },
      { id: 'F', label: 'F', x: 440, y: 220, state: 'default' },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', from: 'A', to: 'C', directed: true, state: 'default' },
      { id: 'e2', from: 'B', to: 'C', directed: true, state: 'default' },
      { id: 'e3', from: 'B', to: 'D', directed: true, state: 'default' },
      { id: 'e4', from: 'C', to: 'E', directed: true, state: 'default' },
      { id: 'e5', from: 'C', to: 'F', directed: true, state: 'default' },
      { id: 'e6', from: 'D', to: 'F', directed: true, state: 'default' },
    ];
    return { nodes, edges };
  }

  // Standard Weighted Undirected Graph (for BFS, DFS, Dijkstra, Prim, Kruskal)
  const nodes: GraphNode[] = [
    { id: 'A', label: 'A', x: 80, y: 150, state: 'default' },
    { id: 'B', label: 'B', x: 200, y: 60, state: 'default' },
    { id: 'C', label: 'C', x: 200, y: 240, state: 'default' },
    { id: 'D', label: 'D', x: 360, y: 60, state: 'default' },
    { id: 'E', label: 'E', x: 360, y: 240, state: 'default' },
    { id: 'F', label: 'F', x: 480, y: 150, state: 'default' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', from: 'A', to: 'B', weight: 4, directed: false, state: 'default' },
    { id: 'e2', from: 'A', to: 'C', weight: 2, directed: false, state: 'default' },
    { id: 'e3', from: 'B', to: 'C', weight: 1, directed: false, state: 'default' },
    { id: 'e4', from: 'B', to: 'D', weight: 5, directed: false, state: 'default' },
    { id: 'e5', from: 'C', to: 'E', weight: 8, directed: false, state: 'default' },
    { id: 'e6', from: 'C', to: 'D', weight: 8, directed: false, state: 'default' },
    { id: 'e7', from: 'D', to: 'E', weight: 2, directed: false, state: 'default' },
    { id: 'e8', from: 'D', to: 'F', weight: 6, directed: false, state: 'default' },
    { id: 'e9', from: 'E', to: 'F', weight: 3, directed: false, state: 'default' },
  ];

  return { nodes, edges };
}

function cloneGraph(nodes: GraphNode[], edges: GraphEdge[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  return {
    nodes: nodes.map((n) => ({ ...n })),
    edges: edges.map((e) => ({ ...e })),
  };
}

/** Alternate topologies for the "Prove You Understand" transfer challenge.
 *  Same node positions as the presets (the renderer depends on them), but
 *  different edges and weights so the student executes on a graph they have
 *  never traversed before — prediction from memory is impossible. */
export function getChallengeGraph(type: 'standard' | 'dag'): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  if (type === 'dag') {
    // Alternate DAG: A,B start; C joins from A only; D from B and C; E,F from D
    const nodes: GraphNode[] = [
      { id: 'A', label: 'A', x: 80, y: 80, state: 'default' },
      { id: 'B', label: 'B', x: 80, y: 220, state: 'default' },
      { id: 'C', label: 'C', x: 260, y: 60, state: 'default' },
      { id: 'D', label: 'D', x: 260, y: 240, state: 'default' },
      { id: 'E', label: 'E', x: 440, y: 80, state: 'default' },
      { id: 'F', label: 'F', x: 440, y: 220, state: 'default' },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', from: 'A', to: 'C', directed: true, state: 'default' },
      { id: 'e2', from: 'B', to: 'D', directed: true, state: 'default' },
      { id: 'e3', from: 'C', to: 'D', directed: true, state: 'default' },
      { id: 'e4', from: 'D', to: 'E', directed: true, state: 'default' },
      { id: 'e5', from: 'D', to: 'F', directed: true, state: 'default' },
    ];
    return { nodes, edges };
  }

  // Alternate connected weighted undirected graph for BFS / DFS / Dijkstra / Prim
  const nodes: GraphNode[] = [
    { id: 'A', label: 'A', x: 80, y: 150, state: 'default' },
    { id: 'B', label: 'B', x: 200, y: 60, state: 'default' },
    { id: 'C', label: 'C', x: 200, y: 240, state: 'default' },
    { id: 'D', label: 'D', x: 360, y: 60, state: 'default' },
    { id: 'E', label: 'E', x: 360, y: 240, state: 'default' },
    { id: 'F', label: 'F', x: 480, y: 150, state: 'default' },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', from: 'A', to: 'B', weight: 3, directed: false, state: 'default' },
    { id: 'e2', from: 'A', to: 'C', weight: 7, directed: false, state: 'default' },
    { id: 'e3', from: 'B', to: 'D', weight: 4, directed: false, state: 'default' },
    { id: 'e4', from: 'C', to: 'D', weight: 2, directed: false, state: 'default' },
    { id: 'e5', from: 'C', to: 'E', weight: 6, directed: false, state: 'default' },
    { id: 'e6', from: 'D', to: 'E', weight: 1, directed: false, state: 'default' },
    { id: 'e7', from: 'D', to: 'F', weight: 9, directed: false, state: 'default' },
    { id: 'e8', from: 'E', to: 'F', weight: 5, directed: false, state: 'default' },
  ];

  return { nodes, edges };
}

// ─── 1. BREADTH-FIRST SEARCH (BFS) ───────────────────────────────────────────

export function generateBFSSteps(
  initNodes: GraphNode[],
  initEdges: GraphEdge[],
  startId: string = 'A'
): GraphStep[] {
  const steps: GraphStep[] = [];
  const { nodes, edges } = cloneGraph(initNodes, initEdges);

  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);

  // Step 0: Initialize
  const startNode = nodes.find((n) => n.id === startId);
  if (startNode) startNode.state = 'queued';

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: Array.from(visited),
    queueOrStack: [...queue],
    phase: 'Initialize BFS Queue',
    explanation: `Pushed start vertex ${startId} to the BFS Queue and marked as visited.`,
    codeLine: 2,
    isQuizPoint: true,
    quizData: {
      prompt: `Which data structure powers Breadth-First Search (BFS)?`,
      options: ['Queue (FIFO)', 'Stack (LIFO)', 'Min-Heap', 'Hash Table'],
      correctIndex: 0,
      explanation: 'BFS uses a FIFO Queue to explore neighbors level-by-level in expanding concentric frontiers.',
    },
  });

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currNode = nodes.find((n) => n.id === currId);
    if (currNode) currNode.state = 'current';

    steps.push({
      nodes: cloneGraph(nodes, edges).nodes,
      edges: cloneGraph(nodes, edges).edges,
      currentNodeId: currId,
      currentEdgeId: null,
      visitedNodeIds: Array.from(visited),
      queueOrStack: [...queue],
      phase: `De-queue Node ${currId}`,
      explanation: `De-queued vertex ${currId} from front of queue. Exploring unvisited adjacent neighbors.`,
      codeLine: 4,
    });

    // Find incident edges
    const neighbors: { neighborId: string; edge: GraphEdge }[] = [];
    edges.forEach((e) => {
      if (e.from === currId && (!e.directed || true)) {
        neighbors.push({ neighborId: e.to, edge: e });
      } else if (!e.directed && e.to === currId) {
        neighbors.push({ neighborId: e.from, edge: e });
      }
    });

    for (const { neighborId, edge } of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);

        const neighborNode = nodes.find((n) => n.id === neighborId);
        if (neighborNode) neighborNode.state = 'queued';
        edge.state = 'visited';

        steps.push({
          nodes: cloneGraph(nodes, edges).nodes,
          edges: cloneGraph(nodes, edges).edges,
          currentNodeId: currId,
          currentEdgeId: edge.id,
          visitedNodeIds: Array.from(visited),
          queueOrStack: [...queue],
          phase: `Enqueue Neighbor ${neighborId}`,
          explanation: `Discovered unvisited neighbor ${neighborId}. Marked visited and enqueued.`,
          codeLine: 6,
        });
      }
    }

    if (currNode) currNode.state = 'visited';
  }

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: Array.from(visited),
    queueOrStack: [],
    phase: 'BFS Traversal Complete',
    explanation: `BFS traversal finished. All reachable vertices visited in O(V + E) time!`,
    codeLine: 8,
  });

  return steps;
}

// ─── 2. DEPTH-FIRST SEARCH (DFS) ─────────────────────────────────────────────

export function generateDFSSteps(
  initNodes: GraphNode[],
  initEdges: GraphEdge[],
  startId: string = 'A'
): GraphStep[] {
  const steps: GraphStep[] = [];
  const { nodes, edges } = cloneGraph(initNodes, initEdges);

  const stack: string[] = [startId];
  const visited = new Set<string>();

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: startId,
    currentEdgeId: null,
    visitedNodeIds: [],
    queueOrStack: [startId],
    phase: 'Initialize DFS Stack',
    explanation: `Initialized DFS recursion stack with start vertex ${startId}.`,
    codeLine: 2,
  });

  function dfs(currId: string) {
    visited.add(currId);
    const currNode = nodes.find((n) => n.id === currId);
    if (currNode) currNode.state = 'current';

    steps.push({
      nodes: cloneGraph(nodes, edges).nodes,
      edges: cloneGraph(nodes, edges).edges,
      currentNodeId: currId,
      currentEdgeId: null,
      visitedNodeIds: Array.from(visited),
      queueOrStack: [...stack],
      phase: `Visit Node ${currId}`,
      explanation: `Exploring deep branch from vertex ${currId}.`,
      codeLine: 4,
    });

    const neighbors: { neighborId: string; edge: GraphEdge }[] = [];
    edges.forEach((e) => {
      if (e.from === currId) neighbors.push({ neighborId: e.to, edge: e });
      else if (!e.directed && e.to === currId) neighbors.push({ neighborId: e.from, edge: e });
    });

    for (const { neighborId, edge } of neighbors) {
      if (!visited.has(neighborId)) {
        edge.state = 'traversing';
        stack.push(neighborId);

        steps.push({
          nodes: cloneGraph(nodes, edges).nodes,
          edges: cloneGraph(nodes, edges).edges,
          currentNodeId: currId,
          currentEdgeId: edge.id,
          visitedNodeIds: Array.from(visited),
          queueOrStack: [...stack],
          phase: `Recurse to ${neighborId}`,
          explanation: `Following edge (${currId} -> ${neighborId}) into deeper recursion.`,
          codeLine: 5,
        });

        dfs(neighborId);
        stack.pop();

        steps.push({
          nodes: cloneGraph(nodes, edges).nodes,
          edges: cloneGraph(nodes, edges).edges,
          currentNodeId: currId,
          currentEdgeId: edge.id,
          visitedNodeIds: Array.from(visited),
          queueOrStack: [...stack],
          phase: `Backtrack to ${currId}`,
          explanation: `Backtracked to vertex ${currId} after exploring subtree of ${neighborId}.`,
          codeLine: 7,
        });
      }
    }

    if (currNode) currNode.state = 'visited';
  }

  dfs(startId);

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: Array.from(visited),
    queueOrStack: [],
    phase: 'DFS Traversal Complete',
    explanation: `DFS recursive search complete! Time: O(V + E), Space: O(V).`,
    codeLine: 9,
  });

  return steps;
}

// ─── 3. DIJKSTRA'S SHORTEST PATH ─────────────────────────────────────────────

export function generateDijkstraSteps(
  initNodes: GraphNode[],
  initEdges: GraphEdge[],
  startId: string = 'A',
  targetId: string = 'F'
): GraphStep[] {
  const steps: GraphStep[] = [];
  const { nodes, edges } = cloneGraph(initNodes, initEdges);

  const distances: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const visited = new Set<string>();

  nodes.forEach((n) => {
    distances[n.id] = n.id === startId ? 0 : Infinity;
    parent[n.id] = null;
    n.distance = distances[n.id];
  });

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: startId,
    currentEdgeId: null,
    visitedNodeIds: [],
    queueOrStack: [startId],
    distances: { ...distances },
    phase: 'Initialize Dijkstra Distances',
    explanation: `Set dist[${startId}] = 0 and all other vertices to Infinity (∞).`,
    codeLine: 2,
    isQuizPoint: true,
    quizData: {
      prompt: `Why does Dijkstra's algorithm require non-negative edge weights?`,
      options: [
        'Negative edges can produce infinite negative relaxation loops',
        'Priority queues only store positive numbers',
        'Graph vertices must have positive coordinates',
        'Dijkstra converts all edges to trees'
      ],
      correctIndex: 0,
      explanation: "Dijkstra relies on greedy assumption that once a node is finalized from the min-heap, its shortest path cannot decrease. Negative weights violate this property.",
    },
  });

  for (let stepCount = 0; stepCount < nodes.length; stepCount++) {
    // Find unvisited vertex with minimum distance
    let minNodeId: string | null = null;
    let minDist = Infinity;

    nodes.forEach((n) => {
      if (!visited.has(n.id) && distances[n.id] < minDist) {
        minDist = distances[n.id];
        minNodeId = n.id;
      }
    });

    if (!minNodeId || minDist === Infinity) break;

    const currId = minNodeId;
    visited.add(currId);
    const currNode = nodes.find((n) => n.id === currId);
    if (currNode) currNode.state = 'current';

    steps.push({
      nodes: cloneGraph(nodes, edges).nodes,
      edges: cloneGraph(nodes, edges).edges,
      currentNodeId: currId,
      currentEdgeId: null,
      visitedNodeIds: Array.from(visited),
      queueOrStack: nodes.filter((n) => !visited.has(n.id) && distances[n.id] < Infinity).map((n) => n.id),
      distances: { ...distances },
      phase: `Extract Min: Node ${currId} (dist=${minDist})`,
      explanation: `Extracted vertex ${currId} with minimal tentative distance ${minDist} from priority queue.`,
      codeLine: 4,
    });

    // Relax neighbors
    const incidentEdges = edges.filter(
      (e) => (e.from === currId || (!e.directed && e.to === currId))
    );

    for (const edge of incidentEdges) {
      const neighborId = edge.from === currId ? edge.to : edge.from;
      if (visited.has(neighborId)) continue;

      const weight = edge.weight || 1;
      const newDist = distances[currId] + weight;

      edge.state = 'traversing';

      if (newDist < distances[neighborId]) {
        distances[neighborId] = newDist;
        parent[neighborId] = currId;
        const neighborNode = nodes.find((n) => n.id === neighborId);
        if (neighborNode) neighborNode.distance = newDist;
        edge.state = 'relaxed';

        steps.push({
          nodes: cloneGraph(nodes, edges).nodes,
          edges: cloneGraph(nodes, edges).edges,
          currentNodeId: currId,
          currentEdgeId: edge.id,
          visitedNodeIds: Array.from(visited),
          queueOrStack: nodes.filter((n) => !visited.has(n.id) && distances[n.id] < Infinity).map((n) => n.id),
          distances: { ...distances },
          phase: `Relax Edge (${currId} -> ${neighborId})`,
          explanation: `Relaxation: dist[${currId}] (${distances[currId]}) + weight (${weight}) = ${newDist} < dist[${neighborId}]. Updated dist[${neighborId}] = ${newDist}.`,
          codeLine: 6,
        });
      }
    }

    if (currNode) currNode.state = 'visited';
  }

  // Highlight shortest path to target
  let curr = targetId;
  while (parent[curr]) {
    const p = parent[curr]!;
    const pEdge = edges.find(
      (e) => (e.from === p && e.to === curr) || (!e.directed && e.from === curr && e.to === p)
    );
    if (pEdge) pEdge.state = 'mst';
    const targetNode = nodes.find((n) => n.id === curr);
    if (targetNode) targetNode.state = 'shortest';
    curr = p;
  }
  const startFinal = nodes.find((n) => n.id === startId);
  if (startFinal) startFinal.state = 'shortest';

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: Array.from(visited),
    queueOrStack: [],
    distances: { ...distances },
    phase: 'Shortest Path Found!',
    explanation: `Dijkstra complete! Shortest distance from ${startId} to ${targetId} is ${distances[targetId]}. Path highlighted in emerald.`,
    codeLine: 8,
  });

  return steps;
}

// ─── 4. PRIM'S MINIMUM SPANNING TREE (MST) ───────────────────────────────────

export function generatePrimsSteps(
  initNodes: GraphNode[],
  initEdges: GraphEdge[],
  startId: string = 'A'
): GraphStep[] {
  const steps: GraphStep[] = [];
  const { nodes, edges } = cloneGraph(initNodes, initEdges);

  const inMST = new Set<string>([startId]);
  let totalWeight = 0;

  const startNode = nodes.find((n) => n.id === startId);
  if (startNode) startNode.state = 'mst';

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: startId,
    currentEdgeId: null,
    visitedNodeIds: Array.from(inMST),
    queueOrStack: [startId],
    mstWeight: totalWeight,
    phase: "Initialize Prim's Tree",
    explanation: `Started MST from root vertex ${startId}. Total MST Weight = 0.`,
    codeLine: 2,
  });

  while (inMST.size < nodes.length) {
    let minEdge: GraphEdge | null = null;
    let minWeight = Infinity;
    let nextNodeId: string | null = null;

    // Find minimum cut edge connecting inMST to outside
    for (const e of edges) {
      if (e.state === 'mst') continue;
      const uIn = inMST.has(e.from);
      const vIn = inMST.has(e.to);

      if ((uIn && !vIn) || (!uIn && vIn)) {
        const weight = e.weight || 1;
        if (weight < minWeight) {
          minWeight = weight;
          minEdge = e;
          nextNodeId = uIn ? e.to : e.from;
        }
      }
    }

    if (!minEdge || !nextNodeId) break;

    minEdge.state = 'mst';
    inMST.add(nextNodeId);
    totalWeight += minWeight;

    const nextNode = nodes.find((n) => n.id === nextNodeId);
    if (nextNode) nextNode.state = 'mst';

    steps.push({
      nodes: cloneGraph(nodes, edges).nodes,
      edges: cloneGraph(nodes, edges).edges,
      currentNodeId: nextNodeId,
      currentEdgeId: minEdge.id,
      visitedNodeIds: Array.from(inMST),
      queueOrStack: Array.from(inMST),
      mstWeight: totalWeight,
      phase: `Add Edge (${minEdge.from}-${minEdge.to}, w=${minWeight})`,
      explanation: `Greedy Cut: Selected minimum weight cross-edge (${minEdge.from}-${minEdge.to}, weight=${minWeight}). Added ${nextNodeId} to MST. Total weight = ${totalWeight}.`,
      codeLine: 5,
    });
  }

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: Array.from(inMST),
    queueOrStack: [],
    mstWeight: totalWeight,
    phase: "Prim's MST Complete",
    explanation: `Minimum Spanning Tree established with |V|-1 = ${edges.filter((e) => e.state === 'mst').length} edges. Total Cost: ${totalWeight}.`,
    codeLine: 7,
  });

  return steps;
}

// ─── 5. TOPOLOGICAL SORT (KAHN'S ALGORITHM) ───────────────────────────────────

export function generateTopoSortSteps(
  initNodes: GraphNode[],
  initEdges: GraphEdge[]
): GraphStep[] {
  const steps: GraphStep[] = [];
  const { nodes, edges } = cloneGraph(initNodes, initEdges);

  const inDegree: Record<string, number> = {};
  nodes.forEach((n) => (inDegree[n.id] = 0));

  edges.forEach((e) => {
    if (e.directed) {
      inDegree[e.to] = (inDegree[e.to] || 0) + 1;
    }
  });

  nodes.forEach((n) => (n.inDegree = inDegree[n.id]));

  const zeroInDegreeQueue: string[] = nodes
    .filter((n) => inDegree[n.id] === 0)
    .map((n) => n.id);

  zeroInDegreeQueue.forEach((id) => {
    const node = nodes.find((n) => n.id === id);
    if (node) node.state = 'queued';
  });

  const topoOrder: string[] = [];

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: [],
    queueOrStack: [...zeroInDegreeQueue],
    phase: 'Compute In-Degrees',
    explanation: `Calculated in-degrees for all vertices. Enqueued zero in-degree nodes: [${zeroInDegreeQueue.join(', ')}].`,
    codeLine: 2,
  });

  while (zeroInDegreeQueue.length > 0) {
    const currId = zeroInDegreeQueue.shift()!;
    topoOrder.push(currId);
    const currNode = nodes.find((n) => n.id === currId);
    if (currNode) currNode.state = 'visited';

    steps.push({
      nodes: cloneGraph(nodes, edges).nodes,
      edges: cloneGraph(nodes, edges).edges,
      currentNodeId: currId,
      currentEdgeId: null,
      visitedNodeIds: [...topoOrder],
      queueOrStack: [...zeroInDegreeQueue],
      phase: `Emit Node ${currId} to Topo Order`,
      explanation: `Emitted vertex ${currId} to topological order. Decrementing in-degree of outgoing neighbors.`,
      codeLine: 4,
    });

    const outgoingEdges = edges.filter((e) => e.from === currId);
    for (const edge of outgoingEdges) {
      edge.state = 'visited';
      inDegree[edge.to]--;
      const neighborNode = nodes.find((n) => n.id === edge.to);
      if (neighborNode) neighborNode.inDegree = inDegree[edge.to];

      if (inDegree[edge.to] === 0) {
        zeroInDegreeQueue.push(edge.to);
        if (neighborNode) neighborNode.state = 'queued';

        steps.push({
          nodes: cloneGraph(nodes, edges).nodes,
          edges: cloneGraph(nodes, edges).edges,
          currentNodeId: currId,
          currentEdgeId: edge.id,
          visitedNodeIds: [...topoOrder],
          queueOrStack: [...zeroInDegreeQueue],
          phase: `In-Degree of ${edge.to} Reached 0`,
          explanation: `In-degree of ${edge.to} is now 0. Enqueued ${edge.to}.`,
          codeLine: 6,
        });
      }
    }
  }

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: [...topoOrder],
    queueOrStack: [],
    phase: 'Topological Sort Complete',
    explanation: `Valid topological sort order: [ ${topoOrder.join(' -> ')} ]. Time Complexity: O(V + E).`,
    codeLine: 8,
  });

  return steps;
}

// ─── 6. KRUSKAL'S MINIMUM SPANNING TREE ──────────────────────────────────────

class DSU {
  parent: Map<string, string>;
  rank: Map<string, number>;
  constructor(ids: string[]) {
    this.parent = new Map(ids.map((id) => [id, id]));
    this.rank = new Map(ids.map((id) => [id, 0]));
  }
  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }
  union(x: string, y: string): boolean {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return false;
    if ((this.rank.get(rx) ?? 0) < (this.rank.get(ry) ?? 0)) {
      this.parent.set(rx, ry);
    } else if ((this.rank.get(rx) ?? 0) > (this.rank.get(ry) ?? 0)) {
      this.parent.set(ry, rx);
    } else {
      this.parent.set(ry, rx);
      this.rank.set(rx, (this.rank.get(rx) ?? 0) + 1);
    }
    return true;
  }
  getComponents(ids: string[]): string[][] {
    const groups = new Map<string, string[]>();
    for (const id of ids) {
      const root = this.find(id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(id);
    }
    return Array.from(groups.values());
  }
}

export function generateKruskalSteps(
  initNodes: GraphNode[],
  initEdges: GraphEdge[]
): GraphStep[] {
  const steps: GraphStep[] = [];
  const { nodes, edges } = cloneGraph(initNodes, initEdges);
  const nodeIds = nodes.map((n) => n.id);
  const dsu = new DSU(nodeIds);

  // Sort edges by weight
  const weightedEdges = edges
    .filter((e) => e.weight !== undefined)
    .sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));

  const sortedPanel = weightedEdges.map((e) => ({
    edgeId: e.id,
    from: e.from,
    to: e.to,
    weight: e.weight ?? 0,
    state: 'pending' as const,
  }));

  const mstEdges: string[] = [];
  let mstWeight = 0;

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: [],
    queueOrStack: [],
    sortedEdges: sortedPanel.map((s) => ({ ...s })),
    dsuComponents: dsu.getComponents(nodeIds),
    phase: 'Sort Edges',
    explanation: `Kruskal's: Sort all ${weightedEdges.length} edges by weight. Process smallest first to greedily build a Minimum Spanning Tree without creating cycles.`,
    codeLine: 1,
    isQuizPoint: true,
    quizData: {
      prompt: 'What data structure does Kruskal\'s algorithm use to detect cycles?',
      options: ['Disjoint Set Union (DSU)', 'Min-Heap', 'Adjacency Matrix', 'DFS Stack'],
      correctIndex: 0,
      explanation: 'Kruskal\'s uses a Disjoint Set Union (DSU) to efficiently check whether two vertices belong to the same component, which would indicate a cycle.',
    },
  });

  for (let i = 0; i < weightedEdges.length; i++) {
    const edge = weightedEdges[i];
    const currentEdge = edges.find((e) => e.id === edge.id)!;
    currentEdge.state = 'traversing';
    sortedPanel[i].state = 'current';

    const fromRoot = dsu.find(edge.from);
    const toRoot = dsu.find(edge.to);
    const wouldCycle = fromRoot === toRoot;

    steps.push({
      nodes: cloneGraph(nodes, edges).nodes,
      edges: cloneGraph(nodes, edges).edges,
      currentNodeId: null,
      currentEdgeId: edge.id,
      visitedNodeIds: mstEdges,
      queueOrStack: [],
      sortedEdges: sortedPanel.map((s) => ({ ...s })),
      dsuComponents: dsu.getComponents(nodeIds),
      mstWeight,
      phase: `Evaluate Edge ${edge.from}-${edge.to} (w=${edge.weight})`,
      explanation: `Evaluating edge ${edge.from}–${edge.to} (weight ${edge.weight}). Component(${edge.from})=${dsu.find(edge.from)}, Component(${edge.to})=${dsu.find(edge.to)}. ${wouldCycle ? 'SAME component — this edge would create a CYCLE.' : 'DIFFERENT components — safe to add.'}`,
      codeLine: 3,
      isQuizPoint: i === 0,
      quizData: i === 0 ? {
        prompt: 'Kruskal\'s processes edges in which order?',
        options: ['Ascending weight order', 'Descending weight order', 'Alphabetical order', 'Random order'],
        correctIndex: 0,
        explanation: 'Kruskal\'s algorithm processes edges in ascending order of weight, greedily choosing the cheapest edge that doesn\'t create a cycle.',
      } : undefined,
    });

    if (wouldCycle) {
      currentEdge.state = 'backtrack';
      sortedPanel[i].state = 'rejected';
      steps.push({
        nodes: cloneGraph(nodes, edges).nodes,
        edges: cloneGraph(nodes, edges).edges,
        currentNodeId: null,
        currentEdgeId: edge.id,
        visitedNodeIds: mstEdges,
        queueOrStack: [],
        sortedEdges: sortedPanel.map((s) => ({ ...s })),
        dsuComponents: dsu.getComponents(nodeIds),
        mstWeight,
        phase: `REJECTED: ${edge.from}-${edge.to}`,
        explanation: `REJECTED edge ${edge.from}–${edge.to}: Both vertices are already in the same component (root=${fromRoot}). Adding this edge would form a CYCLE.`,
        codeLine: 5,
        isQuizPoint: true,
        quizData: {
          prompt: `Edge ${edge.from}–${edge.to} was rejected. Why?`,
          options: [
            'Both vertices are in the same component — adding it creates a cycle',
            'Its weight is too large',
            'The MST already has enough edges',
            'The vertex was already visited',
          ],
          correctIndex: 0,
          explanation: `Kruskal's uses DSU to detect cycles. Since ${edge.from} and ${edge.to} share the same component root, connecting them creates a cycle.`,
        },
      });
    } else {
      dsu.union(edge.from, edge.to);
      currentEdge.state = 'mst';
      sortedPanel[i].state = 'accepted';
      mstEdges.push(edge.id);
      mstWeight += edge.weight ?? 0;
      // Mark both endpoint nodes as MST
      [edge.from, edge.to].forEach((id) => {
        const n = nodes.find((n) => n.id === id);
        if (n) n.state = 'mst';
      });
      steps.push({
        nodes: cloneGraph(nodes, edges).nodes,
        edges: cloneGraph(nodes, edges).edges,
        currentNodeId: null,
        currentEdgeId: edge.id,
        visitedNodeIds: mstEdges,
        queueOrStack: [],
        sortedEdges: sortedPanel.map((s) => ({ ...s })),
        dsuComponents: dsu.getComponents(nodeIds),
        mstWeight,
        phase: `ACCEPTED: ${edge.from}-${edge.to}`,
        explanation: `ACCEPTED edge ${edge.from}–${edge.to} (weight ${edge.weight}). Merged components. MST total weight so far: ${mstWeight}.`,
        codeLine: 7,
      });
    }

    if (mstEdges.length === nodeIds.length - 1) break;
  }

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: mstEdges,
    queueOrStack: [],
    sortedEdges: sortedPanel.map((s) => ({ ...s })),
    dsuComponents: dsu.getComponents(nodeIds),
    mstWeight,
    phase: "Kruskal's MST Complete",
    explanation: `Minimum Spanning Tree complete! Total weight = ${mstWeight} using ${mstEdges.length} edges. This is the minimum cost to connect all vertices.`,
    codeLine: 9,
  });

  return steps;
}

// ─── 7. BELLMAN-FORD SHORTEST PATH ───────────────────────────────────────────

export function generateBellmanFordSteps(
  initNodes: GraphNode[],
  initEdges: GraphEdge[],
  sourceId = 'A'
): GraphStep[] {
  const steps: GraphStep[] = [];
  const { nodes, edges } = cloneGraph(initNodes, initEdges);
  const V = nodes.length;

  const dist: Record<string, number> = {};
  nodes.forEach((n) => (dist[n.id] = n.id === sourceId ? 0 : Infinity));

  // Apply distances to nodes
  const applyDist = () => {
    nodes.forEach((n) => { n.distance = dist[n.id] === Infinity ? undefined : dist[n.id]; });
    const srcNode = nodes.find((n) => n.id === sourceId);
    if (srcNode) srcNode.state = 'shortest';
  };

  applyDist();

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: [sourceId],
    queueOrStack: [],
    distances: { ...dist },
    passNumber: 0,
    phase: 'Initialize',
    explanation: `Bellman-Ford: Initialize distances. Source ${sourceId} = 0, all others = ∞. Will run ${V - 1} relaxation passes over all edges.`,
    codeLine: 1,
    isQuizPoint: true,
    quizData: {
      prompt: 'How many relaxation passes does Bellman-Ford perform?',
      options: [`V - 1 = ${V - 1} passes`, `V = ${V} passes`, `E passes`, `log V passes`],
      correctIndex: 0,
      explanation: `Bellman-Ford runs exactly V-1 passes. A shortest path can have at most V-1 edges, so V-1 rounds of relaxation is sufficient.`,
    },
  });

  let updated = true;
  for (let pass = 1; pass <= V - 1 && updated; pass++) {
    updated = false;

    steps.push({
      nodes: cloneGraph(nodes, edges).nodes,
      edges: cloneGraph(nodes, edges).edges,
      currentNodeId: null,
      currentEdgeId: null,
      visitedNodeIds: [],
      queueOrStack: [],
      distances: { ...dist },
      passNumber: pass,
      phase: `Pass ${pass} / ${V - 1}`,
      explanation: `Starting Pass ${pass} of ${V - 1}. Attempt to relax every edge.`,
      codeLine: 3,
    });

    for (const edge of edges) {
      const u = edge.from;
      const v = edge.to;
      const w = edge.weight ?? 0;
      if (dist[u] === Infinity) continue;

      const newDist = dist[u] + w;
      const oldDist = dist[v];
      const success = newDist < oldDist;

      // Mark edge as traversing
      edges.forEach((e) => { e.state = 'default'; });
      const currentEdge = edges.find((e) => e.id === edge.id);
      if (currentEdge) currentEdge.state = 'traversing';

      nodes.forEach((n) => {
        if (n.id === u) n.state = 'current';
        else if (n.id === v) n.state = 'queued';
        else n.state = 'default';
      });

      steps.push({
        nodes: cloneGraph(nodes, edges).nodes,
        edges: cloneGraph(nodes, edges).edges,
        currentNodeId: u,
        currentEdgeId: edge.id,
        visitedNodeIds: [],
        queueOrStack: [],
        distances: { ...dist },
        passNumber: pass,
        relaxation: { edgeId: edge.id, success, oldDist, newDist },
        phase: `Relax ${u}→${v}`,
        explanation: success
          ? `Relax ${u}→${v}: dist[${u}](${dist[u]}) + w(${w}) = ${newDist} < dist[${v}](${oldDist === Infinity ? '∞' : oldDist}). UPDATED! dist[${v}] = ${newDist}.`
          : `Relax ${u}→${v}: dist[${u}](${dist[u] === Infinity ? '∞' : dist[u]}) + w(${w}) = ${newDist === Infinity ? '∞' : newDist} ≥ dist[${v}](${oldDist === Infinity ? '∞' : oldDist}). No improvement.`,
        codeLine: 5,
      });

      if (success) {
        updated = true;
        dist[v] = newDist;
        applyDist();
        const updEdge = edges.find((e) => e.id === edge.id);
        if (updEdge) updEdge.state = 'relaxed';
        const vNode = nodes.find((n) => n.id === v);
        if (vNode) { vNode.state = 'shortest'; vNode.distance = newDist; }

        steps.push({
          nodes: cloneGraph(nodes, edges).nodes,
          edges: cloneGraph(nodes, edges).edges,
          currentNodeId: v,
          currentEdgeId: edge.id,
          visitedNodeIds: [],
          queueOrStack: [],
          distances: { ...dist },
          passNumber: pass,
          relaxation: { edgeId: edge.id, success: true, oldDist, newDist },
          phase: `Updated dist[${v}]`,
          explanation: `dist[${v}] updated to ${newDist}. Path: ${sourceId} → ... → ${u} → ${v}.`,
          codeLine: 6,
        });
      }
    }
  }

  // ── Negative cycle detection pass ─────────────────────────────────────
  let hasNegativeCycle = false;
  for (const edge of edges) {
    const u = edge.from;
    const v = edge.to;
    const w = edge.weight ?? 0;
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
      hasNegativeCycle = true;
      edges.find((e) => e.id === edge.id && (e.state = 'backtrack'));
    }
  }

  edges.forEach((e) => { if (e.state !== 'backtrack' && e.state !== 'relaxed') e.state = 'default'; });

  steps.push({
    nodes: cloneGraph(nodes, edges).nodes,
    edges: cloneGraph(nodes, edges).edges,
    currentNodeId: null,
    currentEdgeId: null,
    visitedNodeIds: Object.entries(dist).filter(([, d]) => d !== Infinity).map(([id]) => id),
    queueOrStack: [],
    distances: { ...dist },
    hasNegativeCycle,
    phase: hasNegativeCycle ? 'Negative Cycle Detected!' : 'Bellman-Ford Complete',
    explanation: hasNegativeCycle
      ? 'NEGATIVE CYCLE DETECTED! After V-1 passes, further relaxation is still possible — this means there is a negative weight cycle reachable from the source. Shortest paths are undefined.'
      : `Bellman-Ford complete. Shortest distances from ${sourceId}: ${Object.entries(dist).map(([k, v]) => `${k}=${v === Infinity ? '∞' : v}`).join(', ')}.`,
    codeLine: 9,
    isQuizPoint: true,
    quizData: {
      prompt: 'What indicates a negative cycle in Bellman-Ford?',
      options: [
        'A further improvement is possible after V-1 passes',
        'The algorithm takes more than O(VE) time',
        'Two nodes have the same distance',
        'An edge weight is negative',
      ],
      correctIndex: 0,
      explanation: 'If any edge can still be relaxed after V-1 passes, it means there is a reachable negative weight cycle, causing shortest distances to be undefined.',
    },
  });

  return steps;
}

// ─── 8. A* PATHFINDING ──────────────────────────────────────────────────────

export interface AStarCell {
  id: string;
  row: number;
  col: number;
  type: 'empty' | 'wall' | 'start' | 'goal';
  state: 'unvisited' | 'open' | 'closed' | 'path' | 'current';
  g?: number;
  h?: number;
  f?: number;
  parent?: string;
}

export interface AStarStep {
  grid: AStarCell[][];
  openSet: string[];
  closedSet: string[];
  currentCell: string | null;
  path: string[];
  phase: string;
  explanation: string;
  codeLine: number;
  found: boolean;
  unreachable: boolean;
}

const DEFAULT_GRID_ROWS = 8;
const DEFAULT_GRID_COLS = 12;

export function getDefaultAStarGrid(): AStarCell[][] {
  const walls = new Set([
    '1_3','2_3','3_3','4_3','5_3', // vertical wall
    '3_5','3_6','3_7','3_8',        // horizontal wall
    '1_9','2_9','4_9','5_9','6_9',  // right barrier
  ]);
  const grid: AStarCell[][] = [];
  for (let r = 0; r < DEFAULT_GRID_ROWS; r++) {
    const row: AStarCell[] = [];
    for (let c = 0; c < DEFAULT_GRID_COLS; c++) {
      const id = `${r}_${c}`;
      const isWall = walls.has(id);
      const isStart = r === 3 && c === 1;
      const isGoal = r === 3 && c === 11;
      row.push({
        id,
        row: r,
        col: c,
        type: isStart ? 'start' : isGoal ? 'goal' : isWall ? 'wall' : 'empty',
        state: 'unvisited',
      });
    }
    grid.push(row);
  }
  return grid;
}

function heuristic(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2); // Manhattan distance
}

function cloneGrid(grid: AStarCell[][]): AStarCell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function generateAStarSteps(initialGrid: AStarCell[][]): AStarStep[] {
  const steps: AStarStep[] = [];

  let grid = cloneGrid(initialGrid);

  // Find start and goal
  let startId = '';
  let goalId = '';
  let startR = 0, startC = 0, goalR = 0, goalC = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type === 'start') { startId = cell.id; startR = cell.row; startC = cell.col; }
      if (cell.type === 'goal')  { goalId = cell.id;  goalR = cell.row;  goalC = cell.col; }
    }
  }

  const g: Record<string, number> = {};
  const h: Record<string, number> = {};
  const f: Record<string, number> = {};
  const parent: Record<string, string | null> = {};

  const getCell = (id: string): AStarCell | undefined => {
    const [r, c] = id.split('_').map(Number);
    return grid[r]?.[c];
  };

  // Initialize start
  g[startId] = 0;
  h[startId] = heuristic(startR, startC, goalR, goalC);
  f[startId] = h[startId];
  parent[startId] = null;

  const openSet = new Set<string>([startId]);
  const closedSet = new Set<string>();

  const updateGridState = () => {
    grid = cloneGrid(initialGrid);
    for (const row of grid) {
      for (const cell of row) {
        if (openSet.has(cell.id)) {
          cell.state = 'open';
          cell.g = g[cell.id];
          cell.h = h[cell.id];
          cell.f = f[cell.id];
        } else if (closedSet.has(cell.id)) {
          cell.state = 'closed';
          cell.g = g[cell.id];
          cell.h = h[cell.id];
          cell.f = f[cell.id];
        }
      }
    }
  };

  steps.push({
    grid: cloneGrid(grid),
    openSet: [startId],
    closedSet: [],
    currentCell: null,
    path: [],
    phase: 'Initialize A*',
    explanation: `A* Search: Initialize. Start=${startId} (g=0, h=${h[startId]}, f=${f[startId]}). Heuristic: Manhattan distance. Open set contains only the start node.`,
    codeLine: 1,
    found: false,
    unreachable: false,
  });

  while (openSet.size > 0) {
    // Pick cell with lowest f score
    let currentId = '';
    let lowestF = Infinity;
    for (const id of openSet) {
      if ((f[id] ?? Infinity) < lowestF) {
        lowestF = f[id]!;
        currentId = id;
      }
    }

    const current = getCell(currentId);
    if (!current) break;

    // Mark current in grid
    updateGridState();
    grid[current.row][current.col].state = 'current';
    grid[current.row][current.col].g = g[currentId];
    grid[current.row][current.col].h = h[currentId];
    grid[current.row][current.col].f = f[currentId];

    steps.push({
      grid: cloneGrid(grid),
      openSet: Array.from(openSet),
      closedSet: Array.from(closedSet),
      currentCell: currentId,
      path: [],
      phase: `Expand ${currentId}`,
      explanation: `Expanding cell ${currentId} (g=${g[currentId]}, h=${h[currentId]}, f=${f[currentId]}) — lowest f in open set. Move to closed set.`,
      codeLine: 5,
      found: false,
      unreachable: false,
    });

    if (currentId === goalId) {
      // Reconstruct path
      const path: string[] = [];
      let cur: string | null = goalId;
      while (cur) { path.unshift(cur); cur = parent[cur] ?? null; }

      updateGridState();
      for (const id of path) {
        const [r, c] = id.split('_').map(Number);
        if (grid[r]?.[c]) grid[r][c].state = 'path';
      }

      steps.push({
        grid: cloneGrid(grid),
        openSet: Array.from(openSet),
        closedSet: Array.from(closedSet),
        currentCell: goalId,
        path,
        phase: 'Goal Reached!',
        explanation: `GOAL REACHED! Optimal path found: ${path.join(' → ')}. Total cost g=${g[goalId]}. A* guarantees this is the shortest path when the heuristic is admissible.`,
        codeLine: 8,
        found: true,
        unreachable: false,
      });
      return steps;
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    // Explore neighbors (4-directional)
    const [cr, cc] = currentId.split('_').map(Number);
    const neighbors: [number, number][] = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];

    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= DEFAULT_GRID_ROWS || nc < 0 || nc >= DEFAULT_GRID_COLS) continue;
      const neighbor = grid[nr]?.[nc];
      if (!neighbor || neighbor.type === 'wall') continue;
      const nId = neighbor.id;
      if (closedSet.has(nId)) continue;

      const tentativeG = (g[currentId] ?? Infinity) + 1;
      const hVal = heuristic(nr, nc, goalR, goalC);
      const fVal = tentativeG + hVal;

      if (!openSet.has(nId)) {
        g[nId] = tentativeG;
        h[nId] = hVal;
        f[nId] = fVal;
        parent[nId] = currentId;
        openSet.add(nId);

        updateGridState();
        grid[nr][nc].state = 'open';
        grid[nr][nc].g = tentativeG;
        grid[nr][nc].h = hVal;
        grid[nr][nc].f = fVal;

        steps.push({
          grid: cloneGrid(grid),
          openSet: Array.from(openSet),
          closedSet: Array.from(closedSet),
          currentCell: currentId,
          path: [],
          phase: `Add neighbor ${nId} to open set`,
          explanation: `Adding neighbor ${nId} to open set. g=${tentativeG} (cost from start), h=${hVal} (Manhattan to goal), f=${fVal}. Parent = ${currentId}.`,
          codeLine: 11,
          found: false,
          unreachable: false,
        });
      } else if (tentativeG < (g[nId] ?? Infinity)) {
        const oldG = g[nId];
        g[nId] = tentativeG;
        f[nId] = fVal;
        parent[nId] = currentId;
        steps.push({
          grid: cloneGrid(grid),
          openSet: Array.from(openSet),
          closedSet: Array.from(closedSet),
          currentCell: currentId,
          path: [],
          phase: `Update ${nId} — better path found`,
          explanation: `Better path to ${nId} found via ${currentId}! Old g=${oldG} → New g=${tentativeG}. f updated to ${fVal}.`,
          codeLine: 13,
          found: false,
          unreachable: false,
        });
      }
    }
  }

  // Open set exhausted — goal unreachable
  updateGridState();
  steps.push({
    grid: cloneGrid(grid),
    openSet: [],
    closedSet: Array.from(closedSet),
    currentCell: null,
    path: [],
    phase: 'Goal Unreachable',
    explanation: 'A* exhausted all reachable cells. The goal is completely surrounded by walls or disconnected from the start. No path exists.',
    codeLine: 15,
    found: false,
    unreachable: true,
  });

  return steps;
}
