import React, { useEffect, useRef } from 'react';
import { hasPreviousPointers, type LinkedListStructureType, type ListNodeItem, type LinkedListStep } from './linkedListEngine';
import { MotionPresets } from '../../engine/motionEngine';
import './LinkedList.css';

interface LinkedListRendererProps {
  step: LinkedListStep | null;
  nodes: ListNodeItem[];
  listType?: LinkedListStructureType;
}

export const LinkedListRenderer: React.FC<LinkedListRendererProps> = ({ step, nodes, listType: selectedListType = 'singly' }) => {
  const activeNodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeNodeRef.current) {
      MotionPresets.nodeEntrance(activeNodeRef.current);
    }
  }, [step]);

  const displayNodes = step ? step.nodes : nodes;
  const listType = step?.listType ?? selectedListType;
  const hasPrev = hasPreviousPointers(listType);

  if (displayNodes.length === 0) {
    return (
      <div className="ll-canvas-body">
        <div className="ll-null-box" style={{ padding: '1rem 2rem', fontSize: '0.9rem' }}>
          EMPTY LIST (HEAD → NULL)
        </div>
      </div>
    );
  }

  // Check if there is a cycle loopback to render
  const cycleTargetNode = displayNodes.find((n) => {
    if (!n.nextId) return false;
    const targetIdx = displayNodes.findIndex((target) => target.id === n.nextId);
    const selfIdx = displayNodes.findIndex((self) => self.id === n.id);
    return targetIdx !== -1 && targetIdx <= selfIdx;
  });

  /**
   * Get the educational label for a node's next target.
   * Returns "N{index+1}" if the target is in the list, or "NULL" otherwise.
   */
  const getNextLabel = (node: ListNodeItem, index: number): string => {
    if (index === displayNodes.length - 1 && !cycleTargetNode) {
      return 'NULL';
    }
    if (node.nextId) {
      const targetIdx = displayNodes.findIndex((n) => n.id === node.nextId);
      if (targetIdx !== -1) {
        return `N${targetIdx + 1}`;
      }
    }
    // Default: next sequential node
    if (index < displayNodes.length - 1) {
      return `N${index + 2}`;
    }
    return 'NULL';
  };

  return (
    <div className="ll-canvas-body">
      <div className="ll-render-track">
        {displayNodes.map((node, index) => {
          const isTail = index === displayNodes.length - 1;
          const statusClass = node.status ? `status-${node.status}` : '';
          const nextLabel = getNextLabel(node, index);

          return (
            <div key={node.id} className="ll-node-wrapper">
              {/* Educational Node Label: N1, N2, N3... */}
              <span className="ll-node-label">N{index + 1}</span>

              {/* Pointer Badges (HEAD, TAIL, CURR, etc.) */}
              {node.pointerLabels && node.pointerLabels.length > 0 && (
                <div className="ll-pointer-tags-top">
                  {node.pointerLabels.map((tag) => (
                    <span
                      key={tag}
                      className={`ll-pointer-badge badge-${tag.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Node Box: two-row layout */}
              <div className={`ll-node-box ${statusClass}`}>
                {/* Top row: data value */}
                <div className="ll-val-compartment">
                  <span className="ll-val-label">data:</span>
                  <span>{node.value}</span>
                </div>

                {/* Bottom row: next pointer text */}
                <div className="ll-ptr-compartment">
                  {hasPrev && (
                    <>
                      <span className="ll-next-text">
                        <span>prev</span>
                        <span className="ll-next-arrow">→</span>
                        <span className="ll-next-target">
                          {node.prevId
                            ? `N${displayNodes.findIndex((candidate) => candidate.id === node.prevId) + 1}`
                            : 'NULL'}
                        </span>
                      </span>
                      <span style={{ margin: '0 0.3rem', color: 'var(--color-text-muted)' }}>|</span>
                    </>
                  )}
                  <span className="ll-next-text">
                    <span>next</span>
                    <span className="ll-next-arrow">→</span>
                    <span className="ll-next-target">{nextLabel}</span>
                  </span>
                </div>
              </div>

              {/* Connector Arrow */}
              {!isTail ? (
                <div className="ll-connector">
                  <svg width="48" height="24" viewBox="0 0 48 24">
                    <defs>
                      <marker
                        id={`arrowhead-${index}`}
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 6 3, 0 6" fill="#818cf8" />
                      </marker>
                      <marker
                        id={`arrowhead-prev-${index}`}
                        markerWidth="6"
                        markerHeight="6"
                        refX="1"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="6 0, 0 3, 6 6" fill="#f59e0b" />
                      </marker>
                    </defs>
                    {/* Next Forward Arrow */}
                    <line
                      x1="2"
                      y1={hasPrev ? 8 : 12}
                      x2="42"
                      y2={hasPrev ? 8 : 12}
                      stroke="#818cf8"
                      strokeWidth="2.5"
                      markerEnd={`url(#arrowhead-${index})`}
                    />
                    {/* Doubly Prev Backward Arrow */}
                    {hasPrev && (
                      <line
                        x1="42"
                        y1="16"
                        x2="6"
                        y2="16"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        markerEnd={`url(#arrowhead-prev-${index})`}
                      />
                    )}
                  </svg>
                </div>
              ) : (
                /* Tail to NULL or Cycle */
                <>
                  {!cycleTargetNode ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="ll-connector" style={{ width: '28px' }}>
                        <svg width="28" height="24" viewBox="0 0 28 24">
                          <line
                            x1="2"
                            y1="12"
                            x2="22"
                            y2="12"
                            stroke="#818cf8"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                      <div className="ll-null-box">NULL</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                      <div
                        className="ll-null-box"
                        style={{
                          borderColor: '#ec4899',
                          color: '#f472b6',
                          background: 'rgba(236, 72, 153, 0.1)',
                        }}
                      >
                        CYCLE ⟳
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
