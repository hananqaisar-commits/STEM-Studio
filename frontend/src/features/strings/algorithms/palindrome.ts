import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generatePalindromeSteps(inputStr: string): AlgorithmExecution<ArrayStep> {
  const arr = inputStr.split('').map(c => c.charCodeAt(0));
  const steps: ArrayStep[] = [];
  let left = 0, right = arr.length - 1;
  let isPalindrome = true;

  steps.push({
    array: [...arr],
    description: `Checking if "${inputStr}" is a palindrome.`,
    variables: { left, right, isPalindrome },
  });

  while (left < right) {
    steps.push({
      array: [...arr],
      comparingIndices: [left, right],
      description: `Comparing '${inputStr[left]}' (index ${left}) with '${inputStr[right]}' (index ${right}).`,
      variables: { left, right, 'char[left]': inputStr[left], 'char[right]': inputStr[right] },
    });

    if (inputStr[left] !== inputStr[right]) {
      steps.push({
        array: [...arr],
        swappingIndices: [left, right],
        description: `Mismatch found! '${inputStr[left]}' ≠ '${inputStr[right]}'. Not a palindrome.`,
        variables: { left, right, isPalindrome: false },
      });
      isPalindrome = false;
      break;
    }

    steps.push({
      array: [...arr],
      sortedIndices: [left, right],
      description: `Match: '${inputStr[left]}' = '${inputStr[right]}'. Moving inward.`,
      variables: { left, right },
    });
    left++;
    right--;
  }

  if (isPalindrome) {
    steps.push({
      array: [...arr],
      sortedIndices: Array.from({ length: arr.length }, (_, i) => i),
      description: `"${inputStr}" IS a palindrome!`,
    });
  }

  return {
    steps,
    title: 'Palindrome Check',
    category: 'String Algorithms',
    timeComplexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'left = 0, right = n - 1',
      'while left < right do',
      '  if s[left] ≠ s[right] then return false',
      '  left++, right--',
      'end while',
      'return true',
    ],
  };
}
