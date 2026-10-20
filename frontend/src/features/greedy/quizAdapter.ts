import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion , QuizRevisionData } from '../../engine/types/Quiz';
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

const ANCHORS: Record<GreedyAlgorithmKey, Anchor[]> = {
  activitySelection: [
    {
      prompt: 'Why does choosing the activity that finishes earliest lead to an optimal solution?',
      correct: 'It leaves the maximum remaining time for future activities',
      distractors: [
        'It always has the shortest duration',
        'It always starts earlier than every other activity',
        'It guarantees every activity can be selected',
      ],
      explanation:
        'An earliest-finishing activity leaves the largest possible time window for the remaining compatible activities, which is the key greedy-choice property.',
      hint: 'Think about how much time remains after the chosen activity.',
      concept: 'Greedy choice property',
    },
    {
      prompt: 'What must be true before an activity can be selected in activity selection?',
      correct: 'Its start time must be at or after the last selected activity finishes',
      distractors: [
        'Its finish time must be before every other activity starts',
        'Its duration must be the shortest',
        'Its start time must be earlier than the last selected start time',
      ],
      explanation:
        'The selected activities must not overlap. Therefore the next activity is compatible when its start is at least the finish time of the previously selected activity.',
      hint: 'Compare the next start time with the last selected finish time.',
      concept: 'Compatibility check',
    },
    {
      prompt: 'Why is sorting by start time not the standard greedy rule for activity selection?',
      correct: 'An early start can still leave less room for later compatible activities',
      distractors: [
        'Start times cannot be sorted',
        'Finish times are irrelevant to scheduling',
        'Sorting is never needed in greedy algorithms',
      ],
      explanation:
        'Choosing the earliest-starting activity can block many later activities. Earliest finish is the property that safely maximizes the remaining room.',
      hint: 'Ask which choice preserves the most future options.',
      concept: 'Greedy ordering',
    },
    {
      prompt: 'What is the objective of the classic activity-selection problem?',
      correct: 'Select the maximum number of non-overlapping activities',
      distractors: [
        'Maximize the total duration of selected activities',
        'Minimize the number of activities',
        'Maximize the latest finishing time',
      ],
      explanation:
        'The classic problem asks for the largest compatible set of activities, not the largest total duration or latest finish time.',
      hint: 'Think about how many activities can fit without overlap.',
      concept: 'Optimization objective',
    },
    {
      prompt: 'What is the typical time complexity of activity selection when activities are sorted by finish time?',
      correct: 'O(n log n)',
      distractors: [
        'O(n² log n)',
        'O(log n)',
        'O(2^n)',
      ],
      explanation:
        'Sorting takes O(n log n), followed by a linear scan to select compatible activities, so the total is O(n log n).',
      hint: 'Separate the sorting cost from the scan.',
      concept: 'Complexity',
    },
  ],

  fractionalKnapsack: [
    {
      prompt: 'Why does value-to-weight ratio determine the greedy choice in fractional knapsack?',
      correct: 'It measures how much value is gained from each unit of capacity',
      distractors: [
        'It always identifies the heaviest item',
        'It guarantees the item has the largest total value',
        'It ignores the remaining capacity',
      ],
      explanation:
        'Because fractions are allowed, the best strategy is to fill capacity with the highest value per unit of weight first.',
      hint: 'Think about value gained from one unit of weight.',
      concept: 'Value density',
    },
    {
      prompt: 'What happens when the next item is heavier than the remaining knapsack capacity?',
      correct: 'Take the fraction that exactly fills the remaining capacity',
      distractors: [
        'Always skip the item',
        'Take the whole item and exceed capacity',
        'Restart the algorithm',
      ],
      explanation:
        'Fractional knapsack allows splitting items, so the algorithm takes exactly the fraction that fits the remaining capacity.',
      hint: 'The problem allows partial items.',
      concept: 'Fractional choice',
    },
    {
      prompt: 'Why is the greedy ratio strategy optimal for fractional knapsack but not generally for 0/1 knapsack?',
      correct: 'Fractional items can be split, so every unit of capacity can use the best available ratio',
      distractors: [
        '0/1 knapsack has no weights',
        'Fractional knapsack ignores item values',
        '0/1 knapsack always has equal item ratios',
      ],
      explanation:
        'Splitting items lets fractional knapsack continuously fill capacity with the best value density. In 0/1 knapsack, an item must be taken whole or rejected, so the local ratio choice can block a better combination.',
      hint: 'The ability to take part of an item is the key difference.',
      concept: 'Greedy limitation',
    },
    {
      prompt: 'What is the first major preprocessing step in the fractional knapsack greedy solution?',
      correct: 'Sort items by decreasing value-to-weight ratio',
      distractors: [
        'Sort items by increasing weight only',
        'Sort items by total value only',
        'Sort items alphabetically',
      ],
      explanation:
        'The greedy rule depends on value density, so items are ordered from highest to lowest value-to-weight ratio before filling capacity.',
      hint: 'The algorithm needs the best value per unit of capacity first.',
      concept: 'Greedy ordering',
    },
    {
      prompt: 'What is the typical time complexity of fractional knapsack using sorting?',
      correct: 'O(n log n)',
      distractors: [
        'O(n²)',
        'O(2^n)',
        'O(log n)',
      ],
      explanation:
        'Sorting by ratio costs O(n log n), followed by a linear scan through the items.',
      hint: 'Sorting is the dominant operation.',
      concept: 'Complexity',
    },
  ],

  jobScheduling: [
    {
      prompt: 'What is the main objective of job sequencing with deadlines?',
      correct: 'Maximize total profit while completing each scheduled job before its deadline',
      distractors: [
        'Minimize the number of jobs regardless of profit',
        'Minimize every job’s deadline',
        'Schedule jobs alphabetically',
      ],
      explanation:
        'The goal is to choose profitable jobs and assign feasible one-unit time slots so the total profit is maximized.',
      hint: 'There are two constraints: profit and deadlines.',
      concept: 'Optimization objective',
    },
    {
      prompt: 'Why are jobs considered in decreasing order of profit?',
      correct: 'Higher-profit jobs deserve priority when available slots are limited',
      distractors: [
        'Higher-profit jobs always have earlier deadlines',
        'Profit has no effect on the objective',
        'It guarantees every job will fit',
      ],
      explanation:
        'Since only one job can occupy a slot, prioritizing larger profits helps maximize the total profit collected.',
      hint: 'Imagine there are fewer slots than jobs.',
      concept: 'Greedy choice',
    },
    {
      prompt: 'Why does the standard algorithm place a selected job in the latest available slot before its deadline?',
      correct: 'It preserves earlier slots for jobs with tighter deadlines',
      distractors: [
        'Earlier slots are always more profitable',
        'Latest slots have lower cost',
        'The job must always start at time zero',
      ],
      explanation:
        'Using the latest feasible slot leaves earlier slots available for jobs that may have smaller deadlines.',
      hint: 'Think about preserving flexibility for other jobs.',
      concept: 'Latest-slot placement',
    },
    {
      prompt: 'What happens when no slot is available on or before a job’s deadline?',
      correct: 'The job is skipped',
      distractors: [
        'The deadline is increased',
        'Another job is automatically deleted',
        'The job is scheduled after its deadline',
      ],
      explanation:
        'A job that cannot fit within its deadline cannot be scheduled legally, so the algorithm leaves it out.',
      hint: 'Deadlines are constraints, not suggestions.',
      concept: 'Deadline handling',
    },
    {
      prompt: 'What is the common time complexity of the simple job-sequencing implementation that scans slots?',
      correct: 'O(n²)',
      distractors: [
        'O(log n)',
        'O(n)',
        'O(2^n)',
      ],
      explanation:
        'After sorting jobs by profit, the simple implementation may scan up to O(n) slots for each of O(n) jobs.',
      hint: 'Consider a nested job scan plus slot scan.',
      concept: 'Complexity',
    },
  ],

  huffmanCoding: [
    {
      prompt: 'Why does Huffman coding repeatedly merge the two lowest-frequency nodes?',
      correct: 'Low-frequency symbols can tolerate longer codes without increasing total cost as much',
      distractors: [
        'High-frequency symbols should always be deepest',
        'The two highest-frequency nodes give the shortest tree',
        'Frequency has no effect on code length',
      ],
      explanation:
        'The least-frequent symbols are placed deeper in the tree, while frequent symbols stay closer to the root and receive shorter codes.',
      hint: 'Which symbols should pay the cost of extra code bits?',
      concept: 'Greedy merging',
    },
    {
      prompt: 'What property of Huffman codes prevents one codeword from being a prefix of another?',
      correct: 'The codes form a prefix-free binary tree',
      distractors: [
        'All codewords have equal length',
        'Every character receives the same bit sequence',
        'Codes are sorted alphabetically',
      ],
      explanation:
        'Leaves of the Huffman tree represent codewords, so no leaf-to-root code is a prefix of another leaf code.',
      hint: 'Think about how leaf paths differ in a binary tree.',
      concept: 'Prefix-free coding',
    },
    {
      prompt: 'What data structure is typically used to repeatedly find the two minimum-frequency nodes?',
      correct: 'A min-heap priority queue',
      distractors: [
        'A FIFO queue',
        'A stack',
        'A hash table only',
      ],
      explanation:
        'A min-heap efficiently returns the two smallest frequencies for each merge and allows the combined node to be inserted again.',
      hint: 'You repeatedly need the smallest key.',
      concept: 'Priority queue',
    },
    {
      prompt: 'What happens after Huffman merges two nodes with frequencies f1 and f2?',
      correct: 'A new parent node with frequency f1 + f2 is inserted back',
      distractors: [
        'Both nodes are permanently discarded',
        'Only the larger node is kept',
        'Their frequencies are replaced with zero',
      ],
      explanation:
        'The combined node represents the subtree formed by the two children and becomes a candidate for future merges.',
      hint: 'The tree is built bottom-up.',
      concept: 'Tree construction',
    },
    {
      prompt: 'What is the typical time complexity of Huffman coding with a min-heap?',
      correct: 'O(n log n)',
      distractors: [
        'O(n² log n)',
        'O(n)',
        'O(2^n)',
      ],
      explanation:
        'There are O(n) merge operations, each involving logarithmic heap operations, giving O(n log n).',
      hint: 'Count repeated heap extract/insert operations.',
      concept: 'Complexity',
    },
  ],
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
  const anchors = ANCHORS[algorithm];
  const anchorIndex = steps.length % anchors.length;
  const anchor = anchors[anchorIndex];

  // Deterministic conceptual anchor at step 0.
  const anchorId = `greedy-${algorithm}-anchor-${anchorIndex}`;
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

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<GreedyAlgorithmKey, QuizRevisionData> = {
  activitySelection: {
    description: 'Select maximum number of non-overlapping activities',
    complexity: 'O(n log n) time, O(n) space',
    keyIdea: 'Greedy choice: always pick the activity that finishes earliest',
    watchFor: ['Sort by finish time', 'Overlap check', 'Greedy choice property'],
    quickTip: 'Sort by finish time, then greedily include each activity that starts after the last selected finishes',
    example: 'Activities [(1,4),(3,5),(5,7),(6,9)]: sorted by finish→pick (1,4), skip (3,5) overlaps, pick (5,7), skip (6,9) overlaps → 2 activities.',
  },
  fractionalKnapsack: {
    description: 'Maximize value in a knapsack allowing fractional items',
    complexity: 'O(n log n) time, O(n) space',
    keyIdea: 'Greedily take items with highest value-to-weight ratio first',
    watchFor: ['Ratio sorting', 'Whole vs fractional take', 'Capacity tracking'],
    quickTip: 'Sort by v/w ratio descending—take whole items until one does not fit, then take a fraction',
    example: 'Items [(v=60,w=10),(v=100,w=20),(v=120,w=30)], capacity=50: ratios [6,5,4]. Take 10+20+20/30 of last → value=60+100+80=240.',
  },
  jobScheduling: {
    description: 'Schedule jobs with deadlines and profits to maximize total profit',
    complexity: 'O(n²) time, O(n) space',
    keyIdea: 'Sort by profit descending, assign each job to the latest available slot before its deadline',
    watchFor: ['Profit sorting', 'Slot assignment', 'Deadline handling'],
    quickTip: 'High-profit jobs get priority—place each in the latest valid slot to preserve earlier slots',
    example: 'Jobs [(d=2,p=100),(d=1,p=50),(d=2,p=10)]: sort by profit→(2,100),(1,50),(2,10). Place 100 at slot 2, 50 at slot 1, skip 10. Total=150.',
  },
  huffmanCoding: {
    description: 'Build optimal prefix-free binary codes for data compression',
    complexity: 'O(n log n) time, O(n) space',
    keyIdea: 'Greedily merge the two lowest-frequency nodes into a parent with combined frequency',
    watchFor: ['Priority queue usage', 'Tree construction', 'Code assignment'],
    quickTip: 'Use a min-heap—repeatedly extract two minimums, merge them, and insert the combined node back',
    example: 'Chars {a:5,b:9,c:12}: merge a(5)+b(9)→ab(14); merge c(12)+ab(14)→root(26). Codes: a=10, b=11, c=0.',
  },
};

export function buildRevisionData(key: GreedyAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
