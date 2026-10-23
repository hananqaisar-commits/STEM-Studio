import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  'apt', 'apt-get', 'tree', 'echo', 'head', 'tail', 'wc', 'sed', 'awk', 'diff', 'curl', 'ping', 'ssh',
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
    focusInput();
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
      <div ref={outputRef} className="linux-terminal__output" aria-live="polite" aria-relevant="additions text">
        {history.map((item, index) => (
          <div key={`${item.command}-${index}`} className="linux-terminal__record">
            <div className="linux-terminal__prompt linux-terminal__prompt--history">
              <span>{item.prompt || `${snapshot.currentUser}@stem-studio:${displayPath}$`}</span>
              <b>{item.command}</b>
            </div>
            {item.output && <pre className={`linux-terminal__output-line${item.isError ? ' is-error' : ''}`}>{item.output}</pre>}
          </div>
        ))}
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
            aria-label="Linux terminal command"
            aria-keyshortcuts="Control+L ArrowUp ArrowDown Tab Enter"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
        {completionHint && <div className="linux-terminal__completion" role="status">{completionHint}</div>}
      </div>
    </section>
  );
};
