import React, { useEffect, useState } from 'react';
import { Code, Play, RotateCcw, AlertTriangle, Eye, Pencil, Loader2, Check } from 'lucide-react';
import { getStackQueueSnippets, STACKQUEUE_GO_SNIPPETS, type LanguageKey } from './stackQueueSnippets';
import type { StackQueueCategory } from './stackQueueEngine';
import {
  getStubEntry,
  type CustomStubLanguage,
} from '../../data/customCode';
import { type DebuggerLanguage } from '../../data/languages';
import { LanguageDropdown } from '../../components/debugger/LanguageDropdown';
import '../../components/debugger/Debugger.css';

type CodeMode = 'default' | 'custom';

export interface StackQueueCustomState {
  active: boolean;
  code: string;
  lang: CustomStubLanguage;
}

interface StackQueueCodePanelProps {
  category: StackQueueCategory;
  activeLine?: number;
  /** Lifts the custom-mode editor state to the page so the existing
   *  Push/Pop/Enqueue/Dequeue buttons can replay it in the sandbox. */
  onCustomStateChange?: (state: StackQueueCustomState) => void;
  customBusy?: boolean;
  customMessage?: string | null;
}

export const StackQueueCodePanel: React.FC<StackQueueCodePanelProps> = ({
  category,
  activeLine = 1,
  onCustomStateChange,
  customBusy = false,
  customMessage = null,
}) => {
  const [selectedLang, setSelectedLang] = useState<DebuggerLanguage>('python');
  const [codeMode, setCodeMode] = useState<CodeMode>('default');
  const [customLang, setCustomLang] = useState<CustomStubLanguage>('python');

  // Signature stub for this problem (LeetCode-style fill-in-the-body model).
  const stubEntry = getStubEntry('stackQueue', category);

  const [customCode, setCustomCode] = useState<string>(() =>
    stubEntry ? stubEntry.stubs.python : ''
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (stubEntry) {
      setCustomCode(stubEntry.stubs[customLang]);
    }
    setExecutionError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, customLang, stubEntry?.key]);

  // Keep the page informed so operation buttons can drive sandbox replays.
  useEffect(() => {
    onCustomStateChange?.({ active: codeMode === 'custom', code: customCode, lang: customLang });
  }, [codeMode, customCode, customLang, onCustomStateChange]);

  const snippetObj = getStackQueueSnippets(category);

  // Go references exist for the flagship set; anything else reports the gap
  // explicitly instead of silently falling back to another language.
  const goSnippet = STACKQUEUE_GO_SNIPPETS[category];
  const currentSnippet = selectedLang === 'go' ? goSnippet : snippetObj[selectedLang as LanguageKey];
  const codeLines = currentSnippet?.code.split('\n') ?? [];
  const highlightedIdx = currentSnippet?.lineMapping[activeLine] ?? 0;

  const handleRunCustomCode = () => {
    if (isRunning) return;
    setExecutionError(null);
    if (!customCode.trim()) {
      setExecutionError('The editor is empty. Fill in the method bodies, then trigger an operation.');
      return;
    }
    // Stateful structures execute through the existing operation buttons:
    // each click replays the full operation history against a fresh instance.
    if (stubEntry?.kind === 'class') {
      setExecutionError('Stateful structures run through the operation buttons above (Push / Pop / Enqueue / Dequeue) — every click replays your full operation history in the sandbox.');
      return;
    }
    setExecutionError('Sandbox execution for function-style problems is being rolled out studio by studio. The stack/queue primitives run custom code today.');
  };

  const handleResetTemplate = () => {
    if (stubEntry) setCustomCode(stubEntry.stubs[customLang]);
    setExecutionError(null);
    setRunSuccess(null);
  };

  return (
    <div className="multi-lang-code-panel">
      {/* Header */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Code size={16} className="text-amber-400" />
          <span>SOURCE CODE</span>
        </div>

        {/* Mode Toggle */}
        <div className="code-mode-toggle">
          <button
            className={`mode-btn ${codeMode === 'default' ? 'active' : ''}`}
            onClick={() => { setCodeMode('default'); setExecutionError(null); }}
          >
            <Eye size={12} />
            <span>Reference</span>
          </button>
          <button
            className={`mode-btn ${codeMode === 'custom' ? 'active' : ''}`}
            onClick={() => setCodeMode('custom')}
          >
            <Pencil size={12} />
            <span>Paste code</span>
          </button>
        </div>

      </div>

      {codeMode === 'default' && (
        <div className="code-toolbar">
          <LanguageDropdown value={selectedLang} onChange={setSelectedLang}
            available={['cpp', 'java', 'python', 'go']} ariaLabel="Reference code language" />
        </div>
      )}

      {codeMode === 'custom' && (
        <div className="code-toolbar">
          <LanguageDropdown value={customLang} ariaLabel="Custom code language" onChange={(language) => {
            const nextTemplate = stubEntry?.stubs[language] ?? '';
            if (customCode !== nextTemplate && !window.confirm('Switching languages will clear your current code. Continue?')) return;
            setCustomLang(language);
          }} />
        </div>
      )}

      {/* DEFAULT MODE: Read-only viewer */}
      {codeMode === 'default' && !currentSnippet && (
        <div className="code-editor-container">
          <div className="code-error-banner" style={{ margin: '0.75rem' }}>
            <AlertTriangle size={14} />
            <span>
              This reference implementation is coming soon. Custom Mode supports all six languages.
            </span>
          </div>
        </div>
      )}

      {/* DEFAULT MODE: Read-only viewer */}
      {codeMode === 'default' && currentSnippet && (
        <div className="code-editor-container">
          {codeLines.map((line, idx) => {
            const lineNumber = idx + 1;
            const isCurrentLine = highlightedIdx === lineNumber;

            return (
              <div
                key={idx}
                className={`code-editor-line ${isCurrentLine ? 'active-execution-line' : ''}`}
              >
                <div className="line-gutter">
                  {isCurrentLine && <Play size={10} className="current-line-arrow" />}
                  <span className="line-number">{lineNumber}</span>
                </div>
                <div className="line-text">
                  <code>{line}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CUSTOM MODE: Editable editor */}
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
              onChange={(e) => { setCustomCode(e.target.value); setExecutionError(null); setRunSuccess(null); }}
              spellCheck={false}
              placeholder={`Fill in the ${customLang.toUpperCase()} method bodies. Operations from the toolbar replay your code in the sandbox.`}
            />
          </div>

          {executionError && (
            <div className="code-error-banner">
              <AlertTriangle size={14} />
              <span>{executionError}</span>
            </div>
          )}

          {customMessage && (
            <div className="code-error-banner" role="status">
              <Check size={14} />
              <span>{customMessage}</span>
            </div>
          )}

          <div className="code-run-bar">
            <button className="run-code-btn" onClick={handleRunCustomCode} disabled={customBusy}>
              {customBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
              <span>{customBusy ? 'Running in sandbox…' : 'Run Code'}</span>
            </button>
            <button className="reset-code-btn" onClick={handleResetTemplate}>
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
