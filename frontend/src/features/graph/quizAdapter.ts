import type { GraphCategory, GraphEdge, GraphStep } from './graphEngine';
import { buildOptions, type QuizCheckpoint, type QuizWeight , type QuizRevisionData } from '../../engine/types/Quiz';

/* ── Graph quiz adapter ────────────────────────────────────────────────
   Graph shipped exactly two authored questions — one on BFS step 0
   (graphEngine.ts:141) and one on Dijkstra step 0 (graphEngine.ts:352) —
   both pure theory, both with `correctIndex: 0`, and both fired once at
   the very start of a run. Nothing about the traversal actually unfolding
   on the canvas was ever asked.

   Everything below the two anchors is derived from the step stream, and
   every derived answer is cross-checked two independent ways before a
   checkpoint is emitted: once from the *next* step (what the engine is
   about to do) and once by re-deriving the decision from the state
   visible at the *current* step. If the two disagree the candidate is
   dropped rather than guessed at, so a question can never contradict the
   canvas. Ties are dropped for the same reason: when two crossing edges
   or two frontier vertices share the minimum, the engine breaks the tie
   by array order, which is an implementation detail no student can see.

   Answerability rests on what GraphRenderer actually draws: the
   `QUEUE / STACK: [...]` and `VISITED: {...}` HUD badges
   (GraphRenderer.tsx:170-183), the `d=` distance badges (:129), the
   `deg:` in-degree badges (:152) and the edge weight chips (:54).

   One question was designed and then rejected: "does dist[v] improve?"
   asked at a *relax* step. The engine only emits a relax step when the
   distance did improve, so the answer would have been yes every single
   time. It survives in a different form — asked at the extraction step,
   where both outcomes genuinely occur.
   ─────────────────────────────────────────────────────────────────── */

/** Placement intent. Lower wins when two candidates want the same step. */
const PRIMARY = 1;
const SECONDARY = 2;

interface Candidate {
  stepIndex: number;
  /** Groups candidates for weighting: the Nth of a kind gets demoted. */
  kind: string;
  priority: number;
  /** How many occurrences of this kind stay at weight 2. */
  reinforce: number;
  /** Anchors pin their own weight; derived questions earn theirs. */
  fixedWeight?: QuizWeight;
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

/* ── Shared graph reading ─────────────────────────────────────────── */

/**
 * Neighbours of `id`, mirroring how the traversal generators walk edges:
 * a directed edge is followed only from its tail, an undirected edge from
 * either end (graphEngine.ts:166-172 for BFS, :253-256 for DFS, :396-398
 * for Dijkstra — all three agree).
 */
function neighborsOf(step: GraphStep, id: string): string[] {
  const seen = new Set<string>();
  for (const edge of step.edges) {
    if (edge.from === id) seen.add(edge.to);
    else if (!edge.directed && edge.to === id) seen.add(edge.from);
  }
  return Array.from(seen);
}

/** Edges leaving `id`. Kahn's algorithm only ever decrements downstream. */
function outgoingEdges(step: GraphStep, id: string): GraphEdge[] {
  return step.edges.filter((edge) => edge.from === id);
}

/** The engine treats a missing or zero weight as 1 (`edge.weight || 1`). */
function weightOf(edge: GraphEdge): number {
  return edge.weight || 1;
}

function edgeLabel(edge: GraphEdge): string {
  return edge.directed ? `${edge.from} → ${edge.to}` : `${edge.from} – ${edge.to}`;
}

function distanceOf(step: GraphStep, id: string): number {
  const value = step.distances?.[id];
  return typeof value === 'number' ? value : Infinity;
}

function inDegreeOf(step: GraphStep, id: string): number | null {
  const node = step.nodes.find((candidate) => candidate.id === id);
  return typeof node?.inDegree === 'number' ? node.inDegree : null;
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * The item with the strictly smallest finite score, or `null` when the
 * minimum is shared. A shared minimum means the engine's choice came from
 * array order, which is not visible on the canvas and so not askable.
 */
function uniqueArgMin<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  let tied = false;

  for (const item of items) {
    const value = score(item);
    if (!Number.isFinite(value)) continue;
    if (value < bestScore) {
      bestScore = value;
      best = item;
      tied = false;
    } else if (value === bestScore) {
      tied = true;
    }
  }

  return tied ? null : best;
}

function plural(items: string[], singular: string, many: string): string {
  return items.length === 1 ? singular : many;
}

/* ── Step classification ──────────────────────────────────────────── */

/**
 * True when `next` finalises one more vertex than `current` by way of a
 * vertex-level event rather than an edge-level one. This picks out BFS's
 * `De-queue`, Dijkstra's `Extract Min` and Kahn's `Emit` steps without
 * matching on the `phase` prose, and excludes every terminal step (those
 * carry `currentNodeId: null`).
 */
function isVertexAdvance(current: GraphStep, next: GraphStep): boolean {
  return (
    next.currentNodeId !== null &&
    next.currentEdgeId === null &&
    next.visitedNodeIds.length === current.visitedNodeIds.length + 1
  );
}

/** True when `next` is an edge-level event on the same vertex as `current`. */
function isEdgeEventOn(current: GraphStep, next: GraphStep): boolean {
  return next.currentEdgeId !== null && next.currentNodeId === current.currentNodeId;
}

/** BFS's de-queue leaves `visitedNodeIds` alone — it marks on enqueue. */
function isQueueShift(current: GraphStep, next: GraphStep): boolean {
  return (
    current.queueOrStack.length > 0 &&
    next.currentNodeId === current.queueOrStack[0] &&
    arraysEqual(next.queueOrStack, current.queueOrStack.slice(1))
  );
}

/* ── Authored questions ───────────────────────────────────────────── */

const AUTHORED_META: Partial<Record<GraphCategory, { hint: string; concept: string }>> = {
  bfs: {
    hint: 'Watch the QUEUE / STACK panel under the canvas: which end do vertices enter, and which end do they leave from?',
    concept: 'Traversal strategy',
  },
  dijkstra: {
    hint: 'Think about what the algorithm assumes the moment it removes a vertex from the queue and stops revisiting it.',
    concept: 'Greedy assumption',
  },
};

/** Conceptual anchors for the categories the engine authored none for. */
const ANCHORS: Partial<
  Record<
    GraphCategory,
    {
      prompt: string;
      correct: string;
      distractors: string[];
      explanation: string;
      hint: string;
      concept: string;
    }[]
  >
> = {
  bfs: [
    {
      prompt: 'What data structure gives BFS its level-by-level behaviour?',
      correct: 'A queue (FIFO)',
      distractors: [
        'A stack (LIFO)',
        'A min-heap ordered by distance',
        'A set of visited vertices',
      ],
      explanation:
        'BFS uses a queue, so the vertex discovered earliest is explored first. This preserves level-by-level traversal.',
      hint: 'Think about which discovered vertex must be processed first.',
      concept: 'Traversal strategy',
    },
    {
      prompt: 'Why can BFS find shortest paths in an unweighted graph?',
      correct: 'It explores vertices in increasing number of edges from the source',
      distractors: [
        'It always chooses the smallest edge weight',
        'It explores the deepest path first',
        'It sorts all vertices before traversal',
      ],
      explanation:
        'In an unweighted graph, every edge has equal cost. BFS finishes all vertices at distance k before moving to distance k+1.',
      hint: 'Think about what one BFS level represents.',
      concept: 'Shortest path',
    },
    {
      prompt: 'When should BFS mark a vertex as visited?',
      correct: 'When it is discovered and enqueued',
      distractors: [
        'Only after it is dequeued',
        'Only after all neighbours are processed',
        'Only when it becomes the final vertex',
      ],
      explanation:
        'Marking a vertex when it is enqueued prevents the same vertex from being added to the queue multiple times.',
      hint: 'Look at the moment a newly discovered vertex joins the queue.',
      concept: 'Visited management',
    },
    {
      prompt: 'What does the FIFO rule mean in BFS?',
      correct: 'The oldest queued vertex is processed first',
      distractors: [
        'The newest vertex is processed first',
        'The vertex with the smallest label is processed first',
        'The vertex with the largest degree is processed first',
      ],
      explanation:
        'FIFO means first in, first out. The vertex waiting longest in the queue is explored next.',
      hint: 'Compare the front and back of the queue.',
      concept: 'Queue order',
    },
    {
      prompt: 'What is the typical time complexity of BFS with an adjacency-list graph?',
      correct: 'O(V + E)',
      distractors: [
        'O(V² + E)',
        'O(E log V)',
        'O(log V)',
      ],
      explanation:
        'Each vertex is processed and each edge is examined a constant number of times, giving O(V + E).',
      hint: 'Count vertex work plus edge work.',
      concept: 'Complexity',
    },
  ],

  dfs: [
    {
      prompt: 'Which data structure gives depth-first search its behaviour?',
      correct: 'A stack (LIFO)',
      distractors: [
        'A queue (FIFO)',
        'A min-heap ordered by depth',
        'A set of visited vertices',
      ],
      explanation:
        'A stack makes the most recently discovered vertex the next one explored, producing depth-first behaviour.',
      hint: 'Watch the QUEUE / STACK panel: which end is served first?',
      concept: 'Traversal strategy',
    },
    {
      prompt: 'What does DFS do when it reaches a vertex with no unvisited neighbour?',
      correct: 'It backtracks to an earlier vertex',
      distractors: [
        'It permanently stops the whole traversal',
        'It restarts from the source',
        'It moves to the globally smallest vertex',
      ],
      explanation:
        'DFS backtracks when the current path cannot be extended, returning to the most recent earlier vertex with another option.',
      hint: 'Think about what a stack does when the current branch is exhausted.',
      concept: 'Backtracking',
    },
    {
      prompt: 'Why is a visited set important in DFS on a graph with cycles?',
      correct: 'It prevents repeatedly exploring the same vertex',
      distractors: [
        'It sorts vertices by degree',
        'It guarantees the graph is acyclic',
        'It chooses the shortest path automatically',
      ],
      explanation:
        'Cycles can lead back to already explored vertices. The visited set prevents infinite revisiting.',
      hint: 'Ask what happens if an edge points back to an earlier vertex.',
      concept: 'Cycle handling',
    },
    {
      prompt: 'Which traversal pattern best describes DFS?',
      correct: 'Explore one path deeply before trying alternatives',
      distractors: [
        'Explore every vertex at one distance before the next',
        'Always choose the globally lightest edge',
        'Process vertices alphabetically',
      ],
      explanation:
        'DFS follows one branch as far as possible, then backtracks and explores another branch.',
      hint: 'Depth first means depth comes before breadth.',
      concept: 'Traversal order',
    },
    {
      prompt: 'What is the typical time complexity of DFS with an adjacency-list graph?',
      correct: 'O(V + E)',
      distractors: [
        'O(V²)',
        'O(E log V)',
        'O(log V)',
      ],
      explanation:
        'DFS visits each reachable vertex and examines each relevant edge a constant number of times.',
      hint: 'Count vertex visits and edge examinations.',
      concept: 'Complexity',
    },
  ],

  dijkstra: [
    {
      prompt: 'What edge-weight condition is required by Dijkstra’s algorithm?',
      correct: 'All edge weights must be non-negative',
      distractors: [
        'All edge weights must be equal',
        'At least one edge must have negative weight',
        'Every edge must have weight 1',
      ],
      explanation:
        'Dijkstra relies on the fact that taking another edge cannot later reduce a vertex already finalised. Negative edges break that assumption.',
      hint: 'Think about why a finalised shortest distance must stay final.',
      concept: 'Greedy assumption',
    },
    {
      prompt: 'What does Dijkstra mean when it extracts the minimum-distance vertex?',
      correct: 'Its current tentative distance is the smallest among all unsettled vertices',
      distractors: [
        'Its degree is the smallest',
        'Its edge weight is the smallest',
        'It was discovered most recently',
      ],
      explanation:
        'Dijkstra repeatedly selects the unsettled vertex with the smallest tentative distance and finalises it.',
      hint: 'Look at the distance values, not the graph degree.',
      concept: 'Extract-min',
    },
    {
      prompt: 'What is relaxation in Dijkstra’s algorithm?',
      correct: 'Checking whether going through one vertex gives a shorter distance to a neighbour',
      distractors: [
        'Removing an edge from the graph',
        'Marking every neighbour as final',
        'Sorting all edges globally',
      ],
      explanation:
        'Relaxation compares the existing tentative distance with the distance obtained through the current vertex.',
      hint: 'Think about improving a tentative d= value.',
      concept: 'Relaxation',
    },
    {
      prompt: 'Why can Dijkstra finalise a vertex permanently?',
      correct: 'With non-negative edges, no later route can produce a smaller distance',
      distractors: [
        'Because the graph must be acyclic',
        'Because every vertex has degree two',
        'Because all paths have equal length',
      ],
      explanation:
        'Once the smallest tentative distance is selected, any alternative path reaching that vertex later must already be at least as expensive.',
      hint: 'This is the key greedy invariant.',
      concept: 'Shortest-path invariant',
    },
    {
      prompt: 'What is the common complexity of Dijkstra with a binary min-heap and adjacency lists?',
      correct: 'O((V + E) log V)',
      distractors: [
        'O(V + E)',
        'O(V²E)',
        'O(log V) total',
      ],
      explanation:
        'Heap-based extract-min and distance updates contribute logarithmic factors, giving the standard O((V + E) log V) bound.',
      hint: 'Think about heap operations for vertices and edge relaxations.',
      concept: 'Complexity',
    },
  ],

  prim: [
    {
      prompt: "Prim's algorithm grows an MST by choosing…",
      correct: 'The lightest edge crossing from the current tree to an outside vertex',
      distractors: [
        'The globally lightest edge anywhere in the graph',
        'The lightest edge leaving only the newest vertex',
        'Any edge that does not close a cycle',
      ],
      explanation:
        "Prim's uses the cut property: the cheapest edge crossing the tree/outside cut safely adds one new vertex.",
      hint: 'One endpoint must already belong to the growing tree.',
      concept: 'Cut property',
    },
    {
      prompt: "What is the main goal of Prim's algorithm?",
      correct: 'To build a minimum spanning tree of a connected weighted graph',
      distractors: [
        'To find single-source shortest paths',
        'To produce a topological ordering',
        'To detect every cycle',
      ],
      explanation:
        "Prim's constructs a minimum spanning tree, not shortest paths from a source.",
      hint: 'Think about connecting all vertices with minimum total edge weight.',
      concept: 'Minimum spanning tree',
    },
    {
      prompt: "Why does Prim's keep its growing tree connected?",
      correct: 'Every chosen edge connects the tree to exactly one new outside vertex',
      distractors: [
        'It chooses disconnected global edges first',
        'It removes all unvisited vertices',
        'It requires every vertex to have the same degree',
      ],
      explanation:
        "Each selected crossing edge attaches a new vertex to the existing tree, so the partial solution remains connected.",
      hint: 'Look at what the chosen edge does to the tree boundary.',
      concept: 'Connected growth',
    },
    {
      prompt: "Which statement distinguishes Prim's from Kruskal's?",
      correct: "Prim's grows one connected tree from an existing tree boundary",
      distractors: [
        "Prim's always uses a queue",
        "Prim's ignores edge weights",
        "Prim's requires directed graphs",
      ],
      explanation:
        "Prim's grows outward from the current tree, while Kruskal's considers globally light edges and uses cycle checks.",
      hint: 'Compare local cut choices with global edge ordering.',
      concept: 'Algorithm comparison',
    },
    {
      prompt: "What is the typical heap-based time complexity of Prim's with adjacency lists?",
      correct: 'O(E log V)',
      distractors: [
        'O(V + E)',
        'O(V²E)',
        'O(log V)',
      ],
      explanation:
        'Using a binary heap for the frontier edges gives the standard O(E log V) bound.',
      hint: 'Think about weighted frontier updates.',
      concept: 'Complexity',
    },
  ],

  kruskal: [
    {
      prompt: "What does Kruskal's algorithm consider first?",
      correct: 'The globally lightest remaining edge',
      distractors: [
        'The edge leaving the newest tree vertex',
        'The highest-degree vertex',
        'The longest edge first',
      ],
      explanation:
        "Kruskal's sorts edges by weight and considers them from lightest to heaviest.",
      hint: 'Kruskal is edge-centric, not tree-frontier-centric.',
      concept: 'Greedy edge order',
    },
    {
      prompt: "When does Kruskal's reject an edge?",
      correct: 'When adding it would create a cycle',
      distractors: [
        'Whenever the edge is not the absolute lightest',
        'Whenever both endpoints exist',
        'Whenever the graph is connected',
      ],
      explanation:
        "An MST cannot contain cycles, so Kruskal rejects an edge whose endpoints are already connected.",
      hint: 'Ask what happens if the endpoints are already in the same component.',
      concept: 'Cycle avoidance',
    },
    {
      prompt: 'Which data structure is commonly used to detect cycles efficiently in Kruskal?',
      correct: 'Disjoint Set Union (Union-Find)',
      distractors: [
        'A FIFO queue',
        'A stack only',
        'A binary search tree of vertex labels',
      ],
      explanation:
        'Union-Find tracks connected components and efficiently answers whether two endpoints are already connected.',
      hint: 'Think of maintaining components while edges are added.',
      concept: 'Union-Find',
    },
    {
      prompt: 'What happens if Kruskal is run on a disconnected graph?',
      correct: 'It produces a minimum spanning forest',
      distractors: [
        'It must always fail',
        'It creates one tree by adding cycles',
        'It automatically connects components with zero-cost edges',
      ],
      explanation:
        'A disconnected graph has no spanning tree, but Kruskal still produces the minimum spanning forest of its components.',
      hint: 'Each connected component gets its own spanning tree.',
      concept: 'Disconnected graphs',
    },
    {
      prompt: "What is the dominant complexity of Kruskal's algorithm?",
      correct: 'O(E log E)',
      distractors: [
        'O(V)',
        'O(E²V)',
        'O(log E)',
      ],
      explanation:
        'Sorting the E edges dominates the runtime, giving O(E log E).',
      hint: 'The first major step is sorting all edges.',
      concept: 'Complexity',
    },
  ],

  bellmanFord: [
    {
      prompt: 'How many full relaxation passes does Bellman-Ford need before checking for a negative cycle?',
      correct: 'V - 1 passes',
      distractors: [
        'E passes exactly',
        'log V passes',
        'One pass only',
      ],
      explanation:
        'Any simple shortest path can contain at most V - 1 edges, so V - 1 passes are enough to propagate all shortest-path distances.',
      hint: 'Count the maximum number of edges in a simple path.',
      concept: 'Relaxation passes',
    },
    {
      prompt: 'What important edge-weight feature makes Bellman-Ford more general than Dijkstra?',
      correct: 'It can handle negative edge weights',
      distractors: [
        'It requires all edges to have the same weight',
        'It only works on trees',
        'It ignores edge weights completely',
      ],
      explanation:
        'Bellman-Ford can correctly process negative edges, provided there is no reachable negative-weight cycle affecting the shortest path.',
      hint: 'Compare the assumptions of Bellman-Ford and Dijkstra.',
      concept: 'Negative edges',
    },
    {
      prompt: 'How can Bellman-Ford detect a reachable negative-weight cycle?',
      correct: 'A further relaxation is still possible after V - 1 passes',
      distractors: [
        'The queue becomes empty',
        'Every vertex has degree one',
        'The graph becomes disconnected',
      ],
      explanation:
        'If a distance can still be improved after V - 1 passes, some reachable negative cycle is allowing an endlessly improving path.',
      hint: 'Ask what an extra successful relaxation means.',
      concept: 'Negative-cycle detection',
    },
    {
      prompt: 'What is the main operation repeated by Bellman-Ford?',
      correct: 'Relax every edge',
      distractors: [
        'Remove every visited vertex',
        'Choose only the lightest edge',
        'Perform topological sorting first',
      ],
      explanation:
        'Bellman-Ford repeatedly scans all edges and applies the relaxation rule.',
      hint: 'The algorithm is based on repeated edge scans.',
      concept: 'Core operation',
    },
    {
      prompt: 'What is the standard time complexity of Bellman-Ford?',
      correct: 'O(VE)',
      distractors: [
        'O(V + E)',
        'O(E log V)',
        'O(log V)',
      ],
      explanation:
        'The algorithm performs up to V - 1 passes over all E edges, yielding O(VE).',
      hint: 'Multiply the number of passes by the number of edges.',
      concept: 'Complexity',
    },
  ],

  aStar: [
    {
      prompt: 'What score does A* use to prioritize a node?',
      correct: 'f(n) = g(n) + h(n)',
      distractors: [
        'f(n) = g(n) - h(n)',
        'f(n) = g(n) × h(n)',
        'f(n) = h(n) only',
      ],
      explanation:
        'A* combines the exact cost already travelled, g(n), with the heuristic estimate to the goal, h(n).',
      hint: 'Remember past cost plus estimated remaining cost.',
      concept: 'A* evaluation',
    },
    {
      prompt: 'What does g(n) represent in A*?',
      correct: 'The cost of the path from the start to node n',
      distractors: [
        'The estimated cost from n to the goal',
        'The graph degree of n',
        'The number of neighbours of n',
      ],
      explanation:
        'g(n) is the exact cost accumulated from the start to the current node.',
      hint: 'Separate travelled cost from estimated future cost.',
      concept: 'Path cost',
    },
    {
      prompt: 'What does h(n) represent in A*?',
      correct: 'An estimate of the remaining cost from n to the goal',
      distractors: [
        'The exact cost already travelled',
        'The number of visited nodes',
        'The in-degree of n',
      ],
      explanation:
        'h(n) estimates the remaining cost and guides the search toward the goal.',
      hint: 'It looks forward toward the destination.',
      concept: 'Heuristic',
    },
    {
      prompt: 'What property should an admissible A* heuristic have?',
      correct: 'It never overestimates the true remaining cost',
      distractors: [
        'It must always overestimate',
        'It must always equal zero',
        'It must equal the number of edges exactly',
      ],
      explanation:
        'An admissible heuristic is optimistic: it does not claim the remaining path is more expensive than it really is.',
      hint: 'Think about optimistic lower bounds.',
      concept: 'Heuristic admissibility',
    },
    {
      prompt: 'When h(n) = 0 for every node, A* behaves like…',
      correct: 'Dijkstra’s algorithm',
      distractors: [
        'Depth-first search',
        'Kruskal’s algorithm',
        'Topological sorting',
      ],
      explanation:
        'With h(n)=0, f(n)=g(n), so A* prioritizes exactly the same distance information as Dijkstra.',
      hint: 'Set h(n) to zero in f(n)=g(n)+h(n).',
      concept: 'Relationship to Dijkstra',
    },
  ],

  topoSort: [
    {
      prompt: "In Kahn's algorithm, a vertex becomes ready to emit when…",
      correct: 'its in-degree drops to zero',
      distractors: [
        'it has no outgoing edges left',
        'all of its neighbours have been emitted',
        'it is the earliest unemitted vertex alphabetically',
      ],
      explanation:
        "In-degree zero means all prerequisites have already been emitted, so the vertex can safely enter the ready queue.",
      hint: 'The deg: badge shows how many incoming prerequisites remain.',
      concept: "Kahn's ready queue",
    },
    {
      prompt: 'A topological ordering can exist only for which kind of graph?',
      correct: 'A directed acyclic graph (DAG)',
      distractors: [
        'Any undirected graph',
        'Any graph with positive weights',
        'Only complete graphs',
      ],
      explanation:
        'A directed cycle creates a circular dependency, making a valid linear topological ordering impossible.',
      hint: 'Think about what a cycle does to dependency order.',
      concept: 'DAG requirement',
    },
    {
      prompt: "How can Kahn's algorithm detect a cycle?",
      correct: 'Not all vertices can be emitted',
      distractors: [
        'The graph gains an extra edge',
        'The queue always contains every vertex',
        'Every in-degree becomes negative',
      ],
      explanation:
        "If vertices remain but no zero-in-degree vertex is available, the remaining graph contains a cycle.",
      hint: 'Ask what happens when every remaining vertex still has a prerequisite.',
      concept: 'Cycle detection',
    },
    {
      prompt: 'What does a topological ordering represent?',
      correct: 'A linear order that respects every directed dependency',
      distractors: [
        'The shortest weighted path',
        'A minimum spanning tree',
        'Vertices sorted only by label',
      ],
      explanation:
        'For every directed edge u → v, u must appear before v in the ordering.',
      hint: 'Every arrow becomes an ordering constraint.',
      concept: 'Dependency ordering',
    },
    {
      prompt: "What is the typical time complexity of Kahn's topological sort?",
      correct: 'O(V + E)',
      distractors: [
        'O(V²E)',
        'O(E log V)',
        'O(log V)',
      ],
      explanation:
        'Each vertex enters and leaves the ready queue once, while each edge is processed once.',
      hint: 'Count vertex and edge processing.',
      concept: 'Complexity',
    },
  ],
};

/**
 * Pass any step-level `quizData` through as a weight-1 anchor, rebuilt via
 * `buildOptions` so the answer is no longer pinned to position 0.
 */
function authoredCandidates(steps: GraphStep[], category: GraphCategory): Candidate[] {
  const meta = AUTHORED_META[category];
  const candidates: Candidate[] = [];

  steps.forEach((step, index) => {
    const data = step.quizData;
    if (!data || index >= steps.length - 1) return;
    const correct = data.options[data.correctIndex];
    if (correct === undefined) return;

    candidates.push({
      stepIndex: index,
      kind: 'authored',
      priority: 0,
      reinforce: 0,
      fixedWeight: 1,
      prompt: data.prompt,
      correct,
      distractors: data.options.filter((_, position) => position !== data.correctIndex),
      explanation: data.explanation,
      hint: meta?.hint ?? 'Think about the property the algorithm relies on rather than this particular graph.',
      concept: meta?.concept ?? 'Core idea',
    });
  });

  return candidates;
}

function anchorCandidate(steps: GraphStep[], category: GraphCategory): Candidate[] {
  const anchors = ANCHORS[category];
  if (!anchors || anchors.length === 0 || steps.length < 2) return [];

  const anchorIndex = steps.length % anchors.length;
  const anchor = anchors[anchorIndex];

  return [
    {
      stepIndex: 0,
      kind: `anchor-${anchorIndex}`,
      priority: 0,
      reinforce: 0,
      fixedWeight: 1,
      ...anchor,
    },
  ];
}

/* ── Per-algorithm derivations ────────────────────────────────────── */

function bfsCandidates(steps: GraphStep[]): Candidate[] {
  const candidates: Candidate[] = [];

  for (let index = 0; index < steps.length - 1; index++) {
    const current = steps[index];
    const next = steps[index + 1];

    /* Which vertex leaves the queue next? The FIFO identity below is the
       whole question: the engine shifts from the front, so the answer is
       `queueOrStack[0]` and the tempting wrong answer is the back. */
    if (isQueueShift(current, next)) {
      const front = current.queueOrStack[0];
      const rest = current.queueOrStack.slice(1);

      if (rest.length > 0) {
        candidates.push({
          stepIndex: index,
          kind: 'bfs-dequeue',
          priority: PRIMARY,
          reinforce: 2,
          prompt: `The queue holds [${current.queueOrStack.join(', ')}]. Which vertex does BFS explore next?`,
          correct: front,
          /* Back of the queue first: picking it is the stack/queue mix-up
             this question exists to catch. */
          distractors: [rest[rest.length - 1], rest[0], ...rest.slice(1, -1)],
          explanation: `${front}. A queue is first in, first out, so BFS always takes the vertex that has been waiting longest — the front of the queue, not the one discovered most recently.`,
          hint: 'The queue is printed in the order vertices were discovered. Breadth-first means the oldest entry is served first.',
          concept: 'Queue order (FIFO)',
        });
      }
    }

    /* Does exploring this vertex discover anything? BFS marks a vertex
       visited when it is enqueued, so "already discovered" is exactly
       "already in the VISITED set". */
    if (current.currentNodeId !== null && current.currentEdgeId === null && index > 0) {
      const vertex = current.currentNodeId;
      const discovered = new Set(current.visitedNodeIds);
      const fresh = neighborsOf(current, vertex).filter((id) => !discovered.has(id));
      const streamEnqueues = isEdgeEventOn(current, next);

      if (streamEnqueues === (fresh.length > 0)) {
        candidates.push({
          stepIndex: index,
          kind: 'bfs-discover',
          priority: SECONDARY,
          reinforce: 1,
          prompt: `Vertex ${vertex} is being explored. Does it discover any new vertices?`,
          correct: fresh.length > 0
            ? 'Yes — at least one neighbour joins the queue'
            : 'No — every neighbour has already been discovered',
          distractors: [
            fresh.length > 0
              ? 'No — every neighbour has already been discovered'
              : 'Yes — at least one neighbour joins the queue',
          ],
          explanation: fresh.length > 0
            ? `Yes. ${fresh.join(', ')} ${plural(fresh, 'is', 'are')} not in the VISITED set yet, so BFS marks ${plural(fresh, 'it', 'them')} discovered and appends ${plural(fresh, 'it', 'them')} to the back of the queue.`
            : `No. Every neighbour of ${vertex} is already in the VISITED set, so nothing is enqueued and BFS moves straight on to the next vertex in the queue.`,
          hint: `Check each neighbour of ${vertex} against the VISITED set under the canvas. BFS claims a vertex the first time it is seen, not when it is explored.`,
          concept: 'Discovery check',
        });
      }
    }
  }

  return candidates;
}

function dfsCandidates(steps: GraphStep[]): Candidate[] {
  const candidates: Candidate[] = [];

  /* The final step is `DFS Traversal Complete` with an empty stack, which
     reads like a pop. Stop one short so "descend or backtrack?" is never
     asked where the honest answer is "neither, it is over". */
  for (let index = 0; index < steps.length - 2; index++) {
    const current = steps[index];
    const next = steps[index + 1];
    const vertex = current.currentNodeId;
    if (vertex === null) continue;

    const depth = current.queueOrStack.length;
    const nextDepth = next.queueOrStack.length;
    /* Equal depth is the `Recurse to X` -> `Visit X` pair: the push already
       happened on the step being shown, so there is nothing left to predict. */
    if (nextDepth === depth) continue;

    const descends = nextDepth > depth;
    const visited = new Set(current.visitedNodeIds);
    const unexplored = neighborsOf(current, vertex).filter((id) => !visited.has(id));
    if (descends !== (unexplored.length > 0)) continue;

    const parent = depth >= 2 ? current.queueOrStack[depth - 2] : null;
    if (!descends && parent === null) continue;

    candidates.push({
      stepIndex: index,
      kind: 'dfs-direction',
      priority: PRIMARY,
      reinforce: 2,
      prompt: `DFS is at ${vertex} with the stack [${current.queueOrStack.join(', ')}]. What happens next?`,
      correct: descends
        ? `Descend into an unvisited neighbour of ${vertex}`
        : `Return to the vertex sitting below ${vertex} on the stack`,
      distractors: [
        descends
          ? `Return to the vertex sitting below ${vertex} on the stack`
          : `Descend into an unvisited neighbour of ${vertex}`,
        'Stop — every vertex has now been visited',
      ],
      explanation: descends
        ? `Descend. ${vertex} still touches ${unexplored.join(', ')}, which ${plural(unexplored, 'is', 'are')} not in the VISITED set, and depth-first search always follows an unexplored edge before it returns.`
        : `Return to ${parent}. Every neighbour of ${vertex} is already visited, so the call for ${vertex} finishes, ${vertex} is popped, and control resumes in ${parent} — which still has its own neighbours left to check.`,
      hint: `Compare ${vertex}'s neighbours against the VISITED set. DFS only comes back up the stack once a vertex has nothing new below it.`,
      concept: 'Depth-first order',
    });
  }

  return candidates;
}

function dijkstraCandidates(steps: GraphStep[]): Candidate[] {
  const candidates: Candidate[] = [];

  for (let index = 0; index < steps.length - 1; index++) {
    const current = steps[index];
    const next = steps[index + 1];

    /* Which vertex is finalised next: the greedy choice Dijkstra is about.
       `queueOrStack` is the unvisited frontier with a finite distance, in
       node order, so the visible answer is its unique minimum by `d=`. */
    if (isVertexAdvance(current, next)) {
      const chosen = uniqueArgMin(current.queueOrStack, (id) => distanceOf(current, id));

      if (chosen !== null && chosen === next.currentNodeId) {
        const frontier = current.queueOrStack
          .filter((id) => id !== chosen)
          .sort((a, b) => distanceOf(current, a) - distanceOf(current, b));
        const unreached = current.nodes
          .map((node) => node.id)
          .filter(
            (id) =>
              !current.visitedNodeIds.includes(id) &&
              !current.queueOrStack.includes(id)
          );

        if (frontier.length + unreached.length > 0) {
          candidates.push({
            stepIndex: index,
            kind: 'dijkstra-extract',
            priority: PRIMARY,
            reinforce: 2,
            prompt: 'Which vertex does Dijkstra finalise next?',
            correct: chosen,
            distractors: [...frontier, ...unreached],
            explanation: `${chosen}. Of the vertices still unfinalised, ${chosen} has the smallest tentative distance (d=${distanceOf(current, chosen)}), and Dijkstra always closes off the nearest one first — that is what makes its distance final.`,
            hint: 'Compare the d= badges on the vertices that are not finalised yet. A vertex with no badge is still at infinity and cannot be chosen.',
            concept: 'Greedy extraction',
          });
        }
      }
    }

    /* Does relaxing this vertex's edges improve anything? Asked here, at
       the extraction step, because both outcomes occur here; asked at a
       relax step the answer would always be yes. */
    if (current.currentNodeId !== null && current.currentEdgeId === null && index > 0) {
      const vertex = current.currentNodeId;
      const base = distanceOf(current, vertex);
      const visited = new Set(current.visitedNodeIds);
      const improving = current.edges
        .filter((edge) => edge.from === vertex || (!edge.directed && edge.to === vertex))
        .map((edge) => ({ edge, target: edge.from === vertex ? edge.to : edge.from }))
        .filter(({ target }) => !visited.has(target))
        .filter(({ edge, target }) => base + weightOf(edge) < distanceOf(current, target));
      const streamRelaxes = isEdgeEventOn(current, next);

      if (Number.isFinite(base) && streamRelaxes === (improving.length > 0)) {
        const first = improving[0];
        candidates.push({
          stepIndex: index,
          kind: 'dijkstra-relax',
          priority: SECONDARY,
          reinforce: 1,
          prompt: `${vertex} is now finalised at d=${base}. Does relaxing its edges improve any tentative distance?`,
          correct: first
            ? "Yes — at least one neighbour's distance drops"
            : 'No — every neighbour already has a route this short',
          distractors: [
            first
              ? 'No — every neighbour already has a route this short'
              : "Yes — at least one neighbour's distance drops",
          ],
          explanation: first
            ? `Yes. Going through ${vertex} costs ${base} + ${weightOf(first.edge)} = ${base + weightOf(first.edge)} to reach ${first.target}, which beats the route ${first.target} had, so Dijkstra rewrites its distance.`
            : `No. For every unfinalised neighbour of ${vertex}, the route through ${vertex} is no shorter than the one already recorded, so no distance changes.`,
          hint: `Add each outgoing weight to d=${base} and compare the total with that neighbour's own d= badge. No badge means infinity, which any finite total beats.`,
          concept: 'Edge relaxation',
        });
      }
    }
  }

  return candidates;
}

function primCandidates(steps: GraphStep[]): Candidate[] {
  const candidates: Candidate[] = [];

  for (let index = 0; index < steps.length - 1; index++) {
    const current = steps[index];
    const next = steps[index + 1];

    /* An `Add Edge` step names an edge and grows the tree by one vertex.
       The terminal step names no edge, so it is excluded automatically. */
    const grows =
      next.currentEdgeId !== null &&
      next.currentNodeId !== null &&
      next.visitedNodeIds.length === current.visitedNodeIds.length + 1;
    if (!grows) continue;

    const inTree = new Set(current.visitedNodeIds);
    const crossing = current.edges.filter(
      (edge) => inTree.has(edge.from) !== inTree.has(edge.to)
    );
    const chosen = uniqueArgMin(crossing, weightOf);
    if (chosen === null || chosen.id !== next.currentEdgeId) continue;

    const otherCrossing = crossing
      .filter((edge) => edge.id !== chosen.id)
      .sort((a, b) => weightOf(a) - weightOf(b));
    /* Both endpoints outside the tree: the globally-lightest-edge mistake,
       which is Kruskal's rule rather than Prim's. */
    const outside = current.edges
      .filter((edge) => !inTree.has(edge.from) && !inTree.has(edge.to))
      .sort((a, b) => weightOf(a) - weightOf(b));

    const distractors = [otherCrossing[0], outside[0], otherCrossing[1]]
      .filter((edge): edge is GraphEdge => edge !== undefined)
      .map(edgeLabel);
    if (distractors.length === 0) continue;

    candidates.push({
      stepIndex: index,
      kind: 'prim-edge',
      priority: PRIMARY,
      reinforce: 2,
      /* Weights are deliberately left off the option labels. With them
         printed the question collapses to "pick the smallest number";
         without them the student has to find the crossing edges first,
         which is the part that actually distinguishes Prim's. */
      prompt: `The tree currently spans {${current.visitedNodeIds.join(', ')}}. Which edge does Prim's add next?`,
      correct: edgeLabel(chosen),
      distractors,
      explanation: `${edgeLabel(chosen)}, weight ${weightOf(chosen)}. It is the lightest edge with exactly one endpoint inside the tree. Lighter edges elsewhere in the graph are not candidates — Prim's may only extend the tree it already has.`,
      hint: 'Narrow the edges down to those with exactly one endpoint in the tree, then read their weight chips and take the smallest.',
      concept: 'Cut property',
    });
  }

  return candidates;
}

function topoCandidates(steps: GraphStep[]): Candidate[] {
  const candidates: Candidate[] = [];

  for (let index = 0; index < steps.length - 1; index++) {
    const current = steps[index];
    const next = steps[index + 1];

    /* Which vertex is emitted next. An emit step shifts the ready queue,
       and the queue snapshot is taken before any new vertex is pushed, so
       the shift is exact. */
    if (isVertexAdvance(current, next) && isQueueShift(current, next)) {
      const front = current.queueOrStack[0];
      const rest = current.queueOrStack.slice(1);
      const blocked = current.nodes
        .filter(
          (node) =>
            !current.visitedNodeIds.includes(node.id) &&
            !current.queueOrStack.includes(node.id) &&
            (inDegreeOf(current, node.id) ?? 0) > 0
        )
        .map((node) => node.id);

      const distractors = [
        ...(rest.length > 0 ? [rest[rest.length - 1], ...rest.slice(0, -1)] : []),
        ...blocked,
      ];

      if (distractors.length > 0) {
        candidates.push({
          stepIndex: index,
          kind: 'topo-emit',
          /* Deliberately outranked by `topo-unblock` below. An emit that
             unblocks nothing is followed immediately by the next emit, so
             both questions want that step — and if the emission question
             won it, the in-degree question would only ever be asked where
             the answer is "yes", which teaches the wrong reflex. Emission
             questions also sit on every `In-Degree Reached 0` step, so
             conceding this one costs almost nothing. */
          priority: SECONDARY,
          reinforce: 2,
          prompt: `The ready queue holds [${current.queueOrStack.join(', ')}]. Which vertex is emitted next?`,
          correct: front,
          distractors,
          explanation: `${front}. A vertex only enters the ready queue once its in-degree reaches 0, meaning every prerequisite is already emitted — and the queue is served front first, so ${front} goes next.`,
          hint: 'Only vertices showing deg: 0 are ready, and among those the queue is taken from the front.',
          concept: "Kahn's ready queue",
        });
      }
    }

    /* Does emitting this vertex unblock anything? Removing its outgoing
       edges drops each successor's in-degree, and a successor sitting at
       exactly the number of edges removed reaches 0. */
    if (current.currentNodeId !== null && current.currentEdgeId === null && index > 0) {
      const vertex = current.currentNodeId;
      const removals = new Map<string, number>();
      for (const edge of outgoingEdges(current, vertex)) {
        removals.set(edge.to, (removals.get(edge.to) ?? 0) + 1);
      }

      const unblocked: string[] = [];
      let readable = true;
      for (const [target, count] of removals) {
        const degree = inDegreeOf(current, target);
        if (degree === null) {
          readable = false;
          break;
        }
        if (degree - count === 0) unblocked.push(target);
      }

      const streamEnqueues = isEdgeEventOn(current, next);

      if (readable && removals.size > 0 && streamEnqueues === (unblocked.length > 0)) {
        candidates.push({
          stepIndex: index,
          kind: 'topo-unblock',
          priority: PRIMARY,
          reinforce: 1,
          prompt: `Emitting ${vertex} removes its outgoing edges. Does that make any vertex ready?`,
          correct: unblocked.length > 0
            ? 'Yes — at least one vertex reaches in-degree 0'
            : 'No — every successor still has a prerequisite left',
          distractors: [
            unblocked.length > 0
              ? 'No — every successor still has a prerequisite left'
              : 'Yes — at least one vertex reaches in-degree 0',
          ],
          explanation: unblocked.length > 0
            ? `Yes. ${unblocked.join(', ')} ${plural(unblocked, 'was', 'were')} waiting only on ${vertex}, so ${plural(unblocked, 'its', 'their')} in-degree reaches 0 and ${plural(unblocked, 'it joins', 'they join')} the ready queue.`
            : `No. Every successor of ${vertex} is still waiting on at least one other prerequisite, so its in-degree stays above 0 and it cannot be emitted yet.`,
          hint: `Follow ${vertex}'s outgoing arrows and read each target's deg: badge — a badge of 1 becomes 0 once this edge is gone.`,
          concept: 'In-degree bookkeeping',
        });
      }
    }
  }

  return candidates;
}

/* ── Placement ────────────────────────────────────────────────────── */

/**
 * Turn candidates into checkpoints: one per step (lowest priority wins),
 * then weight each by how many of its kind already came before it.
 *
 * Weighting happens after selection rather than during it, so a candidate
 * that loses its step never consumes a reinforcement slot from the one
 * that survives.
 */
function place(candidates: Candidate[]): QuizCheckpoint[] {
  const perStep = new Map<number, Candidate>();
  for (const candidate of candidates) {
    const held = perStep.get(candidate.stepIndex);
    if (!held || candidate.priority < held.priority) {
      perStep.set(candidate.stepIndex, candidate);
    }
  }

  const ordered = Array.from(perStep.values()).sort((a, b) => a.stepIndex - b.stepIndex);
  const counts = new Map<string, number>();

  return ordered.map((candidate) => {
    const occurrence = counts.get(candidate.kind) ?? 0;
    counts.set(candidate.kind, occurrence + 1);

    const weight: QuizWeight =
      candidate.fixedWeight ?? (occurrence < candidate.reinforce ? 2 : 3);
    const id = `graph-${candidate.kind}-${candidate.stepIndex}`;
    const built = buildOptions(id, candidate.correct, candidate.distractors);

    return {
      stepIndex: candidate.stepIndex,
      question: {
        id,
        prompt: candidate.prompt,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: candidate.explanation,
        hint: candidate.hint,
        concept: candidate.concept,
        weight,
      },
    };
  });
}

/**
 * Build checkpoints for one graph run.
 *
 * @param steps    the `GraphStep[]` the category's generator produced
 * @param category which generator produced them
 */
export function buildGraphCheckpoints(
  steps: GraphStep[],
  category: GraphCategory
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const derived = (() => {
    switch (category) {
      case 'bfs':
        return bfsCandidates(steps);
      case 'dfs':
        return dfsCandidates(steps);
      case 'dijkstra':
        return dijkstraCandidates(steps);
      case 'prim':
        return primCandidates(steps);
      case 'topoSort':
        return topoCandidates(steps);
      /* `kruskal`, `bellmanFord`, and `aStar` have generators, but no
         derived quiz questions are authored for them yet. */
      case 'kruskal':
      case 'bellmanFord':
      case 'aStar':
        return [];
    }
  })();

  return place([
    ...authoredCandidates(steps, category),
    ...anchorCandidate(steps, category),
    ...derived,
  ]);
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<GraphCategory, QuizRevisionData> = {
  bfs: {
    description: 'Explore graph level by level using a queue',
    complexity: 'O(V + E) time, O(V) space',
    keyIdea: 'A queue (FIFO) ensures vertices are explored in order of discovery distance',
    watchFor: ['Queue operations', 'Visited marking', 'Level-by-level exploration'],
    quickTip: 'BFS finds shortest path in unweighted graphs—each level is one edge further',
    example: 'Graph A-B, A-C, B-D, C-D: BFS from A visits queue [A]→[B,C]→[D]. Order: A, B, C, D.',
  },
  dfs: {
    description: 'Explore as deep as possible before backtracking using a stack',
    complexity: 'O(V + E) time, O(V) space',
    keyIdea: 'A stack (LIFO) or recursion explores one path fully before trying alternatives',
    watchFor: ['Stack/recursion depth', 'Backtracking trigger', 'Visited set management'],
    quickTip: 'DFS backtracks when a vertex has no unvisited neighbors left',
    example: 'Graph A-B, A-C, B-D, C-D: DFS from A might visit A→B→D→C (depth-first, goes deep before wide).',
  },
  dijkstra: {
    description: 'Find shortest paths from source to all vertices in a weighted graph',
    complexity: 'O((V + E) log V) time, O(V) space',
    keyIdea: 'Greedily finalize the nearest unfinalized vertex—its distance is then optimal',
    watchFor: ['Priority queue usage', 'Relaxation condition', 'Non-negative weight requirement'],
    quickTip: 'Only works with non-negative weights—negative edges break the greedy assumption',
    example: 'Graph A→B(4), A→C(2), C→B(1): Dijkstra from A: d[A]=0, finalize A, relax d[C]=2, finalize C, relax d[B]=3. Shortest A→B is 3 via C.',
  },
  prim: {
    description: 'Build minimum spanning tree by growing one tree from a start vertex',
    complexity: 'O((V + E) log V) time, O(V) space',
    keyIdea: 'Always add the lightest edge crossing the cut between tree and non-tree vertices',
    watchFor: ['Cut property', 'Edge selection', 'Difference from Kruskal'],
    quickTip: 'Prim maintains a single connected tree; Kruskal may have multiple components',
    example: 'Triangle A-B(1), B-C(2), A-C(3): Prim from A: add edge A-B(1), then B-C(2). MST weight = 3.',
  },
  kruskal: {
    description: 'Build minimum spanning tree by adding edges in weight order',
    complexity: 'O(E log E) time, O(V) space',
    keyIdea: 'Sort edges by weight, add each if it does not create a cycle',
    watchFor: ['Union-Find for cycle detection', 'Edge sorting', 'Sparse vs dense graphs'],
    quickTip: 'Kruskal is often faster for sparse graphs due to simpler data structures',
    example: 'Triangle A-B(1), B-C(2), A-C(3): sort edges→[1,2,3]; add A-B(1), add B-C(2), skip A-C(3) creates cycle. MST = 3.',
  },
  topoSort: {
    description: 'Linear ordering of vertices respecting edge directions in a DAG',
    complexity: 'O(V + E) time, O(V) space',
    keyIdea: "Kahn's algorithm: repeatedly emit vertices with in-degree 0",
    watchFor: ['In-degree tracking', 'Ready queue', 'Cycle detection (not all emitted)'],
    quickTip: 'If the topological sort has fewer than V vertices, the graph has a cycle',
    example: 'DAG A→B, A→C, B→D, C→D: in-degrees A=0,B=1,C=1,D=2. Emit A→B,C ready→emit B→D=1→emit C→D=0→emit D. Order: A,B,C,D.',
  },
  bellmanFord: {
    description: 'Find shortest paths allowing negative weights, detecting negative cycles',
    complexity: 'O(V × E) time, O(V) space',
    keyIdea: 'Relax every edge V-1 times. A Vth relaxation means a negative cycle exists.',
    watchFor: ['V-1 passes', 'Negative cycle detection on Vth pass', 'Relaxation formula'],
    quickTip: 'Unlike Dijkstra, Bellman-Ford blindly relaxes all edges rather than picking the greedily closest vertex.',
    example: 'Relax all edges pass 1, pass 2... if distances still update on pass V, there is a negative cycle.',
  },
  aStar: {
    description: 'Find shortest path using a heuristic to guide the search',
    complexity: 'O(E) time in best cases, O(b^d) worst case, O(V) space',
    keyIdea: 'F = G + H. G is cost from start, H is estimated cost to goal. Explores lowest F first.',
    watchFor: ['Heuristic admissibility (never overestimates)', 'Open list vs Closed list', 'Early exit when goal reached'],
    quickTip: 'A* is Dijkstra with a compass. It prioritizes nodes closer to the goal using the heuristic.',
    example: 'In a grid, use Manhattan distance for H. Prioritize cells with the lowest G + H.',
  },
};

export function buildRevisionData(key: GraphCategory): QuizRevisionData {
  return REVISION_DATA[key];
}
