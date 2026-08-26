import type { TrieStep } from './algorithms/trieTypes';
import type { QuizCheckpoint, QuizQuestion } from '../../engine/types/Quiz';
import { buildOptions } from '../../engine/types/Quiz';

export type TrieAlgorithmKey = 'trieInsert' | 'trieSearch' | 'triePrefix' | 'wordDictionary' | 'autocomplete';

interface Anchor {
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
  hint: string;
  concept: string;
}

const ANCHORS: Record<TrieAlgorithmKey, Anchor> = {
  trieInsert: {
    prompt: 'What is the time complexity of inserting a word of length m into a Trie?',
    correct: 'O(m) — one node traversal per character',
    distractors: [
      'O(n) where n is the number of words already in the Trie',
      'O(m log m) due to character sorting at each level',
      'O(1) — the Trie uses direct array indexing',
    ],
    explanation: 'Trie insertion processes each character exactly once, creating or following a child pointer. For a word of length m this takes O(m) time, independent of how many words are already stored.',
    hint: 'Think about how many nodes you visit for each character of the word.',
    concept: 'Insertion complexity',
  },
  trieSearch: {
    prompt: 'What is the time complexity of searching for a word of length m in a Trie?',
    correct: 'O(m) where m is the length of the search word',
    distractors: [
      'O(n) where n is the total number of nodes in the Trie',
      'O(m log m) because of branching at each level',
      'O(1) — hash-based lookup at each node',
    ],
    explanation: 'Trie search follows one child pointer per character. For a word of length m this takes exactly O(m) steps, regardless of how many words the Trie contains.',
    hint: 'At each level of the Trie, you follow exactly one pointer for the target character.',
    concept: 'Search complexity',
  },
  triePrefix: {
    prompt: 'Why is a Trie better than a hash map for prefix queries?',
    correct: 'A Trie organizes characters hierarchically so all words sharing a prefix are in the same subtree',
    distractors: [
      'Hash maps cannot store strings, only numeric keys',
      'Tries use less memory than hash maps for any dataset',
      'Hash maps have O(n) lookup time which is always slower',
    ],
    explanation: 'Tries store characters along paths, so all words with a common prefix share the same initial path. Finding all words with a prefix takes O(p + k) where p is prefix length and k is the number of matching characters across results.',
    hint: 'Think about how shared prefixes are represented in the tree structure.',
    concept: 'Prefix advantage',
  },
  wordDictionary: {
    prompt: 'What does the end-of-word marker signify in a Trie node?',
    correct: 'It marks that the path from root to this node spells a complete word in the dictionary',
    distractors: [
      'It indicates the node has no children',
      'It marks the node as a leaf that can be pruned',
      'It indicates the character is a vowel',
    ],
    explanation: 'Without end-of-word markers, you could not distinguish between a prefix that happens to exist and an actual inserted word. For example, "app" and "apple" share the path a-p-p, but only the node at the second p and the final e have end-of-word markers.',
    hint: 'Consider: "car" and "card" share the path c-a-r. How do you know "car" is a word too?',
    concept: 'End-of-word marker',
  },
  autocomplete: {
    prompt: 'In autocomplete, after typing a prefix, how are suggestions collected from the Trie?',
    correct: 'DFS from the prefix node to collect all words in its subtree',
    distractors: [
      'BFS from the root to find all leaf nodes',
      'Binary search on the sorted word list stored at the root',
      'Hash lookup of the prefix in a separate index table',
    ],
    explanation: 'Once the Trie navigation reaches the last character of the typed prefix, a depth-first traversal from that node collects every complete word below it — these are all the valid autocompletions.',
    hint: 'All words sharing the prefix live in the subtree below the prefix node.',
    concept: 'Suggestion collection',
  },
};

function getMidQuestion(algorithm: TrieAlgorithmKey, step: TrieStep, _stepIndex: number): QuizQuestion {
  const vars = step.variables || {};
  const id = `trie-${algorithm}-mid`;

  switch (algorithm) {
    case 'trieInsert': {
      const ch = typeof vars.char === 'string' ? vars.char : '?';
      const created = vars.created === true;
      const built = buildOptions(
        id,
        created ? `A new node '${ch}' was created because it did not exist` : `An existing node '${ch}' was reused`,
        [
          created ? `An existing node '${ch}' was reused` : `A new node '${ch}' was created because it did not exist`,
          `The character '${ch}' was skipped entirely`,
        ],
      );
      return {
        id,
        prompt: `Character '${ch}' was processed. What happened at this step?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: created
          ? `The character '${ch}' did not exist as a child, so a new node was created.`
          : `The character '${ch}' already existed in the Trie, so the existing node was followed.`,
        hint: 'Check whether the character already has a child node under the current parent.',
        concept: 'Node creation',
        weight: 2,
      };
    }
    case 'trieSearch': {
      const found = vars.found;
      const query = typeof vars.query === 'string' ? vars.query : '?';
      const built = buildOptions(
        id,
        found === false ? `The word "${query}" does not exist in the Trie` : `The word "${query}" was found in the Trie`,
        [
          found === false ? `The word "${query}" was found in the Trie` : `The word "${query}" does not exist in the Trie`,
          `The Trie is empty so no word can be found`,
        ],
      );
      return {
        id,
        prompt: `After traversing the Trie for "${query}", what is the result?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: found === false
          ? `A character in "${query}" was not found in the Trie path, so the word does not exist.`
          : `All characters of "${query}" were found and the final node has an end-of-word marker.`,
        hint: 'Check if every character was found AND the last node has an end-of-word marker.',
        concept: 'Search result',
        weight: 2,
      };
    }
    case 'triePrefix': {
      const prefix = typeof vars.prefix === 'string' ? vars.prefix : '?';
      const built = buildOptions(
        id,
        'All words below the prefix node are valid completions',
        [
          'Only the first child word is returned',
          'The prefix node value itself is always the only result',
          'Words are collected from the root, not from the prefix subtree',
        ],
      );
      return {
        id,
        prompt: `After reaching the prefix node for "${prefix}", how are matching words found?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: 'A DFS from the prefix node collects all end-of-word nodes in its subtree. Each such path from root forms a complete word that starts with the given prefix.',
        hint: 'Think about what lies below the prefix node in the tree.',
        concept: 'Prefix matching',
        weight: 3,
      };
    }
    case 'wordDictionary': {
      const ch = typeof vars.char === 'string' ? vars.char : '?';
      const isWildcard = ch === '.';
      const built = buildOptions(
        id,
        isWildcard ? 'Branch to ALL children since . matches any character' : `Follow only the child matching '${ch}'`,
        [
          isWildcard ? `Follow only the first child` : 'Branch to ALL children',
          'Skip this character and move to the next level',
        ],
      );
      return {
        id,
        prompt: `Processing character '${ch}' in the pattern. What does the algorithm do?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: isWildcard
          ? `The wildcard '.' matches any single character, so the search branches to every child of the current node.`
          : `A literal character must match exactly, so only the child with character '${ch}' is followed.`,
        hint: 'A dot is a wildcard; a letter is a literal match.',
        concept: 'Wildcard handling',
        weight: 2,
      };
    }
    case 'autocomplete': {
      const suggestions = typeof vars.suggestions === 'number' ? vars.suggestions : 0;
      const prefix = typeof vars.prefix === 'string' ? vars.prefix : '?';
      const built = buildOptions(
        id,
        `${suggestions} word(s) can be suggested for prefix "${prefix}"`,
        [
          'No suggestions are possible at this prefix',
          'All words in the Trie are suggested regardless of prefix',
        ],
      );
      return {
        id,
        prompt: `After typing "${prefix}", how many autocomplete suggestions exist?`,
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: `At prefix "${prefix}", a DFS from the current node finds ${suggestions} complete word(s) in the subtree — these are the autocompletion suggestions.`,
        hint: 'Count the end-of-word nodes in the subtree below the current position.',
        concept: 'Suggestion count',
        weight: 2,
      };
    }
  }
}

export function buildTrieCheckpoints(steps: TrieStep[], algorithm: TrieAlgorithmKey): QuizCheckpoint[] {
  if (steps.length < 2) return [];

  const checkpoints: QuizCheckpoint[] = [];
  const anchor = ANCHORS[algorithm];

  const anchorId = `trie-${algorithm}-anchor`;
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

  if (steps.length > 5) {
    const midIdx = Math.floor(steps.length * 0.4);
    const midStep = steps[midIdx];
    const midQ = getMidQuestion(algorithm, midStep, midIdx);
    checkpoints.push({ stepIndex: midIdx, question: midQ });
  }

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
