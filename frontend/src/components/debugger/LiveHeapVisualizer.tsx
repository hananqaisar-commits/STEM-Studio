import { useId, useMemo, useRef, useState } from 'react';
import { Activity, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { RuntimeObject, RuntimeTraceEvent, RuntimeValue } from '../../api/liveCode';

const CARD_WIDTH = 224;
const CARD_HEIGHT = 154;
const COLUMN_GAP = 32;
const ROW_GAP = 48;

function referenceTarget(value: RuntimeValue | undefined): string | null {
  return value?.kind === 'ref' ? value.object_id : null;
}

function displayValue(value: RuntimeValue, targetLabel?: string): string {
  if (targetLabel) return `→ ${targetLabel}`;
  if (value.kind === 'ref') return `→ @${value.object_id}`;
  if (value.kind === 'opaque') return value.preview ?? `<${value.type}>`;
  if (typeof value.value === 'string') return JSON.stringify(value.value);
  if (value.value === null) return 'None';
  if (typeof value.value === 'object') return JSON.stringify(value.value);
  return String(value.value);
}

export function LiveHeapVisualizer({ event }: { event: RuntimeTraceEvent | null }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const markerId = useId().replace(/:/g, '');
  const heap = event?.heap ?? {};
  const frame = event?.frames?.[event.frames.length - 1];

  const graph = useMemo(() => {
    const ids = Object.keys(heap);
    const idSet = new Set(ids);
    const roots = Object.entries(frame?.scope ?? {})
      .map(([name, value]) => ({ name, id: referenceTarget(value) }))
      .filter((root): root is { name: string; id: string } => Boolean(root.id && idSet.has(root.id)))
      .sort((a, b) => Number(/^(head|root|first|front)$/i.test(b.name)) - Number(/^(head|root|first|front)$/i.test(a.name)));

    const ordered: string[] = [];
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visited.has(id) || !heap[id]) return;
      visited.add(id);
      ordered.push(id);
      const refs = heap[id].entries
        .map((entry, index) => ({ id: referenceTarget(entry.value), name: entry.key.toLowerCase(), index }))
        .filter((entry): entry is { id: string; name: string; index: number } => Boolean(entry.id && idSet.has(entry.id)))
        .sort((a, b) => {
          const rank = (name: string) => /^(next|nextnode|next_node)$/.test(name) ? 0
            : /^(left|right|child|children|head|front)$/.test(name) ? 1
              : /^(prev|previous|previousnode|previous_node)$/.test(name) ? 3 : 2;
          return rank(a.name) - rank(b.name) || a.index - b.index;
        });
      refs.forEach((entry) => visit(entry.id));
    };
    roots.forEach((root) => visit(root.id));
    ids.forEach(visit);

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
    return {
      ordered, positions, edges, roots,
      width: Math.max(740, 60 + columns * CARD_WIDTH + (columns - 1) * COLUMN_GAP),
      height: Math.max(420, 94 + rows * CARD_HEIGHT + (rows - 1) * ROW_GAP + 45),
    };
  }, [heap, frame]);

  const resetView = () => {
    setZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  return (
    <section className="live-visualizer-section" aria-label="Runtime data structure visualization">
      <div className="live-visualizer-toolbar">
        <div className="live-visualizer-title"><strong>Visualizer</strong><span>{graph.ordered.length ? `${graph.ordered.length} object${graph.ordered.length === 1 ? '' : 's'}` : 'Waiting for runtime objects'}</span></div>
        <div className="live-visualizer-zoom" aria-label="Visualizer zoom controls">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.65, Math.round((value - 0.1) * 10) / 10))} disabled={zoom <= 0.65}><ZoomOut size={14} /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, Math.round((value + 0.1) * 10) / 10))} disabled={zoom >= 1.5}><ZoomIn size={14} /></button>
          <button type="button" aria-label="Reset visualizer view" onClick={resetView}><Maximize2 size={13} /></button>
        </div>
      </div>
      <div className="live-visualizer-viewport" ref={viewportRef} tabIndex={0} aria-label="Scrollable live data structure canvas">
        {graph.ordered.length === 0 ? (
          <div className="live-visualizer-empty">
            <div className="live-visualizer-empty-icon"><Activity size={22} /></div>
            <strong>{event ? 'No expandable objects in this step' : 'Run code to build the visualization'}</strong>
            <span>Created nodes, arrays, objects, and their references will appear here as your program runs.</span>
          </div>
        ) : (
          <div className="live-visualizer-canvas-wrap" style={{ width: graph.width * zoom, height: graph.height * zoom }}>
            <div className="live-visualizer-canvas" style={{ width: graph.width, height: graph.height, transform: `scale(${zoom})` }}>
              {graph.roots.length > 0 && <div className="live-visualizer-roots">{graph.roots.map((root) => <span key={`${root.name}:${root.id}`}><code>{root.name}</code><b>→</b>{graph.positions.get(root.id)?.label}</span>)}</div>}
              <svg className="live-visualizer-edges" width={graph.width} height={graph.height} aria-hidden="true">
                <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="currentColor" /></marker></defs>
                {graph.edges.map((edge, index) => {
                  const from = graph.positions.get(edge.from);
                  const to = graph.positions.get(edge.to);
                  if (!from || !to) return null;
                  const horizontal = from.x !== to.x;
                  const x1 = horizontal ? from.x + (to.x > from.x ? CARD_WIDTH : 0) : from.x + CARD_WIDTH / 2;
                  const y1 = horizontal ? from.y + CARD_HEIGHT / 2 : from.y + (to.y > from.y ? CARD_HEIGHT : 0);
                  const x2 = horizontal ? to.x + (to.x > from.x ? 0 : CARD_WIDTH) : to.x + CARD_WIDTH / 2;
                  const y2 = horizontal ? to.y + CARD_HEIGHT / 2 : to.y + (to.y > from.y ? 0 : CARD_HEIGHT);
                  const midX = (x1 + x2) / 2;
                  const curve = /^(prev|previous|previousnode|previous_node)$/i.test(edge.label) ? -32 : 0;
                  const path = `M ${x1} ${y1 + curve} C ${midX} ${y1 + curve}, ${midX} ${y2 + curve}, ${x2} ${y2 + curve}`;
                  return <g className="live-visualizer-edge" key={`${edge.from}:${edge.label}:${edge.to}:${index}`}><path d={path} markerEnd={`url(#${markerId})`} /><text x={midX} y={(y1 + y2) / 2 + curve - 7}>{edge.label}</text></g>;
                })}
              </svg>
              {graph.ordered.map((id) => {
                const object: RuntimeObject = heap[id];
                const position = graph.positions.get(id)!;
                return (
                  <article className="live-visualizer-node" key={id} style={{ left: position.x, top: position.y, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}>
                    <header><span>{position.label}</span><strong>{object.type}</strong><small>@{id.replace(/^(py|cpp)-/, '').slice(-7)}</small></header>
                    <dl>
                      {object.entries.slice(0, 5).map((entry) => {
                        const target = referenceTarget(entry.value);
                        const value = displayValue(entry.value, target ? graph.positions.get(target)?.label : undefined);
                        return <div key={`${id}:${entry.key}`}><dt>{entry.key}</dt><dd className={target && graph.positions.has(target) ? 'is-reference' : ''} title={value}>{value}</dd></div>;
                      })}
                      {object.entries.length > 5 && <div className="live-visualizer-more">+{object.entries.length - 5} more fields</div>}
                    </dl>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="live-visualizer-legend"><span><i className="live-legend-node" /> Runtime object</span><span><i className="live-legend-link" /> Pointer / reference</span><span>Scroll in both directions to inspect larger structures</span></div>
    </section>
  );
}
