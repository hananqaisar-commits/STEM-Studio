import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion } from '../../engine/types/Quiz';
import { buildOptions } from '../../engine/types/Quiz';

export type HashMapsAlgorithmKey = 'twoSum' | 'duplicateDetect' | 'frequencyMap' | 'subarraySum';

/* ── Anchor data per algorithm ────────────────────────────────────────── */

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<HashMapsAlgorithmKey, Anchor> = {
  twoSum: {
    prompt: 'Before it starts: why does Two Sum use a HashMap instead of a nested loop?',
    correct: 'HashMap gives O(1) complement lookup, reducing total time from O(n²) to O(n)',
    distractors: [
      'HashMap uses less memory than a nested loop approach',
      'HashMap automatically sorts the array for faster searching',
      'HashMap prevents duplicate pairs from being reported',
    ],
    explanation:
      'A brute-force two-sum checks every pair in O(n²). By storing each seen value → index in a HashMap, we can look up the complement (target - current) in O(1), making the overall algorithm O(n).',
    hint: 'Think about how many operations are needed to check "has this value appeared before?"',
    concept: 'O(1) lookup',
  },
  duplicateDetect: {
    prompt: 'Before it starts: what is the key advantage of a HashSet over sorting for duplicate detection?',
    correct: 'HashSet detects duplicates in one O(n) pass without modifying the array',
    distractors: [
      'HashSet always uses less memory than sorting',
      'HashSet finds all duplicates, not just the first one',
      'HashSet works only on sorted arrays',
    ],
    explanation:
      'Sorting takes O(n log n) and rearranges the array. A HashSet detects the first duplicate in O(n) expected time while preserving the original order, and stops as soon as a repeat is found.',
    hint: 'Sorting changes the array and takes more than linear time.',
    concept: 'HashSet vs sorting',
  },
  frequencyMap: {
    prompt: 'Before it starts: what happens in a HashMap when two different keys hash to the same bucket?',
    correct: 'A collision occurs — typically resolved by chaining or open addressing',
    distractors: [
      'The second key overwrites the first one',
      'The HashMap throws an error',
      'Both keys are merged into a single entry',
    ],
    explanation:
      'Hash collisions are inevitable when the key space exceeds the bucket count. Common strategies are chaining (linked list per bucket) and open addressing (probe for next empty slot). Modern HashMaps handle this transparently.',
    hint: 'Think about what happens when hash(key1) === hash(key2).',
    concept: 'Collision handling',
  },
  subarraySum: {
    prompt: 'Before it starts: why store prefix sums in a HashMap rather than in an array?',
    correct: 'HashMap allows O(1) lookup of whether a specific prefix sum was seen before, regardless of its index',
    distractors: [
      'Arrays cannot store prefix sums',
      'HashMap automatically sorts the prefix sums for binary search',
      'HashMap prevents integer overflow in prefix sums',
    ],
    explanation:
      'We need to answer "has this exact prefix sum been seen before?" in O(1). A HashMap maps each prefix sum value to the earliest index where it appeared, enabling constant-time lookups as we scan left to right.',
    hint: 'What data structure gives O(1) "does this value exist?" regardless of the value range?',
    concept: 'HashMap vs array for lookup',
  },
};

/* ── Mid-execution question generators ────────────────────────────────── */

function getMidQuestion(
  algorithm: HashMapsAlgorithmKey,
  step: ArrayStep,
  _stepIndex: number
): QuizQuestion {
  const { array, comparingIndices = [], variables = {} } = step;

  switch (algorithm) {
    case 'twoSum': {
      const complement = typeof variables.complement === 'number' ? variables.complement : 0;
      const mapEntriesStr = typeof variables.mapEntries === 'string' ? variables.mapEntries : '';
      const hasComplement = mapEntriesStr.split(',').some((p) => {
        const [k] = p.split(':');
        return k?.trim() === String(complement);
      });
      const id = `hashMaps-${algorithm}-mid`;
      const built = buildOptions(
        id,
        hasComplement
          ? 'The complement exists in the map — a valid pair is found'
          : 'The complement is not in the map — add the current element and continue',
        [
          hasComplement
            ? 'The complement is not in the map — add the current element and continue'
            : 'The complement exists in the map — a valid pair is found',
          'The algorithm terminates because the target is unreachable',
        ]
      );
      return {
        id,
        prompt: `Looking for complement ${complement} in the HashMap. What happens at this step?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: hasComplement
          ? `The complement ${complement} is already stored, meaning we previously saw an element that together with the current one sums to the target.`
          : `The complement ${complement} has not been seen yet, so we insert the current value into the HashMap and move to the next index.`,
        hint: 'Check whether the complement key appears in the current HashMap entries.',
        concept: 'Complement lookup',
        weight: 2,
      };
    }

    case 'duplicateDetect': {
      const currentVal = comparingIndices.length > 0 ? array[comparingIndices[0]] ?? 0 : 0;
      const setEntriesStr = typeof variables.setEntries === 'string' ? variables.setEntries : '';
      const inSet = setEntriesStr.split(',').map((s) => s.trim()).includes(String(currentVal));
      const id = `hashMaps-${algorithm}-mid`;
      const built = buildOptions(
        id,
        inSet
          ? 'The element is already in the set — duplicate detected, algorithm stops'
          : 'The element is not in the set — add it and continue scanning',
        [
          inSet
            ? 'The element is not in the set — add it and continue scanning'
            : 'The element is already in the set — duplicate detected, algorithm stops',
          'The set is cleared and scanning restarts from index 0',
        ]
      );
      return {
        id,
        prompt: `Checking element ${currentVal} against the HashSet. What is the outcome?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: inSet
          ? `${currentVal} is already present in the set, so this is the first duplicate and the algorithm terminates.`
          : `${currentVal} has not been seen before, so it is added to the set and the scan continues.`,
        hint: 'Does the current element appear in the set entries shown on screen?',
        concept: 'Membership check',
        weight: 2,
      };
    }

    case 'frequencyMap': {
      const currentVal = comparingIndices.length > 0 ? array[comparingIndices[0]] ?? 0 : 0;
      const mapEntriesStr = typeof variables.mapEntries === 'string' ? variables.mapEntries : '';
      const existingEntry = mapEntriesStr.split(',').find((p) => {
        const [k] = p.split(':');
        return k?.trim() === String(currentVal);
      });
      const isNew = !existingEntry;
      const id = `hashMaps-${algorithm}-mid`;
      const built = buildOptions(
        id,
        isNew
          ? 'Create a new key in the map with count 1'
          : 'Increment the existing count for this key by 1',
        [
          isNew
            ? 'Increment the existing count for this key by 1'
            : 'Create a new key in the map with count 1',
          'Remove this key from the map',
        ]
      );
      return {
        id,
        prompt: `Processing element ${currentVal}. How does the frequency map change?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: isNew
          ? `${currentVal} has not been seen before, so a new entry is created with frequency 1.`
          : `${currentVal} is already in the map, so its count is incremented from the previous value.`,
        hint: 'Look at the HashMap: does a key for this value already exist?',
        concept: 'Frequency update',
        weight: 2,
      };
    }

    case 'subarraySum': {
      const complement = typeof variables.complement === 'number' ? variables.complement : 0;
      const runningSum = typeof variables.runningSum === 'number' ? variables.runningSum : 0;
      const mapEntriesStr = typeof variables.mapEntries === 'string' ? variables.mapEntries : '';
      const hasComplement = mapEntriesStr.split(',').some((p) => {
        const [k] = p.split(':');
        return k?.trim() === String(complement);
      });
      const id = `hashMaps-${algorithm}-mid`;
      const built = buildOptions(
        id,
        hasComplement
          ? 'A subarray summing to the target has been found'
          : 'Store the current prefix sum in the map and continue',
        [
          hasComplement
            ? 'Store the current prefix sum in the map and continue'
            : 'A subarray summing to the target has been found',
          'Reset the running sum to zero and restart',
        ]
      );
      return {
        id,
        prompt: `runningSum = ${runningSum}, looking for complement ${complement} in prefix map. What happens?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: hasComplement
          ? `The complement ${complement} is in the prefix map, meaning the subarray between that stored index + 1 and the current index sums exactly to the target.`
          : `The complement ${complement} has not been seen as a prefix sum, so we store the current runningSum (${runningSum}) and move forward.`,
        hint: 'runningSum - target = complement. Is that complement already a key in the prefix map?',
        concept: 'Prefix sum lookup',
        weight: 2,
      };
    }
  }
}

/* ── Main adapter entry point ─────────────────────────────────────────── */

export function buildHashMapsCheckpoints(
  steps: ArrayStep[],
  algorithm: HashMapsAlgorithmKey
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const anchor = ANCHORS[algorithm];

  // Anchor question at step 0
  const anchorId = `hashMaps-${algorithm}-anchor`;
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
