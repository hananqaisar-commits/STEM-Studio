import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Trash2, Sparkles, Command, CheckCircle2 } from 'lucide-react';
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

  // Auto scroll terminal output ONLY when output history changes
  useEffect(() => {
    if (terminalEndRef.current && history.length > 0) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [history.length]);

  // Helper: Resolve directory children for path completion
  const getPathCompletions = (targetPath: string): { dirPath: string; filter: string; matches: string[] } => {
    let parentPath = '';
    let filterPrefix = targetPath;

    if (targetPath.includes('/')) {
      const lastSlashIdx = targetPath.lastIndexOf('/');
      parentPath = targetPath.slice(0, lastSlashIdx);
      filterPrefix = targetPath.slice(lastSlashIdx + 1);
    }

    let targetDirId = snapshot.currentDirId;
    if (parentPath === '' && targetPath.startsWith('/')) {
      targetDirId = 'root';
    } else if (parentPath === '/') {
      targetDirId = 'root';
    } else if (parentPath) {
      const matchingNode = Object.values(snapshot.nodes).find(n => {
        if (n.type !== 'directory' && n.type !== 'mount-point') return false;
        return getAbsolutePath(snapshot.nodes, n.id) === parentPath;
      });
      if (matchingNode) targetDirId = matchingNode.id;
    }

    const currentDir = snapshot.nodes[targetDirId];
    if (!currentDir || !currentDir.childrenIds) return { dirPath: parentPath, filter: filterPrefix, matches: [] };

    const childNames = currentDir.childrenIds
      .map(id => {
        const node = snapshot.nodes[id];
        if (!node) return null;
        return node.type === 'directory' || node.type === 'mount-point' ? `${node.name}/` : node.name;
      })
      .filter(Boolean) as string[];

    const matches = childNames.filter(name => name.toLowerCase().startsWith(filterPrefix.toLowerCase()));
    return { dirPath: parentPath, filter: filterPrefix, matches };
  };

  // Tab Autocomplete handler
  const handleTabCompletion = () => {
    const trimmed = lineText.trimStart();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      const prefix = parts[0].toLowerCase();
      const matches = COMMAND_LIST.filter(c => c.startsWith(prefix));
      if (matches.length === 1) {
        setLineText(matches[0] + ' ');
        setCursorPos(matches[0].length + 1);
      }
    } else {
      const targetArg = parts[parts.length - 1];
      const { dirPath, filter, matches } = getPathCompletions(targetArg);
      if (matches.length === 1) {
        const completedSegment = matches[0];
        let replacement = completedSegment;
        if (dirPath) {
          replacement = dirPath.endsWith('/') ? `${dirPath}${completedSegment}` : `${dirPath}/${completedSegment}`;
        }
        parts[parts.length - 1] = replacement;
        const newText = parts.join(' ');
        setLineText(newText);
        setCursorPos(newText.length);
      }
    }
  };

  // Keyboard Handler for terminal navigation & shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey) {
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        onClearTerminal();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setLineText('');
        setCursorPos(0);
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        const after = lineText.slice(cursorPos);
        setLineText(after);
        setCursorPos(0);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLineText(val);
    setCursorPos(val.length);
  };

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
    'cd /home/octa',
    'touch notes.txt',
    'useradd Alice',
    'chmod 755 notes.txt',
    'vim main.py',
    'cat /etc/passwd',
  ];

  const beforeCursor = lineText.slice(0, cursorPos);
  const charAtCursor = lineText[cursorPos] || ' ';
  const afterCursor = lineText.slice(cursorPos + 1);

  return (
    <div
      ref={containerRef}
      onClick={focusTerminal}
      className="w-full h-full min-h-[420px] bg-[var(--color-surface)]/95 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl shadow-2xl p-4 font-mono flex flex-col justify-between overflow-hidden cursor-text select-text transition-all relative"
    >
      {/* Hidden input catching keyboard focus */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={lineText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="opacity-0 absolute -z-10 w-0 h-0 pointer-events-none"
        aria-label="Terminal command input"
        autoFocus
      />

      {/* Terminal Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border)] text-xs font-sans shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block shadow-sm hover:opacity-100 transition-opacity" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-sm hover:opacity-100 transition-opacity" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-sm hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-extrabold text-xs shadow-sm">
            <Sparkles size={13} className="text-purple-500 animate-pulse" />
            <span>Octa Interactive Linux Shell</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block font-mono text-[11px] text-purple-700 dark:text-cyan-300 bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20 font-bold shadow-sm">
            {displayPath}
          </span>
          <button
            type="button"
            onClick={onClearTerminal}
            className="bst-btn bst-btn-danger text-xs py-1 px-3"
            title="Clear terminal screen (Ctrl+L)"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Log Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs leading-relaxed font-mono min-h-[220px]">
        {/* Shell Welcome Header */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/5 border border-purple-500/20 text-[11px] text-[var(--color-text-secondary)] leading-normal flex items-center justify-between mb-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <TerminalIcon size={16} className="text-purple-500 shrink-0" />
            <span className="font-semibold">STEM Studio Linux Shell v5.15 — Interactive VFS Engine with live bash tab-completion.</span>
          </div>
          <span className="hidden md:flex items-center gap-1 text-[10px] font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/25">
            <CheckCircle2 size={11} className="text-emerald-500" /> Tab Autocomplete
          </span>
        </div>

        {history.map((item, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]">octa</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-400/30 text-[10px]">
                {item.prompt ? item.prompt.split(':')[1]?.replace('$', '') : displayPath}
              </span>
              <span className="text-purple-500 font-extrabold">$</span>
              <span className="text-[var(--color-text)] font-bold">{item.command}</span>
            </div>

            {item.output && (
              <div
                className={`whitespace-pre-wrap text-xs pl-3.5 py-2 border-l-2 font-mono ${
                  item.isError
                    ? 'text-red-700 dark:text-red-300 border-red-500/60 bg-red-500/10 rounded-r-xl font-medium'
                    : 'text-[var(--color-text-secondary)] border-purple-500/40 bg-[var(--color-surface-muted)]/50 rounded-r-xl'
                }`}
              >
                {item.output}
              </div>
            )}
          </div>
        ))}

        {/* ACTIVE LIVE PROMPT LINE WITH IN-LINE GLOW CURSOR */}
        <div className="flex items-center gap-2 text-xs font-mono pt-1">
          <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]">octa</span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-400/30 text-[10px]">
            {displayPath}
          </span>
          <span className="text-purple-500 font-extrabold">$</span>
          
          <div className="flex items-center font-mono text-[var(--color-text)] font-bold leading-none min-w-[20px]">
            <span>{beforeCursor}</span>
            <span className="bg-purple-600 text-white font-bold px-0.5 rounded-sm animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.9)]">
              {charAtCursor}
            </span>
            <span>{afterCursor}</span>
          </div>
        </div>

        <div ref={terminalEndRef} />
      </div>

      {/* Quick Exec Shortcuts Strip */}
      <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2 overflow-x-auto whitespace-nowrap shrink-0 py-1 scrollbar-none">
        <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] font-sans font-bold shrink-0">
          <Command size={12} className="text-purple-500" />
          <span>Quick Exec:</span>
        </div>
        {quickCommands.map((qCmd, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExecuteCommand(qCmd);
              focusTerminal();
            }}
            className="text-[11px] font-mono px-3 py-1 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 hover:border-purple-500/50 hover:bg-purple-500/20 shrink-0 transition-all cursor-pointer font-bold shadow-sm hover:scale-105 active:scale-95"
          >
            $ {qCmd}
          </button>
        ))}
      </div>
    </div>
  );
};
