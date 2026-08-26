import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runEditDistance(s1: string, s2: string): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const m = s1.length;
  const n = s2.length;
  const rows = m + 1;
  const cols = n + 1;
  const dp: number[] = new Array(rows * cols).fill(0);

  // Base cases
  for (let i = 0; i <= m; i++) dp[i * cols] = i;
  for (let j = 0; j <= n; j++) dp[j] = j;

  steps.push({
    array: [...dp],
    description: `Starting Edit Distance DP. s1="${s1}" (${m}), s2="${s2}" (${n}). Grid: ${rows}x${cols}. Base cases filled.`,
    codeLine: 1,
    variables: { rows, cols, isGrid: true, s1, s2, m, n },
    callStack: ['main() -> editDistance(s1, s2)'],
  });

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const idx = i * cols + j;

      if (s1[i - 1] === s2[j - 1]) {
        const diag = (i - 1) * cols + (j - 1);
        dp[idx] = dp[diag];

        steps.push({
          array: [...dp],
          comparingIndices: [idx, diag],
          sortedIndices: Array.from({ length: idx + 1 }, (_, k) => k),
          description: `s1[${i - 1}]='${s1[i - 1]}' == s2[${j - 1}]='${s2[j - 1]}'. dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${dp[idx]}`,
          codeLine: 2,
          variables: { rows, cols, isGrid: true, s1, s2, i, j, 'dp[i][j]': dp[idx] },
          callStack: ['main() -> editDistance(s1, s2)'],
        });
      } else {
        const ins = i * cols + (j - 1);
        const del = (i - 1) * cols + j;
        const rep = (i - 1) * cols + (j - 1);
        dp[idx] = 1 + Math.min(dp[ins], dp[del], dp[rep]);

        steps.push({
          array: [...dp],
          comparingIndices: [idx, ins, del, rep],
          sortedIndices: Array.from({ length: idx + 1 }, (_, k) => k),
          description: `s1[${i - 1}]!='${s2[j - 1]}'. dp[${i}][${j}] = 1+min(ins=${dp[ins]}, del=${dp[del]}, rep=${dp[rep]}) = ${dp[idx]}`,
          codeLine: 3,
          variables: { rows, cols, isGrid: true, s1, s2, i, j, 'dp[i][j]': dp[idx] },
          callStack: ['main() -> editDistance(s1, s2)'],
        });
      }
    }
  }

  const result = dp[m * cols + n];
  steps.push({
    array: [...dp],
    sortedIndices: Array.from({ length: rows * cols }, (_, k) => k),
    description: `Edit Distance complete. Minimum edits = dp[${m}][${n}] = ${result}.`,
    codeLine: 4,
    variables: { rows, cols, isGrid: true, result, s1, s2, status: 'COMPLETE' },
    callStack: ['main() -> editDistance(s1, s2) [RETURN]'],
  });

  return {
    steps,
    title: 'Edit Distance (2D DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(m * n)', average: 'O(m * n)', worst: 'O(m * n)' },
    spaceComplexity: 'O(m * n)',
    pseudocode: [
      'dp = (m+1) x (n+1) grid',
      'for i = 0..m: dp[i][0] = i; for j = 0..n: dp[0][j] = j',
      'if s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1]',
      'else: dp[i][j] = 1 + min(insert, delete, replace)',
      'return dp[m][n]',
    ],
  };
}
