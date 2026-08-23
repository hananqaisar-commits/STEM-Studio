import React, { useState } from 'react';
import { Code2, Terminal, Cpu, Binary, FileText } from 'lucide-react';
import { BINARY_SEARCH_SNIPPETS, type BSCodeLanguage } from './binarySearchSnippets';
import '../debugger/Debugger.css';

interface BinarySearchCodePanelProps {
  snippetKey: string;
  activeLine?: number;
  left?: number | null;
  mid?: number | null;
  right?: number | null;
  target?: number;
}

const LANGUAGES: { id: BSCodeLanguage; label: string; icon: React.ReactNode }[] = [
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
  { id: 'javascript', label: 'JavaScript', icon: <Code2 size={14} /> },
  { id: 'go', label: 'Go', icon: <Binary size={14} /> },
  { id: 'pseudocode', label: 'Pseudocode', icon: <FileText size={14} /> },
];

export const BinarySearchCodePanel: React.FC<BinarySearchCodePanelProps> = ({
  snippetKey,
  activeLine,
  left,
  mid,
  right,
  target,
}) => {
  const [selectedLang, setSelectedLang] = useState<BSCodeLanguage>('python');

  const snippets = BINARY_SEARCH_SNIPPETS[snippetKey] || BINARY_SEARCH_SNIPPETS.binarySearch;
  const lines = snippets[selectedLang] || snippets.pseudocode || [];

  return (
    <div className="multi-lang-code-panel" style={{ height: '100%' }}>
      {/* Code Panel Header */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Code2 size={16} className="text-accent" />
          <span>BINARY SEARCH CODE & DEBUGGER</span>
        </div>
      </div>

      {/* Language Selector Tabs */}
      <div className="language-tabs">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            className={`lang-tab ${selectedLang === lang.id ? 'active' : ''}`}
            onClick={() => setSelectedLang(lang.id)}
          >
            {lang.icon}
            <span>{lang.label}</span>
          </button>
        ))}
      </div>

      {/* Code View Body */}
      <div className="code-display-area" style={{ maxHeight: '280px', overflowY: 'auto' }}>
        <table className="code-table">
          <tbody>
            {lines.map((lineText, idx) => {
              const lineNum = idx + 1;
              const isCurrentLine = activeLine === lineNum;

              return (
                <tr
                  key={lineNum}
                  className={`code-row ${isCurrentLine ? 'active-line' : ''}`}
                >
                  <td className="line-number">{lineNum}</td>
                  <td className="line-code">
                    <pre className="code-text">{lineText}</pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Live Pointer & Variable Inspector */}
      <div
        className="variables-section"
        style={{ borderTop: '1px solid var(--border-color)', padding: '0.75rem' }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            marginBottom: '0.4rem',
            letterSpacing: '0.04em',
          }}
        >
          LIVE SEARCH STATE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div
            className="variable-pill"
            style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' }}
          >
            <span className="var-name" style={{ color: '#38bdf8' }}>target:</span>
            <span className="var-val">{target !== undefined ? target : '—'}</span>
          </div>
          <div className="variable-pill">
            <span className="var-name">left:</span>
            <span className="var-val" style={{ color: '#38bdf8' }}>
              {left !== null && left !== undefined ? left : 'NULL'}
            </span>
          </div>
          <div className="variable-pill">
            <span className="var-name">mid:</span>
            <span className="var-val" style={{ color: '#f59e0b' }}>
              {mid !== null && mid !== undefined ? mid : 'NULL'}
            </span>
          </div>
          <div className="variable-pill">
            <span className="var-name">right:</span>
            <span className="var-val" style={{ color: '#ec4899' }}>
              {right !== null && right !== undefined ? right : 'NULL'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
