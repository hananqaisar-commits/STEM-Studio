import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Duplicate Detect — HashSet approach
 * Traverse array, insert each element into a HashSet.
 * If the element already exists → duplicate found.
 *
 * step.variables encodes:
 *   setEntries   — "v0,v1,v2,..."  (set members)
 *   mapEntries   — same as setEntries with :true (for renderer compat)
 *   mapHighlight — element being looked up
 *   mapNew       — element just added
 */
export function runDuplicateDetect(arr: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = arr.length;
  const seen = new Set<number>();

  // ── Intro step ────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description: `Starting Duplicate Detection: scan ${n} elements using a HashSet for O(1) membership checks.`,
    codeLine: 1,
    variables: { setEntries: '', mapEntries: '', mapHighlight: '', mapNew: '' },
    callStack: ['main() -> duplicateDetect(arr)'],
  });

  let dupFound = false;

  for (let i = 0; i < n; i++) {
    const val = arr[i];
    const setEntriesStr = Array.from(seen).join(',');
    const mapEntriesStr = Array.from(seen).map((v) => `${v}:true`).join(',');

    // Step: check membership
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Index ${i}: checking if ${val} is in HashSet…  Set = {${setEntriesStr}}`,
      codeLine: 2,
      variables: {
        i,
        'arr[i]': val,
        setEntries: setEntriesStr,
        mapEntries: mapEntriesStr,
        mapHighlight: String(val),
        mapNew: '',
      },
      callStack: ['main() -> duplicateDetect(arr)'],
    });

    if (seen.has(val)) {
      dupFound = true;

      steps.push({
        array: [...arr],
        sortedIndices: [i],
        description: `Duplicate found! ${val} is already in the HashSet. First duplicate at index ${i}.`,
        codeLine: 3,
        variables: {
          i,
          'arr[i]': val,
          duplicate: val,
          setEntries: setEntriesStr,
          mapEntries: mapEntriesStr,
          mapHighlight: String(val),
          mapNew: '',
        },
        callStack: ['main() -> duplicateDetect(arr) [RETURN]'],
      });
      break;
    } else {
      seen.add(val);
      const updatedSetStr = Array.from(seen).join(',');
      const updatedMapStr = Array.from(seen).map((v) => `${v}:true`).join(',');

      steps.push({
        array: [...arr],
        comparingIndices: [i],
        description: `${val} not in HashSet. Adding ${val} to set. Set = {${updatedSetStr}}`,
        codeLine: 4,
        variables: {
          i,
          'arr[i]': val,
          setEntries: updatedSetStr,
          mapEntries: updatedMapStr,
          mapHighlight: '',
          mapNew: String(val),
        },
        callStack: ['main() -> duplicateDetect(arr)'],
      });
    }
  }

  if (!dupFound) {
    const setEntriesStr = Array.from(seen).join(',');
    const mapEntriesStr = Array.from(seen).map((v) => `${v}:true`).join(',');
    steps.push({
      array: [...arr],
      description: `No duplicates found after scanning all ${n} elements. Set = {${setEntriesStr}}`,
      codeLine: 5,
      variables: { setEntries: setEntriesStr, mapEntries: mapEntriesStr, mapHighlight: '', mapNew: '' },
      callStack: ['main() -> duplicateDetect(arr) [RETURN -1]'],
    });
  }

  return {
    steps,
    title: 'Duplicate Detection',
    category: 'Hash Map Algorithms',
    timeComplexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'seen = empty HashSet',
      'for i = 0 to n - 1 do',
      '  if arr[i] in seen then',
      '    return i  // duplicate found',
      '  seen.add(arr[i])',
      'return -1  // no duplicates',
    ],
  };
}
