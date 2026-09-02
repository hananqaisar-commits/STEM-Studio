import React, { useEffect, useRef } from 'react';
import { Maximize2, Layers } from 'lucide-react';
import { CircleNode } from '../primitives/CircleNode';
import { Line } from '../primitives/Line';
import type { ElementState } from '../../engine/types/Step';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface DecisionTreeNode {
  id: number;
  label: string;
  parentId: number; // -1 for root
  state: 'pending' | 'active' | 'pruned' | 'returning' | 'completed';
  returnValue?: string;
}

export interface DecisionTreeProps {
  nodes: DecisionTreeNode[];
  callStack?: string[];
  title?: string;
  subtitle?: string;
  onToggleFullscreen?: () => void;
}

function toElementState(state: string): ElementState {
  switch (state) {
    case 'active': return 'comparing';
    case 'returning': return 'swapping';
    case 'completed': return 'sorted';
    default: return 'default';
  }
}

function stateColor(state: string): string {
  switch (state) {
    case 'active': return '#f59e0b';
    case 'returning': return '#ec4899';
    case 'completed': return '#22c55e';
    case 'pruned': return '#ef4444';
    default: return '#475569';
  }
}

export const DecisionTree: React.FC<DecisionTreeProps> = ({
  nodes = [],
  callStack = [],
  title = 'DECISION TREE CANVAS',
  subtitle,
  onToggleFullscreen,
}) => {
  const nodesLayerRef = useRef<HTMLDivElement>(null);

  // Trigger branchExpand / treePruneCollapse animation on active/pruned nodes
  useEffect(() => {
    if (!nodesLayerRef.current) return;
    const activeEls = Array.from(
      nodesLayerRef.current.querySelectorAll<HTMLElement>('.decisiontree-node-wrapper.state-active')
    );
    if (activeEls.length > 0) {
      MotionPresets.branchExpand(activeEls);
    }

    const prunedEls = Array.from(
      nodesLayerRef.current.querySelectorAll<HTMLElement>('.decisiontree-node-wrapper.state-pruned')
    );
    if (prunedEls.length > 0) {
      MotionPresets.treePruneCollapse(prunedEls);
    }
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="shared-canvas-container animate-fade-in">
        <div className="shared-canvas-header">
          <div className="canvas-header-left">
            <span className="shared-canvas-title">{title}</span>
            <span className="shared-canvas-subtitle">Empty tree</span>
          </div>
        </div>
        <div className="shared-canvas-empty">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.35, marginBottom: '0.4rem' }}>
              <circle cx="22" cy="10" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="28" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
              <circle cx="32" cy="28" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
              <line x1="22" y1="15" x2="12" y2="23" stroke="#64748b" strokeWidth="1.2" />
              <line x1="22" y1="15" x2="32" y2="23" stroke="#64748b" strokeWidth="1.2" />
            </svg>
            <span style={{ fontWeight: 600, opacity: 0.7 }}>Decision Tree Canvas</span>
            <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Run recursion/backtracking to build the decision tree</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Subtree-Width Auto-Layout Positioning ───────────────────────── */
  const n = nodes.length;
  const childrenMap = new Map<number, number[]>();
  let rootId = 0;

  for (let i = 0; i < n; i++) {
    const parent = nodes[i].parentId;
    if (parent === -1 || parent === i) {
      rootId = i;
      continue;
    }
    if (!childrenMap.has(parent)) childrenMap.set(parent, []);
    childrenMap.get(parent)!.push(i);
  }

  // Compute width in leaf units
  const widthCache = new Map<number, number>();
  function getSubtreeWidth(id: number): number {
    if (widthCache.has(id)) return widthCache.get(id)!;
    const kids = childrenMap.get(id) || [];
    const w = kids.length === 0 ? 1 : kids.reduce((acc, k) => acc + getSubtreeWidth(k), 0);
    widthCache.set(id, w);
    return w;
  }

  const totalWidth = getSubtreeWidth(rootId);
  const rawX = new Map<number, number>();
  const depthMap = new Map<number, number>();

  function assignPositions(id: number, left: number, depth: number): void {
    depthMap.set(id, depth);
    const kids = childrenMap.get(id) || [];
    if (kids.length === 0) {
      rawX.set(id, left + 0.5);
      return;
    }
    let cursor = left;
    for (const kid of kids) {
      assignPositions(kid, cursor, depth + 1);
      cursor += getSubtreeWidth(kid);
    }
    const first = rawX.get(kids[0])!;
    const last = rawX.get(kids[kids.length - 1])!;
    rawX.set(id, (first + last) / 2);
  }

  assignPositions(rootId, 0, 0);

  const PAD_X = 6;
  const usableX = 100 - PAD_X * 2;
  const START_Y = 50;
  const LEVEL_GAP = 76;

  let maxDepth = 0;
  const layoutNodes = nodes.map((nd, idx) => {
    const depth = depthMap.get(idx) ?? 0;
    maxDepth = Math.max(maxDepth, depth);
    const x = PAD_X + ((rawX.get(idx) ?? 0) / totalWidth) * usableX;
    const y = START_Y + depth * LEVEL_GAP;
    return { ...nd, idx, x, y };
  });

  const layoutEdges = [];
  for (let i = 0; i < n; i++) {
    const p = nodes[i].parentId;
    if (p === -1 || p === i || p >= n) continue;
    const pn = layoutNodes[p];
    const cn = layoutNodes[i];
    const edgeState = cn.state !== 'pending' ? cn.state : pn.state !== 'pending' ? pn.state : 'pending';
    layoutEdges.push({ x1: pn.x, y1: pn.y, x2: cn.x, y2: cn.y, state: edgeState });
  }

  const canvasHeight = Math.max(380, START_Y + maxDepth * LEVEL_GAP + 80);
  const displaySubtitle = subtitle || `${n} node${n !== 1 ? 's' : ''} \u2022 depth ${maxDepth + 1}`;

  return (
    <div className="shared-canvas-container animate-fade-in">
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          <span className="shared-canvas-subtitle">{displaySubtitle}</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div className="decisiontree-workspace">
        {/* Main Tree Canvas Area */}
        <div className="decisiontree-canvas-area" style={{ minHeight: canvasHeight }}>
          <svg className="decisiontree-svg-layer" width="100%" height={canvasHeight}>
            {layoutEdges.map((e, idx) => (
              <Line
                key={idx}
                x1={`${e.x1}%`}
                y1={e.y1}
                x2={`${e.x2}%`}
                y2={e.y2}
                state={toElementState(e.state)}
                strokeWidth={e.state === 'pending' ? 1.5 : 2.5}
              />
            ))}
          </svg>

          <div ref={nodesLayerRef} className="decisiontree-nodes-layer">
            {layoutNodes.map(nd => (
              <div
                key={nd.id}
                className={`decisiontree-node-wrapper state-${nd.state}`}
                style={{ left: `${nd.x}%`, top: `${nd.y}px` }}
              >
                {/* Call label above node */}
                <span className="decisiontree-node-call-label" style={{ color: stateColor(nd.state) }}>
                  {nd.label}
                </span>

                {/* Circle Node */}
                <CircleNode
                  value={nd.returnValue && nd.returnValue !== '?' ? nd.returnValue : '\u2219'}
                  state={toElementState(nd.state)}
                  size={44}
                />

                {/* Return Value Badge below node */}
                {nd.returnValue && nd.returnValue !== '?' && nd.returnValue !== '\u2219' && (
                  <span className={`decisiontree-return-badge state-${nd.state}`}>
                    {nd.returnValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Call Stack Sidebar */}
        {callStack.length > 0 && (
          <div className="decisiontree-callstack-sidebar">
            <div className="callstack-header">
              <Layers size={14} />
              <span>Call Stack</span>
              <span className="callstack-count">{callStack.length}</span>
            </div>
            <div className="callstack-body">
              {[...callStack].reverse().map((frame, i) => (
                <div key={i} className={`callstack-frame ${i === 0 ? 'frame-top' : ''}`}>
                  <span className="frame-depth">{callStack.length - i}</span>
                  <span className="frame-label" title={frame}>{frame}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
