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
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPath = getAbsolutePath(snapshot.nodes, snapshot.currentDirId);
  const displayPath = currentPath.startsWith('/home/octa')
    ? currentPath.replace('/home/octa', '~')
    : currentPath;

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (terminalEndRef.current && history.length > 0) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [history.length]);

  // Tab completion helper
  const getPathCompletions = (targetPath: string) => {
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

  const handleTabCompletion = () => {
    const trimmed = lineText.trimStart();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      const prefix = parts[0].toLowerCase();
      const matches = COMMAND_LIST.filter(c => c.startsWith(prefix));
      if (matches.length === 1) {
        setLineText(matches[0] + ' ');
      }
    } else {
      const targetArg = parts[parts.length - 1];
      const { dirPath, matches } = getPathCompletions(targetArg);
      if (matches.length === 1) {
        const completedSegment = matches[0];
        let replacement = completedSegment;
        if (dirPath) {
          replacement = dirPath.endsWith('/') ? `${dirPath}${completedSegment}` : `${dirPath}/${completedSegment}`;
        }
        parts[parts.length - 1] = replacement;
        setLineText(parts.join(' '));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      onClearTerminal();
      return;
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
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        const histCmd = history[history.length - 1 - nextIdx]?.command || '';
        setLineText(histCmd);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setLineText('');
      }
      return;
    }
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

  return (
    <div
      ref={containerRef}
      onClick={focusInput}
      className="w-full h-full min-h-[420px] bg-[#0c0d12] text-[#e2e8f0] border border-[var(--color-border)] rounded-2xl shadow-2xl p-4 font-mono flex flex-col justify-between overflow-hidden cursor-text select-text relative transition-all"
    >
      {/* Authentic Linux Window Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-sans shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-extrabold text-xs shadow-sm">
            <Sparkles size={13} className="text-purple-400 animate-pulse" />
            <span>octa@stem-studio: ~ (bash)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block font-mono text-[11px] text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-800/50 font-bold shadow-sm">
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
        {/* Welcome Banner */}
        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200 leading-normal flex items-center justify-between mb-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <TerminalIcon size={16} className="text-purple-400 shrink-0" />
            <span className="font-semibold">STEM Studio Linux Shell v5.15 — Interactive VFS Engine with tab-completion.</span>
          </div>
          <span className="hidden md:flex items-center gap-1 text-[10px] font-mono text-purple-300 font-bold bg-purple-900/40 px-2 py-0.5 rounded border border-purple-700/50">
            <CheckCircle2 size={11} className="text-emerald-400" /> Tab Autocomplete
          </span>
        </div>

        {/* Command History Output */}
        {history.map((item, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold">octa@stem-studio</span>
              <span className="text-slate-400">:</span>
              <span className="text-cyan-400 font-bold">
                {item.prompt ? item.prompt.split(':')[1]?.replace('$', '') : displayPath}
              </span>
              <span className="text-purple-400 font-extrabold">$</span>
              <span className="text-slate-100 font-bold">{item.command}</span>
            </div>

            {item.output && (
              <div
                className={`whitespace-pre-wrap text-xs pl-3.5 py-1.5 border-l-2 font-mono ${
                  item.isError
                    ? 'text-red-300 border-red-500/60 bg-red-950/20 rounded-r-xl font-medium'
                    : 'text-slate-300 border-purple-500/40 bg-slate-900/40 rounded-r-xl'
                }`}
              >
                {item.output}
              </div>
            )}
          </div>
        ))}

        {/* LIVE PROMPT & REAL NATIVE INPUT LINE */}
        <div className="flex items-center gap-2 text-xs font-mono pt-1">
          <span className="text-emerald-400 font-bold shrink-0">octa@stem-studio</span>
          <span className="text-slate-400 shrink-0">:</span>
          <span className="text-cyan-400 font-bold shrink-0">{displayPath}</span>
          <span className="text-purple-400 font-extrabold shrink-0">$</span>

          <input
            ref={inputRef}
            type="text"
            value={lineText}
            onChange={(e) => setLineText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xs font-bold p-0 m-0 focus:ring-0"
            placeholder=""
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>

        <div ref={terminalEndRef} />
      </div>

      {/* Quick Execution Shortcuts Strip */}
      <div className="pt-3 border-t border-slate-800 flex items-center gap-2 overflow-x-auto whitespace-nowrap shrink-0 py-1 scrollbar-none">
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans font-bold shrink-0">
          <Command size={12} className="text-purple-400" />
          <span>Quick Exec:</span>
        </div>
        {quickCommands.map((qCmd, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExecuteCommand(qCmd);
              focusInput();
            }}
            className="text-[11px] font-mono px-3 py-1 rounded-xl bg-purple-950/40 text-purple-300 border border-purple-800/40 hover:border-purple-500 hover:bg-purple-900/60 shrink-0 transition-all cursor-pointer font-bold shadow-sm hover:scale-105 active:scale-95"
          >
            $ {qCmd}
          </button>
        ))}
      </div>
    </div>
  );
};
