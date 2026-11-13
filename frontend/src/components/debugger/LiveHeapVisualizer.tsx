import { useId, useMemo, useRef, useState } from 'react';
import { Activity, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { RuntimeObject, RuntimeTraceEvent, RuntimeValue } from '../../api/liveCode';

const CARD_WIDTH = 224;
const CARD_HEIGHT = 154;
const COLUMN_GAP = 32;
const ROW_GAP = 48;
const CATEGORY_LABELS: Record<string, string> = {
  complexity: 'Complexity', sorting: 'Sorting', arrays: 'Arrays', strings: 'Strings',
  linkedList: 'Linked list', stackQueue: 'Stack and queue', binarySearch: 'Binary search',
  hashMaps: 'Hash maps', bst: 'Trees', graph: 'Graphs', recursion: 'Recursion',
  backtracking: 'Backtracking', greedy: 'Greedy', dp: 'Dynamic programming', trie: 'Trie',
};

function referenceTarget(value: RuntimeValue | undefined): string | null {
  return value?.kind === 'ref' ? value.object_id : null;
}

function displayValue(value: RuntimeValue, targetLabel?: string): string {
  if (targetLabel) return `→ ${targetLabel}`;
  if (value.kind === 'ref') return `→ @${value.object_id.replace(/^(py|cpp)-/, '').slice(-7)}`;
  if (value.kind === 'opaque') return value.preview ?? `<${value.type}>`;
  if (typeof value.value === 'string') return JSON.stringify(value.value);
  if (value.value === null) return 'None';
  if (typeof value.value === 'object') return JSON.stringify(value.value);
  return String(value.value);
}

function numericIndex(entry: { key: string }): number | null {
  return /^\d+$/.test(entry.key) ? Number(entry.key) : null;
}

function isSequenceObject(object: RuntimeObject): boolean {
  const type = object.type.toLowerCase();
  return /array|list|tuple|vector|deque|set|frozenset/.test(type)
    || (object.entries.length > 0 && object.entries.every((entry) => numericIndex(entry) !== null));
}

function isMappingObject(object: RuntimeObject): boolean {
  return /(^|\W)(dict|map|unordered_map|hashmap|hashtable)(\W|$)/i.test(object.type)
    || object.type.toLowerCase() === 'dict';
}

function sortedSequenceEntries(object: RuntimeObject) {
  return [...object.entries].sort((a, b) => (numericIndex(a) ?? 0) - (numericIndex(b) ?? 0));
}

function numericScopeValues(scope: Record<string, RuntimeValue> | undefined) {
  return Object.entries(scope ?? {}).flatMap(([name, value]) => {
    if (value.kind !== 'scalar' || typeof value.value !== 'number' || !Number.isFinite(value.value)) return [];
    if (!/^(i|j|k|idx|index|left|right|low|high|mid|start|end|pivot|front|rear|top|row|col|column|current)$/i.test(name)) return [];
    return [{ name, value: value.value }];
  });
}

function isHighlighted(index: number, markers: Array<{ name: string; value: number }>) {
  return markers.some((marker) => marker.value === index);
}

function CollectionCard({
  object,
  rootName,
  heap,
  markers,
  layout,
  isStack,
  isQueue,
}: {
  object: RuntimeObject;
  rootName: string;
  heap: Record<string, RuntimeObject>;
  markers: Array<{ name: string; value: number }>;
  layout: 'sequence' | 'matrix' | 'mapping';
  isStack: boolean;
  isQueue: boolean;
}) {
  const entries = sortedSequenceEntries(object);
  const stackEntries = isStack ? [...entries].reverse() : entries;
  const sequenceColumns = Math.min(12, Math.max(1, entries.length));
  const matrixRows = layout === 'matrix'
    ? entries.flatMap((entry, index) => {
      const rowId = referenceTarget(entry.value);
      const rowObject = rowId ? heap[rowId] : undefined;
      return rowObject && isSequenceObject(rowObject)
        ? [{ row: index, object: rowObject }]
        : [];
    })
    : [];

  return (
    <article className={`live-collection-card live-collection-${layout}`}>
      <header className="live-collection-header">
        <span>{rootName}</span>
        <strong>{layout === 'mapping' ? 'key → value' : layout === 'matrix' ? '2D array / table' : object.type}</strong>
        <small>{layout === 'mapping' ? object.entries.length : entries.length} item{(layout === 'mapping' ? object.entries.length : entries.length) === 1 ? '' : 's'}</small>
      </header>

      {layout === 'mapping' ? (
        <div className="live-map-table" role="table" aria-label={`${rootName} key value entries`}>
          <div className="live-map-row live-map-heading" role="row"><span role="columnheader">Key</span><span role="columnheader">Value</span></div>
          {object.entries.map((entry, index) => (
            <div className="live-map-row" role="row" key={`${object.object_id}:${entry.key}:${index}`}>
              <code role="cell" title={entry.key}>{entry.key}</code>
              <span role="cell" className={entry.value.kind === 'ref' ? 'is-reference' : ''} title={displayValue(entry.value)}>{displayValue(entry.value)}</span>
            </div>
          ))}
          {object.entries.length === 0 && <p className="live-collection-empty">No key/value entries yet</p>}
        </div>
      ) : layout === 'matrix' ? (
        <div className="live-matrix-content">
          {matrixRows.map(({ row, object: rowObject }) => (
            <div className="live-matrix-row" key={`${object.object_id}:${row}`}>
              <span className="live-matrix-row-label">{row}</span>
              <div className="live-sequence-cells" style={{ gridTemplateColumns: `repeat(${Math.max(1, rowObject.entries.length)}, minmax(56px, 1fr))` }}>
                {sortedSequenceEntries(rowObject).map((entry, column) => {
                  const targetId = referenceTarget(entry.value);
                  const value = displayValue(entry.value, targetId ? heap[targetId]?.type : undefined);
                  const selected = markers.some((marker) => (/^(row|i)$/i.test(marker.name) && marker.value === row)
                    || (/^(col|column|j)$/i.test(marker.name) && marker.value === column));
                  return (
                    <div className={`live-sequence-cell${selected ? ' is-active' : ''}`} key={`${rowObject.object_id}:${entry.key}`}>
                      <small>{column}</small><code title={value}>{value}</code>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {matrixRows.length === 0 && <p className="live-collection-empty">Rows will appear as the program fills the matrix.</p>}
        </div>
      ) : (
        <>
          {markers.length > 0 && <div className="live-visualizer-markers">{markers.slice(0, 8).map((marker) => <span key={marker.name}><code>{marker.name}</code>={marker.value}</span>)}</div>}
          <div className={`live-sequence-cells${isStack ? ' is-stack' : isQueue ? ' is-queue' : ''}`} style={{ gridTemplateColumns: isStack ? 'minmax(110px, 1fr)' : `repeat(${sequenceColumns}, minmax(62px, 1fr))` }}>
            {stackEntries.map((entry, visualIndex) => {
              const index = numericIndex(entry) ?? visualIndex;
              const targetId = referenceTarget(entry.value);
              const target = targetId ? heap[targetId] : undefined;
              const value = displayValue(entry.value, target?.type);
              const active = isHighlighted(index, markers);
              const boundary = isStack && visualIndex === 0 ? 'TOP' : isQueue && visualIndex === 0 ? 'FRONT' : isQueue && visualIndex === stackEntries.length - 1 ? 'BACK' : '';
              return (
                <div className={`live-sequence-cell${active ? ' is-active' : ''}${boundary ? ' is-boundary' : ''}`} key={`${object.object_id}:${entry.key}`}>
                  <small>{boundary || `[${entry.key}]`}</small><code title={value}>{value}</code>
                </div>
              );
            })}
            {entries.length === 0 && <p className="live-collection-empty">Empty structure — elements will appear here when added.</p>}
          </div>
          {object.truncated && <div className="live-collection-note">Showing the captured portion of this structure.</div>}
        </>
      )}
    </article>
  );
}

function StringCard({ name, value }: { name: string; value: string }) {
  const characters = Array.from(value);
  return (
    <article className="live-collection-card live-string-card">
      <header className="live-collection-header"><span>{name}</span><strong>Characters</strong><small>{characters.length} char{characters.length === 1 ? '' : 's'}</small></header>
      <div className="live-sequence-cells" style={{ gridTemplateColumns: `repeat(${Math.min(16, Math.max(1, characters.length))}, minmax(48px, 1fr))` }}>
        {characters.map((character, index) => <div className="live-sequence-cell" key={`${index}:${character}`}><small>[{index}]</small><code>{character === ' ' ? '␠' : character}</code></div>)}
        {characters.length === 0 && <p className="live-collection-empty">Empty string</p>}
      </div>
    </article>
  );
}

export function LiveHeapVisualizer({ event, categoryId, topicId }: {
  event: RuntimeTraceEvent | null;
  categoryId?: string;
  topicId?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const markerId = useId().replace(/:/g, '');
  const heap = event?.heap ?? {};
  const frame = event?.frames?.[event.frames.length - 1];
  const categoryLabel = categoryId ? CATEGORY_LABELS[categoryId] ?? categoryId : 'Program';
  const topicLabel = topicId?.replace(/([a-z])([A-Z])/g, '$1 $2');

  const model = useMemo(() => {
    const ids = Object.keys(heap);
    const idSet = new Set(ids);
    const roots = Object.entries(frame?.scope ?? {})
      .map(([name, value]) => ({ name, id: referenceTarget(value) }))
      .filter((root): root is { name: string; id: string } => Boolean(root.id && idSet.has(root.id)))
      .sort((a, b) => Number(/^(head|root|first|front|stack|queue)$/i.test(b.name)) - Number(/^(head|root|first|front|stack|queue)$/i.test(a.name)));
    const rootNameById = new Map(roots.map((root) => [root.id, root.name]));
    const sequences = ids.map((id) => heap[id]).filter(isSequenceObject);
    const mappings = ids.map((id) => heap[id]).filter(isMappingObject);
    const nestedRows = new Set<string>();
    const matrices = sequences.filter((object) => object.entries.length > 0 && object.entries.every((entry) => {
      const target = referenceTarget(entry.value);
      return Boolean(target && heap[target] && isSequenceObject(heap[target]));
    }));
    matrices.forEach((matrix) => matrix.entries.forEach((entry) => {
      const target = referenceTarget(entry.value);
      if (target) nestedRows.add(target);
    }));
    const represented = new Set<string>([
      ...mappings.map((object) => object.object_id),
      ...sequences.map((object) => object.object_id),
      ...matrices.map((object) => object.object_id),
      ...nestedRows,
      ...sequences.filter((object) => object.entries.length === 0).map((object) => object.object_id),
    ]);
    const flatSequences = sequences.filter((object) => !nestedRows.has(object.object_id) && !matrices.some((matrix) => matrix.object_id === object.object_id));
    const hasQueueName = /queue|deque|fifo/i.test(`${topicId ?? ''} ${roots.map((root) => root.name).join(' ')}`);
    const hasStackName = /stack|lifo/i.test(`${topicId ?? ''} ${roots.map((root) => root.name).join(' ')}`);
    const isQueue = categoryId === 'stackQueue' && hasQueueName;
    const isStack = categoryId === 'stackQueue' && hasStackName && !isQueue;
    const stringValues = categoryId === 'strings'
      ? Object.entries(frame?.scope ?? {}).flatMap(([name, value]) => value.kind === 'scalar' && typeof value.value === 'string' ? [{ name, value: value.value }] : [])
      : [];
    const markers = numericScopeValues(frame?.scope);
    const remainingIds = ids.filter((id) => !represented.has(id));
    const remainingSet = new Set(remainingIds);
    const ordered: string[] = [];
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visited.has(id) || !heap[id] || !remainingSet.has(id)) return;
      visited.add(id);
      ordered.push(id);
      const refs = heap[id].entries
        .map((entry, index) => ({ id: referenceTarget(entry.value), name: entry.key.toLowerCase(), index }))
        .filter((entry): entry is { id: string; name: string; index: number } => Boolean(entry.id && remainingSet.has(entry.id)))
        .sort((a, b) => {
          const rank = (name: string) => /^(next|nextnode|next_node)$/.test(name) ? 0
            : /^(left|right|child|children|head|front)$/.test(name) ? 1
              : /^(prev|previous|previousnode|previous_node)$/.test(name) ? 3 : 2;
          return rank(a.name) - rank(b.name) || a.index - b.index;
        });
      refs.forEach((entry) => visit(entry.id));
    };
    roots.forEach((root) => visit(root.id));
    remainingIds.forEach(visit);
    const columns = Math.min(3, Math.max(1, ordered.length));
    const rows = Math.max(1, Math.ceil(ordered.length / columns));
    const positions = new Map(ordered.map((id, index) => [id, {
      x: 30 + (index % columns) * (CARD_WIDTH + COLUMN_GAP),
      y: 94 + Math.floor(index / columns) * (CARD_HEIGHT + ROW_GAP),
      label: `N${index + 1}`,
    }]));
    const edges = ordered.flatMap((id) => heap[id].entries.flatMap((entry) => {
      const target = referenceTarget(entry.value);
      return target && positions.has(target) ? [{ from: id, to: target, label: entry.key }] : [];
    }));
    const callFrames = event?.frames ?? [];
    const scalarValues = Object.entries(frame?.scope ?? {}).filter(([, value]) => value.kind !== 'ref');
    const hasVisualData = mappings.length > 0 || matrices.length > 0 || flatSequences.length > 0 || stringValues.length > 0 || ordered.length > 0 || scalarValues.length > 0 || callFrames.length > 1;
    const width = Math.max(740, 60 + columns * CARD_WIDTH + (columns - 1) * COLUMN_GAP);
    const graphHeight = Math.max(420, 94 + rows * CARD_HEIGHT + (rows - 1) * ROW_GAP + 45);
    const collectionsHeight = mappings.reduce((sum, object) => sum + 48 + Math.max(1, object.entries.length) * 30, 0)
      + matrices.reduce((sum, object) => sum + 54 + Math.max(1, object.entries.length) * 66, 0)
      + flatSequences.reduce((sum, object) => sum + 88 + (isStack ? Math.max(1, object.entries.length) : Math.ceil(Math.max(1, object.entries.length) / 12)) * 64, 0)
      + stringValues.reduce((sum, item) => sum + 88 + Math.ceil(Math.max(1, Array.from(item.value).length) / 16) * 64, 0);
    const height = Math.max(420, 34 + (scalarValues.length ? 88 : 0) + (categoryId === 'recursion' || categoryId === 'backtracking' ? callFrames.length > 1 ? 112 : 0 : 0) + collectionsHeight + (ordered.length ? graphHeight : 0));
    return { roots, rootNameById, mappings, matrices, flatSequences, nestedRows, stringValues, markers, isQueue, isStack, ordered, positions, edges, width, height, graphHeight, callFrames, scalarValues, hasVisualData };
  }, [heap, frame, event?.frames, categoryId, topicId]);

  const resetView = () => {
    setZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  const structuredCount = model.mappings.length + model.matrices.length + model.flatSequences.length + model.stringValues.length;
  const visualizationLabel = structuredCount > 0
    ? model.mappings.length > 0 ? 'key/value table' : model.matrices.length > 0 ? 'matrix grid' : categoryId === 'strings' ? 'character cells' : categoryId === 'stackQueue' ? 'ordered structure' : 'indexed cells'
    : model.ordered.length > 0 ? 'reference graph' : model.callFrames.length > 1 ? 'call stack' : 'runtime variables';

  return (
    <section className="live-visualizer-section" aria-label={`${categoryLabel} runtime visualization`}>
      <div className="live-visualizer-toolbar">
        <div className="live-visualizer-title"><strong>Visualizer</strong><span>{categoryLabel}{topicLabel ? ` · ${topicLabel}` : ''} · {visualizationLabel}</span></div>
        <div className="live-visualizer-zoom" aria-label="Visualizer zoom controls">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.65, Math.round((value - 0.1) * 10) / 10))} disabled={zoom <= 0.65}><ZoomOut size={14} /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, Math.round((value + 0.1) * 10) / 10))} disabled={zoom >= 1.5}><ZoomIn size={14} /></button>
          <button type="button" aria-label="Reset visualizer view" onClick={resetView}><Maximize2 size={13} /></button>
        </div>
      </div>
      <div className="live-visualizer-viewport" ref={viewportRef} tabIndex={0} aria-label="Scrollable live data structure canvas">
        {!model.hasVisualData ? (
          <div className="live-visualizer-empty">
            <div className="live-visualizer-empty-icon"><Activity size={22} /></div>
            <strong>{event ? 'No expandable values in this step' : 'Run code to build the visualization'}</strong>
            <span>{event ? 'Create or update arrays, strings, maps, nodes, or local variables to see them represented here.' : 'The visualizer updates from the current runtime snapshot as your program executes.'}</span>
          </div>
        ) : (
          <div className="live-visualizer-canvas-wrap" style={{ width: model.width * zoom, height: model.height * zoom }}>
            <div className="live-visualizer-canvas live-visualizer-content" style={{ width: model.width, height: model.height, transform: `scale(${zoom})` }}>
              {(categoryId === 'recursion' || categoryId === 'backtracking') && model.callFrames.length > 1 && (
                <section className="live-call-stack-visual" aria-label="Current recursive call stack">
                  <strong>Call stack · {model.callFrames.length} active frame{model.callFrames.length === 1 ? '' : 's'}</strong>
                  <div>{model.callFrames.slice(-10).map((callFrame, index) => <span className={index === Math.min(model.callFrames.length, 10) - 1 ? 'is-current' : ''} key={`${callFrame.function}:${callFrame.line}:${index}`}><small>{index + 1}</small><code>{callFrame.function}</code><em>line {callFrame.line}</em></span>)}</div>
                </section>
              )}

              {model.scalarValues.length > 0 && (
                <section className="live-scope-visual" aria-label="Current local variable values">
                  <strong>Current variables</strong>
                  <div>{model.scalarValues.slice(0, 14).map(([name, value]) => <span key={name}><code>{name}</code><b>{displayValue(value)}</b></span>)}</div>
                </section>
              )}

              {model.stringValues.map(({ name, value }) => <StringCard key={`string:${name}`} name={name} value={value} />)}
              {model.mappings.map((object) => <CollectionCard key={object.object_id} object={object} rootName={model.rootNameById.get(object.object_id) ?? 'map'} heap={heap} markers={model.markers} layout="mapping" isStack={false} isQueue={false} />)}
              {model.matrices.map((object) => <CollectionCard key={object.object_id} object={object} rootName={model.rootNameById.get(object.object_id) ?? 'matrix'} heap={heap} markers={model.markers} layout="matrix" isStack={false} isQueue={false} />)}
              {model.flatSequences.map((object) => <CollectionCard key={object.object_id} object={object} rootName={model.rootNameById.get(object.object_id) ?? object.type} heap={heap} markers={model.markers} layout="sequence" isStack={model.isStack} isQueue={model.isQueue} />)}

              {model.ordered.length > 0 && (
                <div className="live-graph-canvas" style={{ width: model.width, height: model.graphHeight }}>
                  {model.roots.some((root) => model.positions.has(root.id)) && <div className="live-visualizer-roots">{model.roots.filter((root) => model.positions.has(root.id)).map((root) => <span key={`${root.name}:${root.id}`}><code>{root.name}</code><b>→</b>{model.positions.get(root.id)?.label}</span>)}</div>}
                  <svg className="live-visualizer-edges" width={model.width} height={model.height} aria-hidden="true">
                    <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="currentColor" /></marker></defs>
                    {model.edges.map((edge, index) => {
                      const from = model.positions.get(edge.from);
                      const to = model.positions.get(edge.to);
                      if (!from || !to) return null;
                      const horizontal = from.x !== to.x;
                      const x1 = horizontal ? from.x + (to.x > from.x ? CARD_WIDTH : 0) : from.x + CARD_WIDTH / 2;
                      const y1 = horizontal ? from.y + CARD_HEIGHT / 2 : from.y + (to.y > from.y ? CARD_HEIGHT : 0);
                      const x2 = horizontal ? to.x + (to.x > from.x ? 0 : CARD_WIDTH) : to.x + CARD_WIDTH / 2;
                      const y2 = horizontal ? to.y + (to.y > from.y ? 0 : CARD_HEIGHT) : to.y + (to.y > from.y ? 0 : CARD_HEIGHT);
                      const midX = (x1 + x2) / 2;
                      const curve = /^(prev|previous|previousnode|previous_node)$/i.test(edge.label) ? -32 : 0;
                      const path = `M ${x1} ${y1 + curve} C ${midX} ${y1 + curve}, ${midX} ${y2 + curve}, ${x2} ${y2 + curve}`;
                      return <g className="live-visualizer-edge" key={`${edge.from}:${edge.label}:${edge.to}:${index}`}><path d={path} markerEnd={`url(#${markerId})`} /><text x={midX} y={(y1 + y2) / 2 + curve - 7}>{edge.label}</text></g>;
                    })}
                  </svg>
                  {model.ordered.map((id) => {
                    const object: RuntimeObject = heap[id];
                    const position = model.positions.get(id)!;
                    return (
                      <article className="live-visualizer-node" key={id} style={{ left: position.x, top: position.y, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}>
                        <header><span>{position.label}</span><strong>{object.type}</strong><small>@{id.replace(/^(py|cpp)-/, '').slice(-7)}</small></header>
                        <dl>
                          {object.entries.slice(0, 5).map((entry) => {
                            const target = referenceTarget(entry.value);
                            const value = displayValue(entry.value, target ? model.positions.get(target)?.label : undefined);
                            return <div key={`${id}:${entry.key}`}><dt>{entry.key}</dt><dd className={target && model.positions.has(target) ? 'is-reference' : ''} title={value}>{value}</dd></div>;
                          })}
                          {object.entries.length > 5 && <div className="live-visualizer-more">+{object.entries.length - 5} more fields</div>}
                        </dl>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="live-visualizer-legend"><span><i className="live-legend-node" /> Runtime object / cell</span><span><i className="live-legend-link" /> Pointer / reference</span><span>Scroll in both directions to inspect larger structures</span></div>
    </section>
  );
}
