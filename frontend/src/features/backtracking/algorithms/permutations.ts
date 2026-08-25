import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Generate all permutations of `arr` by swapping elements.
 *
 * At each level L, we fix position L by choosing which remaining element
 * to swap into it. The decision tree is NOT binary — a node at level L
 * has (n - L) children.
 *
 * Tree data uses `|` as separator for labels.
 */
export function runPermutations(arr: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = arr.length;

  // Build tree dynamically during DFS
  const treeLabels: string[] = [];
  const treeParents: number[] = [];
  const treeStates: number[][] = [];   // array state at each node
  const treeFixed: number[] = [];      // number of fixed positions (level)
  const solutionNodeIndices: number[] = [];

  // Root node
  treeLabels.push(`[${arr.join(',')}]`);
  treeParents.push(-1);
  treeStates.push([...arr]);
  treeFixed.push(0);

  const explored = new Set<number>();

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
    decision: string,
    comparing: number[] = [],
    swapping: number[] = [],
  ) {
    const path = ancestorPath(nodeIdx);
    const state = treeStates[nodeIdx];
    const fixed = treeFixed[nodeIdx];
    const fixedIndices = Array.from({ length: fixed }, (_, i) => i);
    const exploredSolutions = solutionNodeIndices.filter((i) => explored.has(i));

    steps.push({
      array: [...state],
      comparingIndices: comparing,
      swappingIndices: swapping,
      sortedIndices: fixedIndices,
      description,
      variables: {
        treeNodes: treeLabels.join('|'),
        parentMap: treeParents.join(','),
        currentPath: path.join(','),
        solutionNodes: exploredSolutions.join(','),
        prunedNodes: '',
        level: fixed,
        currentSubset: `[${state.slice(0, fixed).join(',')}]`,
        totalFound: exploredSolutions.length,
        decision,
        fixedPrefix: `[${state.slice(0, fixed).join(',')}]`,
        remaining: `[${state.slice(fixed).join(',')}]`,
      },
      callStack: [`permute(level=${fixed})`],
    });
  }

  // Initial step
  emit(
    `Starting permutation generation for [${arr.join(', ')}]. At each level we fix one position by choosing from remaining elements.`,
    0, 'Begin DFS',
  );

  function dfs(nodeIdx: number) {
    explored.add(nodeIdx);
    const state = treeStates[nodeIdx];
    const level = treeFixed[nodeIdx];

    if (level === n) {
      solutionNodeIndices.push(nodeIdx);
      explored.add(nodeIdx);
      emit(
        `Permutation complete: [${state.join(', ')}].`,
        nodeIdx, 'Complete permutation',
      );
      return;
    }

    // Try each remaining element at position `level`
    for (let i = level; i < n; i++) {
      // Create child by swapping
      const childState = [...state];
      [childState[level], childState[i]] = [childState[i], childState[level]];

      const childIdx = treeLabels.length;
      treeLabels.push(`[${childState.join(',')}]`);
      treeParents.push(nodeIdx);
      treeStates.push(childState);
      treeFixed.push(level + 1);

      const swapLabel = i === level ? 'keep' : `swap(${level},${i})`;
      emit(
        `Level ${level}: fix position ${level} with ${childState[level]} (${swapLabel}). Remaining: [${childState.slice(level + 1).join(', ')}].`,
        childIdx,
        `Fix pos ${level} = ${childState[level]}`,
        [level],
        i !== level ? [level, i] : [],
      );

      dfs(childIdx);
    }

    // Backtrack step
    if (level < n) {
      emit(
        `Backtrack from level ${level}. All choices for position ${level} explored.`,
        nodeIdx, 'Backtrack',
      );
    }
  }

  dfs(0);

  steps.push({
    array: [...arr],
    sortedIndices: arr.map((_, i) => i),
    description: `Complete! All ${solutionNodeIndices.length} permutations of [${arr.join(', ')}] generated.`,
    variables: {
      treeNodes: treeLabels.join('|'),
      parentMap: treeParents.join(','),
      currentPath: '',
      solutionNodes: solutionNodeIndices.join(','),
      prunedNodes: '',
      level: n,
      currentSubset: 'All permutations found',
      totalFound: solutionNodeIndices.length,
      decision: 'Complete',
    },
    callStack: ['permute() [DONE]'],
  });

  return {
    steps,
    title: 'Permutations Generation',
    category: 'Backtracking',
    timeComplexity: { best: 'O(n!·n)', average: 'O(n!·n)', worst: 'O(n!·n)' },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'function permute(arr, level):',
      '  if level == n:',
      '    output arr',
      '    return',
      '  for i = level to n - 1:',
      '    swap(arr[level], arr[i])',
      '    permute(arr, level + 1)',
      '    swap(arr[level], arr[i])  // backtrack',
    ],
  };
}
