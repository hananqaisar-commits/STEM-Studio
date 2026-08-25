import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateCountingSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const allIndices = Array.from({ length: n }, (_, i) => i);

  const pseudocode = [
    'maxVal = maximum value in arr',
    'count = array of size maxVal + 1, filled with 0',
    'for i = 0 to n - 1: count[arr[i]]++',
    'for i = 1 to maxVal: count[i] += count[i - 1]',
    'for i = n - 1 downto 0:',
    '    outputIdx = count[arr[i]] - 1',
    '    output[outputIdx] = arr[i]',
    '    count[arr[i]]--',
    'for i = 0 to n - 1: arr[i] = output[i]',
  ];

  if (n === 0) {
    steps.push({
      array: [],
      description: 'Empty array — nothing to sort.',
      codeLine: 1,
      variables: { n: 0 },
      callStack: ['main() -> countingSort(arr)'],
    });
    return {
      steps,
      title: 'Counting Sort',
      category: 'Non-Comparison Sort',
      timeComplexity: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' },
      spaceComplexity: 'O(n+k)',
      pseudocode,
    };
  }

  // ─── Initial state ──────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description:
      'Initial array before Counting Sort begins. This non-comparison sort works by counting the frequency of each value, then using prefix sums to place elements directly into their correct positions.',
    codeLine: 1,
    variables: { n, phase: 'initialization' },
    callStack: ['main() -> countingSort(arr)'],
  });

  // ─── Phase 0: Find maximum value ─────────────────────────────────────────────
  let maxVal = arr[0];
  for (let i = 1; i < n; i++) {
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Scanning for maximum value: comparing arr[${i}] = ${arr[i]} with current max = ${maxVal}.`,
      codeLine: 1,
      variables: { i, maxVal, 'arr[i]': arr[i], phase: 'find_max' },
      callStack: ['main() -> countingSort(arr)'],
    });
    if (arr[i] > maxVal) maxVal = arr[i];
  }

  steps.push({
    array: [...arr],
    description: `Maximum value found: maxVal = ${maxVal}. The count array will need ${maxVal + 1} slots (indices 0 through ${maxVal}).`,
    codeLine: 2,
    variables: { maxVal, countArraySize: maxVal + 1, phase: 'find_max' },
    callStack: ['main() -> countingSort(arr)'],
  });

  // ─── Phase 1: Count occurrences ──────────────────────────────────────────────
  const count = new Array(maxVal + 1).fill(0);

  steps.push({
    array: [...arr],
    description: `Count array created with ${maxVal + 1} slots (indices 0 to ${maxVal}), all initialised to 0. Each slot count[v] will track how many times value v appears in arr.`,
    codeLine: 2,
    variables: { maxVal, count: `[${count.join(', ')}]`, phase: 'counting' },
    callStack: ['main() -> countingSort(arr)'],
  });

  for (let i = 0; i < n; i++) {
    count[arr[i]]++;
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Counting arr[${i}] = ${arr[i]}: incrementing count[${arr[i]}] from ${count[arr[i]] - 1} to ${count[arr[i]]}.`,
      codeLine: 3,
      variables: {
        i,
        'arr[i]': arr[i],
        [`count[${arr[i]}]`]: count[arr[i]],
        phase: 'counting',
      },
      callStack: ['main() -> countingSort(arr)'],
    });
  }

  steps.push({
    array: [...arr],
    description: `Counting complete. Count array is [${count.join(', ')}]. Each count[v] now holds the number of times value v appears in the input.`,
    codeLine: 3,
    variables: { count: `[${count.join(', ')}]`, phase: 'counting_done' },
    callStack: ['main() -> countingSort(arr)'],
  });

  // ─── Phase 2: Prefix sums ────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description:
      'Starting prefix sum computation. After this pass, count[v] will store the number of elements in arr that are ≤ v — giving each value its correct ending position (1-indexed).',
    codeLine: 4,
    variables: { count: `[${count.join(', ')}]`, phase: 'prefix_sum' },
    callStack: ['main() -> countingSort(arr)'],
  });

  for (let i = 1; i <= maxVal; i++) {
    const prev = count[i - 1];
    const cur = count[i];
    count[i] += count[i - 1];
    steps.push({
      array: [...arr],
      description: `Prefix sum at index ${i}: count[${i}] = count[${i}] + count[${i - 1}] = ${cur} + ${prev} = ${count[i]}. There are ${count[i]} element(s) with value ≤ ${i}.`,
      codeLine: 4,
      variables: {
        i,
        [`count[${i}]`]: count[i],
        [`count[${i - 1}]`]: prev,
        runningSum: count[i],
        phase: 'prefix_sum',
      },
      callStack: ['main() -> countingSort(arr)'],
    });
  }

  steps.push({
    array: [...arr],
    description: `Prefix sums complete. count[v] now gives the 1-indexed position of the last occurrence of v. Count array: [${count.join(', ')}].`,
    codeLine: 4,
    variables: { count: `[${count.join(', ')}]`, phase: 'prefix_sum_done' },
    callStack: ['main() -> countingSort(arr)'],
  });

  // ─── Phase 3: Build output array (right-to-left for stability) ───────────────
  const output = new Array(n).fill(0);
  const sortedIndices: number[] = [];

  steps.push({
    array: [...arr],
    description:
      'Building output array by iterating from right to left through arr (ensures stability — equal values retain their original relative order). The count array tells us the correct output position for each value.',
    codeLine: 5,
    variables: { phase: 'placement' },
    callStack: ['main() -> countingSort(arr)'],
  });

  for (let i = n - 1; i >= 0; i--) {
    const outputIdx = count[arr[i]] - 1;
    output[outputIdx] = arr[i];
    count[arr[i]]--;
    sortedIndices.push(outputIdx);

    const outputDisplay = output
      .map((v, idx) => (sortedIndices.includes(idx) ? String(v) : '_'))
      .join(', ');

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      swappingIndices: [outputIdx],
      sortedIndices: [...sortedIndices],
      description: `Placing arr[${i}] = ${arr[i]} at output[${outputIdx}] (count[${arr[i]}] was ${count[arr[i]] + 1}, now decremented to ${count[arr[i]]}).`,
      codeLine: 6,
      variables: {
        i,
        'arr[i]': arr[i],
        outputIdx,
        [`count[${arr[i]}]`]: count[arr[i]],
        output: `[${outputDisplay}]`,
        phase: 'placement',
      },
      callStack: ['main() -> countingSort(arr)'],
    });
  }

  steps.push({
    array: [...arr],
    sortedIndices: [...sortedIndices],
    description: `All elements placed into output array: [${output.join(', ')}]. Now copying output back to arr.`,
    codeLine: 8,
    variables: { output: `[${output.join(', ')}]`, phase: 'copy_back' },
    callStack: ['main() -> countingSort(arr)'],
  });

  // ─── Phase 4: Copy output back to arr ────────────────────────────────────────
  const copySortedIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    arr[i] = output[i];
    copySortedIndices.push(i);
    steps.push({
      array: [...arr],
      swappingIndices: [i],
      sortedIndices: [...copySortedIndices],
      description: `Copying output[${i}] = ${output[i]} back to arr[${i}].`,
      codeLine: 8,
      variables: { i, 'output[i]': output[i], 'arr[i]': arr[i], phase: 'copy_back' },
      callStack: ['main() -> countingSort(arr)'],
    });
  }

  // ─── Final ───────────────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description:
      'Counting Sort complete! The entire array is fully sorted using frequency counting and prefix sums — no element comparisons were needed.',
    codeLine: 9,
    variables: { status: 'SORTED', totalElements: n, maxVal },
    callStack: ['main() -> countingSort(arr) [TERMINATED]'],
  });

  return {
    steps,
    title: 'Counting Sort',
    category: 'Non-Comparison Sort',
    timeComplexity: { best: 'O(n+k)', average: 'O(n+k)', worst: 'O(n+k)' },
    spaceComplexity: 'O(n+k)',
    pseudocode,
  };
}
