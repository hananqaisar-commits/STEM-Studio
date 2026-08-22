import React from 'react';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import './Sorting.css';

interface TreeRendererProps {
  currentStep: ArrayStep | null;
  algorithmKey: string;
  onElementClick?: (index: number, currentValue: number) => void;
}

interface TreeNodePos {
  index: number;
  value: number;
  x: number; // percentage (0 to 100)
  y: number; // pixels
  state: ElementState;
  label?: string;
  leftChildIdx?: number;
  rightChildIdx?: number;
}

export const TreeRenderer: React.FC<TreeRendererProps> = ({
  currentStep,
  algorithmKey,
  onElementClick,
}) => {
  if (!currentStep || !currentStep.array || currentStep.array.length === 0) {
    return (
      <div className="sorting-canvas-empty">
        <span>No tree data available</span>
      </div>
    );
  }

  const { array, comparingIndices = [], swappingIndices = [], sortedIndices = [], pivotIndex, variables = {} } = currentStep;
  const n = array.length;

  const getElementState = (index: number): ElementState => {
    if (swappingIndices.includes(index)) return 'swapping';
    if (comparingIndices.includes(index)) return 'comparing';
    if (pivotIndex === index) return 'pivot';
    if (sortedIndices.includes(index)) return 'sorted';
    return 'default';
  };

  const getPointerLabel = (index: number): string | undefined => {
    const labels: string[] = [];
    if (pivotIndex === index) labels.push('pivot');
    if (variables.i === index) labels.push('i');
    if (variables.j === index) labels.push('j');
    if (variables.minIdx === index) labels.push('minIdx');
    return labels.length > 0 ? labels.join(', ') : undefined;
  };

  // Calculate Binary Heap Tree positions (Depth levels 0..k)
  const calculateHeapTreeNodes = (): { nodes: TreeNodePos[]; edges: { x1: number; y1: number; x2: number; y2: number; state: ElementState }[] } => {
    const nodes: TreeNodePos[] = [];
    const edges: { x1: number; y1: number; x2: number; y2: number; state: ElementState }[] = [];

    const startY = 50;
    const levelHeight = 70;

    // Map each array index i to tree coordinates
    for (let i = 0; i < n; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, level) - 1);
      const totalInLevel = Math.pow(2, level);

      // Distribute evenly across X axis (10% to 90%)
      const stepX = 80 / (totalInLevel + 1);
      const x = 10 + stepX * (posInLevel + 1);
      const y = startY + level * levelHeight;

      const leftChildIdx = 2 * i + 1 < n ? 2 * i + 1 : undefined;
      const rightChildIdx = 2 * i + 2 < n ? 2 * i + 2 : undefined;

      nodes.push({
        index: i,
        value: array[i],
        x,
        y,
        state: getElementState(i),
        label: getPointerLabel(i),
        leftChildIdx,
        rightChildIdx,
      });
    }

    // Build Connecting Edges
    nodes.forEach((node) => {
      if (node.leftChildIdx !== undefined && nodes[node.leftChildIdx]) {
        const child = nodes[node.leftChildIdx];
        const isChildActive = node.state !== 'default' || child.state !== 'default';
        edges.push({
          x1: node.x,
          y1: node.y,
          x2: child.x,
          y2: child.y,
          state: isChildActive ? (node.state !== 'default' ? node.state : child.state) : 'default',
        });
      }
      if (node.rightChildIdx !== undefined && nodes[node.rightChildIdx]) {
        const child = nodes[node.rightChildIdx];
        const isChildActive = node.state !== 'default' || child.state !== 'default';
        edges.push({
          x1: node.x,
          y1: node.y,
          x2: child.x,
          y2: child.y,
          state: isChildActive ? (node.state !== 'default' ? node.state : child.state) : 'default',
        });
      }
    });

    return { nodes, edges };
  };

  const { nodes, edges } = calculateHeapTreeNodes();
  const maxY = Math.max(420, ...nodes.map((n) => n.y + 90));

  return (
    <div className="tree-canvas-container animate-fade-in">
      <div className="tree-canvas-header">
        <span className="tree-title">
          {algorithmKey === 'heap' ? 'BINARY HEAP TREE DIAGRAM' : 'RECURSIVE DIVIDE & CONQUER TREE'}
        </span>
        <span className="tree-subtitle">Array Index [i] → Left Child [2i+1] & Right Child [2i+2]</span>
      </div>

      <div className="tree-canvas-workspace">
        {/* SVG Edges Layer — Dynamic Height to prevent clipping */}
        <svg className="tree-svg-layer" width="100%" height={`${maxY}px`}>
          {edges.map((edge, idx) => (
            <Line
              key={idx}
              x1={`${edge.x1}%`}
              y1={edge.y1}
              x2={`${edge.x2}%`}
              y2={edge.y2}
              state={edge.state}
              strokeWidth={3}
            />
          ))}
        </svg>

        {/* Tree Nodes Layer — Dynamic Height */}
        <div className="tree-nodes-layer" style={{ height: `${maxY}px` }}>
          {nodes.map((node) => (
            <div
              key={node.index}
              className="tree-node-wrapper"
              style={{ left: `${node.x}%`, top: `${node.y}px` }}
              onClick={() => onElementClick && onElementClick(node.index, node.value)}
              title={`Click to edit element [${node.index}]`}
            >
              {node.label && <span className="tree-node-badge">{node.label}</span>}
              <CircleNode
                value={node.value}
                state={node.state}
                size={46}
              />
              <span className="tree-node-index">[{node.index}]</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
