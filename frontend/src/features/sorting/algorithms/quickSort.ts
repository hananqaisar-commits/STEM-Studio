import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateQuickSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const sortedIndices: number[] = [];

  steps.push({
    array: [...arr],
    description: 'Initial state before Quick Sort starts.',
    codeLine: 1,
  });

  function quickSort(low: number, high: number) {
    if (low < high) {
      const pivotIndex = partition(low, high);
      sortedIndices.push(pivotIndex);

      quickSort(low, pivotIndex - 1);
      quickSort(pivotIndex + 1, high);
    } else if (low === high) {
      sortedIndices.push(low);
    }
  }

  function partition(low: number, high: number): number {
    const pivot = arr[high];
    steps.push({
      array: [...arr],
      pivotIndex: high,
      sortedIndices: [...sortedIndices],
      description: `Chosen pivot element ${pivot} at index ${high}.`,
      codeLine: 3,
    });

    let i = low - 1;

    for (let j = low; j < high; j++) {
      steps.push({
        array: [...arr],
        comparingIndices: [j, high],
        pivotIndex: high,
        sortedIndices: [...sortedIndices],
        description: `Comparing element ${arr[j]} at index ${j} with pivot ${pivot}.`,
        codeLine: 5,
      });

      if (arr[j] < pivot) {
        i++;
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;

        steps.push({
          array: [...arr],
          swappingIndices: [i, j],
          pivotIndex: high,
          sortedIndices: [...sortedIndices],
          description: `Element ${arr[i]} < pivot (${pivot}). Swapped index ${i} with index ${j}.`,
          codeLine: 7,
        });
      }
    }

    // Place pivot in correct position
    const temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;

    steps.push({
      array: [...arr],
      swappingIndices: [i + 1, high],
      sortedIndices: [...sortedIndices, i + 1],
      description: `Placed pivot ${pivot} into its correct sorted index ${i + 1}.`,
      codeLine: 9,
    });

    return i + 1;
  }

  quickSort(0, arr.length - 1);

  const allIndices = Array.from({ length: arr.length }, (_, i) => i);
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description: 'Quick Sort complete! Array is fully sorted.',
    codeLine: 10,
  });

  return {
    steps,
    title: 'Quick Sort',
    category: 'Divide & Conquer',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(log n)',
    pseudocode: [
      'quickSort(arr, low, high):',
      '  if low < high then',
      '    pivotIndex = partition(arr, low, high)',
      '    quickSort(arr, low, pivotIndex - 1)',
      '    quickSort(arr, pivotIndex + 1, high)',
      '  end if',
      'partition(arr, low, high):',
      '  pivot = arr[high]',
      '  for j = low to high - 1 do if arr[j] < pivot then swap()',
      '  swap(arr[i + 1], arr[high]) and return i + 1',
    ],
  };
}
