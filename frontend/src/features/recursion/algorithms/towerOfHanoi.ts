import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';
import type { RecNode, RecursionStep } from './recursionTypes';
import { snapshotStep } from './recursionTypes';

export function runTowerOfHanoi(n: number): AlgorithmExecution<RecursionStep> {
  const steps: RecursionStep[] = [];
  const nodes: RecNode[] = [];
  const callStack: string[] = [];
  let moveCount = 0;

  function completedIndices(): number[] {
    return nodes.reduce<number[]>((acc, nd, i) => {
      if (nd.state === 'completed') acc.push(i);
      return acc;
    }, []);
  }

  function simulate(
    disks: number,
    from: string,
    to: string,
    aux: string,
    parentIdx: number,
  ): void {
    const myIdx = nodes.length;
    nodes.push({
      label: `H(${disks},${from}→${to})`,
      parentIdx,
      state: 'active',
      returnValue: '?',
    });
    callStack.push(`hanoi(${disks}, ${from}, ${to}, ${aux})`);

    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      disks === 1
        ? `hanoi(1, ${from}→${to}): Move disk 1 from ${from} to ${to} (base case).`
        : `Entering hanoi(${disks}, ${from}→${to} via ${aux}).`,
      [...callStack],
      disks === 1 ? 2 : 1,
    ));

    if (disks === 1) {
      // Base case: single disk move
      moveCount++;
      nodes[myIdx].state = 'returning';
      nodes[myIdx].returnValue = `Move D1 ${from}→${to}`;
      steps.push(snapshotStep(
        nodes, [], [], [myIdx],
        `Move disk 1 from peg ${from} to peg ${to}. (Move #${moveCount})`,
        [...callStack],
        2,
      ));
      callStack.pop();
      nodes[myIdx].state = 'completed';
      return;
    }

    // Step 1: move top n-1 disks from source to auxiliary
    simulate(disks - 1, from, aux, to, myIdx);

    // Step 2: move largest disk
    moveCount++;
    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      `Move disk ${disks} from peg ${from} to peg ${to}. (Move #${moveCount})`,
      [...callStack],
      3,
    ));

    // Step 3: move n-1 disks from auxiliary to destination
    simulate(disks - 1, aux, to, from, myIdx);

    // This call is done
    nodes[myIdx].state = 'returning';
    nodes[myIdx].returnValue = `done`;
    steps.push(snapshotStep(
      nodes, [], completedIndices(), [myIdx],
      `hanoi(${disks}, ${from}→${to}) complete. All ${disks} disks moved.`,
      [...callStack],
      4,
    ));
    callStack.pop();
    nodes[myIdx].state = 'completed';
  }

  simulate(n, 'A', 'C', 'B', -1);

  return {
    steps,
    title: 'Tower of Hanoi',
    category: 'Recursion',
    timeComplexity: {
      best: 'O(2^n)',
      average: 'O(2^n)',
      worst: 'O(2^n)',
    },
    spaceComplexity: 'O(n) — call stack depth = number of disks',
    pseudocode: [
      'function hanoi(n, from, to, aux):',
      '  if n == 1:',
      '    move disk 1 from → to   // base case',
      '    return',
      '  hanoi(n-1, from, aux, to)  // move top n-1 aside',
      '  move disk n from → to      // move largest',
      '  hanoi(n-1, aux, to, from)  // stack n-1 on top',
    ],
  };
}
