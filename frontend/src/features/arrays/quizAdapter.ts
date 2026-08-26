import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion , QuizRevisionData } from '../../engine/types/Quiz';
import { buildOptions } from '../../engine/types/Quiz';

type ArrayAlgorithmKey = 'linearSearch' | 'kadane' | 'twoPointer' | 'slidingWindow' | 'rotation' | 'prefixSum';

/* ── Anchor data per algorithm ──────────────────────────────────────────
   One conceptual anchor per algorithm, asked at step 0 where the canvas
   is untouched. Mirrors the Sorting quizAdapter ANCHORS pattern.
   ───────────────────────────────────────────────────────────────────── */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<ArrayAlgorithmKey, Anchor> = {
  linearSearch: {
    prompt: 'Before it starts: what is the worst-case time complexity of Linear Search?',
    correct: 'O(n) — every element may need to be inspected',
    distractors: [
      'O(log n) — the array is halved each step',
      'O(1) — only the first element is checked',
      'O(n²) — each element is compared to every other',
    ],
    explanation:
      'Linear search scans elements one by one from left to right. In the worst case the target is absent or at the very end, requiring a full pass through all n elements.',
    hint: 'Think about what happens when the target is not in the array at all.',
    concept: 'Time complexity',
  },
  kadane: {
    prompt: "Before it starts: in Kadane's algorithm, when does currentSum reset to zero?",
    correct: 'When currentSum drops below zero, since a negative prefix cannot help a future subarray',
    distractors: [
      'At every index, to start fresh',
      'Only when a negative element is encountered',
      'When currentSum exceeds maxSum',
    ],
    explanation:
      "Kadane's algorithm tracks the maximum subarray sum ending at each position. If currentSum falls below zero, any future subarray is better off starting fresh from the next element rather than carrying the negative prefix forward.",
    hint: 'A negative running sum only hurts the next element added to it.',
    concept: 'Reset condition',
  },
  twoPointer: {
    prompt: 'Before it starts: what must be true about the array for the two-pointer sum technique to work correctly?',
    correct: 'The array must be sorted so pointer moves have predictable effects on the sum',
    distractors: [
      'The array must contain only positive integers',
      'The array must have an even number of elements',
      'The target sum must be present in the array',
    ],
    explanation:
      'The two-pointer technique relies on sortedness: moving the left pointer right increases the sum, moving the right pointer left decreases it. Without sorted order, these invariants break and the algorithm cannot guarantee correctness.',
    hint: 'What property lets you know which pointer to move after each comparison?',
    concept: 'Precondition',
  },
  slidingWindow: {
    prompt: 'Before it starts: what does a fixed-size sliding window compute in a single pass?',
    correct: 'The aggregate (e.g. sum) of every contiguous subarray of size k',
    distractors: [
      'The maximum element in the array',
      'The sorted order of each window',
      'The longest increasing subsequence',
    ],
    explanation:
      'A sliding window of size k moves one position at a time, adding the new element entering the window and removing the element leaving it. This computes each window\'s aggregate in O(1) per step, giving O(n) overall.',
    hint: 'Think about what changes between one window position and the next.',
    concept: 'Window invariant',
  },
  rotation: {
    prompt: 'Before it starts: rotating an array of size n by k positions is equivalent to rotating by how many?',
    correct: 'k mod n — rotations wrap around after n shifts',
    distractors: [
      'k * n — each rotation multiplies the offset',
      'n - k — the reverse direction',
      'k / 2 — half the rotations cancel out',
    ],
    explanation:
      'After n rotations the array returns to its original order, so only the remainder k mod n matters. A rotation of 7 on a 5-element array is the same as a rotation of 2.',
    hint: 'What happens after you rotate an array exactly n times?',
    concept: 'Modular arithmetic',
  },
  prefixSum: {
    prompt: 'Before it starts: what does prefix[i] represent in a prefix sum array?',
    correct: 'The sum of all elements from index 0 through index i',
    distractors: [
      'The sum of elements from index i to the end',
      'The maximum value up to index i',
      'The count of elements less than array[i]',
    ],
    explanation:
      'A prefix sum array stores cumulative totals: prefix[i] = arr[0] + arr[1] + … + arr[i]. This lets any range sum be computed in O(1) as prefix[right] - prefix[left - 1].',
    hint: 'Think cumulative: each entry accumulates everything before it plus itself.',
    concept: 'Prefix definition',
  },
};

/* ── Mid-execution question generators ──────────────────────────────────
   For the ~40% checkpoint, generate an algorithm-specific prediction
   question based on the current step state.
   ───────────────────────────────────────────────────────────────────── */

function getMidQuestion(
  algorithm: ArrayAlgorithmKey,
  step: ArrayStep,
  _stepIndex: number
): QuizQuestion {
  const { array, comparingIndices = [], variables = {} } = step;

  switch (algorithm) {
    case 'linearSearch': {
      const currentIdx = typeof variables.i === 'number' ? variables.i : comparingIndices[0] ?? 0;
      const target = typeof variables.target === 'number' ? variables.target : null;
      const currentVal = array[currentIdx] ?? 0;
      const isMatch = target !== null && currentVal === target;
      const id = `arrays-${algorithm}-mid`;
      const built = buildOptions(
        id,
        isMatch
          ? 'The target is found at the current index'
          : 'Move to the next element and continue searching',
        [
          isMatch
            ? 'Move to the next element and continue searching'
            : 'The target is found at the current index',
          'The search terminates early with not-found',
        ]
      );
      return {
        id,
        prompt: `Inspecting index ${currentIdx} (value ${currentVal}). What happens next?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: isMatch
          ? `The value ${currentVal} matches the target, so the search returns index ${currentIdx}.`
          : `The value ${currentVal} does not match the target, so the search advances to index ${currentIdx + 1}.`,
        hint: 'Compare the current element with the target value.',
        concept: 'Match check',
        weight: 2,
      };
    }

    case 'kadane': {
      const currentSum = typeof variables.currentSum === 'number' ? variables.currentSum : 0;
      const id = `arrays-${algorithm}-mid`;
      const willReset = currentSum < 0;
      const built = buildOptions(
        id,
        willReset
          ? 'Reset currentSum to 0 and start a new subarray'
          : 'Extend the current subarray with this element',
        [
          willReset
            ? 'Extend the current subarray with this element'
            : 'Reset currentSum to 0 and start a new subarray',
          'Update maxSum and terminate the algorithm',
        ]
      );
      return {
        id,
        prompt: `currentSum is ${currentSum}. What does Kadane's algorithm do at this step?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: willReset
          ? 'currentSum is negative, so starting fresh from the next element yields a better subarray than extending with a negative prefix.'
          : 'currentSum is non-negative, so including the current element can only maintain or improve the running subarray sum.',
        hint: 'A negative currentSum hurts any future subarray it is prepended to.',
        concept: 'Subarray extension',
        weight: 2,
      };
    }

    case 'twoPointer': {
      const left = typeof variables.left === 'number' ? variables.left : 0;
      const right = typeof variables.right === 'number' ? variables.right : array.length - 1;
      const sum = (array[left] ?? 0) + (array[right] ?? 0);
      const targetSum = typeof variables.targetSum === 'number' ? variables.targetSum : 0;
      const id = `arrays-${algorithm}-mid`;
      const moveLeft = sum < targetSum;
      const built = buildOptions(
        id,
        moveLeft
          ? 'Move the left pointer right to increase the sum'
          : 'Move the right pointer left to decrease the sum',
        [
          moveLeft
            ? 'Move the right pointer left to decrease the sum'
            : 'Move the left pointer right to increase the sum',
          'Both pointers move inward simultaneously',
        ]
      );
      return {
        id,
        prompt: `left=${left}, right=${right}, current sum=${sum}, target=${targetSum}. Which pointer moves?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: moveLeft
          ? `The sum ${sum} is less than the target ${targetSum}. In a sorted array, moving the left pointer right replaces a smaller value with a larger one, increasing the sum.`
          : `The sum ${sum} is greater than the target ${targetSum}. Moving the right pointer left replaces a larger value with a smaller one, decreasing the sum.`,
        hint: 'In a sorted array, which pointer move changes the sum in the direction you need?',
        concept: 'Pointer movement',
        weight: 2,
      };
    }

    case 'slidingWindow': {
      const windowStart = typeof variables.windowStart === 'number' ? variables.windowStart : 0;
      const windowEnd = typeof variables.windowEnd === 'number' ? variables.windowEnd : 0;
      const id = `arrays-${algorithm}-mid`;
      const built = buildOptions(
        id,
        'Add the new element and subtract the element leaving the window',
        [
          'Recompute the entire window sum from scratch',
          'Only add the new element entering the window',
          'Double the previous window sum',
        ]
      );
      return {
        id,
        prompt: `Window spans indices ${windowStart}–${windowEnd}. How is the next window sum computed?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: 'The sliding window technique achieves O(n) by updating the sum incrementally: add the element entering the window and subtract the element leaving it, avoiding a full re-sum.',
        hint: 'Only two elements change between consecutive windows.',
        concept: 'Window slide',
        weight: 2,
      };
    }

    case 'rotation': {
      const currentRot = typeof variables.currentRotation === 'number' ? variables.currentRotation : 0;
      const totalRot = typeof variables.totalRotations === 'number' ? variables.totalRotations : 0;
      const id = `arrays-${algorithm}-mid`;
      const built = buildOptions(
        id,
        'Move the last element to the front and shift everything else right',
        [
          'Move the first element to the end and shift everything else left',
          'Swap the first and last elements only',
          'Reverse the entire array in place',
        ]
      );
      return {
        id,
        prompt: `Rotation ${currentRot} of ${totalRot}. What does one right-rotation step do?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: 'A right rotation takes the last element and places it at index 0, shifting every other element one position to the right. Repeating this k times produces the final rotated array.',
        hint: 'Think about which end of the array wraps around to the other.',
        concept: 'Rotation step',
        weight: 2,
      };
    }

    case 'prefixSum': {
      const idx = typeof variables.i === 'number' ? variables.i : 0;
      const id = `arrays-${algorithm}-mid`;
      const built = buildOptions(
        id,
        'Add the current element to the running cumulative total',
        [
          'Multiply the running total by the current element',
          'Replace the running total with the current element',
          'Subtract the current element from the running total',
        ]
      );
      return {
        id,
        prompt: `Computing prefix sum at index ${idx}. How is prefix[${idx}] derived?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `prefix[${idx}] = prefix[${idx - 1}] + arr[${idx}]. Each prefix sum entry is built by adding the current element to the previous cumulative total, giving O(1) per entry.`,
        hint: 'Each entry in the prefix sum array builds on the one before it.',
        concept: 'Cumulative sum',
        weight: 2,
      };
    }
  }
}

/* ── Main adapter entry point ────────────────────────────────────────── */

export function buildArraysCheckpoints(
  steps: ArrayStep[],
  algorithm: ArrayAlgorithmKey
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const anchor = ANCHORS[algorithm];

  // Anchor question at step 0
  const anchorId = `arrays-${algorithm}-anchor`;
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

  // Mid-execution question at ~40% of steps
  if (steps.length > 5) {
    const midIdx = Math.floor(steps.length * 0.4);
    const midStep = steps[midIdx];
    const midQ = getMidQuestion(algorithm, midStep, midIdx);
    checkpoints.push({ stepIndex: midIdx, question: midQ });
  }

  // Late-execution reinforcement at ~75% for larger executions
  if (steps.length > 12) {
    const lateIdx = Math.floor(steps.length * 0.75);
    const lateStep = steps[lateIdx];
    const lateQ = getMidQuestion(algorithm, lateStep, lateIdx);
    lateQ.id = `${lateQ.id}-late`;
    lateQ.weight = 3;
    checkpoints.push({ stepIndex: lateIdx, question: lateQ });
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<ArrayAlgorithmKey, QuizRevisionData> = {
  linearSearch: {
    description: 'Scan through array elements one by one to find a target',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Check each element sequentially until the target is found or array ends',
    watchFor: ['Worst case scenario', 'Early termination', 'Comparison with binary search'],
    quickTip: 'Linear search works on unsorted data but is slow for large arrays',
  },
  kadane: {
    description: 'Find the contiguous subarray with the maximum sum',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'A negative running sum cannot help future elements—reset when sum < 0',
    watchFor: ['Reset condition', 'Current sum vs max sum tracking', 'All negative case'],
    quickTip: 'If current sum drops below zero, start fresh from the next element',
  },
  twoPointer: {
    description: 'Use two pointers moving inward to find a pair summing to target',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'In a sorted array, moving left pointer right increases sum, moving right pointer left decreases it',
    watchFor: ['Sorted array requirement', 'Pointer movement logic', 'When to stop'],
    quickTip: 'Requires sorted input—if sum too small move left pointer right, if too large move right pointer left',
  },
  slidingWindow: {
    description: 'Maintain a window of size k and slide it across the array',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'When window slides by 1, only one element enters and one leaves—update in O(1)',
    watchFor: ['Window size', 'Element entering vs leaving', 'Initial window setup'],
    quickTip: 'Compute the first window fully, then update by adding new element and removing old',
  },
  rotation: {
    description: 'Rotate array elements by k positions',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Rotation by k is equivalent to rotation by k mod n',
    watchFor: ['Modulo arithmetic', 'Reversal technique', 'Direction of rotation'],
    quickTip: 'Use the reversal algorithm: reverse all, reverse first k, reverse rest',
  },
  prefixSum: {
    description: 'Build cumulative sum array for O(1) range sum queries',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'prefix[i] = arr[0] + arr[1] + ... + arr[i], enabling range queries',
    watchFor: ['Prefix array construction', 'Range sum formula', 'Index off-by-one'],
    quickTip: 'Range sum from L to R is prefix[R] - prefix[L-1] (handle L=0 specially)',
  },
};

export function buildRevisionData(key: ArrayAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
