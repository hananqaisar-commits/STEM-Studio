import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion } from '../../engine/types/Quiz';
import { buildOptions } from '../../engine/types/Quiz';

export type GreedyAlgorithmKey = 'activitySelection' | 'fractionalKnapsack' | 'jobScheduling' | 'huffmanCoding';

/* ── Anchor data per algorithm ──────────────────────────────────────────
   One conceptual anchor per algorithm, asked at step 0 where the canvas
   is untouched. Mirrors the Arrays quizAdapter ANCHORS pattern.
   ───────────────────────────────────────────────────────────────────── */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<GreedyAlgorithmKey, Anchor> = {
  activitySelection: {
    prompt: 'Before it starts: why does sorting by finish time produce an optimal set of non-overlapping activities?',
    correct: 'An activity that finishes earliest leaves the most room for subsequent activities',
    distractors: [
      'Sorting by start time guarantees the same optimality',
      'The greedy choice only works if all activities have equal duration',
      'Any sorting order produces the same result since all activities must be checked',
    ],
    explanation:
      'The greedy choice property for activity selection states that picking the activity with the earliest finish time always leads to an optimal solution. This is because an earlier finish leaves the maximum remaining time for future non-overlapping activities.',
    hint: 'Think about which activity leaves the most room for others.',
    concept: 'Greedy choice property',
  },
  fractionalKnapsack: {
    prompt: 'Before it starts: why does sorting by value-to-weight ratio yield the optimal fractional knapsack solution?',
    correct: 'Each unit of capacity should be filled with the highest value-per-unit item available',
    distractors: [
      'Sorting by total value alone is sufficient since higher values dominate',
      'The greedy approach only works for the 0/1 knapsack variant',
      'Weight should be minimized first, then value maximized as a secondary criterion',
    ],
    explanation:
      'The fractional knapsack has optimal substructure: the remaining capacity after taking the best ratio item must itself be filled optimally. Sorting by v/w ratio ensures every unit of capacity is used for the most valuable content possible, and fractions allow full capacity utilization.',
    hint: 'Think about value per unit of weight, not total value.',
    concept: 'Optimal substructure',
  },
  jobScheduling: {
    prompt: 'Before it starts: why should we schedule the highest-profit job first in the greedy job scheduling algorithm?',
    correct: 'High-profit jobs should claim their latest possible slot first, preserving earlier slots for other jobs',
    distractors: [
      'Jobs with the earliest deadline should always be scheduled first regardless of profit',
      'Profit does not influence scheduling order — only deadlines matter',
      'Jobs should be scheduled in the earliest available slot to leave later slots open',
    ],
    explanation:
      'By sorting jobs by profit (descending) and placing each in the latest available slot before its deadline, we maximize total profit. High-profit jobs get priority, and using the latest valid slot preserves earlier slots for other jobs that might need them.',
    hint: 'Think about which jobs you would prioritize if you could only schedule a few.',
    concept: 'Greedy choice property',
  },
  huffmanCoding: {
    prompt: 'Before it starts: why does Huffman coding merge the two lowest-frequency nodes first?',
    correct: 'Low-frequency characters should be deeper in the tree so high-frequency characters get shorter codes',
    distractors: [
      'Merging the highest-frequency nodes first minimizes the total code length',
      'The merge order does not affect the optimality of the encoding',
      'Characters should be merged alphabetically to maintain a canonical tree',
    ],
    explanation:
      'Huffman coding uses a greedy bottom-up approach: merging the two least frequent nodes ensures they end up deepest in the tree with the longest codes. More frequent characters stay closer to the root with shorter codes, minimizing the weighted path length (total encoded size).',
    hint: 'Think about which characters should have the shortest binary codes.',
    concept: 'Greedy merging',
  },
};

/* ── Mid-execution question generators ──────────────────────────────────
   For the ~40% checkpoint, generate an algorithm-specific prediction
   question based on the current step state.
   ───────────────────────────────────────────────────────────────────── */

function getMidQuestion(
  algorithm: GreedyAlgorithmKey,
  step: ArrayStep,
  _stepIndex: number
): QuizQuestion {
  const { variables = {} } = step;

  switch (algorithm) {
    case 'activitySelection': {
      const actStart = typeof variables['activity.start'] === 'number' ? variables['activity.start'] : 0;
      const lastEnd = typeof variables.lastEnd === 'number' ? variables.lastEnd : -1;
      const id = `greedy-${algorithm}-mid`;
      const willSelect = actStart >= lastEnd;
      const built = buildOptions(
        id,
        willSelect
          ? 'This activity is selected because it does not overlap with the last chosen one'
          : 'This activity is skipped because it overlaps with a previously selected activity',
        [
          willSelect
            ? 'This activity is skipped because it overlaps with a previously selected activity'
            : 'This activity is selected because it does not overlap with the last chosen one',
          'All remaining activities are selected at once',
        ]
      );
      return {
        id,
        prompt: `Activity starts at ${actStart}, last selected finished at ${lastEnd}. What happens?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: willSelect
          ? `Start ${actStart} >= last finish ${lastEnd}, so the activity is selected. The greedy strategy picks it without looking ahead.`
          : `Start ${actStart} < last finish ${lastEnd}, so the activity overlaps and is skipped.`,
        hint: 'Compare the activity start time with the last selected activity finish time.',
        concept: 'Overlap check',
        weight: 2,
      };
    }

    case 'fractionalKnapsack': {
      const remaining = typeof variables.remaining === 'number' ? variables.remaining : 0;
      const itemWeight = typeof variables['item.weight'] === 'number' ? variables['item.weight'] : 0;
      const id = `greedy-${algorithm}-mid`;
      const takeWhole = itemWeight <= remaining;
      const built = buildOptions(
        id,
        takeWhole
          ? 'Take the entire item since it fits within remaining capacity'
          : 'Take a fraction of the item to fill remaining capacity exactly',
        [
          takeWhole
            ? 'Take a fraction of the item to fill remaining capacity exactly'
            : 'Take the entire item since it fits within remaining capacity',
          'Skip the item and move to the next one',
        ]
      );
      return {
        id,
        prompt: `Remaining capacity: ${remaining}, item weight: ${itemWeight}. What does the algorithm do?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: takeWhole
          ? `The item weight ${itemWeight} fits within remaining capacity ${remaining}, so it is taken entirely.`
          : `The item weight ${itemWeight} exceeds remaining capacity ${remaining}, so a fraction is taken to fill it exactly.`,
        hint: 'Compare the item weight with the remaining knapsack capacity.',
        concept: 'Fractional take',
        weight: 2,
      };
    }

    case 'jobScheduling': {
      const deadline = typeof variables['job.deadline'] === 'number' ? variables['job.deadline'] : 1;
      const profit = typeof variables['job.profit'] === 'number' ? variables['job.profit'] : 0;
      const id = `greedy-${algorithm}-mid`;
      const built = buildOptions(
        id,
        'Find the latest available slot before or at the deadline',
        [
          'Find the earliest available slot starting from slot 1',
          'Schedule the job in any random available slot',
          'Always place the job exactly at its deadline slot',
        ]
      );
      return {
        id,
        prompt: `Job with deadline ${deadline} and profit ${profit} is being considered. Where should it go?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `The greedy strategy places each job in the latest available slot at or before its deadline. This preserves earlier slots for jobs with earlier deadlines.`,
        hint: 'Think about preserving earlier time slots for other jobs.',
        concept: 'Slot assignment',
        weight: 2,
      };
    }

    case 'huffmanCoding': {
      const node1 = typeof variables.node1 === 'string' ? variables.node1 : '?';
      const node2 = typeof variables.node2 === 'string' ? variables.node2 : '?';
      const freq1 = typeof variables.freq1 === 'number' ? variables.freq1 : 0;
      const freq2 = typeof variables.freq2 === 'number' ? variables.freq2 : 0;
      const id = `greedy-${algorithm}-mid`;
      const built = buildOptions(
        id,
        'Merge them into a parent node with combined frequency',
        [
          'Remove both nodes from the tree permanently',
          'Compare them and keep only the one with higher frequency',
          'Swap their positions in the priority queue',
        ]
      );
      return {
        id,
        prompt: `Merging ${node1} (freq ${freq1}) and ${node2} (freq ${freq2}). What happens next?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `The two lowest-frequency nodes are merged into a parent node with frequency ${freq1 + freq2}. This parent is then added back to the priority queue for future merges.`,
        hint: 'Huffman builds the tree from leaves upward by combining the smallest nodes.',
        concept: 'Tree merge',
        weight: 2,
      };
    }
  }
}

/* ── Main adapter entry point ────────────────────────────────────────── */

export function buildGreedyCheckpoints(
  steps: ArrayStep[],
  algorithm: GreedyAlgorithmKey
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const anchor = ANCHORS[algorithm];

  // Anchor question at step 0
  const anchorId = `greedy-${algorithm}-anchor`;
  const anchorOptions = buildOptions(anchorId, anchor.correct, anchor.distractors);
  checkpoints.push({
    stepIndex: 0,
    question: {
      id: anchorId,
      prompt: anchor.prompt,
      options: anchorOptions.options,
      correctIndex: anchorOptions.correctIndex,
      explanation: anchor.explanation,
      hint: anchor.hint,
      concept: anchor.concept,
      weight: 1,
    },
  });

  // Mid-execution question at ~40% of steps
  if (steps.length > 5) {
    const midIdx = Math.floor(steps.length * 0.4);
    const midStep = steps[midIdx];
    const midQ = getMidQuestion(algorithm, midStep, midIdx);
    checkpoints.push({ stepIndex: midIdx, question: midQ });
  }

  // Late-execution reinforcement at ~75% for larger executions
  if (steps.length > 12) {
    const lateIdx = Math.floor(steps.length * 0.75);
    const lateStep = steps[lateIdx];
    const lateQ = getMidQuestion(algorithm, lateStep, lateIdx);
    lateQ.id = `${lateQ.id}-late`;
    lateQ.weight = 3;
    checkpoints.push({ stepIndex: lateIdx, question: lateQ });
  }

  return checkpoints;
}
