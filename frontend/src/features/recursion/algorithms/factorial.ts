import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';
import type { RecNode, RecursionStep } from './recursionTypes';
import { snapshotStep } from './recursionTypes';

export function runFactorial(n: number): AlgorithmExecution<RecursionStep> {
  const steps: RecursionStep[] = [];
  const nodes: RecNode[] = [];
  const callStack: string[] = [];

  function simulate(val: number, parentIdx: number): number {
    const myIdx = nodes.length;
    nodes.push({
      label: `fact(${val})`,
      parentIdx,
      state: 'active',
      returnValue: '?',
    });
    callStack.push(`fact(${val})`);

    // Step: entering this call
    steps.push(snapshotStep(
      nodes,
      [myIdx],
      nodes.filter((n) => n.state === 'completed').map((_, i) => i),
      [],
      `Calling fact(${val})${val === 0 ? ' — base case reached!' : ''}`,
      [...callStack],
      val === 0 ? 2 : 1,
    ));

    if (val === 0) {
      // Base case
      nodes[myIdx].state = 'returning';
      nodes[myIdx].returnValue = '1';
      steps.push(snapshotStep(
        nodes, [], [],
        [myIdx],
        `Base case: fact(0) = 1. Returning 1.`,
        [...callStack],
        2,
      ));
      callStack.pop();
      nodes[myIdx].state = 'completed';
      return 1;
    }

    // Recursive case
    const childResult = simulate(val - 1, myIdx);
    const result = val * childResult;

    // Returning from this call
    nodes[myIdx].state = 'returning';
    nodes[myIdx].returnValue = String(result);
    steps.push(snapshotStep(
      nodes, [],
      nodes.reduce<number[]>((acc, n, i) => { if (n.state === 'completed') acc.push(i); return acc; }, []),
      [myIdx],
      `fact(${val}) = ${val} × fact(${val - 1}) = ${val} × ${childResult} = ${result}. Returning ${result}.`,
      [...callStack],
      3,
    ));
    callStack.pop();
    nodes[myIdx].state = 'completed';
    return result;
  }

  simulate(n, -1);

  return {
    steps,
    title: 'Factorial',
    category: 'Recursion',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n) — call stack depth',
    pseudocode: [
      'function fact(n):',
      '  if n == 0: return 1       // base case',
      '  return n * fact(n - 1)    // recursive case',
    ],
  };
}
