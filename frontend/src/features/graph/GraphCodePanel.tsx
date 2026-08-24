import React, { useState } from 'react';
import { Code2, Terminal, Cpu, Binary, FileText } from 'lucide-react';
import { GRAPH_SNIPPETS, type GraphCodeLanguage } from './graphSnippets';
import '../../components/debugger/Debugger.css';

interface GraphCodePanelProps {
  snippetKey: string;
  activeLine?: number;
  currentNodeId?: string | null;
  visitedCount?: number;
  queueSize?: number;
}

const LANGUAGES: { id: GraphCodeLanguage; label: string; icon: React.ReactNode }[] = [
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
  { id: 'javascript', label: 'JavaScript', icon: <Code2 size={14} /> },
  { id: 'go', label: 'Go', icon: <Binary size={14} /> },
  { id: 'pseudocode', label: 'Pseudocode', icon: <FileText size={14} /> },
];

export const GraphCodePanel: React.FC<GraphCodePanelProps> = ({
  snippetKey,
  activeLine,
  currentNodeId,
  visitedCount = 0,
  queueSize = 0,
}) => {
  const [selectedLang, setSelectedLang] = useState<GraphCodeLanguage>('python');

  const snippets = GRAPH_SNIPPETS[snippetKey] || GRAPH_SNIPPETS.bfs;
  const lines = snippets[selectedLang] || snippets.pseudocode || [];

  return (
    <div className="multi-lang-code-panel" style={{ height: '100%' }}>
      {/* Code Panel Header */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Code2 size={16} className="text-accent" />
          <span>GRAPH CODE & DEBUGGER</span>
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

      {/* Live Variable Inspector */}
      <div
        className="variables-section"
        style={{ borderTop: '1px solid var(--color-border)', padding: '0.75rem' }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--color-text-secondary)',
            marginBottom: '0.4rem',
            letterSpacing: '0.04em',
          }}
        >
          LIVE GRAPH EXECUTION STATE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div
            className="variable-pill"
            style={{ background: 'rgba(192, 132, 252, 0.15)', borderColor: '#c084fc' }}
          >
            <span className="var-name" style={{ color: '#c084fc' }}>curr_vertex:</span>
            <span className="var-val">{currentNodeId || 'NONE'}</span>
          </div>
          <div className="variable-pill">
            <span className="var-name">visited_count:</span>
            <span className="var-val" style={{ color: '#818cf8' }}>{visitedCount}</span>
          </div>
          <div className="variable-pill">
            <span className="var-name">frontier_size:</span>
            <span className="var-val" style={{ color: '#38bdf8' }}>{queueSize}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
