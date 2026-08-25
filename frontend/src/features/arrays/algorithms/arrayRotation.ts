import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateRotationSteps(initialArray: number[], rotations: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const k = n > 0 ? rotations % n : 0;

  const sortedSet = new Set<number>();

  steps.push({
    array: [...arr],
    description: `Starting array rotation by ${rotations} positions to the right using the reversal algorithm. Effective k = ${k} (rotations % n).`,
    codeLine: 1,
    variables: { k, n, phase: 'init' as string, i: 0, j: 0 },
    callStack: ['main() -> rotateRight(arr, rotations)'],
  });

  if (k === 0 || n <= 1) {
    steps.push({
      array: [...arr],
      sortedIndices: Array.from({ length: n }, (_, i) => i),
      description: k === 0 ? 'No rotation needed (k = 0 or array too short). Array remains unchanged.' : 'Array has 0 or 1 elements; nothing to rotate.',
      codeLine: 7,
      variables: { k, n, phase: 'done', i: 0, j: 0 },
      callStack: ['main() -> rotateRight(arr, rotations) [RETURN]'],
    });
    return buildResult(steps, arr, n, k);
  }

  // Helper: reverse a sub-array in place with step recording
  const reverseRange = (start: number, end: number, phase: string, codeLine: number) => {
    steps.push({
      array: [...arr],
      description: `Phase "${phase}": reversing sub-array from index ${start} to ${end}.`,
      codeLine,
      variables: { k, n, phase, i: start, j: end },
      callStack: ['main() -> rotateRight(arr, rotations)', `reverse(${start}, ${end})`],
    });

    let i = start;
    let j = end;
    while (i < j) {
      steps.push({
        array: [...arr],
        comparingIndices: [i, j],
        sortedIndices: [...sortedSet],
        description: `Comparing indices ${i} and ${j} for swap within reversal range [${start}..${end}].`,
        codeLine,
        variables: { k, n, phase, i, j },
        callStack: ['main() -> rotateRight(arr, rotations)', `reverse(${start}, ${end})`],
      });

      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;

      steps.push({
        array: [...arr],
        swappingIndices: [i, j],
        sortedIndices: [...sortedSet],
        description: `Swapped arr[${i}] and arr[${j}]. arr[${i}] = ${arr[i]}, arr[${j}] = ${arr[j]}.`,
        codeLine,
        variables: { k, n, phase, i, j, temp },
        callStack: ['main() -> rotateRight(arr, rotations)', `reverse(${start}, ${end})`],
      });

      i++;
      j--;
    }

    // Mark reversed portion
    for (let idx = start; idx <= end; idx++) sortedSet.add(idx);

    steps.push({
      array: [...arr],
      sortedIndices: [...sortedSet],
      description: `Reversal of [${start}..${end}] complete.`,
      codeLine,
      variables: { k, n, phase, i: start, j: end },
      callStack: ['main() -> rotateRight(arr, rotations)', `reverse(${start}, ${end}) [DONE]`],
    });
  };

  // Phase 1: reverse(0, n - k - 1)
  reverseRange(0, n - k - 1, 'reverse1', 3);

  // Phase 2: reverse(n - k, n - 1)
  reverseRange(n - k, n - 1, 'reverse2', 4);

  // Phase 3: reverse(0, n - 1)
  reverseRange(0, n - 1, 'reverse3', 5);

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: n }, (_, i) => i),
    description: `Array rotation complete. Array rotated right by ${rotations} positions (effective k = ${k}).`,
    codeLine: 6,
    variables: { k, n, phase: 'done', i: 0, j: 0, status: 'COMPLETE' },
    callStack: ['main() -> rotateRight(arr, rotations) [RETURN]'],
  });

  return buildResult(steps, arr, n, k);
}

function buildResult(steps: import('../../../engine/types/Step').ArrayStep[], _arr: number[], _n: number, _k: number): AlgorithmExecution<import('../../../engine/types/Step').ArrayStep> {
  return {
    steps,
    title: 'Array Rotation (Reversal)',
    category: 'Array Algorithms',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n)',
      worst: 'O(n)',
    },
    spaceComplexity: 'O(1)',
    pseudocode: [
      'k = rotations % n',
      'if k == 0 then return  // no rotation needed',
      'reverse(arr, 0, n - k - 1)   // reverse first part',
      'reverse(arr, n - k, n - 1)   // reverse second part',
      'reverse(arr, 0, n - 1)       // reverse whole array',
      'return arr',
    ],
  };
}
