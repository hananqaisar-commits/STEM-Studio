import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from '../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js?worker';
import jsonWorker from '../../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js?worker';
import cssWorker from '../../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js?worker';
import htmlWorker from '../../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js?worker';
import tsWorker from '../../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';
import { useCallback, useEffect, useRef } from 'react';
import type { DebuggerLanguage } from '../../data/languages';
import type { editor as MonacoEditor, IDisposable, languages } from 'monaco-editor';

type CompletionContext = { language: DebuggerLanguage; code: string };
type CompletionItem = languages.CompletionItem;

const monacoEnvironment = globalThis as typeof globalThis & {
  MonacoEnvironment?: { getWorker: (_workerId: string, label: string) => Worker };
};

monacoEnvironment.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

const LANGUAGE_MAP: Record<DebuggerLanguage, string> = {
  python: 'python', cpp: 'cpp', c: 'c', java: 'java', csharp: 'csharp', go: 'go',
};

const KEYWORDS: Record<DebuggerLanguage, string[]> = {
  python: ['class', 'def', 'for', 'if', 'elif', 'else', 'while', 'return', 'break', 'continue', 'try', 'except', 'finally', 'with', 'import', 'from', 'as', 'pass', 'yield', 'lambda', 'print', 'range', 'len', 'enumerate', 'None', 'True', 'False', 'self'],
  cpp: ['class', 'struct', 'namespace', 'template', 'typename', 'for', 'if', 'else', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'public', 'private', 'protected', 'const', 'auto', 'int', 'long', 'double', 'char', 'bool', 'void', 'new', 'delete', 'nullptr', 'std::cout', 'std::cin', 'std::vector', 'std::string', '#include <iostream>', '#include <vector>', '#include <string>', 'using namespace std;'],
  c: ['struct', 'for', 'if', 'else', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'const', 'int', 'long', 'double', 'char', 'bool', 'void', 'malloc', 'free', 'printf', 'scanf', '#include <stdio.h>', '#include <stdlib.h>'],
  java: ['class', 'public', 'private', 'protected', 'static', 'final', 'void', 'int', 'long', 'double', 'boolean', 'new', 'for', 'if', 'else', 'while', 'return', 'break', 'continue', 'this', 'null', 'System.out.println'],
  csharp: ['class', 'public', 'private', 'protected', 'static', 'readonly', 'void', 'int', 'long', 'double', 'bool', 'string', 'new', 'for', 'if', 'else', 'while', 'return', 'break', 'continue', 'this', 'null', 'Console.WriteLine'],
  go: ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'for', 'if', 'else', 'switch', 'case', 'return', 'break', 'continue', 'defer', 'go', 'chan', 'range', 'nil', 'make', 'new', 'fmt.Println'],
};

const SNIPPETS: Record<DebuggerLanguage, Array<{ label: string; body: string; detail: string }>> = {
  python: [
    { label: 'for loop', body: 'for ${1:item} in ${2:items}:\n\t${3:print(item)}', detail: 'Loop over values' },
    { label: 'while loop', body: 'while ${1:condition}:\n\t${2:pass}', detail: 'Repeat while a condition is true' },
    { label: 'function', body: 'def ${1:name}(${2:params}):\n\t${3:pass}', detail: 'Define a function' },
    { label: 'class', body: 'class ${1:Node}:\n\tdef __init__(self, ${2:value}):\n\t\tself.${3:data} = ${2:value}', detail: 'Define a Python class' },
    { label: 'if / else', body: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}', detail: 'Conditional branch' },
  ],
  cpp: [
    { label: 'for loop', body: 'for (int ${1:i} = 0; ${1:i} < ${2:size}; ++${1:i}) {\n\t${3}\n}', detail: 'Index-based loop' },
    { label: 'while loop', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'Repeat while a condition is true' },
    { label: 'function', body: '${1:int} ${2:name}(${3:parameters}) {\n\t${4}\n\treturn ${5:result};\n}', detail: 'Define a function' },
    { label: 'struct node', body: 'struct ${1:Node} {\n\t${2:int data};\n\t${1:Node}* ${3:next} = nullptr;\n};', detail: 'Define a linked structure' },
    { label: 'main', body: 'int main() {\n\t${1}\n\treturn 0;\n}', detail: 'Program entry point' },
    { label: 'if / else', body: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}', detail: 'Conditional branch' },
  ],
  c: [
    { label: 'for loop', body: 'for (int ${1:i} = 0; ${1:i} < ${2:size}; ++${1:i}) {\n\t${3}\n}', detail: 'Index-based loop' },
    { label: 'while loop', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'Repeat while a condition is true' },
    { label: 'function', body: '${1:int} ${2:name}(${3:parameters}) {\n\t${4}\n\treturn ${5:result};\n}', detail: 'Define a function' },
    { label: 'struct node', body: 'struct ${1:Node} {\n\t${2:int data};\n\tstruct ${1:Node}* ${3:next};\n};', detail: 'Define a linked structure' },
    { label: 'main', body: 'int main(void) {\n\t${1}\n\treturn 0;\n}', detail: 'Program entry point' },
  ],
  java: [
    { label: 'for loop', body: 'for (int ${1:i} = 0; ${1:i} < ${2:size}; ${1:i}++) {\n\t${3}\n}', detail: 'Index-based loop' },
    { label: 'while loop', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'Repeat while a condition is true' },
    { label: 'method', body: 'public static ${1:void} ${2:name}(${3:parameters}) {\n\t${4}\n}', detail: 'Define a method' },
    { label: 'class', body: 'class ${1:Node} {\n\t${2:int data;}\n\t${1:Node} ${3:next};\n}', detail: 'Define a class' },
    { label: 'if / else', body: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}', detail: 'Conditional branch' },
  ],
  csharp: [
    { label: 'for loop', body: 'for (int ${1:i} = 0; ${1:i} < ${2:size}; ${1:i}++) {\n\t${3}\n}', detail: 'Index-based loop' },
    { label: 'while loop', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'Repeat while a condition is true' },
    { label: 'method', body: 'public static ${1:void} ${2:Name}(${3:parameters}) {\n\t${4}\n}', detail: 'Define a method' },
    { label: 'class', body: 'public class ${1:Node} {\n\tpublic ${2:int} Data;\n\tpublic ${1:Node}? ${3:Next};\n}', detail: 'Define a class' },
  ],
  go: [
    { label: 'for loop', body: 'for ${1:i} := 0; ${1:i} < ${2:size}; ${1:i}++ {\n\t${3}\n}', detail: 'Index-based loop' },
    { label: 'range loop', body: 'for ${1:index}, ${2:value} := range ${3:items} {\n\t${4}\n}', detail: 'Iterate over a collection' },
    { label: 'function', body: 'func ${1:name}(${2:parameters}) ${3:returnType} {\n\t${4}\n}', detail: 'Define a function' },
    { label: 'struct node', body: 'type ${1:Node} struct {\n\t${2:Data int}\n\t${3:Next} *${1:Node}\n}', detail: 'Define a linked structure' },
    { label: 'if / else', body: 'if ${1:condition} {\n\t${2}\n} else {\n\t${3}\n}', detail: 'Conditional branch' },
  ],
};

const wordPattern = /[A-Za-z_$][\w$]*/g;

function collectLearnerSymbols(code: string): Set<string> {
  const symbols = new Set<string>();
  for (const match of code.matchAll(wordPattern)) {
    const word = match[0];
    if (word.length > 1) symbols.add(word);
  }
  return symbols;
}

function makeCompletions(
  context: CompletionContext,
  model: MonacoEditor.ITextModel,
  position: monaco.Position,
  monacoApi: typeof monaco,
): languages.CompletionList {
  const { language, code } = context;
  const symbols = collectLearnerSymbols(code);
  const word = model.getWordUntilPosition(position);
  const range = new monacoApi.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
  const items: CompletionItem[] = [];
  for (const label of KEYWORDS[language]) {
    const insertText = label.startsWith('#include') || label.startsWith('using namespace')
      ? label
      : label === 'print' && language === 'python'
        ? 'print(${1:value})'
        : label === 'std::cout' && language === 'cpp'
          ? 'std::cout << ${1:value};'
          : label === 'System.out.println' && language === 'java'
            ? 'System.out.println(${1:value});'
            : label === 'Console.WriteLine' && language === 'csharp'
              ? 'Console.WriteLine(${1:value});'
              : label === 'fmt.Println' && language === 'go'
                ? 'fmt.Println(${1:value})'
                : label;
    items.push({
      label,
      kind: monacoApi.languages.CompletionItemKind.Keyword,
      insertText,
      range,
      insertTextRules: insertText.includes('${1:') ? monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
      detail: 'Language keyword / built-in',
      sortText: `2-${label}`,
    });
  }
  for (const snippet of SNIPPETS[language]) {
    items.push({
      label: snippet.label,
      kind: monacoApi.languages.CompletionItemKind.Snippet,
      insertText: snippet.body,
      insertTextRules: monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      detail: snippet.detail,
      sortText: `1-${snippet.label}`,
    });
  }
  for (const name of symbols) {
    if (KEYWORDS[language].includes(name)) continue;
    items.push({
      label: name,
      kind: /\b(?:def|function|func)\s+$/.test(code.slice(Math.max(0, code.lastIndexOf(name) - 16), code.lastIndexOf(name)))
        ? monacoApi.languages.CompletionItemKind.Function
        : monacoApi.languages.CompletionItemKind.Variable,
      insertText: name,
      range,
      detail: 'Name found in this program',
      sortText: `0-${name}`,
    });
  }
  return { suggestions: items };
}

export interface LiveCodeEditorProps {
  language: DebuggerLanguage;
  value: string;
  activeLine: number | null;
  traceIsCurrent: boolean;
  onChange: (code: string) => void;
  onRunNow: () => void;
}

export default function LiveCodeEditor({ language, value, activeLine, traceIsCurrent, onChange, onRunNow }: LiveCodeEditorProps) {
  const codeRef = useRef(value);
  const runRef = useRef(onRunNow);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<IDisposable | null>(null);

  useEffect(() => { codeRef.current = value; }, [value]);
  useEffect(() => { runRef.current = onRunNow; }, [onRunNow]);

  const onMount: OnMount = useCallback((editor, monacoApi) => {
    editorRef.current = editor;
    const appTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const css = getComputedStyle(editor.getContainerDomNode().closest('.multi-lang-code-panel') ?? document.documentElement);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const background = token('--color-app-bg', appTheme === 'light' ? '#f7f7fb' : '#09090b');
    const foreground = token('--color-text', appTheme === 'light' ? '#171923' : '#e5e7eb');
    const muted = token('--color-text-muted', appTheme === 'light' ? '#73798a' : '#71717a');
    const border = token('--color-border', appTheme === 'light' ? '#dfe2ea' : '#27272a');
    const selection = token('--color-primary', appTheme === 'light' ? '#2563eb' : '#60a5fa');
    monacoApi.editor.defineTheme('stem-studio-live', {
      base: appTheme === 'light' ? 'vs' : 'vs-dark', inherit: true, rules: [],
      colors: {
        'editor.background': background,
        'editor.foreground': foreground,
        'editorLineNumber.foreground': muted,
        'editorLineNumber.activeForeground': foreground,
        'editor.lineHighlightBackground': token('--color-surface-elevated', appTheme === 'light' ? '#eef0f6' : '#18181b'),
        'editorCursor.foreground': selection,
        'editor.selectionBackground': `${selection}55`,
        'editorIndentGuide.background1': border,
        'editorIndentGuide.activeBackground1': selection,
        'editorWidget.background': token('--color-surface', background),
        'editorSuggestWidget.background': token('--color-surface', background),
      },
    });
    monacoApi.editor.setTheme('stem-studio-live');
    const providers = (Object.keys(LANGUAGE_MAP) as DebuggerLanguage[]).map((targetLanguage) =>
      monacoApi.languages.registerCompletionItemProvider(LANGUAGE_MAP[targetLanguage], {
        triggerCharacters: ['.', '#', ':'],
        provideCompletionItems: (model: MonacoEditor.ITextModel, position: monaco.Position) => makeCompletions({ language: targetLanguage, code: codeRef.current }, model, position, monacoApi),
      }),
    );
    completionProviderRef.current = { dispose: () => providers.forEach((provider) => provider.dispose()) };
    editor.addAction({
      id: 'stem-live-code-run',
      label: 'Run current program',
      keybindings: [monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Enter],
      run: () => runRef.current(),
    });
    // Do not force the soft keyboard open on phones; let the learner tap the
    // editor when ready. Desktop keeps the immediate typing workflow.
    if (window.matchMedia('(min-width: 901px)').matches) editor.focus();
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const monacoApi = monaco;
    if (!editor) return;
    const decorations = traceIsCurrent && activeLine != null ? [{
      range: new monacoApi.Range(activeLine, 1, activeLine, 1),
      options: { isWholeLine: true, className: 'live-trace-current-line', glyphMarginClassName: 'live-trace-glyph' },
    }] : [];
    const ids = editor.deltaDecorations([], decorations);
    if (traceIsCurrent && activeLine != null) editor.revealLineInCenterIfOutsideViewport(activeLine);
    return () => { editor.deltaDecorations(ids, []); };
  }, [activeLine, traceIsCurrent]);

  useEffect(() => () => {
    completionProviderRef.current?.dispose();
    editorRef.current = null;
  }, []);

  return (
    <Editor
      height="100%"
      width="100%"
      language={LANGUAGE_MAP[language]}
      path={`inmemory://stem-studio-live/${language}`}
      value={value}
      theme="stem-studio-live"
      onChange={(next) => { const code = next ?? ''; codeRef.current = code; onChange(code); }}
      onMount={onMount}
      loading={<div className="live-editor-loading" role="status">Preparing editor…</div>}
      options={{
        automaticLayout: true,
        ariaLabel: `Live ${language.toUpperCase()} program editor`,
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: 'active', highlightActiveIndentation: true },
        glyphMargin: true,
        lineNumbers: 'on',
        lineNumbersMinChars: 3,
        minimap: { enabled: window.matchMedia('(min-width: 1100px)').matches, scale: 1 },
        padding: { top: 12, bottom: 14 },
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
        fontSize: window.matchMedia('(max-width: 600px)').matches ? 13 : 14,
        lineHeight: 22,
        fontLigatures: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        stickyScroll: { enabled: true, maxLineCount: 3 },
        tabSize: 4,
        wordWrap: 'off',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        quickSuggestions: { other: true, comments: false, strings: true },
        quickSuggestionsDelay: 90,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        wordBasedSuggestions: 'allDocuments',
        parameterHints: { enabled: true },
        suggest: { preview: true, showIcons: true, snippetsPreventQuickSuggestions: false },
        renderLineHighlight: 'all',
        renderWhitespace: 'selection',
        contextmenu: true,
        mouseWheelZoom: true,
        accessibilitySupport: 'auto',
        autoIndent: 'full',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        formatOnPaste: false,
        formatOnType: false,
        readOnly: false,
        domReadOnly: false,
      }}
    />
  );
}
