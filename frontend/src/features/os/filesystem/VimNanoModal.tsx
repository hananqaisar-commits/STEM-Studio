import React, { useState, useEffect } from 'react';
import { X, Save, Key, Code, HelpCircle } from 'lucide-react';

interface VimNanoModalProps {
  isOpen: boolean;
  type: 'nano' | 'vim';
  filePath: string;
  initialContent: string;
  onSaveAndExit: (content: string) => void;
  onCancel: () => void;
}

export const VimNanoModal: React.FC<VimNanoModalProps> = ({
  isOpen,
  type,
  filePath,
  initialContent,
  onSaveAndExit,
  onCancel,
}) => {
  const [content, setContent] = useState<string>(initialContent);
  const [vimMode, setVimMode] = useState<'NORMAL' | 'INSERT' | 'COMMAND'>('NORMAL');
  const [commandInput, setCommandInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    setContent(initialContent);
    setVimMode('NORMAL');
    setCommandInput('');
    setStatusMessage('');
  }, [initialContent, isOpen]);

  if (!isOpen) return null;

  // Handle keybindings in Vim Normal Mode
  const handleVimKeyDown = (e: React.KeyboardEvent) => {
    if (type !== 'vim') return;

    if (vimMode === 'NORMAL') {
      if (e.key === 'i') {
        e.preventDefault();
        setVimMode('INSERT');
        setStatusMessage('-- INSERT --');
      } else if (e.key === ':') {
        e.preventDefault();
        setVimMode('COMMAND');
        setCommandInput(':');
        setStatusMessage('');
      } else if (e.key === 'd') {
        // Simple line deletion logic for demo
        const lines = content.split('\n');
        lines.pop();
        setContent(lines.join('\n'));
        setStatusMessage('1 line deleted');
      }
    } else if (vimMode === 'INSERT') {
      if (e.key === 'Escape') {
        e.preventDefault();
        setVimMode('NORMAL');
        setStatusMessage('');
      }
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (cmd === ':w') {
      setStatusMessage(`"${filePath}" written`);
      setVimMode('NORMAL');
    } else if (cmd === ':q') {
      onCancel();
    } else if (cmd === ':wq' || cmd === ':x') {
      onSaveAndExit(content);
    } else if (cmd === ':q!') {
      onCancel();
    } else {
      setStatusMessage(`E492: Not an editor command: ${cmd}`);
      setVimMode('NORMAL');
    }
    setCommandInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] font-mono">
        {/* Editor Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">
              {type}
            </span>
            <span className="text-slate-200 font-semibold">{filePath}</span>
          </div>

          <div className="flex items-center gap-3">
            {type === 'vim' && (
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  vimMode === 'INSERT'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : vimMode === 'COMMAND'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                MODE: {vimMode}
              </span>
            )}
            <button
              onClick={onCancel}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Text Area Content Buffer */}
        <div className="flex-1 p-4 bg-slate-950 relative" onKeyDown={handleVimKeyDown} tabIndex={0}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={type === 'vim' && vimMode !== 'INSERT'}
            placeholder={
              type === 'vim' && vimMode === 'NORMAL'
                ? 'Vim Normal Mode: Press "i" to enter Insert mode and edit text, or ":" for commands.'
                : 'Type file text content here...'
            }
            className="w-full h-full bg-transparent text-slate-100 text-xs focus:outline-none resize-none font-mono leading-relaxed"
          />
        </div>

        {/* Editor Bottom Bar / Command Mode Input */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-xs flex items-center justify-between">
          {type === 'vim' ? (
            vimMode === 'COMMAND' ? (
              <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 flex-1">
                <input
                  autoFocus
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder=":wq to save & exit, :q to quit"
                  className="bg-transparent text-amber-300 text-xs font-mono focus:outline-none w-full"
                />
              </form>
            ) : (
              <div className="flex items-center justify-between w-full text-[11px] text-slate-400">
                <span>{statusMessage || (vimMode === 'NORMAL' ? 'Press "i" for Insert mode, ":" for command mode' : '-- INSERT --')}</span>
                <span className="text-slate-400">Press Esc for Normal Mode</span>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between w-full text-xs">
              <span className="text-slate-400 text-[11px]">Nano 6.2 — GNU nano editor</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSaveAndExit(content)}
                  className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 hover:bg-cyan-500/30"
                >
                  <Save size={13} /> Save & Exit (Ctrl+O)
                </button>
                <button
                  onClick={onCancel}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel (Ctrl+X)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
