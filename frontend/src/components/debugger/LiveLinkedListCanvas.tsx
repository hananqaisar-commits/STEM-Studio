import { useLayoutEffect, useMemo, useRef } from 'react';
import { LinkedListRenderer } from '../../features/linkedList/LinkedListRenderer';
import type { LiveLinkedListModel } from './liveLinkedListModel';

export function LiveLinkedListCanvas({ model }: { model: LiveLinkedListModel }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const previousRects = useRef(new Map<string, DOMRect>());
  const step = useMemo(() => ({
    nodes: model.nodes,
    headId: model.headId,
    tailId: model.tailId,
    pointers: {},
    phase: 'Live runtime snapshot',
    explanation: 'Showing the pointers captured in the current program state.',
    codeLine: 0,
    listType: model.listType,
    brokenConnections: model.brokenConnections,
    newConnections: model.newConnections,
    auxiliaryData: { liveSequence: model.sequence },
  }), [model]);

  useLayoutEffect(() => {
    const elements = Array.from(canvasRef.current?.querySelectorAll<HTMLElement>('.ll-node-wrapper[data-live-node-id]') ?? []);
    const currentRects = new Map<string, DOMRect>();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const element of elements) {
      const id = element.dataset.liveNodeId;
      if (!id) continue;
      const rect = element.getBoundingClientRect();
      currentRects.set(id, rect);
      const previous = previousRects.current.get(id);
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
    previousRects.current = currentRects;
  }, [model]);

  return (
    <section className="live-linked-list-canvas" aria-label={`${model.listType} linked list canvas`} style={{ width: model.width }}>
      <header className="live-linked-list-heading">
        <div>
          <strong>Structure canvas</strong>
          <span>{model.nodes.length} node{model.nodes.length === 1 ? '' : 's'} · {model.listType} linked list</span>
        </div>
      </header>
      {model.activity && <div key={model.sequence} className="live-linked-list-activity" aria-live="polite">{model.activity}</div>}
      <div className="live-linked-list-renderer" ref={canvasRef}>
        <LinkedListRenderer step={step} nodes={model.nodes} listType={model.listType} />
      </div>
    </section>
  );
}
