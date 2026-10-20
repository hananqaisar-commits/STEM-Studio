import React from 'react';
import { BookOpen, X } from 'lucide-react';
import './DefinitionCardPanel.css';

export interface DefinitionItem {
  term: string;
  explanation: string;
}

interface DefinitionCardPanelProps {
  definitions: DefinitionItem[];
  visible: boolean;
  onToggle: () => void;
}

/**
 * Toggleable definition card overlay — renders 3-5 vocabulary cards
 * on the right edge of the canvas. Collapsed by default; a small
 * "Definitions" pill-button in the canvas header triggers it.
 *
 * Each renderer populates it with its own core vocabulary:
 *   Stack  → LIFO, PUSH, POP, STATE
 *   Queue  → FIFO, ENQUEUE, DEQUEUE, STATE
 *   LL     → POINTER, NODE, HEAD/TAIL, NULL
 */
export const DefinitionCardPanel: React.FC<DefinitionCardPanelProps> = ({
  definitions,
  visible,
  onToggle,
}) => {
  return (
    <>
      {/* Toggle Button — rendered inline in the canvas header */}
      <button
        type="button"
        className={`def-panel-toggle ${visible ? 'is-open' : ''}`}
        onClick={onToggle}
        title={visible ? 'Hide definitions' : 'Show definitions'}
      >
        <BookOpen size={13} />
        <span>Definitions</span>
      </button>

      {/* Floating Overlay Panel */}
      {visible && (
        <div className="def-panel-overlay">
          <div className="def-panel-header">
            <span className="def-panel-title">Key Concepts</span>
            <button
              type="button"
              className="def-panel-close"
              onClick={onToggle}
              title="Close definitions"
            >
              <X size={14} />
            </button>
          </div>

          {definitions.map((def) => (
            <div key={def.term} className="def-card">
              <div className="def-card-term">{def.term}</div>
              <div className="def-card-explanation">{def.explanation}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
