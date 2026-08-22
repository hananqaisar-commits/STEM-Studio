import type { BSTStep, BSTNodeData } from './bstEngine';
import type { ElementState } from '../../engine/types/Step';

export interface TrieNodeStructure {
  id: string;
  char: string; // 'ROOT' or single letter ('c', 'a', 't')
  isEndOfWord: boolean;
  children: Map<string, TrieNodeStructure>;
}

export function createTrieRoot(): TrieNodeStructure {
  return {
    id: 'trie_root',
    char: 'ROOT',
    isEndOfWord: false,
    children: new Map(),
  };
}

// Layout Trie nodes in 2D SVG canvas space
export function computeTriePositions(
  root: TrieNodeStructure,
  startX = 50,
  startY = 40,
  spread = 30
): { nodes: (BSTNodeData & { isEndOfWord?: boolean; label?: string })[]; edges: { fromId: string; toId: string; state: ElementState }[] } {
  const nodes: (BSTNodeData & { isEndOfWord?: boolean; label?: string })[] = [];
  const edges: { fromId: string; toId: string; state: ElementState }[] = [];

  function traverse(node: TrieNodeStructure, x: number, y: number, currentSpread: number) {
    nodes.push({
      id: node.id,
      value: 0, // Placeholder
      label: node.char,
      isEndOfWord: node.isEndOfWord,
      x,
      y,
      state: 'default',
    });

    const childEntries = Array.from(node.children.entries());
    if (childEntries.length === 0) return;

    const nextY = y + 70;
    const stepX = (currentSpread * 2) / Math.max(1, childEntries.length - 1 || 1);
    let startChildX = childEntries.length === 1 ? x : x - currentSpread;

    childEntries.forEach(([, childNode]) => {
      const childX = Math.max(5, Math.min(95, startChildX));
      edges.push({ fromId: node.id, toId: childNode.id, state: 'default' });
      traverse(childNode, childX, nextY, Math.max(6, currentSpread * 0.45));
      startChildX += stepX;
    });
  }

  traverse(root, startX, startY, spread);
  return { nodes, edges };
}

function createTrieStep(
  root: TrieNodeStructure,
  activeId?: string,
  comparingIds: string[] = [],
  description = '',
  codeLine = 1,
  variables: Record<string, string | number | boolean | null> = {}
): BSTStep {
  const { nodes, edges } = computeTriePositions(root);

  const updatedNodes = nodes.map((node) => {
    let state: ElementState = 'default';
    if (node.id === activeId || comparingIds.includes(node.id)) state = 'comparing';
    else if (node.isEndOfWord) state = 'sorted';
    return { ...node, state };
  });

  return {
    nodes: updatedNodes,
    edges,
    activeNodeId: activeId,
    description,
    codeLine,
    variables,
  };
}

// Generate Steps for Trie Word Insertion
export function generateTrieInsertSteps(root: TrieNodeStructure, word: string): { steps: BSTStep[]; newRoot: TrieNodeStructure } {
  const steps: BSTStep[] = [];
  const cleanWord = word.trim().toLowerCase();

  steps.push(createTrieStep(root, root.id, [], `Starting Trie insertion for word "${cleanWord}"`, 1, { word: cleanWord }));

  let curr = root;

  for (let i = 0; i < cleanWord.length; i++) {
    const ch = cleanWord[i];
    steps.push(createTrieStep(root, curr.id, [curr.id], `Processing character '${ch}' (index ${i} of "${cleanWord}")`, 2, { char: ch, index: i }));

    if (!curr.children.has(ch)) {
      const newNode: TrieNodeStructure = {
        id: `trie_${Date.now()}_${ch}_${i}`,
        char: ch,
        isEndOfWord: i === cleanWord.length - 1,
        children: new Map(),
      };
      curr.children.set(ch, newNode);
      steps.push(createTrieStep(root, newNode.id, [newNode.id], `Created new Trie node '${ch}' under parent '${curr.char}'`, 4, { char: ch, parent: curr.char }));
      curr = newNode;
    } else {
      curr = curr.children.get(ch)!;
      if (i === cleanWord.length - 1) curr.isEndOfWord = true;
      steps.push(createTrieStep(root, curr.id, [curr.id], `Found existing character '${ch}' in Trie. Moving down.`, 5, { char: ch }));
    }
  }

  steps.push(createTrieStep(root, curr.id, [curr.id], `Marked node '${curr.char}' as END OF WORD for "${cleanWord}". Insertion complete!`, 7, { word: cleanWord, endNode: curr.char }));

  return { steps, newRoot: root };
}

// Generate Steps for Trie Prefix Search
export function generateTrieSearchSteps(root: TrieNodeStructure, query: string): BSTStep[] {
  const steps: BSTStep[] = [];
  const cleanQuery = query.trim().toLowerCase();

  steps.push(createTrieStep(root, root.id, [], `Starting Trie prefix search for "${cleanQuery}"`, 1, { query: cleanQuery }));

  let curr = root;

  for (let i = 0; i < cleanQuery.length; i++) {
    const ch = cleanQuery[i];
    steps.push(createTrieStep(root, curr.id, [curr.id], `Looking for character '${ch}' in Trie under '${curr.char}'`, 2, { char: ch }));

    if (!curr.children.has(ch)) {
      steps.push(createTrieStep(root, curr.id, [], `Character '${ch}' NOT found in Trie. Prefix "${cleanQuery}" does NOT exist.`, 4, { query: cleanQuery, missingChar: ch }));
      return steps;
    }

    curr = curr.children.get(ch)!;
  }

  const isExactWord = curr.isEndOfWord;
  const statusMsg = isExactWord ? `FOUND exact word "${cleanQuery}" in Trie!` : `FOUND prefix "${cleanQuery}" in Trie!`;

  steps.push(createTrieStep(root, curr.id, [curr.id], statusMsg, 6, { query: cleanQuery, isExactWord }));
  return steps;
}
