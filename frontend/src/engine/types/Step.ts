export type ElementState = 'default' | 'current' | 'comparing' | 'swapping' | 'sorted' | 'pivot' | 'selected';

export interface ArrayStep {
  array: number[];
  comparingIndices?: number[];
  swappingIndices?: number[];
  sortedIndices?: number[];
  pivotIndex?: number;
  /** Explicit operation name for the renderer (compare, shift, write, etc.). */
  operation?: string;
  /** Value temporarily held outside the array while insertion-style sorts move values. */
  heldValue?: number | null;
  heldIndex?: number;
  /** Inclusive array window currently being built or inspected; end < start means empty. */
  windowStart?: number;
  windowEnd?: number;
  windowSum?: number;
  enteringIndex?: number;
  leavingIndex?: number;
  /** Inclusive region currently being partitioned or merged. */
  activeRange?: { start: number; end: number };
  /** Temporary merge-sort buffers, with each lane's local cursor and source offset. */
  auxiliaryLanes?: { label: string; values: number[]; activeIndex: number | null; sourceStart: number }[];
  /** Destination cell/value for the current merge-buffer write. */
  writeIndex?: number;
  writeValue?: number;
  description: string;
  codeLine?: number;
  variables?: Record<string, string | number | boolean | null>;
  callStack?: string[];
}
