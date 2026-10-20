import React, { useEffect, useRef } from 'react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface MergeTreeNode {
  id: string;
  weight: number;
  label?: string;
  /** Horizontal position as percentage (0-100) */
  x: number;
  /** Vertical position as percentage (0-100) */
  y: number;
  leftId?: string;
  rightId?: string;
  isActive?: boolean;
  isNewParent?: boolean;
}

export interface WeightedMergeTreeProps {
  nodes: MergeTreeNode[];
  title?: string;
  subtitle?: string;
}

export const WeightedMergeTree: React.FC<WeightedMergeTreeProps> = ({
  nodes,
  title = 'WEIGHTED MERGE TREE',
  subtitle = 'Huffman Coding Trace',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const newParents = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.mergetree-node.is-new-parent')
    );
    newParents.forEach((el) => MotionPresets.popIn(el));

    const activeNodes = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.mergetree-node.is-active')
    );
    activeNodes.forEach((el) => MotionPresets.flashState(el, '59,130,246'));
  }, [nodes]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="shared-canvas-container">
        <div className="shared-canvas-empty">No nodes available.</div>
      </div>
    );
  }

  // Build edges from parent → children
  const edges: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  nodes.forEach((node) => {
    if (node.leftId) {
      const child = nodes.find((n) => n.id === node.leftId);
      if (child) edges.push({ id: `e-${node.id}-${child.id}`, x1: node.x, y1: node.y, x2: child.x, y2: child.y });
    }
    if (node.rightId) {
      const child = nodes.find((n) => n.id === node.rightId);
      if (child) edges.push({ id: `e-${node.id}-${child.id}`, x1: node.x, y1: node.y, x2: child.x, y2: child.y });
    }
  });

  return (
    <div className="shared-canvas-container animate-fade-in" ref={containerRef}>
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          {subtitle && <span className="shared-canvas-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="weightedmergetree-workspace">
        {/* Edges */}
        <svg className="mergetree-edges-svg">
          {edges.map((edge) => (
            <line
              key={edge.id}
              x1={`${edge.x1}%`}
              y1={`${edge.y1}%`}
              x2={`${edge.x2}%`}
              y2={`${edge.y2}%`}
              className="mergetree-edge"
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          let nodeClass = 'mergetree-node';
          if (node.isActive) nodeClass += ' is-active';
          if (node.isNewParent) nodeClass += ' is-new-parent';

          return (
            <div
              key={node.id}
              className={nodeClass}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
              }}
            >
              <span className="mergetree-node-weight">{node.weight}</span>
              {node.label && <span className="mergetree-node-label">{node.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
