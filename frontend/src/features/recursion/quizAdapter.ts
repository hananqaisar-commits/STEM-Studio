import type { ArrayStep } from '../../engine/types/Step';
import { buildOptions, type QuizCheckpoint, type QuizWeight, type QuizRevisionData } from '../../engine/types/Quiz';

/* ── Recursion quiz adapter ────────────────────────────────────────────
   Builds conceptual checkpoints for each recursion algorithm.
   Since recursion steps don't have simple compare/swap semantics like
   sorting, we rely on conceptual anchor questions + step-based
   "what happens next?" questions derived from the call tree state.
   Power and Tower of Hanoi carry curated 15+ question pools tagged with
   weights 1-3 (the platform's easy/medium/hard difficulty system).
   ─────────────────────────────────────────────────────────────────── */

export type RecursionAlgorithmKey =
  | 'factorial'
  | 'fibonacci'
  | 'power'
  | 'arraySum'
  | 'towerOfHanoi';

/* ── Conceptual anchors (one per algorithm, asked at step 0) ────────── */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<RecursionAlgorithmKey, Anchor> = {
  factorial: {
    prompt: 'What is the base case for factorial?',
    correct: 'fact(0) = 1',
    distractors: ['fact(1) = 0', 'fact(n) = n', 'fact(0) = 0'],
    explanation:
      'The base case is fact(0) = 1. Every recursive factorial call chain terminates at n=0, which returns 1. The multiplicative identity (1) is used because factorial is a product.',
    hint: 'What value of n stops the recursion, and what does it return?',
    concept: 'Base case',
  },
  fibonacci: {
    prompt: 'Why does naive recursive fibonacci have exponential time complexity?',
    correct: 'Each call branches into two sub-calls, creating an exponentially growing tree of redundant computations',
    distractors: [
      'Because each call does an expensive addition operation',
      'Because the base case is reached exponentially many times',
      'Because the recursion depth grows linearly',
    ],
    explanation:
      'fib(n) calls fib(n-1) and fib(n-2), so the call tree roughly doubles at each level. Many sub-problems are solved repeatedly — fib(2) is computed many times for fib(5). This gives O(2^n) total calls.',
    hint: 'Count how many times fib(2) appears in the call tree for fib(5).',
    concept: 'Exponential branching',
  },
  power: {
    prompt: 'What is the base case for recursive power(base, exp)?',
    correct: 'power(b, 0) = 1 — any number to the power 0 is 1',
    distractors: [
      'power(b, 1) = b',
      'power(0, e) = 0',
      'power(b, 0) = 0',
    ],
    explanation:
      'The base case is exp = 0, which returns 1 (the multiplicative identity). Halving the exponent at every level makes the tree only log₂(exp) deep.',
    hint: 'What exponent makes any base equal to 1?',
    concept: 'Base case',
  },
  arraySum: {
    prompt: 'How does recursive array sum decompose the problem?',
    correct: 'It takes the current element plus the sum of the remaining elements: arr[idx] + sum(arr, idx+1)',
    distractors: [
      'It splits the array in half and sums each half',
      'It accumulates a running total in a parameter',
      'It sorts the array first then adds elements',
    ],
    explanation:
      'The recursion processes one element at a time: the sum starting at index idx is arr[idx] plus the sum starting at idx+1. The base case (idx past the end) returns 0.',
    hint: 'Think about what each recursive call is responsible for.',
    concept: 'Problem decomposition',
  },
  towerOfHanoi: {
    prompt: 'How many moves are required to solve Tower of Hanoi with n disks?',
    correct: '2^n - 1 moves — each disk configuration must be visited',
    distractors: [
      'n moves — one per disk',
      'n^2 moves — one per pair of disks',
      '2n moves — twice the number of disks',
    ],
    explanation:
      'Tower of Hanoi with n disks requires exactly 2^n - 1 moves. Moving n-1 disks aside takes 2^(n-1)-1 moves, then 1 move for the largest disk, then 2^(n-1)-1 moves to stack them back — totaling 2^n - 1.',
    hint: 'For 3 disks the answer is 7. What formula gives 7 when n=3?',
    concept: 'Move count',
  },
};

/* ── Step parsing helpers (JSON-encoded tree metadata) ───────────────── */

function labelsOf(step: ArrayStep): string[] {
  try {
    const parsed = JSON.parse(String(step.variables?.nodeLabels ?? '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function activeLabel(step: ArrayStep): string | null {
  const labels = labelsOf(step);
  const idx = step.comparingIndices?.[0];
  return idx != null && labels[idx] != null ? labels[idx] : null;
}

/* ── Curated question pools ────────────────────────────────────────────
   `bind` resolves the natural step for the question against the actual
   execution; returning -1 drops the question for this input. Weights map
   to the platform difficulty system: 1 = easy, 2 = medium, 3 = hard. */

interface PoolQuestion {
  id: string;
  weight: QuizWeight;
  kind: 'predict' | 'reason';
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
  bind?: (steps: ArrayStep[]) => number;
}

const firstIdx = (steps: ArrayStep[], pred: (s: ArrayStep) => boolean) =>
  steps.findIndex(pred);

function halvingsToBase(e: number): number {
  let count = 0;
  while (e > 0) { e = Math.floor(e / 2); count++; }
  return count;
}

function buildPowerPool(steps: ArrayStep[]): PoolQuestion[] {
  const parsePow = (label: string | null): { b: number; e: number } | null => {
    const m = /pow\((\d+),(\d+)\)/.exec(label ?? '');
    return m ? { b: Number(m[1]), e: Number(m[2]) } : null;
  };
  const firstCall = firstIdx(steps, (s) => String(s.description).startsWith('Calling pow') && !String(s.description).includes(', 0)'));
  const call = parsePow(firstCall >= 0 ? activeLabel(steps[firstCall]) : null);
  const callExp = call ? call.e : NaN;
  const baseReturn = firstIdx(steps, (s) => String(s.description).startsWith('Base case: pow'));
  const evenReturn = firstIdx(steps, (s) => /= pow\(/.test(String(s.description)));
  const oddReturn = firstIdx(steps, (s) => /= \d+ × pow\(/.test(String(s.description)));
  const last = steps.length - 1;
  const root = parsePow(activeLabel(steps[0]));
  const rootExp = root ? root.e : 0;
  const rootBase = root ? root.b : 0;

  return [
    {
      id: 'power-depth', weight: 1, kind: 'reason',
      prompt: `The root call is pow(${rootBase},${rootExp}). Roughly how deep does this call tree go?`,
      correct: `About ${halvingsToBase(rootExp)} halvings deep — log₂ of the exponent`,
      distractors: [
        `${rootExp} levels — one per exponent unit`,
        `${2 * rootExp} levels — two per unit`,
        'The depth equals the base value',
      ],
      explanation: 'Each level halves the exponent, so depth grows like log₂(exp). That is the divide-and-conquer speedup: doubling exp adds only one level.',
      hint: 'How many times can you halve the exponent before reaching 0?',
      concept: 'Log depth',
    },
    {
      id: 'power-why-halving', weight: 1, kind: 'reason',
      prompt: 'Why is halving the exponent faster than subtracting 1 each call?',
      correct: 'The problem size shrinks by half each level, so depth is log₂(n) instead of n',
      distractors: [
        'It avoids the base case entirely',
        'Multiplication is cheaper than subtraction',
        'It only recurses on even numbers',
      ],
      explanation: 'Subtracting 1 gives a chain n calls long. Halving gives a tree only log₂(n) deep — for n = 1024 that is 10 levels versus 1024.',
      hint: 'Compare chain length for exp = 1024 in both approaches.',
      concept: 'Divide and conquer',
    },
    {
      id: 'power-space', weight: 1, kind: 'reason',
      prompt: 'How much call-stack space does halving power use?',
      correct: 'O(log n) frames — one per tree level on the current path',
      distractors: ['O(n) frames', 'O(1) — no stack needed', 'O(2^n) frames'],
      explanation: 'Only one path from root to base case is alive at a time, and that path is log₂(exp) long.',
      hint: 'Stack depth equals tree depth, not total node count.',
      concept: 'Space complexity',
    },
    {
      id: 'power-two-halves', weight: 2, kind: 'predict',
      bind: () => firstCall,
      prompt: `This call splits the problem in half. What exponent do its two sub-calls get?`,
      correct: `${Math.floor(callExp / 2)} — the exponent halved`,
      distractors: [`${callExp - 1} — one less`, `${2 * callExp} — doubled`, `${callExp} — unchanged`],
      explanation: 'Divide-and-conquer: pow(b, e) delegates to two pow(b, ⌊e/2) sub-problems and combines their answers.',
      hint: 'Watch the exponent shrink at each level.',
      concept: 'Halving',
    },
    {
      id: 'power-base-return', weight: 2, kind: 'predict',
      bind: () => baseReturn,
      prompt: 'A base-case call just fired. What value does it return?',
      correct: '1 — anything to the power 0 is 1',
      distractors: ['0', 'The base value', 'It never returns'],
      explanation: 'pow(b, 0) = 1 is the multiplicative identity that terminates every branch.',
      hint: 'Which exponent ends the recursion?',
      concept: 'Base case return',
    },
    {
      id: 'power-even-combine', weight: 2, kind: 'predict',
      bind: () => evenReturn,
      prompt: 'This call has an EVEN exponent. How are the two half-results combined?',
      correct: 'half × half',
      distractors: ['base × half', 'base × base', 'half + half'],
      explanation: 'For even e: b^e = b^(e/2) × b^(e/2). The two identical sub-results are multiplied.',
      hint: 'b^4 = b^2 × b^2.',
      concept: 'Combine rule',
    },
    {
      id: 'power-odd-combine', weight: 2, kind: 'predict',
      bind: () => oddReturn,
      prompt: 'This call has an ODD exponent. How are the results combined?',
      correct: 'base × half × half — one extra base factor',
      distractors: ['half × half', 'base × base × half', 'half + half + base'],
      explanation: 'For odd e: b^e = b × b^((e-1)/2) × b^((e-1)/2). The leftover factor is the base itself.',
      hint: 'b^3 = b × b^1 × b^1.',
      concept: 'Odd exponent',
    },
    {
      id: 'power-will-terminate', weight: 2, kind: 'predict',
      bind: () => firstCall,
      prompt: 'Will every branch of this tree reach the base case?',
      correct: 'Yes — halving any positive integer eventually reaches 0',
      distractors: ['Only if the exponent is even', 'Only if the base is greater than 1', 'No — halving never terminates'],
      explanation: 'Integer halving strictly decreases positive values, so every path hits pow(b, 0).',
      hint: 'Try halving 7 repeatedly: 7, 3, 1, 0.',
      concept: 'Termination',
    },
    {
      id: 'power-halvings-left', weight: 2, kind: 'predict',
      bind: () => firstCall,
      prompt: `From exponent ${callExp}, how many more halvings until the base case?`,
      correct: `${halvingsToBase(callExp)}`,
      distractors: [`${callExp}`, `${callExp - 1}`, '1'],
      explanation: 'Count the halvings: each level floors e/2 until 0. That count is the remaining depth.',
      hint: 'Halve it on paper until you read 0.',
      concept: 'Depth count',
    },
    {
      id: 'power-root-value', weight: 2, kind: 'predict',
      bind: () => (last > 0 ? last : -1),
      prompt: 'Final step: what value does the root return?',
      correct: `${Math.pow(rootBase, rootExp)} — base^exp`,
      distractors: [
        `${rootBase * rootExp} — base times exp`,
        `${Math.pow(2, rootExp)} — 2^exp`,
        `${Math.pow(rootBase, Math.max(0, rootExp - 1))} — one power short`,
      ],
      explanation: 'All the half × half combinations multiply back up to exactly base^exp.',
      hint: 'The tree computes the same value as repeated multiplication, just faster.',
      concept: 'Final result',
    },
    {
      id: 'power-double-exp-depth', weight: 3, kind: 'reason',
      prompt: 'If the exponent doubled, what would happen to the tree depth?',
      correct: 'It grows by exactly one level — log₂ grows additively',
      distractors: ['The depth doubles', 'It grows by two levels', 'Nothing changes'],
      explanation: 'log₂(2n) = log₂(n) + 1. Doubling the input costs one extra level — the signature of logarithmic depth.',
      hint: 'Think in halvings: one more doubling = one more halving step.',
      concept: 'Log growth',
    },
    {
      id: 'power-bottom-level', weight: 3, kind: 'predict',
      prompt: `How many calls sit on the deepest branching level of this tree (exp = ${rootExp})?`,
      correct: `${Math.pow(2, halvingsToBase(rootExp))} — the level count doubles each row`,
      distractors: [
        `${rootExp}`,
        `${halvingsToBase(rootExp)}`,
        `${Math.pow(2, rootExp)}`,
      ],
      explanation: 'The tree is binary: level d holds 2^d calls. The deepest branching level has 2^depth calls.',
      hint: 'Level 0 has 1 call, level 1 has 2, level 2 has 4…',
      concept: 'Binary branching',
    },
    {
      id: 'power-total-nodes', weight: 3, kind: 'predict',
      prompt: `Roughly how many total calls does this tree contain (exp = ${rootExp})?`,
      correct: `${Math.pow(2, halvingsToBase(rootExp) + 1) - 1} — a full binary tree of that depth`,
      distractors: [
        `${rootExp + 1}`,
        `${2 * rootExp}`,
        `${Math.pow(2, rootExp) - 1}`,
      ],
      explanation: 'A full binary tree with depth d has 2^(d+1) - 1 nodes. (The optimized fast-power version keeps only one half per level: O(log n) calls.)',
      hint: 'Sum 1 + 2 + 4 + … across the levels.',
      concept: 'Node count',
    },
    {
      id: 'power-duplicate-half', weight: 3, kind: 'reason',
      prompt: 'Both children solve the same sub-problem pow(b, half). What does the optimized version do?',
      correct: 'Compute half once and square it — a single O(log n) chain',
      distractors: [
        'Nothing — the duplicate work is free',
        'Use a loop for odd exponents',
        'Fall back to subtracting 1',
      ],
      explanation: 'Classic fast exponentiation: half = pow(b, e/2) once, then half × half (× b if odd). The visualized tree shows the sub-problems; the reference code reuses the half.',
      hint: 'Why compute the same answer twice?',
      concept: 'Memoization insight',
    },
    {
      id: 'power-question-mark', weight: 3, kind: 'predict',
      bind: (st) => firstIdx(st, (s) => labelsOf(s).some((l) => l.startsWith('pow(')) && String(s.description).startsWith('Calling')),
      prompt: 'While descending, unresolved nodes show “?” as their value. What does that mean?',
      correct: 'The call is still waiting for its sub-calls to return',
      distractors: ['It already returned zero', 'It is a base case', 'The call failed'],
      explanation: 'A call can only compute its return after both halves resolve — “?” marks the waiting (descent) phase.',
      hint: 'Values appear bottom-up, on the way back.',
      concept: 'Descent vs return',
    },
  ];
}

function buildHanoiPool(steps: ArrayStep[]): PoolQuestion[] {
  const moveRe = /^Move disk (\d+) from peg (\w) to peg (\w)\. \(Move #(\d+)\)$/;
  const moves = steps
    .map((s, i) => ({ m: moveRe.exec(String(s.description)), i }))
    .filter((x) => x.m)
    .map((x) => ({ idx: x.i, disk: Number(x.m![1]), from: x.m![2], to: x.m![3], num: Number(x.m![4]) }));
  if (moves.length === 0) return [];
  const n = Math.max(...moves.map((m) => m.disk));
  const total = Math.pow(2, n) - 1;
  const first = moves[0];
  const lastMove = moves[moves.length - 1];
  const largest = moves.find((m) => m.disk === n);
  const mid = moves.find((m) => m.num === Math.pow(2, n - 1));
  const completeStep = firstIdx(steps, (s) => /complete\. All/.test(String(s.description)));

  return [
    {
      id: 'hanoi-base', weight: 1, kind: 'reason',
      prompt: 'What is the base case of the Hanoi recursion?',
      correct: 'A single disk moves directly from source to target',
      distractors: ['Move n-1 disks first', 'Swap the two top disks', 'Return without moving any disk'],
      explanation: 'hanoi(1, from, to) performs exactly one move — the indivisible unit the whole recursion is built from.',
      hint: 'What is the smallest possible move?',
      concept: 'Base case',
    },
    {
      id: 'hanoi-clear-stack', weight: 1, kind: 'reason',
      prompt: 'Before the largest disk can move, where must the top n-1 disks be?',
      correct: 'All stacked on the auxiliary peg',
      distractors: ['On the target peg', 'Split between source and target', 'Back on the source in reverse order'],
      explanation: 'The largest disk can only move when the source is otherwise empty and the target is free — so the n-1 stack must sit entirely on the auxiliary peg.',
      hint: 'Which peg is “out of the way” for this move?',
      concept: 'Three-peg logic',
    },
    {
      id: 'hanoi-after-largest', weight: 1, kind: 'reason',
      prompt: 'Immediately after the largest disk lands on the target, what remains?',
      correct: 'Move the n-1 stack from the auxiliary peg onto the target',
      distractors: ['Nothing — the puzzle is solved', 'Move the largest disk once more', 'Rebuild the n-1 stack on the auxiliary peg'],
      explanation: 'The final phase mirrors the first: hanoi(n-1, aux, target, source) stacks the smaller disks onto the largest.',
      hint: 'The recursion has three acts; you just watched act two.',
      concept: 'Recursion phases',
    },
    {
      id: 'hanoi-why-exponential', weight: 1, kind: 'reason',
      prompt: 'Why is the move count exponential in n?',
      correct: 'Solving n disks requires solving n-1 twice, plus one move: T(n) = 2T(n-1) + 1',
      distractors: ['Pegs hold at most three disks', 'Disks must be sorted after moving', 'The algorithm retries failed moves'],
      explanation: 'Each size level doubles the work of the one below it and adds one — unrolling the recurrence gives 2^n - 1.',
      hint: 'Write T(3) in terms of T(2).',
      concept: 'Recurrence',
    },
    {
      id: 'hanoi-first-move', weight: 2, kind: 'predict',
      bind: () => first.idx,
      prompt: `Move #1 transferred a disk ${first.from}→${first.to}. Which disk was it?`,
      correct: 'Disk 1 — the smallest disk always opens the game',
      distractors: [`Disk ${n} — the largest`, 'Disk 2', 'The middle disk'],
      explanation: 'To free anything bigger, the smallest disk must move first. For odd n it goes straight to the target.',
      hint: 'Which disk is free to move at the very start?',
      concept: 'Opening move',
    },
    {
      id: 'hanoi-total-moves', weight: 2, kind: 'predict',
      bind: () => first.idx,
      prompt: `This run has ${n} disks. How many moves in total?`,
      correct: `${total} — 2^n - 1`,
      distractors: [`${2 * n}`, `${Math.pow(2, n)}`, `${n * n}`],
      explanation: 'T(n) = 2T(n-1) + 1 unrolls to 2^n - 1. For n = 3 that is 7 moves.',
      hint: 'Double and add one, level by level.',
      concept: 'Move count',
    },
    {
      id: 'hanoi-largest-now', weight: 2, kind: 'predict',
      bind: () => (largest ? largest.idx : -1),
      prompt: `The largest disk (${n}) is moving now. Why exactly now?`,
      correct: 'The n-1 stack was just cleared onto the auxiliary peg',
      distractors: [
        'It moved earlier and is moving back',
        'The smaller disks are already on the target',
        'The auxiliary peg just became empty',
      ],
      explanation: 'Move #2^(n-1) is always the largest disk: the first half of the solution exists solely to make this move legal.',
      hint: 'Count which move number this is.',
      concept: 'Middle move',
    },
    {
      id: 'hanoi-moves-left', weight: 2, kind: 'predict',
      bind: () => (mid ? mid.idx : first.idx),
      prompt: `After move #${mid ? mid.num : 1} completes, how many moves remain?`,
      correct: `${total - (mid ? mid.num : 1)}`,
      distractors: [`${mid ? mid.num : 1}`, `${total}`, `${Math.max(0, total - 2)}`],
      explanation: 'Total is 2^n - 1; subtract the moves already made. The second half mirrors the first.',
      hint: 'Total minus done equals left.',
      concept: 'Progress tracking',
    },
    {
      id: 'hanoi-final-move', weight: 2, kind: 'predict',
      bind: () => lastMove.idx,
      prompt: 'This is the final move of the run. Which disk completes the tower?',
      correct: 'Disk 1 — the smallest disk makes the last move',
      distractors: [`Disk ${n} — the largest`, 'Disk 2', 'No disk moves last'],
      explanation: 'The smallest disk moves every other move (odd-numbered moves), including #1 and #2^n-1.',
      hint: 'Smallest disk moves on move 1, 3, 5, …',
      concept: 'Closing move',
    },
    {
      id: 'hanoi-role-rotation', weight: 3, kind: 'reason',
      prompt: 'In hanoi(n-1, from, aux, to), the peg that was the target becomes…',
      correct: 'The auxiliary peg — roles rotate every level',
      distractors: ['The source peg', 'Still the target', 'An unused peg'],
      explanation: 'Each recursive level permutes (source, target, auxiliary). Tracking the rotation is the key to predicting any move.',
      hint: 'The “out of the way” peg swaps with the target.',
      concept: 'Role rotation',
    },
    {
      id: 'hanoi-cant-first', weight: 3, kind: 'reason',
      prompt: 'Why can’t the algorithm move the largest disk first?',
      correct: 'Smaller disks sit on top of it — only one top disk may move per turn',
      distractors: ['The largest disk may never move', 'It would exceed 2^n - 1 moves', 'The auxiliary peg must fill first'],
      explanation: 'Rules allow moving only the top disk of a peg, and never onto a smaller disk. The whole first phase exists to uncover the largest disk.',
      hint: 'What is physically blocking it?',
      concept: 'Move rules',
    },
    {
      id: 'hanoi-four-disks', weight: 3, kind: 'predict',
      prompt: `If the input were 4 disks instead of ${n}, how many moves would the solution take?`,
      correct: '15 — 2^4 - 1',
      distractors: ['8', '16', '31'],
      explanation: 'One more disk doubles the previous count and adds one: 2·7 + 1 = 15.',
      hint: 'T(4) = 2·T(3) + 1.',
      concept: 'Recurrence application',
    },
    {
      id: 'hanoi-subcall-cost', weight: 3, kind: 'predict',
      bind: () => completeStep,
      prompt: 'A sub-call just reported complete. How many moves did a hanoi(d, …) sub-call make?',
      correct: '2^d - 1 moves, where d is its disk count',
      distractors: ['d moves', '2^d moves', '2d - 1 moves'],
      explanation: 'Every sub-problem is itself a full Hanoi instance on d disks, costing 2^d - 1 moves.',
      hint: 'The formula applies at every scale.',
      concept: 'Self-similarity',
    },
    {
      id: 'hanoi-stack-depth', weight: 3, kind: 'predict',
      prompt: `How deep does the call stack get for ${n} disks?`,
      correct: `${n} frames — one per disk level`,
      distractors: [`${total} frames`, `${2 * n} frames`, `${Math.pow(2, n)} frames`],
      explanation: 'The deepest chain is hanoi(n) → hanoi(n-1) → … → hanoi(1): exactly n frames, even though total moves are exponential.',
      hint: 'Depth counts nested calls, not moves.',
      concept: 'Stack depth',
    },
    {
      id: 'hanoi-peg-state', weight: 2, kind: 'predict',
      bind: () => (largest ? largest.idx : -1),
      prompt: 'At the moment the largest disk moves, what does the target peg hold?',
      correct: 'Nothing — it must be completely empty',
      distractors: ['The smallest disk', 'Half the stack', 'Disk 2'],
      explanation: 'The n-1 stack is on the auxiliary peg and the source holds only the largest disk, so the target is empty.',
      hint: 'Where did the n-1 stack go?',
      concept: 'Peg states',
    },
  ];
}

/* ── Step-based questions (asked during playback) ──────────────────── */

interface StepQuestion {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

/**
 * For "returning" steps, ask what value the call returns.
 * For "active" steps at base cases, ask what the base case returns.
 */
function buildStepQuestion(
  steps: ArrayStep[],
  stepIdx: number,
  _alg: RecursionAlgorithmKey,
): StepQuestion | null {
  const step = steps[stepIdx];
  if (!step?.variables) return null;

  const nodeLabels = labelsOf(step);
  const active     = step.comparingIndices ?? [];

  // For active base-case steps: ask what the base case returns
  if (active.length === 1) {
    const idx = active[0];
    const label = nodeLabels[idx];
    if (label && (
      label.includes('fact(0)') ||
      label.includes('fib(0)') ||
      label.includes('fib(1)') ||
      label.includes('pow(') && label.includes(',0)') ||
      label.includes('H(1,')
    )) {
      return {
        prompt: `This is a base case call: ${label}. What value does it return?`,
        correct: '1',
        distractors: ['0', '-1', 'n'],
        explanation: `The base case ${label} returns the identity value for this operation, which terminates the recursion.`,
        hint: 'What stops the recursion at this point?',
        concept: 'Base case return',
      };
    }
  }

  return null;
}

/* ── Main builder ────────────────────────────────────────────────────── */

export function buildRecursionCheckpoints(
  steps: ArrayStep[],
  algorithm: RecursionAlgorithmKey,
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const usedIndices = new Set<number>();

  interface RawQuestion {
    id: string;
    prompt: string;
    correct: string;
    distractors: string[];
    explanation: string;
    hint: string;
    concept: string;
    weight: QuizWeight;
    kind?: 'predict' | 'reason';
  }

  const place = (preferred: number, q: RawQuestion) => {
    if (preferred < 0 || preferred >= steps.length) return;
    let idx = -1;
    for (let i = preferred; i < steps.length; i++) {
      if (!usedIndices.has(i)) { idx = i; break; }
    }
    if (idx < 0) return;
    usedIndices.add(idx);
    const opts = buildOptions(q.id, q.correct, q.distractors);
    checkpoints.push({
      stepIndex: idx,
      question: { ...q, options: opts.options, correctIndex: opts.correctIndex },
    });
  };

  // 1. Anchor question at step 0
  const anchor = ANCHORS[algorithm];
  const anchorId = `recursion-${algorithm}-anchor`;
  usedIndices.add(0);
  const anchorOpts = buildOptions(anchorId, anchor.correct, anchor.distractors);
  checkpoints.push({
    stepIndex: 0,
    question: {
      id: anchorId,
      prompt: anchor.prompt,
      options: anchorOpts.options,
      correctIndex: anchorOpts.correctIndex,
      explanation: anchor.explanation,
      hint: anchor.hint,
      concept: anchor.concept,
      weight: 1 as QuizWeight,
      kind: 'reason',
    },
  });

  // 2. Curated pools for the two rebuilt algorithms.
  const pool =
    algorithm === 'power' ? buildPowerPool(steps)
    : algorithm === 'towerOfHanoi' ? buildHanoiPool(steps)
    : [];

  if (pool.length > 0) {
    for (const q of pool) {
      const preferred = q.bind ? q.bind(steps) : Math.floor(steps.length / 2);
      place(preferred, {
        id: `recursion-${algorithm}-${q.id}`,
        prompt: q.prompt,
        correct: q.correct,
        distractors: q.distractors,
        explanation: q.explanation,
        hint: q.hint,
        concept: q.concept,
        weight: q.weight,
        kind: q.kind,
      });
    }
    return checkpoints;
  }

  // 3. Legacy step-based questions — at most one every 4 steps.
  let lastAsked = 0;
  for (let i = 1; i < steps.length - 1; i++) {
    if (i - lastAsked < 4) continue;

    const q = buildStepQuestion(steps, i, algorithm);
    if (!q) continue;

    const id = `recursion-${algorithm}-step-${i}`;
    usedIndices.add(i);
    const opts = buildOptions(id, q.correct, q.distractors);
    checkpoints.push({
      stepIndex: i,
      question: {
        id,
        prompt: q.prompt,
        options: opts.options,
        correctIndex: opts.correctIndex,
        explanation: q.explanation,
        hint: q.hint,
        concept: q.concept,
        weight: 2 as QuizWeight,
      },
    });
    lastAsked = i;
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<RecursionAlgorithmKey, QuizRevisionData> = {
  factorial: {
    description: 'Compute n! by multiplying n × (n-1) × ... × 1',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Base case: fact(0) = 1; recursive: fact(n) = n × fact(n-1)',
    watchFor: ['Base case', 'Recursive decomposition', 'Stack depth'],
    quickTip: 'The recursion depth equals n—each call waits for the one below it to return',
    example: 'fact(4) = 4×fact(3) = 4×3×fact(2) = 4×3×2×fact(1) = 4×3×2×1×fact(0) = 24.',
  },
  fibonacci: {
    description: 'Compute nth Fibonacci number using recursion',
    complexity: 'O(2^n) time, O(n) space',
    keyIdea: 'fib(n) = fib(n-1) + fib(n-2) with base cases fib(0)=0, fib(1)=1',
    watchFor: ['Exponential branching', 'Overlapping subproblems', 'Memoization opportunity'],
    quickTip: 'Naive recursion recomputes the same values many times—memoization reduces to O(n)',
    example: 'fib(5) = fib(4)+fib(3) = (fib(3)+fib(2))+(fib(2)+fib(1)) = … = 5. Note fib(2) is computed 3 times.',
  },
  power: {
    description: 'Compute base^exp by halving the exponent: divide & conquer',
    complexity: 'O(log n) depth, O(log n) space',
    keyIdea: 'pow(b, e) splits into two pow(b, e÷2) sub-calls; even: half×half, odd: b×half×half',
    watchFor: ['Halving per level', 'Log-depth tree', 'Even/odd combine rules'],
    quickTip: 'Count the halvings: that is the tree depth. Doubling exp adds only one level.',
    example: '2^4 → two 2^2 → four 2^1 → eight 2^0=1; combine: 1×1=1, 1×1×2=2, 2×2=4, 4×4=16.',
  },
  arraySum: {
    description: 'Sum array elements recursively',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'sum(arr, i) = arr[i] + sum(arr, i+1) with base case i >= length returning 0',
    watchFor: ['Index progression', 'Base case (past end)', 'Accumulation pattern'],
    quickTip: 'Each recursive call handles one element—the rest is delegated to the next call',
    example: 'Array [3,1,4]: sum(arr,0) = 3+sum(arr,1) = 3+1+sum(arr,2) = 3+1+4+sum(arr,3) = 3+1+4+0 = 8.',
  },
  towerOfHanoi: {
    description: 'Move n disks from source to destination using an auxiliary peg',
    complexity: 'O(2^n) time, O(n) space',
    keyIdea: 'Move n-1 disks aside, move largest disk, move n-1 disks on top—3 recursive steps',
    watchFor: ['Three-peg logic', 'Move count (2^n - 1)', 'Peg role swapping'],
    quickTip: 'The auxiliary peg in one call becomes the destination in another—roles rotate',
    example: '3 disks: move 2 to aux (3 moves), move disk 3 to dest (1 move), move 2 to dest (3 moves) = 7 total moves.',
  },
};

export function buildRevisionData(key: RecursionAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
