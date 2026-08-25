import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';
import type { RecNode, RecursionStep } from './recursionTypes';
import { snapshotStep } from './recursionTypes';

export function runFibonacci(n: number): AlgorithmExecution<RecursionStep> {
  const steps: RecursionStep[] = [];
  const nodes: RecNode[] = [];
  const callStack: string[] = [];

  function completedIndices(): number[] {
    return nodes.reduce<number[]>((acc, nd, i) => {
      if (nd.state === 'completed') acc.push(i);
      return acc;
    }, []);
  }

  function simulate(val: number, parentIdx: number): number {
    const myIdx = nodes.length;
    nodes.push({
      label: `fib(${val})`,
      parentIdx,
      state: 'active',
      returnValue: '?',
    });
    callStack.push(`fib(${val})`);

    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      `Entering fib(${val})${val <= 1 ? ' — base case!' : ''}`,
      [...callStack],
      val <= 1 ? 2 : 1,
    ));

    if (val <= 1) {
      // Base case: fib(0)=0, fib(1)=1
      const result = val;
      nodes[myIdx].state = 'returning';
      nodes[myIdx].returnValue = String(result);
      steps.push(snapshotStep(
        nodes, [], [], [myIdx],
        `Base case: fib(${val}) = ${result}. Returning ${result}.`,
        [...callStack],
        2,
      ));
      callStack.pop();
      nodes[myIdx].state = 'completed';
      return result;
    }

    // Branch: fib(n-1)
    const leftResult = simulate(val - 1, myIdx);

    // Show intermediate state between branches
    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      `fib(${val}): left branch fib(${val - 1}) returned ${leftResult}. Now calling fib(${val - 2}).`,
      [...callStack],
      3,
    ));

    // Branch: fib(n-2)
    const rightResult = simulate(val - 2, myIdx);

    const result = leftResult + rightResult;
    nodes[myIdx].state = 'returning';
    nodes[myIdx].returnValue = String(result);
    steps.push(snapshotStep(
      nodes, [], completedIndices(), [myIdx],
      `fib(${val}) = fib(${val - 1}) + fib(${val - 2}) = ${leftResult} + ${rightResult} = ${result}.`,
      [...callStack],
      4,
    ));
    callStack.pop();
    nodes[myIdx].state = 'completed';
    return result;
  }

  simulate(n, -1);

  return {
    steps,
    title: 'Fibonacci',
    category: 'Recursion',
    timeComplexity: {
      best: 'O(2^n)',
      average: 'O(2^n)',
      worst: 'O(2^n)',
    },
    spaceComplexity: 'O(n) — max call stack depth',
    pseudocode: [
      'function fib(n):',
      '  if n <= 1: return n         // base case',
      '  left  = fib(n - 1)          // first branch',
      '  right = fib(n - 2)          // second branch',
      '  return left + right',
    ],
  };
}
