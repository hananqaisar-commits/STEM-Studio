import React, { useId } from 'react';
import { Maximize2 } from 'lucide-react';
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

/** Keep graph state semantics consistent: active is blue, completed is green. */
function nodeClass(state: string): string {
  switch (state) {
    case 'current': return 'graph-node-current';
    case 'visited': return 'graph-node-visited';
    case 'queued': return 'graph-node-queued';
    case 'shortest':
    case 'mst': return 'graph-node-path';
    default: return 'graph-node-unvisited';
  }
}

const NODE_RADIUS = 25;

export const GraphRenderer: React.FC<GraphRendererProps> = ({ step, nodes, edges, onToggleFullscreen }) => {
  const markerPrefix = useId().replace(/:/g, '');
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
        <svg
          className="graph-svg-canvas"
          viewBox="0 0 560 300"
          role="img"
          aria-label={`Graph with ${displayNodes.length} vertices and ${displayEdges.length} edges`}
        >
          {/* ─── EDGES (drawn first so nodes render on top) ──────────────── */}
          {displayEdges.map((edge) => {
            const fromNode = displayNodes.find((n) => n.id === edge.from);
            const toNode = displayNodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const isPathEdge = edge.state === 'mst';
            const isCurrentEdge = edge.id === step?.currentEdgeId || edge.state === 'traversing';
            const edgeState: ElementState = isPathEdge ? 'sorted' : isCurrentEdge ? 'current' : 'default';

            return edge.directed ? (
              <Arrow
                key={edge.id}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                state={edgeState}
                strokeWidth={2}
                markerId={`${markerPrefix}-graph-arrow-${edge.id}`}
                endpointInset={NODE_RADIUS + 2}
                label={edge.weight !== undefined ? String(edge.weight) : undefined}
              />
            ) : (
              <Line
                key={edge.id}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                state={edgeState}
                strokeWidth={2}
                endpointInset={NODE_RADIUS + 2}
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

          {/* ─── NODES with in-node distance/state labels ──────────────── */}
          {displayNodes.map((node) => {
            const className = nodeClass(node.state);
            const sublabel = node.distance !== undefined
              ? `d=${node.distance === Infinity ? '∞' : node.distance}`
              : node.inDegree !== undefined ? `degree ${node.inDegree}` : undefined;

            return (
              <g key={node.id} className={`graph-node ${className}`} aria-label={`Node ${node.label}${sublabel ? `, ${sublabel}` : ''}`}>
                <circle className="graph-node-halo" cx={node.x} cy={node.y} r={NODE_RADIUS + 4} />
                <circle className="graph-node-disc" cx={node.x} cy={node.y} r={NODE_RADIUS} />
                <text className={`graph-node-label${sublabel ? ' has-sublabel' : ''}`} x={node.x} y={node.y + (sublabel ? -3 : 5)} textAnchor="middle">
                  {node.label}
                </text>
                {sublabel && (
                  <text className="graph-node-sublabel" x={node.x} y={node.y + 12} textAnchor="middle">
                    {sublabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="graph-legend" aria-label="Graph visual legend">
          <span><i className="graph-legend-dot is-visited" />Visited</span>
          <span><i className="graph-legend-dot is-current" />Current</span>
          <span><i className="graph-legend-dot is-unvisited" />Unvisited</span>
          <span><i className="graph-legend-line is-path" />Selected path / tree</span>
          <span><i className="graph-legend-line is-edge" />Edge</span>
        </div>

        {/* ─── REAL-TIME GRAPH HUD ──────────────────────────────────────── */}
        <div className="graph-hud-row">
          <div className="graph-hud-badge">
            <span className="graph-hud-badge-title">QUEUE / STACK:</span>
            <span className="graph-hud-value is-current">
              [{step?.queueOrStack?.join(', ') || ' '}]
            </span>
          </div>

          <div className="graph-hud-badge">
            <span className="graph-hud-badge-title">VISITED:</span>
            <span className="graph-hud-value is-visited">
              {'{' + (step?.visitedNodeIds?.join(', ') || '') + '}'}
            </span>
          </div>

          {step?.mstWeight !== undefined && (
            <div className="graph-hud-badge is-path">
              <span className="graph-hud-badge-title">
                MST COST:
              </span>
              <span className="graph-hud-value is-path">
                {step.mstWeight}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
