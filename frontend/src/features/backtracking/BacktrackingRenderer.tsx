import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { gsap } from 'gsap';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
import { Bar } from '../../components/primitives/Bar';
import { MotionPresets } from '../../engine/motionEngine';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import './Backtracking.css';

interface BacktrackingRendererProps {
  currentStep: ArrayStep | null;
  algorithmKey: string;
  onToggleFullscreen?: () => void;
}

const ALGO_NAMES: Record<string, string> = {
  subsets: 'Subsets',
  permutations: 'Permutations',
  nQueens: 'N-Queens',
  combinationSum: 'Combination Sum',
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
    currentPath,
    currentPathSet: new Set(currentPath),
    solutionSet: new Set(solutionNodes),
    prunedSet: new Set(prunedNodes),
    maxDepth: Math.max(0, ...nodes.map((n) => n.depth)),
  };
}

/* ── Decision Tree Canvas (primary, fully responsive) ─────────────── */
const DecisionTreeCanvas: React.FC<{
  tree: NonNullable<ReturnType<typeof parseTreeData>>;
  step: ArrayStep;
  algorithmKey: string;
}> = ({ tree, step, algorithmKey }) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const nodesLayerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevTreeRef = useRef<{ size: number; states: ElementState[] } | null>(null);
  const prevFoundRef = useRef(0);
  const [box, setBox] = useState({ w: 0, h: 0 });

  /* Measure the real container: an immediate synchronous measurement
     drives the first layout, then ResizeObserver + window resize keep it
     in sync on every resize / fullscreen toggle so the tree always fills
     the available space. */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox((b) =>
        Math.abs(b.w - r.width) < 1 && Math.abs(b.h - r.height) < 1
          ? b
          : { w: r.width, h: r.height },
      );
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { nodes, currentPath, currentPathSet, solutionSet, prunedSet, maxDepth } = tree;

  const states: ElementState[] = useMemo(
    () =>
      nodes.map((nd) => {
        if (solutionSet.has(nd.idx)) return 'sorted';
        if (prunedSet.has(nd.idx)) return 'swapping';
        if (currentPathSet.has(nd.idx)) return 'comparing';
        return 'default';
      }),
    [tree],
  );

  /* Pixel-space layout derived from the ACTUAL measured container. */
  const layout = useMemo(() => {
    if (nodes.length === 0 || box.w < 40 || box.h < 40) return null;

    const PAD_X = 30;
    const PAD_Y = 32;

    const depthCounts: number[] = new Array(maxDepth + 1).fill(0);
    for (const nd of nodes) depthCounts[nd.depth]++;
    const maxPerLevel = Math.max(1, ...depthCounts);

    const levelGap = maxDepth > 0 ? clamp((box.h - PAD_Y * 2) / maxDepth, 46, 130) : 0;
    const nodeSize = Math.round(
      clamp(Math.min(levelGap || 64, (box.w - PAD_X * 2) / maxPerLevel) * 0.5, 14, 32),
    );
    const radius = nodeSize / 2;

    // If the tree needs more room than the viewport, grow an internal
    // canvas and let the area scroll; otherwise it exactly fills.
    const neededW = PAD_X * 2 + maxPerLevel * (nodeSize + 20);
    const neededH = PAD_Y * 2 + maxDepth * levelGap + nodeSize;
    const canvasW = Math.max(box.w, neededW);
    const canvasH = Math.max(box.h, neededH);

    const usableW = canvasW - PAD_X * 2;
    const contentH = maxDepth * levelGap;
    const topY = (canvasH - contentH) / 2; // vertical centering

    // Horizontal: distribute each depth evenly across the full width so the
    // tree is centered and fills the canvas at every container size.
    const depthCursor: number[] = new Array(maxDepth + 1).fill(0);
    const positions: { x: number; y: number }[] = nodes.map((nd) => {
      const count = depthCounts[nd.depth];
      const i = depthCursor[nd.depth]++;
      const frac = count === 1 ? 0.5 : i / (count - 1);
      return { x: PAD_X + usableW * frac, y: topY + nd.depth * levelGap };
    });

    const levelSpacing = usableW / maxPerLevel;
    const showLabels = levelSpacing >= 54 && nodeSize >= 16;

    return { positions, canvasW, canvasH, nodeSize, radius, showLabels };
  }, [tree, box]);

  /* Motion presets — driven by per-node state transitions between steps. */
  useEffect(() => {
    const layer = nodesLayerRef.current;
    if (!layer) {
      prevTreeRef.current = null;
      return;
    }
    const prev = prevTreeRef.current;
    const wrappers = Array.from(layer.querySelectorAll<HTMLElement>('.bt-node'));

    // Fresh run / algorithm switch: record state without an entrance storm.
    if (!prev || nodes.length < prev.size) {
      prevTreeRef.current = { size: nodes.length, states: [...states] };
      return;
    }

    wrappers.forEach((el, i) => {
      if (i >= states.length) return;
      const isNew = i >= prev.size;
      if (isNew) {
        if (algorithmKey === 'nQueens') {
          if (states[i] === 'swapping') MotionPresets.shakeReject(el);
          else MotionPresets.popIn(el);
        } else {
          MotionPresets.branchExpand(el);
        }
        return;
      }
      if (prev.states[i] === states[i]) return;
      const s = states[i];
      if (s === 'sorted') {
        MotionPresets.flashState(el, '234,179,8'); // gold — solution found
      } else if (s === 'swapping') {
        if (algorithmKey === 'combinationSum') {
          MotionPresets.treePruneCollapse(el);
          gsap.delayedCall(0.32, () => gsap.set(el, { scale: 0.6, opacity: 0.5 }));
        } else {
          MotionPresets.shakeReject(el);
        }
      } else if (s === 'comparing') {
        MotionPresets.flashState(el, '245,158,11'); // amber — active frontier
      }
    });
    prevTreeRef.current = { size: nodes.length, states: [...states] };
  }, [step, layout]);

  /* Keep the active frontier in view when the tree outgrows the canvas. */
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !layout || currentPath.length === 0) return;
    const target = layout.positions[currentPath[currentPath.length - 1]];
    if (!target) return;
    let nx = area.scrollLeft;
    let ny = area.scrollTop;
    if (target.x > area.scrollLeft + area.clientWidth - 48) nx = target.x - area.clientWidth + 96;
    else if (target.x < area.scrollLeft + 24) nx = Math.max(0, target.x - 96);
    if (target.y > area.scrollTop + area.clientHeight - 48) ny = target.y - area.clientHeight + 96;
    else if (target.y < area.scrollTop + 24) ny = Math.max(0, target.y - 96);
    if (nx !== area.scrollLeft || ny !== area.scrollTop) area.scrollTo(nx, ny);
  }, [step, layout]);

  /* Solution counter ticks upward as solutions are discovered. */
  const vars = step.variables || {};
  const totalFound = typeof vars.totalFound === 'number' ? (vars.totalFound as number) : 0;
  useEffect(() => {
    if (badgeRef.current && totalFound > 0 && totalFound !== prevFoundRef.current) {
      const proxy = { value: prevFoundRef.current };
      MotionPresets.counterTick(proxy, totalFound, (v) => {
        if (badgeRef.current) badgeRef.current.textContent = String(v);
      });
    }
    prevFoundRef.current = totalFound;
  }, [step]);

  if (!layout) {
    return (
      <div className="bt-tree-region">
        <div className="bt-tree-area" ref={areaRef}>
          <div className="bt-tree-empty">Measuring canvas…</div>
        </div>
      </div>
    );
  }

  const { positions, canvasW, canvasH, nodeSize, radius, showLabels } = layout;

  return (
    <div className="bt-tree-region">
      <div className="bt-tree-area" ref={areaRef}>
        <div className="bt-tree-canvas" style={{ width: canvasW, height: canvasH }}>
          <svg
            className="bt-svg-layer"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {nodes.map((node) => {
              if (node.parent < 0) return null;
              const p1 = positions[node.parent];
              const p2 = positions[node.idx];
              const onPath = currentPathSet.has(node.idx) && currentPathSet.has(node.parent);
              const edgeState: ElementState = onPath
                ? 'comparing'
                : prunedSet.has(node.idx)
                  ? 'swapping'
                  : solutionSet.has(node.idx)
                    ? 'sorted'
                    : 'default';
              return (
                <Line
                  key={`e-${node.idx}`}
                  x1={p1.x}
                  y1={p1.y + radius}
                  x2={p2.x}
                  y2={p2.y - radius}
                  state={edgeState}
                  strokeWidth={onPath ? 2.25 : 1.25}
                />
              );
            })}
          </svg>

          <div className="bt-nodes-layer" ref={nodesLayerRef}>
            {nodes.map((node) => {
              const p = positions[node.idx];
              const s = states[node.idx];
              const display = prunedSet.has(node.idx)
                ? '\u2715'
                : solutionSet.has(node.idx)
                  ? '\u2713'
                  : '';
              return (
                <React.Fragment key={`n-${node.idx}`}>
                  <div
                    className={`bt-node state-${s}`}
                    style={{ left: p.x - radius, top: p.y - radius }}
                  >
                    <CircleNode value={display} state={s} size={nodeSize} />
                  </div>
                  {showLabels && node.label && (
                    <span
                      className="bt-node-tag"
                      style={{ left: p.x, top: p.y + radius + 3 }}
                    >
                      {node.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {totalFound > 0 && (
        <div className="bt-found-badge">
          ★ <span ref={badgeRef}>{totalFound}</span> found
        </div>
      )}
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

  const gridRef = useRef<HTMLDivElement>(null);
  const prevQueensRef = useRef<Set<number>>(new Set());
  const prevConflictRef = useRef<number>(-1);

  /* popIn on queen placement, shakeReject on conflict. */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    queenSet.forEach((idx) => {
      if (!prevQueensRef.current.has(idx)) {
        const crown = grid.querySelector<HTMLElement>(`[data-idx="${idx}"] .bt-queen`);
        if (crown) MotionPresets.popIn(crown);
      }
    });
    const conflictIdx = step.swappingIndices?.[0] ?? -1;
    if (conflictIdx >= 0 && conflictIdx !== prevConflictRef.current) {
      const cell = grid.querySelector<HTMLElement>(`[data-idx="${conflictIdx}"]`);
      if (cell) MotionPresets.shakeReject(cell);
    }
    prevQueensRef.current = queenSet;
    prevConflictRef.current = conflictIdx;
  }, [step]);

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
        <div key={idx} data-idx={idx} className={cellClass}>
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
      <div
        className="bt-board-grid"
        ref={gridRef}
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
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

  const barsRef = useRef<HTMLDivElement>(null);
  const prevFixedRef = useRef<number>(-1);

  /* Permutations: flash the shrinking pool each time a position is fixed. */
  useEffect(() => {
    const root = barsRef.current;
    if (!root) return;
    const fixedCount = sortedIndices.length;
    if (
      algorithmKey === 'permutations' &&
      prevFixedRef.current >= 0 &&
      fixedCount > prevFixedRef.current &&
      fixedCount < array.length
    ) {
      const wrappers = root.querySelectorAll<HTMLElement>('.bt-bar-wrapper');
      wrappers.forEach((w, i) => {
        const bar = w.querySelector('.bt-bar') ?? w;
        MotionPresets.flashState(bar, i < fixedCount ? '245,158,11' : '59,130,246');
      });
    }
    prevFixedRef.current = fixedCount;
  }, [step]);

  function getElementState(idx: number): ElementState {
    if (swappingIndices.includes(idx)) return 'swapping';
    if (comparingIndices.includes(idx)) return 'comparing';
    if (sortedIndices.includes(idx)) return 'sorted';
    return 'default';
  }

  // For combinationSum: show current combination and remainder
  const isCombo = algorithmKey === 'combinationSum';
  const currentSubset = (vars.currentSubset as string) || '[]';
  const remainder = typeof vars.remainder === 'number' ? vars.remainder : null;
  const targetVal = typeof vars.target === 'number' ? vars.target : null;

  return (
    <div className="bt-array-view">
      <div className="bt-bars-container" ref={barsRef}>
        {array.map((value, idx) => {
          const heightPct = (value / max) * 100;
          return (
            <div key={idx} className="bt-bar-wrapper">
              <Bar
                value={value}
                heightPercent={heightPct}
                state={getElementState(idx)}
                showValue={array.length <= 25}
              />
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
      <div className="bt-canvas-header">
        <div className="bt-header-left">
          <span className="bt-title">
            Decision Tree · {ALGO_NAMES[algorithmKey] || algorithmKey}
          </span>
          <span className="bt-subtitle">
            {decision}{totalFound > 0 ? ` · ${totalFound} found` : ''}
          </span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Enter Full Screen">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div className="bt-workspace">
        {tree ? (
          <DecisionTreeCanvas tree={tree} step={currentStep} algorithmKey={algorithmKey} />
        ) : (
          <div className="bt-tree-region">
            <div className="bt-tree-area">
              <div className="bt-tree-empty">No tree data</div>
            </div>
          </div>
        )}

        <div className="bt-context-pane">
          <div className="bt-context-header">
            {isNQueens ? 'N-Queens Board' : 'State Canvas'}
          </div>
          <div className="bt-context-body">
            {isNQueens ? (
              <NQueensBoard step={currentStep} />
            ) : (
              <ArrayStateView step={currentStep} algorithmKey={algorithmKey} />
            )}
          </div>
        </div>
      </div>

      <div className="bt-tree-legend">
        <span className="bt-legend-item"><span className="bt-legend-dot bt-dot-path" /> Current path</span>
        <span className="bt-legend-item"><span className="bt-legend-dot bt-dot-solution" /> Solution</span>
        <span className="bt-legend-item"><span className="bt-legend-dot bt-dot-pruned" /> Pruned</span>
        {tree && (
          <span className="bt-legend-count">
            {tree.nodes.length} nodes · depth {tree.maxDepth + 1}
          </span>
        )}
      </div>
    </div>
  );
};
