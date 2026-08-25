import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

/**
 * Find all combinations of `candidates` that sum to `target`.
 * Repetition of candidates is allowed.
 *
 * Decision tree: at each node, we either pick the current candidate
 * (and stay at the same index since repetition is allowed) or skip
 * to the next candidate index.
 *
 * Tree data uses `|` as label separator.
 */
export function runCombinationSum(
  candidates: number[],
  target: number,
): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const n = candidates.length;

  const treeLabels: string[] = [];
  const treeParents: number[] = [];
  const treeCombos: number[][] = [];
  const treeRemainders: number[] = [];
  const treeCandidateIdx: number[] = [];
  const solutionNodeIndices: number[] = [];
  const prunedNodeIndices: number[] = [];
  const explored = new Set<number>();

  // Root
  treeLabels.push('[]');
  treeParents.push(-1);
  treeCombos.push([]);
  treeRemainders.push(target);
  treeCandidateIdx.push(0);

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
  ) {
    const path = ancestorPath(nodeIdx);
    const combo = treeCombos[nodeIdx];
    const remainder = treeRemainders[nodeIdx];
    const exploredSolutions = solutionNodeIndices.filter((i) => explored.has(i));

    steps.push({
      array: [...candidates],
      comparingIndices: comparing,
      sortedIndices: combo.map((v) => candidates.indexOf(v)).filter((i) => i >= 0),
      description,
      variables: {
        treeNodes: treeLabels.join('|'),
        parentMap: treeParents.join(','),
        currentPath: path.join(','),
        solutionNodes: exploredSolutions.join(','),
        prunedNodes: prunedNodeIndices.join(','),
        level: combo.length,
        currentSubset: `[${combo.join(',')}]`,
        totalFound: exploredSolutions.length,
        decision,
        remainder,
        target,
        currentSum: target - remainder,
      },
      callStack: [`comboSum(idx=${treeCandidateIdx[nodeIdx]}, rem=${remainder})`],
    });
  }

  emit(
    `Starting Combination Sum. Candidates: [${candidates.join(', ')}], target: ${target}. Find all combinations (with repetition) that sum to ${target}.`,
    0, 'Begin DFS',
  );

  let solutionCount = 0;

  function dfs(nodeIdx: number) {
    explored.add(nodeIdx);
    const combo = treeCombos[nodeIdx];
    const remainder = treeRemainders[nodeIdx];
    const candIdx = treeCandidateIdx[nodeIdx];

    if (remainder === 0) {
      solutionNodeIndices.push(nodeIdx);
      solutionCount++;
      emit(
        `Solution #${solutionCount} found! [${combo.join(' + ')}] = ${target}.`,
        nodeIdx, 'Solution found!',
      );
      return;
    }

    if (candIdx >= n) {
      prunedNodeIndices.push(nodeIdx);
      emit(
        `No more candidates. Remainder = ${remainder} > 0. Dead end.`,
        nodeIdx, 'Dead end — prune',
      );
      return;
    }

    const candidate = candidates[candIdx];

    // Option 1: pick this candidate (if it fits)
    if (candidate <= remainder) {
      const childIdx = treeLabels.length;
      const newCombo = [...combo, candidate];
      const newRemainder = remainder - candidate;
      treeLabels.push(`[${newCombo.join(',')}]`);
      treeParents.push(nodeIdx);
      treeCombos.push(newCombo);
      treeRemainders.push(newRemainder);
      treeCandidateIdx.push(candIdx); // same index — repetition allowed

      emit(
        `Pick candidate ${candidate}. Combination: [${newCombo.join('+')}]. Remaining: ${newRemainder}.`,
        childIdx, `Pick ${candidate}`, [candIdx],
      );
      dfs(childIdx);
    } else {
      emit(
        `Candidate ${candidate} > remainder ${remainder}. Cannot pick — skip.`,
        nodeIdx, `Skip ${candidate} (too large)`, [candIdx],
      );
    }

    // Option 2: skip this candidate, move to next
    const skipIdx = treeLabels.length;
    treeLabels.push(`skip${candidate}`);
    treeParents.push(nodeIdx);
    treeCombos.push([...combo]);
    treeRemainders.push(remainder);
    treeCandidateIdx.push(candIdx + 1);

    if (candIdx + 1 < n) {
      emit(
        `Skip candidate ${candidate}. Move to next candidate ${candidates[candIdx + 1]}.`,
        skipIdx, `Skip ${candidate}`,
      );
      dfs(skipIdx);
    } else {
      prunedNodeIndices.push(skipIdx);
      emit(
        `Skip candidate ${candidate}. No more candidates. Remainder = ${remainder}.`,
        skipIdx, 'No more candidates',
      );
    }
  }

  dfs(0);

  steps.push({
    array: [...candidates],
    sortedIndices: candidates.map((_, i) => i),
    description: `Complete! Found ${solutionCount} combination(s) that sum to ${target}.`,
    variables: {
      treeNodes: treeLabels.join('|'),
      parentMap: treeParents.join(','),
      currentPath: '',
      solutionNodes: solutionNodeIndices.join(','),
      prunedNodes: prunedNodeIndices.join(','),
      level: 0,
      currentSubset: 'All combinations found',
      totalFound: solutionCount,
      decision: 'Complete',
      remainder: 0,
      target,
      currentSum: target,
    },
    callStack: ['comboSum() [DONE]'],
  });

  return {
    steps,
    title: 'Combination Sum',
    category: 'Backtracking',
    timeComplexity: { best: 'O(2^t)', average: 'O(2^t)', worst: 'O(2^t)' },
    spaceComplexity: 'O(t)',
    pseudocode: [
      'function comboSum(candidates, idx, combo, remainder):',
      '  if remainder == 0: output combo, return',
      '  if idx >= n: return',
      '  if candidates[idx] <= remainder:',
      '    comboSum(cands, idx, combo+[cands[idx]], rem-cands[idx])',
      '  comboSum(cands, idx+1, combo, remainder)  // skip',
    ],
  };
}
