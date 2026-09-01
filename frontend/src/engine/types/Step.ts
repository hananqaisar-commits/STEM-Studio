export type ElementState = 'default' | 'current' | 'comparing' | 'swapping' | 'sorted' | 'pivot' | 'selected';

export interface ArrayStep {
  array: number[];
  comparingIndices?: number[];
  swappingIndices?: number[];
  sortedIndices?: number[];
  pivotIndex?: number;
  description: string;
  codeLine?: number;
  variables?: Record<string, string | number | boolean | null>;
  callStack?: string[];
}
