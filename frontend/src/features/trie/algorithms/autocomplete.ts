import type { TrieStep } from './trieTypes';
import { buildTrie, snapshotTrie, collectWords, resetIdCounter } from './trieBuilder';
import type { TNode } from './trieBuilder';

export function runAutocomplete(trieWords: string[], query: string): TrieStep[] {
  const steps: TrieStep[] = [];
  resetIdCounter();
  const root = buildTrie(trieWords);
  const q = query.trim().toLowerCase();
  const allWords = collectWords(root);

  steps.push(snapshotTrie(root, `Starting autocomplete for "${q}".`, 0, { query: q }, [], 'comparing', allWords));

  let curr = root;
  const pathIds: string[] = [root.id];

  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    steps.push(
      snapshotTrie(root, `Typing character '${ch}' — navigating trie`, 1,
        { query: q, char: ch, index: i }, pathIds, 'comparing', allWords),
    );

    if (!curr.children.has(ch)) {
      steps.push(
        snapshotTrie(root, `No matches for "${q}" — character '${ch}' not found.`, 3,
          { query: q, found: false }, pathIds, 'comparing', allWords),
      );
      return steps;
    }

    curr = curr.children.get(ch)!;
    pathIds.push(curr.id);

    // Collect suggestions at this prefix
    const suggestions: string[] = [];
    function dfs(node: TNode, built: string) {
      if (node.isEndOfWord) suggestions.push(built);
      node.children.forEach((child, c) => dfs(child, built + c));
    }
    dfs(curr, q.substring(0, i + 1));

    steps.push(
      snapshotTrie(root, `Prefix "${q.substring(0, i + 1)}" — ${suggestions.length} suggestion(s): ${suggestions.join(', ')}`, 2,
        { query: q, prefix: q.substring(0, i + 1), suggestions: suggestions.length }, pathIds, 'sorted', allWords),
    );
  }

  const finalSuggestions: string[] = [];
  function dfsFinal(node: TNode, built: string) {
    if (node.isEndOfWord) finalSuggestions.push(built);
    node.children.forEach((child, c) => dfsFinal(child, built + c));
  }
  dfsFinal(curr, q);

  steps.push(
    snapshotTrie(root, `Autocomplete complete. ${finalSuggestions.length} suggestion(s) for "${q}": ${finalSuggestions.join(', ')}`, 4,
      { query: q, suggestions: finalSuggestions.length }, pathIds, 'sorted', allWords),
  );

  return steps;
}
