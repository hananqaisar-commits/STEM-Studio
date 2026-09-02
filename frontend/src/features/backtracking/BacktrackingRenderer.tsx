import React, { useMemo } from 'react';
import type { ArrayStep } from '../../engine/types/Step';
import { Grid2D } from '../../components/renderers/Grid2D';
import { DecisionTree, type DecisionTreeNode } from '../../components/renderers/DecisionTree';
import './Backtracking.css';

interface BacktrackingRendererProps {
  currentStep: ArrayStep | null;
  algorithmKey: string;
  onToggleFullscreen?: () => void;
}

export const BacktrackingRenderer: React.FC<BacktrackingRendererProps> = ({
  currentStep,
  algorithmKey,
  onToggleFullscreen,
}) => {
  const treeNodes = useMemo(() => {
    if (!currentStep?.variables?.treeNodes) return [];
    const vars = currentStep.variables;
    const labels = (vars.treeNodes as string).split('|');
    const parents = (vars.parentMap as string).split(',').map(Number);
    const currentPath = new Set((vars.currentPath as string || '').split(',').filter(Boolean).map(Number));
    const solutionNodes = new Set((vars.solutionNodes as string || '').split(',').filter(Boolean).map(Number));
    const prunedNodes = new Set((vars.prunedNodes as string || '').split(',').filter(Boolean).map(Number));

    return labels.map((label, idx) => {
      let state: DecisionTreeNode['state'] = 'pending';
      if (solutionNodes.has(idx)) state = 'completed';
      else if (prunedNodes.has(idx)) state = 'pruned';
      else if (currentPath.has(idx)) state = 'active';

      return {
        id: idx,
        label,
        parentId: parents[idx] ?? -1,
        state,
        returnValue: solutionNodes.has(idx) ? '\u2713' : prunedNodes.has(idx) ? '\u2715' : '?',
      };
    });
  }, [currentStep?.variables]);

  if (!currentStep) {
    return (
      <div className="shared-canvas-empty">
        <span style={{ fontWeight: 600, opacity: 0.7 }}>No backtracking data available</span>
        <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Select an algorithm to begin</span>
      </div>
    );
  }

  const isNQueens = algorithmKey === 'nQueens';
  const vars = currentStep.variables || {};
  const n = typeof vars.n === 'number' ? vars.n : currentStep.array.length || 4;
  const queenPosStr = (vars.queenPositions as string) || '';
  const queenIndices = queenPosStr.split(',').filter(Boolean).map(Number);
  const queenPositions: [number, number][] = queenIndices.map(idx => [Math.floor(idx / n), idx % n]);

  if (isNQueens) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Grid2D
          mode="2D"
          rows={n}
          cols={n}
          queenPositions={queenPositions}
          isChessboard={true}
          activeIndices={currentStep.comparingIndices}
          title="N-QUEENS CHESSBOARD"
          subtitle={`${queenPositions.length}/${n} queens placed`}
          onToggleFullscreen={onToggleFullscreen}
        />
        {treeNodes.length > 0 && (
          <DecisionTree
            nodes={treeNodes}
            callStack={currentStep.callStack}
            title="N-QUEENS DECISION TREE"
            subtitle={`${treeNodes.length} search nodes`}
          />
        )}
      </div>
    );
  }

  return (
    <DecisionTree
      nodes={treeNodes}
      callStack={currentStep.callStack}
      title="BACKTRACKING DECISION TREE"
      subtitle={`${treeNodes.length} nodes`}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
};
