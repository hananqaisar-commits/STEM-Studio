import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateSlidingWindowSteps(initialArray: number[], windowSize: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const k = Math.min(windowSize, n);

  let windowSum = 0;
  let maxSum = 0;
  let maxStart = 0;
  let left = 0;

  steps.push({
    array: [...arr],
    description: `Starting Sliding Window (size k = ${k}) on array of ${n} elements to find maximum sum subarray.`,
    codeLine: 1,
    variables: { left: 0, right: 0, windowSum: 0, maxSum: 0, maxStart: 0 },
    callStack: ['main() -> slidingWindow(arr, k)'],
  });

  // Phase 1: build initial window [0, k-1]
  for (let right = 0; right < k; right++) {
    windowSum += arr[right];

    steps.push({
      array: [...arr],
      comparingIndices: [right],
      sortedIndices: Array.from({ length: right + 1 }, (_, i) => i),
      description: `Building initial window: adding arr[${right}] = ${arr[right]}. windowSum = ${windowSum}.`,
      codeLine: 2,
      variables: { left: 0, right, windowSum, maxSum, maxStart },
      callStack: ['main() -> slidingWindow(arr, k)'],
    });
  }

  maxSum = windowSum;
  maxStart = 0;

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: k }, (_, i) => i),
    description: `Initial window [0..${k - 1}] built. windowSum = ${windowSum}. Setting maxSum = ${maxSum}.`,
    codeLine: 3,
    variables: { left: 0, right: k - 1, windowSum, maxSum, maxStart },
    callStack: ['main() -> slidingWindow(arr, k)'],
  });

  // Phase 2: slide the window
  for (let right = k; right < n; right++) {
    left = right - k;

    steps.push({
      array: [...arr],
      comparingIndices: [right],
      swappingIndices: [left],
      sortedIndices: Array.from({ length: k }, (_, i) => maxStart + i),
      description: `Sliding window: removing arr[${left}] = ${arr[left]} from left, adding arr[${right}] = ${arr[right]} on right.`,
      codeLine: 5,
      variables: { left, right, windowSum, maxSum, maxStart },
      callStack: ['main() -> slidingWindow(arr, k)'],
    });

    windowSum = windowSum - arr[left] + arr[right];

    steps.push({
      array: [...arr],
      comparingIndices: [right],
      sortedIndices: Array.from({ length: k }, (_, i) => left + 1 + i),
      description: `Window slid to [${left + 1}..${right}]. New windowSum = ${windowSum}.`,
      codeLine: 6,
      variables: { left: left + 1, right, windowSum, maxSum, maxStart },
      callStack: ['main() -> slidingWindow(arr, k)'],
    });

    if (windowSum > maxSum) {
      maxSum = windowSum;
      maxStart = left + 1;

      steps.push({
        array: [...arr],
        sortedIndices: Array.from({ length: k }, (_, i) => maxStart + i),
        description: `New max sum found! maxSum updated to ${maxSum} at window starting index ${maxStart}.`,
        codeLine: 7,
        variables: { left: maxStart, right, windowSum, maxSum, maxStart },
        callStack: ['main() -> slidingWindow(arr, k)'],
      });
    }
  }

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: k }, (_, i) => maxStart + i),
    description: `Sliding Window complete. Maximum subarray sum is ${maxSum} starting at index ${maxStart} (window [${maxStart}..${maxStart + k - 1}]).`,
    codeLine: 9,
    variables: { left: maxStart, right: n - 1, windowSum, maxSum, maxStart, status: 'COMPLETE' },
    callStack: ['main() -> slidingWindow(arr, k) [RETURN]'],
  });

  return {
    steps,
    title: 'Sliding Window Max Sum',
    category: 'Array Algorithms',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'k = windowSize, windowSum = 0, maxSum = 0',
      'for right = 0 to k - 1 do  // build initial window',
      '  windowSum = windowSum + arr[right]',
      'maxSum = windowSum, maxStart = 0',
      'for right = k to n - 1 do  // slide window',
      '  windowSum = windowSum - arr[right - k] + arr[right]',
      '  if windowSum > maxSum then',
      '    maxSum = windowSum, maxStart = right - k + 1',
      'end for',
      'return maxSum, maxStart',
    ],
  };
}
