import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle, Play } from 'lucide-react';
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
  // Shorten home directory to ~
  const displayPath = currentPath.startsWith('/home/student')
    ? currentPath.replace('/home/student', '~')
    : currentPath;

  const promptStr = `${snapshot.currentUser}@stem-studio:${displayPath}$`;

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
    <div className="w-full bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono shadow-2xl flex flex-col h-[380px]">
      {/* Terminal Bar Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/90 text-xs font-sans">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-slate-400 font-mono text-[11px] ml-2">bash — 80x24</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearTerminal}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center gap-1 text-[11px]"
            title="Clear terminal screen"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Display Area */}
      <div
        className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-900">
          Linux stem-studio 5.15.0-88-generic #98-Ubuntu SMP x86_64 bash 5.1.16
          <br />
          Type Linux bash commands below or select a quick shortcut button.
        </div>

        {history.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-emerald-400 font-bold">{item.prompt}</span>
              <span className="text-slate-100 font-semibold">{item.command}</span>
            </div>
            {item.output && (
              <div
                className={`whitespace-pre-wrap pl-3 border-l-2 ${
                  item.isError
                    ? 'text-red-400 border-red-500/40 bg-red-500/5 p-1 rounded'
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

      {/* Preset Quick Commands Strip */}
      <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto pb-1 mb-1">
        <span className="text-[10px] text-slate-400 shrink-0 font-sans font-semibold">Quick Exec:</span>
        {quickCommands.map((qCmd, idx) => (
          <button
            key={idx}
            onClick={() => onExecuteCommand(qCmd)}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 hover:bg-cyan-500/20 hover:border-cyan-500/40 shrink-0 transition-colors"
          >
            $ {qCmd}
          </button>
        ))}
      </div>

      {/* Terminal Input Line */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        <span className="text-emerald-400 text-xs font-bold shrink-0">{promptStr}</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type bash command..."
          className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none font-mono"
        />
        <button
          type="submit"
          className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
