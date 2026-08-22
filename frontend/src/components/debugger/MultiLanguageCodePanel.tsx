import React, { useState } from 'react';
import { Code, Play, Layers, Terminal, Cpu, Code2, Binary, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { SORTING_CODE_SNIPPETS } from '../../features/sorting/data/codeSnippets';
import type { CodeLanguage } from '../../features/sorting/data/codeSnippets';
import { getStarterTemplate, type CustomLanguage } from '../../engine/customCodeTemplates';
import { executeCustomSortingCode } from '../../engine/codeExecutionEngine';
import type { ArrayStep } from '../../engine/types/Step';
import './Debugger.css';

type CodeMode = 'default' | 'custom';

interface MultiLanguageCodePanelProps {
  algorithmKey: string;
  activeLine?: number;
  breakpoints: number[];
  onToggleBreakpoint: (lineNumber: number) => void;
  variables?: Record<string, string | number | boolean | null>;
  callStack?: string[];
  /** Called when user runs custom code — parent receives the generated steps */
  onCustomCodeRun?: (steps: ArrayStep[]) => void;
  /** Current input array from the parent page (for custom code execution) */
  currentArray?: number[];
}

const LANGUAGES: { id: CodeLanguage; label: string; icon: React.ReactNode }[] = [
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
  { id: 'go', label: 'Go', icon: <Binary size={14} /> },
  { id: 'pseudocode', label: 'Pseudocode', icon: <FileText size={14} /> },
];

const CUSTOM_LANGUAGES: { id: CustomLanguage; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'java', label: 'Java' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
];

export const MultiLanguageCodePanel: React.FC<MultiLanguageCodePanelProps> = ({
  algorithmKey,
  activeLine,
  breakpoints,
  onToggleBreakpoint,
  variables = {},
  callStack = [],
  onCustomCodeRun,
  currentArray,
}) => {
  const [selectedLang, setSelectedLang] = useState<CodeLanguage>('python');
  const [codeMode, setCodeMode] = useState<CodeMode>('default');
  const [customLang, setCustomLang] = useState<CustomLanguage>('javascript');
  const [customCode, setCustomCode] = useState<string>(() => getStarterTemplate(algorithmKey, 'javascript'));
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Sync template when algorithm or custom language changes
  React.useEffect(() => {
    setCustomCode(getStarterTemplate(algorithmKey, customLang));
    setExecutionError(null);
  }, [algorithmKey, customLang]);

  const algorithmSnippets = SORTING_CODE_SNIPPETS[algorithmKey] || SORTING_CODE_SNIPPETS.bubble;
  const currentCodeLines = algorithmSnippets[selectedLang] || algorithmSnippets.pseudocode;

  const variableEntries = Object.entries(variables);

  const handleRunCustomCode = () => {
    if (!currentArray || currentArray.length === 0) {
      setExecutionError('No input array available. Generate or enter values first.');
      return;
    }

    setExecutionError(null);
    const result = executeCustomSortingCode(customCode, currentArray, customLang);

    if (result.error) {
      setExecutionError(result.error.message);
    }

    if (onCustomCodeRun) {
      onCustomCodeRun(result.steps);
    }
  };

  const handleResetTemplate = () => {
    setCustomCode(getStarterTemplate(algorithmKey, customLang));
    setExecutionError(null);
  };

  return (
    <div className="multi-lang-code-panel">
      {/* Panel Header */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Code size={16} className="text-accent" />
          <span>SOURCE CODE</span>
        </div>

        {/* Mode Toggle: Default / Custom */}
        <div className="code-mode-toggle">
          <button
            className={`mode-btn ${codeMode === 'default' ? 'active' : ''}`}
            onClick={() => { setCodeMode('default'); setExecutionError(null); }}
          >
            Default
          </button>
          <button
            className={`mode-btn ${codeMode === 'custom' ? 'active' : ''}`}
            onClick={() => setCodeMode('custom')}
          >
            Custom
          </button>
        </div>

        {/* Language tabs (only in default mode) */}
        {codeMode === 'default' && (
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
        )}
      </div>

      {/* CUSTOM MODE: Multi-Language Bar */}
      {codeMode === 'custom' && (
        <div className="custom-lang-bar flex flex-wrap gap-1 p-2 bg-slate-900/60 border-b border-slate-800">
          {CUSTOM_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                customLang === lang.id
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() => setCustomLang(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}

      {/* DEFAULT MODE: Read-only code viewer (existing behavior) */}
      {codeMode === 'default' && (
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
      )}

      {/* CUSTOM MODE: Editable code editor + Run button */}
      {codeMode === 'custom' && (
        <>
          <div className="custom-code-editor">
            <div className="custom-editor-gutter">
              {customCode.split('\n').map((_, idx) => (
                <div key={idx} className="gutter-line-number">{idx + 1}</div>
              ))}
            </div>
            <textarea
              className="custom-editor-textarea"
              value={customCode}
              onChange={(e) => { setCustomCode(e.target.value); setExecutionError(null); }}
              spellCheck={false}
              placeholder="Write your JavaScript sorting code here..."
            />
          </div>

          {/* Error Banner */}
          {executionError && (
            <div className="code-error-banner">
              <AlertTriangle size={14} />
              <span>{executionError}</span>
            </div>
          )}

          {/* Run / Reset Bar */}
          <div className="code-run-bar">
            <button className="run-code-btn" onClick={handleRunCustomCode}>
              <Play size={14} />
              <span>Run Code</span>
            </button>
            <button className="reset-code-btn" onClick={handleResetTemplate}>
              <RotateCcw size={14} />
              <span>Reset Template</span>
            </button>
          </div>
        </>
      )}

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
