import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileText, HelpCircle, Search, AlertCircle, Check } from 'lucide-react';

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
  
  // Nano Interactive Prompt state (Write confirmation, exit prompt, search)
  const [nanoPrompt, setNanoPrompt] = useState<'NONE' | 'WRITE_CONFIRM' | 'EXIT_CONFIRM' | 'SEARCH'>('NONE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cut/paste buffers & Undo stack for realistic practice
  const [cutBuffer, setCutBuffer] = useState<string>('');
  const [undoHistory, setUndoHistory] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [pendingKey, setPendingKey] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setVimMode('NORMAL');
    setCommandInput('');
    setStatusMessage('');
    setNanoPrompt('NONE');
    setSearchQuery('');
    setCutBuffer('');
    setUndoHistory([initialContent]);
    setShowHelp(false);
    setPendingKey('');
  }, [initialContent, isOpen]);

  // Manage focus when mode or prompts change
  useEffect(() => {
    if (!isOpen) return;
    if (type === 'nano') {
      textareaRef.current?.focus();
    } else if (type === 'vim') {
      if (vimMode === 'COMMAND') {
        commandInputRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }
  }, [isOpen, type, vimMode, nanoPrompt]);

  if (!isOpen) return null;

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setUndoHistory(prev => [...prev.slice(-20), newContent]);
  };

  // Keyboard Event Handler for Real Terminal Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    // ------------------------------------------------------------------
    // NANO KEYBINDINGS (^O, ^X, ^K, ^U, ^W, ^G, ^S)
    // ------------------------------------------------------------------
    if (type === 'nano') {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Active Nano Prompts
      if (nanoPrompt === 'WRITE_CONFIRM') {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSaveAndExit(content);
          setNanoPrompt('NONE');
          setStatusMessage(`[ Wrote ${content.split('\n').length} lines to ${filePath} ]`);
          return;
        } else if (e.key === 'Escape' || (isCtrl && key === 'c')) {
          e.preventDefault();
          setNanoPrompt('NONE');
          setStatusMessage('[ Cancelled ]');
          return;
        }
      }

      if (nanoPrompt === 'EXIT_CONFIRM') {
        if (key === 'y') {
          e.preventDefault();
          onSaveAndExit(content);
          return;
        } else if (key === 'n') {
          e.preventDefault();
          onCancel();
          return;
        } else if (e.key === 'Escape' || (isCtrl && key === 'c')) {
          e.preventDefault();
          setNanoPrompt('NONE');
          setStatusMessage('[ Cancelled ]');
          return;
        }
      }

      if (nanoPrompt === 'SEARCH') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (searchQuery.trim()) {
            const idx = content.toLowerCase().indexOf(searchQuery.toLowerCase());
            if (idx !== -1) {
              setStatusMessage(`[ Found "${searchQuery}" at position ${idx} ]`);
              if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(idx, idx + searchQuery.length);
              }
            } else {
              setStatusMessage(`[ "${searchQuery}" not found ]`);
            }
          }
          setNanoPrompt('NONE');
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setNanoPrompt('NONE');
          return;
        }
      }

      // Standard Nano Keyboard Shortcuts
      if (isCtrl) {
        if (key === 'o') {
          // ^O WriteOut
          e.preventDefault();
          setNanoPrompt('WRITE_CONFIRM');
          setStatusMessage(`File Name to Write: ${filePath}`);
        } else if (key === 'x') {
          // ^X Exit
          e.preventDefault();
          if (content !== initialContent) {
            setNanoPrompt('EXIT_CONFIRM');
            setStatusMessage('Save modified buffer? (Answering "N" will DISCARD changes.) [Y/N]');
          } else {
            onCancel();
          }
        } else if (key === 'k') {
          // ^K Cut line
          e.preventDefault();
          const lines = content.split('\n');
          const lastLine = lines.pop() || '';
          setCutBuffer(lastLine);
          const newText = lines.join('\n');
          handleContentChange(newText);
          setStatusMessage('[ Cut 1 line ]');
        } else if (key === 'u') {
          // ^U Uncut / Paste line
          e.preventDefault();
          if (cutBuffer) {
            const newText = content ? `${content}\n${cutBuffer}` : cutBuffer;
            handleContentChange(newText);
            setStatusMessage('[ Uncut 1 line ]');
          } else {
            setStatusMessage('[ Cutbuffer is empty ]');
          }
        } else if (key === 'w') {
          // ^W Where is (Search)
          e.preventDefault();
          setNanoPrompt('SEARCH');
          setStatusMessage('Search:');
        } else if (key === 'g') {
          // ^G Help
          e.preventDefault();
          setShowHelp(prev => !prev);
        } else if (key === 's') {
          // ^S Save file directly
          e.preventDefault();
          onSaveAndExit(content);
          setStatusMessage(`[ Wrote ${content.split('\n').length} lines ]`);
        } else if (key === 'c') {
          // ^C Show position & status
          e.preventDefault();
          const lines = content.split('\n').length;
          const chars = content.length;
          setStatusMessage(`[ line ${lines}/${lines} (100%), col 1/${chars} char, char ${chars}/${chars} ]`);
        }
      }
    }

    // ------------------------------------------------------------------
    // VIM KEYBINDINGS (i, :, dd, yy, p, u, gg, G, ZZ, ZQ, Esc)
    // ------------------------------------------------------------------
    if (type === 'vim') {
      if (vimMode === 'NORMAL') {
        const key = e.key;

        // Block direct typing in Normal Mode
        if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
        }

        // Enter Insert Mode (i, a, o, I, A)
        if (key === 'i' || key === 'a' || key === 'I' || key === 'A') {
          e.preventDefault();
          setVimMode('INSERT');
          setStatusMessage('-- INSERT --');
        } else if (key === 'o') {
          e.preventDefault();
          setVimMode('INSERT');
          handleContentChange(content ? `${content}\n` : '');
          setStatusMessage('-- INSERT --');
        }
        // Enter Command Mode (:)
        else if (key === ':') {
          e.preventDefault();
          setVimMode('COMMAND');
          setCommandInput(':');
          setStatusMessage('');
        }
        // Undo (u)
        else if (key === 'u') {
          e.preventDefault();
          if (undoHistory.length > 1) {
            const nextHistory = [...undoHistory];
            nextHistory.pop();
            const prevContent = nextHistory[nextHistory.length - 1];
            setUndoHistory(nextHistory);
            setContent(prevContent);
            setStatusMessage('1 change; undo applied');
          } else {
            setStatusMessage('Already at oldest change');
          }
        }
        // Delete line (dd)
        else if (key === 'd') {
          e.preventDefault();
          if (pendingKey === 'd') {
            const lines = content.split('\n');
            const removed = lines.pop();
            if (removed !== undefined) setCutBuffer(removed);
            handleContentChange(lines.join('\n'));
            setStatusMessage('1 line less');
            setPendingKey('');
          } else {
            setPendingKey('d');
            setStatusMessage('d');
          }
        }
        // Yank / Copy line (yy)
        else if (key === 'y') {
          e.preventDefault();
          if (pendingKey === 'y') {
            const lines = content.split('\n');
            setCutBuffer(lines[lines.length - 1] || '');
            setStatusMessage('1 line yanked');
            setPendingKey('');
          } else {
            setPendingKey('y');
          }
        }
        // Paste line (p)
        else if (key === 'p') {
          e.preventDefault();
          if (cutBuffer) {
            const newText = content ? `${content}\n${cutBuffer}` : cutBuffer;
            handleContentChange(newText);
            setStatusMessage('1 line pasted');
          } else {
            setStatusMessage('Nothing in register');
          }
        }
        // Delete character under cursor (x)
        else if (key === 'x') {
          e.preventDefault();
          if (content.length > 0) {
            handleContentChange(content.slice(0, -1));
          }
        }
        // Jump to top (gg)
        else if (key === 'g') {
          e.preventDefault();
          if (pendingKey === 'g') {
            if (textareaRef.current) textareaRef.current.scrollTop = 0;
            setStatusMessage('1L, 1B');
            setPendingKey('');
          } else {
            setPendingKey('g');
          }
        }
        // Jump to bottom (G)
        else if (key === 'G') {
          e.preventDefault();
          if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
          }
          setStatusMessage(`${content.split('\n').length}L`);
        }
        // Fast Save & Exit Shortcuts: ZZ, ZQ
        else if (key === 'Z') {
          e.preventDefault();
          if (pendingKey === 'Z') {
            onSaveAndExit(content);
            setPendingKey('');
          } else {
            setPendingKey('Z');
          }
        } else if (key === 'Q' && pendingKey === 'Z') {
          e.preventDefault();
          onCancel();
          setPendingKey('');
        }
      } else if (vimMode === 'INSERT') {
        if (e.key === 'Escape' || (e.ctrlKey && e.key === '[')) {
          e.preventDefault();
          setVimMode('NORMAL');
          setStatusMessage('');
        }
      } else if (vimMode === 'COMMAND') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setVimMode('NORMAL');
          setStatusMessage('');
        }
      }
    }
  };

  // Vim Command Execution Handler
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (cmd === ':w') {
      setStatusMessage(`"${filePath}" written, ${content.split('\n').length}L`);
      setVimMode('NORMAL');
    } else if (cmd === ':q') {
      if (content !== initialContent) {
        setStatusMessage('E37: No write since last change (add ! to override)');
        setVimMode('NORMAL');
      } else {
        onCancel();
      }
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[560px] font-mono animate-fade-in"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Editor Light Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-100 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] uppercase tracking-wider shadow-sm">
              {type} EDITOR
            </span>
            <span className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
              <FileText size={15} className="text-purple-600" />
              {filePath}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {type === 'vim' && (
              <span
                className={`px-3 py-1 rounded-full font-bold text-[11px] ${
                  vimMode === 'INSERT'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : vimMode === 'COMMAND'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-purple-100 text-purple-800 border border-purple-300'
                }`}
              >
                MODE: {vimMode}
              </span>
            )}
            <button
              onClick={() => setShowHelp(prev => !prev)}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Keyboard Shortcuts Help"
            >
              <HelpCircle size={17} />
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Close Editor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Real-time Shortcut Help Drawer */}
        {showHelp && (
          <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 text-xs text-purple-900 flex justify-between items-start">
            <div>
              <span className="font-bold text-purple-950 block mb-1">
                {type === 'vim' ? 'Vim Keyboard Shortcuts Guide:' : 'GNU nano Keyboard Shortcuts Guide:'}
              </span>
              {type === 'vim' ? (
                <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-[11px]">
                  <div><code className="font-bold text-purple-700">i</code> : Insert mode</div>
                  <div><code className="font-bold text-purple-700">Esc</code> : Normal mode</div>
                  <div><code className="font-bold text-purple-700">:wq</code> : Save & Exit</div>
                  <div><code className="font-bold text-purple-700">dd</code> : Delete line</div>
                  <div><code className="font-bold text-purple-700">yy</code> : Copy line</div>
                  <div><code className="font-bold text-purple-700">p</code> : Paste line</div>
                  <div><code className="font-bold text-purple-700">u</code> : Undo change</div>
                  <div><code className="font-bold text-purple-700">ZZ</code> : Save & Exit</div>
                  <div><code className="font-bold text-purple-700">:q!</code> : Force quit</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-[11px]">
                  <div><code className="font-bold text-purple-700">Ctrl+O</code> : Write Out (Save)</div>
                  <div><code className="font-bold text-purple-700">Ctrl+X</code> : Exit Nano</div>
                  <div><code className="font-bold text-purple-700">Ctrl+K</code> : Cut line</div>
                  <div><code className="font-bold text-purple-700">Ctrl+U</code> : Uncut / Paste line</div>
                  <div><code className="font-bold text-purple-700">Ctrl+W</code> : Search text</div>
                  <div><code className="font-bold text-purple-700">Ctrl+S</code> : Quick save</div>
                </div>
              )}
            </div>
            <button onClick={() => setShowHelp(false)} className="text-purple-600 hover:text-purple-900 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Text Area Content Buffer - Clean Light Mode White Canvas */}
        <div className="flex-1 p-6 bg-white relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={type === 'vim' && vimMode !== 'INSERT'}
            placeholder={
              type === 'vim' && vimMode === 'NORMAL'
                ? 'Vim Normal Mode: Press "i" to enter Insert mode and edit text, or ":" for command mode.'
                : 'Type file text content here...'
            }
            className="w-full h-full bg-white text-slate-900 text-sm font-mono leading-relaxed focus:outline-none resize-none placeholder:text-slate-400"
          />
        </div>

        {/* Interactive Nano Input Prompt Bar */}
        {type === 'nano' && nanoPrompt === 'SEARCH' && (
          <div className="px-6 py-2 bg-purple-100 border-t border-purple-200 text-purple-950 text-xs flex items-center gap-3">
            <Search size={14} className="text-purple-700" />
            <span className="font-bold">Search (Where Is):</span>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type search query and press Enter..."
              className="flex-1 bg-white border border-purple-300 rounded px-2 py-0.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
            />
          </div>
        )}

        {/* Editor Bottom Status Bar & Shortcuts Panel */}
        <div className="bg-slate-900 text-white text-xs flex flex-col border-t border-slate-800">
          {type === 'vim' ? (
            <div className="px-6 py-3 flex items-center justify-between">
              {vimMode === 'COMMAND' ? (
                <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 flex-1">
                  <input
                    ref={commandInputRef}
                    autoFocus
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder=":wq to save & exit, :q to quit, :q! to force exit"
                    className="bg-transparent text-amber-300 text-xs font-mono focus:outline-none w-full"
                  />
                </form>
              ) : (
                <div className="flex items-center justify-between w-full text-xs font-sans text-slate-300">
                  <span className="font-mono text-amber-300 font-medium">
                    {statusMessage || (vimMode === 'NORMAL' ? 'Press "i" for Insert mode, ":" for commands, "ZZ" to save & exit' : '-- INSERT MODE --')}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">Press Esc for Normal Mode</span>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-3 flex flex-col gap-2 font-mono">
              <div className="flex items-center justify-between text-amber-300 text-xs border-b border-slate-800 pb-2">
                <span>{statusMessage || `[ GNU nano 6.2 — ${filePath} ]`}</span>
                <span className="text-slate-400 text-[11px] font-sans">Practice real terminal Nano shortcuts</span>
              </div>
              
              {/* Authentic GNU Nano Shortcut Footer Legend */}
              <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-300 pt-0.5">
                <button
                  onClick={() => setShowHelp(true)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^G</span> Get Help
                </button>
                <button
                  onClick={() => {
                    setNanoPrompt('WRITE_CONFIRM');
                    setStatusMessage(`File Name to Write: ${filePath}`);
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^O</span> WriteOut
                </button>
                <button
                  onClick={() => {
                    setNanoPrompt('SEARCH');
                    setStatusMessage('Search:');
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^W</span> Where Is
                </button>
                <button
                  onClick={() => {
                    const lines = content.split('\n');
                    const lastLine = lines.pop() || '';
                    setCutBuffer(lastLine);
                    handleContentChange(lines.join('\n'));
                    setStatusMessage('[ Cut 1 line ]');
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^K</span> Cut Text
                </button>
                <button
                  onClick={() => {
                    if (content !== initialContent) {
                      setNanoPrompt('EXIT_CONFIRM');
                      setStatusMessage('Save modified buffer? (Answering "N" will DISCARD changes.) [Y/N]');
                    } else {
                      onCancel();
                    }
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^X</span> Exit
                </button>
                <button
                  onClick={() => onSaveAndExit(content)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^S</span> Save
                </button>
                <button
                  onClick={() => {
                    if (cutBuffer) {
                      const newText = content ? `${content}\n${cutBuffer}` : cutBuffer;
                      handleContentChange(newText);
                      setStatusMessage('[ Uncut 1 line ]');
                    } else {
                      setStatusMessage('[ Cutbuffer is empty ]');
                    }
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^U</span> Uncut Text
                </button>
                <button
                  onClick={() => {
                    const lines = content.split('\n').length;
                    const chars = content.length;
                    setStatusMessage(`[ line ${lines}/${lines} (100%), col 1/${chars} char, char ${chars}/${chars} ]`);
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span className="bg-slate-800 text-emerald-400 font-bold px-1 rounded">^C</span> Location
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

