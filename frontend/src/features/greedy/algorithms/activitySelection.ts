import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

interface Activity {
  start: number;
  end: number;
}

export function runActivitySelection(
  activities: Activity[]
): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];

  // Sort activities by finish time
  const sorted = activities
    .map((a, i) => ({ ...a, originalIndex: i }))
    .sort((a, b) => a.end - b.end);

  const n = sorted.length;
  // Use end times as the bar chart values
  const baseArray = sorted.map((a) => a.end);

  steps.push({
    array: [...baseArray],
    description: `Activity Selection: ${n} activities sorted by finish time. We greedily pick non-overlapping activities.`,
    codeLine: 1,
    variables: { 'Total activities': n, selected: 0, 'Last finish': '-' },
    callStack: ['main() -> activitySelection(activities)'],
  });

  const selectedIndices: number[] = [];
  let lastEnd = -Infinity;
  let selectedCount = 0;

  for (let i = 0; i < n; i++) {
    const act = sorted[i];

    // Considering this activity
    steps.push({
      array: [...baseArray],
      comparingIndices: [i],
      sortedIndices: [...selectedIndices],
      description: `Considering activity ${i + 1}: [${act.start}, ${act.end}). Last selected finish = ${lastEnd === -Infinity ? 'none' : lastEnd}.`,
      codeLine: 2,
      variables: {
        i,
        'activity.start': act.start,
        'activity.end': act.end,
        lastEnd: lastEnd === -Infinity ? null : lastEnd,
        selected: selectedCount,
      },
      callStack: ['main() -> activitySelection(activities)'],
    });

    if (act.start >= lastEnd) {
      // Select this activity
      selectedIndices.push(i);
      selectedCount++;
      lastEnd = act.end;

      steps.push({
        array: [...baseArray],
        sortedIndices: [...selectedIndices],
        description: `Activity ${i + 1} [${act.start}, ${act.end}) selected! Start ${act.start} >= last finish. Total selected: ${selectedCount}.`,
        codeLine: 3,
        variables: {
          i,
          'activity.start': act.start,
          'activity.end': act.end,
          lastEnd: act.end,
          selected: selectedCount,
        },
        callStack: ['main() -> activitySelection(activities)'],
      });
    } else {
      steps.push({
        array: [...baseArray],
        comparingIndices: [i],
        sortedIndices: [...selectedIndices],
        description: `Activity ${i + 1} [${act.start}, ${act.end}) overlaps (start ${act.start} < last finish ${lastEnd}). Skipping.`,
        codeLine: 4,
        variables: {
          i,
          'activity.start': act.start,
          'activity.end': act.end,
          lastEnd,
          selected: selectedCount,
        },
        callStack: ['main() -> activitySelection(activities)'],
      });
    }
  }

  // Final step
  steps.push({
    array: [...baseArray],
    sortedIndices: [...selectedIndices],
    description: `Activity Selection complete. ${selectedCount} non-overlapping activities selected from ${n} total.`,
    codeLine: 5,
    variables: { selected: selectedCount, total: n },
    callStack: ['main() -> activitySelection(activities) [DONE]'],
  });

  return {
    steps,
    title: 'Activity Selection',
    category: 'Greedy Algorithms',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
    },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'sort activities by finish time',
      'for each activity i do',
      '  if activity[i].start >= lastFinish then',
      '    select activity[i]',
      '    lastFinish = activity[i].end',
      '  end if',
      'end for',
    ],
  };
}
