import React, { useState } from 'react';
import { Code, Terminal, Cpu, Code2, Play, RotateCcw, AlertTriangle } from 'lucide-react';
import { STACK_SNIPPETS, QUEUE_SNIPPETS, PARENTHESES_SNIPPETS, POSTFIX_SNIPPETS, QVS_SNIPPETS, DAILY_TEMP_SNIPPETS, type LanguageKey } from './stackQueueSnippets';
import type { StackQueueCategory } from './stackQueueEngine';
import '../../components/debugger/Debugger.css';

type CodeMode = 'default' | 'custom';

interface StackQueueCodePanelProps {
  category: StackQueueCategory;
  activeLine?: number;
  onCustomCodeRun?: (code: string) => void;
}

const LANGUAGES: { id: LanguageKey; label: string; icon: React.ReactNode }[] = [
  { id: 'javascript', label: 'JavaScript', icon: <Code size={14} /> },
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
];

const STACK_QUEUE_TEMPLATES: Record<string, string> = {
  stack: `// Stack Push — modify and click Run
// 'stack' array and 'value' are provided
stack.push(value);`,

  queue: `// Queue Enqueue — modify and click Run
// 'queue' array and 'value' are provided
queue.push(value);`,

  validParentheses: `// Valid Parentheses — modify and click Run
// 'input' string is provided
const stack = [];
const map = { ')': '(', ']': '[', '}': '{' };
for (let ch of input) {
  if ('([{'.includes(ch)) {
    stack.push(ch);
  } else {
    if (stack.pop() !== map[ch]) return false;
  }
}
return stack.length === 0;`,
};

export const StackQueueCodePanel: React.FC<StackQueueCodePanelProps> = ({
  category,
  activeLine = 1,
  onCustomCodeRun,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageKey>('javascript');
  const [codeMode, setCodeMode] = useState<CodeMode>('default');
  const [customCode, setCustomCode] = useState<string>(() =>
    STACK_QUEUE_TEMPLATES[category] || STACK_QUEUE_TEMPLATES.stack
  );
  const [executionError, setExecutionError] = useState<string | null>(null);

  React.useEffect(() => {
    setCustomCode(STACK_QUEUE_TEMPLATES[category] || STACK_QUEUE_TEMPLATES.stack);
    setExecutionError(null);
  }, [category]);

  let snippetObj = STACK_SNIPPETS;
  if (category === 'queue') snippetObj = QUEUE_SNIPPETS;
  if (category === 'validParentheses') snippetObj = PARENTHESES_SNIPPETS;
  if (category === 'postfixEval') snippetObj = POSTFIX_SNIPPETS;
  if (category === 'queueViaStacks') snippetObj = QVS_SNIPPETS;
  if (category === 'dailyTemperatures') snippetObj = DAILY_TEMP_SNIPPETS;

  const currentSnippet = snippetObj[selectedLang] || snippetObj.javascript;
  const codeLines = currentSnippet.code.split('\n');
  const highlightedIdx = currentSnippet.lineMapping[activeLine] ?? 0;

  const handleRunCustomCode = () => {
    setExecutionError(null);
    if (onCustomCodeRun) {
      onCustomCodeRun(customCode);
    }
  };

  const handleResetTemplate = () => {
    setCustomCode(STACK_QUEUE_TEMPLATES[category] || STACK_QUEUE_TEMPLATES.stack);
    setExecutionError(null);
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
            Default
          </button>
          <button
            className={`mode-btn ${codeMode === 'custom' ? 'active' : ''}`}
            onClick={() => setCodeMode('custom')}
          >
            Custom
          </button>
        </div>

        {/* Language Tabs (default mode only) */}
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

      {/* DEFAULT MODE: Read-only viewer */}
      {codeMode === 'default' && (
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
              onChange={(e) => { setCustomCode(e.target.value); setExecutionError(null); }}
              spellCheck={false}
              placeholder="Write your JavaScript code here..."
            />
          </div>

          {executionError && (
            <div className="code-error-banner">
              <AlertTriangle size={14} />
              <span>{executionError}</span>
            </div>
          )}

          <div className="code-run-bar">
            <button className="run-code-btn" onClick={handleRunCustomCode}>
              <Play size={14} />
              <span>Run Code</span>
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
