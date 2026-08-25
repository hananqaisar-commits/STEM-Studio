import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateKadaneSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;

  let currentSum = 0;
  let maxSum = -Infinity;
  let currentStart = 0;
  let bestStart = 0;
  let bestEnd = 0;

  steps.push({
    array: [...arr],
    description: `Starting Kadane's Algorithm on array of ${n} elements to find maximum subarray sum.`,
    codeLine: 1,
    variables: { i: 0, currentSum: 0, maxSum: -Infinity, currentStart: 0, bestStart: 0, bestEnd: 0 },
    callStack: ['main() -> kadane(arr)'],
  });

  for (let i = 0; i < n; i++) {
    currentSum += arr[i];

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      sortedIndices: bestStart <= bestEnd ? Array.from({ length: bestEnd - bestStart + 1 }, (_, k) => bestStart + k) : [],
      description: `Processing index ${i}: arr[${i}] = ${arr[i]}. currentSum becomes ${currentSum}.`,
      codeLine: 3,
      variables: { i, currentSum, maxSum, currentStart, bestStart, bestEnd },
      callStack: ['main() -> kadane(arr)'],
    });

    if (currentSum > maxSum) {
      maxSum = currentSum;
      bestStart = currentStart;
      bestEnd = i;

      steps.push({
        array: [...arr],
        comparingIndices: [i],
        sortedIndices: Array.from({ length: bestEnd - bestStart + 1 }, (_, k) => bestStart + k),
        description: `New maximum subarray found! maxSum updated to ${maxSum} (indices ${bestStart} to ${bestEnd}).`,
        codeLine: 4,
        variables: { i, currentSum, maxSum, currentStart, bestStart, bestEnd },
        callStack: ['main() -> kadane(arr)'],
      });
    }

    if (currentSum < 0) {
      steps.push({
        array: [...arr],
        comparingIndices: [i],
        sortedIndices: bestStart <= bestEnd ? Array.from({ length: bestEnd - bestStart + 1 }, (_, k) => bestStart + k) : [],
        description: `currentSum (${currentSum}) is negative. Resetting currentSum to 0 and advancing currentStart to ${i + 1}.`,
        codeLine: 6,
        variables: { i, currentSum: 0, maxSum, currentStart: i + 1, bestStart, bestEnd },
        callStack: ['main() -> kadane(arr)'],
      });
      currentSum = 0;
      currentStart = i + 1;
    }
  }

  const bestIndices = Array.from({ length: bestEnd - bestStart + 1 }, (_, k) => bestStart + k);
  steps.push({
    array: [...arr],
    sortedIndices: bestIndices,
    description: `Kadane's Algorithm complete. Maximum subarray sum is ${maxSum}, spanning indices ${bestStart} to ${bestEnd}.`,
    codeLine: 8,
    variables: { currentSum, maxSum, currentStart, bestStart, bestEnd, status: 'COMPLETE' },
    callStack: ['main() -> kadane(arr) [RETURN]'],
  });

  return {
    steps,
    title: "Kadane's Algorithm",
    category: 'Array Algorithms',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'currentSum = 0, maxSum = -Infinity',
      'currentStart = 0, bestStart = 0, bestEnd = 0',
      'for i = 0 to n - 1 do',
      '  currentSum = currentSum + arr[i]',
      '  if currentSum > maxSum then',
      '    maxSum = currentSum, bestStart = currentStart, bestEnd = i',
      '  if currentSum < 0 then',
      '    currentSum = 0, currentStart = i + 1',
      'end for',
      'return maxSum, bestStart, bestEnd',
    ],
  };
}
