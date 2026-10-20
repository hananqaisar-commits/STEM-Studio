import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateSelectionSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const sortedIndices: number[] = [];

  steps.push({
    array: [...arr],
    description: 'Initial array state before Selection Sort starts.',
    codeLine: 1,
    operation: 'initialize',
    variables: { n, i: 0, minIdx: 0 },
    callStack: ['main() -> selectionSort(arr)'],
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    steps.push({
      array: [...arr],
      comparingIndices: [minIdx],
      sortedIndices: [...sortedIndices],
      operation: 'start minimum candidate',
      description: `Set initial minimum at index ${i} (arr[${i}] = ${arr[i]}).`,
      codeLine: 2,
      variables: { i, minIdx, 'arr[minIdx]': arr[minIdx] },
      callStack: ['main() -> selectionSort(arr)'],
    });

    for (let j = i + 1; j < n; j++) {
      steps.push({
        array: [...arr],
        comparingIndices: [j, minIdx],
        sortedIndices: [...sortedIndices],
        operation: arr[j] < arr[minIdx] ? 'new minimum candidate' : 'keep current minimum',
        description: arr[j] < arr[minIdx]
          ? `Compare arr[${j}] = ${arr[j]} with current minimum arr[${minIdx}] = ${arr[minIdx]}. ${arr[j]} is smaller, so it becomes the new minimum candidate.`
          : `Compare arr[${j}] = ${arr[j]} with current minimum arr[${minIdx}] = ${arr[minIdx]}. The current minimum remains unchanged.`,
        codeLine: 4,
        variables: { i, j, minIdx, 'arr[j]': arr[j], 'arr[minIdx]': arr[minIdx] },
        callStack: ['main() -> selectionSort(arr)'],
      });

      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        steps.push({
          array: [...arr],
          comparingIndices: [minIdx],
          sortedIndices: [...sortedIndices],
          operation: 'replace minimum candidate',
          description: `Found new minimum at index ${minIdx} (value: ${arr[minIdx]}).`,
          codeLine: 5,
          variables: { i, j, newMinIdx: minIdx, 'arr[newMinIdx]': arr[minIdx] },
          callStack: ['main() -> selectionSort(arr)'],
        });
      }
    }

    if (minIdx !== i) {
      const temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;

      steps.push({
        array: [...arr],
        swappingIndices: [i, minIdx],
        sortedIndices: [...sortedIndices, i],
        operation: 'place minimum at boundary',
        description: `Swapping arr[${i}] (${arr[minIdx]}) with minimum arr[${minIdx}] (${arr[i]}).`,
        codeLine: 7,
        variables: { i, minIdx, temp, 'arr[i]': arr[i], 'arr[minIdx]': arr[minIdx] },
        callStack: ['main() -> selectionSort(arr)'],
      });
      sortedIndices.push(i);
    } else {
      sortedIndices.push(i);
      steps.push({
        array: [...arr],
        sortedIndices: [...sortedIndices],
        operation: 'minimum already at boundary',
        description: `Index ${i} was already the minimum of the unsorted suffix, so no swap is needed. Mark this position as fixed.`,
        codeLine: 7,
        variables: { i, minIdx, fixedIndex: i, value: arr[i] },
        callStack: ['main() -> selectionSort(arr)'],
      });
    }
  }

  const allIndices = Array.from({ length: n }, (_, i) => i);
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    operation: 'complete',
    description: 'Selection Sort complete! Array is fully sorted.',
    codeLine: 8,
    variables: { status: 'SORTED', totalElements: n },
    callStack: ['main() -> selectionSort(arr) [TERMINATED]'],
  });

  return {
    steps,
    title: 'Selection Sort',
    category: 'Comparison Sort',
    timeComplexity: {
      best: 'O(n²)',
      average: 'O(n²)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'for i = 0 to n - 2 do',
      '  minIdx = i',
      '  for j = i + 1 to n - 1 do',
      '    if arr[j] < arr[minIdx] then',
      '      minIdx = j',
      '  end for',
      '  if minIdx != i then swap(arr[i], arr[minIdx])',
      'end for',
    ],
  };
}
