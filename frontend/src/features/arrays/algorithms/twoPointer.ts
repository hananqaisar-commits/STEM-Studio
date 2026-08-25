import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateTwoPointerSteps(sortedArr: number[], targetSum: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...sortedArr].sort((a, b) => a - b);
  const n = arr.length;
  let left = 0;
  let right = n - 1;
  let found = false;

  steps.push({
    array: [...arr],
    comparingIndices: [left, right],
    description: `Starting Two Pointer search on sorted array for target sum ${targetSum}. left = 0, right = ${right}.`,
    codeLine: 1,
    variables: { left, right, sum: arr[left] + arr[right], targetSum, 'arr[left]': arr[left], 'arr[right]': arr[right] },
    callStack: ['main() -> twoPointer(arr, targetSum)'],
  });

  while (left < right) {
    const sum = arr[left] + arr[right];

    steps.push({
      array: [...arr],
      comparingIndices: [left, right],
      description: `Comparing arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${sum} against target ${targetSum}.`,
      codeLine: 2,
      variables: { left, right, sum, targetSum, 'arr[left]': arr[left], 'arr[right]': arr[right] },
      callStack: ['main() -> twoPointer(arr, targetSum)'],
    });

    if (sum === targetSum) {
      found = true;

      steps.push({
        array: [...arr],
        sortedIndices: [left, right],
        description: `Pair found! arr[${left}] + arr[${right}] = ${arr[left]} + ${arr[right]} = ${targetSum}. Match!`,
        codeLine: 3,
        variables: { left, right, sum, targetSum, 'arr[left]': arr[left], 'arr[right]': arr[right], found: true },
        callStack: ['main() -> twoPointer(arr, targetSum) [RETURN]'],
      });
      break;
    } else if (sum < targetSum) {
      steps.push({
        array: [...arr],
        comparingIndices: [left, right],
        description: `Sum ${sum} is too small compared to target ${targetSum}. Moving left pointer right from ${left} to ${left + 1}.`,
        codeLine: 5,
        variables: { left, right, sum, targetSum, 'arr[left]': arr[left], 'arr[right]': arr[right] },
        callStack: ['main() -> twoPointer(arr, targetSum)'],
      });
      left++;
    } else {
      steps.push({
        array: [...arr],
        comparingIndices: [left, right],
        description: `Sum ${sum} is too large compared to target ${targetSum}. Moving right pointer left from ${right} to ${right - 1}.`,
        codeLine: 6,
        variables: { left, right, sum, targetSum, 'arr[left]': arr[left], 'arr[right]': arr[right] },
        callStack: ['main() -> twoPointer(arr, targetSum)'],
      });
      right--;
    }
  }

  if (!found) {
    steps.push({
      array: [...arr],
      description: `No pair in the sorted array sums to ${targetSum}. Left and right pointers have converged.`,
      codeLine: 7,
      variables: { left, right, sum: null, targetSum, 'arr[left]': arr[left] ?? null, 'arr[right]': arr[right] ?? null, found: false },
      callStack: ['main() -> twoPointer(arr, targetSum) [NOT FOUND]'],
    });
  }

  return {
    steps,
    title: 'Two Pointer Sum',
    category: 'Array Algorithms',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'sort(arr)',
      'left = 0, right = n - 1',
      'while left < right do',
      '  sum = arr[left] + arr[right]',
      '  if sum == targetSum then return (left, right)',
      '  if sum < targetSum then left = left + 1',
      '  else right = right - 1',
      'return not found',
    ],
  };
}
