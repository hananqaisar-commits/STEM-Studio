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

  const baseDisplayNodes = step ? step.nodes : nodes;
  const reversePhases = new Set(['Initialize Pointers', 'Save Next Pointer', 'Reverse Current Pointer', 'Advance Pointers', 'Reverse Completed']);
  const displayNodes = (() => {
    if (!step || step.listType !== 'singly' || !reversePhases.has(step.phase)) return baseDisplayNodes;

    const byId = new Map(baseDisplayNodes.map((node) => [node.id, node]));
    const orderedIds: string[] = [];
    const seen = new Set<string>();
    const walk = (start: string | null) => {
      let id = start;
      while (id && byId.has(id) && !seen.has(id)) {
        seen.add(id);
        orderedIds.push(id);
        id = byId.get(id)?.nextId ?? null;
      }
    };

    if (step.phase === 'Reverse Completed') {
      walk(step.headId);
    } else {
      const isLinkJustReversed = step.phase === 'Reverse Current Pointer';
      // Reversal temporarily creates two chains. Lay out the reversed prefix
      // and untouched suffix in their actual traversal order, with NULL at the
      // cut, so the partial state cannot look like a corrupted final list.
      walk(isLinkJustReversed ? step.pointers.curr ?? null : step.pointers.prev ?? null);
      walk(isLinkJustReversed ? step.pointers.next ?? null : step.pointers.curr ?? null);
    }
    baseDisplayNodes.forEach((node) => {
      if (!seen.has(node.id)) orderedIds.push(node.id);
    });
    return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
  })();
  const listType = step?.listType ?? selectedListType;
  const hasPrev = hasPreviousPointers(listType);
  const nodeLabels = new Map(nodes.map((node, index) => [node.id, `N${index + 1}`]));
  const nodeLabel = (node: ListNodeItem | undefined, fallbackIndex: number) =>
    node ? nodeLabels.get(node.id) ?? `N${fallbackIndex + 1}` : 'NULL';

  if (displayNodes.length === 0 && !step?.lanes?.length && !step?.stagingNode) {
    return (
      <div className="ll-canvas-body">
        <div className="ll-null-box" style={{ padding: '1rem 2rem', fontSize: '0.9rem' }}>
          EMPTY LIST (HEAD → NULL)
        </div>
      </div>
    );
  }

  if (step?.lanes?.length) {
    return (
      <div className="ll-canvas-body">
        <div className="ll-lane-stack">
          {step.lanes.map((lane) => (
            <section className="ll-lane" key={lane.label}>
              <div className="ll-lane-title">{lane.label}</div>
              <div className={`ll-lane-track ${lane.kind === 'map' ? 'll-map-track' : ''}`}>
                {lane.nodes.length === 0 ? (
                  <div className="ll-null-box">EMPTY</div>
                ) : (
                  <>
                    {lane.nodes.map((node, index) => {
                      const nextIndex = lane.nodes.findIndex((candidate) => candidate.id === node.nextId);
                      const prevIndex = lane.nodes.findIndex((candidate) => candidate.id === node.prevId);
                      return (
                        <React.Fragment key={node.id}>
                          <div className="ll-lane-node-wrap">
                            <span className="ll-node-label">{lane.kind === 'map' ? `ENTRY ${index + 1}` : nodeLabel(node, index)}</span>
                            {node.pointerLabels?.length ? (
                              <div className="ll-pointer-tags-top">
                                {node.pointerLabels.map((tag) => (
                                  <span key={tag} className={`ll-pointer-badge badge-${tag.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}>{tag}</span>
                                ))}
                              </div>
                            ) : null}
                            <div className={`ll-node-box ${node.status ? `status-${node.status}` : ''}`}>
                              <div className="ll-val-compartment">
                                <span className="ll-val-label">data:</span><span>{node.value}</span>
                              </div>
                              <div className="ll-ptr-compartment">
                                {lane.kind === 'map'
                                  ? <span className="ll-next-text"><span>maps to</span><span className="ll-next-target">{String(node.value).split(' → ')[1] ?? 'NULL'}</span></span>
                                  : <>
                                    {lane.kind === 'doublyList' && <><span className="ll-next-text"><span>prev</span><span className="ll-next-arrow">←</span><span className="ll-next-target">{prevIndex >= 0 ? `N${prevIndex + 1}` : 'NULL'}</span></span><span style={{ margin: '0 0.3rem', color: 'var(--color-text-muted)' }}>|</span></>}
                                    <span className="ll-next-text"><span>next</span><span className="ll-next-arrow">→</span><span className="ll-next-target">{nextIndex >= 0 ? `N${nextIndex + 1}` : 'NULL'}</span></span>
                                  </>}
                              </div>
                            </div>
                          </div>
                          {lane.kind !== 'map' && (index < lane.nodes.length - 1 ? <span className="ll-lane-arrow" aria-hidden="true">{lane.kind === 'doublyList' ? '⇄' : '→'}</span> : <span className="ll-lane-arrow ll-lane-null" aria-hidden="true">{lane.kind === 'doublyList' ? 'END' : '→ NULL'}</span>)}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  // Detect a cycle by following links from head. A backward pointer during
  // list reversal is not itself a cycle.
  const linkById = new Map(displayNodes.map((node) => [node.id, node]));
  const seenIds = new Set<string>();
  let traversalId = step?.headId ?? displayNodes[0]?.id ?? null;
  let previousTraversalId: string | null = null;
  let cycleTargetId: string | null = null;
  let cycleSourceId: string | null = null;
  while (traversalId) {
    if (seenIds.has(traversalId)) {
      cycleTargetId = traversalId;
      cycleSourceId = previousTraversalId;
      break;
    }
    seenIds.add(traversalId);
    previousTraversalId = traversalId;
    const nextTraversalId = linkById.get(traversalId)?.nextId ?? null;
    if (nextTraversalId === null) break;
    traversalId = nextTraversalId;
  }

  /**
   * Get the educational label for a node's next target.
   * Returns "N{index+1}" if the target is in the list, or "NULL" otherwise.
   */
  const getNextLabel = (node: ListNodeItem): string => {
    if (!node.nextId) return 'NULL';
    const targetIdx = displayNodes.findIndex((candidate) => candidate.id === node.nextId);
    return targetIdx >= 0 ? nodeLabel(linkById.get(node.nextId), targetIdx) : 'EXTERNAL';
  };

  const pointerUpdates = (() => {
    if (!step?.brokenConnections?.length && !step?.newConnections?.length) return [];
    const updates: { fromId: string; type: 'next' | 'prev'; oldTarget: string | null; newTarget: string | null }[] = (step.brokenConnections ?? []).map((broken) => {
      const replacement = step.newConnections?.find((connection) => connection.fromId === broken.fromId && connection.type === broken.type);
      const source = linkById.get(broken.fromId);
      const currentTarget = broken.type === 'next' ? source?.nextId ?? null : source?.prevId ?? null;
      return { fromId: broken.fromId, type: broken.type, oldTarget: broken.toId, newTarget: replacement?.toId ?? currentTarget };
    });
    (step.newConnections ?? []).forEach((connection) => {
      if (updates.some((update) => update.fromId === connection.fromId && update.type === connection.type)) return;
      updates.push({ fromId: connection.fromId, type: connection.type, oldTarget: null, newTarget: connection.toId });
    });
    return updates;
  })();

  return (
    <div className={`ll-canvas-body${step?.stagingNode ? ' ll-canvas-body--staged' : ''}`}>
      <div className="ll-render-track">
        {displayNodes.length === 0 && <div className="ll-null-box">EMPTY LIST · HEAD → NULL</div>}
        {displayNodes.map((node, index) => {
          const statusClass = node.status ? `status-${node.status}` : '';
          const nextLabel = getNextLabel(node);
          const nextTargetIndex = node.nextId ? displayNodes.findIndex((candidate) => candidate.id === node.nextId) : -1;
          const forwardAdjacent = nextTargetIndex === index + 1;
          const cycleSource = cycleSourceId === node.id;
          const cycleTargetIndex = cycleTargetId ? displayNodes.findIndex((candidate) => candidate.id === cycleTargetId) : -1;

          return (
            <div key={node.id} className="ll-node-wrapper">
              {/* Educational Node Label: N1, N2, N3... */}
              <span className="ll-node-label">{nodeLabel(node, index)}</span>

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
              <div className={`ll-node-box ${statusClass}${step?.promotedNodeId === node.id ? ' ll-promoted-node' : ''}`}>
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
                            ? nodeLabel(linkById.get(node.prevId), displayNodes.findIndex((candidate) => candidate.id === node.prevId))
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

              {/* Render only a connector that matches this node's actual nextId. */}
              {node.nextId === null ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="ll-connector" style={{ width: '28px' }} aria-hidden="true">
                    <svg width="28" height="24" viewBox="0 0 28 24"><line x1="2" y1="12" x2="22" y2="12" stroke="#818cf8" strokeWidth="2" /></svg>
                  </div>
                  <div className="ll-null-box">NULL</div>
                </div>
              ) : forwardAdjacent ? (
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
                <div className="ll-connector ll-connector-nonlocal" aria-label={`Link routes to ${nodeLabel(displayNodes[nextTargetIndex], nextTargetIndex)}`}>
                  {cycleSource ? `↻ ${nodeLabel(displayNodes[cycleTargetIndex], cycleTargetIndex)}` : nextTargetIndex >= 0 && nextTargetIndex <= index ? `↶ ${nodeLabel(displayNodes[nextTargetIndex], nextTargetIndex)}` : `↗ ${nodeLabel(displayNodes[nextTargetIndex], nextTargetIndex)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pointerUpdates.length > 0 && (
        <section className="ll-link-change-strip" aria-live="polite" aria-label="Pointer updates in this step">
          <span className="ll-link-change-title">POINTER UPDATE</span>
          {pointerUpdates.map((update, index) => {
            const sourceIndex = displayNodes.findIndex((node) => node.id === update.fromId);
            const oldIndex = update.oldTarget ? displayNodes.findIndex((node) => node.id === update.oldTarget) : -1;
            const newIndex = update.newTarget ? displayNodes.findIndex((node) => node.id === update.newTarget) : -1;
            return (
              <span className="ll-link-change-item" key={`${update.fromId}-${update.type}-${index}`}>
                <span>{nodeLabel(linkById.get(update.fromId), sourceIndex)}.{update.type}</span>
                <span className="ll-link-change-old">{update.oldTarget ? nodeLabel(linkById.get(update.oldTarget), oldIndex) : 'NULL'}</span>
                <span aria-hidden="true">→</span>
                <span className="ll-link-change-new">{update.newTarget ? nodeLabel(linkById.get(update.newTarget), newIndex) : 'NULL'}</span>
              </span>
            );
          })}
        </section>
      )}
      {step?.stagingNode && (() => {
        const stagedNode = step.stagingNode;
        const nextIndex = displayNodes.findIndex((node) => node.id === stagedNode.nextId);
        const pointsToSelf = stagedNode.nextId === stagedNode.id;
        const incoming = step.stagingConnections?.find((connection) => connection.toId === stagedNode.id && connection.fromId !== stagedNode.id);
        const incomingIndex = displayNodes.findIndex((node) => node.id === incoming?.fromId);
        return (
          <section className="ll-staging-area" aria-label="New node staging row">
            <div className="ll-staging-heading">
              <div>
                <span className="ll-staging-kicker">NEW NODE · STAGING ROW</span>
                <p>{step.phase === 'Allocate Memory' || step.phase === 'Allocate Node' || step.phase === 'Allocate Doubly Node' ? 'Allocated in memory; not part of the list yet.' : 'Connect the pointer links, then promote the node into the list.'}</p>
              </div>
              <span className="ll-staging-phase">{step.phase}</span>
            </div>
            <div className="ll-staging-track">
              {incoming && <span className="ll-staging-link-note">N{incomingIndex + 1}.next → NEW_NODE</span>}
              <div className="ll-node-wrapper ll-staging-node">
                <span className="ll-node-label">NEW_NODE</span>
                <div className="ll-pointer-tags-top">
                  <span className="ll-pointer-badge badge-new_node">NEW_NODE</span>
                </div>
                <div className="ll-node-box status-new">
                  <div className="ll-val-compartment"><span className="ll-val-label">data:</span><span>{stagedNode.value}</span></div>
                  <div className="ll-ptr-compartment">
                    <span className="ll-next-text"><span>next</span><span className="ll-next-arrow">→</span><span className="ll-next-target">{pointsToSelf ? 'NEW_NODE' : nextIndex >= 0 ? `N${nextIndex + 1}` : 'NULL'}</span></span>
                    {hasPrev && <><span style={{ margin: '0 0.3rem', color: 'var(--color-text-muted)' }}>|</span><span className="ll-next-text"><span>prev</span><span className="ll-next-arrow">←</span><span className="ll-next-target">{stagedNode.prevId ? `N${displayNodes.findIndex((node) => node.id === stagedNode.prevId) + 1}` : 'NULL'}</span></span></>}
                  </div>
                </div>
              </div>
              {pointsToSelf && <span className="ll-staging-link-note">NEW_NODE.next → NEW_NODE</span>}
              {!pointsToSelf && nextIndex >= 0 && <span className="ll-staging-link-note">NEW_NODE.next → N{nextIndex + 1}</span>}
              {!incoming && nextIndex < 0 && !pointsToSelf && <span className="ll-staging-unlinked">Pointers are not connected yet</span>}
            </div>
          </section>
        );
      })()}
    </div>
  );
};
