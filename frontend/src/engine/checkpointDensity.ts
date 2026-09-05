import type { QuizCheckpoint } from './types/Quiz';

export const CHECKPOINT_RATIO = 0.68;

export function checkpointTarget(totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  if (totalSteps === 1) return 1;
  return Math.max(2, Math.min(totalSteps - 1, Math.round(totalSteps * CHECKPOINT_RATIO)));
}

/** Keep authored questions, but choose them at an even, decision-first density. */
export function selectDensityCheckpoints(checkpoints: QuizCheckpoint[], totalSteps: number): QuizCheckpoint[] {
  const target = Math.min(checkpointTarget(totalSteps), checkpoints.length);
  if (target === 0 || checkpoints.length <= target) return checkpoints;
  const sorted = [...checkpoints].sort((a, b) => a.stepIndex - b.stepIndex);
  const selected = new Map<number, QuizCheckpoint>();
  for (const point of sorted.filter((point) => point.question.weight >= 2)) {
    if (selected.size === target) break;
    selected.set(point.stepIndex, point);
  }
  for (let slot = 1; selected.size < target && slot <= target * 3; slot += 1) {
    const ideal = Math.round(slot * Math.max(totalSteps - 1, 1) / (target + 1));
    const closest = sorted.filter((point) => !selected.has(point.stepIndex))
      .sort((a, b) => Math.abs(a.stepIndex - ideal) - Math.abs(b.stepIndex - ideal))[0];
    if (!closest) break;
    selected.set(closest.stepIndex, closest);
  }
  return [...selected.values()].sort((a, b) => a.stepIndex - b.stepIndex);
}
