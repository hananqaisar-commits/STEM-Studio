export type ElementState = 'default' | 'comparing' | 'swapping' | 'sorted' | 'pivot' | 'selected';

export interface ArrayStep {
  array: number[];
  comparingIndices?: number[];
  swappingIndices?: number[];
  sortedIndices?: number[];
  pivotIndex?: number;
  description: string;
  codeLine?: number;
}
