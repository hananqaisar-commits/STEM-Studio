import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runHouseRobber(houses: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = houses.length;
  if (n === 0) {
    return {
      steps: [{ array: [], description: 'Empty houses array.', codeLine: 0, variables: { status: 'COMPLETE' } }],
      title: 'House Robber', category: 'Dynamic Programming',
      timeComplexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' },
      spaceComplexity: 'O(1)', pseudocode: ['return 0'],
    };
  }

  const dp: number[] = new Array(n).fill(0);
  const arr = [...houses];

  steps.push({
    array: [...arr],
    description: `Starting House Robber DP. houses=[${arr.join(',')}] (n=${n}). Cannot rob adjacent houses.`,
    codeLine: 1,
    variables: { n, i: 0 },
    callStack: ['main() -> houseRobber(houses)'],
  });

  dp[0] = arr[0];
  steps.push({
    array: [...arr],
    comparingIndices: [0],
    sortedIndices: [0],
    description: `Base case: dp[0] = houses[0] = ${arr[0]}.`,
    codeLine: 2,
    variables: { i: 0, 'dp[0]': dp[0] },
    callStack: ['main() -> houseRobber(houses)'],
  });

  if (n > 1) {
    dp[1] = Math.max(arr[0], arr[1]);
    steps.push({
      array: [...arr],
      comparingIndices: [0, 1],
      sortedIndices: [0, 1],
      description: `Base case: dp[1] = max(houses[0], houses[1]) = max(${arr[0]}, ${arr[1]}) = ${dp[1]}.`,
      codeLine: 2,
      variables: { i: 1, 'dp[0]': dp[0], 'dp[1]': dp[1] },
      callStack: ['main() -> houseRobber(houses)'],
    });
  }

  for (let i = 2; i < n; i++) {
    steps.push({
      array: [...arr],
      comparingIndices: [i, i - 1, i - 2],
      sortedIndices: Array.from({ length: i }, (_, k) => k),
      description: `dp[${i}] = max(dp[${i - 1}], dp[${i - 2}] + houses[${i}]) = max(${dp[i - 1]}, ${dp[i - 2]} + ${arr[i]})`,
      codeLine: 3,
      variables: { i, 'dp[i-1]': dp[i - 1], 'dp[i-2]': dp[i - 2], 'houses[i]': arr[i] },
      callStack: ['main() -> houseRobber(houses)'],
    });

    dp[i] = Math.max(dp[i - 1], dp[i - 2] + arr[i]);

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: `dp[${i}] = ${dp[i]}. Cell ${i} finalized.`,
      codeLine: 4,
      variables: { i, 'dp[i]': dp[i] },
      callStack: ['main() -> houseRobber(houses)'],
    });
  }

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: n }, (_, k) => k),
    description: `House Robber complete. Maximum loot = dp[${n - 1}] = ${dp[n - 1]}.`,
    codeLine: 5,
    variables: { result: dp[n - 1], status: 'COMPLETE' },
    callStack: ['main() -> houseRobber(houses) [RETURN]'],
  });

  return {
    steps,
    title: 'House Robber (Bottom-Up DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'dp = array of size n',
      'dp[0] = houses[0], dp[1] = max(houses[0], houses[1])',
      'for i = 2 to n-1 do',
      '  dp[i] = max(dp[i-1], dp[i-2] + houses[i])',
      'return dp[n-1]',
    ],
  };
}
