import type { TrieStep } from './trieTypes';
import { buildTrie, snapshotTrie, collectWords, resetIdCounter } from './trieBuilder';
import type { TNode } from './trieBuilder';

export function runWordDictionary(words: string[], pattern: string): TrieStep[] {
  const steps: TrieStep[] = [];
  resetIdCounter();
  const root = buildTrie(words);
  const pat = pattern.trim().toLowerCase();
  const allWords = collectWords(root);

  steps.push(snapshotTrie(root, `Starting pattern search for "${pat}" ('.' = wildcard).`, 0,
    { pattern: pat }, [], 'comparing', allWords));

  const matches: string[] = [];

  function search(node: TNode, idx: number, built: string, pathIds: string[]) {
    if (idx === pat.length) {
      if (node.isEndOfWord) {
        matches.push(built);
        steps.push(
          snapshotTrie(root, `Match found: "${built}"`, 4,
            { pattern: pat, match: built }, pathIds, 'sorted', allWords),
        );
      }
      return;
    }

    const ch = pat[idx];
    steps.push(
      snapshotTrie(root, ch === '.' ? `Wildcard at index ${idx}: branching to all children` : `Looking for '${ch}' at index ${idx}`, 1,
        { pattern: pat, char: ch, index: idx }, pathIds, 'comparing', allWords),
    );

    if (ch === '.') {
      node.children.forEach((child, c) => {
        search(child, idx + 1, built + c, [...pathIds, child.id]);
      });
    } else {
      if (node.children.has(ch)) {
        const child = node.children.get(ch)!;
        search(child, idx + 1, built + ch, [...pathIds, child.id]);
      }
    }
  }

  search(root, 0, '', [root.id]);

  steps.push(
    snapshotTrie(root, `Pattern search complete. Found ${matches.length} match(es): ${matches.join(', ') || 'none'}`, 5,
      { pattern: pat, matches: matches.length }, [root.id], matches.length > 0 ? 'sorted' : 'comparing', allWords),
  );

  return steps;
}
