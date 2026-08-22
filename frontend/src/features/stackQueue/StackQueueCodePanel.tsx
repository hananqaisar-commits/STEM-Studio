import React, { useState } from 'react';
import { Code, Terminal, Cpu, Code2, Play } from 'lucide-react';
import { STACK_SNIPPETS, QUEUE_SNIPPETS, PARENTHESES_SNIPPETS, POSTFIX_SNIPPETS, QVS_SNIPPETS, DAILY_TEMP_SNIPPETS, type LanguageKey } from './stackQueueSnippets';
import type { StackQueueCategory } from './stackQueueEngine';
import '../../components/debugger/Debugger.css';

interface StackQueueCodePanelProps {
  category: StackQueueCategory;
  activeLine?: number;
}

const LANGUAGES: { id: LanguageKey; label: string; icon: React.ReactNode }[] = [
  { id: 'javascript', label: 'JavaScript', icon: <Code size={14} /> },
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
];

export const StackQueueCodePanel: React.FC<StackQueueCodePanelProps> = ({
  category,
  activeLine = 1,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageKey>('javascript');

  let snippetObj = STACK_SNIPPETS;
  if (category === 'queue') snippetObj = QUEUE_SNIPPETS;
  if (category === 'validParentheses') snippetObj = PARENTHESES_SNIPPETS;
  if (category === 'postfixEval') snippetObj = POSTFIX_SNIPPETS;
  if (category === 'queueViaStacks') snippetObj = QVS_SNIPPETS;
  if (category === 'dailyTemperatures') snippetObj = DAILY_TEMP_SNIPPETS;

  const currentSnippet = snippetObj[selectedLang] || snippetObj.javascript;
  const codeLines = currentSnippet.code.split('\n');
  const highlightedIdx = currentSnippet.lineMapping[activeLine] ?? 0;

  return (
    <div className="multi-lang-code-panel">
      {/* Header */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Code size={16} className="text-amber-400" />
          <span>SOURCE CODE</span>
        </div>

        {/* Tabs */}
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

      {/* Editor Body */}
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
    </div>
  );
};
