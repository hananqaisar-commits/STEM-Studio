import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Subarray Sum — prefix sum + HashMap
 * Maintain a running sum; check if (runningSum - target) exists in the map.
 * If yes, the subarray between that stored index+1 and current index sums to target.
 *
 * step.variables encodes:
 *   mapEntries   — "prefixSum0:idx0,prefixSum1:idx1,..."
 *   mapHighlight — prefix sum being looked up (runningSum - target)
 *   mapNew       — prefix sum just added
 *   runningSum   — current prefix sum
 *   complement   — runningSum - target
 */
export function runSubarraySum(arr: number[], target: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = arr.length;
  // Map stores prefixSum → earliest index where that sum was seen
  const prefixMap = new Map<number, number>();
  prefixMap.set(0, -1); // base: sum 0 at index -1

  let runningSum = 0;
  let foundStart = -1;
  let foundEnd = -1;

  // ── Intro step ────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description: `Starting Subarray Sum: find a contiguous subarray summing to ${target} using prefix sums + HashMap.`,
    codeLine: 1,
    variables: {
      target,
      runningSum: 0,
      mapEntries: '0:-1',
      mapHighlight: '',
      mapNew: '0',
    },
    callStack: ['main() -> subarraySum(arr, target)'],
  });

  for (let i = 0; i < n; i++) {
    runningSum += arr[i];
    const complement = runningSum - target;
    const mapEntriesStr = Array.from(prefixMap.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    // Step: check if complement exists
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Index ${i}: runningSum = ${runningSum}. Checking if (runningSum - target) = ${complement} exists in prefix map…`,
      codeLine: 2,
      variables: {
        i,
        'arr[i]': arr[i],
        runningSum,
        complement,
        target,
        mapEntries: mapEntriesStr,
        mapHighlight: String(complement),
        mapNew: '',
      },
      callStack: ['main() -> subarraySum(arr, target)'],
    });

    if (prefixMap.has(complement)) {
      foundStart = prefixMap.get(complement)! + 1;
      foundEnd = i;

      // Mark the subarray range as sortedIndices
      const subarrayIndices: number[] = [];
      for (let j = foundStart; j <= foundEnd; j++) subarrayIndices.push(j);

      steps.push({
        array: [...arr],
        sortedIndices: subarrayIndices,
        description: `Found! prefix sum ${complement} was at index ${prefixMap.get(complement)}. Subarray [${foundStart}…${foundEnd}] sums to ${target}: ${subarrayIndices.map((j) => arr[j]).join(' + ')} = ${target}.`,
        codeLine: 3,
        variables: {
          i,
          'arr[i]': arr[i],
          runningSum,
          complement,
          target,
          foundStart,
          foundEnd,
          mapEntries: mapEntriesStr,
          mapHighlight: String(complement),
          mapNew: '',
        },
        callStack: ['main() -> subarraySum(arr, target) [RETURN]'],
      });
      break;
    } else {
      // Store this prefix sum
      prefixMap.set(runningSum, i);
      const updatedEntriesStr = Array.from(prefixMap.entries())
        .map(([k, v]) => `${k}:${v}`)
        .join(',');

      steps.push({
        array: [...arr],
        comparingIndices: [i],
        description: `Complement ${complement} not found. Storing prefixSum ${runningSum} → index ${i} in map.`,
        codeLine: 4,
        variables: {
          i,
          'arr[i]': arr[i],
          runningSum,
          complement,
          target,
          mapEntries: updatedEntriesStr,
          mapHighlight: '',
          mapNew: String(runningSum),
        },
        callStack: ['main() -> subarraySum(arr, target)'],
      });
    }
  }

  if (foundStart === -1) {
    const mapEntriesStr = Array.from(prefixMap.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    steps.push({
      array: [...arr],
      description: `No subarray sums to ${target} after scanning all ${n} elements.`,
      codeLine: 5,
      variables: { target, runningSum, mapEntries: mapEntriesStr, mapHighlight: '', mapNew: '' },
      callStack: ['main() -> subarraySum(arr, target) [RETURN null]'],
    });
  }

  return {
    steps,
    title: 'Subarray Sum',
    category: 'Hash Map Algorithms',
    timeComplexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'prefixMap = { 0: -1 }',
      'runningSum = 0',
      'for i = 0 to n - 1 do',
      '  runningSum += arr[i]',
      '  complement = runningSum - target',
      '  if complement in prefixMap then',
      '    return [prefixMap[complement]+1, i]',
      '  prefixMap[runningSum] = i',
      'return null  // no subarray found',
    ],
  };
}
