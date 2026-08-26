import React from 'react';
import { CircleNode } from '../../components/primitives/CircleNode';
import { Line } from '../../components/primitives/Line';
import { CircleCheck, Maximize2 } from 'lucide-react';
import type { TrieStep } from './algorithms/trieTypes';
import '../bst/BST.css';
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
      <div className="bst-canvas-empty">
        <div className="empty-canvas-content">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.4, marginBottom: '0.75rem' }}>
            <circle cx="24" cy="10" r="6" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="12" cy="28" r="5" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="24" cy="28" r="5" stroke="#64748b" strokeWidth="2" fill="none" />
            <circle cx="36" cy="28" r="5" stroke="#64748b" strokeWidth="2" fill="none" />
            <line x1="20" y1="14" x2="14" y2="24" stroke="#64748b" strokeWidth="1.5" />
            <line x1="24" y1="16" x2="24" y2="23" stroke="#64748b" strokeWidth="1.5" />
            <line x1="28" y1="14" x2="34" y2="24" stroke="#64748b" strokeWidth="1.5" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>Trie is empty</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '0.25rem' }}>
            Enter words to build your prefix tree
          </span>
        </div>
      </div>
    );
  }

  const nodes = currentStep.trieNodes;
  const edges = currentStep.trieEdges;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const maxY = Math.max(480, ...nodes.map(n => n.y + 90));
  const currentWords = currentStep.words || [];

  return (
    <div className="bst-canvas-container animate-fade-in">
      <div className="bst-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">TRIE CANVAS</span>
          <span className="bst-subtitle">{nodes.length} nodes &middot; {edges.length} edges{currentWords.length > 0 ? ` &middot; ${currentWords.length} word(s)` : ''}</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen Mode">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div className="bst-canvas-workspace">
        <svg className="canvas-grid-pattern" width="100%" height={maxY + 'px'}>
          <defs>
            <pattern id="trieDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="rgba(148, 163, 184, 0.15)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#trieDotGrid)" />
        </svg>

        <svg className="bst-svg-layer" width="100%" height={maxY + 'px'} style={{ height: maxY + 'px' }}>
          {edges.map((edge, idx) => {
            const parent = nodeMap.get(edge.fromId);
            const child = nodeMap.get(edge.toId);
            if (!parent || !child) return null;
            return (
              <Line
                key={idx}
                x1={parent.x + '%'}
                y1={parent.y}
                x2={child.x + '%'}
                y2={child.y}
                state={edge.state}
                strokeWidth={2.5}
              />
            );
          })}
        </svg>

        <div className="bst-nodes-layer" style={{ height: maxY + 'px' }}>
          {nodes.map((node) => (
            <div
              key={node.id}
              className="bst-node-wrapper"
              style={{ left: node.x + '%', top: node.y + 'px' }}
              onClick={() => onNodeClick && onNodeClick(node.char)}
            >
              {node.isEndOfWord && (
                <span className="eow-badge" title="End of word">
                  <CircleCheck size={14} strokeWidth={2.5} />
                </span>
              )}
              <CircleNode
                value={node.char || '\u2219'}
                state={node.state}
                size={46}
              />
            </div>
          ))}
        </div>
      </div>

      {currentWords.length > 0 && (
        <div className="trie-word-display">
          <span className="trie-word-label">WORDS:</span>
          <div className="trie-word-pills">
            {currentWords.map((w, i) => (
              <span key={i} className="trie-word-pill">{w}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
