import React from 'react';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
import type { BSTStep } from './bstEngine';
import './BST.css';

interface BSTRendererProps {
  currentStep: BSTStep | null;
  onNodeClick?: (value: number) => void;
}

export const BSTRenderer: React.FC<BSTRendererProps> = ({
  currentStep,
  onNodeClick,
}) => {
  if (!currentStep || currentStep.nodes.length === 0) {
    return (
      <div className="bst-canvas-empty">
        <span>Binary Search Tree is empty. Type a number and click <strong>Insert</strong> to build your tree!</span>
      </div>
    );
  }

  const { nodes, edges } = currentStep;

  // Build node lookup map for edge coordinates
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="bst-canvas-container animate-fade-in">
      <div className="bst-canvas-header">
        <span className="bst-title">BINARY SEARCH TREE DIAGRAM</span>
        <span className="bst-subtitle">Rule: Left Subtree &lt; Node &lt; Right Subtree</span>
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

        {/* BST Nodes Layer */}
        <div className="bst-nodes-layer">
          {nodes.map((node) => {
            if (node.x === undefined || node.y === undefined) return null;

            return (
              <div
                key={node.id}
                className="bst-node-wrapper"
                style={{ left: `${node.x}%`, top: `${node.y}px` }}
                onClick={() => onNodeClick && onNodeClick(node.value)}
                title={`Click to search value ${node.value}`}
              >
                <CircleNode
                  value={node.value}
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
