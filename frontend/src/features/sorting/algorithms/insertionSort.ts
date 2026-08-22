import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateInsertionSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;

  steps.push({
    array: [...arr],
    sortedIndices: [0],
    description: 'Initial state. First element is considered sorted by default.',
    codeLine: 1,
    variables: { n, i: 1, key: arr[1] },
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
      variables: { i, j, key, 'arr[i]': key },
      callStack: ['main() -> insertionSort(arr)'],
    });

    while (j >= 0 && arr[j] > key) {
      steps.push({
        array: [...arr],
        comparingIndices: [j, j + 1],
        pivotIndex: i,
        description: `Comparing key (${key}) with arr[${j}] (${arr[j]}). ${arr[j]} > ${key}, shifting ${arr[j]} right.`,
        codeLine: 4,
        variables: { i, j, key, 'arr[j]': arr[j], condition: `${arr[j]} > ${key}` },
        callStack: ['main() -> insertionSort(arr)'],
      });

      arr[j + 1] = arr[j];
      j = j - 1;

      steps.push({
        array: [...arr],
        swappingIndices: [j + 1, j + 2],
        description: `Shifted element right to make space for key.`,
        codeLine: 5,
        variables: { i, j, key, 'shiftedTo': j + 2 },
        callStack: ['main() -> insertionSort(arr)'],
      });
    }

    arr[j + 1] = key;
    steps.push({
      array: [...arr],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: `Inserted key ${key} at index ${j + 1}.`,
      codeLine: 7,
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
