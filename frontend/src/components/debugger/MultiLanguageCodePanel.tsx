import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Layers, Terminal, Cpu, Code2, Binary, FileText, RotateCcw,
  AlertTriangle, ChevronDown, Check, Copy, CopyCheck, Bug, FileCode2,
  Pencil, Eye, Loader2,
} from 'lucide-react';
import { SORTING_CODE_SNIPPETS } from '../../features/sorting/data/codeSnippets';
import { FALLBACK_SNIPPETS } from '../../features/debugger/data/fallbackSnippets';
import { getStarterTemplate, type CustomLanguage } from '../../engine/customCodeTemplates';
import { executeCustomSortingCode } from '../../engine/codeExecutionEngine';
import type { ArrayStep } from '../../engine/types/Step';
import {
  getStubEntry,
  CUSTOM_CODE_LANGUAGES,
  type AlgorithmStubEntry,
  type CustomStubLanguage,
} from '../../data/customCode';
import './Debugger.css';

type CodeMode = 'default' | 'custom';

/** A language-keyed set of code lines. Accepts any subset of languages so
 *  per-feature snippet files (which add e.g. javascript) drop in cleanly. */
type SnippetSet = Partial<Record<string, string[]>>;

interface MultiLanguageCodePanelProps {
  algorithmKey: string;
  activeLine?: number;
  breakpoints?: number[];
  onToggleBreakpoint?: (lineNumber: number) => void;
  variables?: Record<string, string | number | boolean | null>;
  callStack?: string[];
  /** Called when user runs custom code — parent receives the generated steps.
   *  Custom mode is only offered when this is provided (sorting playground). */
  onCustomCodeRun?: (steps: ArrayStep[]) => void;
  /** Current input array from the parent page (for custom code execution) */
  currentArray?: number[];
  /** Correct code for THIS algorithm. When omitted we fall back to the
   *  sorting snippet table (keeps Sorting/DP working) and otherwise show a
   *  graceful placeholder instead of unrelated code. */
  snippets?: SnippetSet;
  /** Header label, e.g. "BINARY SEARCH". */
  title?: string;
  /** Registry coordinates for the Custom Code stub system. When both are
   *  provided and a stub exists, the editor pre-fills the signature stub and
   *  Run submits to the sandbox via onCustomExecute. */
  categoryId?: string;
  topicId?: string;
  /** Sandbox execution handler (see api/customCode.ts on the parent). */
  onCustomExecute?: (code: string, lang: CustomStubLanguage, entry: AlgorithmStubEntry) => void;
  customBusy?: boolean;
  customMessage?: string | null;
}

const LANG_META: Record<string, { label: string; icon: React.ReactNode }> = {
  pseudocode: { label: 'Pseudocode', icon: <FileText size={14} /> },
  python: { label: 'Python', icon: <Terminal size={14} /> },
  cpp: { label: 'C++', icon: <Cpu size={14} /> },
  java: { label: 'Java', icon: <Code2 size={14} /> },
  javascript: { label: 'JavaScript', icon: <FileCode2 size={14} /> },
  go: { label: 'Go', icon: <Binary size={14} /> },
};
const LANG_ORDER = ['python', 'cpp', 'java', 'javascript', 'go', 'pseudocode'];

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

/** Only allow a single function body; reject top-level variables or statements. */
function validateCustomCode(code: string, lang: CustomLanguage): string | null {
  const trimmed = code.trim();
  if (!trimmed) return 'Paste your algorithm to visualize. Empty code is not allowed.';

  // Count function declarations in a language-agnostic way. A bare loop body
  // (the starter-template style) is also valid — the sandbox runs the pasted
  // code as a function body with arr/n/compare/swap in scope — so zero
  // functions is allowed. Multiple functions are rejected to keep the trace readable.
  const functionPatterns: Record<string, RegExp> = {
    javascript: /\bfunction\s+\w+\s*\(/g,
    python: /\bdef\s+\w+\s*\(/g,
    cpp: /\b\w+\s+\w+\s*\([^)]*\)\s*\{/g,
    csharp: /\b\w+\s+\w+\s*\([^)]*\)\s*\{/g,
    java: /\b\w+\s+\w+\s*\([^)]*\)\s*\{/g,
    ruby: /\bdef\s+\w+/g,
    go: /\bfunc\s+\w+\s*\(/g,
    rust: /\bfn\s+\w+\s*\(/g,
  };

  const fnMatches = trimmed.match(functionPatterns[lang] || functionPatterns.javascript) || [];
  if (fnMatches.length > 1) {
    return 'Paste a single function. Multiple functions make the trace hard to follow.';
  }

  // Reject obvious top-level variable declarations / statements outside the function.
  const lines = trimmed.split('\n');
  let braceDepth = 0;
  let parenDepth = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    for (const ch of line) {
      if (ch === '{' || ch === '(') {
        if (ch === '{') braceDepth++;
        else parenDepth++;
      } else if (ch === '}' || ch === ')') {
        if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
        else parenDepth = Math.max(0, parenDepth - 1);
      }
    }

    if (braceDepth === 0 && parenDepth === 0) {
      const banned = [
        /^\s*(let|const|var|int|float|double|bool|char|string)\s+\w+\s*=/,
        /^\s*\w+\s*\w+\s*=\s*.+;/,
        /^\s*print\s*\(/,
        /^\s*console\.log\s*\(/,
        /^\s*System\.out\.println\s*\(/,
      ];
      if (banned.some((re) => re.test(line))) {
        return 'Top-level variables and statements are not allowed. Put everything inside the function.';
      }
    }
  }

  return null;
}

export const MultiLanguageCodePanel: React.FC<MultiLanguageCodePanelProps> = ({
  algorithmKey,
  activeLine,
  breakpoints = [],
  onToggleBreakpoint,

  callStack = [],
  onCustomCodeRun,
  currentArray,
  snippets,
  title = 'Source Code',
  categoryId,
  topicId,
  onCustomExecute,
  customBusy = false,
  customMessage = null,
}) => {
  // Resolve which snippet set to show: explicit prop → sorting table → fallback map.
  const resolvedSnippets: SnippetSet | undefined = useMemo(
    () => snippets ?? SORTING_CODE_SNIPPETS[algorithmKey] ?? FALLBACK_SNIPPETS[algorithmKey],
    [snippets, algorithmKey]
  );

  const availableLangs = useMemo(
    () => LANG_ORDER.filter((l) => (resolvedSnippets?.[l]?.length ?? 0) > 0),
    [resolvedSnippets]
  );

  // Custom Code stub registry entry (LeetCode-style fill-in-the-body model).
  const stubEntry: AlgorithmStubEntry | undefined = useMemo(
    () => (categoryId && topicId ? getStubEntry(categoryId, topicId) : undefined),
    [categoryId, topicId]
  );

  const [selectedLang, setSelectedLang] = useState<string>('python');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [codeMode, setCodeMode] = useState<CodeMode>('default');
  const [customLang, setCustomLang] = useState<CustomLanguage>('javascript');
  const [stubLang, setStubLang] = useState<CustomStubLanguage>('python');
  const [customCode, setCustomCode] = useState<string>(() => getStarterTemplate(algorithmKey, 'javascript'));
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stackOpen, setStackOpen] = useState(true);

  const canRunCustom = true; // Always enable Reference Code vs Paste Code feature globally across all 144 algorithms
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Keep the selected language valid as the available set changes per algorithm.
  useEffect(() => {
    if (availableLangs.length === 0) return;
    if (!availableLangs.includes(selectedLang)) {
      setSelectedLang(availableLangs.includes('python') ? 'python' : availableLangs[0]);
    }
  }, [availableLangs, selectedLang]);

  // Sync custom-code template when algorithm or custom language changes.
  useEffect(() => {
    if (stubEntry) {
      setCustomCode(stubEntry.stubs[stubLang]);
    } else {
      setCustomCode(getStarterTemplate(algorithmKey, customLang));
    }
    setExecutionError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmKey, customLang, stubLang, stubEntry?.key]);

  // Auto-scroll the executing line into view.
  useEffect(() => {
    if (codeMode === 'default' && activeLine != null) {
      activeLineRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeLine, codeMode, selectedLang]);

  const currentCodeLines = resolvedSnippets?.[selectedLang] ?? [];
  const hasCode = currentCodeLines.length > 0;


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCodeLines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — silently ignore, copy is a convenience */
    }
  };

  const handleRunCustomCode = () => {
    // Stub-backed algorithms use the fill-in-the-body contract: the signature
    // is pre-filled, so skip the legacy single-function paste validation
    // (classes legitimately contain several methods).
    if (stubEntry) {
      if (!customCode.trim()) {
        setExecutionError('The editor is empty. Fill in the function body, then run.');
        return;
      }
      setExecutionError(null);
      if (onCustomExecute) {
        onCustomExecute(customCode, stubLang, stubEntry);
      } else {
        setExecutionError('Sandbox execution for this studio is being rolled out. Reference Mode and the Sorting / Stack & Queue studios run custom code today.');
      }
      return;
    }

    const validationError = validateCustomCode(customCode, customLang);
    if (validationError) {
      setExecutionError(validationError);
      setRunSuccess(null);
      return;
    }

    setExecutionError(null);
    setRunSuccess(null);

    if (!onCustomCodeRun || !currentArray || currentArray.length === 0) {
      // No executor is wired on this page — validation passed, nothing to play.
      setRunSuccess('Code is valid ✓ — this page has no visualizer wired to play it.');
      return;
    }

    setIsRunning(true);
    // Execution is synchronous and near-instant, so defer it by one tick to let
    // the "Running…" state paint, and keep the indicator visible for at least
    // MIN_RUN_INDICATOR_MS so the feedback is perceptible. Slow executions do
    // not add extra delay beyond their own runtime.
    const MIN_RUN_INDICATOR_MS = 5000;
    window.setTimeout(() => {
      const started = performance.now();
      const result = executeCustomSortingCode(customCode, currentArray, customLang);
      const finish = () => {
        setIsRunning(false);
        if (result.error) {
          setExecutionError(result.error.message);
        } else {
          setRunSuccess(`Code executed ✓ — ${result.steps.length} steps now playing in the visualizer.`);
        }
        onCustomCodeRun(result.steps);
      };
      const elapsed = performance.now() - started;
      if (elapsed < MIN_RUN_INDICATOR_MS) window.setTimeout(finish, MIN_RUN_INDICATOR_MS - elapsed);
      else finish();
    }, 50);
  };

  const handleResetTemplate = () => {
    setCustomCode(stubEntry ? stubEntry.stubs[stubLang] : getStarterTemplate(algorithmKey, customLang));
    setExecutionError(null);
    setRunSuccess(null);
  };

  return (
    <div className="multi-lang-code-panel">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="code-panel-header">
        <div className="header-title-group">
          <Bug size={15} className="text-accent" />
          <span>{title}</span>
          <span className="debugger-tag">Debugger</span>
        </div>

        {canRunCustom && (
          <div className="code-mode-toggle" role="tablist" aria-label="Code source">
            <button
              role="tab"
              aria-selected={codeMode === 'default'}
              className={`mode-btn ${codeMode === 'default' ? 'active' : ''}`}
              onClick={() => { setCodeMode('default'); setExecutionError(null); }}
            >
              <Eye size={12} />
              <span>Reference</span>
            </button>
            <button
              role="tab"
              aria-selected={codeMode === 'custom'}
              className={`mode-btn ${codeMode === 'custom' ? 'active' : ''}`}
              onClick={() => setCodeMode('custom')}
            >
              <Pencil size={12} />
              <span>Paste code</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Default mode toolbar: language dropdown + copy + status ─ */}
      {codeMode === 'default' && (
        <div className="code-toolbar">
          <div className="lang-dropdown">
            <button
              type="button"
              className="lang-dropdown-trigger"
              aria-haspopup="listbox"
              aria-expanded={langMenuOpen}
              disabled={availableLangs.length === 0}
              onClick={() => setLangMenuOpen((o) => !o)}
            >
              <span className="lang-dropdown-icon">{LANG_META[selectedLang]?.icon}</span>
              <span className="lang-dropdown-label">{LANG_META[selectedLang]?.label ?? '—'}</span>
              <ChevronDown size={14} className={`lang-chevron ${langMenuOpen ? 'open' : ''}`} />
            </button>

            {langMenuOpen && (
              <>
                <div className="lang-dropdown-backdrop" onClick={() => setLangMenuOpen(false)} />
                <ul className="lang-dropdown-menu" role="listbox">
                  {availableLangs.map((lang) => (
                    <li key={lang} role="option" aria-selected={lang === selectedLang}>
                      <button
                        type="button"
                        className={`lang-dropdown-item ${lang === selectedLang ? 'active' : ''}`}
                        onClick={() => { setSelectedLang(lang); setLangMenuOpen(false); }}
                      >
                        <span className="lang-dropdown-icon">{LANG_META[lang]?.icon}</span>
                        <span>{LANG_META[lang]?.label}</span>
                        {lang === selectedLang && <Check size={14} className="lang-check" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {activeLine != null && hasCode && (
            <span className="active-line-chip" title="Currently executing line">
              <Play size={10} /> line {activeLine}
            </span>
          )}

          <button
            type="button"
            className="copy-code-btn"
            onClick={handleCopy}
            disabled={!hasCode}
            title="Copy code to clipboard"
          >
            {copied ? <CopyCheck size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      {/* ── Custom mode language bar ────────────────────────────── */}
      {codeMode === 'custom' && canRunCustom && stubEntry && (
        <div className="custom-lang-bar">
          {CUSTOM_CODE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`custom-lang-chip ${stubLang === lang.id ? 'active' : ''}`}
              onClick={() => setStubLang(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
      {codeMode === 'custom' && canRunCustom && !stubEntry && (
        <div className="custom-lang-bar">
          {CUSTOM_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`custom-lang-chip ${customLang === lang.id ? 'active' : ''}`}
              onClick={() => setCustomLang(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Default mode: read-only viewer with gutter + highlight ─ */}
      {codeMode === 'default' && (
        <div className="code-editor-container">
          {hasCode ? (
            currentCodeLines.map((line, idx) => {
              const lineNumber = idx + 1;
              const isCurrentLine = activeLine === lineNumber;
              const hasBreakpoint = breakpoints.includes(lineNumber);
              return (
                <div
                  key={idx}
                  ref={isCurrentLine ? activeLineRef : null}
                  className={`code-editor-line ${isCurrentLine ? 'active-execution-line' : ''}`}
                >
                  <div
                    className={`line-gutter ${onToggleBreakpoint ? 'clickable' : ''}`}
                    onClick={() => onToggleBreakpoint?.(lineNumber)}
                    title={
                      onToggleBreakpoint
                        ? (hasBreakpoint ? `Remove breakpoint (line ${lineNumber})` : `Set breakpoint (line ${lineNumber})`)
                        : undefined
                    }
                  >
                    {hasBreakpoint && <span className="red-breakpoint-dot" />}
                    {isCurrentLine && <Play size={10} className="current-line-arrow" />}
                    <span className="line-number">{lineNumber}</span>
                  </div>
                  <div className="line-text"><code>{line}</code></div>
                </div>
              );
            })
          ) : (
            <div className="code-empty-state">
              <FileCode2 size={22} style={{ color: 'var(--color-primary, #38bdf8)' }} />
              <p className="code-empty-title">Algorithm Code Engine</p>
              <p className="code-empty-sub" style={{ opacity: 0.85 }}>
                The code implementation for <code>{algorithmKey}</code> is currently being fine-tuned.
                Please explore the interactive execution trace below.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Custom mode: editable editor + run/reset ────────────── */}
      {codeMode === 'custom' && canRunCustom && (
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
              placeholder={
                stubEntry
                  ? `Fill in the ${stubLang.toUpperCase()} body for ${stubEntry.entry}(...). Run sends your code to the sandbox with the current studio inputs.`
                  : `Paste your ${customLang.toUpperCase()} function here. Only one function is allowed — no top-level variables or statements.`
              }

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
              <span>Reset Template</span>
            </button>
          </div>
        </>
      )}

      {/* ── Call Stack ────────────────────────────────────────────── */}
      <div className="integrated-scope-section">

        {callStack.length > 0 && (
          <div className="stack-box">
            <button
              type="button"
              className="stack-header"
              onClick={() => setStackOpen((o) => !o)}
              aria-expanded={stackOpen}
            >
              <ChevronDown size={13} className={`stack-caret ${stackOpen ? '' : 'collapsed'}`} />
              <Layers size={12} />
              <span>Call Stack</span>
              <span className="stack-badge">{callStack.length}</span>
            </button>
            {stackOpen && (
              <div className="stack-frames">
                {callStack.slice().reverse().map((frame, i) => (
                  <div key={i} className={`stack-pill ${i === 0 ? 'top-frame' : ''}`}>
                    <span className="stack-depth">{callStack.length - 1 - i}</span>
                    <span className="stack-frame-label">{frame}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
