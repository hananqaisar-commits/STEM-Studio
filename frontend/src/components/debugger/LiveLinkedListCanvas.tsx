import { useMemo } from 'react';
import { LinkedListRenderer } from '../../features/linkedList/LinkedListRenderer';
import type { LiveLinkedListModel } from './liveLinkedListModel';

export function LiveLinkedListCanvas({ model }: { model: LiveLinkedListModel }) {
  const step = useMemo(() => ({
    nodes: model.nodes,
    headId: model.headId,
    tailId: model.tailId,
    pointers: {},
    phase: 'Live runtime snapshot',
    explanation: 'Showing the pointers captured in the current program state.',
    codeLine: 0,
    listType: model.listType,
  }), [model]);

  return (
    <section className="live-linked-list-canvas" aria-label={`${model.listType} linked list canvas`} style={{ width: model.width }}>
      <header className="live-linked-list-heading">
        <div>
          <strong>Structure canvas</strong>
          <span>{model.nodes.length} node{model.nodes.length === 1 ? '' : 's'} · {model.listType} linked list</span>
        </div>
      </header>
      <div className="live-linked-list-renderer">
        <LinkedListRenderer step={step} nodes={model.nodes} listType={model.listType} />
      </div>
    </section>
  );
}
