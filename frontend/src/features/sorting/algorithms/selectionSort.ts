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
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    steps.push({
      array: [...arr],
      pivotIndex: minIdx,
      sortedIndices: [...sortedIndices],
      description: `Set initial minimum at index ${i} (value: ${arr[i]}).`,
      codeLine: 2,
    });

    for (let j = i + 1; j < n; j++) {
      steps.push({
        array: [...arr],
        comparingIndices: [j, minIdx],
        pivotIndex: minIdx,
        sortedIndices: [...sortedIndices],
        description: `Comparing element at index ${j} (${arr[j]}) with current minimum at index ${minIdx} (${arr[minIdx]}).`,
        codeLine: 4,
      });

      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        steps.push({
          array: [...arr],
          pivotIndex: minIdx,
          sortedIndices: [...sortedIndices],
          description: `Found new minimum at index ${minIdx} (value: ${arr[minIdx]}).`,
          codeLine: 5,
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
        sortedIndices: [...sortedIndices],
        description: `Swapping ${arr[i]} at index ${i} with minimum ${arr[minIdx]} at index ${minIdx}.`,
        codeLine: 7,
      });
    }

    sortedIndices.push(i);
  }

  const allIndices = Array.from({ length: n }, (_, i) => i);
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description: 'Selection Sort complete! Array is fully sorted.',
    codeLine: 8,
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
