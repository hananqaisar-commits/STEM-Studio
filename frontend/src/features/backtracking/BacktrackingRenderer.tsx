import React, { useMemo } from 'react';
import { Maximize2 } from 'lucide-react';
import type { ArrayStep } from '../../engine/types/Step';
import './Backtracking.css';

interface BacktrackingRendererProps {
  currentStep: ArrayStep | null;
  algorithmKey: string;
  onToggleFullscreen?: () => void;
}

/* ── Tree data parsed from step.variables ──────────────────────────── */
interface TreeNode {
  idx: number;
  label: string;
  parent: number;
  depth: number;
  children: number[];
}

function parseTreeData(vars: Record<string, string | number | boolean | null> | undefined) {
  if (!vars || !vars.treeNodes) return null;

  const labels = (vars.treeNodes as string).split('|');
  const parents = (vars.parentMap as string).split(',').map(Number);
  const currentPath = vars.currentPath
    ? (vars.currentPath as string).split(',').filter(Boolean).map(Number)
    : [];
  const solutionNodes = vars.solutionNodes
    ? (vars.solutionNodes as string).split(',').filter(Boolean).map(Number)
    : [];
  const prunedNodes = vars.prunedNodes
    ? (vars.prunedNodes as string).split(',').filter(Boolean).map(Number)
    : [];

  const nodes: TreeNode[] = labels.map((label, idx) => ({
    idx,
    label,
    parent: parents[idx] ?? -1,
    depth: 0,
    children: [],
  }));

  // Build adjacency
  for (let i = 0; i < nodes.length; i++) {
    const p = nodes[i].parent;
    if (p >= 0 && p < nodes.length) {
      nodes[p].children.push(i);
    }
  }

  // Compute depths
  function setDepth(idx: number, d: number) {
    nodes[idx].depth = d;
    for (const child of nodes[idx].children) setDepth(child, d + 1);
  }
  if (nodes.length > 0) setDepth(0, 0);

  return {
    nodes,
    currentPathSet: new Set(currentPath),
    solutionSet: new Set(solutionNodes),
    prunedSet: new Set(prunedNodes),
    maxDepth: Math.max(0, ...nodes.map((n) => n.depth)),
  };
}

/* ── Decision Tree Sidebar ────────────────────────────────────────── */
const DecisionTreeSidebar: React.FC<{
  tree: ReturnType<typeof parseTreeData>;
}> = ({ tree }) => {
  if (!tree || tree.nodes.length === 0) {
    return (
      <div className="bt-tree-sidebar">
        <div className="bt-tree-header">DECISION TREE</div>
        <div className="bt-tree-empty">No tree data</div>
      </div>
    );
  }

  const { nodes, currentPathSet, solutionSet, prunedSet, maxDepth } = tree;
  const nodeSize = Math.max(12, Math.min(22, 220 / (maxDepth + 2)));
  const levelHeight = Math.max(24, Math.min(40, 340 / (maxDepth + 1)));
  const svgHeight = (maxDepth + 1) * levelHeight + 20;

  // Assign x positions: for each depth level, distribute evenly
  const depthCounts: number[] = new Array(maxDepth + 1).fill(0);
  const depthIdx: number[] = new Array(nodes.length).fill(0);
  for (const node of nodes) depthCounts[node.depth]++;
  const depthCurrent: number[] = new Array(maxDepth + 1).fill(0);
  for (const node of nodes) {
    depthIdx[node.idx] = depthCurrent[node.depth]++;
  }

  const positions: { x: number; y: number }[] = nodes.map((node) => {
    const count = depthCounts[node.depth];
    const idx = depthIdx[node.idx];
    const x = count === 1 ? 50 : 8 + (84 * idx) / (count - 1);
    const y = 10 + node.depth * levelHeight;
    return { x, y };
  });

  function getNodeClass(idx: number): string {
    if (currentPathSet.has(idx)) return 'bt-tree-node-path';
    if (solutionSet.has(idx)) return 'bt-tree-node-solution';
    if (prunedSet.has(idx)) return 'bt-tree-node-pruned';
    return 'bt-tree-node-default';
  }

  return (
    <div className="bt-tree-sidebar">
      <div className="bt-tree-header">
        DECISION TREE
        <span className="bt-tree-count">{nodes.length} nodes</span>
      </div>
      <div className="bt-tree-scroll">
        <svg width="100%" height={svgHeight} viewBox={`0 0 100 ${svgHeight}`} preserveAspectRatio="xMidYMin meet">
          {/* Edges */}
          {nodes.map((node) => {
            if (node.parent < 0) return null;
            const p1 = positions[node.parent];
            const p2 = positions[node.idx];
            const onPath = currentPathSet.has(node.idx) && currentPathSet.has(node.parent);
            return (
              <line
                key={`e-${node.idx}`}
                x1={`${p1.x}%`}
                y1={p1.y + nodeSize / 2}
                x2={`${p2.x}%`}
                y2={p2.y - nodeSize / 2}
                stroke={onPath ? '#f59e0b' : prunedSet.has(node.idx) ? '#ef4444' : '#334155'}
                strokeWidth={onPath ? 2 : 1}
                opacity={prunedSet.has(node.idx) ? 0.4 : onPath ? 1 : 0.5}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.idx];
            const cls = getNodeClass(node.idx);
            const r = nodeSize / 2;
            return (
              <g key={`n-${node.idx}`}>
                <circle
                  cx={`${pos.x}%`}
                  cy={pos.y}
                  r={r}
                  className={cls}
                />
                {prunedSet.has(node.idx) && (
                  <text
                    x={`${pos.x}%`}
                    y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={r}
                    fill="#ef4444"
                    fontWeight="bold"
                  >
                    ✕
                  </text>
                )}
                {nodeSize >= 16 && !prunedSet.has(node.idx) && (
                  <title>{node.label}</title>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="bt-tree-legend">
        <span className="bt-legend-item"><span className="bt-legend-dot bt-dot-path" /> Current</span>
        <span className="bt-legend-item"><span className="bt-legend-dot bt-dot-solution" /> Solution</span>
        <span className="bt-legend-item"><span className="bt-legend-dot bt-dot-pruned" /> Pruned</span>
      </div>
    </div>
  );
};

/* ── N-Queens Board ────────────────────────────────────────────────── */
const NQueensBoard: React.FC<{ step: ArrayStep }> = ({ step }) => {
  const vars = step.variables || {};
  const n = typeof vars.n === 'number' ? vars.n : step.array.length;
  const attackedStr = (vars.attacked as string) || '';
  const attackedSet = new Set(attackedStr.split(',').filter(Boolean).map(Number));
  const queenPosStr = (vars.queenPositions as string) || '';
  const queenSet = new Set(queenPosStr.split(',').filter(Boolean).map(Number));
  const comparingSet = new Set(step.comparingIndices || []);
  const swappingSet = new Set(step.swappingIndices || []);

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const idx = r * n + c;
      const isQueen = queenSet.has(idx);
      const isAttacked = attackedSet.has(idx);
      const isComparing = comparingSet.has(idx);
      const isConflict = swappingSet.has(idx);
      const isDark = (r + c) % 2 === 1;

      let cellClass = 'bt-board-cell';
      if (isDark) cellClass += ' bt-cell-dark';
      else cellClass += ' bt-cell-light';
      if (isQueen) cellClass += ' bt-cell-queen';
      if (isAttacked && !isQueen) cellClass += ' bt-cell-attacked';
      if (isComparing) cellClass += ' bt-cell-comparing';
      if (isConflict) cellClass += ' bt-cell-conflict';

      cells.push(
        <div key={idx} className={cellClass}>
          {isQueen && <span className="bt-queen">♛</span>}
          {isConflict && !isQueen && <span className="bt-conflict-x">✕</span>}
        </div>,
      );
    }
  }

  return (
    <div className="bt-board-wrapper">
      <div className="bt-board-row-labels">
        {Array.from({ length: n }, (_, r) => (
          <span key={r} className="bt-board-label">{r}</span>
        ))}
      </div>
      <div className="bt-board-grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {cells}
      </div>
      <div className="bt-board-col-labels">
        {Array.from({ length: n }, (_, c) => (
          <span key={c} className="bt-board-label">{c}</span>
        ))}
      </div>
    </div>
  );
};

/* ── Array State View (subsets, permutations, combinationSum) ────── */
const ArrayStateView: React.FC<{ step: ArrayStep; algorithmKey: string }> = ({ step, algorithmKey }) => {
  const { array, comparingIndices = [], swappingIndices = [], sortedIndices = [] } = step;
  const vars = step.variables || {};
  const max = Math.max(...array, 1);

  function getElementClass(idx: number): string {
    if (swappingIndices.includes(idx)) return 'bt-bar bt-bar-swapping';
    if (comparingIndices.includes(idx)) return 'bt-bar bt-bar-comparing';
    if (sortedIndices.includes(idx)) return 'bt-bar bt-bar-chosen';
    return 'bt-bar bt-bar-default';
  }

  // For combinationSum: show current combination and remainder
  const isCombo = algorithmKey === 'combinationSum';
  const currentSubset = (vars.currentSubset as string) || '[]';
  const remainder = typeof vars.remainder === 'number' ? vars.remainder : null;
  const targetVal = typeof vars.target === 'number' ? vars.target : null;

  return (
    <div className="bt-array-view">
      <div className="bt-bars-container">
        {array.map((value, idx) => {
          const heightPct = (value / max) * 100;
          return (
            <div key={idx} className="bt-bar-wrapper">
              <div
                className={getElementClass(idx)}
                style={{ height: `${heightPct}%` }}
              >
                <span className="bt-bar-value">{value}</span>
              </div>
              <span className="bt-bar-index">[{idx}]</span>
            </div>
          );
        })}
      </div>
      {isCombo && (
        <div className="bt-combo-info">
          <div className="bt-combo-current">
            <span className="bt-combo-label">Current:</span>
            <span className="bt-combo-value">{currentSubset}</span>
          </div>
          {remainder !== null && targetVal !== null && (
            <div className="bt-combo-sum-bar">
              <div className="bt-sum-track">
                <div
                  className="bt-sum-fill"
                  style={{ width: `${((targetVal - remainder) / targetVal) * 100}%` }}
                />
              </div>
              <span className="bt-sum-text">{targetVal - remainder} / {targetVal}</span>
            </div>
          )}
        </div>
      )}
      {!isCombo && (
        <div className="bt-subset-info">
          <span className="bt-subset-label">Current: </span>
          <span className="bt-subset-value">{currentSubset}</span>
        </div>
      )}
    </div>
  );
};

/* ── Main Renderer ────────────────────────────────────────────────── */
export const BacktrackingRenderer: React.FC<BacktrackingRendererProps> = ({
  currentStep,
  algorithmKey,
  onToggleFullscreen,
}) => {
  const tree = useMemo(() => parseTreeData(currentStep?.variables), [currentStep?.variables]);

  if (!currentStep) {
    return (
      <div className="bt-canvas-empty">
        <span style={{ fontWeight: 600, opacity: 0.7 }}>No backtracking data available</span>
        <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Select an algorithm to begin</span>
      </div>
    );
  }

  const isNQueens = algorithmKey === 'nQueens';
  const vars = currentStep.variables || {};
  const totalFound = typeof vars.totalFound === 'number' ? vars.totalFound : 0;
  const decision = (vars.decision as string) || '';

  return (
    <div className="bt-renderer animate-fade-in">
      <div className="bt-main-area">
        <div className="bt-canvas-header">
          <div className="bt-header-left">
            <span className="bt-title">{isNQueens ? 'N-QUEENS BOARD' : 'STATE CANVAS'}</span>
            <span className="bt-subtitle">
              {decision}{totalFound > 0 ? ` · ${totalFound} found` : ''}
            </span>
          </div>
          {onToggleFullscreen && (
            <button className="bt-fullscreen-btn" onClick={onToggleFullscreen} title="Fullscreen">
              <Maximize2 size={14} />
            </button>
          )}
        </div>

        <div className="bt-canvas-body">
          {isNQueens ? (
            <NQueensBoard step={currentStep} />
          ) : (
            <ArrayStateView step={currentStep} algorithmKey={algorithmKey} />
          )}
        </div>
      </div>

      <DecisionTreeSidebar tree={tree} />
    </div>
  );
};
