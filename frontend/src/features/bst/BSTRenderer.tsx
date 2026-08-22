import React from 'react';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
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
}

export const BSTRenderer: React.FC<BSTRendererProps> = ({
  currentStep,
  onNodeClick,
}) => {
  if (!currentStep || currentStep.nodes.length === 0) {
    return (
      <div className="bst-canvas-empty">
        <span>Tree is empty. Enter a value or word and click <strong>Insert</strong> to build your tree!</span>
      </div>
    );
  }

  const nodes = currentStep.nodes as ExtendedBSTNodeData[];
  const edges = currentStep.edges;

  // Build node lookup map for edge coordinates
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="bst-canvas-container animate-fade-in">
      <div className="bst-canvas-header">
        <span className="bst-title">DYNAMIC TREE STRUCTURE CANVAS</span>
        <span className="bst-subtitle">Interactive DSA Memory Inspector</span>
      </div>

      <div className="bst-canvas-workspace">
        {/* SVG Edges Layer */}
        <svg className="bst-svg-layer" width="100%" height="100%">
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
                strokeWidth={3}
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
                    BF: {node.balanceFactor} | H: {node.height}
                  </span>
                )}

                {/* Trie End of Word Badge */}
                {node.isEndOfWord && (
                  <span className="eow-badge">END WORD</span>
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
