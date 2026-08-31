import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';
import type { RecNode, RecursionStep } from './recursionTypes';
import { snapshotStep } from './recursionTypes';

/* Divide-and-conquer power: xⁿ = (xⁿ⌿²) × (xⁿ⌿²) (× x when n is odd).
   Each call spawns exactly two half-sized sub-calls, so the tree is binary
   and only log₂(n) deep — the visual contrast with the linear chains
   elsewhere in this category is the whole point. */
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
    callStack.push(`pow(${b}, ${e})`);

    const half = Math.floor(e / 2);
    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      e === 0
        ? `Calling pow(${b}, 0) — base case!`
        : `Calling pow(${b}, ${e}): exponent ${e} halves to ${half} — two sub-calls pow(${b}, ${half}).`,
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

    const left = simulate(b, half, myIdx);
    const right = simulate(b, half, myIdx);
    const result = e % 2 === 0 ? left * right : b * left * right;

    nodes[myIdx].state = 'returning';
    nodes[myIdx].returnValue = String(result);
    steps.push(snapshotStep(
      nodes, [], completedIndices(), [myIdx],
      e % 2 === 0
        ? `pow(${b}, ${e}) = pow(${b}, ${half}) × pow(${b}, ${half}) = ${left} × ${right} = ${result}.`
        : `pow(${b}, ${e}) = ${b} × pow(${b}, ${half}) × pow(${b}, ${half}) = ${b} × ${left} × ${right} = ${result}.`,
      [...callStack],
      e % 2 === 0 ? 4 : 5,
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
    timeComplexity: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' },
    spaceComplexity: 'O(log n) — tree depth = log₂(exp)',
    pseudocode: [
      'function pow(base, exp):',
      '  if exp == 0: return 1            // base case',
      '  spawn two halves: pow(base, exp÷2)',
      '  if exp even: return half × half',
      '  else: return base × half × half',
    ],
  };
}
