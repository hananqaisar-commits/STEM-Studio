export type LinkedListCategory =
  | 'singly'
  | 'doubly'
  | 'circular'
  | 'doublyCircular'
  | 'reverse'
  | 'detectCycle'
  | 'middleNode'
  | 'josephus'
  | 'removeNthFromEnd'
  | 'reverseSublist'
  | 'reverseHalf'
  | 'reverseFromMiddle'
  | 'reverseKGroup'
  | 'swapPairs'
  | 'mergeSort'
  | 'addTwoNumbers'
  | 'splitHalves'
  | 'splitKParts'
  | 'mergeKSorted'
  | 'palindrome'
  | 'mergeSorted'
  | 'intersection'
  | 'flatten'
  | 'lruCache';

export type LinkedListStructureType = 'singly' | 'doubly' | 'circular' | 'doublyCircular';

export const hasPreviousPointers = (type: LinkedListStructureType) =>
  type === 'doubly' || type === 'doublyCircular';

export const isCircularList = (type: LinkedListStructureType) =>
  type === 'circular' || type === 'doublyCircular';

export interface ListNodeItem {
  id: string;
  value: number | string;
  nextId: string | null;
  prevId?: string | null;
  childId?: string | null;
  status?: 'default' | 'active' | 'comparing' | 'success' | 'danger' | 'warning' | 'cycle' | 'new';
  pointerLabels?: string[];
  x?: number;
  y?: number;
}

export interface BrokenConnection {
  fromId: string;
  toId: string;
  type: 'next' | 'prev';
}

export interface NewConnection {
  fromId: string;
  toId: string;
  type: 'next' | 'prev';
}

export interface LinkedListQuizData {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LinkedListStep {
  nodes: ListNodeItem[];
  headId: string | null;
  tailId: string | null;
  pointers: Record<string, string | null>;
  phase: string;
  explanation: string;
  codeLine: number;
  highlightedNodeIds?: string[];
  brokenConnections?: BrokenConnection[];
  newConnections?: NewConnection[];
  listType: LinkedListStructureType;
  auxiliaryData?: Record<string, any>;
  isQuizPoint?: boolean;
  quizData?: LinkedListQuizData;
  lanes?: LinkedListLane[];
  stagingNode?: ListNodeItem;
  stagingConnections?: NewConnection[];
  promotedNodeId?: string;
}

export interface LinkedListLane {
  label: string;
  nodes: ListNodeItem[];
  kind?: 'list' | 'doublyList' | 'map';
}

// ─── HELPER TO CREATE INITIAL LIST NODES ──────────────────────────────────────────

export function createInitialNodes(
  values: (number | string)[],
  type: LinkedListStructureType = 'singly',
  cycleTargetIndex: number = -1
): ListNodeItem[] {
  if (values.length === 0) return [];

  const nodes: ListNodeItem[] = values.map((val, idx) => ({
    id: `node-${idx}`,
    value: val,
    nextId: idx < values.length - 1 ? `node-${idx + 1}` : null,
    prevId: hasPreviousPointers(type) && idx > 0 ? `node-${idx - 1}` : null,
    status: 'default',
    pointerLabels: [
      ...(idx === 0 ? ['HEAD'] : []),
      ...(idx === values.length - 1 ? ['TAIL'] : []),
    ],
  }));

  if (isCircularList(type) && nodes.length > 0) {
    nodes[nodes.length - 1].nextId = nodes[0].id;
    if (type === 'doublyCircular') {
      nodes[0].prevId = nodes[nodes.length - 1].id;
    }
  }

  if (cycleTargetIndex >= 0 && cycleTargetIndex < nodes.length && nodes.length > 0) {
    nodes[nodes.length - 1].nextId = nodes[cycleTargetIndex].id;
  }

  return nodes;
}

function cloneNodes(nodes: ListNodeItem[]): ListNodeItem[] {
  return nodes.map((n) => ({ ...n, pointerLabels: [...(n.pointerLabels || [])] }));
}

function stageInsertedNodeSteps(steps: LinkedListStep[], originalNodes: ListNodeItem[]): LinkedListStep[] {
  if (!steps.length) return steps;
  const originalIds = new Set(originalNodes.map((node) => node.id));
  const insertedNode = steps[steps.length - 1].nodes.find((node) => !originalIds.has(node.id));
  if (!insertedNode) return steps;

  return steps.map((step, index) => {
    const newNode = step.nodes.find((node) => node.id === insertedNode.id);
    if (!newNode) return step;
    if (index === steps.length - 1) return { ...step, promotedNodeId: insertedNode.id };

    const currentById = new Map(step.nodes.filter((node) => node.id !== insertedNode.id).map((node) => [node.id, node]));
    const stableNodes = cloneNodes(originalNodes).map((original) => ({
      ...original,
      status: currentById.get(original.id)?.status ?? original.status,
    }));
    const stablePointers = Object.fromEntries(
      Object.entries(step.pointers).filter(([, id]) => id !== insertedNode.id)
    );
    assignPointerLabels(stableNodes, stablePointers);

    return {
      ...step,
      nodes: stableNodes,
      stagingNode: { ...newNode, pointerLabels: ['NEW_NODE'] },
      stagingConnections: step.newConnections,
    };
  });
}

function assignPointerLabels(nodes: ListNodeItem[], pointers: Record<string, string | null>) {
  nodes.forEach((n) => (n.pointerLabels = []));
  Object.entries(pointers).forEach(([label, id]) => {
    if (!id) return;
    const node = nodes.find((n) => n.id === id);
    if (node) {
      if (!node.pointerLabels) node.pointerLabels = [];
      if (!node.pointerLabels.includes(label.toUpperCase())) {
        node.pointerLabels.push(label.toUpperCase());
      }
    }
  });
}

// ─── 1. SINGLY LINKED LIST: INSERT AT HEAD ────────────────────────────────────────

export function generateInsertHeadSteps(
  currentNodes: ListNodeItem[],
  newValue: number | string,
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);
  const oldHeadId = nodes.length > 0 ? nodes[0].id : null;
  const newId = `node-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  // Step 1: Allocate new node
  const newNode: ListNodeItem = {
    id: newId,
    value: newValue,
    nextId: null,
    prevId: null,
    status: 'new',
    pointerLabels: ['NEW_NODE'],
  };
  const step1Nodes = [newNode, ...nodes];
  assignPointerLabels(step1Nodes, { head: oldHeadId, new: newId });

  steps.push({
    nodes: step1Nodes,
    headId: oldHeadId,
    tailId: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
    pointers: { head: oldHeadId, new_node: newId },
    phase: 'Allocate Memory',
    explanation: `Created new Node(${newValue}) in memory before linking it into the list.`,
    codeLine: 2,
    highlightedNodeIds: [newId],
    listType: type,
    isQuizPoint: true,
    quizData: {
      prompt: `Where should newNode.next point to insert ${newValue} at the head?`,
      options: ['To NULL', 'To current HEAD node', 'To TAIL node', 'To itself'],
      correctIndex: 1,
      explanation: 'The new head points forward to the previous head; circular lists reconnect the tail to the new head.',
    },
  });

  // Step 2: Link newNode.next = head
  const step2Nodes = cloneNodes(step1Nodes);
  const tailId = step2Nodes[step2Nodes.length - 1].id;
  step2Nodes[0].nextId = oldHeadId ?? (isCircularList(type) ? newId : null);
  if (hasPreviousPointers(type)) {
    step2Nodes[0].prevId = isCircularList(type) ? tailId : null;
    if (oldHeadId) {
      step2Nodes[1].prevId = newId;
    }
  }
  if (isCircularList(type) && oldHeadId) {
    step2Nodes[step2Nodes.length - 1].nextId = newId;
  }
  step2Nodes[0].status = 'active';
  assignPointerLabels(step2Nodes, { head: oldHeadId, new: newId });

  steps.push({
    nodes: step2Nodes,
    headId: oldHeadId,
    tailId: nodes.length > 0 ? nodes[nodes.length - 1].id : newId,
    pointers: { head: oldHeadId, new_node: newId },
    phase: 'Connect Pointer',
    explanation: isCircularList(type)
      ? `Linked ${newValue} before the old head and reconnected the tail to the new head.`
      : `Set newNode.next = head (connecting ${newValue} to ${oldHeadId ? nodes[0].value : 'NULL'}).`,
    codeLine: 3,
    highlightedNodeIds: [newId],
    newConnections: [
      ...(oldHeadId ? [{ fromId: newId, toId: oldHeadId, type: 'next' as const }] : []),
      ...(hasPreviousPointers(type) && oldHeadId ? [{ fromId: oldHeadId, toId: newId, type: 'prev' as const }] : []),
      ...(isCircularList(type) && oldHeadId ? [{ fromId: tailId, toId: newId, type: 'next' as const }] : []),
      ...(!oldHeadId && isCircularList(type) ? [{ fromId: newId, toId: newId, type: 'next' as const }] : []),
      ...(!oldHeadId && type === 'doublyCircular' ? [{ fromId: newId, toId: newId, type: 'prev' as const }] : []),
    ],
    listType: type,
  });

  // Step 3: Update head = newNode
  const step3Nodes = cloneNodes(step2Nodes);
  step3Nodes[0].status = 'success';
  assignPointerLabels(step3Nodes, { head: newId, tail: step3Nodes[step3Nodes.length - 1].id });

  steps.push({
    nodes: step3Nodes,
    headId: newId,
    tailId: step3Nodes[step3Nodes.length - 1].id,
    pointers: { head: newId, tail: step3Nodes[step3Nodes.length - 1].id },
    phase: 'Update Head',
    explanation: `Updated head pointer to point to newNode(${newValue}). Insertion complete in O(1) time!`,
    codeLine: 4,
    highlightedNodeIds: [newId],
    listType: type,
  });

  return stageInsertedNodeSteps(steps, currentNodes);
}

// ─── 2. SINGLY LINKED LIST: INSERT AT TAIL ────────────────────────────────────────

export function generateInsertTailSteps(
  currentNodes: ListNodeItem[],
  newValue: number | string,
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  if (currentNodes.length === 0) {
    return generateInsertHeadSteps(currentNodes, newValue, type);
  }

  const steps: LinkedListStep[] = [];
  const newId = `node-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const headId = currentNodes[0].id;
  const tailId = currentNodes[currentNodes.length - 1].id;

  // Step 1: Initial list state
  assignPointerLabels(currentNodes, { head: headId, tail: tailId });
  steps.push({
    nodes: cloneNodes(currentNodes),
    headId,
    tailId,
    pointers: { head: headId, tail: tailId },
    phase: 'Locate Tail',
    explanation: `Locating the tail node of the list (value: ${currentNodes[currentNodes.length - 1].value}).`,
    codeLine: 1,
    highlightedNodeIds: [tailId],
    listType: type,
  });

  // Step 2: Allocate new node
  const newNode: ListNodeItem = {
    id: newId,
    value: newValue,
    nextId: null,
    prevId: null,
    status: 'new',
    pointerLabels: ['NEW_NODE'],
  };
  const step2Nodes = [...currentNodes, newNode];
  assignPointerLabels(step2Nodes, { head: headId, tail: tailId, new: newId });

  steps.push({
    nodes: step2Nodes,
    headId,
    tailId,
    pointers: { head: headId, tail: tailId, new_node: newId },
    phase: 'Allocate Memory',
    explanation: `Allocated new Node(${newValue}) before connecting it to the tail.`,
    codeLine: 2,
    highlightedNodeIds: [newId],
    listType: type,
  });

  // Step 3: Link tail.next = newNode
  const step3Nodes = cloneNodes(step2Nodes);
  const newTail = step3Nodes[step3Nodes.length - 1];
  step3Nodes[step3Nodes.length - 2].nextId = newId;
  if (isCircularList(type)) newTail.nextId = headId;
  if (hasPreviousPointers(type)) {
    newTail.prevId = tailId;
    if (type === 'doublyCircular') step3Nodes[0].prevId = newId;
  }
  step3Nodes[step3Nodes.length - 2].status = 'active';
  assignPointerLabels(step3Nodes, { head: headId, curr: tailId, new: newId });

  steps.push({
    nodes: step3Nodes,
    headId,
    tailId,
    pointers: { head: headId, curr: tailId, new_node: newId },
    phase: 'Link Tail Pointer',
    explanation: isCircularList(type)
      ? `Linked ${newValue} after the old tail and connected it back to the head.`
      : `Updated tail.next to point to newNode(${newValue}).`,
    codeLine: 3,
    highlightedNodeIds: [tailId, newId],
    newConnections: [
      { fromId: tailId, toId: newId, type: 'next' },
      ...(isCircularList(type) ? [{ fromId: newId, toId: headId, type: 'next' as const }] : []),
      ...(hasPreviousPointers(type) ? [{ fromId: newId, toId: tailId, type: 'prev' as const }] : []),
      ...(type === 'doublyCircular' ? [{ fromId: headId, toId: newId, type: 'prev' as const }] : []),
    ],
    listType: type,
  });

  // Step 4: Finalize Tail
  const step4Nodes = cloneNodes(step3Nodes);
  step4Nodes[step4Nodes.length - 1].status = 'success';
  assignPointerLabels(step4Nodes, { head: headId, tail: newId });

  steps.push({
    nodes: step4Nodes,
    headId,
    tailId: newId,
    pointers: { head: headId, tail: newId },
    phase: 'Update Tail Pointer',
    explanation: `Updated tail pointer to the new end node (${newValue}). Insertion complete!`,
    codeLine: 4,
    highlightedNodeIds: [newId],
    listType: type,
  });

  return stageInsertedNodeSteps(steps, currentNodes);
}

// ─── 3. SINGLY LINKED LIST: DELETE AT HEAD ────────────────────────────────────────

export function generateDeleteHeadSteps(
  currentNodes: ListNodeItem[],
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  if (currentNodes.length === 0) return [];
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);
  const oldHead = nodes[0];
  const nextHeadId = nodes.length > 1 ? nodes[1].id : null;

  // Step 1: Highlight current head
  assignPointerLabels(nodes, { head: oldHead.id, curr: oldHead.id });
  oldHead.status = 'danger';

  steps.push({
    nodes: cloneNodes(nodes),
    headId: oldHead.id,
    tailId: nodes[nodes.length - 1].id,
    pointers: { head: oldHead.id, curr: oldHead.id },
    phase: 'Identify Head',
    explanation: `Targeting head node (${oldHead.value}) for removal.`,
    codeLine: 1,
    highlightedNodeIds: [oldHead.id],
    listType: type,
    isQuizPoint: true,
    quizData: {
      prompt: `What is the time complexity to delete the head node in a ${type === 'doublyCircular' ? 'Doubly Circular' : type === 'doubly' ? 'Doubly' : type === 'circular' ? 'Circular' : 'Singly'} Linked List?`,
      options: ['O(1) Constant Time', 'O(N) Linear Time', 'O(log N)', 'O(N^2)'],
      correctIndex: 0,
      explanation: 'Deleting the head advances the head reference and repairs the affected boundary links in O(1) time.',
    },
  });

  // Step 2: Detach head pointer
  const step2Nodes = cloneNodes(nodes);
  step2Nodes[0].nextId = null;
  step2Nodes[0].prevId = null;
  step2Nodes[0].status = 'danger';
  if (step2Nodes.length > 1) {
    step2Nodes[1].status = 'active';
    if (hasPreviousPointers(type)) {
      step2Nodes[1].prevId = type === 'doublyCircular' ? nodes[nodes.length - 1].id : null;
    }
    if (isCircularList(type)) {
      step2Nodes[step2Nodes.length - 1].nextId = step2Nodes[1].id;
    }
  }
  assignPointerLabels(step2Nodes, { old_head: oldHead.id, head: nextHeadId });

  steps.push({
    nodes: step2Nodes,
    headId: nextHeadId,
    tailId: nodes[nodes.length - 1].id,
    pointers: { old_head: oldHead.id, head: nextHeadId },
    phase: 'Advance Head Pointer',
    explanation: `Advanced head pointer to ${nextHeadId ? nodes[1].value : 'NULL'} and repaired the boundary pointers.`,
    codeLine: 2,
    highlightedNodeIds: nextHeadId ? [nextHeadId] : [],
    brokenConnections: nextHeadId ? [{ fromId: oldHead.id, toId: nextHeadId, type: 'next' }] : [],
    listType: type,
  });

  // Step 3: Remove node from list
  const remainingNodes = nodes.slice(1);
  if (remainingNodes.length > 0 && isCircularList(type)) {
    remainingNodes[remainingNodes.length - 1].nextId = remainingNodes[0].id;
  }
  if (remainingNodes.length > 0 && hasPreviousPointers(type)) {
    remainingNodes[0].prevId = type === 'doublyCircular' ? remainingNodes[remainingNodes.length - 1].id : null;
  }
  if (remainingNodes.length > 0) {
    remainingNodes[0].status = 'success';
    assignPointerLabels(remainingNodes, { head: remainingNodes[0].id, tail: remainingNodes[remainingNodes.length - 1].id });
  }

  steps.push({
    nodes: remainingNodes,
    headId: remainingNodes.length > 0 ? remainingNodes[0].id : null,
    tailId: remainingNodes.length > 0 ? remainingNodes[remainingNodes.length - 1].id : null,
    pointers: remainingNodes.length > 0 ? { head: remainingNodes[0].id, tail: remainingNodes[remainingNodes.length - 1].id } : {},
    phase: 'Free Memory',
    explanation: `Deallocated memory for old head (${oldHead.value}). Head deletion complete in O(1)!`,
    codeLine: 3,
    listType: type,
  });

  return steps;
}

/** Insert at a zero-based index while keeping every pointer invariant intact. */
export function generateInsertAtIndexSteps(
  currentNodes: ListNodeItem[],
  newValue: number | string,
  index: number,
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  const safeIndex = Math.max(0, Math.min(currentNodes.length, Math.trunc(index)));
  if (safeIndex === 0) return generateInsertHeadSteps(currentNodes, newValue, type);
  if (safeIndex === currentNodes.length) return generateInsertTailSteps(currentNodes, newValue, type);

  const nodes = cloneNodes(currentNodes);
  const previous = nodes[safeIndex - 1];
  const successor = nodes[safeIndex];
  const headId = nodes[0].id;
  const tailId = nodes[nodes.length - 1].id;
  const newId = `node-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  assignPointerLabels(nodes, { head: headId, tail: tailId, curr: previous.id, next: successor.id });
  previous.status = 'active';
  successor.status = 'active';
  const locateStep: LinkedListStep = {
    nodes: cloneNodes(nodes),
    headId,
    tailId,
    pointers: { head: headId, tail: tailId, previous: previous.id, current: successor.id },
    phase: 'Locate Insertion Point',
    explanation: `Walked to index ${safeIndex}. The new node must go between ${previous.value} and ${successor.value}.`,
    codeLine: 1,
    highlightedNodeIds: [previous.id, successor.id],
    listType: type,
  };

  const allocated = cloneNodes(nodes);
  const newNode: ListNodeItem = {
    id: newId,
    value: newValue,
    nextId: null,
    prevId: null,
    status: 'new',
    pointerLabels: ['NEW_NODE'],
  };
  allocated.splice(safeIndex, 0, newNode);
  assignPointerLabels(allocated, { head: headId, tail: tailId, curr: previous.id, new: newId });
  const allocateStep: LinkedListStep = {
    nodes: allocated,
    headId,
    tailId,
    pointers: { head: headId, tail: tailId, previous: previous.id, new_node: newId },
    phase: 'Allocate Node',
    explanation: `Created node ${newValue} at index ${safeIndex}. Its links are not connected yet.`,
    codeLine: 2,
    highlightedNodeIds: [newId],
    listType: type,
  };

  const linked = cloneNodes(allocated);
  const linkedNew = linked[safeIndex];
  const linkedPrevious = linked[safeIndex - 1];
  const linkedSuccessor = linked[safeIndex + 1];
  linkedPrevious.nextId = newId;
  linkedNew.nextId = linkedSuccessor.id;
  if (hasPreviousPointers(type)) {
    linkedNew.prevId = linkedPrevious.id;
    linkedSuccessor.prevId = newId;
  }
  linkedNew.status = 'success';
  assignPointerLabels(linked, { head: headId, tail: tailId });

  return stageInsertedNodeSteps([locateStep, allocateStep, {
    nodes: linked,
    headId,
    tailId,
    pointers: { head: headId, tail: tailId, previous: linkedPrevious.id, new_node: newId, next: linkedSuccessor.id },
    phase: 'Reconnect Pointers',
    explanation: hasPreviousPointers(type)
      ? `Set ${previous.value}.next → ${newValue} and repaired both backward links: ${newValue}.prev → ${previous.value}, ${successor.value}.prev → ${newValue}.`
      : `Set ${previous.value}.next → ${newValue} and ${newValue}.next → ${successor.value}.`,
    codeLine: 3,
    highlightedNodeIds: [linkedPrevious.id, newId, linkedSuccessor.id],
    brokenConnections: [
      { fromId: previous.id, toId: successor.id, type: 'next' },
      ...(hasPreviousPointers(type) ? [{ fromId: successor.id, toId: previous.id, type: 'prev' as const }] : []),
    ],
    newConnections: [
      { fromId: linkedPrevious.id, toId: newId, type: 'next' },
      { fromId: newId, toId: linkedSuccessor.id, type: 'next' },
      ...(hasPreviousPointers(type) ? [
        { fromId: newId, toId: linkedPrevious.id, type: 'prev' as const },
        { fromId: linkedSuccessor.id, toId: newId, type: 'prev' as const },
      ] : []),
    ],
    listType: type,
  }], currentNodes);
}

/** Delete a node at a zero-based index and show the bypass before freeing it. */
export function generateDeleteAtIndexSteps(
  currentNodes: ListNodeItem[],
  index: number,
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  if (currentNodes.length === 0) return [];
  const safeIndex = Math.max(0, Math.min(currentNodes.length - 1, Math.trunc(index)));
  if (safeIndex === 0) return generateDeleteHeadSteps(currentNodes, type);

  const nodes = cloneNodes(currentNodes);
  const target = nodes[safeIndex];
  const previous = nodes[safeIndex - 1];
  const isTail = safeIndex === nodes.length - 1;
  const next = isTail ? (isCircularList(type) ? nodes[0] : undefined) : nodes[safeIndex + 1];
  const headId = nodes[0].id;
  const tailId = nodes[nodes.length - 1].id;
  assignPointerLabels(nodes, { head: headId, tail: tailId, previous: previous.id, target: target.id });
  target.status = 'danger';
  previous.status = 'active';

  const steps: LinkedListStep[] = [{
    nodes: cloneNodes(nodes),
    headId,
    tailId,
    pointers: { head: headId, tail: tailId, previous: previous.id, target: target.id },
    phase: 'Locate Target',
    explanation: `Found ${target.value} at index ${safeIndex}; keep its neighbors so the list can bypass it safely.`,
    codeLine: 1,
    highlightedNodeIds: [previous.id, target.id, ...(next ? [next.id] : [])],
    listType: type,
  }];

  const bypassed = cloneNodes(nodes);
  bypassed[safeIndex - 1].nextId = next?.id ?? null;
  if (hasPreviousPointers(type) && next) next && (bypassed[safeIndex === nodes.length - 1 ? 0 : safeIndex + 1].prevId = previous.id);
  if (type === 'doublyCircular' && isTail) bypassed[0].prevId = previous.id;
  bypassed[safeIndex].status = 'danger';
  assignPointerLabels(bypassed, { head: headId, tail: isTail ? previous.id : tailId, previous: previous.id, target: target.id });
  steps.push({
    nodes: bypassed,
    headId,
    tailId: isTail ? previous.id : tailId,
    pointers: { head: headId, tail: isTail ? previous.id : tailId, previous: previous.id, target: target.id },
    phase: 'Bypass Target',
    explanation: next
      ? `Changed ${previous.value}.next to ${next.value}${hasPreviousPointers(type) ? ` and repaired ${next.value}.prev to ${previous.value}` : ''}.`
      : `Changed ${previous.value}.next to NULL and moved TAIL to ${previous.value}.`,
    codeLine: 2,
    highlightedNodeIds: [previous.id, ...(next ? [next.id] : [])],
    brokenConnections: [
      { fromId: previous.id, toId: target.id, type: 'next' },
      ...(next ? [{ fromId: target.id, toId: next.id, type: 'next' as const }] : []),
      ...(hasPreviousPointers(type) ? [
        { fromId: target.id, toId: previous.id, type: 'prev' as const },
        ...(next ? [{ fromId: next.id, toId: target.id, type: 'prev' as const }] : []),
      ] : []),
    ],
    newConnections: [
      ...(next ? [{ fromId: previous.id, toId: next.id, type: 'next' as const }] : []),
      ...(!next && isCircularList(type) ? [{ fromId: previous.id, toId: headId, type: 'next' as const }] : []),
      ...(hasPreviousPointers(type) && next ? [{ fromId: next.id, toId: previous.id, type: 'prev' as const }] : []),
      ...(type === 'doublyCircular' && isTail ? [{ fromId: headId, toId: previous.id, type: 'prev' as const }] : []),
    ],
    listType: type,
  });

  const remaining = bypassed.filter((node) => node.id !== target.id);
  if (remaining.length > 0) {
    const newTail = remaining[remaining.length - 1];
    if (isCircularList(type)) newTail.nextId = remaining[0].id;
    if (hasPreviousPointers(type)) {
      remaining[0].prevId = type === 'doublyCircular' ? newTail.id : null;
      if (type === 'doublyCircular') newTail.nextId = remaining[0].id;
    }
    assignPointerLabels(remaining, { head: remaining[0].id, tail: newTail.id });
  }
  steps.push({
    nodes: remaining,
    headId: remaining[0]?.id ?? null,
    tailId: remaining[remaining.length - 1]?.id ?? null,
    pointers: remaining.length ? { head: remaining[0].id, tail: remaining[remaining.length - 1].id } : {},
    phase: 'Free Node',
    explanation: `Removed ${target.value} from index ${safeIndex}; the remaining list stays ${type === 'doublyCircular' ? 'doubly circular' : type === 'circular' ? 'circular' : type === 'doubly' ? 'bidirectionally linked' : 'connected'}.`,
    codeLine: 3,
    listType: type,
  });
  return steps;
}

// ─── 4. REVERSE LINKED LIST (3-POINTER TECHNIQUE) ──────────────────────────────────

export function generateReverseSteps(
  currentNodes: ListNodeItem[],
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  if (currentNodes.length === 0) return [];

  if (type !== 'singly') {
    const steps: LinkedListStep[] = [];
    const workingNodes = cloneNodes(currentNodes);
    const firstNodeId = workingNodes[0].id;
    const lastNodeId = workingNodes[workingNodes.length - 1].id;
    let currentId: string | null = firstNodeId;
    let previousId: string | null = isCircularList(type) ? lastNodeId : null;
    let nextId: string | null = null;
    let visits = 0;
    const labelPointers = () => ({ head: firstNodeId, tail: lastNodeId, prev: previousId, curr: currentId, next: nextId });
    assignPointerLabels(workingNodes, labelPointers());
    steps.push({
      nodes: cloneNodes(workingNodes),
      headId: firstNodeId,
      tailId: lastNodeId,
      pointers: labelPointers(),
      phase: 'Inspect List Boundaries',
      explanation: hasPreviousPointers(type)
        ? 'Keep each node in place. For every node, save its old next pointer, then swap that node’s next and previous links.'
        : isCircularList(type)
          ? 'Start prev at the old tail so reversing each next pointer preserves a circular chain.'
          : 'Keep each node in place. Save curr.next, redirect curr.next to prev, then advance prev and curr.',
      codeLine: 2,
      highlightedNodeIds: [firstNodeId, lastNodeId],
      listType: type,
    });

    while (currentId && visits < workingNodes.length) {
      const current = workingNodes.find((node) => node.id === currentId);
      if (!current) break;
      const oldNextId = current.nextId;
      const oldPrevId = current.prevId ?? null;
      nextId = oldNextId;
      current.status = 'active';
      assignPointerLabels(workingNodes, labelPointers());
      steps.push({
        nodes: cloneNodes(workingNodes),
        headId: firstNodeId,
        tailId: lastNodeId,
        pointers: labelPointers(),
        phase: 'Save Original Next',
        explanation: `Save ${current.value}.next (${oldNextId ? `N${workingNodes.findIndex((node) => node.id === oldNextId) + 1}` : 'NULL'}) before changing this node’s links.`,
        codeLine: 4,
        highlightedNodeIds: [current.id],
        listType: type,
      });

      const brokenConnections = [
        ...(oldNextId ? [{ fromId: current.id, toId: oldNextId, type: 'next' as const }] : []),
        ...(hasPreviousPointers(type) && oldPrevId ? [{ fromId: current.id, toId: oldPrevId, type: 'prev' as const }] : []),
      ];
      if (hasPreviousPointers(type)) {
        current.nextId = oldPrevId;
        current.prevId = oldNextId;
      } else {
        current.nextId = previousId;
      }
      current.status = 'comparing';
      assignPointerLabels(workingNodes, labelPointers());
      const newConnections = [
        ...(current.nextId ? [{ fromId: current.id, toId: current.nextId, type: 'next' as const }] : []),
        ...(hasPreviousPointers(type) && current.prevId ? [{ fromId: current.id, toId: current.prevId, type: 'prev' as const }] : []),
      ];
      steps.push({
        nodes: cloneNodes(workingNodes),
        headId: firstNodeId,
        tailId: lastNodeId,
        pointers: labelPointers(),
        phase: hasPreviousPointers(type) ? 'Swap This Node’s Links' : 'Reverse Current Link',
        explanation: hasPreviousPointers(type)
          ? `${current.value}.next now points to ${current.nextId ? `N${workingNodes.findIndex((node) => node.id === current.nextId) + 1}` : 'NULL'}, and .prev points to ${current.prevId ? `N${workingNodes.findIndex((node) => node.id === current.prevId) + 1}` : 'NULL'}.`
          : `${current.value}.next now points to ${current.nextId ? `N${workingNodes.findIndex((node) => node.id === current.nextId) + 1}` : 'NULL'} (${current.nextId ? 'the previous node' : 'NULL'}).`,
        codeLine: 5,
        highlightedNodeIds: [current.id],
        brokenConnections,
        newConnections,
        listType: type,
      });

      previousId = current.id;
      currentId = oldNextId;
      nextId = null;
      visits += 1;
      assignPointerLabels(workingNodes, labelPointers());
      steps.push({
        nodes: cloneNodes(workingNodes),
        headId: firstNodeId,
        tailId: lastNodeId,
        pointers: labelPointers(),
        phase: 'Advance Pointers',
        explanation: visits >= workingNodes.length && isCircularList(type)
          ? 'The saved link returned to the starting node after every node was visited once. Stop here so the circular list is not processed twice.'
          : currentId
          ? `Advance along the saved link: prev = N${workingNodes.findIndex((node) => node.id === previousId) + 1}, curr = N${workingNodes.findIndex((node) => node.id === currentId) + 1}.`
          : 'The saved next pointer was NULL or returned to the starting node; every node has now been processed once.',
        codeLine: 6,
        highlightedNodeIds: [previousId, ...(currentId ? [currentId] : [])],
        listType: type,
      });
    }

    const reversedNodes = cloneNodes(workingNodes).map((node) => ({ ...node, status: 'success' as const }));
    const reversedHeadId = lastNodeId;
    const reversedTailId = firstNodeId;
    assignPointerLabels(reversedNodes, { head: reversedHeadId, tail: reversedTailId });
    steps.push({
      nodes: reversedNodes,
      headId: reversedHeadId,
      tailId: reversedTailId,
      pointers: { head: reversedHeadId, tail: reversedTailId },
      phase: 'Update Head and Tail',
      explanation: `All node links have been rewired one at a time. Set head to the old tail (${reversedNodes.find((node) => node.id === reversedHeadId)?.value}) and tail to the old head (${reversedNodes.find((node) => node.id === reversedTailId)?.value}).`,
      codeLine: 8,
      highlightedNodeIds: [reversedHeadId, reversedTailId],
      listType: type,
    });

    return steps;
  }

  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);

  // Initial State: prev = null, curr = head
  let prevId: string | null = null;
  let currIndex = 0;

  assignPointerLabels(nodes, { head: nodes[0].id, tail: nodes[nodes.length - 1].id, curr: nodes[0].id, prev: null, next: null });
  steps.push({
    nodes: cloneNodes(nodes),
    headId: nodes[0].id,
    tailId: nodes[nodes.length - 1].id,
    pointers: { head: nodes[0].id, tail: nodes[nodes.length - 1].id, curr: nodes[0].id, prev: null, next: null },
    phase: 'Initialize Pointers',
    explanation: 'Initialize three pointers: prev = NULL, curr = head, next = NULL.',
    codeLine: 2,
    highlightedNodeIds: [nodes[0].id],
    listType: 'singly',
  });

  const workingNodes = cloneNodes(nodes);

  while (currIndex < workingNodes.length) {
    const currId = workingNodes[currIndex].id;
    const currVal = workingNodes[currIndex].value;
    const nextIndex = currIndex + 1;
    const nextId = nextIndex < workingNodes.length ? workingNodes[nextIndex].id : null;

    // Step A: Save next pointer: next = curr.next
    assignPointerLabels(workingNodes, { head: nodes[0].id, tail: nodes[nodes.length - 1].id, prev: prevId, curr: currId, next: nextId });
    workingNodes[currIndex].status = 'active';

    steps.push({
      nodes: cloneNodes(workingNodes),
      headId: nodes[0].id,
      tailId: nodes[nodes.length - 1].id,
      pointers: { prev: prevId, curr: currId, next: nextId },
      phase: 'Save Next Pointer',
      explanation: `Saved next node: next = curr.next (${nextId ? workingNodes[nextIndex].value : 'NULL'}).`,
      codeLine: 4,
      highlightedNodeIds: [currId],
      listType: 'singly',
      isQuizPoint: currIndex === 1,
      quizData: {
        prompt: `Why do we save 'next = curr.next' before modifying curr.next?`,
        options: [
          'To prevent losing the reference to the remaining list',
          'To free memory immediately',
          'To detect circular loops',
          'To swap node values'
        ],
        correctIndex: 0,
        explanation: 'Once curr.next is pointed backwards to prev, the link to the rest of the list is severed unless saved in next.',
      },
    });

    // Step B: Reverse pointer: curr.next = prev
    const oldNext = workingNodes[currIndex].nextId;
    workingNodes[currIndex].nextId = prevId;
    workingNodes[currIndex].status = 'comparing';

    steps.push({
      nodes: cloneNodes(workingNodes),
      headId: nodes[0].id,
      tailId: nodes[nodes.length - 1].id,
      pointers: { prev: prevId, curr: currId, next: nextId },
      phase: 'Reverse Current Pointer',
      explanation: `Reversed pointer: curr.next = prev (${currVal} now points to ${prevId ? 'node' : 'NULL'}).`,
      codeLine: 5,
      highlightedNodeIds: [currId],
      brokenConnections: oldNext ? [{ fromId: currId, toId: oldNext, type: 'next' }] : [],
      newConnections: prevId ? [{ fromId: currId, toId: prevId, type: 'next' }] : [],
      listType: 'singly',
    });

    // Step C: Advance prev = curr, curr = next
    prevId = currId;
    currIndex++;

    assignPointerLabels(workingNodes, { head: nodes[0].id, tail: nodes[nodes.length - 1].id, prev: prevId, curr: nextId, next: null });
    steps.push({
      nodes: cloneNodes(workingNodes),
      headId: nodes[0].id,
      tailId: nodes[nodes.length - 1].id,
      pointers: { prev: prevId, curr: nextId },
      phase: 'Advance Pointers',
      explanation: `Advanced pointers: prev = curr, curr = next (${nextId ? 'moving forward' : 'reached end of list'}).`,
      codeLine: 6,
      highlightedNodeIds: prevId ? [prevId] : [],
      listType: 'singly',
    });
  }

  // Final Step: head = prev
  const finalNodes = workingNodes.map((n) => ({ ...n, status: 'success' as const }));
  const newHeadId = prevId;
  assignPointerLabels(finalNodes, { head: newHeadId, tail: finalNodes[0].id });

  steps.push({
    nodes: finalNodes,
    headId: newHeadId,
    tailId: finalNodes[0].id,
    pointers: { head: newHeadId, tail: finalNodes[0].id },
    phase: 'Reverse Completed',
    explanation: `List reversal complete! New head is node (${finalNodes.find((n) => n.id === newHeadId)?.value}). Time Complexity: O(N), Space: O(1).`,
    codeLine: 8,
    listType: 'singly',
  });

  return steps;
}

// ─── 5. FLOYD'S CYCLE DETECTION (TORTOISE AND HARE) ───────────────────────────────

export function generateCycleDetectionSteps(
  currentNodes: ListNodeItem[],
  cycleIndex: number = 2,
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  if (currentNodes.length < 3) return [];
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);

  // Inject cycle link: tail.next = nodes[cycleIndex]
  const targetIndex = Math.min(Math.max(cycleIndex, 0), nodes.length - 1);
  const targetNode = nodes[targetIndex];
  nodes[nodes.length - 1].nextId = targetNode.id;
  if (hasPreviousPointers(type)) targetNode.prevId = nodes[nodes.length - 1].id;

  let slowIdx = 0;
  let fastIdx = 0;
  let cycleFound = false;

  // Step 1: Start
  assignPointerLabels(nodes, { slow: nodes[0].id, fast: nodes[0].id, head: nodes[0].id });
  steps.push({
    nodes: cloneNodes(nodes),
    headId: nodes[0].id,
    tailId: null,
    pointers: { slow: nodes[0].id, fast: nodes[0].id, head: nodes[0].id },
    phase: 'Initialize Slow & Fast',
    explanation: 'Initialized slow and fast pointers at head. Slow moves 1 step, Fast moves 2 steps per iteration.',
    codeLine: 2,
    highlightedNodeIds: [nodes[0].id],
    listType: type,
    isQuizPoint: true,
    quizData: {
      prompt: 'If a cycle exists in a linked list, why are slow and fast pointers guaranteed to meet?',
      options: [
        'The relative distance between them decreases by 1 node per iteration',
        'Fast pointer jumps over the slow pointer randomly',
        'Slow pointer always halts at the midpoint',
        'The cycle length is always a prime number'
      ],
      correctIndex: 0,
      explanation: "With fast moving 2 steps and slow moving 1 step, the gap (fast - slow) reduces by 1 on every iteration within the cycle loop.",
    },
  });

  let iterations = 0;
  while (iterations < 20) {
    iterations++;

    // Advance slow by 1
    const slowNode = nodes[slowIdx];
    const nextSlowId = slowNode.nextId;
    slowIdx = nodes.findIndex((n) => n.id === nextSlowId);

    // Advance fast by 2
    const fastNode = nodes[fastIdx];
    const fastMidId = fastNode.nextId;
    const fastMidIdx = nodes.findIndex((n) => n.id === fastMidId);
    const fastNextId = fastMidIdx !== -1 ? nodes[fastMidIdx].nextId : null;
    fastIdx = nodes.findIndex((n) => n.id === fastNextId);

    if (slowIdx === -1 || fastIdx === -1) {
      // No cycle
      break;
    }

    const currentSlowId = nodes[slowIdx].id;
    const currentFastId = nodes[fastIdx].id;

    if (currentSlowId === currentFastId) {
      cycleFound = true;
      const meetingNodes = cloneNodes(nodes);
      meetingNodes[slowIdx].status = 'cycle';
      assignPointerLabels(meetingNodes, { slow: currentSlowId, fast: currentFastId, meet: currentSlowId });

      steps.push({
        nodes: meetingNodes,
        headId: nodes[0].id,
        tailId: null,
        pointers: { slow: currentSlowId, fast: currentFastId, meet: currentSlowId },
        phase: 'Pointers Met (Cycle Detected!)',
        explanation: `Slow and Fast met at Node(${nodes[slowIdx].value})! Cycle detected with certainty.`,
        codeLine: 6,
        highlightedNodeIds: [currentSlowId],
        listType: type,
      });
      break;
    } else {
      const stepNodes = cloneNodes(nodes);
      stepNodes[slowIdx].status = 'active';
      stepNodes[fastIdx].status = 'comparing';
      assignPointerLabels(stepNodes, { slow: currentSlowId, fast: currentFastId });

      steps.push({
        nodes: stepNodes,
        headId: nodes[0].id,
        tailId: null,
        pointers: { slow: currentSlowId, fast: currentFastId },
        phase: `Iteration ${iterations}`,
        explanation: `Slow advanced to Node(${nodes[slowIdx].value}) [1 step], Fast advanced to Node(${nodes[fastIdx].value}) [2 steps].`,
        codeLine: 4,
        highlightedNodeIds: [currentSlowId, currentFastId],
        listType: type,
      });
    }
  }

  // Phase 2: Find cycle start node (Floyd's second phase)
  if (cycleFound) {
    let p1Idx = 0; // starts at head
    let p2Idx = slowIdx; // starts at meeting point

    const phase2Nodes = cloneNodes(nodes);
    phase2Nodes[p1Idx].status = 'active';
    phase2Nodes[p2Idx].status = 'cycle';
    assignPointerLabels(phase2Nodes, { ptr1_head: nodes[p1Idx].id, ptr2_meet: nodes[p2Idx].id });

    steps.push({
      nodes: phase2Nodes,
      headId: nodes[0].id,
      tailId: null,
      pointers: { ptr1: nodes[p1Idx].id, ptr2: nodes[p2Idx].id },
      phase: 'Locate Cycle Origin',
      explanation: 'Reset Pointer 1 to Head while leaving Pointer 2 at Meeting point. Advance both 1 step at a time.',
      codeLine: 8,
      highlightedNodeIds: [nodes[p1Idx].id, nodes[p2Idx].id],
      listType: type,
    });

    while (p1Idx !== p2Idx) {
      const p1Next = nodes[p1Idx].nextId;
      const p2Next = nodes[p2Idx].nextId;
      p1Idx = nodes.findIndex((n) => n.id === p1Next);
      p2Idx = nodes.findIndex((n) => n.id === p2Next);

      const stepNodes = cloneNodes(nodes);
      stepNodes[p1Idx].status = p1Idx === p2Idx ? 'success' : 'active';
      stepNodes[p2Idx].status = p1Idx === p2Idx ? 'success' : 'cycle';
      assignPointerLabels(stepNodes, { ptr1: nodes[p1Idx].id, ptr2: nodes[p2Idx].id });

      steps.push({
        nodes: stepNodes,
        headId: nodes[0].id,
        tailId: null,
        pointers: { ptr1: nodes[p1Idx].id, ptr2: nodes[p2Idx].id },
        phase: p1Idx === p2Idx ? 'Cycle Origin Found!' : 'Advancing Step-by-Step',
        explanation: p1Idx === p2Idx
          ? `Both pointers met at Node(${nodes[p1Idx].value})! This is the exact start of the cycle.`
          : `Advancing ptr1 (${nodes[p1Idx].value}) and ptr2 (${nodes[p2Idx].value}) by 1 step.`,
        codeLine: 10,
        highlightedNodeIds: [nodes[p1Idx].id, nodes[p2Idx].id],
        listType: type,
      });
    }
  }

  return steps;
}

// ─── 6. FIND MIDDLE NODE (FAST & SLOW) ────────────────────────────────────────────

export function generateMiddleNodeSteps(
  currentNodes: ListNodeItem[],
  type: LinkedListStructureType = 'singly'
): LinkedListStep[] {
  if (currentNodes.length === 0) return [];
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);

  let slowIdx = 0;
  let fastIdx = 0;

  assignPointerLabels(nodes, { slow: nodes[0].id, fast: nodes[0].id, head: nodes[0].id });
  steps.push({
    nodes: cloneNodes(nodes),
    headId: nodes[0].id,
    tailId: nodes[nodes.length - 1].id,
    pointers: { slow: nodes[0].id, fast: nodes[0].id },
    phase: 'Initialize Pointers',
    explanation: isCircularList(type)
      ? 'Start slow and fast pointers at head. Fast moves twice as far, and traversal stops after one lap.'
      : 'Start slow and fast pointers at head. Fast moves 2x speed of slow.',
    codeLine: 2,
    highlightedNodeIds: [nodes[0].id],
    listType: type,
  });

  while (fastIdx < nodes.length && fastIdx + 1 < nodes.length) {
    slowIdx += 1;
    fastIdx += 2;

    const currentSlow = nodes[slowIdx];
    const currentFast = fastIdx < nodes.length ? nodes[fastIdx] : null;

    const stepNodes = cloneNodes(nodes);
    stepNodes[slowIdx].status = 'active';
    if (currentFast) stepNodes[fastIdx].status = 'comparing';
    assignPointerLabels(stepNodes, {
      slow: currentSlow.id,
      fast: currentFast ? currentFast.id : null,
    });

    steps.push({
      nodes: stepNodes,
      headId: nodes[0].id,
      tailId: nodes[nodes.length - 1].id,
      pointers: {
        slow: currentSlow.id,
        fast: currentFast ? currentFast.id : null,
      },
      phase: 'Advance Pointers',
      explanation: `Slow moved to Node(${currentSlow.value}), Fast moved to ${currentFast ? `Node(${currentFast.value})` : 'NULL / End'}.`,
      codeLine: 4,
      highlightedNodeIds: [currentSlow.id, ...(currentFast ? [currentFast.id] : [])],
      listType: type,
    });
  }

  const finalNodes = cloneNodes(nodes);
  finalNodes[slowIdx].status = 'success';
  assignPointerLabels(finalNodes, { mid: nodes[slowIdx].id, head: nodes[0].id });

  steps.push({
    nodes: finalNodes,
    headId: nodes[0].id,
    tailId: nodes[nodes.length - 1].id,
    pointers: { mid: nodes[slowIdx].id },
    phase: 'Middle Found',
    explanation: `Middle node identified: Node(${nodes[slowIdx].value}) at index ${slowIdx}.`,
    codeLine: 6,
    highlightedNodeIds: [nodes[slowIdx].id],
    listType: type,
  });

  return steps;
}

// ─── 7. JOSEPHUS PROBLEM (CIRCULAR ELIMINATION) ───────────────────────────────────

export function generateJosephusSteps(
  currentNodes: ListNodeItem[],
  stepSize: number
): LinkedListStep[] {
  if (currentNodes.length === 0 || !Number.isInteger(stepSize) || stepSize < 1) return [];

  const steps: LinkedListStep[] = [];
  let ring = cloneNodes(currentNodes);
  ring.forEach((node, index) => {
    node.nextId = ring[(index + 1) % ring.length].id;
    node.status = 'default';
  });

  let headId = ring[0].id;
  let tailId = ring[ring.length - 1].id;
  let currentIndex = 0;
  const ordinalSuffix = stepSize % 100 >= 11 && stepSize % 100 <= 13
    ? 'th'
    : stepSize % 10 === 1
    ? 'st'
    : stepSize % 10 === 2
    ? 'nd'
    : stepSize % 10 === 3
    ? 'rd'
    : 'th';

  const addStep = (
    phase: string,
    explanation: string,
    codeLine: number,
    currentId: string,
    previousId: string | null,
    status: ListNodeItem['status'] = 'active',
    countLabel?: string,
    victimId?: string,
    isQuizPoint = false,
    quizData?: LinkedListQuizData
  ) => {
    const snapshot = cloneNodes(ring);
    snapshot.forEach((node) => { node.status = 'default'; });
    const current = snapshot.find((node) => node.id === currentId);
    const previous = previousId ? snapshot.find((node) => node.id === previousId) : null;
    if (current) current.status = status;
    if (previous && previous.id !== currentId) previous.status = 'comparing';

    assignPointerLabels(snapshot, {
      head: headId,
      tail: tailId,
      previous: previousId,
      current: currentId,
      victim: victimId ?? null,
    });
    if (current && countLabel) current.pointerLabels?.push(countLabel);

    steps.push({
      nodes: snapshot,
      headId,
      tailId,
      pointers: { head: headId, tail: tailId, previous: previousId, current: currentId, victim: victimId ?? null },
      phase,
      explanation,
      codeLine,
      highlightedNodeIds: [currentId, ...(previousId ? [previousId] : [])],
      listType: 'circular',
      isQuizPoint,
      quizData,
    });
  };

  addStep(
    'Start at HEAD',
    `Start counting at node ${ring[currentIndex].value}. Remove every ${stepSize}${ordinalSuffix} node, then continue at the next node.`,
    2,
    ring[currentIndex].id,
    ring[(currentIndex - 1 + ring.length) % ring.length].id
  );

  while (ring.length > 1) {
    let previousIndex = (currentIndex - 1 + ring.length) % ring.length;

    for (let count = 1; count <= stepSize; count += 1) {
      const current = ring[currentIndex];
      const previous = ring[previousIndex];
      const isVictim = count === stepSize;
      const otherValues = [...new Set(ring
        .filter((node) => node.id !== current.id)
        .map((node) => String(node.value)))];
      const options = [String(current.value), ...otherValues.slice(0, 2)];

      addStep(
        isVictim ? 'Select node to eliminate' : `Count ${count} of ${stepSize}`,
        isVictim
          ? `Count ${count} lands on node ${current.value}; this node is eliminated from the circle.`
          : `Count ${count} on node ${current.value}. Continue around the circle until count ${stepSize}.`,
        isVictim ? 6 : count === 1 ? 4 : 5,
        current.id,
        previous.id,
        isVictim ? 'danger' : 'active',
        `COUNT ${count}`,
        isVictim ? current.id : undefined,
        isVictim && options.length > 1,
        isVictim && options.length > 1 ? {
          prompt: `Counting ${stepSize} from the current start, which node is eliminated?`,
          options,
          correctIndex: 0,
          explanation: `Counting lands on node ${current.value}, so its previous node skips it and points to the next node.`,
        } : undefined
      );

      previousIndex = currentIndex;
      currentIndex = (currentIndex + 1) % ring.length;
    }

    const victimIndex = (currentIndex - 1 + ring.length) % ring.length;
    const victim = ring[victimIndex];
    const previousIndexToVictim = (victimIndex - 1 + ring.length) % ring.length;
    const previousId = ring[previousIndexToVictim].id;
    const successorId = ring[(victimIndex + 1) % ring.length].id;
    const previousNode = ring[previousIndexToVictim];
    previousNode.nextId = successorId;

    ring = ring.filter((node) => node.id !== victim.id);
    if (victim.id === headId) headId = successorId;
    if (victim.id === tailId) tailId = previousId;
    if (ring.length === 1) ring[0].nextId = ring[0].id;

    currentIndex = ring.findIndex((node) => node.id === successorId);
    addStep(
      'Reconnect the circle',
      `Remove node ${victim.value}: node ${ring.find((node) => node.id === previousId)?.value} now points to node ${ring.find((node) => node.id === successorId)?.value}. Counting restarts there.`,
      7,
      successorId,
      previousId
    );
  }

  const winner = ring[0];
  winner.status = 'success';
  assignPointerLabels(ring, { head: winner.id, tail: winner.id, winner: winner.id });
  steps.push({
    nodes: cloneNodes(ring),
    headId: winner.id,
    tailId: winner.id,
    pointers: { head: winner.id, tail: winner.id, winner: winner.id },
    phase: 'Survivor found',
    explanation: `Node ${winner.value} is the last one in the circle and survives the Josephus elimination.`,
    codeLine: 10,
    highlightedNodeIds: [winner.id],
    listType: 'circular',
  });

  return steps;
}

// ─── 7. DOUBLY LINKED LIST INSERTION ──────────────────────────────────────────────

export function generateDoublyInsertHeadSteps(
  currentNodes: ListNodeItem[],
  newValue: number | string
): LinkedListStep[] {
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);
  const oldHeadId = nodes.length > 0 ? nodes[0].id : null;
  const newId = `node-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const newNode: ListNodeItem = {
    id: newId,
    value: newValue,
    nextId: null,
    prevId: null,
    status: 'new',
    pointerLabels: ['NEW_NODE'],
  };

  const step1Nodes = [newNode, ...nodes];
  assignPointerLabels(step1Nodes, { head: oldHeadId, new: newId });

  steps.push({
    nodes: step1Nodes,
    headId: oldHeadId,
    tailId: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
    pointers: { head: oldHeadId, new_node: newId },
    phase: 'Allocate Doubly Node',
    explanation: `Created new DoublyNode(${newValue}) with prev = NULL and next = NULL.`,
    codeLine: 2,
    highlightedNodeIds: [newId],
    listType: 'doubly',
  });

  // Link newNode.next = oldHead, oldHead.prev = newNode
  const step2Nodes = cloneNodes(step1Nodes);
  step2Nodes[0].nextId = oldHeadId;
  if (oldHeadId && step2Nodes.length > 1) {
    step2Nodes[1].prevId = newId;
    step2Nodes[1].status = 'active';
  }
  step2Nodes[0].status = 'active';
  assignPointerLabels(step2Nodes, { head: oldHeadId, new: newId });

  steps.push({
    nodes: step2Nodes,
    headId: oldHeadId,
    tailId: nodes.length > 0 ? nodes[nodes.length - 1].id : newId,
    pointers: { head: oldHeadId, new_node: newId },
    phase: 'Connect Bidirectional Links',
    explanation: `Set newNode.next = head, and oldHead.prev = newNode (establishing bidirectional link).`,
    codeLine: 4,
    highlightedNodeIds: oldHeadId ? [newId, oldHeadId] : [newId],
    newConnections: oldHeadId
      ? [
          { fromId: newId, toId: oldHeadId, type: 'next' },
          { fromId: oldHeadId, toId: newId, type: 'prev' },
        ]
      : [],
    listType: 'doubly',
  });

  // Final step: head = newNode
  const step3Nodes = cloneNodes(step2Nodes);
  step3Nodes[0].status = 'success';
  assignPointerLabels(step3Nodes, { head: newId, tail: step3Nodes[step3Nodes.length - 1].id });

  steps.push({
    nodes: step3Nodes,
    headId: newId,
    tailId: step3Nodes[step3Nodes.length - 1].id,
    pointers: { head: newId, tail: step3Nodes[step3Nodes.length - 1].id },
    phase: 'Update Head',
    explanation: `Updated head pointer to newNode(${newValue}). Doubly linked list insertion complete!`,
    codeLine: 6,
    highlightedNodeIds: [newId],
    listType: 'doubly',
  });

  return stageInsertedNodeSteps(steps, currentNodes);
}

// ─── INTERVIEW PROBLEMS: RANGE / GROUP REVERSALS ────────────────────────────────

function problemSnapshot(
  orderedNodes: ListNodeItem[],
  phase: string,
  explanation: string,
  codeLine: number,
  pointerIndexes: Record<string, number | null> = {},
  highlightedIndexes: number[] = [],
  status: ListNodeItem['status'] = 'active',
  isQuizPoint = false,
  quizData?: LinkedListQuizData
): LinkedListStep {
  const nodes = cloneNodes(orderedNodes);
  nodes.forEach((node, index) => {
    node.nextId = index < nodes.length - 1 ? nodes[index + 1].id : null;
    node.prevId = null;
    node.status = 'default';
  });
  const pointers: Record<string, string | null> = {};
  for (const [label, index] of Object.entries(pointerIndexes)) {
    const id = index !== null && index >= 0 && index < nodes.length ? nodes[index].id : null;
    pointers[label] = id;
  }
  assignPointerLabels(nodes, pointers);
  highlightedIndexes.forEach((index, offset) => {
    if (nodes[index]) nodes[index].status = offset === 0 ? status : 'comparing';
  });
  const headId = nodes[0]?.id ?? null;
  const tailId = nodes[nodes.length - 1]?.id ?? null;
  return {
    nodes,
    headId,
    tailId,
    pointers,
    phase,
    explanation,
    codeLine,
    highlightedNodeIds: highlightedIndexes.map((index) => nodes[index]?.id).filter((id): id is string => Boolean(id)),
    listType: 'singly',
    isQuizPoint,
    quizData,
  };
}

function generateReverseRangeSteps(
  currentNodes: ListNodeItem[],
  left: number,
  right: number,
  title: string,
  positionLabel: '1-based' | '0-based' = '1-based'
): LinkedListStep[] {
  const count = currentNodes.length;
  if (!count || !Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < left || right >= count) return [];
  let order = cloneNodes(currentNodes);
  const toPosition = (index: number) => positionLabel === '1-based' ? index + 1 : index;
  const label = (index: number) => `${positionLabel === '1-based' ? 'position' : 'index'} ${toPosition(index)}`;
  const steps: LinkedListStep[] = [problemSnapshot(
    order,
    'Mark the sublist',
    `${title}: keep the nodes before ${label(left)} and after ${label(right)} in place. Reverse only the inclusive range ${toPosition(left)}–${toPosition(right)}.`,
    1,
    { sublist_head: left, sublist_tail: right },
    [left, right],
  )];

  for (let moving = left + 1; moving <= right; moving += 1) {
    const movedNode = order[moving];
    order = [
      ...order.slice(0, left),
      movedNode,
      ...order.slice(left, moving),
      ...order.slice(moving + 1),
    ];
    steps.push(problemSnapshot(
      order,
      `Move node at ${label(moving)} to sublist front`,
      `Detach node ${movedNode.value} and link it before the current sublist head. Nodes outside the requested range keep their relative order.`,
      4,
      { sublist_head: left, moved: left, next_to_move: Math.min(moving, right) },
      [left, Math.min(moving, right)],
      'active',
      moving === left + 1,
      moving === left + 1 ? {
        prompt: `After the first head insertion, which value is at the front of the reversed range?`,
        options: [String(movedNode.value), String(order[left + 1]?.value ?? movedNode.value), String(order[right]?.value ?? movedNode.value)],
        correctIndex: 0,
        explanation: `The first node after the range head is moved to the front, so ${movedNode.value} becomes the range's new head.`,
      } : undefined,
    ));
  }
  steps.push(problemSnapshot(
    order,
    'Sublist reversed',
    `Positions ${toPosition(left)}–${toPosition(right)} are reversed. The prefix and suffix remain unchanged.`,
    7,
    { head: 0, tail: order.length - 1 },
    [left, right],
    'success',
  ));
  return steps;
}

export function generateReverseSublistSteps(currentNodes: ListNodeItem[], left: number, right: number): LinkedListStep[] {
  // The learner-facing positions are 1-based; convert to array indexes.
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right < left) return [];
  return generateReverseRangeSteps(currentNodes, left - 1, right - 1, 'Reverse the selected sublist');
}

export function generateReverseHalfSteps(
  currentNodes: ListNodeItem[],
  half: 'first' | 'second'
): LinkedListStep[] {
  if (currentNodes.length < 2) return [];
  // For odd lengths, the middle node belongs to the first half.
  const firstHalfLength = Math.ceil(currentNodes.length / 2);
  const left = half === 'first' ? 0 : firstHalfLength;
  const right = half === 'first' ? firstHalfLength - 1 : currentNodes.length - 1;
  if (right < left) return [];
  return generateReverseRangeSteps(currentNodes, left, right, `Reverse the ${half} half`, '0-based');
}

/** Reverse the suffix starting at the middle; even-length lists use the upper middle node. */
export function generateReverseFromMiddleSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
  if (currentNodes.length < 2) return [];
  const middleIndex = Math.floor(currentNodes.length / 2);
  return generateReverseRangeSteps(
    currentNodes,
    middleIndex,
    currentNodes.length - 1,
    'Reverse the suffix starting at the middle node',
    '0-based',
  );
}

/** Check a singly linked list by reversing the second half, comparing, then restoring it. */
export function generatePalindromeListSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
  if (currentNodes.length === 0) return [];
  const original = cloneNodes(currentNodes);
  const count = original.length;
  if (count === 1) {
    return [problemSnapshot(original, 'Single node is a palindrome', 'A list with one node reads the same from both directions. No links need to change.', 1, { head: 0 }, [0], 'success')];
  }

  const secondHalfStart = Math.ceil(count / 2);
  const steps: LinkedListStep[] = [problemSnapshot(
    original,
    'Find the midpoint',
    `Use slow and fast pointers to find the midpoint. The second half starts at index ${secondHalfStart}; an odd-length list keeps its center node in the first half.`,
    1,
    { slow: Math.floor((count - 1) / 2), fast: count - 1 },
    [Math.floor((count - 1) / 2), count - 1],
  )];

  const reversedSteps = generateReverseRangeSteps(
    original,
    secondHalfStart,
    count - 1,
    'Reverse the second half for comparison',
    '0-based',
  );
  steps.push(...reversedSteps.slice(1));
  const reversed = reversedSteps[reversedSteps.length - 1]?.nodes ?? original;
  let isPalindrome = true;

  for (let index = 0; index < Math.floor(count / 2); index += 1) {
    const leftValue = original[index].value;
    const rightValue = original[count - 1 - index].value;
    const matches = leftValue === rightValue;
    steps.push(problemSnapshot(
      reversed,
      `Compare ${leftValue} with ${rightValue}`,
      matches
        ? `The outer pair matches (${leftValue} = ${rightValue}). Continue inward.`
        : `The pair differs (${leftValue} ≠ ${rightValue}), so this list is not a palindrome.`,
      7,
      { left: index, right: secondHalfStart + index },
      [index, secondHalfStart + index],
      matches ? 'comparing' : 'danger',
      index === 0,
      index === 0 ? {
        prompt: `Do the outer values ${leftValue} and ${rightValue} match?`,
        options: ['Yes, they match', 'No, they differ'],
        correctIndex: matches ? 0 : 1,
        explanation: 'A linked-list palindrome must match each symmetric pair from the ends toward the center.',
      } : undefined,
    ));
    if (!matches) {
      isPalindrome = false;
      break;
    }
  }

  const restoreSteps = generateReverseRangeSteps(
    reversed,
    secondHalfStart,
    count - 1,
    'Restore the original second half',
    '0-based',
  );
  steps.push(...restoreSteps.slice(1));

  steps.push(problemSnapshot(
    original,
    isPalindrome ? 'Palindrome confirmed; input restored' : 'Not a palindrome; input restored',
    isPalindrome
      ? 'Every symmetric pair matched, and the original links are back in place.'
      : 'A mismatch proves the list is not a palindrome. The original links are back in place.',
    10,
    { head: 0, tail: count - 1 },
    [0, count - 1],
    isPalindrome ? 'success' : 'danger',
  ));
  return steps;
}

export function generateReverseKGroupSteps(currentNodes: ListNodeItem[], groupSize: number): LinkedListStep[] {
  if (!currentNodes.length || !Number.isInteger(groupSize) || groupSize < 1 || groupSize > currentNodes.length) return [];
  let order = cloneNodes(currentNodes);
  const steps: LinkedListStep[] = [problemSnapshot(
    order,
    'Set group size',
    `Reverse each complete group of ${groupSize}. Any final group with fewer than ${groupSize} nodes stays in its original order.`,
    1,
    { head: 0 },
    [0],
  )];
  for (let start = 0; start + groupSize <= order.length; start += groupSize) {
    const group = order.slice(start, start + groupSize);
    for (let offset = 1; offset < groupSize; offset += 1) {
      steps.push(problemSnapshot(
        order,
        `Reverse group ${Math.floor(start / groupSize) + 1}`,
        `The current group spans indexes ${start}–${start + groupSize - 1}. Preserve the next pointer before redirecting a link so no node is lost.`,
        3,
        { group_head: start, current: start + offset, previous: start + offset - 1 },
        [start + offset, start + offset - 1],
      ));
    }
    order = [...order.slice(0, start), ...group.reverse(), ...order.slice(start + groupSize)];
    steps.push(problemSnapshot(
      order,
      `Group ${Math.floor(start / groupSize) + 1} complete`,
      `The ${groupSize}-node group is now reversed. Continue at the first node after this group.`,
      6,
      { group_head: start, group_tail: start + groupSize - 1 },
      [start, start + groupSize - 1],
      'success',
      true,
      {
        prompt: `What happens to a trailing group smaller than k = ${groupSize}?`,
        options: ['It stays in its original order', 'It is reversed anyway', 'It is deleted'],
        correctIndex: 0,
        explanation: 'The standard reverse-in-k-groups operation only reverses complete groups.',
      },
    ));
  }
  steps.push(problemSnapshot(order, 'All complete groups processed', 'Every complete group has been reversed; the final incomplete suffix was left untouched.', 8, { head: 0, tail: order.length - 1 }, [0, order.length - 1], 'success'));
  return steps;
}

export function generateSwapPairsSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
  if (currentNodes.length < 2) return [];
  let order = cloneNodes(currentNodes);
  const steps: LinkedListStep[] = [problemSnapshot(order, 'Inspect first pair', 'Swap adjacent nodes by changing links, not by exchanging the values stored in the nodes.', 1, { first: 0, second: 1 }, [0, 1])];
  for (let left = 0; left + 1 < order.length; left += 2) {
    const first = order[left];
    const second = order[left + 1];
    steps.push(problemSnapshot(order, `Swap ${first.value} and ${second.value}`, `Save the pair's successor, point the second node to the first, then reconnect the previous pair (if any) to the second node.`, 3, { first: left, second: left + 1, previous_pair_tail: left > 0 ? left - 1 : null }, [left, left + 1]));
    order = [...order.slice(0, left), second, first, ...order.slice(left + 2)];
    steps.push(problemSnapshot(order, 'Pair links updated', `The pair is now ${second.value} → ${first.value}; all node values are unchanged.`, 6, { pair_head: left, pair_tail: left + 1 }, [left, left + 1], 'success'));
  }
  steps.push(problemSnapshot(order, 'Pairwise swap complete', 'Each complete adjacent pair has been swapped. A final unpaired node remains in place.', 8, { head: 0, tail: order.length - 1 }, [0, order.length - 1], 'success'));
  return steps;
}

// ─── INTERVIEW PROBLEMS: SORT / DELETE / SPLIT ──────────────────────────────────

export function generateMergeSortSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
  if (currentNodes.length < 2 || currentNodes.some((node) => !Number.isFinite(Number(node.value)))) return [];
  let order = cloneNodes(currentNodes);
  const steps: LinkedListStep[] = [problemSnapshot(order, 'Begin bottom-up merge sort', 'Merge sort repeatedly combines adjacent sorted runs. It is stable, runs in O(n log n), and uses O(n) auxiliary storage in this bottom-up visualization.', 1, { head: 0, width: null }, [0])];
  for (let width = 1; width < order.length; width *= 2) {
    let passOrder = [...order];
    for (let start = 0; start < passOrder.length; start += width * 2) {
      const leftRun = passOrder.slice(start, Math.min(start + width, passOrder.length));
      const rightRun = passOrder.slice(start + width, Math.min(start + width * 2, passOrder.length));
      if (!rightRun.length) continue;
      const merged: ListNodeItem[] = [];
      let i = 0;
      let j = 0;
      while (i < leftRun.length && j < rightRun.length) {
        const leftIndex = passOrder.findIndex((node) => node.id === leftRun[i].id);
        const rightIndex = passOrder.findIndex((node) => node.id === rightRun[j].id);
        const leftValue = Number(leftRun[i].value);
        const rightValue = Number(rightRun[j].value);
        steps.push(problemSnapshot(
          passOrder,
          `Compare run heads (width ${width})`,
          `${leftValue} and ${rightValue} are the current heads of two sorted runs. Take the smaller value; on a tie, take the left node to keep the sort stable.`,
          4,
          { left: leftIndex, right: rightIndex, run_width: null },
          [leftIndex, rightIndex],
          'comparing',
          steps.length === 1,
          steps.length === 1 ? {
            prompt: 'When two run-head values are equal, which node should stable merge sort take first?',
            options: ['The node from the left run', 'The node from the right run', 'Either node, stability is unaffected'],
            correctIndex: 0,
            explanation: 'Taking the left run on equality preserves the original relative order of equal values.',
          } : undefined,
        ));
        if (leftValue <= rightValue) merged.push(leftRun[i++]);
        else merged.push(rightRun[j++]);
      }
      merged.push(...leftRun.slice(i), ...rightRun.slice(j));
      passOrder = [...passOrder.slice(0, start), ...merged, ...passOrder.slice(start + leftRun.length + rightRun.length)];
      steps.push(problemSnapshot(passOrder, `Merge runs of width ${width}`, `Merged the adjacent runs into one sorted run: ${merged.map((node) => node.value).join(' → ')}.`, 7, { merged_head: start, merged_tail: start + merged.length - 1 }, [start, start + merged.length - 1], 'success'));
    }
    order = passOrder;
  }
  steps.push(problemSnapshot(order, 'List sorted', 'The final run contains every node in ascending order. The node links, not just the displayed values, have been reordered.', 10, { head: 0, tail: order.length - 1 }, [0, order.length - 1], 'success'));
  return steps;
}

export function generateRemoveNthFromEndSteps(currentNodes: ListNodeItem[], n: number): LinkedListStep[] {
  if (!currentNodes.length || !Number.isInteger(n) || n < 1 || n > currentNodes.length) return [];
  const nodes = cloneNodes(currentNodes);
  const steps: LinkedListStep[] = [problemSnapshot(nodes, 'Create a gap of n nodes', `Advance fast by n = ${n} links. Then move fast and slow together; slow will stop immediately before the target.`, 1, { fast: Math.min(n - 1, nodes.length - 1), slow: null }, [Math.min(n - 1, nodes.length - 1)])];
  for (let fast = n; fast < nodes.length; fast += 1) {
    const slow = fast - n;
    steps.push(problemSnapshot(nodes, 'Move both pointers', `Fast is at ${nodes[fast].value}; slow is at ${nodes[slow]?.value ?? 'the dummy node'}. Their n-node gap stays constant.`, 4, { fast, slow: slow >= 0 ? slow : null }, [fast, ...(slow >= 0 ? [slow] : [])]));
  }
  const targetIndex = nodes.length - n;
  const target = nodes[targetIndex];
  steps.push(problemSnapshot(nodes, 'Identify target from the end', `Fast has reached the tail. The node ${n} from the end is ${target.value} at zero-based index ${targetIndex}.`, 6, { slow: targetIndex - 1 >= 0 ? targetIndex - 1 : null, target: targetIndex }, [targetIndex], 'danger'));
  const result = nodes.filter((_, index) => index !== targetIndex);
  steps.push(problemSnapshot(result, 'Remove target and reconnect', `${target.value} is removed; its predecessor now links directly to its successor. The dummy-node setup also handles removing the original head.`, 8, { head: 0, tail: result.length - 1 }, result.map((_, index) => index), 'success'));
  return steps;
}

export function generateSplitHalvesSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
  if (!currentNodes.length) return [];
  const nodes = cloneNodes(currentNodes);
  const splitAt = Math.ceil(nodes.length / 2);
  const first = nodes.slice(0, splitAt);
  const second = nodes.slice(splitAt);
  if (first.length) first[first.length - 1].nextId = null;
  const lanes: LinkedListLane[] = [
    { label: `First half · ${first.length} node${first.length === 1 ? '' : 's'}`, nodes: first },
    { label: `Second half · ${second.length} node${second.length === 1 ? '' : 's'}`, nodes: second },
  ];
  const flatNodes = [...first, ...second].map((node) => ({ ...node }));
  return [{
    ...problemSnapshot(nodes, 'Find the split point', `Split after index ${splitAt - 1}. For an odd-length list, the first half gets the extra middle node.`, 3, { first_half_tail: splitAt - 1, second_half_head: second.length ? splitAt : null }, [splitAt - 1, ...(second.length ? [splitAt] : [])], 'success'),
    nodes: flatNodes,
    lanes: lanes.map((lane) => ({ ...lane, nodes: cloneNodes(lane.nodes) })),
    phase: 'Two lists produced',
    explanation: `The original chain is split into two independent lists with lengths ${first.length} and ${second.length}. ${second.length === 0 ? 'There is no second-half node.' : ''}`,
    isQuizPoint: true,
    quizData: {
      prompt: 'How is an odd-length list divided here?',
      options: ['The first half receives the middle node', 'The second half receives the middle node', 'The middle node is discarded'],
      correctIndex: 0,
      explanation: 'This visualizer uses ceil(n/2) nodes in the first half, so it receives the middle node when n is odd.',
    },
  }];
}

export function generateSplitKPartsSteps(currentNodes: ListNodeItem[], partCount: number): LinkedListStep[] {
  if (!Number.isInteger(partCount) || partCount < 1 || partCount > 12 || !currentNodes.length) return [];
  const original = cloneNodes(currentNodes);
  const sizes = Array.from({ length: partCount }, (_, index) =>
    Math.floor(original.length / partCount) + (index < original.length % partCount ? 1 : 0)
  );
  const steps: LinkedListStep[] = [makeLaneStep(
    [{ label: `Input list · ${original.length} nodes`, nodes: original }],
    'Plan balanced parts',
    `Create ${partCount} consecutive parts. Each gets floor(n/k) = ${Math.floor(original.length / partCount)} node(s), and the first ${original.length % partCount} part(s) get one extra node.`,
    1,
  )];
  const parts: ListNodeItem[][] = [];
  let cursor = 0;
  for (let index = 0; index < partCount; index += 1) {
    const size = sizes[index];
    const part = original.slice(cursor, cursor + size);
    const remainder = original.slice(cursor + size);
    if (part.length) part[part.length - 1].nextId = null;
    parts.push(part);
    cursor += size;
    const lanes: LinkedListLane[] = [
      ...parts.map((nodes, partIndex) => ({
        label: `Part ${partIndex + 1} · ${nodes.length} node${nodes.length === 1 ? '' : 's'}`,
        nodes,
      })),
      ...Array.from({ length: partCount - parts.length }, (_, emptyIndex) => ({
        label: `Part ${parts.length + emptyIndex + 1} · pending`,
        nodes: [] as ListNodeItem[],
      })),
      { label: `Unassigned remainder · ${remainder.length} node${remainder.length === 1 ? '' : 's'}`, nodes: remainder },
    ];
    steps.push(makeLaneStep(
      lanes,
      `Part ${index + 1} separated`,
      size === 0
        ? `No nodes remain for Part ${index + 1}; it is an empty list. Empty parts are allowed when k exceeds the input length.`
        : `Cut after ${size} node${size === 1 ? '' : 's'} for Part ${index + 1}. The remaining suffix begins at ${remainder[0]?.value ?? 'NULL'}.`,
      4,
      { part_head: part[0]?.id ?? null, part_tail: part[part.length - 1]?.id ?? null, remainder_head: remainder[0]?.id ?? null },
      [part[0]?.id, part[part.length - 1]?.id, remainder[0]?.id].filter((id): id is string => Boolean(id)),
    ));
  }
  const final = steps[steps.length - 1];
  final.lanes = parts.map((nodes, index) => ({
    label: `Part ${index + 1} · ${nodes.length} node${nodes.length === 1 ? '' : 's'}`,
    nodes: cloneNodes(nodes),
  }));
  final.nodes = final.lanes.flatMap((lane) => lane.nodes.map((node) => ({ ...node })));
  final.phase = 'K parts created';
  final.explanation = `The list is split into ${partCount} independent parts with sizes ${sizes.join(', ')}. Part sizes differ by at most one, and earlier parts receive the extra nodes.`;
  final.pointers = {};
  final.isQuizPoint = true;
  final.quizData = {
    prompt: `For n=${original.length} and k=${partCount}, how are the extra nodes distributed?`,
    options: ['One extra node goes to each of the earliest n mod k parts', 'All extra nodes go to the last part', 'Extra nodes are discarded'],
    correctIndex: 0,
    explanation: 'Balanced splitting gives every part floor(n/k) nodes, then distributes the remainder one per earliest part.',
  };
  return steps;
}

// ─── INTERVIEW PROBLEMS: MULTI-LIST DIGIT ADDITION / MERGE K ────────────────────

function createValueNodes(values: (number | string)[], prefix: string): ListNodeItem[] {
  return values.map((value, index) => ({
    id: `${prefix}-${index}`,
    value,
    nextId: index < values.length - 1 ? `${prefix}-${index + 1}` : null,
    prevId: null,
    status: 'default',
    pointerLabels: index === 0 ? ['HEAD'] : [],
  }));
}

function makeLaneStep(
  lanes: LinkedListLane[],
  phase: string,
  explanation: string,
  codeLine: number,
  pointers: Record<string, string | null> = {},
  highlightedIds: string[] = [],
  isQuizPoint = false,
  quizData?: LinkedListQuizData,
  highlightStatus: ListNodeItem['status'] = 'active'
): LinkedListStep {
  const copiedLanes = lanes.map((lane) => ({ label: lane.label, kind: lane.kind, nodes: cloneNodes(lane.nodes) }));
  highlightedIds.forEach((id) => {
    for (const lane of copiedLanes) {
      const node = lane.nodes.find((candidate) => candidate.id === id);
      if (node) node.status = highlightStatus;
    }
  });
  for (const [label, id] of Object.entries(pointers)) {
    if (!id) continue;
    const node = copiedLanes.flatMap((lane) => lane.nodes).find((candidate) => candidate.id === id);
    if (node && !node.pointerLabels?.includes(label.toUpperCase())) node.pointerLabels = [...(node.pointerLabels ?? []), label.toUpperCase()];
  }
  const nodes = copiedLanes.flatMap((lane) => lane.nodes.map((node) => ({ ...node })));
  const firstNonEmpty = copiedLanes.find((lane) => lane.nodes.length)?.nodes ?? [];
  const lastNonEmpty = [...copiedLanes].reverse().find((lane) => lane.nodes.length)?.nodes ?? [];
  return {
    nodes,
    lanes: copiedLanes,
    headId: firstNonEmpty[0]?.id ?? null,
    tailId: lastNonEmpty[lastNonEmpty.length - 1]?.id ?? null,
    pointers,
    phase,
    explanation,
    codeLine,
    highlightedNodeIds: highlightedIds,
    listType: 'singly',
    isQuizPoint,
    quizData,
  };
}

export function generateAddTwoNumbersSteps(
  firstDigits: number[],
  secondDigits: number[]
): LinkedListStep[] {
  const validDigits = (digits: number[]) => digits.length > 0 && digits.every((digit) => Number.isInteger(digit) && digit >= 0 && digit <= 9);
  if (!validDigits(firstDigits) || !validDigits(secondDigits)) return [];
  const first = createValueNodes(firstDigits, 'add-a');
  const second = createValueNodes(secondDigits, 'add-b');
  const result: ListNodeItem[] = [];
  const steps: LinkedListStep[] = [];
  let carry = 0;
  let index = 0;
  while (index < first.length || index < second.length || carry > 0) {
    const a = Number(first[index]?.value ?? 0);
    const b = Number(second[index]?.value ?? 0);
    const sum = a + b + carry;
    const digit = sum % 10;
    const nextCarry = Math.floor(sum / 10);
    const resultNode = createValueNodes([digit], `add-result-${index}`)[0];
    resultNode.id = `add-result-${index}`;
    if (result.length) result[result.length - 1].nextId = resultNode.id;
    result.push(resultNode);
    const lanes = [
      { label: 'Number A · least-significant digit first', nodes: first },
      { label: 'Number B · least-significant digit first', nodes: second },
      { label: `Sum · carry ${nextCarry}`, nodes: result },
    ];
    steps.push(makeLaneStep(
      lanes,
      `Add digit ${index + 1}`,
      `${a} + ${b} + carry ${carry} = ${sum}. Write ${digit} in the result and carry ${nextCarry} to the next position.`,
      4,
      { digit_a: first[index]?.id ?? null, digit_b: second[index]?.id ?? null, result: resultNode.id },
      [first[index]?.id, second[index]?.id, resultNode.id].filter((id): id is string => Boolean(id)),
      index === 0,
      index === 0 ? {
        prompt: `For ${a} + ${b} + carry ${carry} = ${sum}, what digit is written at this position?`,
        options: [String(digit), String(nextCarry), String(sum)],
        correctIndex: 0,
        explanation: 'Write sum modulo 10 at the current digit; carry floor(sum / 10) to the next digit.',
      } : undefined,
    ));
    carry = nextCarry;
    index += 1;
  }
  if (steps.length) {
    const last = steps[steps.length - 1];
    last.phase = 'Addition complete';
    last.explanation += ` Result digits are stored in reverse order: ${result.map((node) => node.value).join(' → ')}.`;
  }
  return steps;
}

export function generateMergeKSortedSteps(sortedLists: number[][]): LinkedListStep[] {
  if (sortedLists.length < 2 || sortedLists.some((list) => list.some((value, index) => !Number.isFinite(value) || (index > 0 && list[index - 1] > value)))) return [];
  const sourceNodes = sortedLists.map((list, index) => createValueNodes(list, `merge-list-${index + 1}`));
  const positions = sortedLists.map(() => 0);
  const output: ListNodeItem[] = [];
  const lanesFor = () => [
    ...sourceNodes.map((nodes, index) => ({
      label: `List ${index + 1} · sorted input`,
      nodes: nodes.map((node, nodeIndex) => ({
        ...node,
        status: nodeIndex < positions[index] ? 'success' as const : nodeIndex === positions[index] ? 'active' as const : 'default' as const,
        pointerLabels: [
          ...(nodeIndex === 0 ? ['HEAD'] : []),
          ...(nodeIndex === positions[index] ? ['CURRENT'] : []),
        ],
      })),
    })),
    { label: `Merged output · ${output.length} node${output.length === 1 ? '' : 's'}`, nodes: output },
  ];
  const steps: LinkedListStep[] = [makeLaneStep(
    lanesFor(),
    'Compare current list heads',
    'At each step, select the smallest unconsumed head among the k sorted lists. Advance only the source list that supplied it.',
    1,
    {},
    [],
    true,
    {
      prompt: 'Which input list advances after one node is appended to the merged output?',
      options: ['The list that supplied the smallest current head', 'Every list advances once', 'The longest list always advances'],
      correctIndex: 0,
      explanation: 'A k-way merge consumes exactly one node: the smallest available head.',
    },
  )];
  let outputIndex = 0;
  while (positions.some((position, index) => position < sourceNodes[index].length)) {
    let selected = -1;
    for (let index = 0; index < sourceNodes.length; index += 1) {
      if (positions[index] >= sourceNodes[index].length) continue;
      if (selected < 0 || Number(sourceNodes[index][positions[index]].value) < Number(sourceNodes[selected][positions[selected]].value)) selected = index;
    }
    const picked = sourceNodes[selected][positions[selected]];
    positions[selected] += 1;
    const outNode = { ...picked, id: `merge-output-${outputIndex++}`, nextId: null, prevId: null, status: 'success' as const, pointerLabels: output.length === 0 ? ['HEAD'] : [] };
    if (output.length) output[output.length - 1].nextId = outNode.id;
    output.push(outNode);
    steps.push(makeLaneStep(
      lanesFor(),
      `Take ${picked.value} from List ${selected + 1}`,
      `Among the remaining heads, ${picked.value} is smallest. Append it to the output and advance List ${selected + 1} by one node.`,
      5,
      { selected_head: picked.id, output_tail: outNode.id },
      [picked.id, outNode.id],
    ));
  }
  const final = steps[steps.length - 1];
  final.phase = 'K-way merge complete';
  final.explanation = `All ${sortedLists.length} sorted input lists have been merged in ascending order: ${output.map((node) => node.value).join(' → ')}.`;
  return steps;
}

export type LRUOperation =
  | { type: 'get'; key: string }
  | { type: 'put'; key: string; value: string };

export function generateLRUCacheSteps(operations: LRUOperation[], capacity: number): LinkedListStep[] {
  if (!operations.length || !Number.isInteger(capacity) || capacity < 1 || capacity > 20) return [];
  if (operations.some((operation) => !operation.key.trim() || (operation.type === 'put' && !operation.value.trim()))) return [];

  let recency: ListNodeItem[] = [];
  const keyToNode = new Map<string, ListNodeItem>();
  const nodeValues = new Map<string, string>();
  const keyForNode = (nodeId: string) => [...keyToNode.entries()].find(([, node]) => node.id === nodeId)?.[0];
  let nextNodeId = 0;
  const steps: LinkedListStep[] = [];
  const lanesFor = (highlightKey?: string, status: ListNodeItem['status'] = 'active'): LinkedListLane[] => {
    const cacheNodes = recency.map((node, index) => ({
      ...node,
      nextId: recency[index + 1]?.id ?? null,
      prevId: recency[index - 1]?.id ?? null,
      status: node.id === keyToNode.get(highlightKey ?? '')?.id ? status : index === 0 ? 'active' as const : index === recency.length - 1 ? 'warning' as const : 'default' as const,
      pointerLabels: [
        ...(index === 0 ? ['MRU'] : []),
        ...(index === recency.length - 1 ? ['LRU'] : []),
        ...(highlightKey !== undefined && node.id === keyToNode.get(highlightKey)?.id ? ['ACCESSED'] : []),
      ],
    }));
    const mapNodes = Array.from(keyToNode.entries()).map(([key, node], index) => ({
      id: `lru-map-entry-${index}`,
      value: `${key} → ${node.id}`,
      nextId: null,
      status: key === highlightKey ? status : 'default' as const,
      pointerLabels: key === highlightKey ? ['LOOKUP'] : [],
    }));
    return [
      { label: `Hash map · key → node (${mapNodes.length} entries)`, nodes: mapNodes, kind: 'map' },
      { label: `Doubly linked list · MRU → LRU · capacity ${capacity}`, nodes: cacheNodes, kind: 'doublyList' },
    ];
  };
  const addStep = (
    phase: string,
    explanation: string,
    key?: string,
    highlightIds: string[] = [],
    status: ListNodeItem['status'] = 'active',
    quizData?: LinkedListQuizData,
  ) => {
    const step = makeLaneStep(
      lanesFor(key, status),
      phase,
      explanation,
      phase.includes('Evict') ? 7 : phase.includes('Move') ? 9 : phase.includes('Hit') || phase.includes('Miss') ? 4 : 5,
      { lookup: keyToNode.get(key ?? '')?.id ?? null, mru: recency[0]?.id ?? null, lru: recency[recency.length - 1]?.id ?? null },
      highlightIds,
      Boolean(quizData),
      quizData,
      status,
    );
    step.listType = 'doubly';
    steps.push(step);
  };

  addStep('Initialize LRU cache', `Start with an empty key-to-node map and an empty doubly linked list. Capacity is ${capacity}.`);
  operations.forEach((operation, operationIndex) => {
    const prefix = `Operation ${operationIndex + 1}: ${operation.type.toUpperCase()}(${operation.key}${operation.type === 'put' ? `, ${operation.value}` : ''})`;
    if (operation.type === 'get') {
      const node = keyToNode.get(operation.key);
      if (!node) {
        addStep(`${prefix} · Cache Miss`, `Key ${operation.key} is absent from the hash map. Return -1; recency order does not change.`, operation.key, [], 'danger', {
          prompt: `What happens to the recency list after GET(${operation.key}) misses?`,
          options: ['It stays unchanged', 'The LRU node moves to the head', 'A new node is inserted'],
          correctIndex: 0,
          explanation: 'A miss does not access a cached node, so it does not change recency.',
        });
        return;
      }
      addStep(`${prefix} · Cache Hit`, `Key ${operation.key} resolves to node ${node.id}; return value ${nodeValues.get(operation.key) ?? ''}. A hit marks the node as most recently used.`, operation.key, [node.id], 'success', {
        prompt: `On a cache hit, where does the accessed node move?`,
        options: ['To the MRU head', 'To the LRU tail', 'It stays where it is'],
        correctIndex: 0,
        explanation: 'Successful access makes the node most recently used, so it moves to the list head.',
      });
      const index = recency.findIndex((candidate) => candidate.id === node.id);
      if (index > 0) {
        recency.splice(index, 1);
        recency.unshift(node);
        addStep(`${prefix} · Move to MRU`, `Detach ${node.id} from its current position and reconnect its neighbors; then link it before the current MRU node.`, operation.key, [node.id], 'success');
      }
      return;
    }

    const existing = keyToNode.get(operation.key);
    if (existing) {
      existing.value = `${operation.key}: ${operation.value}`;
      nodeValues.set(operation.key, operation.value);
      const index = recency.findIndex((candidate) => candidate.id === existing.id);
      if (index > 0) {
        recency.splice(index, 1);
        recency.unshift(existing);
      }
      addStep(`${prefix} · Update existing key`, `Key ${operation.key} already exists. Update its value and make its node the MRU head.`, operation.key, [existing.id], 'success');
      return;
    }

    if (recency.length === capacity) {
      const victim = recency[recency.length - 1];
      const victimKey = keyForNode(victim.id) ?? '';
      addStep(`${prefix} · Evict LRU`, `The cache is full. Remove least-recently-used key ${victimKey} at the tail before inserting the new key.`, victimKey, [victim.id], 'danger');
      recency.pop();
      keyToNode.delete(victimKey);
      nodeValues.delete(victimKey);
      addStep(`${prefix} · LRU removed`, `Delete key ${victimKey} from the hash map and unlink its node from the doubly linked-list tail.`, victimKey, [victim.id], 'danger');
    }
    const node: ListNodeItem = {
      id: `lru-node-${nextNodeId++}`,
      value: `${operation.key}: ${operation.value}`,
      nextId: null,
      prevId: null,
      status: 'new',
      pointerLabels: ['NEW'],
    };
    recency.unshift(node);
    keyToNode.set(operation.key, node);
    nodeValues.set(operation.key, operation.value);
    addStep(`${prefix} · Insert at MRU`, `Create node ${node.id}, add key ${operation.key} to the map, and link the new node at the MRU head.`, operation.key, [node.id], 'success');
  });
  addStep('LRU sequence complete', `All operations finished. Recency is ${recency.length ? recency.map((node) => keyForNode(node.id) ?? node.id).join(' → ') : 'empty'} from MRU to LRU.`, undefined, recency.map((node) => node.id), 'success');
  return steps;
}
