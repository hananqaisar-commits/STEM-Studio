import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runLIS(arr: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = arr.length;
  const dp: number[] = new Array(n).fill(1);

  steps.push({
    array: [...arr],
    description: `Starting LIS DP. arr=[${arr.join(',')}]. dp initialized to all 1s (each element alone is length 1).`,
    codeLine: 1,
    variables: { n, i: 0, j: 0 },
    callStack: ['main() -> LIS(arr)'],
  });

  for (let i = 1; i < n; i++) {
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i }, (_, k) => k),
      description: `Computing dp[${i}] for arr[${i}]=${arr[i]}. Checking all j < ${i}...`,
      codeLine: 2,
      variables: { n, i, 'arr[i]': arr[i], 'dp[i]': dp[i] },
      callStack: ['main() -> LIS(arr)'],
    });

    for (let j = 0; j < i; j++) {
      if (arr[j] < arr[i]) {
        steps.push({
          array: [...arr],
          comparingIndices: [i, j],
          sortedIndices: Array.from({ length: i }, (_, k) => k),
          description: `  arr[${j}]=${arr[j]} < arr[${i}]=${arr[i]}: dp[${i}] = max(${dp[i]}, dp[${j}]+1) = max(${dp[i]}, ${dp[j] + 1})`,
          codeLine: 3,
          variables: { n, i, j, 'arr[i]': arr[i], 'arr[j]': arr[j], 'dp[i]': dp[i], 'dp[j]': dp[j] },
          callStack: ['main() -> LIS(arr)'],
        });
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: `dp[${i}] = ${dp[i]}. Longest increasing subsequence ending at index ${i} has length ${dp[i]}.`,
      codeLine: 4,
      variables: { n, i, 'dp[i]': dp[i] },
      callStack: ['main() -> LIS(arr)'],
    });
  }

  const result = Math.max(...dp);
  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: n }, (_, k) => k),
    description: `LIS complete. Longest increasing subsequence length = ${result}.`,
    codeLine: 5,
    variables: { result, status: 'COMPLETE' },
    callStack: ['main() -> LIS(arr) [RETURN]'],
  });

  return {
    steps,
    title: 'Longest Increasing Subsequence (DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(n^2)', average: 'O(n^2)', worst: 'O(n^2)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'dp = array of size n, filled with 1',
      'for i = 1 to n-1 do',
      '  for j = 0 to i-1 do',
      '    if arr[j] < arr[i]: dp[i] = max(dp[i], dp[j]+1)',
      'return max(dp)',
    ],
  };
}
