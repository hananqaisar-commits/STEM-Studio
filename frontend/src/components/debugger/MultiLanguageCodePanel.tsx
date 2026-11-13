import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Play, Layers, RotateCcw,
  AlertTriangle, ChevronDown, Copy, CopyCheck, Bug, FileCode2,
  Pencil, Eye, Loader2, CheckCircle2,
} from 'lucide-react';
import { SORTING_CODE_SNIPPETS } from '../../features/sorting/data/codeSnippets';
import { FALLBACK_SNIPPETS } from '../../features/debugger/data/fallbackSnippets';
import { getStarterTemplate, type CustomLanguage } from '../../engine/customCodeTemplates';
import { executeCustomSortingCode } from '../../engine/codeExecutionEngine';
import type { ArrayStep } from '../../engine/types/Step';
import {
  getStubEntry,
  type AlgorithmStubEntry,
  type CustomStubLanguage,
} from '../../data/customCode';
import { DEBUGGER_LANGUAGE_IDS, type DebuggerLanguage } from '../../data/languages';
import { LanguageDropdown } from './LanguageDropdown';
import { executeCustomCode } from '../../api/customCode';
import { executeLiveCode, type LiveCodeExecutionResponse, type RuntimeTraceEvent, type RuntimeValue } from '../../api/liveCode';
import { sendTutorMessage } from '../../api/octaTutorApi';
import type { LinkedListStep } from '../../features/linkedList/linkedListEngine';
import { LiveRuntimeInspector, type LiveExecutionStatus } from './LiveRuntimeInspector';
import './Debugger.css';

type CodeMode = 'default' | 'custom' | 'live';

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
  onCustomExecute?: (code: string, lang: CustomStubLanguage, entry: AlgorithmStubEntry, state: Record<string, unknown>) => void;
  /** Current visualizer input for the selected stub. */
  customState?: Record<string, unknown>;
  customBusy?: boolean;
  customMessage?: string | null;
  /** Local source-aware linked-list trace; the callback must state its supported source pattern honestly. */
  onLinkedListCodeRun?: (code: string, language: CustomLanguage) => { steps: LinkedListStep[]; error?: string; result?: string };
  /** Render only the full-program live workspace when embedded by a specialized category panel. */
  liveOnly?: boolean;
}

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

function sampleValue(type: string, name: string, entry: AlgorithmStubEntry, currentArray?: number[]): unknown {
  if (type === 'intArray') return currentArray?.length ? currentArray : [4, 2, 7, 1, 3];
  if (type === 'intMatrix') {
    if (name === 'edges') return [[0, 1, 1], [1, 2, 2], [0, 2, 4], [2, 3, 1]];
    if (name === 'activities') return [[1, 3], [2, 4], [4, 6], [5, 7]];
    if (name === 'items') return [[2, 10], [3, 12], [1, 5]];
    if (name === 'jobs') return [[1, 2, 50], [2, 1, 25], [3, 2, 30]];
    return [[2, 3, 1], [3, 4, 2], [4, 5, 3]];
  }
  if (type === 'node') return { values: [1, 2, 3, 4], cycleIndex: entry.key === 'linkedList.detectCycle' ? 2 : -1 };
  if (type === 'string') {
    if (entry.topicId === 'anagram' && (name === 's' || name === 't')) return name === 's' ? 'listen' : 'silent';
    const values: Record<string, string> = {
      s: 'level', t: 'silent', a: 'abcde', b: 'ace', text: 'abracadabra',
      expr: '23+', path: '/home/user/../tmp', word: 'apple', prefix: 'app',
      pattern: 'a.', ch: 'a',
    };
    return values[name] ?? 'hello';
  }
  if (type === 'int') {
    const values: Record<string, number> = { n: 5, target: 9, k: 3, amount: 6, capacity: 10, windowSize: 3, m: 3, base: 2, exponent: 4, start: 0 };
    return values[name] ?? 5;
  }
  return 0;
}

function buildSampleState(entry: AlgorithmStubEntry, currentArray?: number[]): Record<string, unknown> {
  if (entry.kind === 'class') {
    return {
      ctorArgs: (entry.ctorParams ?? []).map((param) => sampleValue(param.type, param.name, entry, currentArray)),
      operations: (entry.methods ?? []).map((method) => ({
        method: method.name,
        args: method.params.map((param) => sampleValue(param.type, param.name, entry, currentArray)),
      })),
    };
  }
  return {
    args: Object.fromEntries((entry.params ?? []).map((param) => [param.name, sampleValue(param.type, param.name, entry, currentArray)])),
  };
}

function isLiveDraftReady(code: string, language: DebuggerLanguage): boolean {
  const stack: string[] = [];
  let quote = '';
  let tripleQuote = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const python = language === 'python';

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index];
    const next = code[index + 1];
    const nextNext = code[index + 2];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (tripleQuote && char === quote && next === quote && nextNext === quote) {
        quote = '';
        tripleQuote = false;
        index += 2;
      } else if (!tripleQuote && char === quote) {
        quote = '';
      }
      continue;
    }

    if (python && char === '#') { lineComment = true; continue; }
    if (!python && char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (!python && char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === '"' || char === "'" || (language === 'go' && char === '`')) {
      quote = char;
      tripleQuote = python && char !== '`' && next === char && nextNext === char;
      if (tripleQuote) index += 2;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') stack.push(char);
    else if (pairs[char]) {
      if (stack.pop() !== pairs[char]) return false;
    }
  }

  if (stack.length || quote || blockComment) return false;
  const codeLines = code.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && !line.startsWith('//'));
  const finalLine = codeLines[codeLines.length - 1] ?? '';
  if (python && (finalLine.endsWith(':') || finalLine.endsWith('\\'))) return false;
  return true;
}

function readTutorPreference(categoryId?: string): boolean {
  if (!categoryId || typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(`stem-live-octa:${categoryId}`);
    return saved == null ? true : saved === 'on';
  } catch {
    return true;
  }
}

function findLinkedListHint(events: RuntimeTraceEvent[]): string | null {
  const lastEvent = events[events.length - 1];
  if (!lastEvent) return null;
  for (const [objectId, object] of Object.entries(lastEvent.heap ?? {})) {
    const next = object.entries.find((entry) => entry.key === 'next')?.value;
    const previous = object.entries.find((entry) => entry.key === 'prev')?.value;
    if (!next || !previous) continue;
    if (next.kind === 'ref') {
      const nextNode = lastEvent.heap[next.object_id];
      const nextPrevious = nextNode?.entries.find((entry) => entry.key === 'prev')?.value;
      if (nextPrevious && (nextPrevious.kind !== 'ref' || nextPrevious.object_id !== objectId)) {
        return `The final trace has a forward link from @${objectId} to @${next.object_id}, but the target node's prev link does not point back. Check the insertion or deletion steps around line ${lastEvent.line}; a doubly linked list needs both links to agree.`;
      }
    }
    if (previous.kind === 'ref') {
      const previousNode = lastEvent.heap[previous.object_id];
      const previousNext = previousNode?.entries.find((entry) => entry.key === 'next')?.value;
      if (previousNext && (previousNext.kind !== 'ref' || previousNext.object_id !== objectId)) {
        return `The final trace has a backward link from @${objectId} to @${previous.object_id}, but that node's next link does not point forward to this node. Check the pointer updates around line ${lastEvent.line}.`;
      }
    }
  }
  return null;
}

function compactTutorValue(value: RuntimeValue): Record<string, unknown> {
  if (value.kind === 'ref') return { kind: 'ref', type: value.type, object_id: value.object_id };
  if (value.kind === 'opaque') return { kind: 'opaque', type: value.type, preview: value.preview?.slice(0, 48) };
  const scalar = value.value;
  return {
    kind: 'scalar',
    type: value.type,
    value: typeof scalar === 'string' ? scalar.slice(0, 48) : scalar,
  };
}

function tutorSourceExcerpt(source: string, response: { trace_steps: RuntimeTraceEvent[]; error?: string | null }) {
  const lines = source.split(/\r?\n/);
  const traceLine = response.trace_steps[response.trace_steps.length - 1]?.line;
  const errorLine = response.error?.match(/\bline\s+(\d+)\b/i)?.[1];
  const targetLine = traceLine ?? (errorLine ? Number(errorLine) : null);
  let start = 0;
  let selected: Array<{ number: number; text: string }>;
  if (targetLine && targetLine > 0) {
    start = Math.max(0, targetLine - 9);
    selected = lines.slice(start, start + 18).map((text, index) => ({ number: start + index + 1, text }));
  } else if (lines.length > 26) {
    selected = [
      ...lines.slice(0, 10).map((text, index) => ({ number: index + 1, text })),
      { number: -1, text: '…' },
      ...lines.slice(-16).map((text, index) => ({ number: lines.length - 15 + index, text })),
    ];
  } else {
    selected = lines.map((text, index) => ({ number: index + 1, text }));
  }
  const excerpt = selected.map(({ number, text }) => number < 0 ? text : `${number}: ${text}`).join('\n');
  return {
    source_excerpt: excerpt.slice(0, 2_100),
    source_truncated: lines.length > selected.filter(({ number }) => number > 0).length || excerpt.length > 2_100,
  };
}

function buildTutorEvidence(
  source: string,
  language: DebuggerLanguage,
  response: {
    status: string;
    trace_support: 'automatic' | 'not_available';
    trace_steps: RuntimeTraceEvent[];
    stdout: string;
    error?: string | null;
  },
): string {
  const sourceExcerpt = tutorSourceExcerpt(source, response);
  const trace = response.trace_steps.slice(-1).map((event) => {
    const frames = event.frames ?? [];
    const active = frames[frames.length - 1];
    return {
      seq: event.seq,
      kind: event.kind,
      line: event.line,
      function: event.function,
      call_stack: frames.slice(-4).map(({ function: name, line }) => ({ function: name, line })),
      scope: Object.fromEntries(Object.entries(active?.scope ?? {}).slice(0, 6)
        .map(([name, value]) => [name.slice(0, 30), compactTutorValue(value)])),
      heap: Object.entries(event.heap ?? {}).slice(0, 2).map(([objectId, object]) => ({
        object_id: objectId,
        type: object.type,
        entries: object.entries.slice(0, 3).map((entry) => ({
          key: entry.key.slice(0, 30),
          value: compactTutorValue(entry.value),
        })),
      })),
    };
  });
  return JSON.stringify({
    language,
    status: response.status,
    trace_support: response.trace_support,
    ...sourceExcerpt,
    stdout: response.stdout.slice(0, 250),
    error: response.error?.slice(0, 350) ?? null,
    trace,
  });
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
  customState,
  customBusy = false,
  customMessage = null,
  onLinkedListCodeRun,
  liveOnly = false,
}) => {
  // Resolve which snippet set to show: explicit prop → sorting table → fallback map.
  const resolvedSnippets: SnippetSet | undefined = useMemo(
    () => snippets ?? SORTING_CODE_SNIPPETS[algorithmKey] ?? FALLBACK_SNIPPETS[algorithmKey],
    [snippets, algorithmKey]
  );

  const availableReferenceLangs = useMemo(
    () => DEBUGGER_LANGUAGE_IDS.filter((l) => (resolvedSnippets?.[l]?.length ?? 0) > 0),
    [resolvedSnippets]
  );

  // Custom Code stub registry entry (LeetCode-style fill-in-the-body model).
  const stubEntry: AlgorithmStubEntry | undefined = useMemo(
    () => (categoryId && topicId ? getStubEntry(categoryId, topicId) : undefined),
    [categoryId, topicId]
  );

  const [selectedLang, setSelectedLang] = useState<DebuggerLanguage>('python');
  const [codeMode, setCodeMode] = useState<CodeMode>(liveOnly ? 'live' : 'default');
  const [customLang, setCustomLang] = useState<DebuggerLanguage>('python');
  const [stubLang, setStubLang] = useState<CustomStubLanguage>('python');
  const [customCode, setCustomCode] = useState<string>(() => onLinkedListCodeRun ? '' : getStarterTemplate(algorithmKey, 'python'));
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stackOpen, setStackOpen] = useState(true);
  const [liveLanguage, setLiveLanguage] = useState<DebuggerLanguage>('python');
  const [liveCodeByLanguage, setLiveCodeByLanguage] = useState<Partial<Record<DebuggerLanguage, string>>>({});
  const [liveStdin, setLiveStdin] = useState('');
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [liveStatus, setLiveStatus] = useState<LiveExecutionStatus>('idle');
  const [liveStatusMessage, setLiveStatusMessage] = useState('Write a complete program. Changes run automatically after a short pause.');
  const [liveEvents, setLiveEvents] = useState<RuntimeTraceEvent[]>([]);
  const [liveTraceSource, setLiveTraceSource] = useState('');
  const [liveTraceRevision, setLiveTraceRevision] = useState<string | null>(null);
  const [liveTraceLanguage, setLiveTraceLanguage] = useState<DebuggerLanguage>('python');
  const [liveOutputRevision, setLiveOutputRevision] = useState<string | null>(null);
  const [liveStdout, setLiveStdout] = useState('');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveRunTraceSupport, setLiveRunTraceSupport] = useState<'automatic' | 'not_available'>('automatic');
  const [liveActiveLine, setLiveActiveLine] = useState<number | null>(null);
  const [liveTraceTruncated, setLiveTraceTruncated] = useState(false);
  const [liveLastResult, setLiveLastResult] = useState<{
    source: string;
    language: DebuggerLanguage;
    response: LiveCodeExecutionResponse;
  } | null>(null);
  const [liveTutorEnabled, setLiveTutorEnabled] = useState(() => readTutorPreference(categoryId));
  const [liveTutorHint, setLiveTutorHint] = useState<string | null>(null);
  const [liveTutorReviewing, setLiveTutorReviewing] = useState(false);
  const liveRequestSequence = useRef(0);
  const liveAbortController = useRef<AbortController | null>(null);
  const liveDebounceTimer = useRef<number | undefined>(undefined);
  const liveLastRunAt = useRef(0);
  const liveTutorTimeout = useRef<number | undefined>(undefined);
  const liveTutorAbortController = useRef<AbortController | null>(null);
  const liveLastTutorAt = useRef(0);
  const liveTutorEnabledRef = useRef(liveTutorEnabled);
  const liveCode = liveCodeByLanguage[liveLanguage] ?? '';
  const handleLiveActiveLineChange = useCallback((line: number | null) => {
    setLiveActiveLine(line);
  }, []);

  const canRunCustom = Boolean(stubEntry || onLinkedListCodeRun || (onCustomCodeRun && currentArray?.length));
  const canUseLiveCode = Boolean(categoryId && topicId);
  // Keep the selected language valid as the available set changes per algorithm.
  useEffect(() => {
    if (availableReferenceLangs.length === 0) return;
    if (!availableReferenceLangs.includes(selectedLang)) {
      setSelectedLang(availableReferenceLangs.includes('python') ? 'python' : availableReferenceLangs[0]);
    }
  }, [availableReferenceLangs, selectedLang]);

  useEffect(() => {
    if (liveOnly) setCodeMode('live');
  }, [liveOnly]);

  useEffect(() => {
    setLiveTutorEnabled(readTutorPreference(categoryId));
    setLiveLastResult(null);
    liveTutorAbortController.current?.abort();
    if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
    setLiveTutorReviewing(false);
    setLiveTutorHint(null);
  }, [categoryId]);

  useEffect(() => {
    liveTutorEnabledRef.current = liveTutorEnabled;
    if (!categoryId || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(`stem-live-octa:${categoryId}`, liveTutorEnabled ? 'on' : 'off');
    } catch { /* Private browsing may block local storage. */ }
  }, [categoryId, liveTutorEnabled]);

  useEffect(() => () => {
    liveRequestSequence.current += 1;
    liveAbortController.current?.abort();
    liveTutorAbortController.current?.abort();
    if (liveDebounceTimer.current) window.clearTimeout(liveDebounceTimer.current);
    if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
  }, []);

  // Sync custom-code template when algorithm or custom language changes.
  useEffect(() => {
    if (stubEntry) {
      setCustomCode(stubEntry.stubs[stubLang]);
    } else if (onLinkedListCodeRun) {
      setCustomCode('');
    } else {
      setCustomCode(getStarterTemplate(algorithmKey, customLang as CustomLanguage));
    }
    setExecutionError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithmKey, customLang, stubLang, stubEntry?.key]);

  const currentCodeLines = resolvedSnippets?.[selectedLang] ?? [];
  const hasCode = currentCodeLines.length > 0;

  const requestOctaTutorHint = useCallback(async (
    source: string,
    language: DebuggerLanguage,
    responseEvidence: {
      status: string;
      trace_support: 'automatic' | 'not_available';
      trace_steps: RuntimeTraceEvent[];
      stdout: string;
      error?: string | null;
    },
  ): Promise<string | null> => {
    if (!categoryId || !topicId || !liveTutorEnabledRef.current) return null;
    if (Date.now() - liveLastTutorAt.current < 12_000) return null;
    liveLastTutorAt.current = Date.now();
    liveTutorAbortController.current?.abort();
    const controller = new AbortController();
    liveTutorAbortController.current = controller;
    const events = responseEvidence.trace_steps;
    const stepData = buildTutorEvidence(source, language, responseEvidence);
    const finalEvent = events[events.length - 1];
    const evidenceDescription = finalEvent
      ? `Actual ${language.toUpperCase()} runtime snapshot at line ${finalEvent.line}`
      : `${language.toUpperCase()} program ${responseEvidence.status.replace('_', ' ')}; internal runtime snapshots ${responseEvidence.trace_support === 'automatic' ? 'were not captured' : 'are unavailable for this runtime'}`;
    try {
      const response = await sendTutorMessage({
        message: 'Review this learner-authored program and the run evidence for one concrete correctness problem. Use captured state when a runtime trace is present. When snapshots are unavailable, distinguish a code-based suspicion from something observed at runtime; use compiler/runtime errors and output when present. Never claim an unseen state or invent the intended algorithm. Give one delayed coaching hint that points to a relevant line and asks the learner to check a value or relationship. Do not provide a full solution or edit the program. If no clear issue is supported, reply with exactly NO_HINT.',
        algorithm_name: title,
        algorithm_id: topicId,
        category: categoryId,
        current_step_description: evidenceDescription,
        current_step_index: Math.max(0, events.length - 1),
        total_steps: events.length,
        step_data: stepData,
        current_page: title,
        mode: 'natural',
      }, controller.signal);
      if (controller.signal.aborted || !liveTutorEnabledRef.current) return null;
      if (response.answer_source !== 'model') return null;
      const hint = response.reply?.trim() ?? '';
      if (!hint || /^\s*(?:<)?(?:NO[_ -]?HINT|NO\s+CLEAR\s+ISSUE)(?:>)?[.!]?\s*$/i.test(hint)
        || /^(?:no clear issue|no concrete issue|nothing suspicious)\b/i.test(hint)) return null;
      return hint.slice(0, 900);
    } catch {
      return null;
    } finally {
      if (liveTutorAbortController.current === controller) liveTutorAbortController.current = null;
    }
  }, [categoryId, topicId, title]);

  const executeLiveRevision = useCallback(async (manual = false) => {
    if (!categoryId || !topicId || !liveCode.trim()) {
      setLiveStatus('idle');
      setLiveStatusMessage('Write a complete program to start a live trace.');
      return;
    }
    if (!manual && !isLiveDraftReady(liveCode, liveLanguage)) {
      setLiveStatus('draft');
      setLiveStatusMessage('This draft is still open or incomplete. The last successful trace is kept until the program is ready.');
      return;
    }

    const minimumIntervalMs = 3_100;
    const remaining = minimumIntervalMs - (Date.now() - liveLastRunAt.current);
    if (remaining > 0) {
      setLiveStatus('waiting');
      setLiveStatusMessage(`Queued to respect the runner rate limit (${Math.ceil(remaining / 1_000)}s).`);
      if (liveDebounceTimer.current) window.clearTimeout(liveDebounceTimer.current);
      liveDebounceTimer.current = window.setTimeout(() => {
        liveDebounceTimer.current = undefined;
        void executeLiveRevision(manual);
      }, remaining);
      return;
    }

    liveAbortController.current?.abort();
    liveTutorAbortController.current?.abort();
    setLiveLastResult(null);
    if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
    setLiveTutorReviewing(false);
    setLiveTutorHint(null);
    const controller = new AbortController();
    liveAbortController.current = controller;
    const sequence = ++liveRequestSequence.current;
    const revision = `r${sequence}`;
    liveLastRunAt.current = Date.now();
    setLiveStatus('running');
    setLiveStatusMessage(`Running revision ${revision} in the isolated sandbox…`);
    setLiveOutputRevision(revision);
    setLiveStdout('');
    setLiveError(null);

    try {
      const response = await executeLiveCode({
        category_id: categoryId,
        topic_id: topicId,
        language: liveLanguage,
        code: liveCode,
        stdin: liveStdin,
        revision,
      }, controller.signal);
      if (sequence !== liveRequestSequence.current) return;

      setLiveLastResult({ source: liveCode, language: liveLanguage, response });
      setLiveRunTraceSupport(response.trace_support);
      setLiveOutputRevision(response.revision);
      setLiveStdout(response.stdout ?? '');
      setLiveError(response.error ?? null);
      if (response.trace_support === 'automatic' && (response.status === 'ok' || response.trace_steps.length > 0)) {
        setLiveEvents(response.trace_steps);
        setLiveTraceSource(liveCode);
        setLiveTraceRevision(response.revision);
        setLiveTraceLanguage(liveLanguage);
        setLiveTraceTruncated(response.trace_truncated);
      }

      if (response.status === 'ok') {
        setLiveStatus('ok');
        setLiveStatusMessage(response.trace_support === 'automatic'
          ? `Revision ${revision} executed. ${response.trace_steps.length} real runtime event${response.trace_steps.length === 1 ? '' : 's'} captured.`
          : `Revision ${revision} executed successfully. The program output is shown below.`);
      } else {
        setLiveStatus('error');
        setLiveStatusMessage(response.trace_steps.length
          ? `Revision ${revision} stopped with ${response.status.replace('_', ' ')} after ${response.trace_steps.length} captured event${response.trace_steps.length === 1 ? '' : 's'}.`
          : `This revision has a ${response.status.replace('_', ' ')}. The previous successful trace is kept.`);
      }

      if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
      liveTutorAbortController.current?.abort();
      setLiveTutorReviewing(false);
      const mayTutor = liveTutorEnabledRef.current;
      if (mayTutor) {
        const deterministicHint = response.status === 'ok' && response.trace_support === 'automatic'
          && categoryId === 'linkedList' ? findLinkedListHint(response.trace_steps) : null;
        if (deterministicHint) {
          setLiveTutorReviewing(false);
          liveTutorTimeout.current = window.setTimeout(() => setLiveTutorHint(deterministicHint), 1_400);
        } else {
          setLiveTutorHint(null);
          liveTutorTimeout.current = window.setTimeout(() => {
            liveTutorTimeout.current = undefined;
            setLiveTutorReviewing(true);
            void requestOctaTutorHint(liveCode, liveLanguage, response).then((hint) => {
              if (liveTutorEnabledRef.current) setLiveTutorHint(hint);
            }).finally(() => setLiveTutorReviewing(false));
          }, 1_400);
        }
      } else {
        setLiveTutorReviewing(false);
        setLiveTutorHint(null);
      }
    } catch (error: unknown) {
      if (controller.signal.aborted || sequence !== liveRequestSequence.current) return;
      setLiveStatus('error');
      setLiveError(error instanceof Error ? error.message : 'The live execution service is unavailable.');
      setLiveStatusMessage('The latest revision could not run. The last successful trace remains available.');
    } finally {
      if (sequence === liveRequestSequence.current) liveAbortController.current = null;
    }
  }, [categoryId, topicId, liveCode, liveLanguage, liveStdin, requestOctaTutorHint]);

  useEffect(() => {
    liveRequestSequence.current += 1;
    liveAbortController.current?.abort();
    if (codeMode !== 'live') return undefined;
    if (!liveCode.trim()) {
      setLiveStatus('idle');
      setLiveStatusMessage('Write a complete program. Changes run automatically after a short pause.');
      return undefined;
    }
    if (!liveEnabled) {
      setLiveStatus('draft');
      setLiveStatusMessage('Auto trace is off. Run now to execute this draft.');
      return undefined;
    }
    if (!isLiveDraftReady(liveCode, liveLanguage)) {
      setLiveStatus('draft');
      setLiveStatusMessage('This draft is still open or incomplete. The last successful trace is kept.');
      return undefined;
    }

    setLiveStatus('waiting');
    setLiveStatusMessage('Waiting for you to pause typing before the latest revision runs…');
    const debounceMs = 850;
    const minimumIntervalMs = 3_100;
    const remaining = Math.max(0, minimumIntervalMs - (Date.now() - liveLastRunAt.current));
    liveDebounceTimer.current = window.setTimeout(() => {
      liveDebounceTimer.current = undefined;
      void executeLiveRevision();
    }, Math.max(debounceMs, remaining));
    return () => {
      if (liveDebounceTimer.current) window.clearTimeout(liveDebounceTimer.current);
      liveDebounceTimer.current = undefined;
    };
  }, [codeMode, liveCode, liveLanguage, liveStdin, liveEnabled, categoryId, topicId, executeLiveRevision]);

  const handleLiveCodeChange = (value: string) => {
    liveRequestSequence.current += 1;
    liveAbortController.current?.abort();
    liveTutorAbortController.current?.abort();
    setLiveLastResult(null);
    setLiveCodeByLanguage((current) => ({ ...current, [liveLanguage]: value }));
    if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
    setLiveTutorReviewing(false);
    setLiveTutorHint(null);
  };

  const handleLiveEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    let insertion: string | null = null;
    if (event.key === 'Tab') {
      insertion = '    ';
    } else if (event.key === 'Enter') {
      const beforeCaret = liveCode.slice(0, start);
      const currentLine = beforeCaret.slice(beforeCaret.lastIndexOf('\n') + 1);
      const indentation = currentLine.match(/^\s*/)?.[0] ?? '';
      const trimmedLine = currentLine.trimEnd();
      const opensBlock = liveLanguage === 'python'
        ? trimmedLine.endsWith(':')
        : trimmedLine.endsWith('{');
      insertion = `\n${indentation}${opensBlock ? '    ' : ''}`;
    }
    if (insertion == null) return;
    event.preventDefault();
    handleLiveCodeChange(`${liveCode.slice(0, start)}${insertion}${liveCode.slice(end)}`);
    const nextPosition = start + insertion.length;
    window.requestAnimationFrame(() => textarea.setSelectionRange(nextPosition, nextPosition));
  };

  const handleLiveLanguageChange = (language: DebuggerLanguage) => {
    liveRequestSequence.current += 1;
    liveAbortController.current?.abort();
    liveTutorAbortController.current?.abort();
    setLiveLastResult(null);
    setLiveRunTraceSupport(language === 'python' ? 'automatic' : 'not_available');
    if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
    setLiveTutorReviewing(false);
    setLiveLanguage(language);
  };

  const handleLiveStdinChange = (value: string) => {
    liveRequestSequence.current += 1;
    liveAbortController.current?.abort();
    liveTutorAbortController.current?.abort();
    setLiveLastResult(null);
    if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
    setLiveTutorReviewing(false);
    setLiveTutorHint(null);
    setLiveStdin(value);
  };

  const handleLiveTutorToggle = (enabled: boolean) => {
    liveTutorEnabledRef.current = enabled;
    setLiveTutorEnabled(enabled);
    if (!enabled) {
      liveTutorAbortController.current?.abort();
      if (liveTutorTimeout.current) window.clearTimeout(liveTutorTimeout.current);
      setLiveTutorReviewing(false);
      setLiveTutorHint(null);
      return;
    }
    if (liveLastResult && liveLastResult.source === liveCode && liveLastResult.language === liveLanguage) {
      const { source, language, response } = liveLastResult;
      const deterministicHint = response.status === 'ok' && response.trace_support === 'automatic'
        && categoryId === 'linkedList' ? findLinkedListHint(response.trace_steps) : null;
      if (deterministicHint) {
        liveTutorTimeout.current = window.setTimeout(() => setLiveTutorHint(deterministicHint), 1_400);
      } else {
        liveTutorTimeout.current = window.setTimeout(() => {
          setLiveTutorReviewing(true);
          void requestOctaTutorHint(source, language, response).then((hint) => {
            if (liveTutorEnabledRef.current) setLiveTutorHint(hint);
          }).finally(() => setLiveTutorReviewing(false));
        }, 1_400);
      }
    }
  };

  const handleLiveRunNow = () => {
    if (liveDebounceTimer.current) window.clearTimeout(liveDebounceTimer.current);
    liveDebounceTimer.current = undefined;
    void executeLiveRevision(true);
  };


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCodeLines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — silently ignore, copy is a convenience */
    }
  };

  const handleRunCustomCode = async () => {
    if (onLinkedListCodeRun) {
      if (!customCode.trim()) {
        setExecutionError('Paste the complete function before starting the local trace.');
        setRunSuccess(null);
        return;
      }
      setExecutionError(null);
      setRunSuccess(null);
      setExecutionResult(null);
      setIsRunning(true);
      window.setTimeout(() => {
        const trace = onLinkedListCodeRun(customCode, customLang as CustomLanguage);
        setIsRunning(false);
        if (trace.error) {
          setExecutionError(trace.error);
          return;
        }
        setExecutionResult(trace.result ?? null);
        setRunSuccess(`A local pointer trace was generated for the recognized C++ function. The pasted source was not compiled or executed; ${trace.steps.length} steps are ready to play.`);
      }, 0);
      return;
    }

    // Stub-backed algorithms use the fill-in-the-body contract: the signature
    // is pre-filled, so skip the legacy single-function paste validation
    // (classes legitimately contain several methods).
    if (stubEntry) {
      if (!customCode.trim()) {
        setExecutionError('The editor is empty. Fill in the function body, then run.');
        return;
      }
      setExecutionError(null);
      setRunSuccess(null);
      setExecutionResult(null);
      if (onCustomExecute) {
        onCustomExecute(customCode, stubLang, stubEntry, customState ?? buildSampleState(stubEntry, currentArray));
      } else {
        setIsRunning(true);
        try {
          const response = await executeCustomCode({
            algorithm_key: stubEntry.key,
            language: stubLang,
            code: customCode,
            state: customState ?? buildSampleState(stubEntry, currentArray),
          });
          if (response.status !== 'ok') {
            setExecutionError(`${response.status.replace('_', ' ')}: ${response.error ?? 'execution failed'}`);
            return;
          }
          const result = response.result?.result ?? response.result?.returned ?? response.result ?? null;
          setExecutionResult(JSON.stringify(result, null, 2));
          setRunSuccess(response.trace_steps.length
            ? `Your pasted ${stubLang.toUpperCase()} code ran in the sandbox. ${response.trace_steps.length} trace events were emitted; the final result is shown below.`
            : `Your pasted ${stubLang.toUpperCase()} code ran in the sandbox with the selected input. The final result is shown below; this function did not emit visualization events.`);
        } catch (error: unknown) {
          setExecutionError(`Sandbox unavailable: ${error instanceof Error ? error.message : 'execution service unavailable'}`);
        } finally {
          setIsRunning(false);
        }
      }
      return;
    }

    const validationError = validateCustomCode(customCode, customLang as CustomLanguage);
    if (validationError) {
      setExecutionError(validationError);
      setRunSuccess(null);
      return;
    }

    setExecutionError(null);
    setRunSuccess(null);
    setExecutionResult(null);

    if (!onCustomCodeRun || !currentArray || currentArray.length === 0) {
      setExecutionError('This algorithm has no custom-code runner wired yet. Reference Mode remains available.');
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
      const result = executeCustomSortingCode(customCode, currentArray, customLang as CustomLanguage);
      const finish = () => {
        setIsRunning(false);
        if (result.error) {
          setExecutionError(result.error.message);
        } else {
          setRunSuccess(`Your pasted ${customLang.toUpperCase()} code ran through the visualizer engine; ${result.steps.length} steps are ready to play.`);
        }
        onCustomCodeRun(result.steps);
      };
      const elapsed = performance.now() - started;
      if (elapsed < MIN_RUN_INDICATOR_MS) window.setTimeout(finish, MIN_RUN_INDICATOR_MS - elapsed);
      else finish();
    }, 50);
  };

  const handleResetTemplate = () => {
    setCustomCode(stubEntry ? stubEntry.stubs[stubLang] : getStarterTemplate(algorithmKey, customLang as CustomLanguage));
    setExecutionError(null);
    setRunSuccess(null);
    setExecutionResult(null);
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

        {!liveOnly && (canRunCustom || canUseLiveCode) && (
          <div className="code-mode-toggle" role="tablist" aria-label="Code source">
            <button
              role="tab"
              aria-selected={codeMode === 'default'}
              className={`mode-btn ${codeMode === 'default' ? 'active' : ''}`}
              onClick={() => { setCodeMode('default'); setExecutionError(null); setRunSuccess(null); setExecutionResult(null); }}
            >
              <Eye size={12} />
              <span>Reference</span>
            </button>
            {canRunCustom && (
              <button
                role="tab"
                aria-selected={codeMode === 'custom'}
                className={`mode-btn ${codeMode === 'custom' ? 'active' : ''}`}
                onClick={() => { setCodeMode('custom'); setExecutionError(null); setRunSuccess(null); setExecutionResult(null); }}
              >
                <Pencil size={12} />
                <span>Paste code</span>
              </button>
            )}
            {canUseLiveCode && (
              <button
                role="tab"
                aria-selected={codeMode === 'live'}
                className={`mode-btn ${codeMode === 'live' ? 'active' : ''}`}
                onClick={() => setCodeMode('live')}
              >
                <Activity size={12} />
                <span>Live code</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Default mode toolbar: language dropdown + copy + status ─ */}
      {codeMode === 'default' && (
        <div className="code-toolbar">
          <LanguageDropdown value={selectedLang} onChange={setSelectedLang} available={availableReferenceLangs} ariaLabel="Reference code language" />

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

      {codeMode === 'custom' && canRunCustom && (
        <div className="code-toolbar">
          <LanguageDropdown
            value={stubEntry ? stubLang : customLang}
            ariaLabel="Custom code language"
            onChange={(language) => {
              const nextTemplate = stubEntry ? stubEntry.stubs[language] : onLinkedListCodeRun ? '' : getStarterTemplate(algorithmKey, language as CustomLanguage);
              if (customCode !== nextTemplate && !window.confirm('Switching languages will clear your current code. Continue?')) return;
              if (stubEntry) setStubLang(language); else setCustomLang(language);
              setExecutionError(null);
              setRunSuccess(null);
              setExecutionResult(null);
            }}
          />
          {onLinkedListCodeRun && activeLine != null && (
            <span className="active-line-chip" title="Current source line in the generated trace">
              <Play size={10} /> trace line {activeLine}
            </span>
          )}
        </div>
      )}

      {codeMode === 'live' && canUseLiveCode && (
        <div className="code-toolbar live-code-toolbar">
          <LanguageDropdown
            value={liveLanguage}
            ariaLabel="Live program language"
            onChange={handleLiveLanguageChange}
          />
          <span className="live-program-label">Complete program</span>
          <span className="live-debounce-label">Runs after a short pause</span>
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
          {onLinkedListCodeRun && (
            <div className="code-local-trace-note" role="note">
              Paste a complete C++ <code>removeNthFromEnd</code> function. The local tracer uses the current linked-list values and “n from end” input to build pointer snapshots for the recognized size/count implementation. It does not compile or execute C++.
            </div>
          )}
          <div className="custom-code-editor">
            <div className="custom-editor-gutter">
              {customCode.split('\n').map((_, idx) => (
                <div key={idx} className={`gutter-line-number${onLinkedListCodeRun && activeLine === idx + 1 ? ' active' : ''}`}>{idx + 1}</div>
              ))}
            </div>
            <textarea
              className="custom-editor-textarea"
              aria-label={`Custom ${(stubEntry ? stubLang : customLang).toUpperCase()} code editor`}
              value={customCode}
              onChange={(e) => { setCustomCode(e.target.value); setExecutionError(null); setRunSuccess(null); setExecutionResult(null); }}
              spellCheck={false}
              placeholder={
                stubEntry
                  ? `Paste only the ${stubEntry.entry} method or class. The studio supplies the built-in data types and ${onCustomExecute || customState ? 'current visualizer inputs' : 'sample inputs'}.`
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
            <div className={/ran successfully|correct|produced the expected|executed/i.test(customMessage) ? 'code-success-banner' : 'code-error-banner'} role="status">
              {/ran successfully|correct|produced the expected|executed/i.test(customMessage) ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              <span>{customMessage}</span>
            </div>
          )}

          {runSuccess && (
            <div className="code-success-banner" role="status">
              <CheckCircle2 size={14} />
              <span>{runSuccess}</span>
            </div>
          )}
          {executionResult !== null && (
            <div className="code-execution-result" aria-label="Sandbox output">
              <strong>{onLinkedListCodeRun ? 'Visualized result' : 'Sandbox output'}</strong>
              <pre>{executionResult}</pre>
            </div>
          )}

          <div className="code-run-bar">
            <button className="run-code-btn" onClick={handleRunCustomCode} disabled={customBusy || isRunning}>
              {customBusy || isRunning ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
              <span>{customBusy || isRunning ? 'Running in sandbox…' : 'Run Code'}</span>
            </button>
            <button className="reset-code-btn" onClick={handleResetTemplate}>
              <RotateCcw size={14} />
              <span>Reset Template</span>
            </button>
          </div>
        </>
      )}

      {codeMode === 'live' && canUseLiveCode && (
        <div className="live-code-workspace">
          <div className="live-code-editor custom-code-editor">
            <div className="custom-editor-gutter" aria-hidden="true">
              {liveCode.split('\n').map((_, idx) => {
                const lineNumber = idx + 1;
                const isActive = liveTraceSource === liveCode
                  && liveTraceLanguage === liveLanguage
                  && liveActiveLine === lineNumber;
                return <div key={idx} className={`gutter-line-number${isActive ? ' active' : ''}`}>{lineNumber}</div>;
              })}
            </div>
            <textarea
              className="custom-editor-textarea"
              aria-label={`Live ${liveLanguage.toUpperCase()} program editor`}
              value={liveCode}
              onChange={(event) => handleLiveCodeChange(event.target.value)}
              onKeyDown={handleLiveEditorKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={`Write a complete ${liveLanguage.toUpperCase()} program. It runs automatically after you pause typing.`}
            />
          </div>

          <details className="live-input-panel">
            <summary>Program input <span>(optional stdin)</span></summary>
            <textarea
              aria-label="Program standard input"
              value={liveStdin}
              onChange={(event) => handleLiveStdinChange(event.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="Values read by input(), scanf, Scanner, fmt.Scan, and similar functions"
            />
          </details>

          <LiveRuntimeInspector
            status={liveStatus}
            statusMessage={liveStatusMessage}
            events={liveEvents}
            source={liveTraceSource}
            stdout={liveStdout}
            outputRevision={liveOutputRevision}
            error={liveError}
            language={liveLanguage.toUpperCase()}
            traceLanguage={liveTraceLanguage.toUpperCase()}
            traceSupport={liveRunTraceSupport}
            traceTruncated={liveTraceTruncated}
            traceRevision={liveTraceRevision}
            liveEnabled={liveEnabled}
            onLiveEnabledChange={setLiveEnabled}
            onRunNow={handleLiveRunNow}
            busy={liveStatus === 'running'}
            tutorEnabled={liveTutorEnabled}
            onTutorEnabledChange={handleLiveTutorToggle}
            tutorHint={liveTutorHint}
            tutorReviewing={liveTutorReviewing}
            onActiveLineChange={handleLiveActiveLineChange}
          />
        </div>
      )}

      {/* ── Call Stack ────────────────────────────────────────────── */}
      {codeMode !== 'live' && <div className="integrated-scope-section">

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
      </div>}
    </div>
  );
};
