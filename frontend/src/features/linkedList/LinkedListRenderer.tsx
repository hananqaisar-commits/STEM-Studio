import React from 'react';
import type { ListNodeItem, LinkedListStep } from './linkedListEngine';
import './LinkedList.css';

interface LinkedListRendererProps {
  step: LinkedListStep | null;
  nodes: ListNodeItem[];
}

export const LinkedListRenderer: React.FC<LinkedListRendererProps> = ({ step, nodes }) => {
  const displayNodes = step ? step.nodes : nodes;
  const listType = step ? step.listType : 'singly';

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

  return (
    <div className="ll-canvas-body">
      <div className="ll-render-track">
        {displayNodes.map((node, index) => {
          const isTail = index === displayNodes.length - 1;
          const statusClass = node.status ? `status-${node.status}` : '';

          return (
            <div key={node.id} className="ll-node-wrapper">
              {/* Pointer Badges */}
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

              {/* Node Box */}
              <div className={`ll-node-box ${statusClass}`}>
                {listType === 'doubly' && (
                  <div className="ll-ptr-compartment" title="prev pointer">
                    <div className="ll-ptr-dot" style={{ background: '#f59e0b' }} />
                  </div>
                )}
                <div className="ll-val-compartment">{node.value}</div>
                <div className="ll-ptr-compartment" title="next pointer">
                  <div className="ll-ptr-dot" />
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
                      y1={listType === 'doubly' ? 8 : 12}
                      x2="42"
                      y2={listType === 'doubly' ? 8 : 12}
                      stroke="#818cf8"
                      strokeWidth="2.5"
                      markerEnd={`url(#arrowhead-${index})`}
                    />
                    {/* Doubly Prev Backward Arrow */}
                    {listType === 'doubly' && (
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
