import type { TrieNodeData, TrieEdge, TrieStep } from './trieTypes';

export interface TNode {
  id: string;
  char: string;
  isEndOfWord: boolean;
  children: Map<string, TNode>;
}

let _nid = 0;
export function resetIdCounter() { _nid = 0; }
export function nextId() { return `n${_nid++}`; }

export function createRoot(): TNode {
  return { id: 'root', char: '', isEndOfWord: false, children: new Map() };
}

export function insertWord(root: TNode, word: string) {
  let curr = root;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (!curr.children.has(ch)) {
      curr.children.set(ch, {
        id: nextId(),
        char: ch,
        isEndOfWord: i === word.length - 1,
        children: new Map(),
      });
    }
    curr = curr.children.get(ch)!;
  }
  curr.isEndOfWord = true;
}

export function buildTrie(words: string[]): TNode {
  const root = createRoot();
  words.forEach(w => insertWord(root, w.trim().toLowerCase()));
  return root;
}

export function collectWords(root: TNode): string[] {
  const words: string[] = [];
  function dfs(node: TNode, prefix: string) {
    if (node.isEndOfWord) words.push(prefix);
    node.children.forEach((child, ch) => dfs(child, prefix + ch));
  }
  dfs(root, '');
  return words;
}

export function layoutTrie(root: TNode): { nodes: TrieNodeData[]; edges: TrieEdge[] } {
  const nodes: TrieNodeData[] = [];
  const edges: TrieEdge[] = [];

  function traverse(node: TNode, x: number, y: number, spread: number, parentId?: string) {
    nodes.push({
      id: node.id,
      char: node.char,
      x,
      y,
      isEndOfWord: node.isEndOfWord,
      state: 'default',
      parentId,
    });

    const entries = Array.from(node.children.entries());
    if (entries.length === 0) return;

    const nextY = y + 70;
    const stepX = entries.length === 1 ? 0 : (spread * 2) / (entries.length - 1);
    let startX = entries.length === 1 ? x : x - spread;

    entries.forEach(([, child]) => {
      const childX = Math.max(5, Math.min(95, startX));
      edges.push({ fromId: node.id, toId: child.id, state: 'default' });
      traverse(child, childX, nextY, Math.max(8, spread * 0.45), node.id);
      startX += stepX;
    });
  }

  traverse(root, 50, 50, 30);
  return { nodes, edges };
}

export function snapshotTrie(
  root: TNode,
  description: string,
  codeLine = 0,
  variables: Record<string, string | number | boolean | null> = {},
  highlightIds: string[] = [],
  highlightState: 'comparing' | 'sorted' = 'comparing',
  words?: string[],
): TrieStep {
  const { nodes, edges } = layoutTrie(root);
  nodes.forEach(n => {
    if (highlightIds.includes(n.id)) n.state = highlightState;
  });
  const edgeHighlight = new Set(highlightIds);
  edges.forEach(e => {
    if (edgeHighlight.has(e.fromId) && edgeHighlight.has(e.toId)) {
      e.state = highlightState;
    }
  });
  return {
    array: [],
    trieNodes: nodes,
    trieEdges: edges,
    description,
    codeLine,
    variables,
    words,
  };
}
