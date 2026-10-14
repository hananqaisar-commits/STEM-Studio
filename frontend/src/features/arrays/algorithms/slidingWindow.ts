import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateSlidingWindowSteps(initialArray: number[], windowSize: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const k = n === 0 ? 0 : Math.max(1, Math.min(n, Math.floor(windowSize) || 1));

  if (n === 0) {
    return {
      steps: [{ array: [], operation: 'empty input', description: 'Add at least one number to build a window.', codeLine: 1 }],
      title: 'Sliding Window Max Sum',
      category: 'Array Algorithms',
      timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
      spaceComplexity: 'O(1)',
      pseudocode: ['Build the first window of size k', 'Slide it: subtract the leaving value, then add the entering value', 'Keep the largest sum and its start index'],
    };
  }

  const snapshot = (
    operation: string,
    description: string,
    windowStart: number,
    windowEnd: number,
    windowSum: number,
    extra: Partial<ArrayStep> = {},
  ): ArrayStep => ({
    array: [...arr],
    operation,
    description,
    windowStart,
    windowEnd,
    windowSum,
    ...extra,
  });

  steps.push(snapshot(
    'initialize window',
    `Build the first contiguous window of ${k} values. The window sum starts at 0.`,
    0,
    -1,
    0,
    { codeLine: 1, variables: { left: 0, right: null, windowSize: k, windowSum: 0, maxSum: null } },
  ));

  let windowSum = 0;
  for (let right = 0; right < k; right += 1) {
    const before = windowSum;
    windowSum += arr[right];
    steps.push(snapshot(
      'add to first window',
      `Add arr[${right}] = ${arr[right]}: ${before} + ${arr[right]} = ${windowSum}. The first window is still being built.`,
      0,
      right,
      windowSum,
      {
        comparingIndices: [right],
        enteringIndex: right,
        codeLine: 2,
        variables: { left: 0, right, addedValue: arr[right], windowSum, valuesInWindow: right + 1, targetWindowSize: k },
      },
    ));
  }

  let maxSum = windowSum;
  let maxStart = 0;
  steps.push(snapshot(
    'record first complete window',
    `Window [0, ${k - 1}] is full. Initialize maxSum = windowSum = ${windowSum}.`,
    0,
    k - 1,
    windowSum,
    { codeLine: 3, variables: { left: 0, right: k - 1, windowSize: k, windowSum, maxSum, maxStart } },
  ));

  for (let start = 0; start + k < n; start += 1) {
    const leavingIndex = start;
    const enteringIndex = start + k;
    const nextStart = start + 1;
    const beforeRemove = windowSum;

    steps.push(snapshot(
      'identify leaving value',
      `The window moves right by one. arr[${leavingIndex}] = ${arr[leavingIndex]} leaves; arr[${enteringIndex}] = ${arr[enteringIndex]} will enter.`,
      start,
      enteringIndex - 1,
      windowSum,
      {
        comparingIndices: [leavingIndex, enteringIndex],
        leavingIndex,
        enteringIndex,
        codeLine: 5,
        variables: { left: leavingIndex, right: enteringIndex, windowSum, leavingValue: arr[leavingIndex], enteringValue: arr[enteringIndex] },
      },
    ));

    windowSum -= arr[leavingIndex];
    steps.push(snapshot(
      'subtract leaving value',
      `Remove the old left value from the running sum: ${beforeRemove} − ${arr[leavingIndex]} = ${windowSum}. The window temporarily has ${k - 1} values.`,
      nextStart,
      enteringIndex - 1,
      windowSum,
      {
        leavingIndex,
        codeLine: 6,
        variables: { left: nextStart, right: enteringIndex - 1, leavingIndex, leavingValue: arr[leavingIndex], windowSum, valuesInWindow: k - 1 },
      },
    ));

    const beforeAdd = windowSum;
    windowSum += arr[enteringIndex];
    steps.push(snapshot(
      'add entering value',
      `Add the new right value: ${beforeAdd} + ${arr[enteringIndex]} = ${windowSum}. The full window is now [${nextStart}, ${enteringIndex}].`,
      nextStart,
      enteringIndex,
      windowSum,
      {
        comparingIndices: [enteringIndex],
        enteringIndex,
        codeLine: 6,
        variables: { left: nextStart, right: enteringIndex, enteringIndex, enteringValue: arr[enteringIndex], windowSum, maxSum },
      },
    ));

    if (windowSum > maxSum) {
      const previousMax = maxSum;
      maxSum = windowSum;
      maxStart = nextStart;
      steps.push(snapshot(
        'update best window',
        `The new sum ${windowSum} is greater than the previous best ${previousMax}; save this window as the best so far.`,
        nextStart,
        enteringIndex,
        windowSum,
        { codeLine: 7, variables: { left: nextStart, right: enteringIndex, windowSum, maxSum, maxStart } },
      ));
    } else {
      steps.push(snapshot(
        'keep previous best',
        `The current sum ${windowSum} does not exceed the best sum ${maxSum}; keep the earlier best window.`,
        nextStart,
        enteringIndex,
        windowSum,
        { codeLine: 7, variables: { left: nextStart, right: enteringIndex, windowSum, maxSum, maxStart } },
      ));
    }
  }

  steps.push(snapshot(
    'return maximum window',
    `Maximum sum is ${maxSum}, from window [${maxStart}, ${maxStart + k - 1}]. Only one value left and one value right changed on each slide, so the scan is O(n).`,
    maxStart,
    maxStart + k - 1,
    maxSum,
    { sortedIndices: Array.from({ length: k }, (_, index) => maxStart + index), codeLine: 9, variables: { left: maxStart, right: maxStart + k - 1, windowSum: maxSum, maxSum, maxStart, status: 'COMPLETE' } },
  ));

  return {
    steps,
    title: 'Sliding Window Max Sum',
    category: 'Array Algorithms',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'windowSum = sum(arr[0 .. k - 1])',
      'maxSum = windowSum; maxStart = 0',
      'for right = k to n - 1:',
      '  left = right - k',
      '  windowSum -= arr[left]       // remove leaving value',
      '  windowSum += arr[right]      // add entering value',
      '  if windowSum > maxSum:',
      '    maxSum = windowSum; maxStart = left + 1',
      'return maxSum, maxStart',
    ],
  };
}
