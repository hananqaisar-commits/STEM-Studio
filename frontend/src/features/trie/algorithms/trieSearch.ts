import type { TrieStep } from './trieTypes';
import { buildTrie, snapshotTrie, collectWords, resetIdCounter } from './trieBuilder';

export function runTrieSearch(trieWords: string[], searchWord: string): TrieStep[] {
  const steps: TrieStep[] = [];
  resetIdCounter();
  const root = buildTrie(trieWords);
  const query = searchWord.trim().toLowerCase();
  const allWords = collectWords(root);

  steps.push(snapshotTrie(root, `Starting search for "${query}" in the Trie.`, 0, { query }, [], 'comparing', allWords));

  let curr = root;
  const pathIds: string[] = [root.id];

  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    steps.push(
      snapshotTrie(root, `Looking for character '${ch}' under node '${curr.char || 'root'}'`, 1,
        { query, char: ch, index: i }, pathIds, 'comparing', allWords),
    );

    if (!curr.children.has(ch)) {
      steps.push(
        snapshotTrie(root, `Character '${ch}' NOT found. Word "${query}" does NOT exist in the Trie.`, 3,
          { query, found: false }, pathIds, 'comparing', allWords),
      );
      return steps;
    }

    curr = curr.children.get(ch)!;
    pathIds.push(curr.id);
  }

  const isWord = curr.isEndOfWord;
  steps.push(
    snapshotTrie(root, isWord ? `FOUND: "${query}" exists in the Trie!` : `Prefix "${query}" found but is NOT a complete word.`, 4,
      { query, found: isWord }, pathIds, 'sorted', allWords),
  );

  return steps;
}
