import type { ElementState } from '../../engine/types/Step';

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface SegTreeNode {
  id: string;
  rangeStart: number;
  rangeEnd: number;
  value: number; // aggregate (sum by default)
  left?: SegTreeNode;
  right?: SegTreeNode;
  // Layout
  x?: number;
  y?: number;
}

export type SegTreeNodeState =
  | 'default'
  | 'active'        // currently being visited
  | 'fullOverlap'   // query range fully covers this node's range
  | 'partialOverlap' // query range partially overlaps
  | 'noOverlap'     // query range has no overlap with this node
  | 'updated'       // recently recomputed after a point update
  | 'target';       // the leaf being updated

export interface SegTreeNodeData {
  id: string;
  rangeStart: number;
  rangeEnd: number;
  value: number;
  state: SegTreeNodeState;
  x: number;
  y: number;
  leftId?: string;
  rightId?: string;
  isLeaf: boolean;
}

export interface SegTreeStep {
  nodes: SegTreeNodeData[];
  edges: { fromId: string; toId: string; state: ElementState }[];
  array: number[];
  highlightedArrayIndices: number[];
  queryRange?: { start: number; end: number };
  updateIndex?: number;
  runningTotal?: number;
  result?: number;
  description: string;
  codeLine: number;
  variables: Record<string, string | number | boolean | null>;
  phase: 'build' | 'query' | 'update' | 'complete';
}

// ─── Build ────────────────────────────────────────────────────────────────────

let _nodeCounter = 0;

function buildTree(
  arr: number[],
  start: number,
  end: number,
  depth: number,
  xCenter: number,
  spread: number
): SegTreeNode {
  const id = `sg_${start}_${end}_${++_nodeCounter}`;
  const y = 40 + depth * 80;
  const x = xCenter;

  if (start === end) {
    return { id, rangeStart: start, rangeEnd: end, value: arr[start], x, y };
  }

  const mid = Math.floor((start + end) / 2);
  const nextSpread = Math.max(6, spread * 0.5);

  const leftChild = buildTree(arr, start, mid, depth + 1, xCenter - spread, nextSpread);
  const rightChild = buildTree(arr, mid + 1, end, depth + 1, xCenter + spread, nextSpread);

  return {
    id,
    rangeStart: start,
    rangeEnd: end,
    value: leftChild.value + rightChild.value,
    left: leftChild,
    right: rightChild,
    x,
    y,
  };
}

function flattenTree(
  node: SegTreeNode | undefined,
  stateMap: Map<string, SegTreeNodeState> = new Map()
): SegTreeNodeData[] {
  if (!node) return [];
  const state = stateMap.get(node.id) ?? 'default';
  return [
    {
      id: node.id,
      rangeStart: node.rangeStart,
      rangeEnd: node.rangeEnd,
      value: node.value,
      state,
      x: node.x ?? 50,
      y: node.y ?? 40,
      leftId: node.left?.id,
      rightId: node.right?.id,
      isLeaf: !node.left && !node.right,
    },
    ...flattenTree(node.left, stateMap),
    ...flattenTree(node.right, stateMap),
  ];
}

function buildEdges(
  node: SegTreeNode | undefined
): { fromId: string; toId: string; state: ElementState }[] {
  if (!node) return [];
  const edges: { fromId: string; toId: string; state: ElementState }[] = [];
  if (node.left) {
    edges.push({ fromId: node.id, toId: node.left.id, state: 'default' });
    edges.push(...buildEdges(node.left));
  }
  if (node.right) {
    edges.push({ fromId: node.id, toId: node.right.id, state: 'default' });
    edges.push(...buildEdges(node.right));
  }
  return edges;
}

function cloneTree(node?: SegTreeNode): SegTreeNode | undefined {
  if (!node) return undefined;
  return {
    id: node.id,
    rangeStart: node.rangeStart,
    rangeEnd: node.rangeEnd,
    value: node.value,
    x: node.x,
    y: node.y,
    left: cloneTree(node.left),
    right: cloneTree(node.right),
  };
}

function makeStep(
  node: SegTreeNode,
  arr: number[],
  stateMap: Map<string, SegTreeNodeState>,
  description: string,
  codeLine: number,
  variables: Record<string, string | number | boolean | null>,
  phase: SegTreeStep['phase'],
  queryRange?: { start: number; end: number },
  highlightedArrayIndices: number[] = [],
  updateIndex?: number,
  runningTotal?: number,
  result?: number
): SegTreeStep {
  const edges = buildEdges(node);
  // Update edge states based on stateMap
  const updatedEdges = edges.map((e) => {
    const toState = stateMap.get(e.toId);
    const edgeState: ElementState =
      toState === 'active' || toState === 'fullOverlap' || toState === 'partialOverlap' || toState === 'updated'
        ? 'comparing'
        : 'default';
    return { ...e, state: edgeState };
  });

  return {
    nodes: flattenTree(node, stateMap),
    edges: updatedEdges,
    array: [...arr],
    highlightedArrayIndices,
    queryRange,
    updateIndex,
    runningTotal,
    result,
    description,
    codeLine,
    variables,
    phase,
  };
}

// ─── generateSegTreeBuildSteps ────────────────────────────────────────────────

export function generateSegTreeBuildSteps(
  arr: number[]
): { steps: SegTreeStep[]; tree: SegTreeNode } {
  _nodeCounter = 0;
  const steps: SegTreeStep[] = [];
  const n = arr.length;
  const rootX = 50;
  const initialSpread = n <= 4 ? 22 : 30;

  const tree = buildTree(arr, 0, n - 1, 0, rootX, initialSpread);
  const edges = buildEdges(tree);

  // Step 1: Show the initial array
  steps.push({
    nodes: flattenTree(tree, new Map()),
    edges,
    array: [...arr],
    highlightedArrayIndices: arr.map((_, i) => i),
    description: `Building Segment Tree from array [${arr.join(', ')}]. The tree will store range sums. Each leaf covers a single index; each internal node covers a range.`,
    codeLine: 1,
    variables: { n, operation: 'Build' },
    phase: 'build',
  });

  // Step 2: Show the complete tree
  const allNodes = flattenTree(tree, new Map());
  steps.push({
    nodes: allNodes,
    edges,
    array: [...arr],
    highlightedArrayIndices: [],
    description: `Segment Tree constructed! Root node [0..${n - 1}] = ${tree.value} (sum of entire array). Each node stores the sum of its range.`,
    codeLine: 10,
    variables: { root_value: tree.value, n, operation: 'Build complete' },
    phase: 'complete',
    result: tree.value,
  });

  return { steps, tree };
}

// ─── generateSegTreeQuerySteps ────────────────────────────────────────────────

export function generateSegTreeQuerySteps(
  initialTree: SegTreeNode,
  arr: number[],
  queryStart: number,
  queryEnd: number
): SegTreeStep[] {
  const steps: SegTreeStep[] = [];
  const tree = cloneTree(initialTree)!;
  const stateMap = new Map<string, SegTreeNodeState>();
  let runningTotal = 0;

  steps.push(
    makeStep(
      tree, arr, stateMap,
      `Query: sum of range [${queryStart}..${queryEnd}]. Starting from root, we will check overlap with each node's range.`,
      12, { queryStart, queryEnd, runningTotal },
      'query', { start: queryStart, end: queryEnd }
    )
  );

  function query(
    node: SegTreeNode,
    start: number,
    end: number,
    qs: number,
    qe: number
  ): number {
    // No overlap
    if (qs > end || qe < start) {
      stateMap.set(node.id, 'noOverlap');
      steps.push(
        makeStep(tree, arr, stateMap,
          `Node [${start}..${end}] has NO overlap with query [${qs}..${qe}]. Return 0.`,
          14, { node_range: `[${start}..${end}]`, overlap: 'None', contribution: 0 },
          'query', { start: qs, end: qe }, [], undefined, runningTotal
        )
      );
      return 0;
    }

    // Full overlap
    if (qs <= start && end <= qe) {
      stateMap.set(node.id, 'fullOverlap');
      steps.push(
        makeStep(tree, arr, stateMap,
          `Node [${start}..${end}] is FULLY inside query [${qs}..${qe}]. Return its value ${node.value} directly without going deeper.`,
          16, { node_range: `[${start}..${end}]`, overlap: 'Full', contribution: node.value },
          'query', { start: qs, end: qe },
          Array.from({ length: end - start + 1 }, (_, i) => start + i),
          undefined, runningTotal
        )
      );
      runningTotal += node.value;
      return node.value;
    }

    // Partial overlap
    stateMap.set(node.id, 'partialOverlap');
    const mid = Math.floor((start + end) / 2);
    steps.push(
      makeStep(tree, arr, stateMap,
        `Node [${start}..${end}] PARTIALLY overlaps query [${qs}..${qe}]. Split at mid=${mid} and recurse into both children.`,
        18, { node_range: `[${start}..${end}]`, overlap: 'Partial', mid },
        'query', { start: qs, end: qe }, [], undefined, runningTotal
      )
    );

    const leftVal = node.left ? query(node.left, start, mid, qs, qe) : 0;
    const rightVal = node.right ? query(node.right, mid + 1, end, qs, qe) : 0;
    return leftVal + rightVal;
  }

  const result = query(tree, tree.rangeStart, tree.rangeEnd, queryStart, queryEnd);

  steps.push(
    makeStep(tree, arr, stateMap,
      `Query complete! Sum of [${queryStart}..${queryEnd}] = ${result}. We combined the values from all FULLY covered nodes.`,
      20, { queryStart, queryEnd, result },
      'complete', { start: queryStart, end: queryEnd }, [], undefined, undefined, result
    )
  );

  return steps;
}

// ─── generateSegTreeUpdateSteps ──────────────────────────────────────────────

export function generateSegTreeUpdateSteps(
  initialTree: SegTreeNode,
  arr: number[],
  index: number,
  newValue: number
): { steps: SegTreeStep[]; newTree: SegTreeNode; newArr: number[] } {
  const steps: SegTreeStep[] = [];
  const tree = cloneTree(initialTree)!;
  const newArr = [...arr];
  const oldValue = arr[index];
  const stateMap = new Map<string, SegTreeNodeState>();

  steps.push(
    makeStep(tree, newArr, stateMap,
      `Point Update: arr[${index}] changes from ${oldValue} → ${newValue}. We will find the leaf for index ${index}, update it, then propagate changes up to the root.`,
      22, { index, oldValue, newValue, operation: 'Point update' },
      'update', undefined, [index], index
    )
  );

  function update(
    node: SegTreeNode,
    start: number,
    end: number,
    idx: number,
    val: number
  ): number {
    if (start === end) {
      // Leaf found
      stateMap.set(node.id, 'target');
      const diff = val - node.value;
      node.value = val;
      newArr[idx] = val;
      steps.push(
        makeStep(tree, newArr, stateMap,
          `Found leaf for index ${idx}. Updated value: ${arr[idx]} → ${val}. Now propagating change upward.`,
          24, { index: idx, oldValue: arr[idx], newValue: val, change: diff },
          'update', undefined, [idx], idx
        )
      );
      return node.value;
    }

    stateMap.set(node.id, 'active');
    const mid = Math.floor((start + end) / 2);

    if (idx <= mid) {
      steps.push(
        makeStep(tree, newArr, stateMap,
          `Index ${idx} ≤ mid=${mid} — go to LEFT child [${start}..${mid}].`,
          26, { node_range: `[${start}..${end}]`, direction: 'left', mid },
          'update', undefined, [idx], idx
        )
      );
      if (node.left) update(node.left, start, mid, idx, val);
    } else {
      steps.push(
        makeStep(tree, newArr, stateMap,
          `Index ${idx} > mid=${mid} — go to RIGHT child [${mid + 1}..${end}].`,
          28, { node_range: `[${start}..${end}]`, direction: 'right', mid },
          'update', undefined, [idx], idx
        )
      );
      if (node.right) update(node.right, mid + 1, end, idx, val);
    }

    // Recompute this node
    const newNodeVal = (node.left?.value ?? 0) + (node.right?.value ?? 0);
    const oldNodeVal = node.value;
    node.value = newNodeVal;
    stateMap.set(node.id, 'updated');

    steps.push(
      makeStep(tree, newArr, stateMap,
        `Recomputed node [${start}..${end}]: ${oldNodeVal} → ${newNodeVal} (left=${node.left?.value ?? 0} + right=${node.right?.value ?? 0}).`,
        30, { node_range: `[${start}..${end}]`, old_value: oldNodeVal, new_value: newNodeVal },
        'update', undefined, [idx], idx
      )
    );

    return node.value;
  }

  update(tree, tree.rangeStart, tree.rangeEnd, index, newValue);

  steps.push(
    makeStep(tree, newArr, stateMap,
      `Update complete! arr[${index}] = ${newValue}. Root now = ${tree.value}. All ancestor nodes have been recomputed.`,
      32, { index, newValue, rootValue: tree.value },
      'complete', undefined, [index], index
    )
  );

  return { steps, newTree: tree, newArr };
}
