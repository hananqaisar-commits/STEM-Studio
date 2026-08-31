import type { ArrayStep } from '../../../engine/types/Step';

/**
 * RecursionStep is an ArrayStep carrying tree visualisation metadata in `variables`.
 *
 * Tree data is encoded as JSON-stringified arrays (labels may themselves
 * contain commas — e.g. `pow(2,4)`, `H(3,A→C)` — so a comma-joined CSV
 * would mis-parse and crash the renderer):
 *   variables.nodeLabels   — JSON array of call labels
 *   variables.parentMap    — JSON array of parent indices (-1 = root)
 *   variables.nodeStates   — JSON array: pending | active | returning | completed
 *   variables.returnValues — JSON array of return values ("?" if not yet returned)
 *   variables.currentPath  — JSON array of indices on the current execution path
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
  extraVariables?: Record<string, string | number | boolean | null>,
): RecursionStep {
  const nodeLabels = JSON.stringify(nodes.map(n => n.label));
  const parentMap = JSON.stringify(nodes.map(n => n.parentIdx));
  const nodeStates = JSON.stringify(nodes.map(n => n.state));
  const returnValues = JSON.stringify(nodes.map(n => n.returnValue));
  const currentPath = JSON.stringify(activeIndices);

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
      ...extraVariables,
    },
    callStack: callStackLabels,
  };
}
