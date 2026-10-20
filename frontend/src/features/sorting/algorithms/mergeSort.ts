import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateMergeSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];

  steps.push({
    array: [...arr],
    operation: 'initialize',
    description: 'Start with the input array. Merge sort divides ranges, then merges sorted ranges using temporary buffers.',
    codeLine: 1,
  });

  function mergeSort(left: number, right: number): void {
    if (left > right) return;
    if (left === right) {
      steps.push({
        array: [...arr],
        activeRange: { start: left, end: right },
        operation: 'base case',
        description: `Range [${left}, ${right}] contains one value (${arr[left]}), so it is already sorted.`,
        codeLine: 2,
        variables: { left, right, value: arr[left] },
      });
      return;
    }

    const middle = left + Math.floor((right - left) / 2);
    steps.push({
      array: [...arr],
      activeRange: { start: left, end: right },
      operation: 'divide range',
      description: `Split range [${left}, ${right}] at ${middle}: left half [${left}, ${middle}], right half [${middle + 1}, ${right}].`,
      codeLine: 3,
      variables: { left, middle, right },
      callStack: [`mergeSort(${left}, ${right})`],
    });

    mergeSort(left, middle);
    mergeSort(middle + 1, right);
    merge(left, middle, right);
  }

  function merge(left: number, middle: number, right: number): void {
    const leftBuffer = arr.slice(left, middle + 1);
    const rightBuffer = arr.slice(middle + 1, right + 1);
    let leftCursor = 0;
    let rightCursor = 0;
    let writeCursor = left;

    const bufferLanes = (activeLeft: number | null, activeRight: number | null) => [
      { label: 'LEFT', values: leftBuffer, activeIndex: activeLeft, sourceStart: left },
      { label: 'RIGHT', values: rightBuffer, activeIndex: activeRight, sourceStart: middle + 1 },
    ];

    steps.push({
      array: [...arr],
      activeRange: { start: left, end: right },
      auxiliaryLanes: bufferLanes(null, null),
      operation: 'copy into buffers',
      description: `Copy arr[${left}..${middle}] and arr[${middle + 1}..${right}] into temporary left and right buffers before overwriting the main range.`,
      codeLine: 5,
      variables: { left, middle, right, leftLength: leftBuffer.length, rightLength: rightBuffer.length, writeCursor },
    });

    while (leftCursor < leftBuffer.length && rightCursor < rightBuffer.length) {
      const leftValue = leftBuffer[leftCursor];
      const rightValue = rightBuffer[rightCursor];
      steps.push({
        array: [...arr],
        activeRange: { start: left, end: right },
        auxiliaryLanes: bufferLanes(leftCursor, rightCursor),
        writeIndex: writeCursor,
        operation: 'compare buffer heads',
        description: `Compare LEFT[${leftCursor}] = ${leftValue} with RIGHT[${rightCursor}] = ${rightValue}. The smaller value is written next to arr[${writeCursor}].`,
        codeLine: 6,
        variables: { leftCursor, leftValue, rightCursor, rightValue, writeCursor, condition: `${leftValue} <= ${rightValue}` },
      });

      // Choosing from LEFT on equality keeps merge sort stable.
      const takeLeft = leftValue <= rightValue;
      const writtenValue = takeLeft ? leftValue : rightValue;
      const writtenFrom = takeLeft ? 'LEFT' : 'RIGHT';
      const usedLeft = leftCursor;
      const usedRight = rightCursor;
      arr[writeCursor] = writtenValue;
      if (takeLeft) leftCursor += 1;
      else rightCursor += 1;

      steps.push({
        array: [...arr],
        activeRange: { start: left, end: right },
        auxiliaryLanes: bufferLanes(takeLeft ? usedLeft : null, takeLeft ? null : usedRight),
        writeIndex: writeCursor,
        writeValue: writtenValue,
        operation: `write from ${writtenFrom.toLowerCase()} buffer`,
        description: `Write ${writtenValue} from the ${writtenFrom} buffer into arr[${writeCursor}]. This is a copy into the output range, not a swap.`,
        codeLine: 7,
        variables: { source: `${writtenFrom}[${takeLeft ? usedLeft : usedRight}]`, value: writtenValue, writeCursor },
      });
      writeCursor += 1;
    }

    while (leftCursor < leftBuffer.length) {
      const sourceIndex = leftCursor;
      const writtenValue = leftBuffer[leftCursor];
      arr[writeCursor] = writtenValue;
      leftCursor += 1;
      steps.push({
        array: [...arr],
        activeRange: { start: left, end: right },
        auxiliaryLanes: bufferLanes(sourceIndex, null),
        writeIndex: writeCursor,
        writeValue: writtenValue,
        operation: 'copy remaining left value',
        description: `RIGHT is exhausted. Copy remaining LEFT[${sourceIndex}] = ${writtenValue} into arr[${writeCursor}].`,
        codeLine: 8,
        variables: { source: `LEFT[${sourceIndex}]`, value: writtenValue, writeCursor },
      });
      writeCursor += 1;
    }

    while (rightCursor < rightBuffer.length) {
      const sourceIndex = rightCursor;
      const writtenValue = rightBuffer[rightCursor];
      arr[writeCursor] = writtenValue;
      rightCursor += 1;
      steps.push({
        array: [...arr],
        activeRange: { start: left, end: right },
        auxiliaryLanes: bufferLanes(null, sourceIndex),
        writeIndex: writeCursor,
        writeValue: writtenValue,
        operation: 'copy remaining right value',
        description: `LEFT is exhausted. Copy remaining RIGHT[${sourceIndex}] = ${writtenValue} into arr[${writeCursor}].`,
        codeLine: 9,
        variables: { source: `RIGHT[${sourceIndex}]`, value: writtenValue, writeCursor },
      });
      writeCursor += 1;
    }

    steps.push({
      array: [...arr],
      activeRange: { start: left, end: right },
      auxiliaryLanes: bufferLanes(null, null),
      operation: 'merge range complete',
      description: `Range [${left}, ${right}] is now sorted: ${arr.slice(left, right + 1).join(', ')}. The parent call can merge this range with its sibling.`,
      codeLine: 10,
      variables: { left, middle, right, mergedValues: arr.slice(left, right + 1).join(', ') },
    });
  }

  mergeSort(0, arr.length - 1);

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: arr.length }, (_, index) => index),
    operation: 'complete',
    description: 'Every recursive range has been merged. The complete array is now sorted.',
    codeLine: 11,
  });

  return {
    steps,
    title: 'Merge Sort',
    category: 'Divide & Conquer',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
    },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'mergeSort(left, right):',
      '  if left >= right: return',
      '  middle = floor((left + right) / 2)',
      '  mergeSort(left, middle); mergeSort(middle + 1, right)',
      '  LEFT = copy of arr[left..middle]; RIGHT = copy of arr[middle+1..right]',
      '  compare the first unconsumed value in each buffer',
      '  write the smaller value to the next output position',
      '  copy any remaining values; return',
    ],
  };
}
