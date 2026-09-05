import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Trash2, HelpCircle, CornerDownLeft, Sparkles } from 'lucide-react';
import { type VFSSnapshot, getAbsolutePath } from './vfs';

interface HistoryItem {
  prompt: string;
  command: string;
  output: string;
  isError?: boolean;
}

interface VFSTerminalProps {
  snapshot: VFSSnapshot;
  history: HistoryItem[];
  onExecuteCommand: (cmd: string) => void;
  onClearTerminal: () => void;
}

const COMMAND_LIST = [
  'pwd', 'ls', 'cd', 'mkdir', 'rmdir', 'touch', 'rm', 'cp', 'mv', 'cat',
  'nano', 'vim', 'useradd', 'userdel', 'groupadd', 'usermod', 'chmod',
  'chown', 'chgrp', 'export', 'whoami', 'id', 'grep', 'find', 'uname',
  'clear', 'history'
];

export const VFSTerminal: React.FC<VFSTerminalProps> = ({
  snapshot,
  history,
  onExecuteCommand,
  onClearTerminal,
}) => {
  const [lineText, setLineText] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [tabPressCount, setTabPressCount] = useState<number>(0);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPath = getAbsolutePath(snapshot.nodes, snapshot.currentDirId);
  const displayPath = currentPath.startsWith('/home/octa')
    ? currentPath.replace('/home/octa', '~')
    : currentPath;

  // Focus hidden input whenever user clicks inside terminal container
  const focusTerminal = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusTerminal();
  }, [focusTerminal]);

  // Auto scroll to bottom on output update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, lineText]);

  // Helper: Get available children of current working directory for tab completion
  const getTabCompletions = (prefix: string): string[] => {
    const currentDir = snapshot.nodes[snapshot.currentDirId];
    if (!currentDir || !currentDir.childrenIds) return [];

    const availableNames = currentDir.childrenIds
      .map(id => snapshot.nodes[id]?.name)
      .filter(Boolean) as string[];

    // If typing first token, also match system commands
    const isFirstToken = !lineText.trim().includes(' ');
    const candidates = isFirstToken ? [...COMMAND_LIST, ...availableNames] : availableNames;

    return candidates.filter(name => name.toLowerCase().startsWith(prefix.toLowerCase()));
  };

  // Tab Completion Handler
  const handleTabCompletion = () => {
    const tokens = lineText.slice(0, cursorPos).split(/\s+/);
    const lastToken = tokens[tokens.length - 1] || '';

    const matches = Array.from(new Set(getTabCompletions(lastToken)));

    if (matches.length === 1) {
      const match = matches[0];
      const prefixBeforeLastToken = lineText.slice(0, cursorPos - lastToken.length);
      const suffixAfterCursor = lineText.slice(cursorPos);
      const newLine = prefixBeforeLastToken + match + (match.endsWith('/') ? '' : ' ') + suffixAfterCursor;
      setLineText(newLine);
      setCursorPos((prefixBeforeLastToken + match).length + (match.endsWith('/') ? 0 : 1));
      setTabPressCount(0);
    } else if (matches.length > 1) {
      if (tabPressCount > 0) {
        // Double tab: Print candidate matches into output
        onExecuteCommand(`echo "\nPossible completions:\n${matches.join('   ')}"`);
        setTabPressCount(0);
      } else {
        setTabPressCount(1);
      }
    }
  };

  // Main KeyDown Event Handler for Real Terminal Interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    setTabPressCount(0);

    // Ctrl Shortcuts
    if (e.ctrlKey) {
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onExecuteCommand(`${lineText} ^C`);
        setLineText('');
        setCursorPos(0);
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        onClearTerminal();
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setCursorPos(0);
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setCursorPos(lineText.length);
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        setLineText(lineText.slice(cursorPos));
        setCursorPos(0);
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setLineText(lineText.slice(0, cursorPos));
        return;
      }
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        const before = lineText.slice(0, cursorPos);
        const after = lineText.slice(cursorPos);
        const lastSpace = before.trimEnd().lastIndexOf(' ');
        const newBefore = lastSpace >= 0 ? before.slice(0, lastSpace + 1) : '';
        setLineText(newBefore + after);
        setCursorPos(newBefore.length);
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const cmdToRun = lineText.trim();
      if (cmdToRun === 'clear') {
        onClearTerminal();
      } else if (cmdToRun) {
        onExecuteCommand(cmdToRun);
      }
      setLineText('');
      setCursorPos(0);
      setHistoryIdx(-1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx + 1 < history.length ? historyIdx + 1 : historyIdx;
      setHistoryIdx(nextIdx);
      const histCmd = history[history.length - 1 - nextIdx]?.command || '';
      setLineText(histCmd);
      setCursorPos(histCmd.length);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        const histCmd = history[history.length - 1 - nextIdx]?.command || '';
        setLineText(histCmd);
        setCursorPos(histCmd.length);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setLineText('');
        setCursorPos(0);
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCursorPos(prev => Math.max(0, prev - 1));
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCursorPos(prev => Math.min(lineText.length, prev + 1));
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setCursorPos(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setCursorPos(lineText.length);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (cursorPos > 0) {
        setLineText(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(prev => prev - 1);
      }
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      if (cursorPos < lineText.length) {
        setLineText(prev => prev.slice(0, cursorPos) + prev.slice(cursorPos + 1));
      }
      return;
    }
  };

  // Handle Input Changes from Hidden Input (Catch-all for character insertion & IME)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLineText(val);
    setCursorPos(val.length);
  };

  // Handle Paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    const before = lineText.slice(0, cursorPos);
    const after = lineText.slice(cursorPos);
    setLineText(before + pasted + after);
    setCursorPos(before.length + pasted.length);
  };

  const quickCommands = [
    'pwd',
    'ls -la',
    'cd /home',
    'touch notes.txt',
    'useradd Alice',
    'chmod 755 notes.txt',
    'vim document.txt',
    'cat /etc/passwd',
  ];

  const beforeCursor = lineText.slice(0, cursorPos);
  const charAtCursor = lineText[cursorPos] || ' ';
  const afterCursor = lineText.slice(cursorPos + 1);

  return (
    <div
      ref={containerRef}
      onClick={focusTerminal}
      className="w-full h-full min-h-[380px] bg-[var(--color-surface)] dark:bg-slate-950 text-[var(--color-text)] dark:text-slate-100 rounded-2xl border border-[var(--color-border)] dark:border-slate-800 p-4 font-mono shadow-2xl flex flex-col justify-between overflow-hidden cursor-text select-text transition-colors"
    >
      {/* Hidden input to catch keyboard focus & IME */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={lineText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="opacity-0 absolute -z-10 w-0 h-0 pointer-events-none"
        autoFocus
      />

      {/* Terminal Window Top Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)] dark:border-slate-800/90 text-xs font-sans shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono text-xs font-bold text-[var(--color-text)] dark:text-slate-200 ml-2">
            octa@stem-studio:<span className="text-cyan-500 dark:text-cyan-400">{displayPath}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearTerminal}
            className="px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-1 text-[11px] font-semibold border border-slate-300 dark:border-slate-800 transition-colors"
            title="Clear terminal screen (Ctrl+L)"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Log Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs leading-relaxed font-mono min-h-[180px]">
        <div className="text-slate-500 dark:text-slate-400 text-[11px] pb-2 border-b border-slate-200 dark:border-slate-900 leading-normal">
          Linux stem-studio 5.15.0-88-generic #98-Ubuntu SMP x86_64 zsh 5.8.1
          <br />
          Type Linux commands directly on prompt. Press Tab for completion, ↑/↓ for history.
        </div>

        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-purple-600 dark:text-cyan-400 font-bold">octa@stem-studio</span>
              <span className="text-slate-400">:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{displayPath}</span>
              <span className="text-purple-600 dark:text-cyan-400 font-bold">$</span>
              <span className="text-[var(--color-text)] dark:text-slate-100 font-semibold">{item.command}</span>
            </div>

            {item.output && (
              <div
                className={`whitespace-pre-wrap text-xs pl-3 border-l-2 font-mono ${
                  item.isError
                    ? 'text-red-500 dark:text-red-400 border-red-500/40 bg-red-500/5 p-1.5 rounded'
                    : 'text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/60'
                }`}
              >
                {item.output}
              </div>
            )}
          </div>
        ))}

        {/* ACTIVE LIVE PROMPT LINE WITH IN-LINE BLINKING CURSOR */}
        <div className="flex items-center gap-1 text-xs font-mono pt-1">
          <span className="text-purple-600 dark:text-cyan-400 font-bold shrink-0">octa@stem-studio</span>
          <span className="text-slate-400 shrink-0">:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{displayPath}</span>
          <span className="text-purple-600 dark:text-cyan-400 font-bold shrink-0">$</span>
          
          <div className="flex items-center font-mono text-slate-900 dark:text-slate-100 font-semibold leading-none min-w-[20px]">
            <span>{beforeCursor}</span>
            <span className="bg-purple-600 dark:bg-cyan-400 text-white dark:text-slate-950 font-bold px-0.5 rounded-sm animate-pulse">
              {charAtCursor}
            </span>
            <span>{afterCursor}</span>
          </div>
        </div>

        <div ref={terminalEndRef} />
      </div>

      {/* Quick Exec Shortcuts Strip */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-900 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap shrink-0 py-1 scrollbar-none">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-semibold shrink-0">
          Quick Exec:
        </span>
        {quickCommands.map((qCmd, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExecuteCommand(qCmd);
              focusTerminal();
            }}
            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-purple-700 dark:text-cyan-300 border border-slate-300 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-cyan-500/20 hover:border-purple-300 dark:hover:border-cyan-500/40 shrink-0 transition-colors"
          >
            $ {qCmd}
          </button>
        ))}
      </div>
    </div>
  );
};
