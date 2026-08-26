import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion , QuizRevisionData } from '../../engine/types/Quiz';
import { buildOptions } from '../../engine/types/Quiz';

type DPAlgorithmKey = 'fibonacciDP' | 'coinChange' | 'houseRobber' | 'knapsack01' | 'lcs' | 'lis' | 'editDistance' | 'uniquePaths';

/* ── Anchor data per algorithm ────────────────────────────────────────── */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<DPAlgorithmKey, Anchor> = {
  fibonacciDP: {
    prompt: 'Before it starts: what is the recurrence relation for Fibonacci?',
    correct: 'dp[i] = dp[i-1] + dp[i-2]',
    distractors: [
      'dp[i] = dp[i-1] * dp[i-2]',
      'dp[i] = dp[i-1] + i',
      'dp[i] = 2 * dp[i-1]',
    ],
    explanation: 'The Fibonacci sequence is defined by the recurrence dp[i] = dp[i-1] + dp[i-2], with base cases dp[0]=0 and dp[1]=1. Each term is the sum of the two preceding terms.',
    hint: 'Each Fibonacci number is built from the two numbers before it.',
    concept: 'Recurrence relation',
  },
  coinChange: {
    prompt: 'Before it starts: what does dp[i] represent in the Coin Change problem?',
    correct: 'The minimum number of coins needed to make amount i',
    distractors: [
      'The maximum number of coins that sum to i',
      'Whether amount i can be made at all',
      'The number of distinct ways to make amount i',
    ],
    explanation: 'In the coin change problem, dp[i] stores the minimum number of coins needed to make amount i. If dp[amount] remains infinity, the amount cannot be formed.',
    hint: 'Think optimization: we want the fewest coins possible.',
    concept: 'State definition',
  },
  houseRobber: {
    prompt: 'Before it starts: why can\'t the robber simply pick every other house?',
    correct: 'The optimal non-adjacent subset depends on values, not just positions',
    distractors: [
      'Because houses are not always evenly indexed',
      'Because the robber can rob three houses in a row',
      'Because the problem allows robbing adjacent houses',
    ],
    explanation: 'The house robber problem requires choosing a subset of non-adjacent houses to maximize total value. Simply picking every other house ignores that a different spacing might yield more money.',
    hint: 'Think about which houses give the best total, not just a fixed pattern.',
    concept: 'Optimal substructure',
  },
  knapsack01: {
    prompt: 'Before it starts: what does dp[i][w] represent in 0/1 Knapsack?',
    correct: 'Maximum value using items 1..i with weight capacity w',
    distractors: [
      'The total weight of items 1..i',
      'Whether item i is included in the optimal set',
      'The number of items that fit in capacity w',
    ],
    explanation: 'In 0/1 knapsack, dp[i][w] stores the maximum value achievable using a subset of the first i items with total weight at most w. This captures all necessary information for optimal decisions.',
    hint: 'The state must encode both which items we have considered and how much capacity remains.',
    concept: 'State definition',
  },
  lcs: {
    prompt: 'Before it starts: what is the key insight that enables DP for LCS?',
    correct: 'If s1[i]==s2[j], the LCS includes that character plus LCS of the prefixes',
    distractors: [
      'LCS can only be solved by checking all subsequences',
      'The longest common subsequence is always contiguous',
      'Characters must appear at the same index in both strings',
    ],
    explanation: 'When s1[i]==s2[j], we know this character is part of the LCS, so dp[i][j] = dp[i-1][j-1]+1. When they differ, we take the best of dropping either character.',
    hint: 'Matching characters give a clear extension; mismatches require a choice.',
    concept: 'Optimal substructure',
  },
  lis: {
    prompt: 'Before it starts: what does dp[i] represent in the LIS problem?',
    correct: 'Length of the longest increasing subsequence ending at index i',
    distractors: [
      'Length of the longest increasing subsequence in the entire array',
      'The value of the i-th element in the longest subsequence',
      'The number of increasing subsequences starting at index i',
    ],
    explanation: 'dp[i] stores the length of the longest increasing subsequence that ends specifically at index i. The answer is the maximum over all dp[i].',
    hint: 'Each index contributes its own subsequence ending there.',
    concept: 'State definition',
  },
  editDistance: {
    prompt: 'Before it starts: what are the three operations in the Edit Distance problem?',
    correct: 'Insert a character, delete a character, or replace a character',
    distractors: [
      'Swap adjacent characters, reverse a substring, or delete a character',
      'Insert a character, duplicate a character, or shift a character',
      'Replace a word, delete a word, or insert a word',
    ],
    explanation: 'Edit distance (Levenshtein distance) allows three operations on single characters: insert, delete, or replace. Each costs 1. The goal is to find the minimum total cost to transform one string into another.',
    hint: 'Think single-character operations, not multi-character ones.',
    concept: 'Operations',
  },
  uniquePaths: {
    prompt: 'Before it starts: what is the recurrence for counting unique paths in a grid?',
    correct: 'dp[i][j] = dp[i-1][j] + dp[i][j-1] (paths from above + paths from left)',
    distractors: [
      'dp[i][j] = dp[i-1][j] * dp[i][j-1]',
      'dp[i][j] = dp[i-1][j-1] + 1',
      'dp[i][j] = dp[i][j] + dp[i-1][j+1]',
    ],
    explanation: 'At any cell (i,j), you can only arrive from above (i-1,j) or from the left (i,j-1). So the total paths to (i,j) is the sum of paths to those two cells.',
    hint: 'You can only move right or down in the grid.',
    concept: 'Recurrence relation',
  },
};

/* ── Mid-execution question generators ────────────────────────────────── */

function getMidQuestion(
  algorithm: DPAlgorithmKey,
  step: ArrayStep,
  _stepIndex: number
): QuizQuestion {
  const { variables = {} } = step;

  switch (algorithm) {
    case 'fibonacciDP': {
      const i = typeof variables.i === 'number' ? variables.i : 2;
      const dpI1 = typeof variables['dp[i-1]'] === 'number' ? variables['dp[i-1]'] : 0;
      const dpI2 = typeof variables['dp[i-2]'] === 'number' ? variables['dp[i-2]'] : 0;
      const expected = (dpI1 as number) + (dpI2 as number);
      const id = `dp-${algorithm}-mid`;
      const built = buildOptions(id, `${expected}`, [`${expected + 1}`, `${expected - 1}`, `${(dpI1 as number) * 2}`]);
      return {
        id,
        prompt: `Computing dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dpI1} + ${dpI2}. What is dp[${i}]?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `dp[${i}] = ${dpI1} + ${dpI2} = ${expected}.`,
        hint: 'Just add the two preceding dp values.',
        concept: 'Recurrence computation',
        weight: 2,
      };
    }

    case 'coinChange': {
      const i = typeof variables.i === 'number' ? variables.i : 1;
      const dpI = typeof variables['dp[i]'] === 'number' ? variables['dp[i]'] : 0;
      const id = `dp-${algorithm}-mid`;
      const built = buildOptions(id, `dp[${i}] is finalized`, ['dp array is reset', 'All coins are used', 'Amount is unreachable']);
      return {
        id,
        prompt: `After processing amount ${i}, what happens next in the algorithm?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `After trying all coins for amount ${i}, dp[${i}] = ${dpI} is finalized and the algorithm moves to amount ${i + 1}.`,
        hint: 'The outer loop iterates over amounts one by one.',
        concept: 'Loop progression',
        weight: 2,
      };
    }

    case 'houseRobber': {
      const i = typeof variables.i === 'number' ? variables.i : 2;
      const dpI1 = typeof variables['dp[i-1]'] === 'number' ? variables['dp[i-1]'] : 0;
      const dpI2 = typeof variables['dp[i-2]'] === 'number' ? variables['dp[i-2]'] : 0;
      const housesI = typeof variables['houses[i]'] === 'number' ? variables['houses[i]'] : 0;
      const skip = dpI1;
      const take = (dpI2 as number) + (housesI as number);
      const id = `dp-${algorithm}-mid`;
      const correct = take > skip ? `Rob house ${i}: ${take}` : `Skip house ${i}: ${skip}`;
      const wrong = take > skip ? `Skip house ${i}: ${skip}` : `Rob house ${i}: ${take}`;
      const built = buildOptions(id, correct, [wrong, `Rob both adjacent houses`, 'Reset dp to zero']);
      return {
        id,
        prompt: `At house ${i}: skip gives ${skip}, take gives ${take}. Which is chosen?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `dp[${i}] = max(dp[${i - 1}], dp[${i - 2}] + houses[${i}]) = max(${skip}, ${take}) = ${Math.max(skip, take)}.`,
        hint: 'Compare the value of skipping vs taking the current house.',
        concept: 'State transition',
        weight: 2,
      };
    }

    case 'knapsack01': {
      const i = typeof variables.i === 'number' ? variables.i : 1;
      const w = typeof variables.w === 'number' ? variables.w : 0;
      const wi = typeof variables.wi === 'number' ? variables.wi : 0;
      const id = `dp-${algorithm}-mid`;
      const canTake = w >= wi;
      const built = buildOptions(
        id,
        canTake ? 'Consider both taking and skipping the item' : 'Skip the item (too heavy for this capacity)',
        [
          canTake ? 'Skip the item (too heavy for this capacity)' : 'Consider both taking and skipping the item',
          'Take the item regardless of weight',
          'Move to the next row',
        ]
      );
      return {
        id,
        prompt: `Item ${i} (weight ${wi}), current capacity w=${w}. What does the algorithm do?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: canTake
          ? `Since weight ${wi} <= capacity ${w}, we compare taking (dp[i-1][w-wi]+vi) vs skipping (dp[i-1][w]).`
          : `Since weight ${wi} > capacity ${w}, we cannot take this item, so dp[i][w] = dp[i-1][w].`,
        hint: 'Check if the item fits before deciding.',
        concept: 'Item decision',
        weight: 2,
      };
    }

    case 'lcs': {
      const i = typeof variables.i === 'number' ? variables.i : 1;
      const j = typeof variables.j === 'number' ? variables.j : 1;
      const s1 = typeof variables.s1 === 'string' ? variables.s1 : '';
      const s2 = typeof variables.s2 === 'string' ? variables.s2 : '';
      const match = s1[i - 1] === s2[j - 1];
      const id = `dp-${algorithm}-mid`;
      const built = buildOptions(
        id,
        match ? 'Characters match: dp[i][j] = dp[i-1][j-1] + 1' : 'Characters differ: dp[i][j] = max(dp[i-1][j], dp[i][j-1])',
        [
          match ? 'Characters differ: dp[i][j] = max(dp[i-1][j], dp[i][j-1])' : 'Characters match: dp[i][j] = dp[i-1][j-1] + 1',
          'Reset dp[i][j] to zero',
          'Skip both characters',
        ]
      );
      return {
        id,
        prompt: `Comparing s1[${i - 1}]='${s1[i - 1] || '?'}' with s2[${j - 1}]='${s2[j - 1] || '?'}'. What happens?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: match
          ? `The characters match, so dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1.`
          : `The characters differ, so dp[${i}][${j}] = max(dp[${i - 1}][${j}], dp[${i}][${j - 1}]).`,
        hint: 'Match extends the subsequence; mismatch takes the best alternative.',
        concept: 'Character comparison',
        weight: 2,
      };
    }

    case 'lis': {
      const i = typeof variables.i === 'number' ? variables.i : 1;
      const j = typeof variables.j === 'number' ? variables.j : 0;
      const arrI = typeof variables['arr[i]'] === 'number' ? variables['arr[i]'] : 0;
      const arrJ = typeof variables['arr[j]'] === 'number' ? variables['arr[j]'] : 0;
      const extend = (arrJ as number) < (arrI as number);
      const id = `dp-${algorithm}-mid`;
      const built = buildOptions(
        id,
        extend ? `Extend: dp[${i}] = max(dp[${i}], dp[${j}]+1)` : `Skip j=${j}: arr[${j}]=${arrJ} >= arr[${i}]=${arrI}`,
        [
          extend ? `Skip j=${j}: arr[${j}]=${arrJ} >= arr[${i}]=${arrI}` : `Extend: dp[${i}] = max(dp[${i}], dp[${j}]+1)`,
          'Reset dp[i] to 0',
          'Move to the next outer loop iteration',
        ]
      );
      return {
        id,
        prompt: `Checking j=${j} for i=${i}: arr[${j}]=${arrJ} vs arr[${i}]=${arrI}. What happens?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: extend
          ? `arr[${j}]=${arrJ} < arr[${i}]=${arrI}, so we can extend the subsequence ending at j. dp[${i}] may increase.`
          : `arr[${j}]=${arrJ} >= arr[${i}]=${arrI}, so j cannot precede i in an increasing subsequence. Skip.`,
        hint: 'For LIS, we need arr[j] < arr[i] to extend.',
        concept: 'Extension check',
        weight: 2,
      };
    }

    case 'editDistance': {
      const i = typeof variables.i === 'number' ? variables.i : 1;
      const j = typeof variables.j === 'number' ? variables.j : 1;
      const s1 = typeof variables.s1 === 'string' ? variables.s1 : '';
      const s2 = typeof variables.s2 === 'string' ? variables.s2 : '';
      const match = s1[i - 1] === s2[j - 1];
      const id = `dp-${algorithm}-mid`;
      const built = buildOptions(
        id,
        match ? 'No edit needed: dp[i][j] = dp[i-1][j-1]' : 'Choose min of insert, delete, replace + 1',
        [
          match ? 'Choose min of insert, delete, replace + 1' : 'No edit needed: dp[i][j] = dp[i-1][j-1]',
          'Skip this cell entirely',
          'Always replace the character',
        ]
      );
      return {
        id,
        prompt: `s1[${i - 1}]='${s1[i - 1] || '?'}' vs s2[${j - 1}]='${s2[j - 1] || '?'}'. What is dp[${i}][${j}]?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: match
          ? 'Characters match, so no operation is needed. dp[i][j] = dp[i-1][j-1].'
          : 'Characters differ, so we pick the cheapest of insert, delete, or replace (each +1).',
        hint: 'A match costs 0; a mismatch costs 1 plus the best subproblem.',
        concept: 'Edit operation',
        weight: 2,
      };
    }

    case 'uniquePaths': {
      const i = typeof variables.i === 'number' ? variables.i : 1;
      const j = typeof variables.j === 'number' ? variables.j : 1;
      const dpAbove = typeof variables['dp[above]'] === 'number' ? variables['dp[above]'] : 0;
      const dpLeft = typeof variables['dp[left]'] === 'number' ? variables['dp[left]'] : 0;
      const expected = (dpAbove as number) + (dpLeft as number);
      const id = `dp-${algorithm}-mid`;
      const built = buildOptions(id, `${expected}`, [`${expected + 1}`, `${(dpAbove as number) * 2}`, `${dpLeft}`]);
      return {
        id,
        prompt: `dp[${i}][${j}] = dp[${i - 1}][${j}] + dp[${i}][${j - 1}] = ${dpAbove} + ${dpLeft}. What is dp[${i}][${j}]?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `dp[${i}][${j}] = ${dpAbove} + ${dpLeft} = ${expected}.`,
        hint: 'Sum the paths from above and from the left.',
        concept: 'Path counting',
        weight: 2,
      };
    }
  }
}

/* ── Main adapter entry point ────────────────────────────────────────── */

export function buildDPCheckpoints(
  steps: ArrayStep[],
  algorithm: DPAlgorithmKey
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const anchor = ANCHORS[algorithm];

  // Anchor question at step 0
  const anchorId = `dp-${algorithm}-anchor`;
  const anchorOptions = buildOptions(anchorId, anchor.correct, anchor.distractors);
  checkpoints.push({
    stepIndex: 0,
    question: {
      id: anchorId,
      prompt: anchor.prompt,
      options: anchorOptions.options,
      correctIndex: anchorOptions.correctIndex,
      explanation: anchor.explanation,
      hint: anchor.hint,
      concept: anchor.concept,
      weight: 1,
    },
  });

  // Mid-execution question at ~40% of steps
  if (steps.length > 5) {
    const midIdx = Math.floor(steps.length * 0.4);
    const midStep = steps[midIdx];
    const midQ = getMidQuestion(algorithm, midStep, midIdx);
    checkpoints.push({ stepIndex: midIdx, question: midQ });
  }

  // Late-execution reinforcement at ~75% for larger executions
  if (steps.length > 12) {
    const lateIdx = Math.floor(steps.length * 0.75);
    const lateStep = steps[lateIdx];
    const lateQ = getMidQuestion(algorithm, lateStep, lateIdx);
    lateQ.id = `${lateQ.id}-late`;
    lateQ.weight = 3;
    checkpoints.push({ stepIndex: lateIdx, question: lateQ });
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<DPAlgorithmKey, QuizRevisionData> = {
  fibonacciDP: {
    description: 'Compute Fibonacci numbers using dynamic programming',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Store previously computed values to avoid redundant recalculation',
    watchFor: ['Recurrence relation', 'Base cases', 'Space optimization'],
    quickTip: 'Only need dp[i-1] and dp[i-2]—can optimize space to O(1) with two variables',
    example: 'dp[0]=0, dp[1]=1, dp[2]=1, dp[3]=2, dp[4]=3, dp[5]=5. Each value is the sum of the two before it.',
  },
  coinChange: {
    description: 'Find minimum coins needed to make a target amount',
    complexity: 'O(amount × coins) time, O(amount) space',
    keyIdea: 'dp[i] = min(dp[i - coin] + 1) for all coin denominations',
    watchFor: ['State definition', 'Transition', 'Unreachable amount handling'],
    quickTip: 'Initialize dp array with infinity—dp[0] = 0; if dp[amount] stays infinity, it is impossible',
    example: 'Coins [1,5,10], amount=12: dp[12] = min(dp[11]+1, dp[7]+1, dp[2]+1) = min(11+1, 2+1, 2+1) = 3 coins (10+1+1 or 5+5+1+1... no, 10+1+1).',
  },
  houseRobber: {
    description: 'Maximize robbed value without robbing adjacent houses',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'dp[i] = max(dp[i-1], dp[i-2] + house[i])—skip current or take it',
    watchFor: ['State transition', 'Non-adjacency constraint', 'Space optimization'],
    quickTip: 'At each house, choose: skip it (keep dp[i-1]) or rob it (dp[i-2] + house[i])',
    example: 'Houses [2,7,9,3,1]: dp=[2,7,11,11,12]. At house 2 (val=9): max(dp[1]=7, dp[0]+9=11) = 11. Answer: 12.',
  },
  knapsack01: {
    description: 'Maximize value in a knapsack with 0/1 item choices',
    complexity: 'O(n × capacity) time, O(n × capacity) space',
    keyIdea: 'dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])',
    watchFor: ['2D state', 'Item inclusion decision', 'Space optimization to 1D'],
    quickTip: 'Process items one by one—for each, decide: skip (take above cell) or take (add value to cell at reduced weight)',
    example: 'Items [(w=2,v=3),(w=3,v=4),(w=4,v=5)], capacity=5: best is items 1+2 with weight 5, value 7.',
  },
  lcs: {
    description: 'Find the longest common subsequence of two strings',
    complexity: 'O(m × n) time, O(m × n) space',
    keyIdea: 'If characters match, extend LCS; otherwise take the best of skipping one character from either string',
    watchFor: ['Match vs mismatch', 'Diagonal vs adjacent cells', 'Reconstruction'],
    quickTip: 'Match: dp[i][j] = dp[i-1][j-1] + 1; mismatch: dp[i][j] = max(dp[i-1][j], dp[i][j-1])',
    example: 's1="ABCBDAB", s2="BDCAB": LCS is "BCAB" (length 4). Match at B,C,A,B positions.',
  },
  lis: {
    description: 'Find the length of the longest increasing subsequence',
    complexity: 'O(n²) time, O(n) space',
    keyIdea: 'dp[i] = length of LIS ending at index i; check all j < i where arr[j] < arr[i]',
    watchFor: ['O(n²) DP vs O(n log n) patience sort', 'Extension condition', 'Max over all dp[i]'],
    quickTip: 'Answer is max(dp[i]) over all i—not necessarily dp[n-1]',
    example: 'Array [10,9,2,5,3,7,101,18]: dp=[1,1,1,2,2,3,4,4]. LIS length is 4 (e.g. [2,5,7,101]).',
  },
  editDistance: {
    description: 'Find minimum edits to transform one string into another',
    complexity: 'O(m × n) time, O(m × n) space',
    keyIdea: 'Match costs 0; mismatch costs 1 + min(insert, delete, replace)',
    watchFor: ['Three operations', 'Match shortcut', 'Base cases (empty strings)'],
    quickTip: 'If chars match, dp[i][j] = dp[i-1][j-1]; else dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])',
    example: 's1="kitten", s2="sitting": edit distance = 3 (replace k→s, replace e→i, insert g).',
  },
  uniquePaths: {
    description: 'Count unique paths from top-left to bottom-right in a grid',
    complexity: 'O(m × n) time, O(m × n) space',
    keyIdea: 'dp[i][j] = dp[i-1][j] + dp[i][j-1]—paths come from above or left',
    watchFor: ['Recurrence', 'Base cases (first row/col)', 'Space optimization'],
    quickTip: 'First row and first column all have 1 path—every other cell sums paths from above and left',
    example: '3×3 grid: dp=[[1,1,1],[1,2,3],[1,3,6]]. Answer = 6 paths from top-left to bottom-right.',
  },
};

export function buildRevisionData(key: DPAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
