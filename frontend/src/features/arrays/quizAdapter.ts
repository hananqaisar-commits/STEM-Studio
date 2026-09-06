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

const ANCHORS: Record<ArrayAlgorithmKey, Anchor[]> = {
  linearSearch: [
    {
      prompt: 'What is the worst-case time complexity of Linear Search?',
      correct: 'O(n) — every element may need to be inspected',
      distractors: [
        'O(log n) — the search range is halved each step',
        'O(1) — only one element is checked',
        'O(n²) — every element is compared with every other element',
      ],
      explanation:
        'Linear Search checks elements one by one. In the worst case the target is absent or is the last element, so all n elements are inspected.',
      hint: 'Think about the case where the target is at the end or missing.',
      concept: 'Worst-case complexity',
    },
    {
      prompt: 'What is the best-case time complexity of Linear Search?',
      correct: 'O(1) — the target is found at the first position',
      distractors: [
        'O(log n) — the array is repeatedly halved',
        'O(n) — every element is always inspected',
        'O(n²) — nested comparisons are required',
      ],
      explanation:
        'If the first element already matches the target, Linear Search stops immediately after one comparison.',
      hint: 'What happens when the target is the very first element?',
      concept: 'Best-case complexity',
    },
    {
      prompt: 'What allows Linear Search to stop before reaching the end of the array?',
      correct: 'Finding the target at the current index',
      distractors: [
        'The array becoming sorted',
        'The current value becoming larger than the target in every case',
        'Reaching the middle of the array',
      ],
      explanation:
        'Linear Search can terminate immediately when the current element equals the target.',
      hint: 'Look at the equality check performed at each index.',
      concept: 'Early termination',
    },
    {
      prompt: 'What happens if the target does not exist in the array?',
      correct: 'The algorithm checks all candidates and returns not-found',
      distractors: [
        'It always returns index 0',
        'It automatically sorts the array first',
        'It switches to Binary Search',
      ],
      explanation:
        'Without a matching value, Linear Search continues until the final element and then reports that the target is absent.',
      hint: 'What condition ends the loop when no match is found?',
      concept: 'Absent target',
    },
    {
      prompt: 'Which input condition does Linear Search NOT require?',
      correct: 'The array does not need to be sorted',
      distractors: [
        'A target value to compare against',
        'Ability to inspect array elements',
        'A valid sequence of elements',
      ],
      explanation:
        'Linear Search works on sorted or unsorted arrays because it does not rely on ordering to eliminate parts of the search space.',
      hint: 'Does Linear Search use ordering to decide which half to ignore?',
      concept: 'Precondition',
    },
  ],

  kadane: [
    {
      prompt: "In Kadane's algorithm, when should currentSum be reset to zero?",
      correct: 'When currentSum becomes negative',
      distractors: [
        'Whenever a negative element appears',
        'Whenever currentSum exceeds maxSum',
        'At every new index',
      ],
      explanation:
        'A negative running sum can only reduce the sum of any future subarray, so Kadane starts fresh after currentSum drops below zero.',
      hint: 'Ask whether carrying a negative prefix can ever help a future sum.',
      concept: 'Reset condition',
    },
    {
      prompt: "What does Kadane's maxSum represent?",
      correct: 'The largest subarray sum found so far',
      distractors: [
        'The current running sum only',
        'The largest individual element only',
        'The total sum of the entire array',
      ],
      explanation:
        'maxSum stores the best contiguous-subarray sum encountered during the scan.',
      hint: 'Compare the running candidate with the best answer seen so far.',
      concept: 'State meaning',
    },
    {
      prompt: "What is Kadane's time complexity for an array of n elements?",
      correct: 'O(n) — one pass through the array',
      distractors: [
        'O(log n)',
        'O(n²)',
        'O(2^n)',
      ],
      explanation:
        'Kadane updates the running sum and best answer once per element, so it runs in linear time.',
      hint: 'How many times does the algorithm process each array position?',
      concept: 'Time complexity',
    },
    {
      prompt: 'How should Kadane behave on an all-negative array in the standard non-empty-subarray version?',
      correct: 'Return the largest (least negative) element',
      distractors: [
        'Always return zero',
        'Always return the total array sum',
        'Return the smallest (most negative) element',
      ],
      explanation:
        'For a non-empty maximum-subarray problem, the best answer among all-negative values is the single largest element.',
      hint: 'A non-empty subarray cannot simply disappear when every value is negative.',
      concept: 'Edge case',
    },
    {
      prompt: "Why can Kadane discard a negative prefix?",
      correct: 'A negative prefix makes every future extension worse',
      distractors: [
        'Negative numbers are invalid input',
        'The array must contain only positive values',
        'The prefix is always sorted incorrectly',
      ],
      explanation:
        'Adding a negative prefix to a future positive continuation lowers that future subarray sum, so starting fresh is better.',
      hint: 'Compare x with x + negative_value.',
      concept: 'Greedy invariant',
    },
  ],

  twoPointer: [
    {
      prompt: 'What key condition makes the classic two-pointer sum technique correct?',
      correct: 'The array is sorted',
      distractors: [
        'The array must contain only positive values',
        'The array length must be even',
        'The target must equal an array element',
      ],
      explanation:
        'Sorted order gives pointer movements predictable effects: moving left right increases the sum, while moving right left decreases it.',
      hint: 'What property tells you which pointer to move after a comparison?',
      concept: 'Precondition',
    },
    {
      prompt: 'If the current pair sum is smaller than the target, which pointer moves in the classic sorted-array approach?',
      correct: 'Move the left pointer right',
      distractors: [
        'Move the right pointer left',
        'Move both pointers outward',
        'Do not move either pointer',
      ],
      explanation:
        'Moving the left pointer right replaces a smaller value with a larger one, increasing the pair sum.',
      hint: 'You need the sum to become larger.',
      concept: 'Pointer movement',
    },
    {
      prompt: 'If the current pair sum is larger than the target, which pointer moves?',
      correct: 'Move the right pointer left',
      distractors: [
        'Move the left pointer right',
        'Move both pointers to the same side',
        'Restart from index 0',
      ],
      explanation:
        'Moving the right pointer left replaces a larger value with a smaller one, reducing the sum.',
      hint: 'You need the sum to become smaller.',
      concept: 'Pointer movement',
    },
    {
      prompt: 'What is the typical time complexity of the sorted-array two-pointer sum technique?',
      correct: 'O(n)',
      distractors: [
        'O(log n)',
        'O(n²)',
        'O(1) regardless of input size',
      ],
      explanation:
        'Both pointers move only inward across the array, so the total number of pointer moves is linear.',
      hint: 'Can either pointer move backward after passing an index?',
      concept: 'Time complexity',
    },
    {
      prompt: 'Why does the classic two-pointer rule not work the same way on an unsorted array?',
      correct: 'Pointer movement no longer guarantees whether the sum will increase or decrease',
      distractors: [
        'Unsorted arrays cannot be indexed',
        'Two pointers require an even-sized array',
        'The target value disappears from memory',
      ],
      explanation:
        'Without sorted order, moving a pointer does not have a predictable effect on the pair sum, so the correctness argument breaks.',
      hint: 'The technique depends on monotonic movement of values.',
      concept: 'Limitation',
    },
  ],

  slidingWindow: [
    {
      prompt: 'What does a fixed-size sliding window compute efficiently?',
      correct: 'An aggregate such as the sum for every contiguous window of size k',
      distractors: [
        'The longest increasing subsequence',
        'A globally sorted copy of the array',
        'Only the maximum element in the array',
      ],
      explanation:
        'A fixed-size window moves one position at a time, updating its aggregate from the element entering and the element leaving.',
      hint: 'Compare two consecutive windows.',
      concept: 'Window definition',
    },
    {
      prompt: 'When a fixed-size window moves one position right, what changes?',
      correct: 'One element enters and one element leaves',
      distractors: [
        'Every element changes',
        'Only the entering element matters',
        'The window doubles in size',
      ],
      explanation:
        'Consecutive windows overlap heavily, so only two boundary elements need to be updated.',
      hint: 'Most of the previous window is still present.',
      concept: 'Window transition',
    },
    {
      prompt: 'Why can a fixed-size sliding-window sum be maintained in O(1) per move?',
      correct: 'Add the entering element and subtract the leaving element',
      distractors: [
        'Recompute the entire window every time',
        'Sort each window before summing',
        'Multiply the previous sum by the window size',
      ],
      explanation:
        'The previous sum already contains the shared elements. Only the two changed boundaries need updates.',
      hint: 'What two values are different between adjacent windows?',
      concept: 'Incremental update',
    },
    {
      prompt: 'What is the overall time complexity of scanning all fixed-size windows using incremental updates?',
      correct: 'O(n)',
      distractors: [
        'O(nk)',
        'O(n²) for every k',
        'O(log n)',
      ],
      explanation:
        'The first window takes O(k), then each remaining window is updated in O(1), giving O(n) overall.',
      hint: 'Do you rescan all k elements for every window?',
      concept: 'Time complexity',
    },
    {
      prompt: 'What must be established before sliding a fixed-size window?',
      correct: 'The initial window of size k must be formed correctly',
      distractors: [
        'The array must already be sorted',
        'The target must be at index 0',
        'The window must contain the entire array',
      ],
      explanation:
        'The first window provides the starting aggregate. Later windows can then be updated incrementally.',
      hint: 'What value does the first slide need as its starting point?',
      concept: 'Initialization',
    },
  ],

  rotation: [
    {
      prompt: 'Rotating an array of length n by k positions is equivalent to rotating by what amount?',
      correct: 'k mod n',
      distractors: [
        'k × n',
        'n - k in every case',
        'k / 2',
      ],
      explanation:
        'After n rotations the array returns to its original order, so only the remainder after division by n matters.',
      hint: 'What happens after exactly n full rotations?',
      concept: 'Modulo arithmetic',
    },
    {
      prompt: 'What does one right rotation do to an array?',
      correct: 'Move the last element to the front and shift the others right',
      distractors: [
        'Move the first element to the end',
        'Swap only the first and last elements',
        'Reverse the whole array',
      ],
      explanation:
        'A right rotation wraps the final element around to index 0 and shifts every other element one position right.',
      hint: 'Which end wraps around in a right rotation?',
      concept: 'Rotation direction',
    },
    {
      prompt: 'Why is k mod n useful before implementing an array rotation?',
      correct: 'It removes redundant full cycles',
      distractors: [
        'It sorts the array',
        'It guarantees k becomes 1',
        'It removes duplicate values',
      ],
      explanation:
        'Any complete set of n rotations restores the original array, so reducing k avoids unnecessary work.',
      hint: 'Full cycles do not change the final arrangement.',
      concept: 'Optimization',
    },
    {
      prompt: 'In the reversal-based right-rotation method, what is the first high-level step?',
      correct: 'Reverse the entire array',
      distractors: [
        'Sort the array',
        'Reverse only the first k elements',
        'Swap every adjacent pair',
      ],
      explanation:
        'The standard reversal method is: reverse all elements, reverse the first k, then reverse the remaining n-k.',
      hint: 'Recall the three-reversal technique.',
      concept: 'Reversal technique',
    },
    {
      prompt: 'What should happen when k is larger than the array length n?',
      correct: 'Reduce k using k mod n',
      distractors: [
        'Reject the input automatically',
        'Repeat the full algorithm k times without reduction',
        'Use n + k',
      ],
      explanation:
        'Reducing k modulo n gives the equivalent rotation while avoiding redundant full cycles.',
      hint: 'A rotation of n positions changes nothing.',
      concept: 'Edge case',
    },
  ],

  prefixSum: [
    {
      prompt: 'What does prefix[i] represent in a standard prefix-sum array?',
      correct: 'The sum of elements from index 0 through index i',
      distractors: [
        'The sum from index i to the end',
        'The maximum value through index i',
        'The count of values smaller than arr[i]',
      ],
      explanation:
        'Each prefix entry stores a cumulative total beginning at index 0.',
      hint: 'Think cumulative: each entry includes everything before it.',
      concept: 'Prefix definition',
    },
    {
      prompt: 'How is prefix[i] usually computed from the previous prefix value?',
      correct: 'prefix[i] = prefix[i - 1] + arr[i]',
      distractors: [
        'prefix[i] = prefix[i - 1] - arr[i]',
        'prefix[i] = prefix[i - 1] × arr[i]',
        'prefix[i] = arr[i] only',
      ],
      explanation:
        'Each new prefix adds the current element to the cumulative total stored at the previous index.',
      hint: 'A prefix sum is cumulative addition.',
      concept: 'Construction',
    },
    {
      prompt: 'How can the sum of a range L..R be obtained in O(1) with prefix sums when L > 0?',
      correct: 'prefix[R] - prefix[L - 1]',
      distractors: [
        'prefix[R] + prefix[L - 1]',
        'prefix[L] - prefix[R]',
        'prefix[R] / prefix[L - 1]',
      ],
      explanation:
        'Subtracting the cumulative sum through L-1 removes all values before L.',
      hint: 'What must be removed from the cumulative sum ending at R?',
      concept: 'Range query',
    },
    {
      prompt: 'What special case must be handled when a range starts at index 0?',
      correct: 'Use prefix[R] directly because there is no prefix[-1]',
      distractors: [
        'Return zero',
        'Subtract arr[0] from prefix[R]',
        'Start the range at index 1',
      ],
      explanation:
        'For L = 0, the answer is simply prefix[R]. A common implementation mistake is trying to access prefix[-1].',
      hint: 'There is nothing before index 0 to subtract.',
      concept: 'Off-by-one edge case',
    },
    {
      prompt: 'What is the usual space complexity of storing a full prefix-sum array?',
      correct: 'O(n)',
      distractors: [
        'O(1)',
        'O(log n)',
        'O(n²)',
      ],
      explanation:
        'A prefix array stores one cumulative value per input position, so it uses linear extra space.',
      hint: 'How many prefix values are stored for n input elements?',
      concept: 'Space complexity',
    },
  ],
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
  // One fixed conceptual question at step 0.
  // Select deterministically from the algorithm's question bank so the quiz
  // remains reproducible instead of relying on Math.random().
  const anchors = ANCHORS[algorithm];
  const anchorIndex = steps.length % anchors.length;
  const anchor = anchors[anchorIndex];

  const anchorId = `arrays-${algorithm}-anchor-${anchorIndex}`;
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
    example: 'Array [4,2,7,1,9], target=7: check 4≠7, 2≠7, 7=7 → found at index 2.',
  },
  kadane: {
    description: 'Find the contiguous subarray with the maximum sum',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'A negative running sum cannot help future elements—reset when sum < 0',
    watchFor: ['Reset condition', 'Current sum vs max sum tracking', 'All negative case'],
    quickTip: 'If current sum drops below zero, start fresh from the next element',
    example: 'Array [-2,1,-3,4,-1,2,1,-5,4]: currentSum resets at -2, grows to 6 from subarray [4,-1,2,1], which is the max.',
  },
  twoPointer: {
    description: 'Use two pointers moving inward to find a pair summing to target',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'In a sorted array, moving left pointer right increases sum, moving right pointer left decreases it',
    watchFor: ['Sorted array requirement', 'Pointer movement logic', 'When to stop'],
    quickTip: 'Requires sorted input—if sum too small move left pointer right, if too large move right pointer left',
    example: 'Sorted [1,3,5,8,11], target=13: left=0(1)+right=4(11)=12<13→move left; left=1(3)+right=4(11)=14>13→move right; left=1(3)+right=3(8)=11<13→move left; left=2(5)+right=3(8)=13 ✓.',
  },
  slidingWindow: {
    description: 'Maintain a window of size k and slide it across the array',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'When window slides by 1, only one element enters and one leaves—update in O(1)',
    watchFor: ['Window size', 'Element entering vs leaving', 'Initial window setup'],
    quickTip: 'Compute the first window fully, then update by adding new element and removing old',
    example: 'Array [2,1,5,3,6], k=3: window[0]=2+1+5=8; slide: 8-2+3=9; slide: 9-1+6=14. Max window sum is 14.',
  },
  rotation: {
    description: 'Rotate array elements by k positions',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Rotation by k is equivalent to rotation by k mod n',
    watchFor: ['Modulo arithmetic', 'Reversal technique', 'Direction of rotation'],
    quickTip: 'Use the reversal algorithm: reverse all, reverse first k, reverse rest',
    example: 'Array [1,2,3,4,5], k=2: reverse all→[5,4,3,2,1]; reverse first 2→[4,5,3,2,1]; reverse rest→[4,5,1,2,3].',
  },
  prefixSum: {
    description: 'Build cumulative sum array for O(1) range sum queries',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'prefix[i] = arr[0] + arr[1] + ... + arr[i], enabling range queries',
    watchFor: ['Prefix array construction', 'Range sum formula', 'Index off-by-one'],
    quickTip: 'Range sum from L to R is prefix[R] - prefix[L-1] (handle L=0 specially)',
    example: 'Array [3,1,4,1,5]: prefix=[3,4,8,9,14]. Sum of indices 1..3 = prefix[3]-prefix[0] = 9-3 = 6 (i.e. 1+4+1).',
  },
};

export function buildRevisionData(key: ArrayAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
