import React from 'react';
import type { TrieStep } from './algorithms/trieTypes';
import { TrieRadial, type TrieRadialNode, type TrieRadialEdge } from '../../components/renderers/TrieRadial';
import './Trie.css';

interface TrieRendererProps {
  currentStep: TrieStep | null;
  onNodeClick?: (char: string) => void;
  onToggleFullscreen?: () => void;
}

export const TrieRenderer: React.FC<TrieRendererProps> = ({
  currentStep,
  onNodeClick,
  onToggleFullscreen,
}) => {
  if (!currentStep || currentStep.trieNodes.length === 0) {
    return (
      <div className="shared-canvas-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
            <circle cx="24" cy="10" r="6" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="12" cy="28" r="5" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="24" cy="28" r="5" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="36" cy="28" r="5" stroke="#64748b" strokeWidth="2" fill="none" />
            <line x1="20" y1="14" x2="14" y2="24" stroke="#64748b" strokeWidth="1.5" />
            <line x1="24" y1="16" x2="24" y2="23" stroke="#64748b" strokeWidth="1.5" />
            <line x1="28" y1="14" x2="34" y2="24" stroke="#64748b" strokeWidth="1.5" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>Trie Radial Canvas</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Enter words to build your prefix tree</span>
        </div>
      </div>
    );
  }

  const nodes: TrieRadialNode[] = currentStep.trieNodes.map(n => ({
    id: n.id,
    char: n.char,
    isEndOfWord: n.isEndOfWord,
    state: n.state,
    x: n.x,
    y: n.y,
  }));

  const edges: TrieRadialEdge[] = currentStep.trieEdges.map(e => ({
    fromId: e.fromId,
    toId: e.toId,
    state: e.state,
  }));

  const currentWords = currentStep.words || [];

  return (
    <TrieRadial
      trieNodes={nodes}
      trieEdges={edges}
      currentWords={currentWords}
      title="TRIE RADIAL CANVAS"
      onNodeClick={onNodeClick}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
};
