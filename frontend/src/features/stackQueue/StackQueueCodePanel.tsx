import React, { useState } from 'react';
import { Code, Terminal, Cpu, Code2, Play, RotateCcw, AlertTriangle, Eye, Pencil } from 'lucide-react';
import { getStackQueueSnippets, type LanguageKey } from './stackQueueSnippets';
import type { StackQueueCategory } from './stackQueueEngine';
import type { CustomLanguage } from '../../engine/customCodeTemplates';
import '../../components/debugger/Debugger.css';

type CodeMode = 'default' | 'custom';

interface StackQueueCodePanelProps {
  category: StackQueueCategory;
  activeLine?: number;
  onCustomCodeRun?: (code: string, lang: CustomLanguage) => void;
}

const LANGUAGES: { id: LanguageKey; label: string; icon: React.ReactNode }[] = [
  { id: 'javascript', label: 'JavaScript', icon: <Code size={14} /> },
  { id: 'python', label: 'Python', icon: <Terminal size={14} /> },
  { id: 'cpp', label: 'C++', icon: <Cpu size={14} /> },
  { id: 'java', label: 'Java', icon: <Code2 size={14} /> },
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

const PROBLEM_TEMPLATES: Record<string, Record<CustomLanguage, string>> = {
  stack: {
    javascript: `// Stack Push (LIFO) in JavaScript\nstack.push(value);`,
    python: `# Stack Push in Python\nstack.append(value)`,
    cpp: `// Stack Push in C++\nstack.push(value);`,
    csharp: `// Stack Push in C#\nstack.Push(value);`,
    java: `// Stack Push in Java\nstack.push(value);`,
    ruby: `# Stack Push in Ruby\nstack.push(value)`,
    go: `// Stack Push in Go\nstack = append(stack, value)`,
    rust: `// Stack Push in Rust\nstack.push(value);`,
  },
  queue: {
    javascript: `// Queue Enqueue (FIFO) in JavaScript\nqueue.push(value);`,
    python: `# Queue Enqueue in Python\nqueue.append(value)`,
    cpp: `// Queue Enqueue in C++\nqueue.push(value);`,
    csharp: `// Queue Enqueue in C#\nqueue.Enqueue(value);`,
    java: `// Queue Enqueue in Java\nqueue.add(value);`,
    ruby: `# Queue Enqueue in Ruby\nqueue.push(value)`,
    go: `// Queue Enqueue in Go\nqueue = append(queue, value)`,
    rust: `// Queue Enqueue in Rust\nqueue.push_back(value);`,
  },
  validParentheses: {
    javascript: `// Valid Parentheses (#20) in JavaScript\nconst stack = [];\nfor (let ch of input) {\n  if ('([{'.includes(ch)) stack.push(ch);\n  else {\n    const top = stack.pop();\n    if ((ch === ')' && top !== '(') || (ch === ']' && top !== '[') || (ch === '}' && top !== '{')) return false;\n  }\n}\nreturn stack.length === 0;`,
    python: `# Valid Parentheses (#20) in Python\nstack = []\nmapping = {")": "(", "]": "[", "}": "{"}\nfor char in s:\n    if char in mapping:\n        top_element = stack.pop() if stack else '#'\n        if mapping[char] != top_element:\n            return False\n    else:\n        stack.append(char)\nreturn not stack`,
    cpp: `// Valid Parentheses (#20) in C++\nstack<char> st;\nfor (char c : s) {\n    if (c == '(' || c == '{' || c == '[') st.push(c);\n    else {\n        if (st.empty()) return false;\n        if ((c == ')' && st.top() != '(') || (c == ']' && st.top() != '[') || (c == '}' && st.top() != '{')) return false;\n        st.pop();\n    }\n}\nreturn st.empty();`,
    csharp: `// Valid Parentheses (#20) in C#\nStack<char> stack = new Stack<char>();\nforeach (char c in s) {\n    if (c == '(' || c == '{' || c == '[') stack.Push(c);\n    else {\n        if (stack.Count == 0) return false;\n        char top = stack.Pop();\n        if ((c == ')' && top != '(') || (c == ']' && top != '[') || (c == '}' && top != '{')) return false;\n    }\n}\nreturn stack.Count == 0;`,
    java: `// Valid Parentheses (#20) in Java\nStack<Character> stack = new Stack<>();\nfor (char c : s.toCharArray()) {\n    if (c == '(' || c == '{' || c == '[') stack.push(c);\n    else {\n        if (stack.isEmpty()) return false;\n        char top = stack.pop();\n        if ((c == ')' && top != '(') || (c == ']' && top != '[') || (c == '}' && top != '{')) return false;\n    }\n}\nreturn stack.isEmpty();`,
    ruby: `# Valid Parentheses (#20) in Ruby\nstack = []\nmap = { ')' => '(', ']' => '[', '}' => '{' }\ns.each_char do |ch|\n  if map.key?(ch)\n    return false if stack.pop != map[ch]\n  else\n    stack.push(ch)\n  end\nend\nstack.empty?`,
    go: `// Valid Parentheses (#20) in Go\nstack := []rune{}\nfor _, char := range s {\n    if char == '(' || char == '{' || char == '[' {\n        stack = append(stack, char)\n    } else {\n        if len(stack) == 0 { return false }\n        top := stack[len(stack)-1]\n        stack = stack[:len(stack)-1]\n        if (char == ')' && top != '(') || (char == ']' && top != '[') || (char == '}' && top != '{') { return false }\n    }\n}\nreturn len(stack) == 0`,
    rust: `// Valid Parentheses (#20) in Rust\nlet mut stack = Vec::new();\nfor c in s.chars() {\n    match c {\n        '(' | '{' | '[' => stack.push(c),\n        ')' => if stack.pop() != Some('(') { return false; },\n        ']' => if stack.pop() != Some('[') { return false; },\n        '}' => if stack.pop() != Some('{') { return false; },\n        _ => ()\n    }\n}\nstack.is_empty()`,
  },
};

export const StackQueueCodePanel: React.FC<StackQueueCodePanelProps> = ({
  category,
  activeLine = 1,
  onCustomCodeRun,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageKey>('javascript');
  const [codeMode, setCodeMode] = useState<CodeMode>('default');
  const [customLang, setCustomLang] = useState<CustomLanguage>('javascript');
  
  const getTemplate = (cat: string, lang: CustomLanguage): string => {
    return PROBLEM_TEMPLATES[cat]?.[lang] || PROBLEM_TEMPLATES.stack[lang];
  };

  const [customCode, setCustomCode] = useState<string>(() => getTemplate(category, 'javascript'));
  const [executionError, setExecutionError] = useState<string | null>(null);

  React.useEffect(() => {
    setCustomCode(getTemplate(category, customLang));
    setExecutionError(null);
  }, [category, customLang]);

  const snippetObj = getStackQueueSnippets(category);

  const currentSnippet = snippetObj[selectedLang] || snippetObj.javascript;
  const codeLines = currentSnippet.code.split('\n');
  const highlightedIdx = currentSnippet.lineMapping[activeLine] ?? 0;

  const handleRunCustomCode = () => {
    setExecutionError(null);
    const trimmed = customCode.trim();
    if (!trimmed) {
      setExecutionError('Paste a function to visualize. Empty code is not allowed.');
      return;
    }
    if (onCustomCodeRun) {
      onCustomCodeRun(customCode, customLang);
    }
  };

  const handleResetTemplate = () => {
    setCustomCode(getTemplate(category, customLang));
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

      {/* CUSTOM MODE: Multi-Language Bar */}
      {codeMode === 'custom' && (
        <div className="custom-lang-bar flex flex-wrap gap-1 p-2 bg-slate-900/60 border-b border-slate-800">
          {CUSTOM_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`px-2 py-0.5 text-xs rounded transition-all ${
                customLang === lang.id
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() => setCustomLang(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}

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
              placeholder={`Paste your ${customLang.toUpperCase()} function here. Only one function is allowed — no top-level variables or statements.`}
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

