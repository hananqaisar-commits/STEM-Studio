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
    { prompt: string; correct: string; distractors: string[]; explanation: string; hint: string; concept: string }
  >
> = {
  dfs: {
    prompt: 'Which data structure gives depth-first search its behaviour?',
    correct: 'A stack (last in, first out)',
    distractors: [
      'A queue (first in, first out)',
      'A min-heap ordered by depth',
      'A set of visited vertices',
    ],
    explanation:
      'A stack. DFS pushes each vertex it descends into and pops it on the way back out, so the most recently discovered vertex is always the next one explored. The recursion stack shown under the canvas is that stack made visible.',
    hint: 'Watch the QUEUE / STACK panel: which end do vertices enter, and which end do they leave from?',
    concept: 'Traversal strategy',
  },
  prim: {
    prompt: "Prim's algorithm grows a single tree outward. Which edge is it always allowed to take next?",
    correct: 'The lightest edge with exactly one endpoint in the tree',
    distractors: [
      'The lightest edge left anywhere in the graph',
      'The lightest edge leaving the vertex added most recently',
      'Any edge that does not close a cycle',
    ],
    explanation:
      "The lightest edge crossing the cut between the tree and everything outside it. That is the cut property, and it is also what separates Prim's from Kruskal's: Kruskal's takes the globally lightest edge that stays acyclic, which need not touch the tree at all.",
    hint: "Prim's tree stays connected at every step, so ask which edges could extend it by exactly one new vertex.",
    concept: 'Cut property',
  },
  topoSort: {
    prompt: "In Kahn's algorithm, a vertex becomes ready to emit when…",
    correct: '…its in-degree has dropped to zero',
    distractors: [
      '…it has no outgoing edges left',
      '…all of its neighbours have been emitted',
      '…it is the earliest unemitted vertex alphabetically',
    ],
    explanation:
      'In-degree zero means every prerequisite of that vertex has already been emitted, so putting it next cannot violate the direction of any edge. Vertices with a positive in-degree are still waiting on something.',
    hint: 'The deg: badge under each vertex counts the prerequisites it is still waiting on.',
    concept: "Kahn's ready queue",
  },
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
  const anchor = ANCHORS[category];
  if (!anchor || steps.length < 2) return [];
  return [
    {
      stepIndex: 0,
      kind: 'authored',
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
