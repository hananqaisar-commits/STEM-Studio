import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generatePrefixSumSteps(
  initialArray: number[],
  queries?: { left: number; right: number }[]
): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const prefix: number[] = new Array(n).fill(0);

  steps.push({
    array: [...arr],
    description: `Starting Prefix Sum construction on array of ${n} elements.`,
    codeLine: 1,
    variables: { i: 0, 'arr[i]': arr[0] ?? 0, 'prefix[i]': 0, 'prefix[i-1]': 0 },
    callStack: ['main() -> prefixSum(arr, queries)'],
  });

  // Build phase
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      prefix[0] = arr[0];
    } else {
      prefix[i] = prefix[i - 1] + arr[i];
    }

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: i === 0
        ? `prefix[0] = arr[0] = ${arr[0]}.`
        : `prefix[${i}] = prefix[${i - 1}] + arr[${i}] = ${prefix[i - 1]} + ${arr[i]} = ${prefix[i]}.`,
      codeLine: i === 0 ? 2 : 3,
      variables: { i, 'arr[i]': arr[i], 'prefix[i]': prefix[i], 'prefix[i-1]': i > 0 ? prefix[i - 1] : 0 },
      callStack: ['main() -> prefixSum(arr, queries)', 'buildPrefix()'],
    });
  }

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: n }, (_, i) => i),
    description: `Prefix sum array fully built: [${prefix.join(', ')}].`,
    codeLine: 4,
    variables: { i: n - 1, 'prefix[]': `[${prefix.join(', ')}]`, status: 'built' },
    callStack: ['main() -> prefixSum(arr, queries)', 'buildPrefix() [DONE]'],
  });

  // Query phase
  const effectiveQueries = queries && queries.length > 0
    ? queries
    : generateDefaultQueries(n);

  steps.push({
    array: [...arr],
    description: `Answering ${effectiveQueries.length} range sum queries using the prefix sum array.`,
    codeLine: 5,
    variables: { queryCount: effectiveQueries.length, 'prefix[]': `[${prefix.join(', ')}]` },
    callStack: ['main() -> prefixSum(arr, queries)', 'answerQueries()'],
  });

  for (let q = 0; q < effectiveQueries.length; q++) {
    const { left, right } = effectiveQueries[q];
    const clampedLeft = Math.max(0, Math.min(left, n - 1));
    const clampedRight = Math.max(0, Math.min(right, n - 1));
    const result = clampedLeft === 0 ? prefix[clampedRight] : prefix[clampedRight] - prefix[clampedLeft - 1];

    const formula = clampedLeft === 0
      ? `prefix[${clampedRight}] = ${prefix[clampedRight]}`
      : `prefix[${clampedRight}] - prefix[${clampedLeft - 1}] = ${prefix[clampedRight]} - ${prefix[clampedLeft - 1]}`;

    steps.push({
      array: [...arr],
      comparingIndices: Array.from({ length: clampedRight - clampedLeft + 1 }, (_, i) => clampedLeft + i),
      sortedIndices: Array.from({ length: n }, (_, i) => i),
      description: `Query ${q + 1}: sum(arr[${clampedLeft}..${clampedRight}]) = ${formula} = ${result}.`,
      codeLine: 6,
      variables: {
        left: clampedLeft,
        right: clampedRight,
        'prefix[right]': prefix[clampedRight],
        'prefix[left-1]': clampedLeft > 0 ? prefix[clampedLeft - 1] : 0,
        result,
      },
      callStack: ['main() -> prefixSum(arr, queries)', `query(${clampedLeft}, ${clampedRight})`],
    });
  }

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: n }, (_, i) => i),
    description: `All ${effectiveQueries.length} queries answered. Prefix Sum algorithm complete.`,
    codeLine: 7,
    variables: { status: 'COMPLETE', queryCount: effectiveQueries.length },
    callStack: ['main() -> prefixSum(arr, queries) [RETURN]'],
  });

  return {
    steps,
    title: 'Prefix Sum',
    category: 'Array Algorithms',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'prefix = new array of size n',
      'prefix[0] = arr[0]',
      'for i = 1 to n - 1 do prefix[i] = prefix[i-1] + arr[i]',
      '// prefix sum array built',
      'for each query (left, right) do',
      '  result = prefix[right] - (left > 0 ? prefix[left-1] : 0)',
      'return results',
    ],
  };
}

function generateDefaultQueries(n: number): { left: number; right: number }[] {
  if (n === 0) return [];
  if (n === 1) return [{ left: 0, right: 0 }];
  if (n === 2) return [{ left: 0, right: 1 }];
  return [
    { left: 0, right: Math.floor(n / 2) },
    { left: Math.floor(n / 2), right: n - 1 },
  ];
}
