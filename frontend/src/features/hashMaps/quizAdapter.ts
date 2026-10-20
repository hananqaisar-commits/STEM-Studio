import type { ArrayStep } from '../../engine/types/Step';
import type { QuizCheckpoint, QuizQuestion , QuizRevisionData } from '../../engine/types/Quiz';
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

const ANCHORS: Record<HashMapsAlgorithmKey, Anchor[]> = {
  twoSum: [
    {
      prompt: 'Why is a HashMap used in the optimized Two Sum solution?',
      correct: 'It gives expected O(1) lookup for the needed complement',
      distractors: [
        'It automatically sorts the array',
        'It uses less memory than brute force',
        'It guarantees there are no duplicate values',
      ],
      explanation:
        'The HashMap stores previously seen values so the complement can be checked in expected O(1), reducing the overall approach from O(n²) to O(n).',
      hint: 'Think about how quickly a previously seen value can be found.',
      concept: 'O(1) lookup',
    },
    {
      prompt: 'For current value x and target T, what value should Two Sum search for?',
      correct: 'T - x',
      distractors: [
        'T + x',
        'x - T',
        'T * x',
      ],
      explanation:
        'If x + y = T, then the required partner is y = T - x.',
      hint: 'Rearrange x + y = T.',
      concept: 'Complement calculation',
    },
    {
      prompt: 'What does the HashMap usually store in the standard Two Sum solution?',
      correct: 'Previously seen value mapped to its index',
      distractors: [
        'Only the sorted values',
        'Each value mapped to its frequency only',
        'Only the target value',
      ],
      explanation:
        'The map stores each previously seen value together with its index so the pair of indices can be returned when the complement is found.',
      hint: 'The final answer needs positions, not just values.',
      concept: 'Map contents',
    },
    {
      prompt: 'Why is the current value usually checked before it is inserted into the map?',
      correct: 'To avoid using the same array element twice',
      distractors: [
        'To keep the map sorted',
        'To reduce the array size',
        'To guarantee the target is positive',
      ],
      explanation:
        'Checking first ensures the complement must come from a previously seen element rather than pairing the current element with itself.',
      hint: 'Consider what would happen if the current value were already inserted.',
      concept: 'Correct pair formation',
    },
    {
      prompt: 'What is the expected time complexity of HashMap-based Two Sum?',
      correct: 'O(n)',
      distractors: [
        'O(n²)',
        'O(log n)',
        'O(2^n)',
      ],
      explanation:
        'The array is scanned once and each HashMap lookup/insertion is expected O(1), giving O(n) expected time.',
      hint: 'One pass plus constant-time average hash operations.',
      concept: 'Time complexity',
    },
    {
      prompt: 'What is the typical extra space complexity of HashMap-based Two Sum?',
      correct: 'O(n)',
      distractors: [
        'O(1)',
        'O(log n)',
        'O(n²)',
      ],
      explanation:
        'In the worst case, the map stores almost every array element, so auxiliary space is O(n).',
      hint: 'How many values might the map need to remember?',
      concept: 'Space complexity',
    },
    {
      prompt: 'What does finding the complement in the map mean?',
      correct: 'A valid pair summing to the target has been found',
      distractors: [
        'The array must be sorted next',
        'The current value should be deleted',
        'The search must restart from index 0',
      ],
      explanation:
        'If target - current is already present, the earlier value and current value sum to the target.',
      hint: 'Substitute the complement into the target equation.',
      concept: 'Pair discovery',
    },
    {
      prompt: 'Why does the brute-force Two Sum approach take O(n²)?',
      correct: 'It checks pairs of elements',
      distractors: [
        'It sorts the array twice',
        'It uses a hash table',
        'It scans only one element',
      ],
      explanation:
        'The brute-force method considers many pairs, producing quadratic time in the number of elements.',
      hint: 'Think about nested loops over the array.',
      concept: 'Brute-force comparison',
    },
    {
      prompt: 'Does the HashMap-based Two Sum approach require the array to be sorted?',
      correct: 'No',
      distractors: [
        'Yes, always',
        'Only when the target is negative',
        'Only for arrays with duplicates',
      ],
      explanation:
        'The HashMap provides direct complement lookup, so the input does not need to be sorted.',
      hint: 'Hashing replaces the need for ordered searching here.',
      concept: 'Input requirement',
    },
    {
      prompt: 'What is the main trade-off of the optimized Two Sum solution?',
      correct: 'It uses extra memory to reduce lookup time',
      distractors: [
        'It uses more time to save memory',
        'It requires sorting first',
        'It gives up correctness for speed',
      ],
      explanation:
        'The optimized solution trades O(n) extra space for expected O(n) time instead of O(n²) brute force.',
      hint: 'Compare time and auxiliary space.',
      concept: 'Time-space trade-off',
    },
  ],

  duplicateDetect: [
    {
      prompt: 'What is the main purpose of the HashSet in duplicate detection?',
      correct: 'Track values that have already been seen',
      distractors: [
        'Sort the input values',
        'Store each value with its index',
        'Count the target sum',
      ],
      explanation:
        'A HashSet provides membership tracking: values already seen are stored so repeated values can be detected.',
      hint: 'The question is simply: have I seen this value before?',
      concept: 'Set membership',
    },
    {
      prompt: 'What does finding an element already in the HashSet mean?',
      correct: 'A duplicate exists',
      distractors: [
        'The array is sorted',
        'The current value is the maximum',
        'The scan must restart',
      ],
      explanation:
        'If the current value is already present, it has appeared earlier in the array, so a duplicate is proven.',
      hint: 'What does membership mean in a seen-values set?',
      concept: 'Duplicate detection',
    },
    {
      prompt: 'What is the expected time complexity of one-pass HashSet duplicate detection?',
      correct: 'O(n)',
      distractors: [
        'O(n²)',
        'O(log n)',
        'O(2^n)',
      ],
      explanation:
        'Each element is checked and inserted using expected constant-time hash operations.',
      hint: 'One pass with average O(1) membership checks.',
      concept: 'Time complexity',
    },
    {
      prompt: 'What is the typical extra space complexity of HashSet duplicate detection?',
      correct: 'O(n)',
      distractors: [
        'O(1)',
        'O(log n)',
        'O(n²)',
      ],
      explanation:
        'The set can contain up to n distinct values in the worst case.',
      hint: 'How many unique values might be stored?',
      concept: 'Space complexity',
    },
    {
      prompt: 'Why can duplicate detection stop immediately after finding a repeated value?',
      correct: 'One duplicate is enough to prove the array contains duplicates',
      distractors: [
        'The entire array has already been processed',
        'The set automatically sorts itself',
        'The remaining values are guaranteed to be unique',
      ],
      explanation:
        'The problem only asks whether a duplicate exists, so the first repeated value is sufficient evidence.',
      hint: 'Think about what the boolean result needs.',
      concept: 'Early termination',
    },
    {
      prompt: 'Does HashSet-based duplicate detection require sorting the array first?',
      correct: 'No',
      distractors: [
        'Yes, always',
        'Only when negative values exist',
        'Only when the array has even length',
      ],
      explanation:
        'HashSet membership checks can detect repetition directly without rearranging the input.',
      hint: 'Hashing replaces ordered adjacency checks.',
      concept: 'Sorting requirement',
    },
    {
      prompt: 'What is a key advantage of HashSet over sorting for duplicate detection?',
      correct: 'Expected O(n) detection without rearranging the input',
      distractors: [
        'It always uses less memory',
        'It guarantees worst-case O(1) lookup',
        'It sorts the array automatically',
      ],
      explanation:
        'HashSet can detect duplicates in expected linear time while preserving the original array order.',
      hint: 'Compare expected runtime and input mutation.',
      concept: 'HashSet vs sorting',
    },
    {
      prompt: 'What should happen when the current value is not already in the set?',
      correct: 'Insert it and continue scanning',
      distractors: [
        'Remove the previous value',
        'Restart from index 0',
        'Sort the remaining values',
      ],
      explanation:
        'An unseen value becomes part of the set of values already encountered.',
      hint: 'The set represents everything seen so far.',
      concept: 'Set update',
    },
    {
      prompt: 'What is a hash collision?',
      correct: 'Different keys map to the same hash-table bucket or location',
      distractors: [
        'Two array elements are equal',
        'A key is automatically deleted',
        'The entire table becomes sorted',
      ],
      explanation:
        'Different keys can produce the same hash location, so the implementation needs a collision-resolution strategy.',
      hint: 'Think about two different keys receiving the same destination.',
      concept: 'Collision handling',
    },
    {
      prompt: 'Why is a HashSet preferred over a HashMap when only duplicate membership matters?',
      correct: 'Only membership is needed, so associated key-value data is unnecessary',
      distractors: [
        'HashSet always has O(1) worst-case time',
        'HashMap cannot store integers',
        'HashSet requires sorting',
      ],
      explanation:
        'A set models exactly what the algorithm needs: whether a value has already been seen.',
      hint: 'Use the simplest structure that represents the required information.',
      concept: 'Set vs map',
    },
  ],

  frequencyMap: [
    {
      prompt: 'What does a frequency map store?',
      correct: 'Each value mapped to its occurrence count',
      distractors: [
        'Only the first index of each value',
        'Only the largest value',
        'A sorted copy of the array',
      ],
      explanation:
        'The key is the value and the associated value is how many times that key has appeared.',
      hint: 'Think value → count.',
      concept: 'Frequency representation',
    },
    {
      prompt: 'What should happen on the first occurrence of a value?',
      correct: 'Create the key with count 1',
      distractors: [
        'Delete the key',
        'Set the count to zero',
        'Ignore the value permanently',
      ],
      explanation:
        'A value seen for the first time has occurred exactly once.',
      hint: 'Start the counter at one for a new key.',
      concept: 'Initialization',
    },
    {
      prompt: 'What should happen when the same key is encountered again?',
      correct: 'Increment its count',
      distractors: [
        'Delete the existing entry',
        'Reset its count to one',
        'Create a second identical key',
      ],
      explanation:
        'Every repeated occurrence contributes one more to that value’s frequency.',
      hint: 'The map tracks how many times the value appeared.',
      concept: 'Count update',
    },
    {
      prompt: 'What is the expected time complexity for building a frequency map?',
      correct: 'O(n)',
      distractors: [
        'O(n²)',
        'O(log n)',
        'O(2^n)',
      ],
      explanation:
        'Each element causes one expected O(1) hash lookup/update, producing O(n) expected time.',
      hint: 'Process each element once.',
      concept: 'Time complexity',
    },
    {
      prompt: 'What is the typical extra space complexity of a frequency map?',
      correct: 'O(k), where k is the number of distinct values',
      distractors: [
        'O(1) regardless of input',
        'O(n²)',
        'O(log n) always',
      ],
      explanation:
        'Only distinct keys are stored, so space depends on the number of unique values.',
      hint: 'Not every array element needs a separate key.',
      concept: 'Space complexity',
    },
    {
      prompt: 'Why is a HashMap useful for frequency counting?',
      correct: 'It provides expected O(1) average lookup and update',
      distractors: [
        'It sorts all values automatically',
        'It guarantees zero collisions',
        'It removes duplicate values',
      ],
      explanation:
        'A frequency count needs repeated key lookup and update, which hashing supports efficiently on average.',
      hint: 'Think lookup plus increment.',
      concept: 'HashMap efficiency',
    },
    {
      prompt: 'What does the map entry {7: 3} represent?',
      correct: 'The value 7 occurred three times',
      distractors: [
        'The value 3 occurred seven times',
        'Index 7 contains value 3',
        'Seven different values have been seen',
      ],
      explanation:
        'The key is the value being counted and the mapped number is its frequency.',
      hint: 'Read the entry as key → count.',
      concept: 'Map interpretation',
    },
    {
      prompt: 'Which structure is more appropriate when counts are required: HashSet or HashMap?',
      correct: 'HashMap',
      distractors: [
        'HashSet',
        'Stack',
        'Queue',
      ],
      explanation:
        'A HashMap stores a value together with its count, while a HashSet only records membership.',
      hint: 'You need both a key and associated count.',
      concept: 'Choosing the data structure',
    },
    {
      prompt: 'What is a collision in a HashMap?',
      correct: 'Two different keys resolve to the same bucket or hash location',
      distractors: [
        'Two equal values being counted',
        'A key being inserted twice into the source array',
        'A map being automatically sorted',
      ],
      explanation:
        'Hash collisions occur when different keys map to the same location and must be resolved by the implementation.',
      hint: 'Different keys can share the same hash destination.',
      concept: 'Collision handling',
    },
    {
      prompt: 'Why can frequency counting usually be performed in one pass?',
      correct: 'Each element can update its count as soon as it is encountered',
      distractors: [
        'The array must already be sorted',
        'Every value is counted only after the scan',
        'HashMaps require two passes',
      ],
      explanation:
        'There is no need to first collect values and then count them; each occurrence can update the map immediately.',
      hint: 'Ask what information is available when one element is read.',
      concept: 'Single-pass processing',
    },
  ],

  subarraySum: [
    {
      prompt: 'Why does the optimized subarray-sum algorithm store prefix sums in a HashMap?',
      correct: 'To find a required previous prefix sum in expected O(1)',
      distractors: [
        'To sort prefix sums automatically',
        'To prevent integer overflow',
        'To avoid calculating running sums',
      ],
      explanation:
        'The map lets the algorithm quickly ask whether the prefix sum needed to form the target subarray has already occurred.',
      hint: 'Think about fast lookup of an earlier sum.',
      concept: 'Prefix-sum lookup',
    },
    {
      prompt: 'If the current prefix sum is S and the target is T, what previous prefix sum should be searched for?',
      correct: 'S - T',
      distractors: [
        'S + T',
        'T - S',
        'S * T',
      ],
      explanation:
        'If currentSum - previousSum = target, then previousSum = currentSum - target.',
      hint: 'Rearrange the prefix-sum equation.',
      concept: 'Complement formula',
    },
    {
      prompt: 'What does finding S - T in the prefix map imply?',
      correct: 'The elements after that stored index through the current index sum to T',
      distractors: [
        'The entire array sums to T',
        'The current element alone equals T',
        'The array must be sorted',
      ],
      explanation:
        'Subtracting the earlier prefix sum from the current prefix sum leaves exactly the contiguous subarray between those positions.',
      hint: 'Think about cancellation between two prefix sums.',
      concept: 'Subarray derivation',
    },
    {
      prompt: 'What does the prefix-sum HashMap usually store?',
      correct: 'Prefix sum mapped to an index',
      distractors: [
        'Value mapped only to its frequency',
        'Index mapped to the array value only',
        'Target mapped to the largest element',
      ],
      explanation:
        'The index identifies where the earlier prefix ended, allowing the contiguous subarray boundaries to be recovered.',
      hint: 'You need to know where that prefix occurred.',
      concept: 'Map contents',
    },
    {
      prompt: 'What is the expected time complexity of the HashMap prefix-sum technique?',
      correct: 'O(n)',
      distractors: [
        'O(n²)',
        'O(log n)',
        'O(2^n)',
      ],
      explanation:
        'The array is scanned once and each hash lookup/insertion is expected O(1).',
      hint: 'One pass plus average constant-time lookups.',
      concept: 'Time complexity',
    },
    {
      prompt: 'What is the typical extra space complexity of the prefix-sum HashMap approach?',
      correct: 'O(n)',
      distractors: [
        'O(1)',
        'O(log n)',
        'O(n²)',
      ],
      explanation:
        'Up to O(n) distinct prefix sums may need to be stored.',
      hint: 'How many prefixes can exist?',
      concept: 'Space complexity',
    },
    {
      prompt: 'Why are prefix sums useful for contiguous subarrays?',
      correct: 'A subarray sum can be obtained by subtracting two prefix sums',
      distractors: [
        'They automatically sort the array',
        'They eliminate the need for indices',
        'They work only with positive values',
      ],
      explanation:
        'The difference between two prefix sums gives the sum of the elements between them.',
      hint: 'Imagine total-to-current minus total-to-earlier.',
      concept: 'Prefix-sum property',
    },
    {
      prompt: 'Why is prefix sum 0 often stored at index -1 initially?',
      correct: 'To correctly handle a valid subarray starting at index 0',
      distractors: [
        'To skip the first element',
        'To represent a negative array value',
        'To reduce hash collisions',
      ],
      explanation:
        'If the running sum itself equals the target, the subarray starts at index 0. Storing 0 at -1 makes that case work naturally.',
      hint: 'Consider a target matched by the very first prefix.',
      concept: 'Boundary handling',
    },
    {
      prompt: 'Can the prefix-sum HashMap technique handle negative numbers?',
      correct: 'Yes',
      distractors: [
        'No, only positive values are allowed',
        'Only when the array is sorted',
        'Only when the target is positive',
      ],
      explanation:
        'Unlike a sliding-window approach that relies on monotonic sums, prefix-sum hashing works with positive, zero, and negative values.',
      hint: 'The method relies on arithmetic equality, not monotonic growth.',
      concept: 'Negative values',
    },
    {
      prompt: 'What is the fundamental equation behind the prefix-sum lookup?',
      correct: 'currentPrefixSum - target = previousPrefixSum',
      distractors: [
        'currentPrefixSum + target = previousPrefixSum',
        'currentPrefixSum / target = previousPrefixSum',
        'currentPrefixSum × target = previousPrefixSum',
      ],
      explanation:
        'Rearranging currentPrefixSum - previousPrefixSum = target produces the lookup equation used by the algorithm.',
      hint: 'Rearrange the subarray-sum equation.',
      concept: 'Core equation',
    },
  ],
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
  const anchors = ANCHORS[algorithm];
  const anchorIndex = steps.length % anchors.length;
  const anchor = anchors[anchorIndex];

  // Deterministic conceptual anchor at step 0.
  const anchorId = `hashMaps-${algorithm}-anchor-${anchorIndex}`;
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

const REVISION_DATA: Record<HashMapsAlgorithmKey, QuizRevisionData> = {
  twoSum: {
    description: 'Find two numbers in an array that sum to a target',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Store each seen value in a hash map; check if complement (target - current) exists',
    watchFor: ['Complement lookup', 'Map stores value→index', 'Single-pass optimization'],
    quickTip: 'For each element, check if (target - element) is in the map before adding current element',
    example: 'Array [2,7,11,15], target=9: i=0 map={2:0}; i=1 complement=9-7=2 found at index 0 → pair (0,1).',
  },
  duplicateDetect: {
    description: 'Detect if an array contains duplicate values',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a hash set—insertion fails (or returns false) when the element already exists',
    watchFor: ['Set vs map choice', 'Early termination', 'Space trade-off'],
    quickTip: 'A hash set gives O(1) average lookup—stop as soon as you find the first duplicate',
    example: 'Array [1,2,3,2]: insert 1→set{1}, insert 2→set{1,2}, insert 3→set{1,2,3}, insert 2→already in set! Duplicate found.',
  },
  frequencyMap: {
    description: 'Count occurrences of each element in an array',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'Use a hash map to track how many times each value has appeared',
    watchFor: ['Key initialization', 'Increment logic', 'Iteration over entries'],
    quickTip: 'Use map.getOrDefault(key, 0) + 1 or the ?? 0 pattern to handle first occurrence cleanly',
    example: 'Array [1,2,2,3,3,3]: map={1:1, 2:2, 3:3}. Each key maps to its count.',
  },
  subarraySum: {
    description: 'Find a contiguous subarray that sums to a target',
    complexity: 'O(n) time, O(n) space',
    keyIdea: 'If runningSum - target exists in the prefix sum map, a valid subarray is found',
    watchFor: ['Prefix sum map', 'Complement check', 'Index tracking'],
    quickTip: 'Store each prefix sum with its index—when (currentSum - target) is in the map, the subarray is between those indices',
    example: 'Array [1,2,3,7,5], target=12: runningSums=[1,3,6,13,18]. At i=3, sum=13, complement=13-12=1 found at i=0 → subarray [1..3]=[2,3,7]=12.',
  },
};

export function buildRevisionData(key: HashMapsAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
