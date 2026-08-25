import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';
import type { RecNode, RecursionStep } from './recursionTypes';
import { snapshotStep } from './recursionTypes';

export function runArraySum(arr: number[]): AlgorithmExecution<RecursionStep> {
  const steps: RecursionStep[] = [];
  const nodes: RecNode[] = [];
  const callStack: string[] = [];

  function completedIndices(): number[] {
    return nodes.reduce<number[]>((acc, nd, i) => {
      if (nd.state === 'completed') acc.push(i);
      return acc;
    }, []);
  }

  function simulate(idx: number, parentIdx: number): number {
    const myIdx = nodes.length;
    const isBase = idx >= arr.length;
    nodes.push({
      label: `sum(${idx})`,
      parentIdx,
      state: 'active',
      returnValue: '?',
    });
    callStack.push(`sum(arr, ${idx})`);

    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      isBase
        ? `sum(arr, ${idx}): idx=${idx} >= length=${arr.length} — base case!`
        : `Calling sum(arr, ${idx}): arr[${idx}] = ${arr[idx]}`,
      [...callStack],
      isBase ? 2 : 1,
    ));

    if (isBase) {
      nodes[myIdx].state = 'returning';
      nodes[myIdx].returnValue = '0';
      steps.push(snapshotStep(
        nodes, [], [], [myIdx],
        `Base case: sum(arr, ${idx}) = 0 (past end of array).`,
        [...callStack],
        2,
      ));
      callStack.pop();
      nodes[myIdx].state = 'completed';
      return 0;
    }

    const childResult = simulate(idx + 1, myIdx);
    const result = arr[idx] + childResult;

    nodes[myIdx].state = 'returning';
    nodes[myIdx].returnValue = String(result);
    steps.push(snapshotStep(
      nodes, [], completedIndices(), [myIdx],
      `sum(arr, ${idx}) = arr[${idx}] + sum(arr, ${idx + 1}) = ${arr[idx]} + ${childResult} = ${result}.`,
      [...callStack],
      3,
    ));
    callStack.pop();
    nodes[myIdx].state = 'completed';
    return result;
  }

  simulate(0, -1);

  return {
    steps,
    title: 'Array Sum',
    category: 'Recursion',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n) — call stack depth = array length',
    pseudocode: [
      'function sum(arr, idx):',
      '  if idx >= arr.length: return 0  // base case',
      '  return arr[idx] + sum(arr, idx+1)',
    ],
  };
}
