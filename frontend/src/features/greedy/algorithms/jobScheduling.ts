import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

interface Job {
  deadline: number;
  profit: number;
}

export function runJobScheduling(
  jobs: Job[]
): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];

  // Sort by profit descending
  const sorted = jobs
    .map((job, i) => ({ ...job, originalIndex: i }))
    .sort((a, b) => b.profit - a.profit);

  const n = sorted.length;
  const maxDeadline = Math.max(...sorted.map((j) => j.deadline));
  const baseArray = sorted.map((j) => j.profit);

  // Time slot availability tracker (1-indexed deadlines)
  const slotOccupied: boolean[] = new Array(maxDeadline + 1).fill(false);
  const slotJobLabel: string[] = new Array(maxDeadline + 1).fill('empty');

  steps.push({
    array: [...baseArray],
    description: `Job Scheduling: ${n} jobs sorted by profit (descending). Max deadline = ${maxDeadline}. Schedule each job in the latest available slot before its deadline.`,
    codeLine: 1,
    variables: { jobs: n, maxDeadline, totalProfit: 0, scheduled: 0 },
    callStack: ['main() -> jobScheduling(jobs)'],
  });

  const selectedIndices: number[] = [];
  let totalProfit = 0;
  let scheduledCount = 0;

  for (let i = 0; i < n; i++) {
    const job = sorted[i];

    steps.push({
      array: [...baseArray],
      comparingIndices: [i],
      sortedIndices: [...selectedIndices],
      description: `Considering job ${i + 1}: deadline=${job.deadline}, profit=${job.profit}. Looking for latest free slot <= ${job.deadline}.`,
      codeLine: 2,
      variables: {
        i,
        'job.deadline': job.deadline,
        'job.profit': job.profit,
        totalProfit,
        scheduled: scheduledCount,
      },
      callStack: ['main() -> jobScheduling(jobs)'],
    });

    // Find latest available slot before deadline
    let assignedSlot = -1;
    for (let s = job.deadline; s >= 1; s--) {
      if (!slotOccupied[s]) {
        assignedSlot = s;
        break;
      }
    }

    if (assignedSlot !== -1) {
      slotOccupied[assignedSlot] = true;
      slotJobLabel[assignedSlot] = `J${i + 1}`;
      totalProfit += job.profit;
      scheduledCount++;
      selectedIndices.push(i);

      const slotsStr = slotOccupied
        .slice(1, maxDeadline + 1)
        .map((_occ, idx) => `[${idx + 1}]: ${slotJobLabel[idx + 1]}`)
        .join(', ');

      steps.push({
        array: [...baseArray],
        sortedIndices: [...selectedIndices],
        description: `Job ${i + 1} scheduled in slot ${assignedSlot}. Slots: ${slotsStr}. Total profit: ${totalProfit}.`,
        codeLine: 3,
        variables: {
          i,
          'job.profit': job.profit,
          assignedSlot,
          totalProfit,
          scheduled: scheduledCount,
          slots: slotsStr,
        },
        callStack: ['main() -> jobScheduling(jobs)'],
      });
    } else {
      steps.push({
        array: [...baseArray],
        comparingIndices: [i],
        sortedIndices: [...selectedIndices],
        description: `Job ${i + 1} (deadline=${job.deadline}, profit=${job.profit}) cannot be scheduled — all slots 1..${job.deadline} are occupied. Skipped.`,
        codeLine: 4,
        variables: {
          i,
          'job.deadline': job.deadline,
          'job.profit': job.profit,
          totalProfit,
          scheduled: scheduledCount,
        },
        callStack: ['main() -> jobScheduling(jobs)'],
      });
    }
  }

  // Final step
  const finalSlots = slotOccupied
    .slice(1, maxDeadline + 1)
    .map((_occ, idx) => `[${idx + 1}]: ${slotJobLabel[idx + 1]}`)
    .join(', ');

  steps.push({
    array: [...baseArray],
    sortedIndices: [...selectedIndices],
    description: `Job Scheduling complete. ${scheduledCount} jobs scheduled. Total profit: ${totalProfit}. Slots: ${finalSlots}.`,
    codeLine: 5,
    variables: { totalProfit, scheduled: scheduledCount, slots: finalSlots },
    callStack: ['main() -> jobScheduling(jobs) [DONE]'],
  });

  return {
    steps,
    title: 'Job Scheduling',
    category: 'Greedy Algorithms',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n * d)',
      worst: 'O(n * d)',
    },
    spaceComplexity: 'O(d)',
    pseudocode: [
      'sort jobs by profit (descending)',
      'for each job i do',
      '  find latest free slot <= deadline[i]',
      '  if slot found then',
      '    assign job[i] to that slot',
      '  end if',
      'end for',
    ],
  };
}
