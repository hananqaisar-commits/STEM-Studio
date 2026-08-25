import React from 'react';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import './Recursion.css';

interface RecursionTreeRendererProps {
  currentStep: ArrayStep | null;
  onToggleFullscreen?: () => void;
}

/* ── Internal layout types ──────────────────────────────────────────── */
interface LayoutNode {
  idx: number;
  label: string;
  x: number;       // percentage 0–100
  y: number;       // pixels from top
  state: string;   // pending | active | returning | completed
  returnValue: string;
}

interface LayoutEdge {
  x1: number; y1: number;
  x2: number; y2: number;
  state: string;
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function toElementState(s: string): ElementState {
  switch (s) {
    case 'active':    return 'comparing';
    case 'returning': return 'swapping';
    case 'completed': return 'sorted';
    default:          return 'default';
  }
}

function stateColor(s: string): string {
  switch (s) {
    case 'active':    return '#f59e0b';
    case 'returning': return '#ec4899';
    case 'completed': return '#10b981';
    default:          return '#475569';
  }
}

/* ── Component ──────────────────────────────────────────────────────── */
export const RecursionTreeRenderer: React.FC<RecursionTreeRendererProps> = ({
  currentStep,
  onToggleFullscreen,
}) => {
  /* ── Empty state ─────────────────────────────────────────────────── */
  if (!currentStep?.variables?.nodeLabels) {
    return (
      <div className="sorting-canvas-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.35, marginBottom: '0.4rem' }}>
            <circle cx="22" cy="10" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <circle cx="12" cy="28" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <circle cx="32" cy="28" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <line x1="22" y1="15" x2="12" y2="23" stroke="#64748b" strokeWidth="1.2" />
            <line x1="22" y1="15" x2="32" y2="23" stroke="#64748b" strokeWidth="1.2" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>Recursion Tree Canvas</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Click Play to visualize the call tree</span>
        </div>
      </div>
    );
  }

  /* ── Parse tree data from step variables ─────────────────────────── */
  const vars = currentStep.variables;
  const labels: string[]     = String(vars.nodeLabels).split(',');
  const parents: number[]    = String(vars.parentMap).split(',').map(Number);
  const states: string[]     = String(vars.nodeStates).split(',');
  const retVals: string[]    = String(vars.returnValues).split(',');
  const n = labels.length;

  /* ── Build children adjacency ────────────────────────────────────── */
  const childrenOf = new Map<number, number[]>();
  let rootIdx = 0;
  for (let i = 0; i < n; i++) {
    if (parents[i] === -1) { rootIdx = i; continue; }
    const p = parents[i];
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p)!.push(i);
  }

  /* ── Tree layout: subtree-width based positioning ────────────────── */
  const START_Y   = 52;
  const LEVEL_GAP = 76;
  const PAD_X     = 6;   // % padding each side

  // Compute subtree width (number of leaves in subtree)
  const widthCache = new Map<number, number>();
  function subtreeWidth(idx: number): number {
    if (widthCache.has(idx)) return widthCache.get(idx)!;
    const kids = childrenOf.get(idx) || [];
    const w = kids.length === 0 ? 1 : kids.reduce((s, k) => s + subtreeWidth(k), 0);
    widthCache.set(idx, w);
    return w;
  }
  const totalWidth = subtreeWidth(rootIdx);

  // Recursively assign x (in "leaf units") and depth
  const rawX     = new Map<number, number>();
  const depthMap = new Map<number, number>();

  function assignPositions(idx: number, left: number, depth: number): void {
    depthMap.set(idx, depth);
    const kids = childrenOf.get(idx) || [];
    if (kids.length === 0) {
      rawX.set(idx, left + 0.5);
      return;
    }
    let cursor = left;
    for (const kid of kids) {
      assignPositions(kid, cursor, depth + 1);
      cursor += subtreeWidth(kid);
    }
    const first = rawX.get(kids[0])!;
    const last  = rawX.get(kids[kids.length - 1])!;
    rawX.set(idx, (first + last) / 2);
  }
  assignPositions(rootIdx, 0, 0);

  // Convert raw leaf-unit X → percentage, Y from depth
  const usable = 100 - PAD_X * 2;
  const layoutNodes: LayoutNode[] = [];
  const layoutEdges: LayoutEdge[] = [];
  let maxDepth = 0;

  for (let i = 0; i < n; i++) {
    const x = PAD_X + (rawX.get(i)! / totalWidth) * usable;
    const y = START_Y + (depthMap.get(i) ?? 0) * LEVEL_GAP;
    maxDepth = Math.max(maxDepth, depthMap.get(i) ?? 0);
    layoutNodes.push({ idx: i, label: labels[i], x, y, state: states[i], returnValue: retVals[i] });
  }

  // Build edges
  for (let i = 0; i < n; i++) {
    const p = parents[i];
    if (p === -1) continue;
    const pn = layoutNodes[p];
    const cn = layoutNodes[i];
    // Edge state: use child state if active/returning, else parent state
    const edgeState =
      cn.state !== 'pending' ? cn.state
      : pn.state !== 'pending' ? pn.state
      : 'pending';
    layoutEdges.push({ x1: pn.x, y1: pn.y, x2: cn.x, y2: cn.y, state: edgeState });
  }

  const canvasHeight = Math.max(340, START_Y + maxDepth * LEVEL_GAP + 80);

  /* ── Call stack (most-recent at top) ─────────────────────────────── */
  const callStack = currentStep.callStack ?? [];

  return (
    <div className="recursion-canvas-container animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="recursion-canvas-header">
        <div className="canvas-header-left">
          <span className="tree-title">RECURSION CALL TREE</span>
          <span className="tree-subtitle">{n} call{n !== 1 ? 's' : ''} &bull; depth {maxDepth + 1}</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen}>
            <span>⛶</span> <span>Fullscreen</span>
          </button>
        )}
      </div>

      {/* ── Main workspace: tree + sidebar ────────────────────────── */}
      <div className="recursion-workspace">
        {/* ── Tree canvas ──────────────────────────────────────────── */}
        <div className="recursion-tree-area" style={{ minHeight: canvasHeight }}>
          {/* SVG edge layer */}
          <svg className="recursion-svg-layer" width="100%" height={canvasHeight}>
            {layoutEdges.map((e, i) => (
              <Line
                key={i}
                x1={`${e.x1}%`}
                y1={e.y1}
                x2={`${e.x2}%`}
                y2={e.y2}
                state={toElementState(e.state)}
                strokeWidth={e.state === 'pending' ? 1.5 : 2.5}
              />
            ))}
          </svg>

          {/* Node layer */}
          <div className="recursion-nodes-layer">
            {layoutNodes.map((nd) => (
              <div
                key={nd.idx}
                className={`recursion-node-wrapper state-${nd.state}`}
                style={{ left: `${nd.x}%`, top: `${nd.y}px` }}
              >
                {/* Call label above */}
                <span
                  className="recursion-call-label"
                  style={{ color: stateColor(nd.state) }}
                >
                  {nd.label}
                </span>

                {/* Circle node */}
                <CircleNode
                  value={nd.returnValue !== '?' && nd.returnValue !== 'done' ? nd.returnValue : '·'}
                  state={toElementState(nd.state)}
                  size={44}
                />

                {/* Return value badge below */}
                {nd.returnValue !== '?' && nd.returnValue !== '·' && (
                  <span
                    className={`recursion-return-badge state-${nd.state}`}
                  >
                    {nd.returnValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Call stack sidebar ────────────────────────────────────── */}
        <div className="recursion-callstack-sidebar">
          <div className="callstack-header">
            <span className="callstack-icon">⊞</span>
            <span>Call Stack</span>
            <span className="callstack-count">{callStack.length}</span>
          </div>
          <div className="callstack-body">
            {callStack.length === 0 ? (
              <div className="callstack-empty">Stack empty</div>
            ) : (
              [...callStack].reverse().map((frame, i) => (
                <div
                  key={i}
                  className={`callstack-frame ${i === 0 ? 'frame-top' : ''}`}
                >
                  <span className="frame-depth">{callStack.length - i}</span>
                  <span className="frame-label">{frame}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Step description ──────────────────────────────────────── */}
      <div className="recursion-description-bar">
        {currentStep.description}
      </div>
    </div>
  );
};
