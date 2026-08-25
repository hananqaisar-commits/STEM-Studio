import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';
import type { RecNode, RecursionStep } from './recursionTypes';
import { snapshotStep } from './recursionTypes';

export function runPower(base: number, exp: number): AlgorithmExecution<RecursionStep> {
  const steps: RecursionStep[] = [];
  const nodes: RecNode[] = [];
  const callStack: string[] = [];

  function completedIndices(): number[] {
    return nodes.reduce<number[]>((acc, nd, i) => {
      if (nd.state === 'completed') acc.push(i);
      return acc;
    }, []);
  }

  function simulate(b: number, e: number, parentIdx: number): number {
    const myIdx = nodes.length;
    nodes.push({
      label: `pow(${b},${e})`,
      parentIdx,
      state: 'active',
      returnValue: '?',
    });
    callStack.push(`pow(${b},${e})`);

    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      `Calling pow(${b}, ${e})${e === 0 ? ' — base case!' : ''}`,
      [...callStack],
      e === 0 ? 2 : 1,
    ));

    if (e === 0) {
      nodes[myIdx].state = 'returning';
      nodes[myIdx].returnValue = '1';
      steps.push(snapshotStep(
        nodes, [], [], [myIdx],
        `Base case: pow(${b}, 0) = 1. Anything to the power 0 is 1.`,
        [...callStack],
        2,
      ));
      callStack.pop();
      nodes[myIdx].state = 'completed';
      return 1;
    }

    const childResult = simulate(b, e - 1, myIdx);
    const result = b * childResult;

    nodes[myIdx].state = 'returning';
    nodes[myIdx].returnValue = String(result);
    steps.push(snapshotStep(
      nodes, [], completedIndices(), [myIdx],
      `pow(${b}, ${e}) = ${b} × pow(${b}, ${e - 1}) = ${b} × ${childResult} = ${result}.`,
      [...callStack],
      3,
    ));
    callStack.pop();
    nodes[myIdx].state = 'completed';
    return result;
  }

  simulate(base, exp, -1);

  return {
    steps,
    title: 'Power',
    category: 'Recursion',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(n) — call stack depth = exponent',
    pseudocode: [
      'function pow(base, exp):',
      '  if exp == 0: return 1         // base case',
      '  return base * pow(base, exp-1) // recursive case',
    ],
  };
}
