import React from 'react';
import { Maximize2 } from 'lucide-react';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
import { Arrow } from '../../components/primitives/Arrow';
import type { GraphNode, GraphEdge, GraphStep } from './graphEngine';
import type { ElementState } from '../../engine/types/Step';
import './Graph.css';

interface GraphRendererProps {
  step: GraphStep | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onToggleFullscreen?: () => void;
}

/** Map graph-specific node states to the shared ElementState palette. */
function mapNodeState(state: string): ElementState {
  switch (state) {
    case 'current':  return 'comparing';
    case 'visited':  return 'pivot';
    case 'queued':   return 'selected';
    case 'shortest': return 'sorted';
    case 'mst':      return 'selected';
    default:         return 'default';
  }
}

/** Map graph-specific edge states to the shared ElementState palette. */
function mapEdgeState(state: string): ElementState {
  switch (state) {
    case 'traversing': return 'comparing';
    case 'relaxed':    return 'sorted';
    case 'mst':        return 'sorted';
    case 'backtrack':  return 'swapping';
    case 'visited':    return 'default';
    default:           return 'default';
  }
}

/** Glow-ring colour for active node states (graph-specific overlay). */
function glowColor(state: string): string {
  switch (state) {
    case 'current':  return '#f59e0b';
    case 'shortest': return '#10b981';
    case 'mst':      return '#ec4899';
    case 'visited':  return '#818cf8';
    case 'queued':   return '#38bdf8';
    default:         return 'transparent';
  }
}

const NODE_SIZE = 38;
const HALF = NODE_SIZE / 2;

export const GraphRenderer: React.FC<GraphRendererProps> = ({ step, nodes, edges, onToggleFullscreen }) => {
  const displayNodes = step ? step.nodes : nodes;
  const displayEdges = step ? step.edges : edges;

  return (
    <div className="graph-canvas-container animate-fade-in">
      {/* Canvas Header */}
      <div className="sorting-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">GRAPH CANVAS</span>
          <span className="bst-subtitle">{displayNodes.length} nodes &middot; {displayEdges.length} edges</span>
        </div>
        {onToggleFullscreen && (
          <button
            className="fullscreen-toggle-btn"
            onClick={onToggleFullscreen}
            title="Enter Full Screen Interactive Mode"
          >
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      {/* Canvas Body */}
      <div className="graph-canvas-body">
        <svg className="graph-svg-canvas" viewBox="0 0 560 300">
          {/* ─── EDGES (drawn first so nodes render on top) ──────────────── */}
          {displayEdges.map((edge) => {
            const fromNode = displayNodes.find((n) => n.id === edge.from);
            const toNode = displayNodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const mappedState = mapEdgeState(edge.state);

            return edge.directed ? (
              <Arrow
                key={edge.id}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                state={mappedState}
                strokeWidth={2}
                markerId={`graph-arrow-${edge.id}`}
                label={edge.weight !== undefined ? String(edge.weight) : undefined}
              />
            ) : (
              <Line
                key={edge.id}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                state={mappedState}
                strokeWidth={2}
              />
            );
          })}

          {/* Edge weight labels for undirected edges (directed use Arrow's label) */}
          {displayEdges.map((edge) => {
            if (edge.directed || edge.weight === undefined) return null;
            const fromNode = displayNodes.find((n) => n.id === edge.from);
            const toNode = displayNodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;

            return (
              <g key={`w-${edge.id}`} transform={`translate(${midX}, ${midY})`}>
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
            );
          })}

          {/* ─── NODES (shared CircleNode via foreignObject) ───────────── */}
          {displayNodes.map((node) => {
            const mapped = mapNodeState(node.state);
            const glow = glowColor(node.state);

            return (
              <g key={node.id}>
                {/* Outer Glow Ring (graph-specific overlay) */}
                {glow !== 'transparent' && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="22"
                    fill="none"
                    stroke={glow}
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}

                {/* Shared CircleNode primitive */}
                <foreignObject
                  x={node.x - HALF}
                  y={node.y - HALF}
                  width={NODE_SIZE}
                  height={NODE_SIZE}
                >
                  <CircleNode
                    value={node.label}
                    state={mapped}
                    size={NODE_SIZE}
                  />
                </foreignObject>

                {/* Distance Badge (graph-specific overlay) */}
                {node.distance !== undefined && node.distance !== Infinity && (
                  <g transform={`translate(${node.x}, ${node.y - 28})`}>
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

                {/* Degree Badge (graph-specific overlay) */}
                {node.inDegree !== undefined && (
                  <text
                    x={node.x}
                    y={node.y + 28}
                    textAnchor="middle"
                    fill="var(--color-text-secondary)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    deg: {node.inDegree}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* ─── REAL-TIME GRAPH HUD ──────────────────────────────────────── */}
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
    </div>
  );
};
