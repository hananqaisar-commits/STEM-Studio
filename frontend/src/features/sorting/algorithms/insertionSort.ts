import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateInsertionSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;

  steps.push({
    array: [...arr],
    sortedIndices: n > 0 ? [0] : [],
    description: 'Initial state. First element is considered sorted by default.',
    codeLine: 1,
    operation: 'begin',
    variables: { n, i: Math.min(1, n), key: arr[1] ?? null },
    callStack: ['main() -> insertionSort(arr)'],
  });

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;

    steps.push({
      array: [...arr],
      pivotIndex: i,
      sortedIndices: Array.from({ length: i }, (_, k) => k),
      description: `Selected key element ${key} at index ${i} to insert into sorted sub-array.`,
      codeLine: 2,
      operation: 'hold key',
      heldValue: key,
      heldIndex: i,
      variables: { i, j, key, 'arr[i]': key },
      callStack: ['main() -> insertionSort(arr)'],
    });

    while (j >= 0) {
      const shouldShift = arr[j] > key;
      steps.push({
        array: [...arr],
        comparingIndices: [j],
        description: shouldShift
          ? `Compare held key ${key} with arr[${j}] = ${arr[j]}. Since ${arr[j]} > ${key}, copy arr[${j}] one slot right.`
          : `Compare held key ${key} with arr[${j}] = ${arr[j]}. Since ${arr[j]} <= ${key}, stop shifting; the key belongs at index ${j + 1}.`,
        codeLine: 4,
        operation: 'compare',
        heldValue: key,
        heldIndex: i,
        variables: { i, j, key, 'arr[j]': arr[j], condition: `${arr[j]} > ${key}`, shouldShift },
        callStack: ['main() -> insertionSort(arr)'],
      });

      if (!shouldShift) break;

      const sourceIndex = j;
      arr[j + 1] = arr[j];
      j = j - 1;

      steps.push({
        array: [...arr],
        comparingIndices: [sourceIndex],
        writeIndex: sourceIndex + 1,
        writeValue: arr[sourceIndex + 1],
        description: `Copy ${arr[sourceIndex]} from arr[${sourceIndex}] into arr[${sourceIndex + 1}]. The empty insertion slot moves left to index ${j + 1}.`,
        codeLine: 5,
        operation: 'shift right',
        heldValue: key,
        heldIndex: i,
        variables: { i, j, key, shiftedFrom: sourceIndex, shiftedTo: sourceIndex + 1, holeIndex: j + 1 },
        callStack: ['main() -> insertionSort(arr)'],
      });
    }

    if (j < 0) {
      steps.push({
        array: [...arr],
        heldValue: key,
        heldIndex: i,
        operation: 'insertion point is the beginning',
        description: `The scan reached index -1; every value in the sorted prefix was greater than ${key}, so insert the held key at index 0.`,
        codeLine: 4,
        variables: { i, j, key, insertionIndex: 0 },
        callStack: ['main() -> insertionSort(arr)'],
      });
    }

    arr[j + 1] = key;
    steps.push({
      array: [...arr],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      writeIndex: j + 1,
      writeValue: key,
      description: `Inserted key ${key} at index ${j + 1}.`,
      codeLine: 7,
      operation: 'write held key',
      heldValue: null,
      variables: { i, insertedAt: j + 1, key },
      callStack: ['main() -> insertionSort(arr)'],
    });
  }

  const allIndices = Array.from({ length: n }, (_, i) => i);
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description: 'Insertion Sort complete! Entire array is sorted.',
    codeLine: 8,
    variables: { status: 'SORTED', totalElements: n },
    callStack: ['main() -> insertionSort(arr) [TERMINATED]'],
  });

  return {
    steps,
    title: 'Insertion Sort',
    category: 'Comparison Sort',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n²)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'for i = 1 to n - 1 do',
      '  key = arr[i]',
      '  j = i - 1',
      '  while j >= 0 and arr[j] > key do',
      '    arr[j + 1] = arr[j]',
      '    j = j - 1',
      '  end while',
      '  arr[j + 1] = key',
      'end for',
    ],
  };
}
