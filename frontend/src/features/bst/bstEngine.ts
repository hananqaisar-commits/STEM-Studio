import type { ElementState } from '../../engine/types/Step';

export interface BSTNodeData {
  id: string;
  value: number;
  leftId?: string;
  rightId?: string;
  x?: number;
  y?: number;
  state: ElementState;
}

export interface PredictionPoint {
  questionNodeId: string;
  currentNodeValue: number;
  targetValue: number;
  correctDirection: 'left' | 'right' | 'here' | 'found';
  explanation: string;
}

export interface BSTStep {
  nodes: BSTNodeData[];
  edges: { fromId: string; toId: string; state: ElementState }[];
  activeNodeId?: string;
  description: string;
  codeLine?: number;
  variables: Record<string, string | number | boolean | null>;
  predictionPoint?: PredictionPoint;
  traversalLog?: number[];
}

export interface BSTTreeStructure {
  value: number;
  id: string;
  left?: BSTTreeStructure;
  right?: BSTTreeStructure;
}

// Clone BST Tree helper
function cloneTree(root?: BSTTreeStructure): BSTTreeStructure | undefined {
  if (!root) return undefined;
  return {
    value: root.value,
    id: root.id,
    left: cloneTree(root.left),
    right: cloneTree(root.right),
  };
}

// Layout BST Tree to compute (x, y) coordinates
export function computeNodePositions(
  root?: BSTTreeStructure,
  startX = 50,
  startY = 40,
  level = 0,
  spread = 22
): { nodes: BSTNodeData[]; edges: { fromId: string; toId: string; state: ElementState }[] } {
  const nodes: BSTNodeData[] = [];
  const edges: { fromId: string; toId: string; state: ElementState }[] = [];

  if (!root) return { nodes, edges };

  function traverse(node: BSTTreeStructure, x: number, y: number, currentLevel: number, currentSpread: number) {
    nodes.push({
      id: node.id,
      value: node.value,
      leftId: node.left?.id,
      rightId: node.right?.id,
      x,
      y,
      state: 'default',
    });

    const nextY = y + 70;
    const nextSpread = Math.max(5, currentSpread * 0.55);

    if (node.left) {
      const leftX = Math.max(5, x - currentSpread);
      edges.push({ fromId: node.id, toId: node.left.id, state: 'default' });
      traverse(node.left, leftX, nextY, currentLevel + 1, nextSpread);
    }

    if (node.right) {
      const rightX = Math.min(95, x + currentSpread);
      edges.push({ fromId: node.id, toId: node.right.id, state: 'default' });
      traverse(node.right, rightX, nextY, currentLevel + 1, nextSpread);
    }
  }

  traverse(root, startX, startY, level, spread);
  return { nodes, edges };
}

// Helper to construct a step snapshot
function createStepSnapshot(
  treeRoot: BSTTreeStructure | undefined,
  activeId?: string,
  comparingIds: string[] = [],
  insertedId?: string,
  foundId?: string,
  description = '',
  codeLine = 1,
  variables: Record<string, string | number | boolean | null> = {},
  prediction?: PredictionPoint,
  traversalLog?: number[]
): BSTStep {
  const { nodes, edges } = computeNodePositions(treeRoot);

  const updatedNodes = nodes.map((node) => {
    let state: ElementState = 'default';
    if (node.id === foundId || node.id === insertedId) state = 'sorted';
    else if (node.id === activeId || comparingIds.includes(node.id)) state = 'comparing';
    return { ...node, state };
  });

  const updatedEdges = edges.map((edge) => {
    let state: ElementState = 'default';
    if (edge.fromId === activeId || edge.toId === activeId) state = 'comparing';
    return { ...edge, state };
  });

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
    activeNodeId: activeId,
    description,
    codeLine,
    variables,
    predictionPoint: prediction,
    traversalLog,
  };
}

// Generate Steps for BST Insertion
export function generateBSTInsertSteps(initialTree: BSTTreeStructure | undefined, newValue: number): { steps: BSTStep[]; newTree: BSTTreeStructure } {
  const steps: BSTStep[] = [];
  const tree = cloneTree(initialTree);

  // Initial step
  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Starting BST insertion for value ${newValue}`, 1, { newValue }));

  let newNodeId = `node_${Date.now()}_${newValue}`;

  if (!tree) {
    const rootNode: BSTTreeStructure = { value: newValue, id: newNodeId };
    steps.push(createStepSnapshot(rootNode, newNodeId, [], newNodeId, undefined, `Tree is empty. Inserted ${newValue} as root node.`, 2, { newValue, isRoot: true }));
    return { steps, newTree: rootNode };
  }

  let curr: BSTTreeStructure = tree;

  while (curr) {
    if (newValue === curr.value) {
      steps.push(createStepSnapshot(tree, curr.id, [curr.id], undefined, curr.id, `Value ${newValue} already exists in BST. Duplicates not inserted.`, 4, { newValue, nodeVal: curr.value }));
      return { steps, newTree: tree };
    }

    const direction = newValue < curr.value ? 'left' : 'right';
    const explanation = newValue < curr.value
      ? `Value ${newValue} is LESS than ${curr.value}, so it must go to the LEFT subtree.`
      : `Value ${newValue} is GREATER than ${curr.value}, so it must go to the RIGHT subtree.`;

    steps.push(createStepSnapshot(
      tree,
      curr.id,
      [curr.id],
      undefined,
      undefined,
      `Comparing ${newValue} with current node ${curr.value}. ${explanation}`,
      5,
      /* `direction` is deliberately not exposed here: BSTPage renders the
         variables panel next to the quiz panel (BSTPage.tsx:609), so a
         `direction: 'left'` entry would print the answer to the open
         prediction question. The reveal reads it from `predictionPoint`. */
      { newValue, currentNode: curr.value },
      {
        questionNodeId: curr.id,
        currentNodeValue: curr.value,
        targetValue: newValue,
        correctDirection: direction,
        explanation,
      }
    ));

    if (newValue < curr.value) {
      if (!curr.left) {
        curr.left = { value: newValue, id: newNodeId };
        steps.push(createStepSnapshot(tree, newNodeId, [], newNodeId, undefined, `Inserted new node ${newValue} to the LEFT of ${curr.value}.`, 7, { newValue, parent: curr.value, direction: 'left' }));
        break;
      }
      curr = curr.left;
    } else {
      if (!curr.right) {
        curr.right = { value: newValue, id: newNodeId };
        steps.push(createStepSnapshot(tree, newNodeId, [], newNodeId, undefined, `Inserted new node ${newValue} to the RIGHT of ${curr.value}.`, 9, { newValue, parent: curr.value, direction: 'right' }));
        break;
      }
      curr = curr.right;
    }
  }

  return { steps, newTree: tree };
}

// Generate Steps for BST Search
export function generateBSTSearchSteps(tree: BSTTreeStructure | undefined, targetValue: number): BSTStep[] {
  const steps: BSTStep[] = [];
  if (!tree) {
    steps.push(createStepSnapshot(undefined, undefined, [], undefined, undefined, `BST is empty. Target ${targetValue} not found.`, 1, { targetValue }));
    return steps;
  }

  let curr: BSTTreeStructure | undefined = tree;
  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Starting search for value ${targetValue}`, 1, { targetValue }));

  while (curr) {
    if (curr.value === targetValue) {
      steps.push(createStepSnapshot(tree, curr.id, [], undefined, curr.id, `Target ${targetValue} FOUND at node!`, 3, { targetValue, status: 'FOUND' }));
      return steps;
    }

    const direction = targetValue < curr.value ? 'left' : 'right';
    const explanation = targetValue < curr.value
      ? `Target ${targetValue} < ${curr.value}, searching LEFT subtree.`
      : `Target ${targetValue} > ${curr.value}, searching RIGHT subtree.`;

    const nextChild: BSTTreeStructure | undefined = targetValue < curr.value ? curr.left : curr.right;

    steps.push(createStepSnapshot(
      tree,
      curr.id,
      [curr.id],
      undefined,
      undefined,
      `Comparing target ${targetValue} with ${curr.value}. ${explanation}`,
      4,
      /* See the note on the insert step: `direction` would print the
         answer to the open prediction question. */
      { targetValue, currNode: curr.value },
      {
        questionNodeId: curr.id,
        currentNodeValue: curr.value,
        targetValue,
        correctDirection: direction,
        explanation,
      }
    ));

    curr = nextChild;
  }

  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Target ${targetValue} NOT found in BST.`, 10, { targetValue, status: 'NOT_FOUND' }));
  return steps;
}

// 1. Inorder Traversal (LNR: Left -> Node -> Right)
export function generateBSTInorderSteps(tree: BSTTreeStructure | undefined): BSTStep[] {
  const steps: BSTStep[] = [];
  const log: number[] = [];

  function inorder(node?: BSTTreeStructure) {
    if (!node) return;
    inorder(node.left);
    log.push(node.value);
    steps.push(createStepSnapshot(tree, node.id, [node.id], undefined, node.id, `Inorder Traversal: Visited node ${node.value} (Left-Node-Right)`, 5, { visited: node.value, order: 'Inorder (LNR)' }, undefined, [...log]));
    inorder(node.right);
  }

  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Starting Inorder Traversal (Left -> Node -> Right)`, 1, {}, undefined, []));
  inorder(tree);
  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Inorder Traversal Complete: [${log.join(', ')}]`, 10, { result: log.join(', ') }, undefined, [...log]));
  return steps;
}

// 2. Preorder Traversal (NLR: Node -> Left -> Right)
export function generateBSTPreorderSteps(tree: BSTTreeStructure | undefined): BSTStep[] {
  const steps: BSTStep[] = [];
  const log: number[] = [];

  function preorder(node?: BSTTreeStructure) {
    if (!node) return;
    log.push(node.value);
    steps.push(createStepSnapshot(tree, node.id, [node.id], undefined, node.id, `Preorder Traversal: Visited node ${node.value} (Node-Left-Right)`, 3, { visited: node.value, order: 'Preorder (NLR)' }, undefined, [...log]));
    preorder(node.left);
    preorder(node.right);
  }

  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Starting Preorder Traversal (Node -> Left -> Right)`, 1, {}, undefined, []));
  preorder(tree);
  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Preorder Traversal Complete: [${log.join(', ')}]`, 10, { result: log.join(', ') }, undefined, [...log]));
  return steps;
}

// 3. Postorder Traversal (LRN: Left -> Right -> Node)
export function generateBSTPostorderSteps(tree: BSTTreeStructure | undefined): BSTStep[] {
  const steps: BSTStep[] = [];
  const log: number[] = [];

  function postorder(node?: BSTTreeStructure) {
    if (!node) return;
    postorder(node.left);
    postorder(node.right);
    log.push(node.value);
    steps.push(createStepSnapshot(tree, node.id, [node.id], undefined, node.id, `Postorder Traversal: Visited node ${node.value} (Left-Right-Node)`, 7, { visited: node.value, order: 'Postorder (LRN)' }, undefined, [...log]));
  }

  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Starting Postorder Traversal (Left -> Right -> Node)`, 1, {}, undefined, []));
  postorder(tree);
  steps.push(createStepSnapshot(tree, undefined, [], undefined, undefined, `Postorder Traversal Complete: [${log.join(', ')}]`, 10, { result: log.join(', ') }, undefined, [...log]));
  return steps;
}

// Generate Random BST with N unique values
export function generateRandomBST(count = 6): BSTTreeStructure | undefined {
  const values = new Set<number>();
  while (values.size < count) {
    values.add(Math.floor(Math.random() * 89) + 10);
  }

  const valArray = Array.from(values);
  let tree: BSTTreeStructure | undefined = undefined;

  for (const val of valArray) {
    const { newTree } = generateBSTInsertSteps(tree, val);
    tree = newTree;
  }

  return tree;
}
