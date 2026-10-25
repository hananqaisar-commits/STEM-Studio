import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateStringReverseSteps(inputStr: string): AlgorithmExecution<ArrayStep> {
  const characters = Array.from(inputStr);
  const arr = characters.map((character) => character.codePointAt(0)!);
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
      description: `Comparing positions: left=${left} ('${characters[left]}') and right=${right} ('${characters[right]}').`,
      variables: { left, right, 'char[left]': characters[left], 'char[right]': characters[right] },
    });

    steps.push({
      array: [...arr],
      swappingIndices: [left, right],
      description: `Swapping '${characters[left]}' and '${characters[right]}'.`,
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
      description: `Reversal complete! Result: "${arr.map((codePoint) => String.fromCodePoint(codePoint)).join('')}".`,
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
