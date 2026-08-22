import type { BSTStep, BSTNodeData } from './bstEngine';
import type { ElementState } from '../../engine/types/Step';

export interface AVLNodeStructure {
  value: number;
  id: string;
  height: number;
  balanceFactor: number;
  left?: AVLNodeStructure;
  right?: AVLNodeStructure;
}

function getHeight(node?: AVLNodeStructure): number {
  return node ? node.height : 0;
}

function getBalanceFactor(node?: AVLNodeStructure): number {
  return node ? getHeight(node.left) - getHeight(node.right) : 0;
}

function updateHeightAndBF(node: AVLNodeStructure) {
  node.height = Math.max(getHeight(node.left), getHeight(node.right)) + 1;
  node.balanceFactor = getBalanceFactor(node);
}

function cloneAVL(root?: AVLNodeStructure): AVLNodeStructure | undefined {
  if (!root) return undefined;
  return {
    value: root.value,
    id: root.id,
    height: root.height,
    balanceFactor: root.balanceFactor,
    left: cloneAVL(root.left),
    right: cloneAVL(root.right),
  };
}

// Compute Node Positions with Height & Balance Factor Badges
export function computeAVLPositions(
  root?: AVLNodeStructure,
  startX = 50,
  startY = 40,
  level = 0,
  spread = 22
): { nodes: (BSTNodeData & { height?: number; balanceFactor?: number })[]; edges: { fromId: string; toId: string; state: ElementState }[] } {
  const nodes: (BSTNodeData & { height?: number; balanceFactor?: number })[] = [];
  const edges: { fromId: string; toId: string; state: ElementState }[] = [];

  if (!root) return { nodes, edges };

  function traverse(node: AVLNodeStructure, x: number, y: number, currentLevel: number, currentSpread: number) {
    nodes.push({
      id: node.id,
      value: node.value,
      leftId: node.left?.id,
      rightId: node.right?.id,
      x,
      y,
      state: 'default',
      height: node.height,
      balanceFactor: node.balanceFactor,
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

function createAVLStep(
  root: AVLNodeStructure | undefined,
  activeId?: string,
  comparingIds: string[] = [],
  description = '',
  codeLine = 1,
  variables: Record<string, string | number | boolean | null> = {},
  prediction?: any
): BSTStep {
  const { nodes, edges } = computeAVLPositions(root);

  const updatedNodes = nodes.map((node) => {
    let state: ElementState = 'default';
    if (node.id === activeId || comparingIds.includes(node.id)) state = 'comparing';
    return { ...node, state };
  });

  return {
    nodes: updatedNodes,
    edges,
    activeNodeId: activeId,
    description,
    codeLine,
    variables,
    predictionPoint: prediction,
  };
}

// Right Rotation (LL Imbalance)
function rotateRight(y: AVLNodeStructure): AVLNodeStructure {
  const x = y.left!;
  const T2 = x.right;

  x.right = y;
  y.left = T2;

  updateHeightAndBF(y);
  updateHeightAndBF(x);

  return x;
}

// Left Rotation (RR Imbalance)
function rotateLeft(x: AVLNodeStructure): AVLNodeStructure {
  const y = x.right!;
  const T2 = y.left;

  y.left = x;
  x.right = T2;

  updateHeightAndBF(x);
  updateHeightAndBF(y);

  return y;
}

// Generate Steps for AVL Tree Insertion & Self-Balancing
export function generateAVLInsertSteps(initialTree: AVLNodeStructure | undefined, newValue: number): { steps: BSTStep[]; newTree: AVLNodeStructure } {
  const steps: BSTStep[] = [];
  let tree = cloneAVL(initialTree);

  steps.push(createAVLStep(tree, undefined, [], `Starting AVL Tree insertion for value ${newValue}`, 1, { newValue }));

  function insertNode(node: AVLNodeStructure | undefined, val: number): AVLNodeStructure {
    if (!node) {
      const newNode: AVLNodeStructure = {
        value: val,
        id: `avl_${Date.now()}_${val}`,
        height: 1,
        balanceFactor: 0,
      };
      steps.push(createAVLStep(tree, newNode.id, [newNode.id], `Inserted node ${val}. Initializing Height=1, Balance Factor=0.`, 2, { val, height: 1 }));
      return newNode;
    }

    if (val < node.value) {
      const direction = 'left';
      const explanation = `Value ${val} is LESS than AVL Node ${node.value}, so it must enter the LEFT subtree.`;
      steps.push(createAVLStep(tree, node.id, [node.id], `Value ${val} < ${node.value}, traversing to LEFT subtree.`, 4, { val, nodeVal: node.value }, {
        questionNodeId: node.id,
        currentNodeValue: node.value,
        targetValue: val,
        correctDirection: direction,
        explanation,
      }));
      node.left = insertNode(node.left, val);
    } else if (val > node.value) {
      const direction = 'right';
      const explanation = `Value ${val} is GREATER than AVL Node ${node.value}, so it must enter the RIGHT subtree.`;
      steps.push(createAVLStep(tree, node.id, [node.id], `Value ${val} > ${node.value}, traversing to RIGHT subtree.`, 6, { val, nodeVal: node.value }, {
        questionNodeId: node.id,
        currentNodeValue: node.value,
        targetValue: val,
        correctDirection: direction,
        explanation,
      }));
      node.right = insertNode(node.right, val);
    } else {
      steps.push(createAVLStep(tree, node.id, [node.id], `Value ${val} already exists in AVL Tree.`, 8, { val }));
      return node;
    }

    updateHeightAndBF(node);
    const balance = node.balanceFactor;

    steps.push(createAVLStep(tree, node.id, [node.id], `Updated Node ${node.value}: Height=${node.height}, Balance Factor=${balance}`, 10, { nodeVal: node.value, height: node.height, balanceFactor: balance }));

    // 1. Left-Left (LL) Case -> Right Rotation
    if (balance > 1 && val < node.left!.value) {
      steps.push(createAVLStep(tree, node.id, [node.id, node.left!.id], `Imbalance detected at Node ${node.value} (BF=${balance} > 1, LL Case). Performing RIGHT ROTATION.`, 12, { rotation: 'Right (LL)', root: node.value }));
      return rotateRight(node);
    }

    // 2. Right-Right (RR) Case -> Left Rotation
    if (balance < -1 && val > node.right!.value) {
      steps.push(createAVLStep(tree, node.id, [node.id, node.right!.id], `Imbalance detected at Node ${node.value} (BF=${balance} < -1, RR Case). Performing LEFT ROTATION.`, 14, { rotation: 'Left (RR)', root: node.value }));
      return rotateLeft(node);
    }

    // 3. Left-Right (LR) Case -> Left Rotate Left Child then Right Rotate Node
    if (balance > 1 && val > node.left!.value) {
      steps.push(createAVLStep(tree, node.id, [node.id, node.left!.id], `Imbalance detected at Node ${node.value} (BF=${balance} > 1, LR Case). Performing LEFT-RIGHT ROTATION.`, 16, { rotation: 'Left-Right (LR)', root: node.value }));
      node.left = rotateLeft(node.left!);
      return rotateRight(node);
    }

    // 4. Right-Left (RL) Case -> Right Rotate Right Child then Left Rotate Node
    if (balance < -1 && val < node.right!.value) {
      steps.push(createAVLStep(tree, node.id, [node.id, node.right!.id], `Imbalance detected at Node ${node.value} (BF=${balance} < -1, RL Case). Performing RIGHT-LEFT ROTATION.`, 18, { rotation: 'Right-Left (RL)', root: node.value }));
      node.right = rotateRight(node.right!);
      return rotateLeft(node);
    }

    return node;
  }

  tree = insertNode(tree, newValue);
  steps.push(createAVLStep(tree, undefined, [], `AVL Tree is balanced. Height=${tree.height}, Balance Factor=${tree.balanceFactor}`, 20, { finalHeight: tree.height }));

  return { steps, newTree: tree };
}
