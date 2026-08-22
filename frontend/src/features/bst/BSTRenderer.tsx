import React from 'react';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
import { Maximize2 } from 'lucide-react';
import type { BSTStep, BSTNodeData } from './bstEngine';
import './BST.css';

interface ExtendedBSTNodeData extends BSTNodeData {
  height?: number;
  balanceFactor?: number;
  label?: string;
  isEndOfWord?: boolean;
}

interface BSTRendererProps {
  currentStep: BSTStep | null;
  onNodeClick?: (value: number | string) => void;
  onToggleFullscreen?: () => void;
}

export const BSTRenderer: React.FC<BSTRendererProps> = ({
  currentStep,
  onNodeClick,
  onToggleFullscreen,
}) => {
  if (!currentStep || currentStep.nodes.length === 0) {
    return (
      <div className="bst-canvas-empty">
        <div className="empty-canvas-content">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.4, marginBottom: '0.75rem' }}>
            <circle cx="24" cy="12" r="7" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="12" cy="32" r="6" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="36" cy="32" r="6" stroke="#64748b" strokeWidth="2" fill="none" />
            <line x1="20" y1="17" x2="14" y2="27" stroke="#64748b" strokeWidth="1.5" />
            <line x1="28" y1="17" x2="34" y2="27" stroke="#64748b" strokeWidth="1.5" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>Tree is empty</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '0.25rem' }}>
            Enter a value and click <strong>Insert</strong> to build your tree
          </span>
        </div>
      </div>
    );
  }

  const nodes = currentStep.nodes as ExtendedBSTNodeData[];
  const edges = currentStep.edges;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="bst-canvas-container animate-fade-in">
      <div className="bst-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">STRUCTURE CANVAS</span>
          <span className="bst-subtitle">{nodes.length} nodes · {edges.length} edges</span>
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

      <div className="bst-canvas-workspace">
        {/* Subtle grid pattern background */}
        <svg className="canvas-grid-pattern" width="100%" height="100%">
          <defs>
            <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="rgba(148, 163, 184, 0.15)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotGrid)" />
        </svg>

        {/* SVG Edges Layer */}
        <svg className="bst-svg-layer" width="100%" height="100%">
          <defs>
            <filter id="edgeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="0" dy="1" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.15" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edges.map((edge, idx) => {
            const parent = nodeMap.get(edge.fromId);
            const child = nodeMap.get(edge.toId);

            if (!parent || !child || parent.x === undefined || parent.y === undefined || child.x === undefined || child.y === undefined) {
              return null;
            }

            return (
              <Line
                key={idx}
                x1={`${parent.x}%`}
                y1={parent.y}
                x2={`${child.x}%`}
                y2={child.y}
                state={edge.state}
                strokeWidth={2.5}
              />
            );
          })}
        </svg>

        {/* Nodes Layer */}
        <div className="bst-nodes-layer">
          {nodes.map((node) => {
            if (node.x === undefined || node.y === undefined) return null;

            const displayVal = node.label !== undefined ? node.label : node.value;

            return (
              <div
                key={node.id}
                className="bst-node-wrapper"
                style={{ left: `${node.x}%`, top: `${node.y}px` }}
                onClick={() => onNodeClick && onNodeClick(displayVal)}
              >
                {/* AVL Balance Factor Badge */}
                {node.balanceFactor !== undefined && (
                  <span className={`bf-badge ${Math.abs(node.balanceFactor) > 1 ? 'bf-unbalanced' : 'bf-balanced'}`}>
                    BF {node.balanceFactor} · H {node.height}
                  </span>
                )}

                {/* Trie End of Word Badge */}
                {node.isEndOfWord && (
                  <span className="eow-badge">END</span>
                )}

                <CircleNode
                  value={displayVal}
                  state={node.state}
                  size={46}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
