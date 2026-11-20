import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Activity, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { RuntimeObject, RuntimeTraceEvent, RuntimeValue } from '../../api/liveCode';
import { LiveLinkedListCanvas } from './LiveLinkedListCanvas';
import { buildLiveLinkedListModel } from './liveLinkedListModel';

const CARD_WIDTH = 224;
const CARD_HEIGHT = 154;
const COLUMN_GAP = 32;
const ROW_GAP = 48;
const EMPTY_HEAP: Record<string, RuntimeObject> = {};
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

export function LiveHeapVisualizer({ event, previousEvent, sourceLine, categoryId, topicId }: {
  event: RuntimeTraceEvent | null;
  previousEvent?: RuntimeTraceEvent | null;
  sourceLine?: string;
  categoryId?: string;
  topicId?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const previousGraphRects = useRef(new Map<string, DOMRect>());
  const [zoom, setZoom] = useState(1);
  const markerId = useId().replace(/:/g, '');
  const heap = event?.heap ?? EMPTY_HEAP;
  const frame = event?.frames?.[event.frames.length - 1];
  const categoryLabel = categoryId ? CATEGORY_LABELS[categoryId] ?? categoryId : 'Program';
  const topicLabel = topicId?.replace(/([a-z])([A-Z])/g, '$1 $2');
  const linkedListModel = useMemo(
    () => categoryId === 'linkedList' ? buildLiveLinkedListModel(event, previousEvent ?? null, sourceLine ?? '') : null,
    [categoryId, event, previousEvent, sourceLine],
  );

  const model = useMemo(() => {
    const ids = Object.keys(heap);
    const idSet = new Set(ids);
    const previousHeap = previousEvent?.heap ?? EMPTY_HEAP;
    const previousIds = new Set(Object.keys(previousHeap));
    const newObjectIds = new Set(ids.filter((id) => !previousIds.has(id)));
    const changedObjectIds = new Set(ids.filter((id) => {
      const before = previousHeap[id];
      const after = heap[id];
      if (!before) return false;
      return JSON.stringify(before.entries) !== JSON.stringify(after.entries);
    }));
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
    const isTreeGraph = categoryId === 'bst' && ordered.some((id) => heap[id].entries.some((entry) =>
      /^(left|right)(?:_?child)?$/i.test(entry.key) && referenceTarget(entry.value),
    ));
    const columns = Math.min(3, Math.max(1, ordered.length));
    const rows = Math.max(1, Math.ceil(ordered.length / columns));
    const labels = new Map(ordered.map((id, index) => [id, `N${index + 1}`]));
    const positions = new Map<string, { x: number; y: number; label: string }>();
    let graphColumns = columns;
    let graphRows = rows;
    if (isTreeGraph) {
      const treeIncoming = new Set<string>();
      for (const id of ordered) {
        for (const entry of heap[id].entries) {
          if (/^(left|right)(?:_?child)?$/i.test(entry.key)) {
            const target = referenceTarget(entry.value);
            if (target && remainingSet.has(target)) treeIncoming.add(target);
          }
        }
      }
      const rootId = roots.find((root) => /^(root|tree|head)$/i.test(root.name) && ordered.includes(root.id))?.id
        ?? ordered.find((id) => !treeIncoming.has(id))
        ?? ordered[0];
      const placed = new Set<string>();
      let inOrderIndex = 0;
      let maxDepth = 0;
      const placeSubtree = (id: string | null | undefined, depth: number): void => {
        if (!id || !heap[id] || !remainingSet.has(id) || placed.has(id)) return;
        placed.add(id);
        maxDepth = Math.max(maxDepth, depth);
        const child = (side: 'left' | 'right') => {
          const entry = heap[id].entries.find((item) => new RegExp(`^${side}(?:_?child)?$`, 'i').test(item.key));
          return referenceTarget(entry?.value);
        };
        placeSubtree(child('left'), depth + 1);
        const column = inOrderIndex++;
        positions.set(id, {
          x: 30 + column * (CARD_WIDTH + COLUMN_GAP),
          y: 94 + depth * (CARD_HEIGHT + ROW_GAP),
          label: labels.get(id) ?? `N${column + 1}`,
        });
        placeSubtree(child('right'), depth + 1);
      };
      placeSubtree(rootId, 0);
      ordered.forEach((id) => {
        if (placed.has(id)) return;
        placeSubtree(id, maxDepth + 1);
      });
      graphColumns = Math.max(1, inOrderIndex);
      graphRows = maxDepth + 1;
    } else {
      ordered.forEach((id, index) => positions.set(id, {
        x: 30 + (index % columns) * (CARD_WIDTH + COLUMN_GAP),
        y: 94 + Math.floor(index / columns) * (CARD_HEIGHT + ROW_GAP),
        label: labels.get(id)!,
      }));
    }
    const currentEdges = ordered.flatMap((id) => heap[id].entries.flatMap((entry) => {
      const target = referenceTarget(entry.value);
      if (!target || !positions.has(target)) return [];
      const previousTarget = referenceTarget(previousHeap[id]?.entries.find((oldEntry) => oldEntry.key === entry.key)?.value);
      return [{ from: id, to: target, label: entry.key, motion: previousTarget === target ? 'steady' as const : 'new' as const }];
    }));
    const currentEdgeKeys = new Set(currentEdges.map((edge) => `${edge.from}:${edge.label}:${edge.to}`));
    const fadingEdges = ordered.flatMap((id) => (previousHeap[id]?.entries ?? []).flatMap((entry) => {
      const target = referenceTarget(entry.value);
      const key = `${id}:${entry.key}:${target}`;
      return target && positions.has(id) && positions.has(target) && !currentEdgeKeys.has(key)
        ? [{ from: id, to: target, label: entry.key, motion: 'removing' as const }]
        : [];
    }));
    const edges = [...currentEdges, ...fadingEdges];
    const callFrames = event?.frames ?? [];
    const scalarValues = Object.entries(frame?.scope ?? {}).filter(([, value]) => value.kind !== 'ref');
    const comparisonIds = new Set<string>();
    const compareLine = /\b(if|while|for)\b/.test(sourceLine ?? '') && /(?:===?|!==?|<=?|>=?)/.test(sourceLine ?? '');
    if (compareLine) {
      for (const scopeFrame of event?.frames ?? []) {
        for (const [name, value] of Object.entries(scopeFrame.scope ?? {})) {
          const id = referenceTarget(value);
          if (!id || !ordered.includes(id)) continue;
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(sourceLine ?? '')) comparisonIds.add(id);
        }
      }
    }
    const hasVisualData = Boolean(linkedListModel) || mappings.length > 0 || matrices.length > 0 || flatSequences.length > 0 || stringValues.length > 0 || ordered.length > 0 || scalarValues.length > 0 || callFrames.length > 1;
    const width = Math.max(740, linkedListModel?.width ?? 0, 60 + graphColumns * CARD_WIDTH + (graphColumns - 1) * COLUMN_GAP);
    const graphHeight = Math.max(420, 94 + graphRows * CARD_HEIGHT + (graphRows - 1) * ROW_GAP + 45);
    const collectionsHeight = mappings.reduce((sum, object) => sum + 48 + Math.max(1, object.entries.length) * 30, 0)
      + matrices.reduce((sum, object) => sum + 54 + Math.max(1, object.entries.length) * 66, 0)
      + flatSequences.reduce((sum, object) => sum + 88 + (isStack ? Math.max(1, object.entries.length) : Math.ceil(Math.max(1, object.entries.length) / 12)) * 64, 0)
      + stringValues.reduce((sum, item) => sum + 88 + Math.ceil(Math.max(1, Array.from(item.value).length) / 16) * 64, 0);
    const height = Math.max(420, linkedListModel ? 350 : 0, 34 + (scalarValues.length ? 88 : 0) + (categoryId === 'recursion' || categoryId === 'backtracking' ? callFrames.length > 1 ? 112 : 0 : 0) + collectionsHeight + (ordered.length ? graphHeight : 0));
    let activity: string | null = null;
    if (compareLine) activity = `Comparing at line ${event?.line ?? ''}.`;
    else if (newObjectIds.size) activity = `Created ${newObjectIds.size} runtime object${newObjectIds.size === 1 ? '' : 's'}.`;
    else if (fadingEdges.length) activity = 'Node links changed.';
    else if (changedObjectIds.size) activity = 'Node data updated.';
    const removedObjectCount = [...previousIds].filter((id) => !idSet.has(id)).length;
    if (!activity && removedObjectCount) activity = `${removedObjectCount} object${removedObjectCount === 1 ? '' : 's'} left the visible heap.`;
    return { roots, rootNameById, mappings, matrices, flatSequences, nestedRows, stringValues, markers, isQueue, isStack, ordered, positions, edges, width, height, graphHeight, callFrames, scalarValues, hasVisualData, linkedListModel, newObjectIds, changedObjectIds, comparisonIds, activity, sequence: event?.seq ?? -1 };
  }, [heap, frame, event, previousEvent, sourceLine, categoryId, topicId, linkedListModel]);

  useLayoutEffect(() => {
    const elements = Array.from(graphRef.current?.querySelectorAll<HTMLElement>('.live-visualizer-node[data-live-object-id]') ?? []);
    const currentRects = new Map<string, DOMRect>();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const element of elements) {
      const id = element.dataset.liveObjectId;
      if (!id) continue;
      const rect = element.getBoundingClientRect();
      currentRects.set(id, rect);
      const previous = previousGraphRects.current.get(id);
      if (previous) {
        const dx = previous.left - rect.left;
        const dy = previous.top - rect.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          const easing = getComputedStyle(document.documentElement)
            .getPropertyValue(reduceMotion ? '--ease-out' : '--ease-in-out').trim();
          element.animate(
            reduceMotion
              ? [{ opacity: 0.84 }, { opacity: 1 }]
              : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration: reduceMotion ? 120 : 230, easing: easing || (reduceMotion ? 'ease-out' : 'ease-in-out') },
          );
        }
      }
    }
    previousGraphRects.current = currentRects;
  }, [model, event?.seq]);

  const resetView = () => {
    setZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  const structuredCount = model.mappings.length + model.matrices.length + model.flatSequences.length + model.stringValues.length;
  const visualizationLabel = model.linkedListModel
    ? `${model.linkedListModel.listType} linked nodes`
    : structuredCount > 0
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
      {!model.linkedListModel && model.activity && <div key={model.sequence} className="live-visualizer-activity" aria-live="polite">{model.activity}</div>}
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

              {model.linkedListModel && <LiveLinkedListCanvas model={model.linkedListModel} />}

              {!model.linkedListModel && model.scalarValues.length > 0 && (
                <section className="live-scope-visual" aria-label="Current local variable values">
                  <strong>Current variables</strong>
                  <div>{model.scalarValues.slice(0, 14).map(([name, value]) => <span key={name}><code>{name}</code><b>{displayValue(value)}</b></span>)}</div>
                </section>
              )}

              {!model.linkedListModel && model.stringValues.map(({ name, value }) => <StringCard key={`string:${name}`} name={name} value={value} />)}
              {model.mappings.map((object) => <CollectionCard key={object.object_id} object={object} rootName={model.rootNameById.get(object.object_id) ?? 'map'} heap={heap} markers={model.markers} layout="mapping" isStack={false} isQueue={false} />)}
              {model.matrices.map((object) => <CollectionCard key={object.object_id} object={object} rootName={model.rootNameById.get(object.object_id) ?? 'matrix'} heap={heap} markers={model.markers} layout="matrix" isStack={false} isQueue={false} />)}
              {model.flatSequences.map((object) => <CollectionCard key={object.object_id} object={object} rootName={model.rootNameById.get(object.object_id) ?? object.type} heap={heap} markers={model.markers} layout="sequence" isStack={model.isStack} isQueue={model.isQueue} />)}

              {!model.linkedListModel && model.ordered.length > 0 && (
                <div className="live-graph-canvas" ref={graphRef} style={{ width: model.width, height: model.graphHeight }}>
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
                      return <g className={`live-visualizer-edge${edge.motion === 'new' ? ' is-new' : edge.motion === 'removing' ? ' is-removing' : ''}`} key={`${edge.from}:${edge.label}:${edge.to}:${index}`}><path pathLength="1" d={path} markerEnd={`url(#${markerId})`} /><text x={midX} y={(y1 + y2) / 2 + curve - 7}>{edge.label}</text></g>;
                    })}
                  </svg>
                  {model.ordered.map((id) => {
                    const object: RuntimeObject = heap[id];
                    const position = model.positions.get(id)!;
                    return (
                      <article className={`live-visualizer-node${model.newObjectIds.has(id) ? ' is-new' : ''}${model.comparisonIds.has(id) ? ' is-comparing' : ''}${model.changedObjectIds.has(id) ? ' is-changed' : ''}`} data-live-object-id={id} key={id} style={{ left: position.x, top: position.y, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}>
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
