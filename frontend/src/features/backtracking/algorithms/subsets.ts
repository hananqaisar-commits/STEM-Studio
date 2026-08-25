import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Generate all subsets of `arr` via backtracking (include/exclude pattern).
 *
 * Decision tree: at each level L we decide whether to include arr[L].
 * The tree is a perfect binary tree with 2^(n+1) - 1 nodes.
 * Children of node i are 2i+1 (include) and 2i+2 (exclude).
 * Leaves (level n) represent complete subsets.
 *
 * Tree data uses `|` as separator so labels like `[1,2]` don't collide.
 */
export function runSubsets(arr: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = arr.length;

  // ── Build full decision tree ──────────────────────────────────────
  const totalNodes = Math.pow(2, n + 1) - 1;
  const treeLabels: string[] = new Array(totalNodes);
  const treeParents: number[] = new Array(totalNodes);
  const includedMasks: boolean[][] = new Array(totalNodes);

  treeParents[0] = -1;
  includedMasks[0] = new Array(n).fill(false);
  treeLabels[0] = '[]';

  for (let nodeIdx = 0; nodeIdx < totalNodes; nodeIdx++) {
    const level = Math.floor(Math.log2(nodeIdx + 1));
    const leftChild = 2 * nodeIdx + 1;
    const rightChild = 2 * nodeIdx + 2;

    if (leftChild < totalNodes) {
      const incMask = [...includedMasks[nodeIdx]];
      incMask[level] = true;
      includedMasks[leftChild] = incMask;
      treeParents[leftChild] = nodeIdx;
      const subset = arr.filter((_, i) => incMask[i]);
      treeLabels[leftChild] = `[${subset.join(',')}]`;
    }
    if (rightChild < totalNodes) {
      includedMasks[rightChild] = [...includedMasks[nodeIdx]];
      treeParents[rightChild] = nodeIdx;
      const subset = arr.filter((_, i) => includedMasks[rightChild][i]);
      treeLabels[rightChild] = `[${subset.join(',')}]`;
    }
  }

  const leafStart = Math.pow(2, n) - 1;
  const allSolutionNodes = new Set<number>();
  for (let i = leafStart; i < totalNodes; i++) allSolutionNodes.add(i);

  const explored = new Set<number>();

  // ── Helpers ──────────────────────────────────────────────────────
  function ancestorPath(nodeIdx: number): number[] {
    const path: number[] = [];
    let cur = nodeIdx;
    while (cur !== -1) {
      path.unshift(cur);
      cur = treeParents[cur];
    }
    return path;
  }

  function emit(
    description: string,
    nodeIdx: number,
    level: number,
    decision: string,
    comparing: number[] = [],
  ) {
    const path = ancestorPath(nodeIdx);
    const mask = includedMasks[nodeIdx];
    const chosenIndices = mask.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    const exploredSolutions = [...allSolutionNodes].filter((i) => explored.has(i));
    steps.push({
      array: [...arr],
      comparingIndices: comparing,
      sortedIndices: chosenIndices,
      description,
      variables: {
        treeNodes: treeLabels.join('|'),
        parentMap: treeParents.join(','),
        currentPath: path.join(','),
        solutionNodes: exploredSolutions.join(','),
        prunedNodes: '',
        level,
        currentSubset: `[${arr.filter((_, i) => mask[i]).join(',')}]`,
        totalFound: exploredSolutions.length,
        decision,
      },
      callStack: [`subsets(level=${level})`],
    });
  }

  // ── DFS traversal ────────────────────────────────────────────────
  emit(
    `Starting subset generation for [${arr.join(', ')}]. Decision tree has ${totalNodes} nodes — each level decides include/exclude of one element.`,
    0, 0, 'Begin DFS',
  );

  function dfs(nodeIdx: number, level: number) {
    explored.add(nodeIdx);

    if (level === n) {
      const subset = arr.filter((_, i) => includedMasks[nodeIdx][i]);
      emit(
        `Leaf reached — subset [${subset.join(', ')}] is complete.`,
        nodeIdx, level, 'Complete subset',
      );
      return;
    }

    const incChild = 2 * nodeIdx + 1;
    const excChild = 2 * nodeIdx + 2;
    const currentSubset = arr.filter((_, i) => includedMasks[nodeIdx][i]);

    emit(
      `Level ${level}: decide on arr[${level}]=${arr[level]}. Current: [${currentSubset.join(', ')}]. → INCLUDE`,
      incChild, level + 1, `Include ${arr[level]}`, [level],
    );
    dfs(incChild, level + 1);

    emit(
      `Backtrack to level ${level}. Excluding arr[${level}]=${arr[level]} from subset.`,
      excChild, level + 1, `Exclude ${arr[level]}`, [level],
    );
    dfs(excChild, level + 1);
  }

  dfs(0, 0);

  steps.push({
    array: [...arr],
    sortedIndices: arr.map((_, i) => i),
    description: `Complete! All ${allSolutionNodes.size} subsets of [${arr.join(', ')}] generated.`,
    variables: {
      treeNodes: treeLabels.join('|'),
      parentMap: treeParents.join(','),
      currentPath: '',
      solutionNodes: [...allSolutionNodes].join(','),
      prunedNodes: '',
      level: n,
      currentSubset: 'All subsets found',
      totalFound: allSolutionNodes.size,
      decision: 'Complete',
    },
    callStack: ['subsets() [DONE]'],
  });

  return {
    steps,
    title: 'Subsets Generation',
    category: 'Backtracking',
    timeComplexity: { best: 'O(2^n)', average: 'O(2^n)', worst: 'O(2^n)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'function subsets(arr, level, current):',
      '  if level == n:',
      '    output current',
      '    return',
      '  subsets(arr, level+1, current + [arr[level]])  // include',
      '  subsets(arr, level+1, current)                // exclude',
    ],
  };
}
