import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateBubbleSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const sortedIndices: number[] = [];

  steps.push({
    array: [...arr],
    description: 'Initial array state before Bubble Sort starts.',
    codeLine: 1,
    variables: { n, i: 0, j: 0, swapped: false },
    callStack: ['main() -> bubbleSort(arr)'],
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;

    for (let j = 0; j < n - i - 1; j++) {
      steps.push({
        array: [...arr],
        comparingIndices: [j, j + 1],
        sortedIndices: [...sortedIndices],
        description: `Comparing index ${j} (arr[${j}] = ${arr[j]}) with index ${j + 1} (arr[${j + 1}] = ${arr[j + 1]}).`,
        codeLine: 3,
        variables: {
          i,
          j,
          'arr[j]': arr[j],
          'arr[j+1]': arr[j + 1],
          swapped,
          'n - i - 1': n - i - 1,
        },
        callStack: ['main() -> bubbleSort(arr)'],
      });

      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        swapped = true;

        steps.push({
          array: [...arr],
          swappingIndices: [j, j + 1],
          sortedIndices: [...sortedIndices],
          description: `Swapping arr[${j}] (${arr[j + 1]}) with arr[${j + 1}] (${arr[j]}).`,
          codeLine: 4,
          variables: {
            i,
            j,
            temp,
            'arr[j]': arr[j],
            'arr[j+1]': arr[j + 1],
            swapped: true,
          },
          callStack: ['main() -> bubbleSort(arr)'],
        });
      }
    }

    sortedIndices.push(n - i - 1);
    steps.push({
      array: [...arr],
      sortedIndices: [...sortedIndices],
      description: `Element ${arr[n - i - 1]} at index ${n - i - 1} is now in its correct sorted position.`,
      codeLine: 6,
      variables: { i, sortedIndex: n - i - 1, sortedValue: arr[n - i - 1], swapped },
      callStack: ['main() -> bubbleSort(arr)'],
    });

    if (!swapped) break;
  }

  const allIndices = Array.from({ length: n }, (_, i) => i);
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description: 'Bubble Sort complete! Entire array is fully sorted.',
    codeLine: 7,
    variables: { status: 'SORTED', totalElements: n },
    callStack: ['main() -> bubbleSort(arr) [TERMINATED]'],
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
