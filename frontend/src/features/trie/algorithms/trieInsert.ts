import type { TrieStep } from './trieTypes';
import { createRoot, snapshotTrie, resetIdCounter, nextId } from './trieBuilder';

export function runTrieInsert(words: string[]): TrieStep[] {
  const steps: TrieStep[] = [];
  resetIdCounter();
  const root = createRoot();
  const inserted: string[] = [];

  steps.push(snapshotTrie(root, 'Starting Trie insertion. Empty trie with root node.', 0, {}, [], 'comparing', []));

  for (const raw of words) {
    const word = raw.trim().toLowerCase();
    if (!word) continue;

    let curr = root;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      steps.push(
        snapshotTrie(root, `Processing character '${ch}' from word "${word}" (index ${i})`, 1,
          { word, char: ch, index: i }, [curr.id], 'comparing', inserted),
      );

      if (!curr.children.has(ch)) {
        const newNode = { id: nextId(), char: ch, isEndOfWord: i === word.length - 1, children: new Map<string, typeof curr>() };
        curr.children.set(ch, newNode);
        steps.push(
          snapshotTrie(root, `Created new node '${ch}'${i === word.length - 1 ? ' (end of word)' : ''}`, 2,
            { word, char: ch, created: true }, [newNode.id], 'sorted', inserted),
        );
        curr = newNode as typeof curr;
      } else {
        curr = curr.children.get(ch)!;
        if (i === word.length - 1) curr.isEndOfWord = true;
        steps.push(
          snapshotTrie(root, `Found existing node '${ch}'. ${i === word.length - 1 ? 'Marked as end of word.' : 'Moving down.'}`, 3,
            { word, char: ch, exists: true }, [curr.id], 'sorted', inserted),
        );
      }
    }
    inserted.push(word);
  }

  steps.push(snapshotTrie(root, `Trie insertion complete. Inserted ${inserted.length} word(s).`, 4, {}, [], 'comparing', inserted));
  return steps;
}
