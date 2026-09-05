import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, Trash2, HelpCircle, Play, CornerDownLeft } from 'lucide-react';
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

export const VFSTerminal: React.FC<VFSTerminalProps> = ({
  snapshot,
  history,
  onExecuteCommand,
  onClearTerminal,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPath = getAbsolutePath(snapshot.nodes, snapshot.currentDirId);
  const displayPath = currentPath.startsWith('/home/octa')
    ? currentPath.replace('/home/octa', '~')
    : currentPath;

  // Auto-scroll to bottom when new command output is added
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onExecuteCommand(inputVal);
    setInputVal('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex + 1 < history.length ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      setInputVal(history[history.length - 1 - nextIdx]?.command || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[history.length - 1 - nextIdx]?.command || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
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

  return (
    <div className="w-full h-full min-h-[340px] bg-slate-950/95 rounded-2xl border border-slate-800/90 p-4 font-mono shadow-2xl flex flex-col justify-between overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/90 text-xs font-sans shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-500/10 text-cyan-400">
            <TerminalIcon size={15} />
          </div>
          <span className="text-slate-200 font-mono text-xs font-bold">
            octa@stem-studio:<span className="text-cyan-400">{displayPath}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearTerminal}
            className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center gap-1 text-[11px] font-semibold border border-slate-800 transition-colors"
            title="Clear terminal history"
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Log Area */}
      <div
        className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs leading-relaxed font-mono custom-scrollbar min-h-[160px]"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="text-slate-400 text-[11px] pb-2 border-b border-slate-900 leading-normal">
          Linux stem-studio 5.15.0-88-generic #98-Ubuntu SMP x86_64 zsh 5.8.1
          <br />
          Type Linux bash commands below or select a quick shortcut button.
        </div>

        {history.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-cyan-400 font-bold">octa@stem-studio</span>
              <span className="text-slate-400">:</span>
              <span className="text-emerald-400 font-bold">{displayPath}</span>
              <span className="text-cyan-400 font-bold">$</span>
              <span className="text-slate-100 font-semibold">{item.command}</span>
            </div>

            {item.output && (
              <div
                className={`whitespace-pre-wrap text-xs pl-3 border-l-2 ${
                  item.isError
                    ? 'text-red-400 border-red-500/40 bg-red-500/5 p-1.5 rounded'
                    : 'text-slate-300 border-slate-700/60'
                }`}
              >
                {item.output}
              </div>
            )}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Quick Exec Buttons Strip */}
      <div className="pt-2 border-t border-slate-900/90 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap shrink-0 py-1 scrollbar-none">
        <span className="text-[10px] text-slate-400 font-sans font-semibold shrink-0">Quick Exec:</span>
        {quickCommands.map((qCmd, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onExecuteCommand(qCmd)}
            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-800 hover:bg-cyan-500/20 hover:border-cyan-500/40 shrink-0 transition-colors"
          >
            $ {qCmd}
          </button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-800/90 shrink-0">
        <div className="flex items-center gap-1 font-mono text-xs text-cyan-400 shrink-0">
          <span className="font-bold">octa@stem-studio</span>
          <span className="text-slate-400">:</span>
          <span className="text-emerald-400 font-bold">{displayPath}</span>
          <span className="font-bold">$</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type bash command..."
          className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none font-mono py-1"
        />
        <button
          type="submit"
          className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-semibold shrink-0 transition-colors"
          title="Run bash command"
        >
          <CornerDownLeft size={14} />
        </button>
      </form>
    </div>
  );
};
