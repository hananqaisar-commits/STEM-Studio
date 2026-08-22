import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateBubbleSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const sortedIndices: number[] = [];

  // Step 0: Initial state
  steps.push({
    array: [...arr],
    description: 'Initial array state before Bubble Sort starts.',
    codeLine: 1,
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;

    for (let j = 0; j < n - i - 1; j++) {
      // Step: Comparing elements
      steps.push({
        array: [...arr],
        comparingIndices: [j, j + 1],
        sortedIndices: [...sortedIndices],
        description: `Comparing elements at index ${j} (${arr[j]}) and index ${j + 1} (${arr[j + 1]}).`,
        codeLine: 3,
      });

      if (arr[j] > arr[j + 1]) {
        // Swap elements
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        swapped = true;

        // Step: Swapping elements
        steps.push({
          array: [...arr],
          swappingIndices: [j, j + 1],
          sortedIndices: [...sortedIndices],
          description: `Swapping ${arr[j + 1]} and ${arr[j]} because ${arr[j + 1]} > ${arr[j]}.`,
          codeLine: 4,
        });
      }
    }

    // Element at n - i - 1 is sorted
    sortedIndices.push(n - i - 1);
    steps.push({
      array: [...arr],
      sortedIndices: [...sortedIndices],
      description: `Element ${arr[n - i - 1]} at index ${n - i - 1} is now in its correct sorted position.`,
      codeLine: 6,
    });

    if (!swapped) break;
  }

  // All remaining elements are sorted
  const allIndices = Array.from({ length: n }, (_, i) => i);
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description: 'Bubble Sort complete! Entire array is fully sorted.',
    codeLine: 7,
  });

  return {
    steps,
    title: 'Bubble Sort',
    category: 'Comparison Sort',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n²)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'for i = 0 to n - 1 do',
      '  swapped = false',
      '  for j = 0 to n - i - 2 do',
      '    if arr[j] > arr[j + 1] then swap(arr[j], arr[j + 1])',
      '  end for',
      '  if not swapped then break',
      'end for',
    ],
  };
}
