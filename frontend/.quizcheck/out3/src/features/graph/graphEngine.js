"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresetGraph = getPresetGraph;
exports.generateBFSSteps = generateBFSSteps;
exports.generateDFSSteps = generateDFSSteps;
exports.generateDijkstraSteps = generateDijkstraSteps;
exports.generatePrimsSteps = generatePrimsSteps;
exports.generateTopoSortSteps = generateTopoSortSteps;
// ─── PRESET GRAPH TOPOLOGIES ──────────────────────────────────────────────────
function getPresetGraph(type) {
    if (type === 'dag') {
        // Directed Acyclic Graph for Topological Sort
        const nodes = [
            { id: 'A', label: 'A', x: 80, y: 80, state: 'default' },
            { id: 'B', label: 'B', x: 80, y: 220, state: 'default' },
            { id: 'C', label: 'C', x: 260, y: 60, state: 'default' },
            { id: 'D', label: 'D', x: 260, y: 240, state: 'default' },
            { id: 'E', label: 'E', x: 440, y: 80, state: 'default' },
            { id: 'F', label: 'F', x: 440, y: 220, state: 'default' },
        ];
        const edges = [
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
    const nodes = [
        { id: 'A', label: 'A', x: 80, y: 150, state: 'default' },
        { id: 'B', label: 'B', x: 200, y: 60, state: 'default' },
        { id: 'C', label: 'C', x: 200, y: 240, state: 'default' },
        { id: 'D', label: 'D', x: 360, y: 60, state: 'default' },
        { id: 'E', label: 'E', x: 360, y: 240, state: 'default' },
        { id: 'F', label: 'F', x: 480, y: 150, state: 'default' },
    ];
    const edges = [
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
function cloneGraph(nodes, edges) {
    return {
        nodes: nodes.map((n) => ({ ...n })),
        edges: edges.map((e) => ({ ...e })),
    };
}
// ─── 1. BREADTH-FIRST SEARCH (BFS) ───────────────────────────────────────────
function generateBFSSteps(initNodes, initEdges, startId = 'A') {
    const steps = [];
    const { nodes, edges } = cloneGraph(initNodes, initEdges);
    const queue = [startId];
    const visited = new Set([startId]);
    // Step 0: Initialize
    const startNode = nodes.find((n) => n.id === startId);
    if (startNode)
        startNode.state = 'queued';
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
        const currId = queue.shift();
        const currNode = nodes.find((n) => n.id === currId);
        if (currNode)
            currNode.state = 'current';
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
        const neighbors = [];
        edges.forEach((e) => {
            if (e.from === currId && (!e.directed || true)) {
                neighbors.push({ neighborId: e.to, edge: e });
            }
            else if (!e.directed && e.to === currId) {
                neighbors.push({ neighborId: e.from, edge: e });
            }
        });
        for (const { neighborId, edge } of neighbors) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
                const neighborNode = nodes.find((n) => n.id === neighborId);
                if (neighborNode)
                    neighborNode.state = 'queued';
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
        if (currNode)
            currNode.state = 'visited';
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
function generateDFSSteps(initNodes, initEdges, startId = 'A') {
    const steps = [];
    const { nodes, edges } = cloneGraph(initNodes, initEdges);
    const stack = [startId];
    const visited = new Set();
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
    function dfs(currId) {
        visited.add(currId);
        const currNode = nodes.find((n) => n.id === currId);
        if (currNode)
            currNode.state = 'current';
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
        const neighbors = [];
        edges.forEach((e) => {
            if (e.from === currId)
                neighbors.push({ neighborId: e.to, edge: e });
            else if (!e.directed && e.to === currId)
                neighbors.push({ neighborId: e.from, edge: e });
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
        if (currNode)
            currNode.state = 'visited';
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
function generateDijkstraSteps(initNodes, initEdges, startId = 'A', targetId = 'F') {
    const steps = [];
    const { nodes, edges } = cloneGraph(initNodes, initEdges);
    const distances = {};
    const parent = {};
    const visited = new Set();
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
        let minNodeId = null;
        let minDist = Infinity;
        nodes.forEach((n) => {
            if (!visited.has(n.id) && distances[n.id] < minDist) {
                minDist = distances[n.id];
                minNodeId = n.id;
            }
        });
        if (!minNodeId || minDist === Infinity)
            break;
        const currId = minNodeId;
        visited.add(currId);
        const currNode = nodes.find((n) => n.id === currId);
        if (currNode)
            currNode.state = 'current';
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
        const incidentEdges = edges.filter((e) => (e.from === currId || (!e.directed && e.to === currId)));
        for (const edge of incidentEdges) {
            const neighborId = edge.from === currId ? edge.to : edge.from;
            if (visited.has(neighborId))
                continue;
            const weight = edge.weight || 1;
            const newDist = distances[currId] + weight;
            edge.state = 'traversing';
            if (newDist < distances[neighborId]) {
                distances[neighborId] = newDist;
                parent[neighborId] = currId;
                const neighborNode = nodes.find((n) => n.id === neighborId);
                if (neighborNode)
                    neighborNode.distance = newDist;
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
        if (currNode)
            currNode.state = 'visited';
    }
    // Highlight shortest path to target
    let curr = targetId;
    while (parent[curr]) {
        const p = parent[curr];
        const pEdge = edges.find((e) => (e.from === p && e.to === curr) || (!e.directed && e.from === curr && e.to === p));
        if (pEdge)
            pEdge.state = 'mst';
        const targetNode = nodes.find((n) => n.id === curr);
        if (targetNode)
            targetNode.state = 'shortest';
        curr = p;
    }
    const startFinal = nodes.find((n) => n.id === startId);
    if (startFinal)
        startFinal.state = 'shortest';
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
function generatePrimsSteps(initNodes, initEdges, startId = 'A') {
    const steps = [];
    const { nodes, edges } = cloneGraph(initNodes, initEdges);
    const inMST = new Set([startId]);
    let totalWeight = 0;
    const startNode = nodes.find((n) => n.id === startId);
    if (startNode)
        startNode.state = 'mst';
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
        let minEdge = null;
        let minWeight = Infinity;
        let nextNodeId = null;
        // Find minimum cut edge connecting inMST to outside
        for (const e of edges) {
            if (e.state === 'mst')
                continue;
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
        if (!minEdge || !nextNodeId)
            break;
        minEdge.state = 'mst';
        inMST.add(nextNodeId);
        totalWeight += minWeight;
        const nextNode = nodes.find((n) => n.id === nextNodeId);
        if (nextNode)
            nextNode.state = 'mst';
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
function generateTopoSortSteps(initNodes, initEdges) {
    const steps = [];
    const { nodes, edges } = cloneGraph(initNodes, initEdges);
    const inDegree = {};
    nodes.forEach((n) => (inDegree[n.id] = 0));
    edges.forEach((e) => {
        if (e.directed) {
            inDegree[e.to] = (inDegree[e.to] || 0) + 1;
        }
    });
    nodes.forEach((n) => (n.inDegree = inDegree[n.id]));
    const zeroInDegreeQueue = nodes
        .filter((n) => inDegree[n.id] === 0)
        .map((n) => n.id);
    zeroInDegreeQueue.forEach((id) => {
        const node = nodes.find((n) => n.id === id);
        if (node)
            node.state = 'queued';
    });
    const topoOrder = [];
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
        const currId = zeroInDegreeQueue.shift();
        topoOrder.push(currId);
        const currNode = nodes.find((n) => n.id === currId);
        if (currNode)
            currNode.state = 'visited';
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
            if (neighborNode)
                neighborNode.inDegree = inDegree[edge.to];
            if (inDegree[edge.to] === 0) {
                zeroInDegreeQueue.push(edge.to);
                if (neighborNode)
                    neighborNode.state = 'queued';
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
