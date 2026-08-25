import type { ArrayStep } from '../../../engine/types/Step';

/**
 * RecursionStep is an ArrayStep carrying tree visualisation metadata in `variables`.
 *
 * Tree data is encoded as:
 *   variables.nodeLabels   — comma-separated call labels
 *   variables.parentMap    — comma-separated parent indices (-1 = root)
 *   variables.nodeStates   — comma-separated: pending | active | returning | completed
 *   variables.returnValues — comma-separated return values ("?" if not yet returned)
 *   variables.currentPath  — comma-separated indices on the current execution path
 */
export type RecursionStep = ArrayStep;

/* ── Internal tree-node used while building steps ─────────────────────── */
export interface RecNode {
  label: string;
  parentIdx: number;  // -1 for root
  state: 'pending' | 'active' | 'returning' | 'completed';
  returnValue: string;
}

/** Snapshot current tree state into a RecursionStep */
export function snapshotStep(
  nodes: RecNode[],
  activeIndices: number[],
  completedIndices: number[],
  returningIndices: number[],
  description: string,
  callStackLabels: string[],
  pseudocodeLine?: number,
): RecursionStep {
  const nodeLabels = nodes.map(n => n.label).join(',');
  const parentMap = nodes.map(n => n.parentIdx).join(',');
  const nodeStates = nodes.map(n => n.state).join(',');
  const returnValues = nodes.map(n => n.returnValue).join(',');
  const currentPath = activeIndices.join(',');

  // array: pack node data as numbers for compatibility (4 values per node)
  const arrayData: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    arrayData.push(i);
    arrayData.push(parseFloat(nodes[i].returnValue) || 0);
    arrayData.push(
      nodes[i].state === 'active' ? 1
      : nodes[i].state === 'returning' ? 2
      : nodes[i].state === 'completed' ? 3 : 0
    );
    arrayData.push(nodes[i].parentIdx);
  }

  return {
    array: arrayData,
    comparingIndices: activeIndices,
    sortedIndices: completedIndices,
    swappingIndices: returningIndices,
    description,
    codeLine: pseudocodeLine,
    variables: {
      nodeLabels,
      parentMap,
      nodeStates,
      returnValues,
      currentPath,
      treeSize: nodes.length,
    },
    callStack: callStackLabels,
  };
}
