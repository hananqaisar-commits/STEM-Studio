import type { TrieStep } from './trieTypes';
import { buildTrie, snapshotTrie, collectWords, resetIdCounter } from './trieBuilder';
import type { TNode } from './trieBuilder';

export function runTriePrefix(trieWords: string[], prefix: string): TrieStep[] {
  const steps: TrieStep[] = [];
  resetIdCounter();
  const root = buildTrie(trieWords);
  const pfx = prefix.trim().toLowerCase();
  const allWords = collectWords(root);

  steps.push(snapshotTrie(root, `Starting prefix search for "${pfx}".`, 0, { prefix: pfx }, [], 'comparing', allWords));

  let curr = root;
  const pathIds: string[] = [root.id];

  for (let i = 0; i < pfx.length; i++) {
    const ch = pfx[i];
    steps.push(
      snapshotTrie(root, `Navigating to character '${ch}' of prefix`, 1,
        { prefix: pfx, char: ch }, pathIds, 'comparing', allWords),
    );
    if (!curr.children.has(ch)) {
      steps.push(
        snapshotTrie(root, `Prefix "${pfx}" not found in the Trie. No matching words.`, 3,
          { prefix: pfx, found: false }, pathIds, 'comparing', allWords),
      );
      return steps;
    }
    curr = curr.children.get(ch)!;
    pathIds.push(curr.id);
  }

  steps.push(
    snapshotTrie(root, `Reached prefix node '${curr.char || 'root'}'. Now collecting all words below.`, 2,
      { prefix: pfx }, pathIds, 'sorted', allWords),
  );

  // DFS to find all words below prefix node
  const matches: string[] = [];
  function dfs(node: TNode, built: string, ids: string[]) {
    if (node.isEndOfWord) {
      matches.push(built);
      steps.push(
        snapshotTrie(root, `Found matching word: "${built}"`, 4,
          { prefix: pfx, word: built }, [...pathIds, ...ids], 'sorted', allWords),
      );
    }
    node.children.forEach((child, ch) => {
      dfs(child, built + ch, [...ids, child.id]);
    });
  }
  dfs(curr, pfx, []);

  steps.push(
    snapshotTrie(root, `Prefix search complete. Found ${matches.length} word(s): ${matches.join(', ')}`, 5,
      { prefix: pfx, matches: matches.length }, pathIds, 'sorted', allWords),
  );

  return steps;
}
