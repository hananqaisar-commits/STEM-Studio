import type { BSTStep, PredictionPoint } from './bstEngine';
import { buildOptions, type QuizCheckpoint, type QuizWeight } from '../../engine/types/Quiz';

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
