import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runUniquePaths(m: number, n: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const rows = m;
  const cols = n;
  const dp: number[] = new Array(rows * cols).fill(0);

  // Base: first row and first col = 1
  for (let i = 0; i < rows; i++) dp[i * cols] = 1;
  for (let j = 0; j < cols; j++) dp[j] = 1;

  steps.push({
    array: [...dp],
    description: `Starting Unique Paths DP. Grid: ${m}x${n}. First row and column initialized to 1.`,
    codeLine: 1,
    variables: { rows, cols, isGrid: true, m, n },
    callStack: ['main() -> uniquePaths(m, n)'],
  });

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const idx = i * cols + j;
      const above = (i - 1) * cols + j;
      const left = i * cols + (j - 1);

      steps.push({
        array: [...dp],
        comparingIndices: [idx, above, left],
        sortedIndices: Array.from({ length: idx }, (_, k) => k),
        description: `dp[${i}][${j}] = dp[${i - 1}][${j}] + dp[${i}][${j - 1}] = ${dp[above]} + ${dp[left]}`,
        codeLine: 2,
        variables: { rows, cols, isGrid: true, i, j, 'dp[above]': dp[above], 'dp[left]': dp[left] },
        callStack: ['main() -> uniquePaths(m, n)'],
      });

      dp[idx] = dp[above] + dp[left];

      steps.push({
        array: [...dp],
        comparingIndices: [idx],
        sortedIndices: Array.from({ length: idx + 1 }, (_, k) => k),
        description: `dp[${i}][${j}] = ${dp[idx]}. Cell (${i},${j}) filled.`,
        codeLine: 3,
        variables: { rows, cols, isGrid: true, i, j, 'dp[i][j]': dp[idx] },
        callStack: ['main() -> uniquePaths(m, n)'],
      });
    }
  }

  const result = dp[(rows - 1) * cols + (cols - 1)];
  steps.push({
    array: [...dp],
    sortedIndices: Array.from({ length: rows * cols }, (_, k) => k),
    description: `Unique Paths complete. Number of paths = dp[${rows - 1}][${cols - 1}] = ${result}.`,
    codeLine: 4,
    variables: { rows, cols, isGrid: true, result, status: 'COMPLETE' },
    callStack: ['main() -> uniquePaths(m, n) [RETURN]'],
  });

  return {
    steps,
    title: 'Unique Paths (2D DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(m * n)', average: 'O(m * n)', worst: 'O(m * n)' },
    spaceComplexity: 'O(m * n)',
    pseudocode: [
      'dp = m x n grid, first row & col = 1',
      'for i = 1 to m-1, j = 1 to n-1 do',
      '  dp[i][j] = dp[i-1][j] + dp[i][j-1]',
      'return dp[m-1][n-1]',
    ],
  };
}
