import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateHeapSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const sortedIndices: number[] = [];

  steps.push({
    array: [...arr],
    description: 'Initial state before Heap Sort starts.',
    codeLine: 1,
  });

  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }

  steps.push({
    array: [...arr],
    description: 'Max Heap structure built successfully.',
    codeLine: 3,
  });

  // Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    // Swap root (max) with last element
    const temp = arr[0];
    arr[0] = arr[i];
    arr[i] = temp;

    sortedIndices.push(i);
    steps.push({
      array: [...arr],
      swappingIndices: [0, i],
      sortedIndices: [...sortedIndices],
      description: `Moved max element ${temp} from heap root to index ${i}.`,
      codeLine: 5,
    });

    // Heapify reduced heap
    heapify(i, 0);
  }

  sortedIndices.push(0);
  const allIndices = Array.from({ length: n }, (_, k) => k);
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description: 'Heap Sort complete! Entire array is sorted.',
    codeLine: 7,
  });

  function heapify(heapSize: number, rootIdx: number) {
    let largest = rootIdx;
    const left = 2 * rootIdx + 1;
    const right = 2 * rootIdx + 2;

    if (left < heapSize && arr[left] > arr[largest]) {
      largest = left;
    }

    if (right < heapSize && arr[right] > arr[largest]) {
      largest = right;
    }

    if (largest !== rootIdx) {
      const temp = arr[rootIdx];
      arr[rootIdx] = arr[largest];
      arr[largest] = temp;

      steps.push({
        array: [...arr],
        swappingIndices: [rootIdx, largest],
        sortedIndices: [...sortedIndices],
        description: `Heapify: Swapped parent ${arr[largest]} at ${rootIdx} with child ${arr[rootIdx]} at ${largest}.`,
        codeLine: 6,
      });

      heapify(heapSize, largest);
    }
  }

  return {
    steps,
    title: 'Heap Sort',
    category: 'Tree-based Sort',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'buildMaxHeap(arr)',
      'for i = n - 1 down to 1 do',
      '  swap(arr[0], arr[i])',
      '  heapify(arr, i, 0)',
      'end for',
      'heapify(arr, size, root):',
      '  find largest among root, left child, right child',
      '  if root is not largest, swap and recursively heapify',
    ],
  };
}
