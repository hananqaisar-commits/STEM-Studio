import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Trash2, Command, CheckCircle2 } from 'lucide-react';
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

  const currentPath = getAbsolutePath(snapshot.nodes, snapshot.currentDirId);
  const displayPath = currentPath.startsWith('/home/octa')
    ? currentPath.replace('/home/octa', '~')
    : currentPath;

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current && history.length > 0) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      terminalEndRef.current.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
  }, [history.length]);

  const clearTerminal = () => {
    setLineText('');
    setHistoryIdx(-1);
    onClearTerminal();
  };

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
      clearTerminal();
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
        clearTerminal();
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
      onClick={focusInput}
      className="linux-terminal"
    >
      {/* Authentic Linux Window Header Bar */}
      <div className="linux-terminal__header shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          </div>
          <div className="linux-terminal__identity">
            <TerminalIcon size={14} aria-hidden="true" />
            <span>octa@stem-studio · VFS shell</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="linux-terminal__path font-mono text-[11px]" title={displayPath}>
            {displayPath}
          </span>
          <button
            type="button"
            onClick={clearTerminal}
            className="bst-btn bst-btn-danger text-xs py-1 px-3"
            title="Clear terminal screen (Ctrl+L)"
            aria-label="Clear terminal output"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Log Area */}
      <div className="linux-terminal__output space-y-2.5 text-xs">
        {/* Welcome Banner */}
        <div className="linux-terminal__welcome">
          <div className="linux-terminal__welcome-main">
            <TerminalIcon size={15} className="shrink-0" aria-hidden="true" />
            <span className="font-semibold">Interactive Linux shell with tab completion.</span>
          </div>
          <span className="hidden md:flex items-center gap-1 text-[10px] font-mono">
            <CheckCircle2 size={12} className="text-emerald-300" aria-hidden="true" /> Tab autocomplete
          </span>
        </div>

        {/* Command History Output */}
        {history.map((item, idx) => (
          <div key={`${item.command}-${idx}`} className="space-y-1.5">
            <div className="linux-terminal__prompt">
              <span className="linux-terminal__user">octa@stem-studio</span>
              <span className="linux-terminal__separator">:</span>
              <span className="linux-terminal__cwd">
                {item.prompt ? item.prompt.split(':')[1]?.replace('$', '') : displayPath}
              </span>
              <span className="linux-terminal__symbol">$</span>
              <span className="linux-terminal__command">{item.command}</span>
            </div>

            {item.output && (
              <div
                className={`linux-terminal__output-line ${item.isError ? 'is-error' : ''}`}
              >
                {item.output}
              </div>
            )}
          </div>
        ))}

        {/* LIVE PROMPT & REAL NATIVE INPUT LINE */}
        <div className="linux-terminal__entry">
          <span className="linux-terminal__user shrink-0">octa@stem-studio</span>
          <span className="linux-terminal__separator shrink-0">:</span>
          <span className="linux-terminal__cwd">{displayPath}</span>
          <span className="linux-terminal__symbol shrink-0">$</span>

          <input
            ref={inputRef}
            type="text"
            value={lineText}
            onChange={(e) => setLineText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none p-0 m-0 focus:ring-0"
            placeholder="Type a command…"
            aria-label="Linux terminal command"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>

        <div ref={terminalEndRef} />
      </div>

      {/* Quick Execution Shortcuts Strip */}
      <div className="linux-terminal__shortcuts shrink-0 scrollbar-none" aria-label="Quick command shortcuts">
        <div className="linux-terminal__shortcut-label shrink-0">
          <Command size={12} aria-hidden="true" />
          <span>Try:</span>
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
            className="linux-terminal__shortcut shrink-0 cursor-pointer"
          >
            $ {qCmd}
          </button>
        ))}
      </div>
    </div>
  );
};
