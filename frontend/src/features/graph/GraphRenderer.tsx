import React from 'react';
import type { GraphNode, GraphEdge, GraphStep } from './graphEngine';
import './Graph.css';

interface GraphRendererProps {
  step: GraphStep | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const GraphRenderer: React.FC<GraphRendererProps> = ({ step, nodes, edges }) => {
  const displayNodes = step ? step.nodes : nodes;
  const displayEdges = step ? step.edges : edges;

  return (
    <div className="graph-canvas-body">
      <svg className="graph-svg-canvas" viewBox="0 0 560 300">
        <defs>
          <marker
            id="arrowhead-directed"
            markerWidth="8"
            markerHeight="8"
            refX="22"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 8 4, 0 8" fill="#818cf8" />
          </marker>
        </defs>

        {/* ─── EDGES ────────────────────────────────────────────────────────── */}
        {displayEdges.map((edge) => {
          const fromNode = displayNodes.find((n) => n.id === edge.from);
          const toNode = displayNodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;

          const edgeClass = edge.state ? `edge-${edge.state}` : '';

          return (
            <g key={edge.id}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#475569"
                strokeWidth="2"
                className={`graph-edge-line ${edgeClass}`}
                markerEnd={edge.directed ? 'url(#arrowhead-directed)' : undefined}
              />
              {edge.weight !== undefined && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-10"
                    y="-9"
                    width="20"
                    height="16"
                    rx="4"
                    fill="var(--color-surface)"
                    stroke="var(--color-border)"
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--color-text-secondary)"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {edge.weight}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ─── NODES ────────────────────────────────────────────────────────── */}
        {displayNodes.map((node) => {
          const stateClass = `state-${node.state}`;

          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              {/* Outer Glow Ring */}
              <circle
                r="22"
                fill="none"
                stroke={
                  node.state === 'current'
                    ? '#f59e0b'
                    : node.state === 'shortest'
                    ? '#10b981'
                    : node.state === 'mst'
                    ? '#ec4899'
                    : node.state === 'visited'
                    ? '#818cf8'
                    : 'transparent'
                }
                strokeWidth="2"
                opacity="0.8"
              />

              {/* Node Body */}
              <circle
                r="18"
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="2"
                className={`graph-node-circle ${stateClass}`}
              />

              {/* Vertex Label */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-text)"
                fontSize="12"
                fontWeight="700"
                fontFamily="monospace"
              >
                {node.label}
              </text>

              {/* Distance / Degree Badge */}
              {node.distance !== undefined && node.distance !== Infinity && (
                <g transform="translate(0, -28)">
                  <rect
                    x="-14"
                    y="-7"
                    width="28"
                    height="14"
                    rx="4"
                    fill="#10b981"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0f172a"
                    fontSize="9"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    d={node.distance}
                  </text>
                </g>
              )}

              {node.inDegree !== undefined && (
                <g transform="translate(0, 26)">
                  <text
                    textAnchor="middle"
                    fill="var(--color-text-secondary)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    deg: {node.inDegree}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* ─── REAL-TIME GRAPH HUD ──────────────────────────────────────────── */}
      <div className="graph-hud-row">
        <div className="graph-hud-badge">
          <span className="graph-hud-badge-title">QUEUE / STACK:</span>
          <span style={{ color: '#38bdf8' }}>
            [{step?.queueOrStack?.join(', ') || ' '}]
          </span>
        </div>

        <div className="graph-hud-badge">
          <span className="graph-hud-badge-title">VISITED:</span>
          <span style={{ color: '#818cf8' }}>
            {'{' + (step?.visitedNodeIds?.join(', ') || '') + '}'}
          </span>
        </div>

        {step?.mstWeight !== undefined && (
          <div className="graph-hud-badge" style={{ borderColor: '#ec4899' }}>
            <span className="graph-hud-badge-title" style={{ color: '#ec4899' }}>
              MST COST:
            </span>
            <span style={{ color: '#f472b6', fontWeight: 'bold' }}>
              {step.mstWeight}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
