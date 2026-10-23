import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Terminal as TerminalIcon, Trash2, Command, ShieldCheck, Keyboard, CircleHelp } from 'lucide-react';
import { type VFSSnapshot, getAbsolutePath, resolveNodeId } from './vfs';

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
  'nano', 'vim', 'bash', 'sh', 'sudo', 'stat', 'umask', 'useradd', 'userdel', 'groupadd', 'usermod', 'chmod',
  'chown', 'chgrp', 'export', 'whoami', 'id', 'grep', 'find', 'uname',
  'clear', 'ps', 'top', 'htop', 'jobs', 'nice', 'renice', 'kill', 'help',
];

const QUICK_COMMANDS = [
  { command: 'pwd', label: 'Show current directory' },
  { command: 'ls -lah', label: 'List files, including hidden' },
  { command: 'ls -l ~/permission-demo.sh', label: 'Read owner, group, and mode bits' },
  { command: './permission-demo.sh', label: 'Observe execute permission in action' },
  { command: 'ps -ef', label: 'Inspect simulated processes' },
  { command: 'nice -n 5 sleep 30', label: 'Start a low-priority demo process' },
];

export const VFSTerminal: React.FC<VFSTerminalProps> = ({
  snapshot,
  history,
  onExecuteCommand,
  onClearTerminal,
}) => {
  const [lineText, setLineText] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [completionHint, setCompletionHint] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const currentPath = getAbsolutePath(snapshot.nodes, snapshot.currentDirId);
  const displayPath = currentPath.startsWith('/home/octa')
    ? currentPath.replace('/home/octa', '~')
    : currentPath;

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [history.length]);

  const clearTerminal = () => {
    setLineText('');
    setHistoryIdx(-1);
    setCompletionHint('');
    onClearTerminal();
  };

  const getPathCompletions = (targetPath: string) => {
    const slashIndex = targetPath.lastIndexOf('/');
    const hasParentPath = slashIndex >= 0;
    const parentPath = hasParentPath ? (targetPath.slice(0, slashIndex) || '/') : '';
    const filterPrefix = hasParentPath ? targetPath.slice(slashIndex + 1) : targetPath;
    const targetDirId = hasParentPath
      ? resolveNodeId(snapshot.nodes, snapshot.currentDirId, parentPath)
      : snapshot.currentDirId;
    if (!targetDirId) return { dirPath: parentPath, matches: [] as string[] };
    const currentDir = snapshot.nodes[targetDirId];
    if (!currentDir?.childrenIds) return { dirPath: parentPath, matches: [] as string[] };
    const childNames = currentDir.childrenIds.map((id) => {
      const node = snapshot.nodes[id];
      if (!node) return null;
      return node.type === 'directory' || node.type === 'mount-point' ? `${node.name}/` : node.name;
    }).filter((name): name is string => Boolean(name));
    return {
      dirPath: parentPath,
      matches: childNames.filter((name) => name.toLowerCase().startsWith(filterPrefix.toLowerCase())),
    };
  };

  const handleTabCompletion = () => {
    const trimmed = lineText.trimStart();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      const matches = COMMAND_LIST.filter((command) => command.startsWith(parts[0].toLowerCase()));
      if (matches.length === 1) {
        setLineText(`${matches[0]} `);
        setCompletionHint('');
      } else if (matches.length > 1) {
        setCompletionHint(matches.join('   '));
      }
      return;
    }

    const { dirPath, matches } = getPathCompletions(parts[parts.length - 1]);
    if (matches.length === 1) {
      const completedPath = dirPath
        ? `${dirPath.endsWith('/') ? dirPath : `${dirPath}/`}${matches[0]}`
        : matches[0];
      parts[parts.length - 1] = completedPath;
      setLineText(parts.join(' '));
      setCompletionHint('');
    } else if (matches.length > 1) {
      setCompletionHint(matches.join('   '));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
      event.preventDefault();
      clearTerminal();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      handleTabCompletion();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const command = lineText.trim();
      if (command === 'clear') clearTerminal();
      else if (command) onExecuteCommand(command);
      setLineText('');
      setHistoryIdx(-1);
      setCompletionHint('');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      const nextIndex = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(nextIndex);
      setLineText(history[history.length - 1 - nextIndex]?.command || '');
      setCompletionHint('');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIdx > 0) {
        const nextIndex = historyIdx - 1;
        setHistoryIdx(nextIndex);
        setLineText(history[history.length - 1 - nextIndex]?.command || '');
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setLineText('');
      }
      setCompletionHint('');
    }
  };

  return (
    <section className="linux-terminal" aria-label="Octa virtual Linux terminal" onClick={focusInput}>
      <header className="linux-terminal__header">
        <div className="linux-terminal__brand">
          <span className="linux-terminal__brand-icon"><TerminalIcon size={17} aria-hidden="true" /></span>
          <div className="linux-terminal__identity-copy">
            <strong>Octa Linux Terminal</strong>
            <span>Powered by Octa · virtual Linux environment</span>
          </div>
        </div>
        <div className="linux-terminal__header-actions">
          <span className="linux-terminal__sandbox"><ShieldCheck size={14} aria-hidden="true" /> Sandboxed simulator</span>
          <span className="linux-terminal__path" title={currentPath}>{displayPath}</span>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); clearTerminal(); }}
            className="linux-terminal__clear"
            title="Clear terminal screen (Ctrl+L)"
            aria-label="Clear terminal output"
          >
            <Trash2 size={14} aria-hidden="true" /> <span>Clear</span>
          </button>
        </div>
      </header>

      <div ref={outputRef} className="linux-terminal__output" aria-live="polite" aria-relevant="additions text">
        {!history.length && (
          <div className="linux-terminal__welcome">
            <div className="linux-terminal__welcome-title">
              <span className="linux-terminal__welcome-icon"><Command size={16} aria-hidden="true" /></span>
              <div>
                <strong>Ready when you are.</strong>
                <p>Explore directories, edit virtual files, or inspect simulated processes.</p>
              </div>
            </div>
            <div className="linux-terminal__scope-note">
              Commands change only this learning environment. They never run on your device or a live server.
            </div>
            <div className="linux-terminal__examples" aria-label="Example commands">
              {QUICK_COMMANDS.map(({ command, label }) => (
                <button
                  type="button"
                  key={command}
                  title={label}
                  onClick={(event) => { event.stopPropagation(); onExecuteCommand(command); focusInput(); }}
                >
                  <code>{command}</code><span>{label}</span>
                </button>
              ))}
            </div>
            <button className="linux-terminal__help-link" type="button" onClick={(event) => { event.stopPropagation(); onExecuteCommand('help'); focusInput(); }}>
              <CircleHelp size={14} aria-hidden="true" /> View supported commands
            </button>
          </div>
        )}

        {history.map((item, index) => (
          <div key={`${item.command}-${index}`} className="linux-terminal__record">
            <div className="linux-terminal__prompt linux-terminal__prompt--history">
              <span>{item.prompt || `${snapshot.currentUser}@stem-studio:${displayPath}$`}</span>
              <b>{item.command}</b>
            </div>
            {item.output && <pre className={`linux-terminal__output-line${item.isError ? ' is-error' : ''}`}>{item.output}</pre>}
          </div>
        ))}
      </div>

      <div className="linux-terminal__footer" onClick={(event) => event.stopPropagation()}>
        <div className="linux-terminal__entry">
          <span className="linux-terminal__prompt-user">{snapshot.currentUser}@stem-studio</span>
          <span className="linux-terminal__prompt-separator">:</span>
          <span className="linux-terminal__cwd" title={currentPath}>{displayPath}</span>
          <span className="linux-terminal__prompt-symbol">$</span>
          <input
            ref={inputRef}
            type="text"
            value={lineText}
            onChange={(event) => { setLineText(event.target.value); setCompletionHint(''); }}
            onKeyDown={handleKeyDown}
            className="linux-terminal__input"
            placeholder="Type a command and press Enter"
            aria-label="Linux terminal command"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
        {completionHint && <div className="linux-terminal__completion" role="status">{completionHint}</div>}
        <div className="linux-terminal__footer-meta">
          <span><Keyboard size={13} aria-hidden="true" /> ↑/↓ history <i>·</i> Tab complete <i>·</i> Ctrl+L clear</span>
          <span><span className="linux-terminal__ready-dot" /> Session ready</span>
        </div>
      </div>
    </section>
  );
};
