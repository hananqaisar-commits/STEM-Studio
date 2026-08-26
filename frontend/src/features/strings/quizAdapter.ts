import type { ArrayStep } from '../../engine/types/Step';
import { buildOptions, type QuizCheckpoint, type QuizWeight , type QuizRevisionData } from '../../engine/types/Quiz';

export type StringAlgorithmKey = 'palindrome' | 'anagram' | 'reverse' | 'frequency';

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<StringAlgorithmKey, Anchor> = {
  palindrome: {
    prompt: 'What is the best-case time complexity for palindrome check?',
    correct: 'O(1) — when the first and last characters mismatch immediately',
    distractors: [
      'O(n) — must always scan the full string',
      'O(log n) — binary search on character pairs',
      'O(n²) — comparing every pair of characters',
    ],
    explanation:
      'Palindrome check compares s[left] with s[right] moving inward. Best case is O(1) when the very first comparison fails (e.g., "abcba" vs starting with mismatched ends). Worst and average cases are O(n/2) = O(n).',
    hint: 'Think about when the algorithm can stop early — does it always need to check every character?',
    concept: 'Best-case analysis',
  },
  anagram: {
    prompt: 'What data structure is most efficient for anagram detection?',
    correct: 'A frequency map (hash table) counting character occurrences',
    distractors: [
      'A sorted array of characters',
      'A binary search tree of characters',
      'A stack pushing and popping characters',
    ],
    explanation:
      'A frequency map lets you count characters in O(n) and verify in O(n). Sorting takes O(n log n). BST adds O(log n) per insert. A stack has no counting ability. Hash-based frequency counting is the canonical O(n) approach.',
    hint: 'Anagrams have identical character counts — which structure tracks counts in constant time per character?',
    concept: 'Data structure choice',
  },
  reverse: {
    prompt: 'How many swaps are needed to reverse a string of length n in-place?',
    correct: '⌊n/2⌋ swaps — one for each symmetric pair',
    distractors: [
      'n swaps — one per character',
      'n - 1 swaps — like bubble sort',
      'n² swaps — all pairs must be compared',
    ],
    explanation:
      'Two-pointer reversal swaps s[left] with s[right], then moves inward. Each swap places two characters in their final positions. For even n, exactly n/2 swaps; for odd n, the middle character stays put, so ⌊n/2⌋ swaps.',
    hint: 'Each swap fixes two positions at once — how many pairs exist in a string of length n?',
    concept: 'Swap count',
  },
  frequency: {
    prompt: 'What is the space complexity of character frequency counting?',
    correct: 'O(k) where k is the alphabet size (e.g., 26 for lowercase English)',
    distractors: [
      'O(n) — proportional to string length',
      'O(1) — no extra space needed',
      'O(n²) — storing all character pairs',
    ],
    explanation:
      'The frequency map stores at most k entries, one per distinct character. For a fixed alphabet (ASCII = 128, lowercase = 26), this is O(1) in practice, but formally O(k). It does not grow with n — a million-character string still has at most k distinct characters.',
    hint: 'How many distinct characters can exist regardless of string length?',
    concept: 'Space complexity',
  },
};

type Kind = 'match' | 'mismatch' | 'swap' | 'count';

function weightFor(occurrence: number): QuizWeight {
  return occurrence < 2 ? 2 : 3;
}

export function buildStringsCheckpoints(
  steps: ArrayStep[],
  algorithm: StringAlgorithmKey
): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const anchor = ANCHORS[algorithm];
  const anchorId = `strings-${algorithm}-anchor`;
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

  const counts: Record<Kind, number> = { match: 0, mismatch: 0, swap: 0, count: 0 };
  let lastAsked = 0;

  for (let i = 1; i < steps.length - 1; i++) {
    if (i - lastAsked < 2) continue;

    const current = steps[i];
    const next = steps[i + 1];

    if (algorithm === 'palindrome') {
      const comparing = current.comparingIndices ?? [];
      if (comparing.length === 2) {
        const willMatch = (next.sortedIndices?.length ?? 0) > (current.sortedIndices?.length ?? 0);
        const id = `strings-palindrome-${willMatch ? 'match' : 'mismatch'}-${i}`;
        const built = buildOptions(
          id,
          willMatch ? 'They match — move pointers inward' : 'They mismatch — not a palindrome',
          [
            willMatch ? 'They mismatch — not a palindrome' : 'They match — move pointers inward',
            'Skip this pair and check the next outer pair',
          ]
        );
        checkpoints.push({
          stepIndex: i,
          question: {
            id,
            prompt: `Comparing characters at indices ${comparing[0]} and ${comparing[1]}. What happens?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: willMatch
              ? 'The characters are identical, so both pointers advance inward. This pair is confirmed as part of the palindrome.'
              : 'The characters differ, so the string cannot be a palindrome. The algorithm stops immediately.',
            hint: 'Read the two highlighted cells — are their characters the same?',
            concept: 'Character comparison',
            weight: weightFor(willMatch ? counts.match++ : counts.mismatch++),
          },
        });
        lastAsked = i;
        continue;
      }
    }

    if (algorithm === 'reverse') {
      const swapping = current.swappingIndices ?? [];
      if (swapping.length === 2) {
        const id = `strings-reverse-swap-${i}`;
        const built = buildOptions(
          id,
          `Swap characters at indices ${swapping[0]} and ${swapping[1]}`,
          [
            'Leave them in place and move inward',
            'Shift all characters one position right',
          ]
        );
        checkpoints.push({
          stepIndex: i,
          question: {
            id,
            prompt: `Two pointers are at indices ${swapping[0]} and ${swapping[1]}. What does the algorithm do?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: `The two-pointer approach swaps s[${swapping[0]}] and s[${swapping[1]}], then moves both pointers inward. Each swap places two characters in their final reversed positions.`,
            hint: 'Reversal swaps the outermost unprocessed pair, then moves inward.',
            concept: 'Two-pointer swap',
            weight: weightFor(counts.swap++),
          },
        });
        lastAsked = i;
        continue;
      }
    }

    if (algorithm === 'anagram') {
      const comparing = current.comparingIndices ?? [];
      if (comparing.length === 1) {
        const char = current.variables?.['char'];
        const phase = current.variables?.['phase'];
        const id = `strings-anagram-${phase}-${i}`;
        const isCounting = phase === 'count';
        const built = buildOptions(
          id,
          isCounting ? `Increment freq['${char}']` : `Decrement freq['${char}']`,
          [
            isCounting ? `Decrement freq['${char}']` : `Increment freq['${char}']`,
            `Remove '${char}' from the frequency map`,
          ]
        );
        checkpoints.push({
          stepIndex: i,
          question: {
            id,
            prompt: `Processing character '${char}' in the ${isCounting ? 'counting' : 'verification'} phase. What happens to the frequency map?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: isCounting
              ? `During the counting phase, each character from the first string increments its frequency. freq['${char}'] goes up by 1.`
              : `During verification, each character from the second string decrements its frequency. If any frequency goes negative or a character is missing, the strings are not anagrams.`,
            hint: isCounting
              ? 'The first string builds the frequency map — are we adding or removing?'
              : 'The second string must consume exactly what the first string built.',
            concept: 'Frequency tracking',
            weight: weightFor(counts.count++),
          },
        });
        lastAsked = i;
        continue;
      }
    }

    if (algorithm === 'frequency') {
      const comparing = current.comparingIndices ?? [];
      if (comparing.length === 1) {
        const char = current.variables?.['char'];
        const freq = current.variables?.['freq[char]'];
        const id = `strings-frequency-count-${i}`;
        const built = buildOptions(
          id,
          `freq['${char}'] becomes ${freq}`,
          [
            `freq['${char}'] becomes ${(typeof freq === 'number' ? freq - 1 : 0)}`,
            `freq['${char}'] resets to 0`,
          ]
        );
        checkpoints.push({
          stepIndex: i,
          question: {
            id,
            prompt: `Processing '${char}' at index ${comparing[0]}. What is its new frequency count?`,
            options: built.options,
            correctIndex: built.correctIndex,
            explanation: `Each occurrence of '${char}' increments its counter. After this step, freq['${char}'] = ${freq}. The frequency map tracks how many times each distinct character has appeared so far.`,
            hint: 'Count how many times this character has appeared up to this index.',
            concept: 'Frequency counting',
            weight: weightFor(counts.count++),
          },
        });
        lastAsked = i;
        continue;
      }
    }
  }

  return checkpoints;
}

/* ── Revision data ─────────────────────────────────────────────────── */

const REVISION_DATA: Record<StringAlgorithmKey, QuizRevisionData> = {
  palindrome: {
    description: 'Check if a string reads the same forwards and backwards',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Compare characters from both ends moving inward—mismatch means not a palindrome',
    watchFor: ['Two-pointer technique', 'Early termination on mismatch', 'Case sensitivity'],
    quickTip: 'Stop at the first mismatch—no need to check the entire string',
    example: '"racecar": compare r↔r ✓, a↔a ✓, c↔c ✓, e is middle → palindrome. "hello": h≠o → not a palindrome (stops in 1 comparison).',
  },
  anagram: {
    description: 'Check if two strings have the same character frequencies',
    complexity: 'O(n) time, O(k) space',
    keyIdea: 'Two strings are anagrams iff their character frequency maps are identical',
    watchFor: ['Frequency counting', 'Length check optimization', 'Character set size'],
    quickTip: 'Quick reject: if lengths differ, they cannot be anagrams',
    example: '"listen" vs "silent": both have freq {e:1,i:1,l:1,n:1,s:1,t:1} → anagram. "hello" vs "world": h/w mismatch → not anagram.',
  },
  reverse: {
    description: 'Reverse a string in-place using two pointers',
    complexity: 'O(n) time, O(1) space',
    keyIdea: 'Swap characters at symmetric positions moving inward from both ends',
    watchFor: ['Number of swaps needed', 'Odd vs even length handling', 'In-place requirement'],
    quickTip: 'Exactly ⌊n/2⌋ swaps are needed—the middle character (if odd length) stays put',
    example: '"abcd" (len 4): swap a↔d → "dbca", swap b↔c → "dcba". 2 swaps = ⌊4/2⌋.',
  },
  frequency: {
    description: 'Count occurrences of each character in a string',
    complexity: 'O(n) time, O(k) space',
    keyIdea: 'Use a hash map or array to track how many times each character appears',
    watchFor: ['Space complexity (alphabet size)', 'Hash map vs array choice', 'Case handling'],
    quickTip: 'For lowercase English letters, use an array of size 26 indexed by char - "a"',
    example: '"abracadabra": freq = {a:5, b:2, r:2, c:1, d:1}. Most frequent char is "a" with count 5.',
  },
};

export function buildRevisionData(key: StringAlgorithmKey): QuizRevisionData {
  return REVISION_DATA[key];
}
