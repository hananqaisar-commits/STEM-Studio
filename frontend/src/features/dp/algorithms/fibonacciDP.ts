import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runFibonacciDP(n: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const dp: number[] = new Array(n + 1).fill(0);

  steps.push({
    array: [...dp],
    description: `Starting bottom-up Fibonacci DP for n=${n}. dp table has ${n + 1} cells initialized to 0.`,
    codeLine: 1,
    variables: { n, i: 0, 'dp[i-1]': 0, 'dp[i-2]': 0, 'dp[i]': 0 },
    callStack: ['main() -> fibonacciDP(n)'],
  });

  // Base cases
  dp[0] = 0;
  if (n >= 1) dp[1] = 1;

  steps.push({
    array: [...dp],
    comparingIndices: [0, 1],
    sortedIndices: [0, 1],
    description: `Base cases: dp[0]=0, dp[1]=1.`,
    codeLine: 2,
    variables: { n, i: 1, 'dp[0]': 0, 'dp[1]': 1 },
    callStack: ['main() -> fibonacciDP(n)'],
  });

  for (let i = 2; i <= n; i++) {
    steps.push({
      array: [...dp],
      comparingIndices: [i, i - 1, i - 2],
      sortedIndices: Array.from({ length: i }, (_, k) => k),
      description: `Computing dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]}`,
      codeLine: 3,
      variables: { n, i, 'dp[i-1]': dp[i - 1], 'dp[i-2]': dp[i - 2] },
      callStack: ['main() -> fibonacciDP(n)'],
    });

    dp[i] = dp[i - 1] + dp[i - 2];

    steps.push({
      array: [...dp],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: `dp[${i}] = ${dp[i]}. Cell ${i} filled.`,
      codeLine: 4,
      variables: { n, i, 'dp[i]': dp[i], 'dp[i-1]': dp[i - 1], 'dp[i-2]': dp[i - 2] },
      callStack: ['main() -> fibonacciDP(n)'],
    });
  }

  steps.push({
    array: [...dp],
    sortedIndices: Array.from({ length: n + 1 }, (_, k) => k),
    description: `Fibonacci DP complete. dp[${n}] = ${dp[n]}.`,
    codeLine: 5,
    variables: { n, result: dp[n], status: 'COMPLETE' },
    callStack: ['main() -> fibonacciDP(n) [RETURN]'],
  });

  return {
    steps,
    title: 'Fibonacci (Bottom-Up DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'dp = array of size n+1, filled with 0',
      'dp[0] = 0, dp[1] = 1',
      'for i = 2 to n do',
      '  dp[i] = dp[i-1] + dp[i-2]',
      'return dp[n]',
    ],
  };
}
