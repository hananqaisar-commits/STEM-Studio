import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateStringReverseSteps(inputStr: string): AlgorithmExecution<ArrayStep> {
  const arr = inputStr.split('').map(c => c.charCodeAt(0));
  const steps: ArrayStep[] = [];
  let left = 0;
  let right = arr.length - 1;
  const sorted: number[] = [];

  steps.push({
    array: [...arr],
    description: `Reversing "${inputStr}" in-place using two pointers.`,
    variables: { left, right },
  });

  while (left < right) {
    steps.push({
      array: [...arr],
      comparingIndices: [left, right],
      description: `Comparing positions: left=${left} ('${inputStr[left]}') and right=${right} ('${inputStr[right]}').`,
      variables: { left, right, 'char[left]': inputStr[left], 'char[right]': inputStr[right] },
    });

    steps.push({
      array: [...arr],
      swappingIndices: [left, right],
      description: `Swapping '${inputStr[left]}' and '${inputStr[right]}'.`,
      variables: { left, right },
    });

    const temp = arr[left];
    arr[left] = arr[right];
    arr[right] = temp;

    sorted.push(left, right);
    steps.push({
      array: [...arr],
      sortedIndices: [...sorted],
      description: `Swapped. Characters at indices ${left} and ${right} are now in final position.`,
      variables: { left: left + 1, right: right - 1 },
    });

    left++;
    right--;
  }

  if (left === right) {
    sorted.push(left);
  }

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: arr.length }, (_, i) => i),
    description: `Reversal complete! Result: "${arr.map(c => String.fromCharCode(c)).join('')}".`,
  });

  return {
    steps,
    title: 'String Reversal',
    category: 'String Algorithms',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'left = 0, right = n - 1',
      'while left < right do',
      '  swap s[left], s[right]',
      '  left++, right--',
      'end while',
    ],
  };
}
