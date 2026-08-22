import type { BSTStep, BSTNodeData, BSTTreeStructure } from './bstEngine';
import { computeNodePositions } from './bstEngine';
import type { ElementState } from '../../engine/types/Step';

export type HeapType = 'max' | 'min';

// Convert flat array [idx] to BSTTreeStructure
function arrayToTree(arr: number[], index = 0): BSTTreeStructure | undefined {
  if (index >= arr.length) return undefined;
  return {
    value: arr[index],
    id: `heap_node_${index}_${arr[index]}`,
    left: arrayToTree(arr, 2 * index + 1),
    right: arrayToTree(arr, 2 * index + 2),
  };
}

function createHeapStep(
  heapArray: number[],
  activeIdx?: number,
  comparingIndices: number[] = [],
  description = '',
  codeLine = 1,
  variables: Record<string, string | number | boolean | null> = {}
): BSTStep {
  const tree = arrayToTree(heapArray);
  const { nodes, edges } = computeNodePositions(tree);

  const updatedNodes: BSTNodeData[] = nodes.map((node, i) => {
    let state: ElementState = 'default';
    if (i === activeIdx || comparingIndices.includes(i)) state = 'comparing';
    return { ...node, state };
  });

  return {
    nodes: updatedNodes,
    edges,
    activeNodeId: activeIdx !== undefined ? nodes[activeIdx]?.id : undefined,
    description,
    codeLine,
    variables: { ...variables, heapArray: `[${heapArray.join(', ')}]` },
  };
}

// Insert into Max/Min Heap with Heapify Up
export function generateHeapInsertSteps(initialHeap: number[], newValue: number, heapType: HeapType = 'max'): { steps: BSTStep[]; newHeap: number[] } {
  const steps: BSTStep[] = [];
  const heap = [...initialHeap];

  steps.push(createHeapStep(heap, undefined, [], `Starting ${heapType.toUpperCase()} Heap insertion for value ${newValue}`, 1, { newValue }));

  heap.push(newValue);
  let currIdx = heap.length - 1;

  steps.push(createHeapStep(heap, currIdx, [currIdx], `Appended ${newValue} at index ${currIdx} (end of heap array). Starting Heapify Up.`, 2, { currIdx, newValue }));

  while (currIdx > 0) {
    const parentIdx = Math.floor((currIdx - 1) / 2);
    const parentVal = heap[parentIdx];
    const currVal = heap[currIdx];

    const needsSwap = heapType === 'max' ? currVal > parentVal : currVal < parentVal;

    steps.push(createHeapStep(
      heap,
      currIdx,
      [currIdx, parentIdx],
      `Comparing node ${currVal} (idx ${currIdx}) with parent ${parentVal} (idx ${parentIdx}).`,
      4,
      { currVal, parentVal, heapType }
    ));

    if (needsSwap) {
      steps.push(createHeapStep(
        heap,
        currIdx,
        [currIdx, parentIdx],
        `Swapping ${currVal} with parent ${parentVal} (${heapType.toUpperCase()} Heap condition met).`,
        6,
        { currVal, parentVal }
      ));

      heap[currIdx] = parentVal;
      heap[parentIdx] = currVal;
      currIdx = parentIdx;
    } else {
      steps.push(createHeapStep(heap, currIdx, [], `Heap property satisfied at index ${currIdx}. Heapify Up complete.`, 8, { currVal }));
      break;
    }
  }

  return { steps, newHeap: heap };
}

// Extract Root (Max/Min) from Heap with Heapify Down
export function generateHeapExtractSteps(initialHeap: number[], heapType: HeapType = 'max'): { steps: BSTStep[]; newHeap: number[] } {
  const steps: BSTStep[] = [];
  if (initialHeap.length === 0) return { steps, newHeap: [] };

  const heap = [...initialHeap];
  const rootVal = heap[0];

  steps.push(createHeapStep(heap, 0, [0], `Extracting ${heapType.toUpperCase()} Root (${rootVal}).`, 1, { rootVal }));

  if (heap.length === 1) {
    heap.pop();
    steps.push(createHeapStep([], undefined, [], `Extracted last element ${rootVal}. Heap is now empty.`, 2, { rootVal }));
    return { steps, newHeap: [] };
  }

  const lastVal = heap.pop()!;
  heap[0] = lastVal;

  steps.push(createHeapStep(heap, 0, [0], `Replaced root with last element ${lastVal}. Starting Heapify Down.`, 3, { lastVal }));

  let currIdx = 0;
  const n = heap.length;

  while (currIdx < n) {
    let targetIdx = currIdx;
    const leftIdx = 2 * currIdx + 1;
    const rightIdx = 2 * currIdx + 2;

    if (leftIdx < n) {
      if (heapType === 'max' ? heap[leftIdx] > heap[targetIdx] : heap[leftIdx] < heap[targetIdx]) {
        targetIdx = leftIdx;
      }
    }

    if (rightIdx < n) {
      if (heapType === 'max' ? heap[rightIdx] > heap[targetIdx] : heap[rightIdx] < heap[targetIdx]) {
        targetIdx = rightIdx;
      }
    }

    if (targetIdx !== currIdx) {
      steps.push(createHeapStep(
        heap,
        currIdx,
        [currIdx, targetIdx],
        `Swapping ${heap[currIdx]} at index ${currIdx} with larger/smaller child ${heap[targetIdx]} at index ${targetIdx}.`,
        5,
        { curr: heap[currIdx], child: heap[targetIdx] }
      ));

      const temp = heap[currIdx];
      heap[currIdx] = heap[targetIdx];
      heap[targetIdx] = temp;
      currIdx = targetIdx;
    } else {
      steps.push(createHeapStep(heap, currIdx, [], `${heapType.toUpperCase()} Heap condition satisfied at index ${currIdx}. Heapify Down complete.`, 7, { finalVal: heap[currIdx] }));
      break;
    }
  }

  return { steps, newHeap: heap };
}
