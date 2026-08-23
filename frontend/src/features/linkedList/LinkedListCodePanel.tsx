import React, { useState } from 'react';
import { Code2, Terminal, Cpu, Binary, FileText } from 'lucide-react';
import { LINKED_LIST_SNIPPETS, type LLCodeLanguage } from './linkedListSnippets';
import '../debugger/Debugger.css';

interface LinkedListCodePanelProps {
  snippetKey: string;
  activeLine?: number;
  pointers?: Record<string, string | null>;
  nodesCount?: number;
}

const LANGUAGES: { id: LLCodeLanguage; label: string; icon: React.ReactNode }[] = [
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
  { id: 'javascript', label: 'JavaScript', icon: <Code2 size={14} /> },
  { id: 'go', label: 'Go', icon: <Binary size={14} /> },
  { id: 'pseudocode', label: 'Pseudocode', icon: <FileText size={14} /> },
];

export const LinkedListCodePanel: React.FC<LinkedListCodePanelProps> = ({
  snippetKey,
  activeLine,
  pointers = {},
  nodesCount = 0,
}) => {
  const [selectedLang, setSelectedLang] = useState<LLCodeLanguage>('python');

  const snippets = LINKED_LIST_SNIPPETS[snippetKey] || LINKED_LIST_SNIPPETS.singly_insert_head;
  const lines = snippets[selectedLang] || snippets.pseudocode || [];

  return (
    <div className="multi-lang-code-panel" style={{ height: '100%' }}>
      {/* Code Panel Header */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Code2 size={16} className="text-accent" />
          <span>SOURCE CODE & DEBUGGER</span>
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
      <div className="variables-section" style={{ borderTop: '1px solid var(--border-color)', padding: '0.75rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
          LIVE POINTER STATE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div className="variable-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: '#818cf8' }}>
            <span className="var-name" style={{ color: '#a5b4fc' }}>nodes_count:</span>
            <span className="var-val">{nodesCount}</span>
          </div>
          {Object.entries(pointers).map(([ptrKey, ptrVal]) => (
            <div key={ptrKey} className="variable-pill">
              <span className="var-name">{ptrKey}:</span>
              <span className="var-val" style={{ color: ptrVal ? '#38bdf8' : '#94a3b8' }}>
                {ptrVal || 'NULL'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
