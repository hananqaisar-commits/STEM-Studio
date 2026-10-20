import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';
import type { RecNode, RecursionStep } from './recursionTypes';
import { snapshotStep } from './recursionTypes';

interface HanoiMove { disk: number; from: string; to: string }

/* Each step carries a JSON snapshot of the three pegs (arrays bottom→top)
   plus the move that produced it, so the renderer can draw the 3-peg board
   and animate the moved disk with the shared liftShiftDrop preset. */
export function runTowerOfHanoi(n: number): AlgorithmExecution<RecursionStep> {
  const steps: RecursionStep[] = [];
  const nodes: RecNode[] = [];
  const callStack: string[] = [];
  let moveCount = 0;

  const pegs: Record<string, number[]> = { A: [], B: [], C: [] };
  for (let d = n; d >= 1; d--) pegs.A.push(d);

  const pegsVar = (move: HanoiMove | null) => ({
    hanoiPegs: JSON.stringify({
      pegs: { A: [...pegs.A], B: [...pegs.B], C: [...pegs.C] },
      move,
    }),
  });

  function doMove(disk: number, from: string, to: string): HanoiMove {
    pegs[from] = pegs[from].filter((x) => x !== disk);
    pegs[to].push(disk);
    moveCount++;
    return { disk, from, to };
  }

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
      pegsVar(null),
    ));

    if (disks === 1) {
      // Base case: single disk move
      const move = doMove(1, from, to);
      nodes[myIdx].state = 'returning';
      nodes[myIdx].returnValue = `Move D1 ${from}→${to}`;
      steps.push(snapshotStep(
        nodes, [], [], [myIdx],
        `Move disk 1 from peg ${from} to peg ${to}. (Move #${moveCount})`,
        [...callStack],
        2,
        pegsVar(move),
      ));
      callStack.pop();
      nodes[myIdx].state = 'completed';
      return;
    }

    // Step 1: move top n-1 disks from source to auxiliary
    simulate(disks - 1, from, aux, to, myIdx);

    // Step 2: move largest disk
    const move = doMove(disks, from, to);
    steps.push(snapshotStep(
      nodes, [myIdx], completedIndices(), [],
      `Move disk ${disks} from peg ${from} to peg ${to}. (Move #${moveCount})`,
      [...callStack],
      3,
      pegsVar(move),
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
      pegsVar(null),
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
