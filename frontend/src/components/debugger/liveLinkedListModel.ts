import type { RuntimeObject, RuntimeTraceEvent, RuntimeValue } from '../../api/liveCode';
import type { BrokenConnection, LinkedListStructureType, ListNodeItem, NewConnection } from '../../features/linkedList/linkedListEngine';

const NODE_WIDTH = 112;
const CONNECTOR_WIDTH = 48;
const LINK_FIELDS = {
  next: /^(next|nextnode|next_node|nextptr|next_ptr|nextpointer|next_pointer|forward|successor)$/i,
  prev: /^(prev|previous|prevnode|previousnode|prev_node|previous_node|prevptr|prev_ptr|previousptr|previous_ptr|prevpointer|prev_pointer|previouspointer|previous_pointer|back|predecessor)$/i,
};
const ROOT_FIELDS = /^(head|root|first|front|start|tail|last|rear|end)$/i;
const POINTER_VARIABLES = /^(head|root|first|front|start|tail|last|rear|end|current|curr|temp|tmp|newnode|new_node|prev|previous|next|slow|fast|runner|pointer)$/i;
const PAYLOAD_FIELDS = /^(data|val|value|key|item|element|payload)$/i;

export interface LiveLinkedListModel {
  nodes: ListNodeItem[];
  headId: string | null;
  tailId: string | null;
  listType: LinkedListStructureType;
  width: number;
  brokenConnections: BrokenConnection[];
  newConnections: NewConnection[];
  removedNodes: Array<{ id: string; value: string }>;
  activity: string | null;
  sequence: number;
}

function refId(value: RuntimeValue | undefined): string | null {
  return value?.kind === 'ref' ? value.object_id : null;
}

function pointerEntry(object: RuntimeObject, direction: 'next' | 'prev') {
  return object.entries.find((entry) => LINK_FIELDS[direction].test(entry.key));
}

function prettyFieldName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toUpperCase();
}

function rootTag(name: string): string {
  const normalized = name.toLowerCase().replace(/[_-]/g, '');
  if (['head', 'first', 'front', 'root', 'start'].includes(normalized)) return 'HEAD';
  if (['tail', 'last', 'rear', 'end'].includes(normalized)) return 'TAIL';
  if (['current', 'curr'].includes(normalized)) return 'CURRENT';
  return prettyFieldName(name);
}

function valueText(value: RuntimeValue | undefined, labels: Map<string, string>): string {
  if (!value) return 'NULL';
  if (value.kind === 'ref') return labels.get(value.object_id) ?? value.type;
  if (value.kind === 'opaque') return value.preview ?? `<${value.type}>`;
  if (value.value === null) return 'NULL';
  if (typeof value.value === 'string') return value.value;
  if (typeof value.value === 'object') return JSON.stringify(value.value);
  return String(value.value);
}

export function buildLiveLinkedListModel(
  event: RuntimeTraceEvent | null,
  previousEvent: RuntimeTraceEvent | null = null,
  sourceLine = '',
): LiveLinkedListModel | null {
  if (!event) return null;

  const heap = event.heap ?? {};
  const objects = Object.values(heap);
  const nodeObjects = objects.filter((object) => Boolean(pointerEntry(object, 'next') || pointerEntry(object, 'prev')));
  const previousObjects = Object.values(previousEvent?.heap ?? {});
  const previousNodeObjects = previousObjects.filter((object) => Boolean(pointerEntry(object, 'next') || pointerEntry(object, 'prev')));
  if (nodeObjects.length === 0 && previousNodeObjects.length === 0) return null;
  const previousById = new Map(previousNodeObjects.map((object) => [object.object_id, object]));
  const currentById = new Map(nodeObjects.map((object) => [object.object_id, object]));
  const newIds = new Set(nodeObjects.filter((object) => !previousById.has(object.object_id)).map((object) => object.object_id));
  const removedNodes = previousNodeObjects
    .filter((object) => !currentById.has(object.object_id))
    .map((object) => {
      const payload = object.entries.find((entry) => PAYLOAD_FIELDS.test(entry.key));
      const labelMap = new Map<string, string>();
      return { id: object.object_id, value: payload ? valueText(payload.value, labelMap) : object.type };
    });

  const brokenConnections: BrokenConnection[] = [];
  const newConnections: NewConnection[] = [];
  const changedLinkIds = new Set<string>();
  const changedDataIds = new Set<string>();
  for (const object of nodeObjects) {
    const previous = previousById.get(object.object_id);
    if (!previous) continue;
    for (const direction of ['next', 'prev'] as const) {
      const oldTarget = refId(pointerEntry(previous, direction)?.value);
      const newTarget = refId(pointerEntry(object, direction)?.value);
      if (oldTarget === newTarget) continue;
      changedLinkIds.add(object.object_id);
      if (oldTarget) brokenConnections.push({ fromId: object.object_id, toId: oldTarget, type: direction });
      if (newTarget) newConnections.push({ fromId: object.object_id, toId: newTarget, type: direction });
    }
    const oldPayload = previous.entries.find((entry) => PAYLOAD_FIELDS.test(entry.key));
    const newPayload = object.entries.find((entry) => PAYLOAD_FIELDS.test(entry.key));
    if (oldPayload && newPayload && JSON.stringify(oldPayload.value) !== JSON.stringify(newPayload.value)) {
      changedDataIds.add(object.object_id);
    }
  }

  const compareLine = /\b(if|while|for)\b/.test(sourceLine)
    && /(?:===?|!==?|<=?|>=?)/.test(sourceLine);
  const comparisonIds = new Set<string>();
  if (compareLine) {
    for (const frame of event.frames ?? []) {
      for (const [name, value] of Object.entries(frame.scope ?? {})) {
        if (!POINTER_VARIABLES.test(name)) continue;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(sourceLine)) {
          const id = refId(value);
          if (id) comparisonIds.add(id);
        }
      }
    }
  }

  const nodeIds = new Set(nodeObjects.map((object) => object.object_id));
  const pointerRoots = new Map<string, Set<string>>();
  const addRoot = (name: string, id: string | null) => {
    if (!id || !nodeIds.has(id)) return;
    const tags = pointerRoots.get(id) ?? new Set<string>();
    tags.add(rootTag(name));
    pointerRoots.set(id, tags);
  };

  // Include direct node pointers and container fields such as linked_list.head.
  // Frames are ordered current-to-caller so in-flight pointers stay visible.
  for (const frame of event.frames ?? []) {
    for (const [name, value] of Object.entries(frame.scope ?? {})) {
      const id = refId(value);
      if (!id) continue;
      if (nodeIds.has(id)) {
        if (POINTER_VARIABLES.test(name)) addRoot(name, id);
        continue;
      }
      const container = heap[id];
      if (!container) continue;
      for (const entry of container.entries) {
        if (ROOT_FIELDS.test(entry.key)) addRoot(entry.key, refId(entry.value));
      }
    }
  }

  const nextTarget = new Map(nodeObjects.map((object) => [object.object_id, refId(pointerEntry(object, 'next')?.value)]));
  const prevTarget = new Map(nodeObjects.map((object) => [object.object_id, refId(pointerEntry(object, 'prev')?.value)]));
  const orderedIds: string[] = [];
  const visited = new Set<string>();
  const visitChain = (start: string | null) => {
    let id = start;
    while (id && nodeIds.has(id) && !visited.has(id)) {
      visited.add(id);
      orderedIds.push(id);
      id = nextTarget.get(id) ?? null;
    }
  };

  const headId = [...pointerRoots].find(([, tags]) => tags.has('HEAD'))?.[0]
    ?? nodeObjects.find((object) => !prevTarget.get(object.object_id) || !nodeIds.has(prevTarget.get(object.object_id)!))?.object_id
    ?? null;
  visitChain(headId);
  nodeObjects.forEach((object) => visitChain(object.object_id));

  const labels = new Map(orderedIds.map((id, index) => [id, `N${index + 1}`]));
  const rootsByNode = new Map<string, string[]>();
  pointerRoots.forEach((tags, id) => {
    const existing = rootsByNode.get(id) ?? [];
    rootsByNode.set(id, [...existing, ...[...tags].filter((tag) => !existing.includes(tag))]);
  });

  const tailId = orderedIds.find((id) => !nextTarget.get(id) || !nodeIds.has(nextTarget.get(id)!)) ?? orderedIds.at(-1) ?? null;
  const nodes = orderedIds.map((id) => {
    const object = heap[id];
    const nextEntry = pointerEntry(object, 'next');
    const prevEntry = pointerEntry(object, 'prev');
    const payloadEntries = object.entries.filter((entry) => !LINK_FIELDS.next.test(entry.key) && !LINK_FIELDS.prev.test(entry.key));
    const preferred = payloadEntries.filter((entry) => PAYLOAD_FIELDS.test(entry.key));
    const payload = preferred[0] ?? payloadEntries.find((entry) => entry.value.kind !== 'ref') ?? payloadEntries[0];
    const nextId = refId(nextEntry?.value);
    const prevId = refId(prevEntry?.value);
    const tags = rootsByNode.get(id) ?? [];

    for (const frame of event.frames ?? []) {
      for (const [name, value] of Object.entries(frame.scope ?? {})) {
        if (POINTER_VARIABLES.test(name) && refId(value) === id && !tags.includes(rootTag(name))) tags.push(rootTag(name));
      }
    }

    if (id === headId && !tags.includes('HEAD')) tags.push('HEAD');
    if (id === tailId && !tags.includes('TAIL')) tags.push('TAIL');

    const status: ListNodeItem['status'] = comparisonIds.has(id)
      ? 'comparing'
      : newIds.has(id)
        ? 'new'
        : changedLinkIds.has(id) || [...changedLinkIds].some((changedId) => nextTarget.get(changedId) === id || prevTarget.get(changedId) === id)
          ? 'active'
          : changedDataIds.has(id)
            ? 'success'
            : 'default';

    return {
      id,
      nextId,
      prevId,
      value: payload ? valueText(payload.value, labels) : `<${object.type}>`,
      status,
      pointerLabels: tags.slice(0, 3),
    };
  });

  const listType: LinkedListStructureType = nodeObjects.some((object) => Boolean(pointerEntry(object, 'prev')))
    || (nodeObjects.length === 0 && previousNodeObjects.some((object) => Boolean(pointerEntry(object, 'prev'))))
    ? 'doubly'
    : 'singly';

  const newNode = nodes.find((node) => newIds.has(node.id));
  let activity: string | null = null;
  if (compareLine) activity = `Comparing values at line ${event.line}.`;
  else if (newNode) activity = `Node created · ${String(newNode.value)}.`;
  else if (removedNodes.length) {
    const explicitlyDeleted = /\bdelete\b|\bdel\b/.test(sourceLine);
    activity = `${explicitlyDeleted ? 'Node deleted' : 'Node detached'} · ${removedNodes.map((node) => node.value).join(', ')}.`;
  } else if (brokenConnections.length || newConnections.length) activity = 'Pointer links updated.';
  else if (changedDataIds.size) activity = 'Node data updated.';

  return {
    nodes,
    headId,
    tailId,
    listType,
    brokenConnections,
    newConnections,
    removedNodes,
    activity,
    sequence: event.seq,
    width: Math.max(
      700,
      48
        + nodes.reduce((width, node) => width + Math.min(240, Math.max(NODE_WIDTH, String(node.value).length * 9 + 42)), 0)
        + Math.max(0, nodes.length - 1) * CONNECTOR_WIDTH
        + 28,
    ),
  };
}
