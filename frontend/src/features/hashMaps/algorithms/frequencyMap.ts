import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Frequency Map — build a count map, then identify most/least frequent.
 *
 * step.variables encodes:
 *   mapEntries   — "k0:count0,k1:count1,..."
 *   mapHighlight — key being looked up / incremented
 *   mapNew       — key encountered for the first time
 *   maxFreq      — current maximum frequency
 *   maxKey       — element with highest frequency so far
 */
export function runFrequencyMap(arr: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = arr.length;
  const freq = new Map<number, number>();
  let maxFreq = 0;
  let maxKey = arr[0] ?? 0;

  // ── Intro step ────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description: `Starting Frequency Map: count occurrences of each element in ${n}-element array using a HashMap.`,
    codeLine: 1,
    variables: { mapEntries: '', mapHighlight: '', mapNew: '', maxFreq: 0, maxKey: 0 },
    callStack: ['main() -> frequencyMap(arr)'],
  });

  for (let i = 0; i < n; i++) {
    const val = arr[i];
    const mapEntriesStr = Array.from(freq.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    // Step: process element
    const prevCount = freq.get(val) ?? 0;
    const action = prevCount === 0 ? 'Adding new key' : `Incrementing count (${prevCount} → ${prevCount + 1})`;

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Index ${i}: element = ${val}. ${action} for key ${val} in frequency map.`,
      codeLine: 2,
      variables: {
        i,
        'arr[i]': val,
        mapEntries: mapEntriesStr,
        mapHighlight: String(val),
        mapNew: prevCount === 0 ? String(val) : '',
        maxFreq,
        maxKey,
      },
      callStack: ['main() -> frequencyMap(arr)'],
    });

    // Update map
    freq.set(val, prevCount + 1);
    const newCount = prevCount + 1;
    if (newCount > maxFreq) {
      maxFreq = newCount;
      maxKey = val;
    }

    const updatedEntriesStr = Array.from(freq.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Updated map: ${val} → ${newCount}. Current max frequency = ${maxFreq} (element ${maxKey}).`,
      codeLine: 3,
      variables: {
        i,
        'arr[i]': val,
        count: newCount,
        mapEntries: updatedEntriesStr,
        mapHighlight: '',
        mapNew: prevCount === 0 ? String(val) : '',
        maxFreq,
        maxKey,
      },
      callStack: ['main() -> frequencyMap(arr)'],
    });
  }

  // ── Find min frequency ─────────────────────────────────────────────────
  let minFreq = Infinity;
  let minKey = maxKey;
  for (const [k, v] of freq.entries()) {
    if (v < minFreq) {
      minFreq = v;
      minKey = k;
    }
  }

  const finalEntriesStr = Array.from(freq.entries())
    .map(([k, v]) => `${k}:${v}`)
    .join(',');

  steps.push({
    array: [...arr],
    sortedIndices: Array.from(freq.keys()).map((k) => arr.indexOf(k)),
    description: `Frequency map complete. Most frequent: ${maxKey} (×${maxFreq}). Least frequent: ${minKey} (×${minFreq}). Unique elements: ${freq.size}.`,
    codeLine: 4,
    variables: {
      mapEntries: finalEntriesStr,
      mapHighlight: '',
      mapNew: '',
      maxFreq,
      maxKey,
      minFreq,
      minKey,
      uniqueCount: freq.size,
    },
    callStack: ['main() -> frequencyMap(arr) [RETURN]'],
  });

  return {
    steps,
    title: 'Frequency Map',
    category: 'Hash Map Algorithms',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(k) where k = unique elements',
    pseudocode: [
      'freq = empty HashMap',
      'for i = 0 to n - 1 do',
      '  freq[arr[i]] = freq.get(arr[i], 0) + 1',
      'maxKey = key with highest freq',
      'minKey = key with lowest freq',
      'return { freq, maxKey, minKey }',
    ],
  };
}
