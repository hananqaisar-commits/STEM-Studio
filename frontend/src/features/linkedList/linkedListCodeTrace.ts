import type { CustomLanguage } from '../../engine/customCodeTemplates';
import type { LinkedListStep, ListNodeItem } from './linkedListEngine';

export interface LinkedListCodeTraceResult {
  steps: LinkedListStep[];
  error?: string;
  result?: string;
}

const clone = (nodes: ListNodeItem[]) => nodes.map((node) => ({ ...node, pointerLabels: [...(node.pointerLabels ?? [])] }));

/**
 * Build a source-line-aware pointer trace for the length/count version of
 * removeNthFromEnd. This is a local algorithm model; it does not compile or
 * execute the pasted C++ source.
 */
export function traceRemoveNthFromEndSource(
  source: string,
  language: CustomLanguage,
  inputNodes: ListNodeItem[],
  n: number,
): LinkedListCodeTraceResult {
  if (language !== 'cpp') {
    return { steps: [], error: 'For this local linked-list trace, select C++ and paste the complete removeNthFromEnd function. Other languages need the execution service.' };
  }

  const lines = source.split(/\r?\n/);
  const codeLines = lines.map((line) => line.replace(/\/\/.*$/, '').trim());
  const code = codeLines.join('\n').replace(/\s+/g, ' ');
  const loopLines = codeLines
    .map((line, index) => (/\bwhile\s*\(\s*current\s*!=\s*nullptr\s*\)/.test(line) ? index + 1 : 0))
    .filter(Boolean);
  const occurrences = (pattern: RegExp) => (code.match(pattern) ?? []).length;
  const hasPattern =
    /\bremoveNthFromEnd\s*\(/.test(code) &&
    /\bint\s+size\s*=\s*0\s*;/.test(code) &&
    loopLines.length >= 2 &&
    occurrences(/\bcurrent\s*=\s*head\s*;/g) >= 2 &&
    /\bprevious\s*=\s*nullptr\s*;/.test(code) &&
    /(?:\+\+\s*size|size\s*\+\+|size\s*\+=\s*1)\s*;/.test(code) &&
    occurrences(/\bcurrent\s*=\s*current\s*->\s*next\s*;/g) >= 3 &&
    /\bsize\s*=\s*\(?\s*size\s*-\s*n\s*\)?\s*\+\s*1\s*;/.test(code) &&
    /\bint\s+position\s*=\s*1\s*;/.test(code) &&
    /position\s*==\s*size\s*&&\s*current\s*==\s*head/.test(code) &&
    /position\s*==\s*size/.test(code) &&
    /\bprevious\s*=\s*current\s*;/.test(code) &&
    /\bposition\s*\+\+\s*;/.test(code) &&
    /previous\s*->\s*next\s*=\s*current\s*->\s*next\s*;/.test(code) &&
    occurrences(/\btemp\s*=\s*current\s*;/g) >= 2 &&
    occurrences(/delete\s+temp\s*;/g) >= 2 &&
    /return\s+current\s*;/.test(code) &&
    /return\s+head\s*;/.test(code);

  if (!hasPattern) {
    return {
      steps: [],
      error: 'This local visual trace recognizes the pasted length/count removeNthFromEnd pattern (size scan, 1-based target position, head-delete branch, and previous->next bypass). Your source was not run; use Reference mode or configure the execution service for other algorithms.',
    };
  }
  if (!inputNodes.length) return { steps: [], error: 'Enter at least one list node before tracing the function.' };
  if (!Number.isInteger(n) || n < 1 || n > inputNodes.length) {
    return { steps: [], error: `The pasted function has no invalid-n guard. Choose n from 1 to ${inputNodes.length} so the trace follows a defined deletion path.` };
  }

  const lineOf = (pattern: RegExp, occurrence = 0): number => {
    let seen = 0;
    for (let index = 0; index < codeLines.length; index += 1) {
      if (pattern.test(codeLines[index])) {
        if (seen === occurrence) return index + 1;
        seen += 1;
      }
    }
    return 1;
  };
  const linesFor = {
    currentHead: lineOf(/\bcurrent\s*=\s*head\s*;/),
    currentHeadReset: lineOf(/\bcurrent\s*=\s*head\s*;/, 1),
    previousNull: lineOf(/\bprevious\s*=\s*nullptr\s*;/),
    sizeInit: lineOf(/\bint\s+size\s*=\s*0\s*;/),
    countLoop: loopLines[0],
    incrementSize: lineOf(/(?:\+\+\s*size|size\s*\+\+|size\s*\+=\s*1)\s*;/),
    moveCurrentCount: lineOf(/\bcurrent\s*=\s*current\s*->\s*next\s*;/),
    moveCurrentHead: lineOf(/\bcurrent\s*=\s*current\s*->\s*next\s*;/, 1),
    moveCurrentSearch: lineOf(/\bcurrent\s*=\s*current\s*->\s*next\s*;/, 2),
    target: lineOf(/\bsize\s*=\s*\(?\s*size\s*-\s*n\s*\)?\s*\+\s*1\s*;/),
    positionInit: lineOf(/\bint\s+position\s*=\s*1\s*;/),
    searchLoop: loopLines[1],
    headCheck: lineOf(/position\s*==\s*size\s*&&\s*current\s*==\s*head/),
    matchCheck: lineOf(/if\s*\(\s*position\s*==\s*size\s*\)/),
    tempHead: lineOf(/\btemp\s*=\s*current\s*;/),
    tempTarget: lineOf(/\btemp\s*=\s*current\s*;/, 1),
    bypass: lineOf(/previous\s*->\s*next\s*=\s*current\s*->\s*next\s*;/),
    deleteHead: lineOf(/delete\s+temp\s*;/),
    deleteTarget: lineOf(/delete\s+temp\s*;/, 1),
    advancePrevious: lineOf(/\bprevious\s*=\s*current\s*;/),
    advancePosition: lineOf(/\bposition\s*\+\+\s*;/),
    returnCurrent: lineOf(/return\s+current\s*;/),
    returnHead: lineOf(/return\s+head\s*;/),
  };

  const nodes: ListNodeItem[] = clone(inputNodes).map((node) => ({ ...node, status: 'default' }));
  const steps: LinkedListStep[] = [];
  const valueById = new Map(nodes.map((node) => [node.id, node.value]));
  const targetPosition = nodes.length - n + 1;
  let headId: string | null = nodes[0]?.id ?? null;
  let currentId: string | null = headId;
  let previousId: string | null = null;
  let tempId: string | null = null;
  let size = 0;
  let position = 1;

  const snapshot = (
    phase: string,
    explanation: string,
    codeLine: number,
    highlighted: string[] = [],
    changes: Pick<LinkedListStep, 'brokenConnections' | 'newConnections'> = {},
    overrides: Partial<LinkedListStep> = {},
  ) => {
    const frameNodes = clone(nodes);
    frameNodes.forEach((node) => { node.pointerLabels = []; node.status = 'default'; });
    const labels: [string, string | null][] = [
      ['head', headId], ['previous', previousId], ['current', currentId], ['temp', tempId],
    ];
    labels.forEach(([label, id]) => {
      const node = frameNodes.find((candidate) => candidate.id === id);
      if (node) node.pointerLabels = [...(node.pointerLabels ?? []), label.toUpperCase()];
    });
    highlighted.forEach((id) => {
      const node = frameNodes.find((candidate) => candidate.id === id);
      if (node) node.status = 'active';
    });
    steps.push({
      nodes: frameNodes,
      headId,
      tailId: frameNodes[frameNodes.length - 1]?.id ?? null,
      pointers: { head: headId, previous: previousId, current: currentId, temp: tempId },
      phase,
      explanation,
      codeLine,
      highlightedNodeIds: highlighted,
      listType: 'singly',
      auxiliaryData: { size, n, targetPosition, position },
      ...changes,
      ...overrides,
    });
  };

  snapshot(
    'Initialize function pointers',
    `Start with current = head (${valueById.get(headId!)}) and previous = NULL. The function first counts the nodes before deciding which one to remove.`,
    linesFor.currentHead,
    [headId!],
  );
  snapshot('Initialize previous', 'Set previous = nullptr so the function can distinguish deleting the head from deleting a later node.', linesFor.previousNull, [headId!]);
  snapshot('Initialize count', 'Set size = 0 before the first traversal.', linesFor.sizeInit, [headId!]);

  let cursor: string | null = headId;
  while (cursor) {
    currentId = cursor;
    snapshot('Count-loop condition is true', `current is ${valueById.get(cursor)} rather than nullptr, so the count loop enters this iteration.`, linesFor.countLoop, [cursor]);
    const active = nodes.find((node) => node.id === cursor)!;
    size += 1;
    snapshot(`Count node ${size}`, `++size counts node ${active.value}; size is now ${size}.`, linesFor.incrementSize, [cursor]);
    cursor = active.nextId;
    currentId = cursor;
    snapshot(
      'Advance count pointer',
      `current = current->next moves to ${valueById.get(cursor!) ?? 'NULL'}. This scan changes no links.`,
      linesFor.moveCurrentCount,
      cursor ? [cursor] : [],
    );
  }
  currentId = null;
  snapshot('Count-loop condition is false', 'current is nullptr, so the first traversal stops with the complete list size.', linesFor.countLoop);

  currentId = headId;
  previousId = null;
  snapshot('Reset current to head', `The count scan found size = ${size}. Reset current to head (${valueById.get(headId!)}) for the deletion scan.`, linesFor.currentHeadReset, [headId!]);
  size = size - n + 1;
  snapshot('Compute 1-based target position', `size = (size - n) + 1 = (${inputNodes.length} - ${n}) + 1 = ${size}. The node at this 1-based position is ${n} from the end.`, linesFor.target, [headId!]);
  position = 1;
  snapshot('Initialize position', 'Start the second traversal at position = 1.', linesFor.positionInit, [headId!]);

  while (currentId) {
    snapshot('Search-loop condition is true', `current points to ${valueById.get(currentId)} rather than nullptr, so the deletion scan enters this iteration.`, linesFor.searchLoop, [currentId, ...(previousId ? [previousId] : [])]);
    const currentIndex = nodes.findIndex((node) => node.id === currentId);
    const currentNode = nodes[currentIndex];
    const isTarget = position === targetPosition;
    const isHeadTarget = isTarget && currentId === headId;
    snapshot(
      isHeadTarget ? 'Target is the head' : 'Check head-delete condition',
      isTarget
        ? isHeadTarget
          ? `position ${position} equals the target, and current is head. The special head-removal branch will return the successor.`
          : `position ${position} equals the target, but current is not head. The general bypass branch will remove ${currentNode.value}.`
        : `position ${position} does not equal target position ${targetPosition}; keep traversing.`,
      linesFor.headCheck,
      [currentId, ...(previousId ? [previousId] : [])],
    );

    if (isHeadTarget) {
      tempId = currentId;
      snapshot('Save head victim in temp', `temp = current preserves node ${currentNode.value} so it can be deleted after current advances.`, linesFor.tempHead, [currentId]);
      currentId = currentNode.nextId;
      snapshot('Move current to head successor', `current = current->next now holds ${valueById.get(currentId!) ?? 'NULL'}, the pointer returned by the head-removal branch.`, linesFor.moveCurrentHead, currentId ? [currentId] : []);
      const removedValue = currentNode.value;
      nodes.splice(currentIndex, 1);
      snapshot(
        'Delete old head',
        `delete temp frees node ${removedValue}. temp and the local head still contain that freed address until the return; current still points to the successor.`,
        linesFor.deleteHead,
        currentId ? [currentId] : [],
      );
      tempId = null;
      headId = currentId;
      snapshot(
        'Return current as the new head',
        `The function returns current (${valueById.get(currentId!) ?? 'NULL'}). It does not assign the local variable head; the caller must store the returned pointer.`,
        linesFor.returnCurrent,
        currentId ? [currentId] : [],
        {},
        { pointers: { head: currentId, current: currentId, returned_head: currentId }, headId: currentId },
      );
      return { steps, result: nodes.map((node) => String(node.value)).join(' → ') || 'EMPTY' };
    }

    snapshot(
      isTarget ? 'Target is not the head' : 'Check target position',
      isTarget
        ? `The target is ${currentNode.value}. previous points to ${valueById.get(previousId!)}, the node whose next link must bypass it.`
        : `The target check is false at position ${position}; advance previous, current, and position in order.`,
      linesFor.matchCheck,
      [currentId, ...(previousId ? [previousId] : [])],
    );

    if (isTarget) {
      tempId = currentId;
      snapshot('Save target in temp', `temp = current saves node ${currentNode.value} before its incoming link is changed.`, linesFor.tempTarget, [currentId, ...(previousId ? [previousId] : [])]);
      const predecessor = nodes.find((node) => node.id === previousId)!;
      const successorId = currentNode.nextId;
      predecessor.nextId = successorId;
      snapshot(
        'Bypass target node',
        `${valueById.get(previousId!)}.next changes from ${currentNode.value} to ${valueById.get(successorId!) ?? 'NULL'}. The target is still allocated in temp at this point.`,
        linesFor.bypass,
        [previousId!, currentId, ...(successorId ? [successorId] : [])],
        {
          brokenConnections: [{ fromId: previousId!, toId: currentId, type: 'next' as const }],
          newConnections: successorId ? [{ fromId: previousId!, toId: successorId, type: 'next' as const }] : [],
        },
      );
      const victimValue = currentNode.value;
      nodes.splice(currentIndex, 1);
      snapshot(
        'Delete target node',
        `delete temp frees ${victimValue}. Its predecessor already points directly to the successor; current and temp still hold the freed address until return.`,
        linesFor.deleteTarget,
        previousId ? [previousId] : [],
      );
      currentId = null;
      tempId = null;
      snapshot(
        'Return head',
        `Return head keeps the original first node, and the updated next link bypasses the removed node.`,
        linesFor.returnHead,
        previousId ? [previousId] : [],
        {},
        { pointers: { head: headId, previous: previousId }, headId },
      );
      return { steps, result: nodes.map((node) => String(node.value)).join(' → ') || 'EMPTY' };
    }

    previousId = currentId;
    snapshot('Advance previous', `previous = current; previous now points to ${currentNode.value}.`, linesFor.advancePrevious, [currentId]);
    currentId = currentNode.nextId;
    snapshot(`Advance current to position ${position + 1}`, `current = current->next moves to ${valueById.get(currentId!) ?? 'NULL'}.`, linesFor.moveCurrentSearch, currentId ? [currentId] : []);
    position += 1;
    snapshot(`Increment position to ${position}`, `position++ advances the 1-based traversal counter to ${position}.`, linesFor.advancePosition, currentId ? [currentId] : [previousId]);
  }

  return { steps: [], error: 'The pasted function reached NULL without selecting a target. Confirm the source uses the same size and position calculation.' };
}
