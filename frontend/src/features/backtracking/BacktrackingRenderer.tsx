import React, { useMemo, useState } from 'react';
import { Layers, GitBranch, Columns, Maximize2 } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'visualizer' | 'tree' | 'split'>('split');

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
        returnValue: solutionNodes.has(idx) ? '✓' : prunedNodes.has(idx) ? '✕' : '?',
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

  const hasBothViews = isNQueens && treeNodes.length > 0;

  if (!isNQueens) {
    return (
      <DecisionTree
        nodes={treeNodes}
        callStack={currentStep.callStack}
        title="BACKTRACKING DECISION TREE"
        subtitle={`${treeNodes.length} search nodes`}
        onToggleFullscreen={onToggleFullscreen}
      />
    );
  }

  return (
    <div className="backtracking-container animate-fade-in">
      {hasBothViews && (
        <div className="bt-view-header">
          <span className="bt-view-title">N-QUEENS BACKTRACKING INSPECTOR</span>
          <div className="bt-view-toggle">
            <button
              className={`bt-view-btn ${viewMode === 'visualizer' ? 'active' : ''}`}
              onClick={() => setViewMode('visualizer')}
              title="Show Board Visualizer Only"
            >
              <Layers size={13} />
              <span>Board Only</span>
            </button>
            <button
              className={`bt-view-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
              title="Show Decision Tree & Call Stack Only"
            >
              <GitBranch size={13} />
              <span>Tree & Stack</span>
            </button>
            <button
              className={`bt-view-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Show Both Side-by-Side"
            >
              <Columns size={13} />
              <span>Split View</span>
            </button>
          </div>
        </div>
      )}

      <div className={`bt-workspace mode-${viewMode}`}>
        {(viewMode === 'visualizer' || viewMode === 'split' || !hasBothViews) && (
          <div className="bt-canvas-section">
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
          </div>
        )}

        {(viewMode === 'tree' || viewMode === 'split') && (
          <div className="bt-tree-section">
            <DecisionTree
              nodes={treeNodes}
              callStack={currentStep.callStack}
              title="N-QUEENS DECISION TREE"
              subtitle={`${treeNodes.length} search nodes`}
              onToggleFullscreen={onToggleFullscreen}
            />
          </div>
        )}
      </div>
    </div>
  );
};
