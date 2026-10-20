import type { ArrayStep } from '../../engine/types/Step';

export interface OperationMetrics { comparisons: number; swaps: number; writes: number; }

/** Counts explicit events emitted by the visualizer trace, not CPU instructions. */
export function countTraceOperations(steps: ArrayStep[], throughIndex: number): OperationMetrics {
  return steps.slice(0, Math.max(0, throughIndex + 1)).reduce<OperationMetrics>((counts, step) => {
    if (step.comparingIndices?.length) counts.comparisons += 1;
    if (step.swappingIndices?.length) counts.swaps += 1;
    if (step.writeIndex !== undefined || /write|overwrite|merge/i.test(step.operation ?? '')) counts.writes += 1;
    return counts;
  }, { comparisons: 0, swaps: 0, writes: 0 });
}
