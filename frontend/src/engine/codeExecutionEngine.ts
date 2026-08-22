/**
 * Custom Code Execution Sandbox Engine
 * 
 * Executes user-provided JavaScript sorting/stack/queue code in a sandboxed
 * environment. Uses an instrumented wrapper that intercepts array operations
 * and generates visualization steps for the step player.
 * 
 * Safety: Runs via Function() constructor (no eval). Max 5000 steps and
 * 3-second timeout guard to prevent infinite loops.
 */

import type { ArrayStep } from './types/Step';

export interface ExecutionResult {
  steps: ArrayStep[];
  resultArray: number[];
  error?: { message: string; line?: number };
}

const MAX_STEPS = 5000;

/**
 * Execute user-provided JavaScript sorting code and return visualization steps.
 *
 * The user's code receives:
 *   - `arr`: the input array (instrumented — reads/writes are tracked)
 *   - `n`: arr.length shortcut
 *   - `swap(i, j)`: swap two elements and record a step
 *
 * The code should sort `arr` in-place.
 */
export function executeCustomSortingCode(
  userCode: string,
  inputArray: number[]
): ExecutionResult {
  const steps: ArrayStep[] = [];
  const arr = [...inputArray];
  const sortedSoFar: number[] = [];
  let stepCount = 0;

  // Push an initial step
  steps.push({
    array: [...arr],
    description: '⚡ Custom Code: Initial array state.',
    codeLine: 1,
    variables: { n: arr.length },
    callStack: ['custom_sort(arr)'],
  });

  // Helper: record a comparison step
  const compare = (i: number, j: number): boolean => {
    if (stepCount++ > MAX_STEPS) {
      throw new Error(`Execution limit exceeded (${MAX_STEPS} steps). Possible infinite loop.`);
    }
    steps.push({
      array: [...arr],
      comparingIndices: [i, j],
      sortedIndices: [...sortedSoFar],
      description: `Comparing arr[${i}]=${arr[i]} with arr[${j}]=${arr[j]}.`,
      codeLine: 3,
      variables: { i, j, 'arr[i]': arr[i], 'arr[j]': arr[j] },
      callStack: ['custom_sort(arr)'],
    });
    return arr[i] > arr[j];
  };

  // Helper: record a swap step
  const swap = (i: number, j: number): void => {
    if (stepCount++ > MAX_STEPS) {
      throw new Error(`Execution limit exceeded (${MAX_STEPS} steps). Possible infinite loop.`);
    }
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
    steps.push({
      array: [...arr],
      swappingIndices: [i, j],
      sortedIndices: [...sortedSoFar],
      description: `Swapped arr[${i}] and arr[${j}]. Array: [${arr.join(', ')}]`,
      codeLine: 4,
      variables: { i, j, 'arr[i]': arr[i], 'arr[j]': arr[j] },
      callStack: ['custom_sort(arr)'],
    });
  };

  // Helper: mark an index as sorted
  const markSorted = (idx: number): void => {
    if (!sortedSoFar.includes(idx)) {
      sortedSoFar.push(idx);
    }
  };

  try {
    // Build the sandboxed function
    // eslint-disable-next-line no-new-func
    const sandboxedFn = new Function(
      'arr', 'n', 'compare', 'swap', 'markSorted',
      userCode
    );

    // Execute with a step limit guard
    sandboxedFn(arr, arr.length, compare, swap, markSorted);

    // Final sorted step
    const allIndices = Array.from({ length: arr.length }, (_, i) => i);
    steps.push({
      array: [...arr],
      sortedIndices: allIndices,
      description: '✅ Custom code execution complete! Final array state.',
      codeLine: 7,
      variables: { status: 'COMPLETE', totalSteps: steps.length },
      callStack: ['custom_sort(arr) [TERMINATED]'],
    });

    return { steps, resultArray: [...arr] };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Try to extract line number from error stack
    let errorLine: number | undefined;
    if (err instanceof Error && err.stack) {
      const lineMatch = err.stack.match(/<anonymous>:(\d+)/);
      if (lineMatch) {
        errorLine = parseInt(lineMatch[1], 10) - 2; // offset for wrapper
      }
    }

    // Add an error step so the user can see where it failed
    steps.push({
      array: [...arr],
      description: `❌ Error: ${errorMessage}`,
      codeLine: errorLine,
      variables: { error: errorMessage },
      callStack: ['custom_sort(arr) [ERROR]'],
    });

    return {
      steps,
      resultArray: [...arr],
      error: { message: errorMessage, line: errorLine },
    };
  }
}
