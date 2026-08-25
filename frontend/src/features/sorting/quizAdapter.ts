import type { ArrayStep } from '../../engine/types/Step';
import { buildOptions, type QuizCheckpoint, type QuizWeight } from '../../engine/types/Quiz';

/* ── Sorting quiz adapter ──────────────────────────────────────────────
   Sorting had no quiz data of any kind: SortingPage derived one
   swap-or-not question inline and printed the deciding comparison on the
   buttons (`SWAP (42 > 17)`), so the student answered by reading which
   inequality was already true.

   This selector reads the existing `ArrayStep` stream instead — the seven
   algorithm files are untouched. Every checkpoint sits on step i and asks
   what step i+1 will do, so the canvas the student is looking at is
   exactly the state the question is about, and Continue reveals the
   answer by advancing one step.

   Question types are chosen per algorithm from what that algorithm
   actually emits, and only where BOTH outcomes occur. Insertion and
   shell sort, for instance, emit a comparison step only when the shift
   happens (`insertionSort.ts:31` — the push is inside the while body), so
   "does it shift?" would always be yes there; they get questions whose
   answer genuinely varies instead.
   ─────────────────────────────────────────────────────────────────── */

export type SortingAlgorithmKey =
  | 'bubble'
  | 'selection'
  | 'insertion'
  | 'merge'
  | 'quick'
  | 'heap'
  | 'shell';

/** SortingRenderer.tsx:138 stops drawing `[i]` labels past this size, so
 *  an index-based question is unanswerable on bigger arrays. */
const INDEX_LABEL_LIMIT = 30;

type Kind = 'compare' | 'partition' | 'minimum' | 'lockIn' | 'landing' | 'shift' | 'midpoint';

/** Derived question types per algorithm, in placement priority order. */
const KINDS: Record<SortingAlgorithmKey, readonly Kind[]> = {
  bubble: ['lockIn', 'compare'],
  selection: ['lockIn', 'minimum'],
  quick: ['lockIn', 'partition'],
  heap: ['lockIn'],
  insertion: ['landing'],
  shell: ['shift'],
  merge: ['midpoint'],
};

/* ── Conceptual anchor ─────────────────────────────────────────────────
   One per algorithm, on step 0 where the canvas is untouched. Weight 1,
   so Light cadence asks exactly this and nothing else. */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<SortingAlgorithmKey, Anchor> = {
  bubble: {
    prompt: 'Before it starts: what does one full pass of bubble sort guarantee?',
    correct: 'The largest unsorted value reaches the end of the unsorted region',
    distractors: [
      'The array becomes fully sorted',
      'The smallest value reaches index 0',
      'Exactly one swap takes place',
    ],
    explanation:
      'A pass compares every adjacent pair and swaps whenever they are out of order, which carries the largest value all the way right. That is why exactly one element locks in per pass, and why n-1 passes are enough.',
    hint: 'Follow one large value as adjacent pairs are compared left to right. Where can it end up?',
    concept: 'Pass invariant',
  },
  selection: {
    prompt: 'Before it starts: how many times does selection sort write to the array in one pass?',
    correct: 'At most once — a single swap at the end of the pass',
    distractors: ['Once per comparison', 'Never — it only reorders indices', 'Twice per comparison'],
    explanation:
      'A pass only scans for the minimum, tracking its index in minIdx. The array is written once, when that minimum is swapped into place. Few writes is selection sort’s one real advantage over bubble sort.',
    hint: 'Scanning for the smallest value does not require moving anything.',
    concept: 'Write cost',
  },
  insertion: {
    prompt:
      'Before it starts: what is true of the region left of the current key, but not of the whole array?',
    correct: 'It is sorted among itself, though not necessarily in final position',
    distractors: [
      'It is sorted and every element is already in its final position',
      'It is untouched from the original array',
      'It holds the smallest values in the array',
    ],
    explanation:
      'Insertion sort grows a sorted prefix one element at a time. The prefix is internally sorted, but an element not reached yet can still be smaller than everything in it, which would shift the whole prefix right.',
    hint: 'A value further right could still be smaller than everything scanned so far.',
    concept: 'Sorted prefix',
  },
  merge: {
    prompt:
      'Before it starts: why can two sorted halves be merged in a single left-to-right scan?',
    correct: 'The next smallest value overall is always at the front of one of the two halves',
    distractors: [
      'Because the two halves are the same length',
      'Because merging re-sorts each half as it goes',
      'Because the halves have no values in common',
    ],
    explanation:
      'Sortedness means each half’s smallest remaining value is its front element, so comparing just those two fronts is enough to choose the next output value. That is what makes a merge O(n) rather than O(n log n).',
    hint: 'You never have to look at more than one element from each half.',
    concept: 'Merge invariant',
  },
  quick: {
    prompt: 'Before it starts: what is true of the pivot once one partition finishes?',
    correct: 'It sits in its final sorted position and never moves again',
    distractors: [
      'It sits at the midpoint of the range',
      'It becomes the pivot for the left half too',
      'It is compared again during the next partition',
    ],
    explanation:
      'Partitioning puts every smaller value left of the pivot and every larger value right of it — which is exactly the pivot’s sorted position. Recursion can then ignore it and sort only the two sides.',
    hint: 'After partitioning, nothing left of the pivot is larger and nothing right of it is smaller.',
    concept: 'Partitioning',
  },
  heap: {
    prompt: 'Before it starts: what does the max-heap property guarantee?',
    correct: 'The largest remaining value is at the root, index 0',
    distractors: [
      'The array is sorted from index 0 upward',
      'Each level of the heap is sorted left to right',
      'The smallest remaining value is at the last index',
    ],
    explanation:
      'A max-heap only requires every parent to be at least as large as its children, which forces the maximum to the root. Heap sort repeatedly swaps that root to the end and re-heapifies the shrinking prefix.',
    hint: 'A heap is not a sorted array. Think about what the parent-child rule forces at the very top.',
    concept: 'Heap property',
  },
  shell: {
    prompt: 'Before it starts: what does sorting at a large gap accomplish?',
    correct: 'It moves far-out-of-place values most of the way home in very few writes',
    distractors: [
      'It puts every gap-th element into its final position',
      'It leaves the array fully sorted once the first gap finishes',
      'It removes the need for any later pass',
    ],
    explanation:
      'Plain insertion sort moves a value one slot per write, so a value far from home is expensive. Large gaps let it jump many positions at once, leaving the final gap-of-1 pass with very little left to do.',
    hint: 'Compare how far one write can move a value at gap 6 versus at gap 1.',
    concept: 'Gap sequence',
  },
};

/* ── Lock-in wording ───────────────────────────────────────────────────
   Four algorithms lock exactly one position per outer iteration, and the
   *reason* differs in each — which is the whole point of asking. */

const LOCK_IN_COPY: Partial<
  Record<SortingAlgorithmKey, { prompt: string; explanation: (index: number) => string; hint: string }>
> = {
  bubble: {
    prompt: 'This pass is ending. Which position is now guaranteed to hold its final value?',
    explanation: (index) =>
      `Index ${index}. A pass carries the largest unsorted value to the far right of the unsorted region, so the rightmost unsorted position is the one that locks in.`,
    hint: 'Adjacent swaps push large values right. Which end of the unsorted region benefits?',
  },
  selection: {
    prompt: 'This pass is ending. Which position is now guaranteed to hold its final value?',
    explanation: (index) =>
      `Index ${index}. The pass scanned for the smallest remaining value and swapped it into the first unsorted slot, so that slot is done.`,
    hint: 'The pass found the minimum. Where does a minimum belong?',
  },
  quick: {
    prompt: 'Partitioning is finishing. Which position will the pivot end up in?',
    explanation: (index) =>
      `Index ${index}. The pivot goes directly after the last value smaller than it, so its final index is the range start plus the count of smaller values.`,
    hint: 'Count the values in this range that are smaller than the pivot.',
  },
  heap: {
    prompt: 'The heap root holds the largest remaining value. Which position does it move into?',
    explanation: (index) =>
      `Index ${index}. Heap sort swaps the root with the last slot of the current heap, shrinks the heap by one, and re-heapifies — so the largest value lands at the end of the unsorted region.`,
    hint: 'The heap shrinks by one each round. Which slot leaves the heap?',
  },
};

/** Quick sort and heap sort also mark indices sorted without an
 *  explaining step (`quickSort.ts:27` pushes `low` for a single-element
 *  range silently), so require a visible swap on the revealing step. */
const LOCK_IN_NEEDS_SWAP = new Set<SortingAlgorithmKey>(['quick', 'heap']);

/* ── Derivation helpers ──────────────────────────────────────────────── */

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function hasSwap(step: ArrayStep): boolean {
  return (step.swappingIndices?.length ?? 0) > 0;
}

/** Did anything actually move between these two steps? A self-swap
 *  leaves the array identical, so check the flag as well as the values. */
function moves(current: ArrayStep, next: ArrayStep): boolean {
  return hasSwap(next) || !arraysEqual(current.array, next.array);
}

/** The single index that becomes final on the transition, if exactly one
 *  does. The closing "all sorted" step adds every remaining index at once
 *  and is deliberately excluded. */
function newlySorted(current: ArrayStep, next: ArrayStep): number | null {
  const before = new Set(current.sortedIndices ?? []);
  const added = (next.sortedIndices ?? []).filter((index) => !before.has(index));
  return added.length === 1 ? added[0] : null;
}

function numberVar(step: ArrayStep, key: string): number | null {
  const value = step.variables?.[key];
  return typeof value === 'number' ? value : null;
}

function indexLabel(index: number): string {
  return `Index ${index}`;
}

/**
 * Build an index-answer option set. `candidates` is an ordered preference
 * list of distractors; the caller decides which indices are legitimate
 * alternatives. Returns null when no usable distractor exists.
 */
function indexOptions(
  id: string,
  correct: number,
  candidates: number[],
  size: number
): { options: string[]; correctIndex: number } | null {
  const seen = new Set<number>([correct]);
  const kept: number[] = [];
  for (const candidate of candidates) {
    if (kept.length === 3) break;
    if (candidate < 0 || candidate >= size || seen.has(candidate)) continue;
    seen.add(candidate);
    kept.push(candidate);
  }
  if (kept.length === 0) return null;
  return buildOptions(id, indexLabel(correct), kept.map(indexLabel));
}

/** Nearest-neighbour indices first: an off-by-one is the mistake worth
 *  catching, and the ends of the range catch a wrong mental model. */
function nearbyIndices(correct: number, size: number): number[] {
  return [correct - 1, correct + 1, correct - 2, correct + 2, 0, size - 1];
}

/** Weight by how many of this kind have already been placed: the first
 *  three reinforce (Normal), the rest are drilling (Intensive). */
function weightFor(occurrence: number): QuizWeight {
  return occurrence < 3 ? 2 : 3;
}

/** Insertion sort's own answer, taken from the step that performs the
 *  insert, so a question can never disagree with the visualization. */
function insertionLanding(steps: ArrayStep[], from: number): number | null {
  for (let k = from + 1; k < steps.length; k++) {
    const inserted = numberVar(steps[k], 'insertedAt');
    if (inserted !== null) return inserted;
  }
  return null;
}

/** A step that selects an element to insert, rather than compare or
 *  shift one. Shared by insertion sort and shell sort. */
function isSelectionStep(step: ArrayStep): boolean {
  return (
    step.pivotIndex !== undefined &&
    (step.comparingIndices?.length ?? 0) === 0 &&
    !hasSwap(step)
  );
}

/** Merge sort's divide steps highlight the whole range being split
 *  (`mergeSort.ts:21`); its merge comparisons highlight exactly two
 *  positions. Ranges of three or more are therefore unambiguous. */
function dividedRange(step: ArrayStep): { left: number; right: number } | null {
  const highlighted = step.comparingIndices ?? [];
  if (highlighted.length < 3) return null;
  for (let k = 1; k < highlighted.length; k++) {
    if (highlighted[k] !== highlighted[k - 1] + 1) return null;
  }
  return { left: highlighted[0], right: highlighted[highlighted.length - 1] };
}

/* ── Selector ──────────────────────────────────────────────────────────── */

/**
 * Pick instructive checkpoints out of a generated sorting execution.
 *
 * @param steps the `ArrayStep[]` produced by any of the seven algorithms
 * @param algorithm which one produced them
 */
export function buildSortingCheckpoints(
  steps: ArrayStep[],
  algorithm: SortingAlgorithmKey
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const size = steps[0].array.length;
  const kinds = KINDS[algorithm];
  const anchor = ANCHORS[algorithm];
  const checkpoints: QuizCheckpoint[] = [];

  const anchorId = `sorting-${algorithm}-anchor`;
  const anchorOptions = buildOptions(anchorId, anchor.correct, anchor.distractors);
  checkpoints.push({
    stepIndex: 0,
    question: {
      id: anchorId,
      prompt: anchor.prompt,
      options: anchorOptions.options,
      correctIndex: anchorOptions.correctIndex,
      explanation: anchor.explanation,
      hint: anchor.hint,
      concept: anchor.concept,
      weight: 1,
    },
  });

  /* Index-answer questions need the renderer's `[i]` labels. */
  const indexQuestionsUsable = size > 0 && size <= INDEX_LABEL_LIMIT;

  /* Where a lock-in question can go, computed up front so a cheaper
     question is not placed one step earlier and blocked by the spacing
     rule below — for bubble sort that would suppress lock-ins almost
     every pass, since the last comparison of a pass usually swaps. */
  const lockInSteps = new Set<number>();
  if (kinds.includes('lockIn') && indexQuestionsUsable) {
    for (let index = 1; index < steps.length - 1; index++) {
      const next = steps[index + 1];
      if (LOCK_IN_NEEDS_SWAP.has(algorithm) && !hasSwap(next)) continue;
      if (newlySorted(steps[index], next) !== null) lockInSteps.add(index);
    }
  }

  const counts: Record<Kind, number> = {
    compare: 0,
    partition: 0,
    minimum: 0,
    lockIn: 0,
    landing: 0,
    shift: 0,
    midpoint: 0,
  };

  /* At least one uninterrupted step between questions — back-to-back
     prompts turn the visualization into a form to fill in. */
  let lastAsked = 0;

  for (let index = 1; index < steps.length - 1; index++) {
    if (index - lastAsked < 2) continue;

    const current = steps[index];
    const next = steps[index + 1];

    /* ── Which position becomes final? ── */
    if (lockInSteps.has(index)) {
      const locked = newlySorted(current, next);
      const copy = LOCK_IN_COPY[algorithm];
      if (locked !== null && copy) {
        const sorted = new Set(current.sortedIndices ?? []);
        const id = `sorting-${algorithm}-lock-${index}`;
        /* Only positions still in play are honest alternatives. */
        const built = indexOptions(
          id,
          locked,
          nearbyIndices(locked, size).filter((candidate) => !sorted.has(candidate)),
          size
        );
        if (built) {
          checkpoints.push({
            stepIndex: index,
            question: {
              id,
              prompt: copy.prompt,
              options: built.options,
              correctIndex: built.correctIndex,
              explanation: copy.explanation(locked),
              hint: copy.hint,
              concept: 'Final position',
              weight: weightFor(counts.lockIn),
            },
          });
          counts.lockIn += 1;
          lastAsked = index;
          continue;
        }
      }
    }

    /* Leave the step before a lock-in free for it. */
    if (lockInSteps.has(index + 1)) continue;

    /* ── Bubble sort: swap this adjacent pair or not? ── */
    if (kinds.includes('compare')) {
      const pair = current.comparingIndices ?? [];
      if (pair.length === 2 && pair.every((i) => i >= 0 && i < size)) {
        const willSwap = moves(current, next);
        const id = `sorting-${algorithm}-compare-${index}`;
        const built = buildOptions(
          id,
          willSwap ? 'Swap them' : 'Leave them and move on',
          [
            willSwap ? 'Leave them and move on' : 'Swap them',
            'Mark the larger one as sorted and skip past it',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `Indices ${pair[0]} and ${pair[1]} are being compared. What happens next?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willSwap
              ? 'The earlier index holds the larger value, which breaks ascending order, so the pair is swapped and the larger value keeps moving right.'
              : 'The pair is already in ascending order relative to each other, so nothing moves and the scan continues to the next pair.',
            hint: 'Read the two highlighted bars, then ask which value an ascending sort wants first.',
            concept: 'Comparison rule',
            weight: weightFor(counts.compare),
          },
        });
        counts.compare += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Quick sort: does this value belong in the left partition? ── */
    if (kinds.includes('partition')) {
      const pair = current.comparingIndices ?? [];
      const j = numberVar(current, 'j');
      if (pair.length === 2 && j !== null && j >= 0 && j < size) {
        /* A swap on the next step is the loop's swap only if it is not
           the pivot being dropped into place at the end of the loop. */
        const isPivotPlacement = numberVar(next, 'pivotPlacedAt') !== null;
        const willMove = hasSwap(next) && !isPivotPlacement;
        const id = `sorting-${algorithm}-partition-${index}`;
        const built = buildOptions(
          id,
          willMove
            ? 'Move it into the region of smaller values'
            : 'Leave it where it is and advance',
          [
            willMove
              ? 'Leave it where it is and advance'
              : 'Move it into the region of smaller values',
            'Swap it with the pivot itself',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `The value at index ${j} is being compared with the pivot. What does partitioning do with it?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willMove
              ? 'It is smaller than the pivot, so it belongs on the pivot’s left. The boundary i advances and this value is swapped down into the smaller-value region.'
              : 'It is not smaller than the pivot, so it already belongs on the pivot’s right. The boundary i does not move and the scan advances.',
            hint: 'Compare this bar against the pivot bar. Which side of the pivot does it belong on?',
            concept: 'Partitioning',
            weight: weightFor(counts.partition),
          },
        });
        counts.partition += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Selection sort: does minIdx move to this candidate? ── */
    if (kinds.includes('minimum')) {
      const currentMin = numberVar(current, 'minIdx');
      const pair = current.comparingIndices ?? [];
      const candidate = currentMin === null ? undefined : pair.find((i) => i !== currentMin);
      if (currentMin !== null && candidate !== undefined) {
        /* selectionSort.ts:49 renames the variable to `newMinIdx` on the
           step that moves it, which is the cleanest signal available. */
        const willMove = numberVar(next, 'newMinIdx') !== null;
        const id = `sorting-${algorithm}-min-${index}`;
        const built = buildOptions(
          id,
          willMove
            ? `Yes — minIdx moves to index ${candidate}`
            : `No — minIdx stays at index ${currentMin}`,
          [
            willMove
              ? `No — minIdx stays at index ${currentMin}`
              : `Yes — minIdx moves to index ${candidate}`,
            'The two values are swapped straight away',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `minIdx points at index ${currentMin}. After comparing it with index ${candidate}, does minIdx change?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willMove
              ? `The candidate is smaller than the value minIdx currently points at, so minIdx moves to index ${candidate}. Nothing is swapped yet — selection sort waits until the pass ends.`
              : `The candidate is not smaller than the value minIdx currently points at, so minIdx is unchanged and the scan carries on.`,
            hint: 'minIdx moves only when the scan finds something strictly smaller than what it already holds.',
            concept: 'Minimum tracking',
            weight: weightFor(counts.minimum),
          },
        });
        counts.minimum += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Insertion sort: where does this key land? ── */
    if (kinds.includes('landing') && indexQuestionsUsable && isSelectionStep(current)) {
      const key = numberVar(current, 'key');
      const from = current.pivotIndex;
      const landing = insertionLanding(steps, index);
      if (key !== null && from !== undefined && landing !== null && landing !== from) {
        const id = `sorting-${algorithm}-landing-${index}`;
        /* Every position in the sorted prefix, plus the key's own slot,
           is a legitimate answer here. */
        const built = indexOptions(
          id,
          landing,
          [...nearbyIndices(landing, from + 1), from],
          from + 1
        );
        if (built) {
          checkpoints.push({
            stepIndex: index,
            question: {
              id,
              prompt: `The key ${key} at index ${from} is about to be inserted into the sorted region on its left. Which index does it land at?`,
              options: built.options,
              correctIndex: built.correctIndex,
              explanation: `Index ${landing}. Everything larger than ${key} shifts one place right, so the key settles just after the last value that is not larger than it.`,
              hint: 'Scan the sorted region right to left and stop at the first value that is not larger than the key.',
              concept: 'Insertion point',
              weight: weightFor(counts.landing),
            },
          });
          counts.landing += 1;
          lastAsked = index;
          continue;
        }
      }
    }

    /* ── Shell sort: does this element move at the current gap? ── */
    if (kinds.includes('shift') && isSelectionStep(current)) {
      const from = current.pivotIndex;
      if (from !== undefined) {
        /* A comparison step follows only when the while condition held,
           i.e. only when a shift is about to happen. */
        const willShift = (next.comparingIndices?.length ?? 0) > 0;
        const id = `sorting-${algorithm}-shift-${index}`;
        const built = buildOptions(
          id,
          willShift
            ? 'Yes — it shifts left along the gap'
            : 'No — it is already in order within its gapped subsequence',
          [
            willShift
              ? 'No — it is already in order within its gapped subsequence'
              : 'Yes — it shifts left along the gap',
            'It swaps with the element immediately to its left',
          ]
        );

        checkpoints.push({
          stepIndex: index,
          question: {
            id,
            prompt: `The element at index ${from} is being inserted into its gapped subsequence. Does it move?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willShift
              ? 'The element one gap to its left is larger, so that larger value shifts right and this element keeps stepping left by one gap at a time.'
              : 'The element one gap to its left is not larger, so this element is already correctly placed within its gapped subsequence and nothing moves.',
            hint: 'Shell sort only ever compares along the gap, never with the immediate neighbour.',
            concept: 'Gapped insertion',
            weight: weightFor(counts.shift),
          },
        });
        counts.shift += 1;
        lastAsked = index;
        continue;
      }
    }

    /* ── Merge sort: where does this range split? ── */
    if (kinds.includes('midpoint') && indexQuestionsUsable) {
      const range = dividedRange(current);
      if (range) {
        const midpoint = range.left + Math.floor((range.right - range.left) / 2);
        const id = `sorting-${algorithm}-midpoint-${index}`;
        const built = indexOptions(
          id,
          midpoint,
          [midpoint + 1, midpoint - 1, range.right, range.left],
          size
        );
        if (built) {
          checkpoints.push({
            stepIndex: index,
            question: {
              id,
              prompt: `The highlighted range ${range.left}–${range.right} is being divided. Which index is the last one in the left half?`,
              options: built.options,
              correctIndex: built.correctIndex,
              explanation: `Index ${midpoint}. Merge sort splits by position, never by value: the midpoint is the range start plus half its length, rounded down, so the left half gets the extra element when the length is odd.`,
              hint: 'Count how many positions the range covers, then halve it — the values in the bars are irrelevant here.',
              concept: 'Divide step',
              weight: weightFor(counts.midpoint),
            },
          });
          counts.midpoint += 1;
          lastAsked = index;
        }
      }
    }
  }

  return checkpoints;
}
