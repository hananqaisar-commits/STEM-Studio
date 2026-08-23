export type LinkedListCategory =
  | 'singly'
  | 'doubly'
  | 'circular'
  | 'reverse'
  | 'detectCycle'
  | 'middleNode'
  | 'removeNthFromEnd'
  | 'palindrome'
  | 'mergeSorted'
  | 'intersection'
  | 'flatten'
  | 'lruCache';

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
  listType: 'singly' | 'doubly' | 'circular';
  auxiliaryData?: Record<string, any>;
  isQuizPoint?: boolean;
  quizData?: LinkedListQuizData;
}

// ─── HELPER TO CREATE INITIAL LIST NODES ──────────────────────────────────────────

export function createInitialNodes(
  values: (number | string)[],
  type: 'singly' | 'doubly' | 'circular' = 'singly',
  cycleTargetIndex: number = -1
): ListNodeItem[] {
  if (values.length === 0) return [];

  const nodes: ListNodeItem[] = values.map((val, idx) => ({
    id: `node-${idx}`,
    value: val,
    nextId: idx < values.length - 1 ? `node-${idx + 1}` : null,
    prevId: type === 'doubly' && idx > 0 ? `node-${idx - 1}` : null,
    status: 'default',
    pointerLabels: [],
  }));

  if (type === 'doubly' && nodes.length > 0) {
    nodes[0].prevId = null;
  }

  if (type === 'circular' && nodes.length > 0) {
    nodes[nodes.length - 1].nextId = nodes[0].id;
    if (type === 'doubly') {
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
  newValue: number | string
): LinkedListStep[] {
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);
  const oldHeadId = nodes.length > 0 ? nodes[0].id : null;
  const newId = `node-${Date.now() % 10000}`;

  // Step 1: Allocate new node
  const newNode: ListNodeItem = {
    id: newId,
    value: newValue,
    nextId: null,
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
    explanation: `Created new Node(${newValue}) in memory with next pointer pointing to NULL.`,
    codeLine: 2,
    highlightedNodeIds: [newId],
    listType: 'singly',
    isQuizPoint: true,
    quizData: {
      prompt: `Where should newNode.next point to insert ${newValue} at the head?`,
      options: ['To NULL', 'To current HEAD node', 'To TAIL node', 'To itself'],
      correctIndex: 1,
      explanation: 'In a singly linked list head insertion, newNode.next must point to the current head to maintain the chain.',
    },
  });

  // Step 2: Link newNode.next = head
  const step2Nodes = cloneNodes(step1Nodes);
  step2Nodes[0].nextId = oldHeadId;
  step2Nodes[0].status = 'active';
  assignPointerLabels(step2Nodes, { head: oldHeadId, new: newId });

  steps.push({
    nodes: step2Nodes,
    headId: oldHeadId,
    tailId: nodes.length > 0 ? nodes[nodes.length - 1].id : newId,
    pointers: { head: oldHeadId, new_node: newId },
    phase: 'Connect Pointer',
    explanation: `Set newNode.next = head (connecting ${newValue} to ${oldHeadId ? nodes[0].value : 'NULL'}).`,
    codeLine: 3,
    highlightedNodeIds: [newId],
    newConnections: oldHeadId ? [{ fromId: newId, toId: oldHeadId, type: 'next' }] : [],
    listType: 'singly',
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
    listType: 'singly',
  });

  return steps;
}

// ─── 2. SINGLY LINKED LIST: INSERT AT TAIL ────────────────────────────────────────

export function generateInsertTailSteps(
  currentNodes: ListNodeItem[],
  newValue: number | string
): LinkedListStep[] {
  if (currentNodes.length === 0) {
    return generateInsertHeadSteps(currentNodes, newValue);
  }

  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);
  const newId = `node-${Date.now() % 10000}`;
  const headId = nodes[0].id;
  const tailId = nodes[nodes.length - 1].id;

  // Step 1: Initial list state
  assignPointerLabels(nodes, { head: headId, tail: tailId });
  steps.push({
    nodes: cloneNodes(nodes),
    headId,
    tailId,
    pointers: { head: headId, tail: tailId },
    phase: 'Locate Tail',
    explanation: `Locating the tail node of the list (value: ${nodes[nodes.length - 1].value}).`,
    codeLine: 1,
    highlightedNodeIds: [tailId],
    listType: 'singly',
  });

  // Step 2: Allocate new node
  const newNode: ListNodeItem = {
    id: newId,
    value: newValue,
    nextId: null,
    status: 'new',
    pointerLabels: ['NEW_NODE'],
  };
  const step2Nodes = [...nodes, newNode];
  assignPointerLabels(step2Nodes, { head: headId, tail: tailId, new: newId });

  steps.push({
    nodes: step2Nodes,
    headId,
    tailId,
    pointers: { head: headId, tail: tailId, new_node: newId },
    phase: 'Allocate Memory',
    explanation: `Allocated new Node(${newValue}) with next pointer = NULL.`,
    codeLine: 2,
    highlightedNodeIds: [newId],
    listType: 'singly',
  });

  // Step 3: Link tail.next = newNode
  const step3Nodes = cloneNodes(step2Nodes);
  step3Nodes[step3Nodes.length - 2].nextId = newId;
  step3Nodes[step3Nodes.length - 2].status = 'active';
  assignPointerLabels(step3Nodes, { head: headId, curr: tailId, new: newId });

  steps.push({
    nodes: step3Nodes,
    headId,
    tailId,
    pointers: { head: headId, curr: tailId, new_node: newId },
    phase: 'Link Tail Pointer',
    explanation: `Updated tail.next to point to newNode(${newValue}).`,
    codeLine: 3,
    highlightedNodeIds: [tailId, newId],
    newConnections: [{ fromId: tailId, toId: newId, type: 'next' }],
    listType: 'singly',
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
    listType: 'singly',
  });

  return steps;
}

// ─── 3. SINGLY LINKED LIST: DELETE AT HEAD ────────────────────────────────────────

export function generateDeleteHeadSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
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
    listType: 'singly',
    isQuizPoint: true,
    quizData: {
      prompt: `What is the time complexity to delete the head node in a Singly Linked List?`,
      options: ['O(1) Constant Time', 'O(N) Linear Time', 'O(log N)', 'O(N^2)'],
      correctIndex: 0,
      explanation: 'Deleting the head only requires advancing head = head.next, which takes O(1) constant time.',
    },
  });

  // Step 2: Detach head pointer
  const step2Nodes = cloneNodes(nodes);
  step2Nodes[0].nextId = null;
  step2Nodes[0].status = 'danger';
  if (step2Nodes.length > 1) {
    step2Nodes[1].status = 'active';
  }
  assignPointerLabels(step2Nodes, { old_head: oldHead.id, head: nextHeadId });

  steps.push({
    nodes: step2Nodes,
    headId: nextHeadId,
    tailId: nodes[nodes.length - 1].id,
    pointers: { old_head: oldHead.id, head: nextHeadId },
    phase: 'Advance Head Pointer',
    explanation: `Advanced head pointer: head = head.next (${nextHeadId ? nodes[1].value : 'NULL'}).`,
    codeLine: 2,
    highlightedNodeIds: nextHeadId ? [nextHeadId] : [],
    brokenConnections: nextHeadId ? [{ fromId: oldHead.id, toId: nextHeadId, type: 'next' }] : [],
    listType: 'singly',
  });

  // Step 3: Remove node from list
  const remainingNodes = nodes.slice(1);
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
    listType: 'singly',
  });

  return steps;
}

// ─── 4. REVERSE LINKED LIST (3-POINTER TECHNIQUE) ──────────────────────────────────

export function generateReverseSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
  if (currentNodes.length === 0) return [];
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);

  // Initial State: prev = null, curr = head
  let prevId: string | null = null;
  let currIndex = 0;

  assignPointerLabels(nodes, { head: nodes[0].id, curr: nodes[0].id, prev: null });
  steps.push({
    nodes: cloneNodes(nodes),
    headId: nodes[0].id,
    tailId: nodes[nodes.length - 1].id,
    pointers: { head: nodes[0].id, curr: nodes[0].id, prev: null },
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
    assignPointerLabels(workingNodes, { prev: prevId, curr: currId, next: nextId });
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

    assignPointerLabels(workingNodes, { prev: prevId, curr: nextId, next: null });
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
  cycleIndex: number = 2
): LinkedListStep[] {
  if (currentNodes.length < 3) return [];
  const steps: LinkedListStep[] = [];
  const nodes = cloneNodes(currentNodes);

  // Inject cycle link: tail.next = nodes[cycleIndex]
  const targetNode = nodes[cycleIndex];
  nodes[nodes.length - 1].nextId = targetNode.id;

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
    listType: 'circular',
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
        listType: 'circular',
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
        listType: 'circular',
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
      listType: 'circular',
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
        listType: 'circular',
      });
    }
  }

  return steps;
}

// ─── 6. FIND MIDDLE NODE (FAST & SLOW) ────────────────────────────────────────────

export function generateMiddleNodeSteps(currentNodes: ListNodeItem[]): LinkedListStep[] {
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
    explanation: 'Start slow and fast pointers at head. Fast moves 2x speed of slow.',
    codeLine: 2,
    highlightedNodeIds: [nodes[0].id],
    listType: 'singly',
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
      listType: 'singly',
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
    listType: 'singly',
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
  const newId = `node-${Date.now() % 10000}`;

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

  return steps;
}
