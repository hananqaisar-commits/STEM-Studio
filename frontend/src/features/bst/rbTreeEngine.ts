import type { BSTStep, BSTNodeData } from './bstEngine';
import type { ElementState } from '../../engine/types/Step';

/** Node color — the algorithm's semantic identity. */
export type RBColor = 'RED' | 'BLACK';

export interface RBNodeStructure {
  value: number;
  id: string;
  color: RBColor;
  left?: RBNodeStructure;
  right?: RBNodeStructure;
  parent?: string; // parent id for annotation only
}

// ─── Extended node data carrying RBT-specific fields ─────────────────────────

export interface RBNodeData extends BSTNodeData {
  color: RBColor;
  isNull?: boolean; // sentinel nil node
}

/** Extension fields added to BSTStep.variables for RBT */
export interface RBTVariables {
  insertedValue?: number;
  currentNode?: number | string;
  parentNode?: number | string;
  grandparentNode?: number | string;
  uncleNode?: number | string | null;
  uncleColor?: string;
  case?: string;
  action?: string;
  blackHeight?: number;
}

// ─── Layout / snapshot helpers ────────────────────────────────────────────────

function cloneRB(node?: RBNodeStructure): RBNodeStructure | undefined {
  if (!node) return undefined;
  return {
    value: node.value,
    id: node.id,
    color: node.color,
    parent: node.parent,
    left: cloneRB(node.left),
    right: cloneRB(node.right),
  };
}

export function computeRBPositions(
  root?: RBNodeStructure,
  x = 50,
  y = 40,
  spread = 22
): { nodes: RBNodeData[]; edges: { fromId: string; toId: string; state: ElementState }[] } {
  const nodes: RBNodeData[] = [];
  const edges: { fromId: string; toId: string; state: ElementState }[] = [];

  if (!root) return { nodes, edges };

  function traverse(
    node: RBNodeStructure,
    nx: number,
    ny: number,
    currentSpread: number
  ) {
    nodes.push({
      id: node.id,
      value: node.value,
      leftId: node.left?.id,
      rightId: node.right?.id,
      x: nx,
      y: ny,
      state: 'default',
      color: node.color,
    } as RBNodeData);

    const nextY = ny + 72;
    const nextSpread = Math.max(5, currentSpread * 0.55);

    if (node.left) {
      const lx = Math.max(5, nx - currentSpread);
      edges.push({ fromId: node.id, toId: node.left.id, state: 'default' });
      traverse(node.left, lx, nextY, nextSpread);
    }
    if (node.right) {
      const rx = Math.min(95, nx + currentSpread);
      edges.push({ fromId: node.id, toId: node.right.id, state: 'default' });
      traverse(node.right, rx, nextY, nextSpread);
    }
  }

  traverse(root, x, y, spread);
  return { nodes, edges };
}

function createRBStep(
  root: RBNodeStructure | undefined,
  activeId?: string,
  highlightIds: string[] = [],
  description = '',
  codeLine = 1,
  variables: Record<string, string | number | boolean | null> = {}
): BSTStep {
  const { nodes, edges } = computeRBPositions(root);

  const updatedNodes = nodes.map((node) => {
    let state: ElementState = 'default';
    if (node.id === activeId) state = 'comparing';
    else if (highlightIds.includes(node.id)) state = 'selected';
    return { ...node, state };
  });

  return {
    nodes: updatedNodes,
    edges,
    activeNodeId: activeId,
    description,
    codeLine,
    variables,
  };
}

// ─── Black-Height calculation ─────────────────────────────────────────────────

function blackHeight(node?: RBNodeStructure): number {
  if (!node) return 1; // nil counts as black
  const lh = blackHeight(node.left);
  const rh = blackHeight(node.right);
  const selfCount = node.color === 'BLACK' ? 1 : 0;
  return selfCount + Math.max(lh, rh);
}

// ─── Rotation helpers ─────────────────────────────────────────────────────────

function rotateLeft(node: RBNodeStructure): RBNodeStructure {
  const right = node.right!;
  node.right = right.left;
  if (right.left) right.left.parent = node.id;
  right.left = node;
  right.parent = node.parent;
  node.parent = right.id;
  return right;
}

function rotateRight(node: RBNodeStructure): RBNodeStructure {
  const left = node.left!;
  node.left = left.right;
  if (left.right) left.right.parent = node.id;
  left.right = node;
  left.parent = node.parent;
  node.parent = left.id;
  return left;
}

// ─── ID collision-safe counter ────────────────────────────────────────────────

let _idCounter = 0;
function nextId(val: number) {
  return `rb_${val}_${++_idCounter}`;
}

// ─── Main insertion engine ────────────────────────────────────────────────────

export function generateRBInsertSteps(
  initialTree: RBNodeStructure | undefined,
  newValue: number
): { steps: BSTStep[]; newTree: RBNodeStructure } {
  const steps: BSTStep[] = [];
  let tree = cloneRB(initialTree);

  steps.push(
    createRBStep(tree, undefined, [], `Starting Red-Black Tree insertion for value ${newValue}.`, 1, {
      insertedValue: newValue,
    })
  );

  // ─── BST Insert ───────────────────────────────────────────────────

  const newNode: RBNodeStructure = {
    value: newValue,
    id: nextId(newValue),
    color: 'RED', // all new nodes start RED
  };

  function bstInsert(
    node: RBNodeStructure | undefined,
    incoming: RBNodeStructure
  ): RBNodeStructure {
    if (!node) return incoming;

    if (incoming.value < node.value) {
      steps.push(
        createRBStep(tree, node.id, [node.id], `${newValue} < ${node.value} — go LEFT.`, 4, {
          currentNode: node.value, direction: 'left', insertedValue: newValue,
        })
      );
      incoming.parent = node.id;
      node.left = bstInsert(node.left, incoming);
      if (node.left === incoming) node.left.parent = node.id;
    } else if (incoming.value > node.value) {
      steps.push(
        createRBStep(tree, node.id, [node.id], `${newValue} > ${node.value} — go RIGHT.`, 6, {
          currentNode: node.value, direction: 'right', insertedValue: newValue,
        })
      );
      incoming.parent = node.id;
      node.right = bstInsert(node.right, incoming);
      if (node.right === incoming) node.right.parent = node.id;
    } else {
      steps.push(
        createRBStep(tree, node.id, [], `Value ${newValue} already exists.`, 8, { insertedValue: newValue })
      );
    }

    return node;
  }

  if (!tree) {
    // Tree was empty — new node becomes BLACK root
    newNode.color = 'BLACK';
    tree = newNode;
    steps.push(
      createRBStep(tree, tree.id, [tree.id], `Tree was empty. Node ${newValue} becomes the BLACK root (Rule: root is always BLACK).`, 2, {
        insertedValue: newValue, action: 'Root insertion', case: 'Root is always BLACK',
      })
    );
    return { steps, newTree: tree };
  }

  tree = bstInsert(tree, newNode);

  steps.push(
    createRBStep(tree, newNode.id, [newNode.id], `Inserted node ${newValue} as RED. Checking RBT invariants...`, 9, {
      insertedValue: newValue, action: 'BST insert complete, node colored RED',
    })
  );

  // ─── Fix-Up ───────────────────────────────────────────────────────

  /** Build a lookup map for O(1) parent access by id. */
  function buildParentMap(
    node: RBNodeStructure | undefined,
    map: Map<string, RBNodeStructure>
  ) {
    if (!node) return;
    if (node.left) { map.set(node.left.id, node); buildParentMap(node.left, map); }
    if (node.right) { map.set(node.right.id, node); buildParentMap(node.right, map); }
  }

  function findNode(
    root: RBNodeStructure | undefined,
    id: string
  ): RBNodeStructure | undefined {
    if (!root) return undefined;
    if (root.id === id) return root;
    return findNode(root.left, id) || findNode(root.right, id);
  }

  /**
   * Inline fix-up — we re-root the tree mutably and push steps as we go.
   * This mirrors the standard textbook fix-up procedure.
   */
  function fixUp(root: RBNodeStructure, z: RBNodeStructure): RBNodeStructure {
    const parentMap = new Map<string, RBNodeStructure>();
    buildParentMap(root, parentMap);

    let current = z;

    while (true) {
      const parent = parentMap.get(current.id);

      // Case 0: current is root → colour it BLACK
      if (!parent) {
        if (current.color === 'RED') {
          current.color = 'BLACK';
          steps.push(
            createRBStep(root, current.id, [current.id], `Node ${current.value} is the root — must be BLACK. Recolored BLACK.`, 11, {
              currentNode: current.value, action: 'Recolor root BLACK', case: 'Root must be BLACK',
            })
          );
        }
        break;
      }

      // No violation if parent is BLACK
      if (parent.color === 'BLACK') {
        steps.push(
          createRBStep(root, current.id, [current.id, parent.id], `Parent ${parent.value} is BLACK — no violation. RBT properties satisfied.`, 12, {
            currentNode: current.value, parentNode: parent.value, case: 'No fix needed',
          })
        );
        break;
      }

      // Parent is RED — there IS a violation
      const grandparent = parentMap.get(parent.id);
      if (!grandparent) break;

      const uncle =
        grandparent.left?.id === parent.id ? grandparent.right : grandparent.left;
      const uncleColor: RBColor = uncle ? uncle.color : 'BLACK';

      steps.push(
        createRBStep(
          root,
          current.id,
          [current.id, parent.id, grandparent.id, ...(uncle ? [uncle.id] : [])],
          `RED-RED violation! Node ${current.value} (RED) and parent ${parent.value} (RED). Uncle ${uncle ? uncle.value : 'NIL'} is ${uncleColor}.`,
          13,
          {
            currentNode: current.value,
            parentNode: parent.value,
            grandparentNode: grandparent.value,
            uncleNode: uncle ? uncle.value : 'NIL',
            uncleColor,
          }
        )
      );

      if (uncleColor === 'RED') {
        // ── CASE 1: Uncle is RED → Recolor ────────────────────────────
        parent.color = 'BLACK';
        uncle!.color = 'BLACK';
        grandparent.color = 'RED';

        steps.push(
          createRBStep(root, grandparent.id, [parent.id, uncle!.id, grandparent.id],
            `Case 1 — Uncle is RED: Recolor parent (${parent.value}) and uncle (${uncle!.value}) to BLACK, grandparent (${grandparent.value}) to RED. Move up to grandparent.`,
            14,
            { case: 'Case 1: Recolor', action: `Recolor ${parent.value} BLACK, ${uncle!.value} BLACK, ${grandparent.value} RED` }
          )
        );

        // Move current up to grandparent and rebuild map
        current = grandparent;
        buildParentMap(root, parentMap);
        continue;
      }

      // Uncle is BLACK → rotation needed
      const parentIsLeftChild = grandparent.left?.id === parent.id;

      if (parentIsLeftChild) {
        if (parent.right?.id === current.id) {
          // ── CASE 2: Triangle (LR) → Left rotate parent ──────────────
          steps.push(
            createRBStep(root, parent.id, [current.id, parent.id],
              `Case 2 — Uncle is BLACK (Triangle): Node ${current.value} is right child of left-child parent. Perform LEFT ROTATION on parent ${parent.value}.`,
              16,
              { case: 'Case 2: Left Rotation on parent', action: `Left rotate ${parent.value}` }
            )
          );
          grandparent.left = rotateLeft(parent);
          buildParentMap(root, parentMap);
          // Refresh references
          const newParent = grandparent.left;
          const newCurrent = newParent.left || newParent;
          steps.push(
            createRBStep(root, newParent.id, [newParent.id],
              `After left rotation: ${newParent.value} is now parent. Falling through to Case 3.`,
              17,
              { case: 'Case 2→3 transition' }
            )
          );
          // Recolor for Case 3
          newParent.color = 'BLACK';
          grandparent.color = 'RED';
          steps.push(
            createRBStep(root, grandparent.id, [newParent.id, grandparent.id],
              `Case 3 — Right Rotation on grandparent ${grandparent.value}: Recolor ${newParent.value} BLACK and ${grandparent.value} RED, then rotate right.`,
              18,
              { case: 'Case 3: Right Rotation on grandparent', action: `Right rotate ${grandparent.value}` }
            )
          );
          root = rotateRight(grandparent);
          buildParentMap(root, parentMap);
          break;
        } else {
          // ── CASE 3: Line (LL) → Right rotate grandparent ─────────────
          parent.color = 'BLACK';
          grandparent.color = 'RED';
          steps.push(
            createRBStep(root, grandparent.id, [current.id, parent.id, grandparent.id],
              `Case 3 — Uncle is BLACK (Line): Recolor parent ${parent.value} BLACK and grandparent ${grandparent.value} RED. Perform RIGHT ROTATION on grandparent.`,
              18,
              { case: 'Case 3: Right Rotation on grandparent', action: `Right rotate ${grandparent.value}` }
            )
          );
          const gpParent = parentMap.get(grandparent.id);
          const newSubRoot = rotateRight(grandparent);
          if (!gpParent) {
            root = newSubRoot;
          } else if (gpParent.left?.id === grandparent.id) {
            gpParent.left = newSubRoot;
          } else {
            gpParent.right = newSubRoot;
          }
          buildParentMap(root, parentMap);
          break;
        }
      } else {
        // Parent is RIGHT child — mirror cases
        if (parent.left?.id === current.id) {
          // ── CASE 2 Mirror: Triangle (RL) → Right rotate parent ───────
          steps.push(
            createRBStep(root, parent.id, [current.id, parent.id],
              `Case 2 — Uncle is BLACK (Triangle): Node ${current.value} is left child of right-child parent. Perform RIGHT ROTATION on parent ${parent.value}.`,
              16,
              { case: 'Case 2 (Mirror): Right Rotation on parent', action: `Right rotate ${parent.value}` }
            )
          );
          grandparent.right = rotateRight(parent);
          buildParentMap(root, parentMap);
          const newParent = grandparent.right;
          steps.push(
            createRBStep(root, newParent.id, [newParent.id],
              `After right rotation. Falling through to Case 3 (Mirror).`,
              17,
              { case: 'Case 2→3 Mirror' }
            )
          );
          newParent.color = 'BLACK';
          grandparent.color = 'RED';
          steps.push(
            createRBStep(root, grandparent.id, [newParent.id, grandparent.id],
              `Case 3 — Left Rotation on grandparent ${grandparent.value}: Recolor ${newParent.value} BLACK and ${grandparent.value} RED, then rotate left.`,
              18,
              { case: 'Case 3 (Mirror): Left Rotation on grandparent', action: `Left rotate ${grandparent.value}` }
            )
          );
          root = rotateLeft(grandparent);
          buildParentMap(root, parentMap);
          break;
        } else {
          // ── CASE 3 Mirror: Line (RR) → Left rotate grandparent ───────
          parent.color = 'BLACK';
          grandparent.color = 'RED';
          steps.push(
            createRBStep(root, grandparent.id, [current.id, parent.id, grandparent.id],
              `Case 3 — Uncle is BLACK (Line, Mirror): Recolor parent ${parent.value} BLACK and grandparent ${grandparent.value} RED. Perform LEFT ROTATION on grandparent.`,
              18,
              { case: 'Case 3 (Mirror): Left Rotation on grandparent', action: `Left rotate ${grandparent.value}` }
            )
          );
          const gpParent = parentMap.get(grandparent.id);
          const newSubRoot = rotateLeft(grandparent);
          if (!gpParent) {
            root = newSubRoot;
          } else if (gpParent.left?.id === grandparent.id) {
            gpParent.left = newSubRoot;
          } else {
            gpParent.right = newSubRoot;
          }
          buildParentMap(root, parentMap);
          break;
        }
      }
    }

    return root;
  }

  tree = fixUp(tree, newNode);

  // Ensure root is BLACK
  if (tree.color === 'RED') tree.color = 'BLACK';

  const bh = blackHeight(tree) - 1; // subtract 1 for nil count
  steps.push(
    createRBStep(tree, undefined, [], `RBT insertion of ${newValue} complete. Black-height = ${bh}. All invariants satisfied.`, 20, {
      insertedValue: newValue, blackHeight: bh, action: 'Insertion complete',
    })
  );

  return { steps, newTree: tree };
}

/** Build a sample RBT for the initial page load */
export function buildSampleRBTree(): RBNodeStructure | undefined {
  _idCounter = 0;
  let tree: RBNodeStructure | undefined = undefined;
  for (const v of [41, 38, 31, 12, 19, 8]) {
    const res = generateRBInsertSteps(tree, v);
    tree = res.newTree;
  }
  return tree;
}
