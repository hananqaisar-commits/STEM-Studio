import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Two Sum — HashMap approach
 * For each element, check if (target - element) exists in the map.
 * If yes → pair found. If no → add current element → index to map.
 *
 * step.variables encodes HashMap state:
 *   mapEntries   — "k0:v0,k1:v1,..."  (key→index pairs)
 *   mapHighlight — key being looked up (complement)
 *   mapNew       — key just inserted
 */
export function runTwoSum(arr: number[], target: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = arr.length;
  const map = new Map<number, number>(); // value → index

  // ── Intro step ────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description: `Starting Two Sum: find two indices whose values sum to ${target}. Scanning array of ${n} elements with a HashMap for O(1) complement lookups.`,
    codeLine: 1,
    variables: { target, mapEntries: '', mapHighlight: '', mapNew: '' },
    callStack: ['main() -> twoSum(arr, target)'],
  });

  let foundI = -1;
  let foundJ = -1;

  for (let i = 0; i < n; i++) {
    const complement = target - arr[i];
    const mapEntriesStr = Array.from(map.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    // Step: check complement
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Index ${i}: value = ${arr[i]}, complement = ${target} - ${arr[i]} = ${complement}. Looking up ${complement} in HashMap…`,
      codeLine: 2,
      variables: {
        i,
        'arr[i]': arr[i],
        complement,
        target,
        mapEntries: mapEntriesStr,
        mapHighlight: String(complement),
        mapNew: '',
      },
      callStack: ['main() -> twoSum(arr, target)'],
    });

    if (map.has(complement)) {
      foundI = map.get(complement)!;
      foundJ = i;

      steps.push({
        array: [...arr],
        sortedIndices: [foundI, foundJ],
        description: `Complement ${complement} found in HashMap at index ${foundI}! arr[${foundI}] + arr[${foundJ}] = ${arr[foundI]} + ${arr[foundJ]} = ${target}. Pair found!`,
        codeLine: 3,
        variables: {
          i,
          'arr[i]': arr[i],
          complement,
          target,
          mapEntries: mapEntriesStr,
          mapHighlight: String(complement),
          mapNew: '',
          foundI,
          foundJ,
        },
        callStack: ['main() -> twoSum(arr, target) [RETURN]'],
      });
      break;
    } else {
      map.set(arr[i], i);
      const updatedEntries = Array.from(map.entries())
        .map(([k, v]) => `${k}:${v}`)
        .join(',');

      steps.push({
        array: [...arr],
        comparingIndices: [i],
        description: `Complement ${complement} not in HashMap. Adding arr[${i}] = ${arr[i]} → index ${i} to HashMap.`,
        codeLine: 4,
        variables: {
          i,
          'arr[i]': arr[i],
          complement,
          target,
          mapEntries: updatedEntries,
          mapHighlight: '',
          mapNew: String(arr[i]),
        },
        callStack: ['main() -> twoSum(arr, target)'],
      });
    }
  }

  if (foundI === -1) {
    const mapEntriesStr = Array.from(map.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    steps.push({
      array: [...arr],
      description: `No two elements sum to ${target} after scanning all ${n} elements.`,
      codeLine: 5,
      variables: { target, mapEntries: mapEntriesStr, mapHighlight: '', mapNew: '' },
      callStack: ['main() -> twoSum(arr, target) [RETURN null]'],
    });
  }

  return {
    steps,
    title: 'Two Sum',
    category: 'Hash Map Algorithms',
    timeComplexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'map = empty HashMap',
      'for i = 0 to n - 1 do',
      '  complement = target - arr[i]',
      '  if complement in map then',
      '    return [map[complement], i]',
      '  map[arr[i]] = i',
      'return null  // no pair found',
    ],
  };
}
