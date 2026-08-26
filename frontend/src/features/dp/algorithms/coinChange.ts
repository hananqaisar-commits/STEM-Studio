import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runCoinChange(coins: number[], amount: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const INF = amount + 1;
  const dp: number[] = new Array(amount + 1).fill(INF);
  dp[0] = 0;

  steps.push({
    array: [...dp],
    description: `Starting Coin Change DP. coins=[${coins.join(',')}], amount=${amount}. dp[0]=0, rest=INF(${INF}).`,
    codeLine: 1,
    variables: { amount, coins: coins.join(','), i: 0 },
    callStack: ['main() -> coinChange(coins, amount)'],
  });

  for (let i = 1; i <= amount; i++) {
    steps.push({
      array: [...dp],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i }, (_, k) => k),
      description: `Computing dp[${i}]: trying each coin...`,
      codeLine: 2,
      variables: { i, 'dp[i]': dp[i] },
      callStack: ['main() -> coinChange(coins, amount)'],
    });

    for (const coin of coins) {
      if (i >= coin && dp[i - coin] + 1 < dp[i]) {
        steps.push({
          array: [...dp],
          comparingIndices: [i, i - coin],
          sortedIndices: Array.from({ length: i }, (_, k) => k),
          description: `  coin=${coin}: dp[${i}-${coin}]+1 = dp[${i - coin}]+1 = ${dp[i - coin] + 1} < ${dp[i]}. Update dp[${i}].`,
          codeLine: 3,
          variables: { i, coin, 'i-coin': i - coin, 'dp[i-coin]': dp[i - coin], 'dp[i]': dp[i] },
          callStack: ['main() -> coinChange(coins, amount)'],
        });
        dp[i] = dp[i - coin] + 1;
      }
    }

    steps.push({
      array: [...dp],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: `dp[${i}] = ${dp[i] >= INF ? 'IMPOSSIBLE' : dp[i]}. Cell ${i} finalized.`,
      codeLine: 4,
      variables: { i, 'dp[i]': dp[i] },
      callStack: ['main() -> coinChange(coins, amount)'],
    });
  }

  const result = dp[amount] >= INF ? -1 : dp[amount];
  steps.push({
    array: [...dp],
    sortedIndices: Array.from({ length: amount + 1 }, (_, k) => k),
    description: `Coin Change complete. Minimum coins for amount ${amount}: ${result === -1 ? 'IMPOSSIBLE' : result}.`,
    codeLine: 5,
    variables: { result, status: 'COMPLETE' },
    callStack: ['main() -> coinChange(coins, amount) [RETURN]'],
  });

  return {
    steps,
    title: 'Coin Change (Bottom-Up DP)',
    category: 'Dynamic Programming',
    timeComplexity: { best: 'O(amount * coins)', average: 'O(amount * coins)', worst: 'O(amount * coins)' },
    spaceComplexity: 'O(amount)',
    pseudocode: [
      'dp = array of size amount+1, filled with INF',
      'dp[0] = 0',
      'for i = 1 to amount do',
      '  for each coin in coins do',
      '    if i >= coin: dp[i] = min(dp[i], dp[i-coin]+1)',
      'return dp[amount] == INF ? -1 : dp[amount]',
    ],
  };
}
