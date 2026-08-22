import React, { useState } from 'react';
import { Code, Play, Layers, Terminal, Cpu, Code2, Binary, FileText } from 'lucide-react';
import { SORTING_CODE_SNIPPETS } from '../../features/sorting/data/codeSnippets';
import type { CodeLanguage } from '../../features/sorting/data/codeSnippets';
import './Debugger.css';

interface MultiLanguageCodePanelProps {
  algorithmKey: string;
  activeLine?: number;
  breakpoints: number[];
  onToggleBreakpoint: (lineNumber: number) => void;
  variables?: Record<string, string | number | boolean | null>;
  callStack?: string[];
}

const LANGUAGES: { id: CodeLanguage; label: string; icon: React.ReactNode }[] = [
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
  { id: 'go', label: 'Go', icon: <Binary size={14} /> },
  { id: 'pseudocode', label: 'Pseudocode', icon: <FileText size={14} /> },
];

export const MultiLanguageCodePanel: React.FC<MultiLanguageCodePanelProps> = ({
  algorithmKey,
  activeLine,
  breakpoints,
  onToggleBreakpoint,
  variables = {},
  callStack = [],
}) => {
  const [selectedLang, setSelectedLang] = useState<CodeLanguage>('python');

  const algorithmSnippets = SORTING_CODE_SNIPPETS[algorithmKey] || SORTING_CODE_SNIPPETS.bubble;
  const currentCodeLines = algorithmSnippets[selectedLang] || algorithmSnippets.pseudocode;

  const variableEntries = Object.entries(variables);

  return (
    <div className="multi-lang-code-panel">
      {/* Language Selector Header */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Code size={16} className="text-accent" />
          <span>SOURCE CODE</span>
        </div>

        {/* Language Tabs */}
        <div className="language-tabs">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`lang-tab ${selectedLang === lang.id ? 'active' : ''}`}
              onClick={() => setSelectedLang(lang.id)}
            >
              <span className="lang-icon">{lang.icon}</span>
              <span className="lang-label">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="code-editor-container">
        {currentCodeLines.map((line, idx) => {
          const lineNumber = idx + 1;
          const isCurrentLine = activeLine === lineNumber;
          const hasBreakpoint = breakpoints.includes(lineNumber);

          return (
            <div
              key={idx}
              className={`code-editor-line ${isCurrentLine ? 'active-execution-line' : ''}`}
            >
              {/* Breakpoint Gutter */}
              <div
                className="line-gutter"
                onClick={() => onToggleBreakpoint(lineNumber)}
                title={hasBreakpoint ? `Remove Breakpoint line ${lineNumber}` : `Set Breakpoint line ${lineNumber}`}
              >
                {hasBreakpoint && <div className="red-breakpoint-dot" />}
                {isCurrentLine && <Play size={10} className="current-line-arrow" />}
                <span className="line-number">{lineNumber}</span>
              </div>

              {/* Code Line Content */}
              <div className="line-text">
                <code>{line}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Integrated Scope Variables & Call Stack Section */}
      <div className="integrated-scope-section">
        <div className="scope-box">
          <div className="scope-header">
            <span>SCOPE VARIABLES</span>
            <span className="scope-badge">{variableEntries.length} active</span>
          </div>
          <div className="scope-pills-container">
            {variableEntries.length === 0 ? (
              <span className="scope-empty">Press Play to inspect variables</span>
            ) : (
              variableEntries.map(([key, val]) => (
                <div key={key} className="scope-pill">
                  <span className="pill-name">{key}:</span>
                  <span className={`pill-val val-type-${typeof val}`}>
                    {val === null ? 'null' : String(val)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {callStack.length > 0 && (
          <div className="stack-box">
            <div className="stack-header">
              <Layers size={12} />
              <span>STACK</span>
            </div>
            <div className="stack-pill">
              {callStack[callStack.length - 1]}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
