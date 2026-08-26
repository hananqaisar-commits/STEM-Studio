import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runLCS(s1: string, s2: string): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const m = s1.length;
  const n = s2.length;
  const rows = m + 1;
  const cols = n + 1;
  const dp: number[] = new Array(rows * cols).fill(0);

  steps.push({
    array: [...dp],
    description: `Starting LCS DP. s1="${s1}" (${m} chars), s2="${s2}" (${n} chars). Grid: ${rows}x${cols}.`,
    codeLine: 1,
    variables: { rows, cols, isGrid: true, s1, s2, m, n, i: 0, j: 0 },
    callStack: ['main() -> LCS(s1, s2)'],
  });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const idx = i * cols + j;

      if (s1[i - 1] === s2[j - 1]) {
        const diag = (i - 1) * cols + (j - 1);
        dp[idx] = dp[diag] + 1;

        steps.push({
          array: [...dp],
          comparingIndices: [idx, diag],
          sortedIndices: Array.from({ length: idx + 1 }, (_, k) => k),
          description: `s1[${i - 1}]='${s1[i - 1]}' == s2[${j - 1}]='${s2[j - 1]}'. dp[${i}][${j}] = dp[${i - 1}][${j - 1}]+1 = ${dp[idx]}`,
          codeLine: 2,
          variables: { rows, cols, isGrid: true, s1, s2, i, j, 's1[i-1]': s1[i - 1], 's2[j-1]': s2[j - 1], 'dp[i][j]': dp[idx] },
          callStack: ['main() -> LCS(s1, s2)'],
        });
      } else {
        const above = (i - 1) * cols + j;
        const left = i * cols + (j - 1);
        dp[idx] = Math.max(dp[above], dp[left]);

        steps.push({
          array: [...dp],
          comparingIndices: [idx, above, left],
          sortedIndices: Array.from({ length: idx + 1 }, (_, k) => k),
          description: `s1[${i - 1}]='${s1[i - 1]}' != s2[${j - 1}]='${s2[j - 1]}'. dp[${i}][${j}] = max(dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = max(${dp[above]}, ${dp[left]}) = ${dp[idx]}`,
          codeLine: 3,
          variables: { rows, cols, isGrid: true, s1, s2, i, j, 'dp[i][j]': dp[idx] },
          callStack: ['main() -> LCS(s1, s2)'],
        });
      }
    }
  }

  const result = dp[m * cols + n];
  steps.push({
    array: [...dp],
    sortedIndices: Array.from({ length: rows * cols }, (_, k) => k),
    description: `LCS complete. Length of longest common subsequence = dp[${m}][${n}] = ${result}.`,
    codeLine: 4,
    variables: { rows, cols, isGrid: true, result, s1, s2, status: 'COMPLETE' },
    callStack: ['main() -> LCS(s1, s2) [RETURN]'],
  });

  return {
    steps,
    title: 'Longest Common Subsequence (2D DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(m * n)', average: 'O(m * n)', worst: 'O(m * n)' },
    spaceComplexity: 'O(m * n)',
    pseudocode: [
      'dp = (m+1) x (n+1) grid, filled with 0',
      'for i = 1 to m, j = 1 to n do',
      '  if s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1',
      '  else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])',
      'return dp[m][n]',
    ],
  };
}
