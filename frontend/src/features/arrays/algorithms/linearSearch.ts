import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateLinearSearchSteps(initialArray: number[], target: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  let found = false;

  steps.push({
    array: [...arr],
    description: `Starting Linear Search for target value ${target} in an array of ${n} elements.`,
    codeLine: 1,
    variables: { i: 0, target, 'arr[i]': arr[0] ?? null, found: false },
    callStack: ['main() -> linearSearch(arr, target)'],
  });

  for (let i = 0; i < n; i++) {
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Checking index ${i}: arr[${i}] = ${arr[i]} against target ${target}.`,
      codeLine: 2,
      variables: { i, target, 'arr[i]': arr[i], found: false },
      callStack: ['main() -> linearSearch(arr, target)'],
    });

    if (arr[i] === target) {
      found = true;

      steps.push({
        array: [...arr],
        sortedIndices: [i],
        description: `Found target ${target} at index ${i}! arr[${i}] === ${target}.`,
        codeLine: 3,
        variables: { i, target, 'arr[i]': arr[i], found: true },
        callStack: ['main() -> linearSearch(arr, target) [RETURN]'],
      });
      break;
    } else {
      steps.push({
        array: [...arr],
        comparingIndices: [i],
        description: `arr[${i}] = ${arr[i]} does not match target ${target}. Moving to next element.`,
        codeLine: 4,
        variables: { i, target, 'arr[i]': arr[i], found: false },
        callStack: ['main() -> linearSearch(arr, target)'],
      });
    }
  }

  if (!found) {
    steps.push({
      array: [...arr],
      description: `Target ${target} not found in the array after scanning all ${n} elements.`,
      codeLine: 5,
      variables: { i: n, target, 'arr[i]': null, found: false },
      callStack: ['main() -> linearSearch(arr, target) [RETURN -1]'],
    });
  }

  return {
    steps,
    title: 'Linear Search',
    category: 'Array Algorithms',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'for i = 0 to n - 1 do',
      '  if arr[i] == target then',
      '    return i  // found',
      '  end if',
      'return -1  // not found',
    ],
  };
}
