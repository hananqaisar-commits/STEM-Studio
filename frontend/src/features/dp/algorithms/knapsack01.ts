import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runKnapsack01(weights: number[], values: number[], capacity: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = weights.length;
  const rows = n + 1;
  const cols = capacity + 1;
  const dp: number[] = new Array(rows * cols).fill(0);

  steps.push({
    array: [...dp],
    description: `Starting 0/1 Knapsack DP. items=${n}, capacity=${capacity}. Grid: ${rows}x${cols}.`,
    codeLine: 1,
    variables: { rows, cols, isGrid: true, n, capacity, i: 0, w: 0 },
    callStack: ['main() -> knapsack01(weights, values, capacity)'],
  });

  for (let i = 1; i <= n; i++) {
    const wi = weights[i - 1];
    const vi = values[i - 1];

    steps.push({
      array: [...dp],
      comparingIndices: [i * cols],
      sortedIndices: Array.from({ length: i * cols }, (_, k) => k),
      description: `Processing item ${i}: weight=${wi}, value=${vi}.`,
      codeLine: 2,
      variables: { rows, cols, isGrid: true, i, wi, vi, w: 0 },
      callStack: ['main() -> knapsack01(weights, values, capacity)'],
    });

    for (let w = 0; w <= capacity; w++) {
      const idx = i * cols + w;
      const above = (i - 1) * cols + w;

      if (wi <= w) {
        const take = (i - 1) * cols + (w - wi);
        dp[idx] = Math.max(dp[above], dp[take] + vi);

        steps.push({
          array: [...dp],
          comparingIndices: [idx, above, take],
          sortedIndices: Array.from({ length: idx + 1 }, (_, k) => k),
          description: `dp[${i}][${w}] = max(dp[${i - 1}][${w}], dp[${i - 1}][${w - wi}]+${vi}) = max(${dp[above]}, ${dp[take] + vi}) = ${dp[idx]}`,
          codeLine: 3,
          variables: { rows, cols, isGrid: true, i, w, wi, vi, 'dp[i][w]': dp[idx] },
          callStack: ['main() -> knapsack01(weights, values, capacity)'],
        });
      } else {
        dp[idx] = dp[above];

        steps.push({
          array: [...dp],
          comparingIndices: [idx, above],
          sortedIndices: Array.from({ length: idx + 1 }, (_, k) => k),
          description: `dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[idx]} (item too heavy: wi=${wi} > w=${w})`,
          codeLine: 4,
          variables: { rows, cols, isGrid: true, i, w, wi, vi, 'dp[i][w]': dp[idx] },
          callStack: ['main() -> knapsack01(weights, values, capacity)'],
        });
      }
    }
  }

  const result = dp[n * cols + capacity];
  steps.push({
    array: [...dp],
    sortedIndices: Array.from({ length: rows * cols }, (_, k) => k),
    description: `Knapsack complete. Maximum value = dp[${n}][${capacity}] = ${result}.`,
    codeLine: 5,
    variables: { rows, cols, isGrid: true, result, status: 'COMPLETE' },
    callStack: ['main() -> knapsack01(weights, values, capacity) [RETURN]'],
  });

  return {
    steps,
    title: '0/1 Knapsack (2D DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(n * capacity)', average: 'O(n * capacity)', worst: 'O(n * capacity)' },
    spaceComplexity: 'O(n * capacity)',
    pseudocode: [
      'dp = (n+1) x (capacity+1) grid, filled with 0',
      'for i = 1 to n do (item i: weight=wi, value=vi)',
      '  for w = 0 to capacity do',
      '    if wi <= w: dp[i][w] = max(dp[i-1][w], dp[i-1][w-wi]+vi)',
      '    else: dp[i][w] = dp[i-1][w]',
      'return dp[n][capacity]',
    ],
  };
}
