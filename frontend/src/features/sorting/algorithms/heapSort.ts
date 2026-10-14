import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateHeapSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const sortedIndices: number[] = [];

  steps.push({
    array: [...arr],
    operation: 'initialize',
    description: 'Treat the array as a complete binary tree: children of index i are 2i+1 and 2i+2.',
    codeLine: 1,
    variables: { heapSize: n, root: null, leftChild: null, rightChild: null },
  });

  // Build a max heap from the last parent back to the root.
  for (let root = Math.floor(n / 2) - 1; root >= 0; root -= 1) {
    steps.push({
      array: [...arr],
      pivotIndex: root,
      sortedIndices: [...sortedIndices],
      operation: 'choose parent',
      description: `Start heapify at parent index ${root}; compare it with the children that are inside the heap.`,
      codeLine: 2,
      variables: { root, heapSize: n, leftChild: 2 * root + 1, rightChild: 2 * root + 2, largest: root },
    });
    heapify(n, root);
  }

  steps.push({
    array: [...arr],
    sortedIndices: [...sortedIndices],
    operation: 'max heap ready',
    description: 'The root now holds the maximum value. The active heap covers the whole array.',
    codeLine: 3,
    variables: { heapSize: n, max: arr[0] ?? null },
  });

  // Move each maximum to the shrinking sorted suffix.
  for (let end = n - 1; end > 0; end -= 1) {
    const maximum = arr[0];
    const displaced = arr[end];
    steps.push({
      array: [...arr],
      comparingIndices: [0, end],
      sortedIndices: [...sortedIndices],
      operation: 'select heap maximum',
      description: `The root ${maximum} is the heap maximum. Move it to the final unsorted index ${end}.`,
      codeLine: 4,
      variables: { heapSize: end + 1, root: 0, end, maximum, displaced },
    });

    [arr[0], arr[end]] = [arr[end], arr[0]];
    sortedIndices.push(end);
    steps.push({
      array: [...arr],
      swappingIndices: [0, end],
      sortedIndices: [...sortedIndices],
      operation: 'extract maximum',
      description: `Swap ${maximum} with index ${end}. That suffix position is now final; restore the max-heap property in [0, ${end}).`,
      codeLine: 5,
      variables: { heapSize: end, root: 0, extracted: maximum, displaced },
    });

    heapify(end, 0);
  }

  if (n > 0) sortedIndices.push(0);
  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: n }, (_, index) => index),
    operation: 'complete',
    description: 'Heap Sort is complete: each extracted maximum settled into the next slot from right to left.',
    codeLine: 7,
    variables: { heapSize: 0, status: 'SORTED', totalElements: n },
  });

  function heapify(heapSize: number, rootIdx: number) {
    let largest = rootIdx;
    const left = 2 * rootIdx + 1;
    const right = 2 * rootIdx + 2;

    if (left < heapSize) {
      const parentValue = arr[largest];
      const leftValue = arr[left];
      steps.push({
        array: [...arr],
        comparingIndices: [largest, left],
        sortedIndices: [...sortedIndices],
        operation: 'compare left child',
        description: `Compare parent ${parentValue} at ${largest} with left child ${leftValue} at ${left}.`,
        codeLine: 6,
        variables: { root: rootIdx, heapSize, leftChild: left, rightChild: right < heapSize ? right : null, largest, parentValue, leftValue },
      });
      if (leftValue > parentValue) {
        largest = left;
        steps.push({
          array: [...arr],
          pivotIndex: largest,
          sortedIndices: [...sortedIndices],
          operation: 'promote left child',
          description: `${leftValue} is larger, so the left child becomes the current largest candidate.`,
          codeLine: 6,
          variables: { root: rootIdx, heapSize, largest, largestValue: leftValue },
        });
      }
    }

    if (right < heapSize) {
      const candidateValue = arr[largest];
      const rightValue = arr[right];
      steps.push({
        array: [...arr],
        comparingIndices: [largest, right],
        sortedIndices: [...sortedIndices],
        operation: 'compare right child',
        description: `Compare current candidate ${candidateValue} at ${largest} with right child ${rightValue} at ${right}.`,
        codeLine: 6,
        variables: { root: rootIdx, heapSize, leftChild: left < heapSize ? left : null, rightChild: right, largest, candidateValue, rightValue },
      });
      if (rightValue > candidateValue) {
        largest = right;
        steps.push({
          array: [...arr],
          pivotIndex: largest,
          sortedIndices: [...sortedIndices],
          operation: 'promote right child',
          description: `${rightValue} is larger, so the right child becomes the current largest candidate.`,
          codeLine: 6,
          variables: { root: rootIdx, heapSize, largest, largestValue: rightValue },
        });
      }
    }

    if (largest === rootIdx) {
      steps.push({
        array: [...arr],
        comparingIndices: [rootIdx],
        sortedIndices: [...sortedIndices],
        operation: 'heap property holds',
        description: `Index ${rootIdx} is already at least as large as its children. This subtree needs no swap.`,
        codeLine: 6,
        variables: { root: rootIdx, heapSize, largest: rootIdx },
      });
      return;
    }

    const parentValue = arr[rootIdx];
    const childValue = arr[largest];
    [arr[rootIdx], arr[largest]] = [arr[largest], arr[rootIdx]];
    steps.push({
      array: [...arr],
      swappingIndices: [rootIdx, largest],
      sortedIndices: [...sortedIndices],
      operation: 'restore heap order',
      description: `Swap child ${childValue} with parent ${parentValue}; continue heapifying from index ${largest}.`,
      codeLine: 6,
      variables: { root: rootIdx, heapSize, largest, parentValue, childValue },
    });
    heapify(heapSize, largest);
  }

  return {
    steps,
    title: 'Heap Sort',
    category: 'Tree-based Sort',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'buildMaxHeap(arr)',
      'for end = n - 1 down to 1:',
      '  swap(arr[0], arr[end])  // largest is final',
      '  heapify(arr, heapSize = end, root = 0)',
      'heapify(heapSize, root):',
      '  largest = largest of root and its in-range children',
      '  if largest != root: swap and continue at child',
    ],
  };
}
