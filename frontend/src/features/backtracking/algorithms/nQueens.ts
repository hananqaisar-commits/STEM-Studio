import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Place N queens on an NxN board via backtracking.
 *
 * At each level (row), try placing a queen in each column.
 * Backtrack when a column or diagonal conflict is detected.
 *
 * Board state is encoded in step.array as column positions per row
 * (-1 = empty). The renderer draws an NxN grid from this.
 *
 * Tree data uses `|` as label separator.
 */
export function runNQueens(n: number): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const board: number[] = new Array(n).fill(-1);

  const treeLabels: string[] = [];
  const treeParents: number[] = [];
  const solutionNodeIndices: number[] = [];
  const prunedNodeIndices: number[] = [];
  const explored = new Set<number>();

  // Root node
  treeLabels.push('root');
  treeParents.push(-1);

  function ancestorPath(nodeIdx: number): number[] {
    const path: number[] = [];
    let cur = nodeIdx;
    while (cur !== -1) {
      path.unshift(cur);
      cur = treeParents[cur];
    }
    return path;
  }

  function isConflict(row: number, col: number): boolean {
    for (let r = 0; r < row; r++) {
      if (board[r] === col) return true;
      if (Math.abs(board[r] - col) === Math.abs(r - row)) return true;
    }
    return false;
  }

  function boardLabel(): string {
    return board.map((c) => (c === -1 ? '-' : c.toString())).join(',');
  }

  function getAttacked(row: number): number[] {
    const attacked: number[] = [];
    for (let r = 0; r < row; r++) {
      const c = board[r];
      if (c === -1) continue;
      attacked.push(r * n + c);
      // Mark attacked squares below
      for (let rr = row; rr < n; rr++) {
        if (c < n) attacked.push(rr * n + c);
        const diagLeft = c - (rr - r);
        const diagRight = c + (rr - r);
        if (diagLeft >= 0 && diagLeft < n) attacked.push(rr * n + diagLeft);
        if (diagRight >= 0 && diagRight < n) attacked.push(rr * n + diagRight);
      }
    }
    return [...new Set(attacked)];
  }

  function emit(
    description: string,
    nodeIdx: number,
    level: number,
    decision: string,
    queenPlaced: boolean = false,
    conflict: boolean = false,
    currentCol: number = -1,
  ) {
    const path = ancestorPath(nodeIdx);
    const attacked = getAttacked(level);
    const queenPositions: number[] = [];
    for (let r = 0; r < n; r++) {
      if (board[r] !== -1) queenPositions.push(r * n + board[r]);
    }
    const exploredSolutions = solutionNodeIndices.filter((i) => explored.has(i));

    steps.push({
      array: [...board],
      comparingIndices: currentCol >= 0 ? [level * n + currentCol] : [],
      swappingIndices: conflict ? [level * n + currentCol] : [],
      sortedIndices: queenPositions,
      description,
      variables: {
        treeNodes: treeLabels.join('|'),
        parentMap: treeParents.join(','),
        currentPath: path.join(','),
        solutionNodes: exploredSolutions.join(','),
        prunedNodes: prunedNodeIndices.join(','),
        level,
        board: boardLabel(),
        queensPlaced: queenPositions.length,
        totalFound: exploredSolutions.length,
        decision,
        attacked: attacked.join(','),
        queenPositions: queenPositions.join(','),
        conflict: conflict,
        queenPlaced,
        n,
      },
      callStack: [`nQueens(row=${level})`],
    });
  }

  // Initial step
  emit(
    `Starting ${n}-Queens. Place ${n} queens on a ${n}×${n} board so no two attack each other.`,
    0, 0, 'Begin DFS',
  );

  let solutionCount = 0;

  function dfs(row: number, parentNode: number) {
    if (row === n) {
      // All queens placed — solution found
      const nodeIdx = treeLabels.length;
      treeLabels.push(`Sol:${boardLabel()}`);
      treeParents.push(parentNode);
      solutionNodeIndices.push(nodeIdx);
      explored.add(nodeIdx);
      solutionCount++;
      emit(
        `Solution #${solutionCount} found! Board: ${boardLabel()}`,
        nodeIdx, row, 'Solution found!', true,
      );
      return;
    }

    for (let col = 0; col < n; col++) {
      const conflict = isConflict(row, col);

      const nodeIdx = treeLabels.length;
      treeLabels.push(`R${row}C${col}${conflict ? '✗' : '✓'}`);
      treeParents.push(parentNode);

      if (conflict) {
        prunedNodeIndices.push(nodeIdx);
        emit(
          `Row ${row}, Col ${col}: CONFLICT — cannot place queen here. Skip.`,
          nodeIdx, row, `Place at col ${col} → conflict`, false, true, col,
        );
        continue;
      }

      board[row] = col;
      emit(
        `Row ${row}, Col ${col}: Queen placed. No conflicts with ${row} existing queen(s).`,
        nodeIdx, row, `Place at col ${col} → OK`, true, false, col,
      );

      dfs(row + 1, nodeIdx);

      // Backtrack
      board[row] = -1;
      emit(
        `Backtrack: remove queen from row ${row}, col ${col}. Try next column.`,
        nodeIdx, row, 'Backtrack',
      );
    }
  }

  dfs(0, 0);

  steps.push({
    array: new Array(n).fill(-1),
    description: `Complete! Found ${solutionCount} solution(s) for ${n}-Queens.`,
    variables: {
      treeNodes: treeLabels.join('|'),
      parentMap: treeParents.join(','),
      currentPath: '',
      solutionNodes: solutionNodeIndices.join(','),
      prunedNodes: prunedNodeIndices.join(','),
      level: n,
      board: '',
      queensPlaced: 0,
      totalFound: solutionCount,
      decision: 'Complete',
      attacked: '',
      queenPositions: '',
      conflict: false,
      queenPlaced: false,
      n,
    },
    callStack: ['nQueens() [DONE]'],
  });

  return {
    steps,
    title: `${n}-Queens`,
    category: 'Backtracking',
    timeComplexity: { best: 'O(n!)', average: 'O(n!)', worst: 'O(n!)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'function nQueens(board, row):',
      '  if row == n:',
      '    record solution',
      '    return',
      '  for col = 0 to n - 1:',
      '    if no conflict at (row, col):',
      '      place queen at (row, col)',
      '      nQueens(board, row + 1)',
      '      remove queen  // backtrack',
    ],
  };
}
