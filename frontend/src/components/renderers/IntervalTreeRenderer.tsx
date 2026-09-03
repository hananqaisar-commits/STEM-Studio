import React from 'react';
import { Maximize2 } from 'lucide-react';
import type { SegTreeStep, SegTreeNodeData } from '../../features/bst/segmentTreeEngine';

interface IntervalTreeRendererProps {
  step: SegTreeStep | null;
  onToggleFullscreen?: () => void;
}

const STATE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  default:       { fill: 'var(--color-surface-elevated)',  stroke: 'var(--color-border)',  text: 'var(--color-text)' },
  active:        { fill: '#1e3a5f',                        stroke: '#38bdf8',               text: '#e0f2fe' },
  fullOverlap:   { fill: '#14532d',                        stroke: '#4ade80',               text: '#dcfce7' },
  partialOverlap:{ fill: '#713f12',                        stroke: '#fbbf24',               text: '#fef3c7' },
  noOverlap:     { fill: '#1c1917',                        stroke: '#64748b',               text: '#64748b' },
  updated:       { fill: '#3b1b6b',                        stroke: '#c084fc',               text: '#f5f3ff' },
  target:        { fill: '#7c1b1b',                        stroke: '#f87171',               text: '#fee2e2' },
};

const ARRAY_CELL_STATE_COLORS: Record<string, string> = {
  highlighted: '#38bdf8',
  query:       '#4ade80',
  update:      '#f87171',
  default:     'var(--color-surface-elevated)',
};

const NODE_W = 80;
const NODE_H = 38;

export const IntervalTreeRenderer: React.FC<IntervalTreeRendererProps> = ({
  step,
  onToggleFullscreen,
}) => {
  if (!step || step.nodes.length === 0) {
    return (
      <div className="bst-canvas-container animate-fade-in">
        <div className="bst-canvas-header">
          <div className="canvas-header-left">
            <span className="bst-title">SEGMENT TREE CANVAS</span>
            <span className="bst-subtitle">Enter array values and build the tree</span>
          </div>
        </div>
        <div className="bst-canvas-empty" style={{ minHeight: 300 }}>
          <div className="empty-canvas-content">
            <span style={{ fontWeight: 600, opacity: 0.7 }}>No Segment Tree built yet</span>
            <span style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '0.25rem' }}>
              Enter an array and click <strong>Build Tree</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { nodes, edges, array, highlightedArrayIndices, queryRange, updateIndex, result, phase } = step;

  // Compute SVG canvas dimensions
  const maxX = Math.max(...nodes.map((n) => n.x)) + 8;
  const maxY = Math.max(...nodes.map((n) => n.y)) + NODE_H + 20;
  // Convert % x to pixel using estimated width; we use a fixed 700 viewbox
  const VB_W = Math.max(700, maxX * 7 + 80);
  const VB_H = Math.max(320, maxY + 20);

  // Convert nodes: x is in % (0-100), y is in px
  function nodePixelX(n: SegTreeNodeData) {
    return (n.x / 100) * VB_W;
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="bst-canvas-container animate-fade-in">
      <div className="bst-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">SEGMENT TREE CANVAS</span>
          <span className="bst-subtitle">
            {nodes.length} nodes · {array.length} elements
            {result !== undefined && phase === 'complete' && (
              <span style={{ marginLeft: '1rem', color: '#4ade80', fontWeight: 700 }}>
                Result = {result}
              </span>
            )}
          </span>
        </div>
        {onToggleFullscreen && (
          <button
            className="fullscreen-toggle-btn"
            onClick={onToggleFullscreen}
            title="Enter Full Screen"
          >
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div className="bst-canvas-workspace" style={{ overflowX: 'auto' }}>
        {/* ── Array Strip ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '10px 16px 6px',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'nowrap',
            overflowX: 'auto',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-text-muted)',
              fontWeight: 700,
              marginRight: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            ARRAY:
          </span>
          {array.map((val, idx) => {
            const isHighlighted = highlightedArrayIndices.includes(idx);
            const isQueryRange = queryRange && idx >= queryRange.start && idx <= queryRange.end;
            const isUpdateTarget = updateIndex === idx;
            let bg = ARRAY_CELL_STATE_COLORS.default;
            let border = 'var(--color-border)';
            let color = 'var(--color-text)';
            if (isUpdateTarget) { bg = ARRAY_CELL_STATE_COLORS.update; border = '#f87171'; color = '#fff'; }
            else if (isQueryRange) { bg = ARRAY_CELL_STATE_COLORS.query; border = '#4ade80'; color = '#0f172a'; }
            else if (isHighlighted) { bg = ARRAY_CELL_STATE_COLORS.highlighted; border = '#38bdf8'; color = '#0f172a'; }
            return (
              <div
                key={idx}
                style={{
                  minWidth: '42px',
                  height: '42px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: `2px solid ${border}`,
                  background: bg,
                  color,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'all 0.25s',
                  flexShrink: 0,
                }}
              >
                <span>{val}</span>
                <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 400 }}>[{idx}]</span>
              </div>
            );
          })}

          {/* Query range / update info badge */}
          {queryRange && (
            <div
              style={{
                marginLeft: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#14532d',
                border: '1px solid #4ade80',
                color: '#dcfce7',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Query [{queryRange.start}..{queryRange.end}]
            </div>
          )}
          {updateIndex !== undefined && (
            <div
              style={{
                marginLeft: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#7c1b1b',
                border: '1px solid #f87171',
                color: '#fee2e2',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Update [{updateIndex}]
            </div>
          )}
        </div>

        {/* ── Segment Tree SVG ──────────────────────────────────────────── */}
        <svg
          width="100%"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ minWidth: `${VB_W}px`, display: 'block' }}
        >
          <defs>
            <pattern id="sgDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="rgba(148, 163, 184, 0.1)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sgDotGrid)" />

          {/* ── Edges ───────────────────────────────────────────────────── */}
          {edges.map((edge, i) => {
            const from = nodeMap.get(edge.fromId);
            const to = nodeMap.get(edge.toId);
            if (!from || !to) return null;
            const fx = nodePixelX(from);
            const tx = nodePixelX(to);
            const fy = from.y + NODE_H;
            const ty = to.y;
            const isActive = edge.state === 'comparing';
            return (
              <line
                key={i}
                x1={fx}
                y1={fy}
                x2={tx}
                y2={ty}
                stroke={isActive ? '#38bdf8' : 'var(--color-border)'}
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={isActive ? 1 : 0.5}
              />
            );
          })}

          {/* ── Nodes ───────────────────────────────────────────────────── */}
          {nodes.map((node) => {
            const colors = STATE_COLORS[node.state] || STATE_COLORS.default;
            const px = nodePixelX(node);
            const py = node.y;
            const halfW = NODE_W / 2;

            return (
              <g key={node.id} transform={`translate(${px - halfW}, ${py})`}>
                {/* Node rectangle */}
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx="8"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={node.state !== 'default' ? 2.5 : 1.5}
                  style={{ transition: 'fill 0.25s, stroke 0.25s' }}
                />

                {/* Range label at top */}
                <text
                  x={NODE_W / 2}
                  y={12}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="600"
                  opacity="0.85"
                >
                  [{node.rangeStart}..{node.rangeEnd}]
                </text>

                {/* Value label */}
                <text
                  x={NODE_W / 2}
                  y={26}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="13"
                  fontFamily="monospace"
                  fontWeight="800"
                >
                  {node.value}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Legend ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '8px 16px',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {[
            { label: 'Full Overlap', color: '#4ade80' },
            { label: 'Partial Overlap', color: '#fbbf24' },
            { label: 'No Overlap', color: '#64748b' },
            { label: 'Updated', color: '#c084fc' },
            { label: 'Target Leaf', color: '#f87171' },
          ].map(({ label, color }) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem' }}
            >
              <div
                style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: color, border: `1px solid ${color}`,
                }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
