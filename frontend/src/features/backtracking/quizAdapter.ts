import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion , QuizRevisionData } from '../../engine/types/Quiz';
import { buildOptions } from '../../engine/types/Quiz';

type BacktrackingAlgorithmKey = 'subsets' | 'permutations' | 'nQueens' | 'combinationSum';

/* ── Anchor data per algorithm ────────────────────────────────────── */
interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<BacktrackingAlgorithmKey, Anchor[]> = {
  subsets: [
    {
      prompt: 'How many subsets does a set of n elements have?',
      correct: '2^n — each element is independently included or excluded',
      distractors: [
        'n^2 — every pair forms a subset',
        'n! — every ordering is a distinct subset',
        '2n — each element contributes exactly two subsets',
      ],
      explanation:
        'Every element has two independent choices: include it or exclude it. With n elements, that gives 2^n possible subsets.',
      hint: 'Think about two choices for every element.',
      concept: 'Solution count',
    },
    {
      prompt: 'What is the main branching decision for generating all subsets?',
      correct: 'Include the current element or exclude it',
      distractors: [
        'Swap the current element with every other element',
        'Choose only the larger of two elements',
        'Always include the current element',
      ],
      explanation:
        'Subset generation builds a binary decision tree. At each level, the current element is either included or skipped.',
      hint: 'Each element creates two branches.',
      concept: 'Branching',
    },
    {
      prompt: 'When does the subset-generation recursion reach a base case?',
      correct: 'After every element has been decided',
      distractors: [
        'When the current subset has one element',
        'When the array becomes sorted',
        'When the subset sum reaches zero',
      ],
      explanation:
        'A complete subset is formed after include/exclude decisions have been made for all n elements.',
      hint: 'Ask when there are no undecided elements left.',
      concept: 'Base case',
    },
    {
      prompt: 'What is the time complexity of generating all subsets if each subset is copied/output?',
      correct: 'O(2^n · n)',
      distractors: [
        'O(n)',
        'O(n^2)',
        'O(n!)',
      ],
      explanation:
        'There are 2^n subsets, and writing each subset can take O(n) time in the worst case, giving O(2^n · n).',
      hint: 'Count both the number of subsets and the cost of recording one.',
      concept: 'Time complexity',
    },
    {
      prompt: 'What does backtracking do after exploring the include branch for a subset?',
      correct: 'Undo the choice and explore the exclude branch',
      distractors: [
        'Sort the current subset permanently',
        'Restart the entire recursion from the root',
        'Delete the input array',
      ],
      explanation:
        'Backtracking restores the previous state so the alternative decision can be explored without carrying the old choice forward.',
      hint: 'Backtracking means restore state and try another branch.',
      concept: 'State restoration',
    },
  ],

  permutations: [
    {
      prompt: 'How many distinct permutations can n distinct elements have?',
      correct: 'n!',
      distractors: [
        '2^n',
        'n^2',
        'n + 1',
      ],
      explanation:
        'There are n choices for the first position, n-1 for the second, and so on, giving n × (n-1) × ... × 1 = n!.',
      hint: 'Count the decreasing number of choices for each position.',
      concept: 'Permutation count',
    },
    {
      prompt: 'What does one recursion level represent when generating permutations by swapping?',
      correct: 'Fixing one position in the permutation',
      distractors: [
        'Removing one element permanently',
        'Sorting the entire array',
        'Finding the maximum element',
      ],
      explanation:
        'At each level, the algorithm chooses one remaining element for the current position and recurses to the next position.',
      hint: 'Each recursion depth corresponds to one position.',
      concept: 'Position fixing',
    },
    {
      prompt: 'Why must a permutation algorithm restore the array after exploring a swap?',
      correct: 'To allow the next branch to start from the original state',
      distractors: [
        'To make the array sorted',
        'To reduce the array length',
        'To prevent recursion from reaching a base case',
      ],
      explanation:
        'Undoing the swap restores the state so another candidate can be placed in that position without interference from the previous branch.',
      hint: 'Every branch should see the correct starting state.',
      concept: 'Backtracking',
    },
    {
      prompt: 'What is the usual time complexity of generating and outputting all permutations?',
      correct: 'O(n! · n)',
      distractors: [
        'O(n)',
        'O(2^n)',
        'O(n^2)',
      ],
      explanation:
        'There are n! permutations and recording each one can take O(n), producing O(n! · n).',
      hint: 'How many permutations exist, and how much does it cost to output one?',
      concept: 'Time complexity',
    },
    {
      prompt: 'What should happen when the recursion reaches the final position of a permutation?',
      correct: 'Record/output the complete permutation',
      distractors: [
        'Delete the last element',
        'Restart from position zero immediately',
        'Sort the completed permutation',
      ],
      explanation:
        'When all positions have been fixed, the current array represents one complete permutation and can be recorded as a solution.',
      hint: 'At the leaf of the decision tree, what do you have?',
      concept: 'Base case',
    },
  ],

  nQueens: [
    {
      prompt: 'What makes a queen placement valid in N-Queens?',
      correct: 'No previously placed queen attacks the new queen',
      distractors: [
        'The new queen must be adjacent to another queen',
        'The new queen must share a diagonal with a queen',
        'Only the row needs to be checked',
      ],
      explanation:
        'A queen attacks along rows, columns, and diagonals. Since we usually place one queen per row, previously occupied columns and both diagonal directions must be safe.',
      hint: 'Think about every direction a chess queen can attack.',
      concept: 'Constraint checking',
    },
    {
      prompt: 'Why can the standard row-by-row N-Queens algorithm skip explicit row checks?',
      correct: 'Because it places exactly one queen in each row',
      distractors: [
        'Queens cannot attack horizontally',
        'Rows are automatically sorted',
        'The board contains no repeated rows',
      ],
      explanation:
        'The recursion places one queen in the current row only once, so two queens cannot occupy the same row.',
      hint: 'How many queens does the algorithm place in one row?',
      concept: 'Row invariant',
    },
    {
      prompt: 'What is the purpose of pruning an invalid N-Queens branch?',
      correct: 'Avoid exploring completions that can no longer become valid solutions',
      distractors: [
        'Increase the board size',
        'Guarantee every branch becomes a solution',
        'Sort the queen positions',
      ],
      explanation:
        'Once a queen conflicts with an earlier placement, no deeper choices can repair that placement, so the branch is abandoned immediately.',
      hint: 'An invalid partial board cannot become valid by adding more queens elsewhere.',
      concept: 'Pruning',
    },
    {
      prompt: 'Which checks are central when testing a new queen position?',
      correct: 'Column and both diagonal conflicts with existing queens',
      distractors: [
        'Only the previous row',
        'Only the nearest column',
        'Array order and element frequency',
      ],
      explanation:
        'With one queen per row, the essential checks are whether another queen occupies the same column or either diagonal.',
      hint: 'Rows are already controlled by the recursion structure.',
      concept: 'Conflict types',
    },
    {
      prompt: 'What happens when an entire row has no valid column remaining?',
      correct: 'Backtrack to the previous row and move that queen',
      distractors: [
        'Add another row to the board',
        'Accept the current board as a solution',
        'Restart the program without changing state',
      ],
      explanation:
        'No valid placement means the current partial solution is a dead end. The algorithm returns to the previous decision and tries another column.',
      hint: 'A dead end requires undoing an earlier choice.',
      concept: 'Backtracking trigger',
    },
  ],

  combinationSum: [
    {
      prompt: 'What does remainder = 0 mean in Combination Sum?',
      correct: 'The current combination exactly reaches the target',
      distractors: [
        'The combination is impossible',
        'The candidate list must be sorted',
        'The recursion must restart from the root',
      ],
      explanation:
        'The remainder represents how much target value is still needed. Zero means the current combination sums exactly to the target.',
      hint: 'Remainder means target minus the current sum.',
      concept: 'Base case',
    },
    {
      prompt: 'Why can a positive-remainder branch be pruned when the chosen candidate exceeds the remainder?',
      correct: 'Adding another positive value cannot bring the sum back down',
      distractors: [
        'All candidates are automatically equal',
        'The algorithm requires a negative candidate',
        'The target becomes larger',
      ],
      explanation:
        'With positive candidates, once a candidate is larger than the remaining required sum, continuing that branch would only make the sum exceed the target.',
      hint: 'Can adding positive numbers reduce an already-too-large partial sum?',
      concept: 'Pruning',
    },
    {
      prompt: 'What is the key difference between choosing and skipping a candidate in Combination Sum?',
      correct: 'Choose adds it to the current combination; skip moves to another candidate',
      distractors: [
        'Choose deletes it; skip sorts it',
        'Both actions always add the candidate',
        'Both actions reset the entire recursion',
      ],
      explanation:
        'The decision tree explores whether to include a candidate and, depending on the implementation, whether that candidate can be reused before moving forward.',
      hint: 'Track what changes in the current combination.',
      concept: 'Branch decision',
    },
    {
      prompt: 'Why does backtracking remove a chosen candidate before exploring another branch?',
      correct: 'To restore the partial combination for the alternative branch',
      distractors: [
        'To permanently discard the candidate',
        'To make the target larger',
        'To reduce recursion depth to zero',
      ],
      explanation:
        'The current choice belongs only to the branch being explored. Removing it restores the state before trying another candidate.',
      hint: 'Backtracking means undo the previous branch-specific choice.',
      concept: 'State restoration',
    },
    {
      prompt: 'What is a key property of the classic Combination Sum problem that enables repeated use of a candidate?',
      correct: 'A candidate may be chosen multiple times while building a combination',
      distractors: [
        'Every candidate must be used exactly once',
        'Candidates must form a permutation',
        'Each candidate can only appear in the first position',
      ],
      explanation:
        'In the classic version, the same candidate can be selected repeatedly as long as the resulting sum does not exceed the target.',
      hint: 'Ask whether a successful combination like [2,2,3] is allowed when 2 is a candidate.',
      concept: 'Candidate reuse',
    },
  ],
};

/* ── Mid-execution question generators ────────────────────────────── */
function getMidQuestion(
  algorithm: BacktrackingAlgorithmKey,
  step: ArrayStep,
  _stepIndex: number,
): QuizQuestion {
  const { variables = {} } = step;

  switch (algorithm) {
    case 'subsets': {
      const level = typeof variables.level === 'number' ? variables.level : 0;
      const decision = (variables.decision as string) || '';
      const id = `backtracking-${algorithm}-mid`;
      const isInclude = decision.includes('Include');
      const built = buildOptions(
        id,
        isInclude
          ? 'The element at this level is added to the current subset'
          : 'The element at this level is excluded from the current subset',
        [
          isInclude
            ? 'The element at this level is excluded from the current subset'
            : 'The element at this level is added to the current subset',
          'The algorithm backtracks to the previous level',
          'The current subset is recorded as a final solution',
        ],
      );
      return {
        id,
        prompt: `At level ${level}, the decision is "${decision}". What happens to the current subset?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: isInclude
          ? `In the include branch, arr[${level}] is appended to the current subset before recursing deeper.`
          : `In the exclude branch, arr[${level}] is skipped, leaving the current subset unchanged.`,
        hint: 'Each level decides one element — include or exclude.',
        concept: 'Branch decision',
        weight: 2,
      };
    }

    case 'permutations': {
      const level = typeof variables.level === 'number' ? variables.level : 0;
      const fixedPrefix = (variables.fixedPrefix as string) || '[]';
      const id = `backtracking-${algorithm}-mid`;
      const built = buildOptions(
        id,
        'Fix the current position by swapping a remaining element into it',
        [
          'Remove the current element from the array permanently',
          'Sort the remaining elements before choosing',
          'Skip this position and move to the next',
        ],
      );
      return {
        id,
        prompt: `At level ${level}, fixed prefix is ${fixedPrefix}. What does the algorithm do next?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `At level ${level}, the algorithm fixes position ${level} by choosing one of the remaining elements (via swapping) and recurses to fix the next position.`,
        hint: 'In permutation generation, each level fixes one position.',
        concept: 'Position fixing',
        weight: 2,
      };
    }

    case 'nQueens': {
      const level = typeof variables.level === 'number' ? variables.level : 0;
      const hasConflict = variables.conflict === true;
      const id = `backtracking-${algorithm}-mid`;
      const built = buildOptions(
        id,
        hasConflict
          ? 'Skip this column and try the next one in the same row'
          : 'Place the queen and recurse to the next row',
        [
          hasConflict
            ? 'Place the queen and recurse to the next row'
            : 'Skip this column and try the next one in the same row',
          'Remove all previously placed queens and restart',
          'Move the conflicting queen to a different row',
        ],
      );
      return {
        id,
        prompt: `Row ${level}: ${hasConflict ? 'conflict detected' : 'valid placement found'}. What does the algorithm do?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: hasConflict
          ? 'A conflict means this column is attacked by an existing queen. The algorithm skips it and tries the next column in the same row.'
          : 'A valid placement means no conflicts, so the queen is placed and the algorithm recurses to the next row.',
        hint: 'What triggers backtracking in N-Queens?',
        concept: 'Conflict handling',
        weight: 2,
      };
    }

    case 'combinationSum': {
      const remainder = typeof variables.remainder === 'number' ? variables.remainder : 0;
      const id = `backtracking-${algorithm}-mid`;
      const built = buildOptions(
        id,
        remainder === 0
          ? 'Record the current combination as a valid solution'
          : 'Try picking the current candidate or skip to the next one',
        [
          remainder === 0
            ? 'Try picking the current candidate or skip to the next one'
            : 'Record the current combination as a valid solution',
          'Discard the combination and start over',
          'Double the current combination and check again',
        ],
      );
      return {
        id,
        prompt: `Remainder = ${remainder}. What does the algorithm do at this point?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: remainder === 0
          ? 'A remainder of 0 means the current combination sums exactly to the target — it is a valid solution.'
          : 'With a positive remainder, the algorithm tries to pick another candidate (if it fits) or skips to the next candidate index.',
        hint: 'What does a remainder of 0 signify?',
        concept: 'Base case',
        weight: 2,
      };
    }
  }
}

/* ── Main adapter entry point ─────────────────────────────────────── */
export function buildBacktrackingCheckpoints(
  steps: ArrayStep[],
  algorithm: BacktrackingAlgorithmKey,
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  // One fixed conceptual question at step 0.
  // Selection is deterministic so the quiz is reproducible.
  const anchors = ANCHORS[algorithm];
  const anchorIndex = steps.length % anchors.length;
  const anchor = anchors[anchorIndex];

  const anchorId = `backtracking-${algorithm}-anchor-${anchorIndex}`;
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

const REVISION_DATA: Record<BacktrackingAlgorithmKey, QuizRevisionData> = {
  subsets: {
    description: 'Generate all subsets of a given set',
    complexity: 'O(2^n · n) time, O(n) space',
    keyIdea: 'Each element has two choices: include or exclude—forming a binary decision tree',
    watchFor: ['Include/exclude branching', 'Base case (all elements decided)', 'Subset recording'],
    quickTip: 'At each level decide one element—recurse with it included, then backtrack and recurse without it',
    example: 'Set [1,2,3]: decision tree produces [], [3], [2], [2,3], [1], [1,3], [1,2], [1,2,3] — 8 subsets total.',
  },
  permutations: {
    description: 'Generate all permutations of an array',
    complexity: 'O(n! · n) time, O(n) space',
    keyIdea: 'Fix each position by trying every remaining element, then recurse to fix the next position',
    watchFor: ['Position fixing', 'Swap/restore pattern', 'Used array tracking'],
    quickTip: 'Use a boolean array to track which elements are used, or swap elements in place to avoid extra space',
    example: 'Array [1,2,3]: fix pos 0→1, fix pos 1→2, fix pos 2→3 gives [1,2,3]; backtrack, swap pos 1→3 gives [1,3,2]; etc.',
  },
  nQueens: {
    description: 'Place n queens on an n×n board so no two attack each other',
    complexity: 'O(n!) time, O(n²) space',
    keyIdea: 'Place one queen per row, checking column and diagonal conflicts with placed queens',
    watchFor: ['Conflict checking', 'Row-by-row placement', 'Backtrack on failure'],
    quickTip: 'Use sets to track occupied columns and both diagonals—row is implicit from recursion depth',
    example: 'N=4: place Q at (0,1), (1,3), (2,0), (3,2) → one of 2 valid solutions for a 4×4 board.',
  },
  combinationSum: {
    description: 'Find all combinations that sum to a target',
    complexity: 'O(2^t) time, O(t) space',
    keyIdea: 'Try each candidate, recurse with reduced remainder; prune when remainder goes negative',
    watchFor: ['Pruning condition', 'Reuse allowance', 'Remainder tracking'],
    quickTip: 'If candidates can be reused, recurse from the same index; otherwise advance to next index',
    example: 'Candidates [2,3,6,7], target=7: valid combinations are [2,2,3] and [7]. Remainder tracks what is still needed.',
  },
};

export function buildRevisionData(key: BacktrackingAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
