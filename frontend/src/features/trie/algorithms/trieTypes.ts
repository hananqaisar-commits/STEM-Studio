import type { ArrayStep } from '../../../engine/types/Step';

export interface TrieNodeData {
  id: string;
  char: string;
  x: number;
  y: number;
  isEndOfWord: boolean;
  state: 'default' | 'comparing' | 'sorted' | 'swapping';
  parentId?: string;
}

export interface TrieEdge {
  fromId: string;
  toId: string;
  state: 'default' | 'comparing' | 'sorted';
}

export interface TrieStep extends ArrayStep {
  trieNodes: TrieNodeData[];
  trieEdges: TrieEdge[];
  words?: string[];
}
