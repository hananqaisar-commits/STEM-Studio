import React, { useEffect, useRef } from 'react';
import { CircleNode } from '../primitives/CircleNode';
import { Line } from '../primitives/Line';
import { CircleCheck, Maximize2 } from 'lucide-react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface TrieRadialNode {
  id: string | number;
  char: string;
  isEndOfWord: boolean;
  state: 'default' | 'active' | 'match' | 'dimmed' | 'subTree' | 'comparing' | 'sorted' | 'swapping';
  x: number; // percentage 0–100
  y: number; // pixels
}

export interface TrieRadialEdge {
  fromId: string | number;
  toId: string | number;
  char?: string;
  state: 'default' | 'active' | 'match' | 'dimmed' | 'comparing' | 'sorted';
}

export interface TrieRadialProps {
  trieNodes: TrieRadialNode[];
  trieEdges: TrieRadialEdge[];
  currentWords?: string[];
  activePrefix?: string;
  title?: string;
  subtitle?: string;
  onNodeClick?: (char: string) => void;
  onToggleFullscreen?: () => void;
}

export const TrieRadial: React.FC<TrieRadialProps> = ({
  trieNodes = [],
  trieEdges = [],
  currentWords = [],
  activePrefix = '',
  title = 'TRIE RADIAL CANVAS',
  subtitle,
  onNodeClick,
  onToggleFullscreen,
}) => {
  const nodesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nodesRef.current || trieNodes.length === 0) return;
    const nodeEls = Array.from(
      nodesRef.current.querySelectorAll<HTMLElement>('.trieradial-node-wrapper')
    );

    // Active path descend animation
    const activeEls = trieNodes
      .map((node, i) => ({ node, el: nodeEls[i] }))
      .filter(({ node }) => node.state === 'active' || node.state === 'match' || node.state === 'comparing' || node.state === 'sorted')
      .map(({ el }) => el)
      .filter(Boolean);

    if (activeEls.length > 0) {
      MotionPresets.trieDescend(activeEls);
    }

    // Subtree highlight popIn cascade
    const subTreeEls = trieNodes
      .map((node, i) => ({ node, el: nodeEls[i] }))
      .filter(({ node }) => node.state === 'subTree' || node.state === 'swapping')
      .map(({ el }) => el)
      .filter(Boolean);

    if (subTreeEls.length > 0) {
      MotionPresets.branchExpand(subTreeEls);
    }
  }, [trieNodes]);

  if (trieNodes.length === 0) {
    return (
      <div className="shared-canvas-container animate-fade-in">
        <div className="shared-canvas-header">
          <div className="canvas-header-left">
            <span className="shared-canvas-title">{title}</span>
            <span className="shared-canvas-subtitle">Trie is empty</span>
          </div>
        </div>
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
      </div>
    );
  }

  const nodeMap = new Map(trieNodes.map(n => [n.id, n]));
  const maxY = Math.max(420, ...trieNodes.map(n => n.y + 80));
  const displaySubtitle =
    subtitle || `${trieNodes.length} node${trieNodes.length !== 1 ? 's' : ''} \u2022 ${trieEdges.length} edge${trieEdges.length !== 1 ? 's' : ''}${currentWords.length > 0 ? ` \u2022 ${currentWords.length} word(s)` : ''}`;

  return (
    <div className="shared-canvas-container animate-fade-in">
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          <span className="shared-canvas-subtitle">{displaySubtitle}</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div className="trieradial-workspace">
        {/* SVG Edges with Character Labels */}
        <svg className="trieradial-svg-layer" width="100%" height={`${maxY}px`}>
          {trieEdges.map((edge, idx) => {
            const parent = nodeMap.get(edge.fromId);
            const child = nodeMap.get(edge.toId);
            if (!parent || !child) return null;

            const edgeChar = edge.char || child.char;
            const midY = (parent.y + child.y) / 2;
            const midXPercent = (parent.x + child.x) / 2;

            let lineState: any = 'default';
            if (edge.state === 'active' || edge.state === 'comparing') lineState = 'comparing';
            else if (edge.state === 'match' || edge.state === 'sorted') lineState = 'sorted';

            return (
              <g key={idx}>
                <Line
                  x1={`${parent.x}%`}
                  y1={parent.y}
                  x2={`${child.x}%`}
                  y2={child.y}
                  state={lineState}
                  strokeWidth={2.5}
                />
                {/* Character label on edge */}
                {edgeChar && (
                  <g className="trieradial-edge-label-group">
                    <rect
                      x={`${midXPercent - 1.2}%`}
                      y={midY - 9}
                      width="24"
                      height="18"
                      rx="4"
                      fill="var(--color-surface)"
                      stroke="var(--color-border)"
                      strokeWidth="1"
                    />
                    <text
                      x={`${midXPercent}%`}
                      y={midY}
                      className="trieradial-edge-text"
                    >
                      {edgeChar}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Trie Nodes Layer */}
        <div ref={nodesRef} className="trieradial-nodes-layer" style={{ height: `${maxY}px` }}>
          {trieNodes.map(node => {
            let circleState: any = 'default';
            if (node.state === 'active' || node.state === 'comparing') circleState = 'comparing';
            else if (node.state === 'match' || node.state === 'sorted') circleState = 'sorted';
            else if (node.state === 'subTree' || node.state === 'swapping') circleState = 'swapping';

            let wrapperClass = 'trieradial-node-wrapper';
            if (node.state === 'dimmed') wrapperClass += ' is-dimmed';
            if (node.state === 'subTree') wrapperClass += ' is-subTree';

            return (
              <div
                key={node.id}
                className={wrapperClass}
                style={{ left: `${node.x}%`, top: `${node.y}px` }}
                onClick={() => onNodeClick?.(node.char)}
              >
                {/* End of Word Badge */}
                {node.isEndOfWord && (
                  <span className="trie-eow-badge" title="End of Word">
                    <CircleCheck size={16} strokeWidth={2.5} />
                  </span>
                )}

                <CircleNode
                  value={node.char || '\u2219'}
                  state={circleState}
                  size={46}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Words List Bar */}
      {currentWords.length > 0 && (
        <div className="trie-word-display">
          <span className="trie-word-label">DICTIONARY:</span>
          <div className="trie-word-pills">
            {currentWords.map((word, i) => (
              <span key={i} className="trie-word-pill">{word}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
