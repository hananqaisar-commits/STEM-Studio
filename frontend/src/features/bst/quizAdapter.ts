import type { BSTStep, PredictionPoint } from './bstEngine';
import { buildOptions, type QuizCheckpoint, type QuizWeight , type QuizRevisionData } from '../../engine/types/Quiz';

/* ── BST quiz adapter ──────────────────────────────────────────────────
   BST already carried prediction data (`PredictionPoint` on insert and
   search comparison steps), but the old card had two problems:

   1. It printed the deciding comparison on the buttons —
      `MOVE LEFT SUBTREE ({target} < {node})` (PredictionQuiz.tsx:67) —
      so the answer was readable without understanding a BST.
   2. `PredictionQuiz.tsx:24` accepted BOTH 'left' and 'right' as correct
      whenever `correctDirection === 'here'`. That value is declared in
      `bstEngine.ts:17` but never produced, so the bug was dormant; the
      exhaustive switch below makes it unable to come back.

   Traversals carried no prediction data at all, yet they are the richest
   thing to predict here: `traversalLog` on each visit step gives an exact,
   canvas-answerable "which node is visited next?" question that tests the
   LNR / NLR / LRN rule directly. So this adapter authors no conceptual
   trivia — every question is derived from the tree on screen.
   ─────────────────────────────────────────────────────────────────── */

type Operation = 'insert' | 'search' | 'traversal' | 'unknown';

const DIRECTION_OPTIONS = {
  left: 'Into the left subtree',
  right: 'Into the right subtree',
  stop: 'Stop at this node',
} as const;

/**
 * Which operation produced these steps. Inferred rather than passed in:
 * BSTPage swaps `activeOperationSteps` from six different call sites
 * (BSTPage.tsx:120,130,197,228,481,485) and tracks no operation state, so
 * inferring keeps the page change to a single call.
 */
function detectOperation(steps: BSTStep[]): Operation {
  if (steps.some((step) => step.traversalLog !== undefined)) return 'traversal';
  const first = steps[0]?.variables ?? {};
  if (typeof first.newValue === 'number') return 'insert';
  if (typeof first.targetValue === 'number') return 'search';
  return 'unknown';
}

/** Human name for the traversal, read off the step the engine annotates. */
function traversalName(steps: BSTStep[]): string {
  for (const step of steps) {
    const order = step.variables?.order;
    if (typeof order === 'string') return order;
  }
  return 'Traversal';
}

const TRAVERSAL_RULES: Record<string, string> = {
  Inorder: 'Inorder visits the entire left subtree, then the node, then the right subtree — which on a BST emits the values in ascending order.',
  Preorder: 'Preorder visits the node first, then its whole left subtree, then its whole right subtree.',
  Postorder: 'Postorder visits both subtrees before the node itself, so a parent is always emitted after both of its children.',
};

function traversalRule(name: string): string {
  const key = Object.keys(TRAVERSAL_RULES).find((candidate) => name.startsWith(candidate));
  return key ? TRAVERSAL_RULES[key] : 'Follow the traversal order shown in the pseudocode panel.';
}

function weightFor(occurrence: number, reinforceUpTo: number): QuizWeight {
  if (occurrence === 0) return 1;
  return occurrence <= reinforceUpTo ? 2 : 3;
}

/**
 * Map a prediction point onto the answer, exhaustively. `'here'` and
 * `'found'` are declared by the engine but not currently produced; both
 * mean "the target is this node", so they collapse to the same option.
 */
function directionAnswer(point: PredictionPoint): string {
  switch (point.correctDirection) {
    case 'left':
      return DIRECTION_OPTIONS.left;
    case 'right':
      return DIRECTION_OPTIONS.right;
    case 'here':
    case 'found':
      return DIRECTION_OPTIONS.stop;
  }
}

/**
 * Build checkpoints for one BST operation.
 *
 * @param steps the `BSTStep[]` for a single insert, search, or traversal
 */
export function buildBSTCheckpoints(steps: BSTStep[]): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const operation = detectOperation(steps);
  const checkpoints: QuizCheckpoint[] = [];

  /* ── Insert / search: which way from this node? ── */
  if (operation === 'insert' || operation === 'search') {
    const verb = operation === 'insert' ? 'insertion' : 'search';
    let occurrence = 0;

    for (let index = 0; index < steps.length - 1; index++) {
      const point = steps[index].predictionPoint;
      if (!point) continue;

      const id = `bst-${operation}-dir-${index}`;
      const correct = directionAnswer(point);
      const built = buildOptions(
        id,
        correct,
        [DIRECTION_OPTIONS.left, DIRECTION_OPTIONS.right, DIRECTION_OPTIONS.stop].filter(
          (option) => option !== correct
        )
      );

      checkpoints.push({
        stepIndex: index,
        question: {
          id,
          prompt: `The ${verb} is at node ${point.currentNodeValue}, looking for ${point.targetValue}. Where does it go next?`,
          options: built.options,
          correctIndex: built.correctIndex,
          /* The engine's own wording, which states the comparison — fine
             here, since this is only shown once the answer is revealed. */
          explanation: point.explanation,
          hint: 'A BST keeps every smaller value in the left subtree and every larger value in the right subtree of a node.',
          concept: 'BST ordering',
          weight: weightFor(occurrence, 2),
        },
      });
      occurrence += 1;
    }

    return checkpoints;
  }

  /* ── Traversal: which node is visited next? ── */
  if (operation === 'traversal') {
    const name = traversalName(steps);
    const rule = traversalRule(name);
    let occurrence = 0;

    for (let index = 0; index < steps.length - 1; index++) {
      const current = steps[index];
      const next = steps[index + 1];
      const before = current.traversalLog;
      const after = next.traversalLog;
      if (!before || !after || after.length !== before.length + 1) continue;

      const visited = after[after.length - 1];
      /* Cross-check against the engine's own annotation, so a question can
         never disagree with what the canvas is about to show. */
      if (next.variables?.visited !== visited) continue;

      const seen = new Set(before);
      const remaining = current.nodes
        .map((node) => node.value)
        .filter((value) => value !== visited && !seen.has(value));
      if (remaining.length === 0) continue;

      const id = `bst-traversal-next-${index}`;
      const built = buildOptions(id, String(visited), remaining.slice(0, 3).map(String));

      checkpoints.push({
        stepIndex: index,
        question: {
          id,
          prompt:
            before.length === 0
              ? `${name} is about to begin. Which node does it visit first?`
              : `${name} has visited ${before.join(', ')}. Which value comes next?`,
          options: built.options,
          correctIndex: built.correctIndex,
          explanation: `${visited}. ${rule}`,
          hint: 'Walk the tree from the root following the traversal order, and stop at the first node not yet in the output.',
          concept: 'Traversal order',
          weight: weightFor(occurrence, 3),
        },
      });
      occurrence += 1;
    }

    return checkpoints;
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

export type BSTAlgorithmKey =
  | 'insert'
  | 'search'
  | 'inorder'
  | 'preorder'
  | 'postorder'
  | 'avlInsert'
  | 'heapInsert'
  | 'heapExtract'
  | 'trieInsert'
  | 'trieSearch'
  | 'rbtInsert'
  | 'segBuild'
  | 'segQuery'
  | 'segUpdate';

const REVISION_DATA: Record<BSTAlgorithmKey, QuizRevisionData> = {
  insert: {
    description: 'Insert a new value into a binary search tree',
    complexity: 'O(h) time, O(h) space',
    keyIdea: 'Follow the BST property: smaller values go left, larger values go right',
    watchFor: ['Comparison at each node', 'Traversal direction', 'Leaf insertion'],
    quickTip: 'Always insert as a leaf—traverse until you hit null, then create the node',
    example: 'Insert 5 into BST [8,3,10,1,6]: 5<8 go left, 5>3 go right, 5<6 go left → insert 5 as left child of 6.',
  },
  search: {
    description: 'Find a target value in a binary search tree',
    complexity: 'O(h) time, O(h) space',
    keyIdea: 'At each node, the BST property tells you which subtree to search next',
    watchFor: ['Direction decision', 'Termination conditions', 'Worst case (skewed tree)'],
    quickTip: 'If target < node go left, if target > node go right, if equal you found it',
    example: 'Search 6 in BST [8,3,10,1,6]: 6<8 go left, 6>3 go right, 6=6 → found.',
  },
  inorder: {
    description: 'Traverse the tree in left-node-right order',
    complexity: 'O(n) time, O(h) space',
    keyIdea: 'Inorder traversal of a BST visits nodes in ascending sorted order',
    watchFor: ['Visit order (L-N-R)', 'Stack/recursion depth', 'Sorted output property'],
    quickTip: 'Inorder on a BST always produces elements in sorted order—useful for validation',
    example: 'BST [8,3,10,1,6]: inorder visits 1,3,6,8,10 — sorted ascending.',
  },
  preorder: {
    description: 'Traverse the tree in node-left-right order',
    complexity: 'O(n) time, O(h) space',
    keyIdea: 'Visit the node before its children—useful for copying the tree structure',
    watchFor: ['Visit order (N-L-R)', 'Root-first property', 'Serialization use'],
    quickTip: 'Preorder is useful for creating a copy of the tree or serialization',
    example: 'BST [8,3,10,1,6]: preorder visits 8,3,1,6,10 — root first, then left subtree, then right.',
  },
  postorder: {
    description: 'Traverse the tree in left-right-node order',
    complexity: 'O(n) time, O(h) space',
    keyIdea: 'Visit children before the node—useful for deletion (children before parent)',
    watchFor: ['Visit order (L-R-N)', 'Bottom-up processing', 'Deletion use case'],
    quickTip: 'Postorder processes all descendants before their parent—ideal for safe deletion',
    example: 'BST [8,3,10,1,6]: postorder visits 1,6,3,10,8 — children before parent.',
  },
  avlInsert: {
    description: 'Insert into an AVL tree and rebalance with rotations',
    complexity: 'O(log n) time, O(log n) space',
    keyIdea: 'After each insert, node heights update and the first unbalanced node rotates back into balance',
    watchFor: ['Balance factor −1/0/+1', 'LL → right rotation', 'LR → left then right rotation'],
    quickTip: 'Balance factor = height(left) − height(right); only ancestors of the inserted node can lose balance',
    example: 'Insert 10, 20, 30: after 30 the root leans right (BF −2) → left rotation makes 20 the root.',
  },
  heapInsert: {
    description: 'Insert a value into a binary heap and sift it up',
    complexity: 'O(log n) time, O(1) space (iterative)',
    keyIdea: 'Append at the next free slot, then swap upward while the heap property is violated',
    watchFor: ['Parent index = (i−1)/2', 'Swap stops when parent dominates', 'Max vs min heap direction'],
    quickTip: 'A heap is a complete tree stored in an array—children of i live at 2i+1 and 2i+2',
    example: 'Max-heap [90,75,60,40]: insert 85 → appended under 40, swaps up: 85>40, 85<90 stops → [90,85,60,40,75].',
  },
  heapExtract: {
    description: 'Remove the heap root and restore the heap property',
    complexity: 'O(log n) time, O(1) space (iterative)',
    keyIdea: 'Move the last element to the root, then sift it down by swapping with the dominant child',
    watchFor: ['Root removed first', 'Sift-down picks larger child (max heap)', 'Array shrinks by one'],
    quickTip: 'Extract always removes the extreme element—the root—because a heap only guarantees the top',
    example: 'Max-heap [90,85,60]: extract 90 → last element 60 becomes root, sifts down → [85,60].',
  },
  trieInsert: {
    description: 'Insert a word into a trie character by character',
    complexity: 'O(m) time, O(m) space (m = word length)',
    keyIdea: 'Each character descends one level; missing children are created, and the final node is marked as a word end',
    watchFor: ['Shared prefixes reuse nodes', 'isEnd flag on last char', 'New branch creation'],
    quickTip: 'Tries trade memory for lookup speed—common prefixes are stored only once',
    example: 'Insert "cat" then "car": c→a is shared, then t and r branch off node a.',
  },
  trieSearch: {
    description: 'Search for a full word in a trie',
    complexity: 'O(m) time, O(1) space',
    keyIdea: 'Descend one node per character; the word exists only if every edge exists AND the last node is marked as an end',
    watchFor: ['Missing child = fail fast', 'isEnd check at the end', 'Prefix vs full word'],
    quickTip: 'Reaching the last character is not enough—the isEnd flag distinguishes "car" from "card"',
    example: 'Trie with "car": searching "ca" walks fine but returns false—no isEnd on a.',
  },
  rbtInsert: {
    description: 'Insert into a Red-Black Tree and recolor/rotate',
    complexity: 'O(log n) time, O(log n) space',
    keyIdea: 'Nodes are colored red or black to ensure the longest path is no more than twice the shortest',
    watchFor: ['Uncle color determines fix', 'Red uncle → recolor', 'Black uncle → rotate'],
    quickTip: 'New nodes are always red. If the parent is red, a violation occurs.',
    example: 'Insert 25. Parent 30 is red, uncle 10 is black. Rotate and recolor.',
  },
  segBuild: {
    description: 'Build a Segment Tree from an array',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Bottom-up construction: leaves hold array values, internal nodes hold aggregated data (e.g. sum)',
    watchFor: ['Recursion splits range in half', 'Mid = (start+end)/2', 'Left child = 2i+1'],
    quickTip: 'The root covers [0, n-1]. Each child covers half the range.',
    example: 'Array [1,3,5]: root sum=9, left sum=4 [1,3], right sum=5.',
  },
  segQuery: {
    description: 'Query a range in a Segment Tree',
    complexity: 'O(log n) time, O(log n) space',
    keyIdea: 'Traverse down the tree, aggregating exact coverage and skipping disjoint ranges',
    watchFor: ['Complete overlap → return value', 'Partial overlap → recurse both sides', 'Disjoint → return neutral (0)'],
    quickTip: 'If the node range is fully inside the query range, return immediately without going to leaves.',
    example: 'Query [1,2] on tree [0,3]. Recurse to [0,1] and [2,3] and sum the exact overlaps.',
  },
  segUpdate: {
    description: 'Point update in a Segment Tree',
    complexity: 'O(log n) time, O(log n) space',
    keyIdea: 'Update the leaf, then recalculate all ancestor sums on the way back up',
    watchFor: ['Traverse exactly one path to leaf', 'Update value at leaf', 'Recalculate parent values'],
    quickTip: 'You only visit O(log n) nodes because you just trace the path to the leaf and back.',
    example: 'Update index 2. Traverse down to leaf 2, update it, then update its parent, and root.',
  },
};

export function buildRevisionData(key: BSTAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
