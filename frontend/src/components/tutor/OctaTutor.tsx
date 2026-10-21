import React, { useEffect, useState, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import {
  BrainCircuit,
  Check,
  Copy,
  Mic,
  Maximize2,
  MoreHorizontal,
  MessageSquare,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Workflow,
  X,
} from 'lucide-react';
import { useOctaTutor } from '../../hooks/useOctaTutor';
import { useTutorContext } from '../../contexts/TutorContext';
import { useAuthPrompt } from '../../contexts/AuthPromptContext';
import { Octa } from '../mascot';
import { OctaTutorSettingsModal } from './OctaTutorSettingsModal';
import { OctaLearningProfile } from './OctaLearningProfile';
import './OctaTutor.css';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import { submitTutorFeedback, type OctaTutorFunctionCall } from '../../api/octaTutorApi';

function describeAction(call: OctaTutorFunctionCall, currentPageLabel: string): string {
  switch (call.name) {
    case 'navigate_to_page': {
      const labels: Record<string, string> = {
        dashboard: 'Open the learning dashboard',
        dsa: 'Open the DSA hub',
        os: 'Open the OS hub',
        commands: 'Open Linux command lessons',
        filesystem: 'Open the file-system simulator',
      };
      return labels[call.args.page_id] || 'Open a STEM Studio page';
    }
    case 'navigate_to_algorithm': {
      const category = CATEGORY_TOPICS.find((item) => item.categoryId === call.args.category_id);
      const topic = category?.topics.find((item) => item.id === call.args.topic_id);
      return `Open ${topic?.name || category?.categoryName || call.args.category_id}`;
    }
    case 'control_playback':
      return ({ play: 'Start the visualization', pause: 'Pause the visualization', step_forward: 'Move forward one step', reset: 'Reset the visualization' } as Record<string, string>)[call.args.action] || 'Control the visualization';
    case 'run_visualization': return 'Run the active algorithm with its current input';
    case 'set_speed': return `Set playback speed to ${call.args.speed}×`;
    case 'set_input': return `Load input [${(call.args.values || []).join(', ')}]`;
    case 'switch_theme': return `Switch the app to ${call.args.mode} mode`;
    case 'toggle_debugger': return `${call.args.visible ? 'Show' : 'Hide'} ${currentPageLabel === 'Linux File System Simulator' ? 'the terminal panel' : 'the code panel'}`;
    case 'toggle_fullscreen': return `${call.args.enter ? 'Enter' : 'Exit'} fullscreen`;
    case 'generate_quiz': return 'Open the current topic quiz';
    case 'execute_vfs_command': return `Run in the virtual file system: ${call.args.command}`;
    default: return 'Perform an in-app action';
  }
}

/**
 * Format & render rich markdown (bold, italic, code blocks, lists, headers)
 */
function parseInlineFormatting(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|\$[^$\n]+\$|\*.*?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="tutor-markdown-strong">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="tutor-markdown-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return <span key={i} className="tutor-math-inline" role="math" aria-label={`Math notation ${part.slice(1, -1)}`}>{part.slice(1, -1)}</span>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="tutor-markdown-emphasis">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function renderTextBlocks(text: string) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
      const headers = tableCells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="tutor-table-wrap">
          <table className="tutor-markdown-table">
            <thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}>{parseInlineFormatting(cell)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}>{parseInlineFormatting(row[cellIndex] || '')}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(<h4 key={`h4-${index}`} className="tutor-markdown-h4">{parseInlineFormatting(trimmed.slice(4))}</h4>);
      index += 1;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(<h3 key={`h3-${index}`} className="tutor-markdown-h3">{parseInlineFormatting(trimmed.slice(3))}</h3>);
      index += 1;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push(<h2 key={`h2-${index}`} className="tutor-markdown-h2">{parseInlineFormatting(trimmed.slice(2))}</h2>);
      index += 1;
      continue;
    }
    if (trimmed.startsWith('$$')) {
      const math: string[] = [];
      const inlineEnd = trimmed.lastIndexOf('$$', trimmed.length - 1);
      if (inlineEnd > 1) {
        math.push(trimmed.slice(2, inlineEnd));
      } else {
        math.push(trimmed.slice(2));
        while (index + 1 < lines.length && lines[index + 1].trim() !== '$$') {
          index += 1;
          math.push(lines[index]);
        }
        if (lines[index + 1]?.trim() === '$$') index += 1;
      }
      blocks.push(<div key={`math-${index}`} className="tutor-math-block" role="math">{math.join('\n')}</div>);
      index += 1;
      continue;
    }
    if (/^(?:•|-|\*)\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^(?:•|-|\*)\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^(?:•|-|\*)\s+/, ''));
        index += 1;
      }
      blocks.push(<ul key={`ul-${index}`} className="tutor-markdown-list">{items.map((item, itemIndex) => <li key={itemIndex}>{parseInlineFormatting(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ''));
        index += 1;
      }
      blocks.push(<ol key={`ol-${index}`} className="tutor-markdown-list">{items.map((item, itemIndex) => <li key={itemIndex}>{parseInlineFormatting(item)}</li>)}</ol>);
      continue;
    }
    blocks.push(<p key={`p-${index}`} className="tutor-markdown-paragraph">{parseInlineFormatting(line)}</p>);
    index += 1;
  }
  return blocks;
}

function highlightCode(code: string): React.ReactNode[] {
  const tokenPattern = /(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:auto|bool|break|case|catch|class|const|continue|def|else|elif|enum|false|for|from|function|if|import|in|int|let|new|null|nullptr|object|private|public|return|self|static|string|struct|switch|this|throw|true|try|using|var|void|while|async|await|export|extends|implements|interface|package|protected|virtual|template|typename)\b|\b\d+(?:\.\d+)?\b)/g;
  return code.split(tokenPattern).map((token, index) => {
    if (/^(\/\/|#)/.test(token)) return <span key={index} className="tutor-code-comment">{token}</span>;
    if (/^["'`]/.test(token)) return <span key={index} className="tutor-code-string">{token}</span>;
    if (/^\d/.test(token)) return <span key={index} className="tutor-code-number">{token}</span>;
    if (/^(auto|bool|break|case|catch|class|const|continue|def|else|elif|enum|false|for|from|function|if|import|in|int|let|new|null|nullptr|object|private|public|return|self|static|string|struct|switch|this|throw|true|try|using|var|void|while|async|await|export|extends|implements|interface|package|protected|virtual|template|typename)$/.test(token)) {
      return <span key={index} className="tutor-code-keyword">{token}</span>;
    }
    return token;
  });
}

const TutorCodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1600);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 2200);
    }
  };
  return (
    <div className="tutor-code-block">
      <div className="tutor-code-toolbar">
        <span className="tutor-code-language">{language}</span>
        <button type="button" className="tutor-copy-code" onClick={() => void copyCode()} title="Copy code" aria-label="Copy code">
          {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
          <span>{copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}</span>
        </button>
      </div>
      <pre><code>{highlightCode(code)}</code></pre>
    </div>
  );
}

function renderFormattedMessage(text: string) {
  if (!text) return null;

  const codeBlockRegex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push(<div key={`text-${key++}`}>{renderTextBlocks(textBefore)}</div>);
    }

    const lang = match[1] || 'code';
    const codeContent = match[2].trim();

    parts.push(<TutorCodeBlock key={`code-${key++}`} language={lang} code={codeContent} />);

    lastIndex = match.index + match[0].length;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    parts.push(<div key={`text-${key++}`}>{renderTextBlocks(remainingText)}</div>);
  }

  return parts;
}

export const OctaTutor: React.FC = () => {
  const { isTutorOpen, toggleTutor } = useTutorContext();
  const { requireAuth } = useAuthPrompt();
  const {
    messages,
    inputText,
    setInputText,
    isLoading,
    isListening,
    speechLang,
    setSpeechLang,
    isSpeechSupported,
    mascotExpression,
    sendMessage,
    stopGeneration,
    resendAssistantMessage,
    startListening,
    stopListening,
    clearHistory,
    llmConfig,
    providerStatus,
    isSettingsOpen,
    setIsSettingsOpen,
    saveLLMConfig,
    resetLLMConfig,
    approveActions,
    dismissActions,
    tutorMode,
    setTutorMode,
    suggestions,
    currentPageLabel,
    currentStepIndex,
    totalSteps,
    hasVisualizerContext,
  } = useOctaTutor();

  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [learningProfileOpen, setLearningProfileOpen] = useState(false);
  const [feedbackOpenFor, setFeedbackOpenFor] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, string>>({});
  const [revealedMessage, setRevealedMessage] = useState<{ id: string; count: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const messageListRef = React.useRef<HTMLDivElement>(null);
  const followMessagesRef = React.useRef(true);
  const previousOpenRef = React.useRef(false);
  const previousMessageCountRef = React.useRef(messages.length);
  const providerStatusCopy: Record<typeof providerStatus, string> = {
    checking: 'Checking the AI service.',
    connected: 'AI service is ready.',
    limit: 'The AI provider has reached its current usage limit.',
    missing: 'No AI provider is connected. Built-in lesson explanations may still be available.',
    unavailable: 'The AI service is temporarily unavailable. You can retry or use built-in lesson notes.',
  };

  // Follow new content only when the learner was already at the end of the chat.
  useEffect(() => {
    const list = messageListRef.current;
    const justOpened = isTutorOpen && !previousOpenRef.current;
    if (list && justOpened) {
      followMessagesRef.current = true;
      requestAnimationFrame(() => list.scrollTo({ top: list.scrollHeight, behavior: 'auto' }));
    } else if (list && messages.length > previousMessageCountRef.current && followMessagesRef.current) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
    previousOpenRef.current = isTutorOpen;
    previousMessageCountRef.current = messages.length;
  }, [isTutorOpen, messages.length]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [inputText]);

  useEffect(() => {
    if (!isTutorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (actionsMenuOpen) setActionsMenuOpen(false);
        else if (learningProfileOpen || isSettingsOpen) return;
        else toggleTutor();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTutorOpen, actionsMenuOpen, learningProfileOpen, isSettingsOpen, toggleTutor]);

  const latestRevealingMessage = [...messages].reverse().find((message) => message.role === 'assistant' && message.isRevealing);
  useEffect(() => {
    if (!latestRevealingMessage) {
      setRevealedMessage(null);
      return;
    }
    const characters = Array.from(latestRevealingMessage.content);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || characters.length === 0) {
      setRevealedMessage({ id: latestRevealingMessage.id, count: characters.length });
      return;
    }

    let count = 0;
    const chunkSize = Math.max(3, Math.ceil(characters.length / 160));
    setRevealedMessage({ id: latestRevealingMessage.id, count: 0 });
    const timer = window.setInterval(() => {
      count = Math.min(characters.length, count + chunkSize);
      setRevealedMessage({ id: latestRevealingMessage.id, count });
      const list = messageListRef.current;
      if (list && followMessagesRef.current) list.scrollTop = list.scrollHeight;
      if (count >= characters.length) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [latestRevealingMessage?.id, latestRevealingMessage?.content]);

  const handleInputSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputText.trim() && !isLoading) {
        followMessagesRef.current = true;
        sendMessage();
      }
    },
    [inputText, isLoading, sendMessage]
  );

  const handleFeedback = useCallback(async (messageId: string, helpful: boolean, responseStyle?: 'simpler' | 'stepwise' | 'examples') => {
    setFeedbackState((current) => ({ ...current, [messageId]: 'saving' }));
    try {
      await submitTutorFeedback({
        helpful,
        ...(responseStyle ? { response_style: responseStyle } : {}),
      });
      setFeedbackState((current) => ({ ...current, [messageId]: helpful ? 'helpful' : responseStyle || 'noted' }));
      setFeedbackOpenFor(null);
    } catch {
      setFeedbackState((current) => ({ ...current, [messageId]: 'failed' }));
    }
  }, []);

  const closeMenu = () => setActionsMenuOpen(false);
  const copyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      window.setTimeout(() => setCopiedMessageId((current) => current === messageId ? null : current), 1600);
    } catch {
      setCopiedMessageId(null);
    }
  }, []);
  const hasWelcomeOnly = messages.length === 1 && messages[0].id.startsWith('welcome');
  const hasServiceIssue = providerStatus === 'missing' || providerStatus === 'limit' || providerStatus === 'unavailable';

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait" initial={false}>
      {isTutorOpen ? <m.div
        key="octa-tutor-panel"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 16 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`octa-tutor-window${isExpanded ? ' is-expanded' : ''}${isMinimized ? ' is-minimized' : ''}`}
        role="region"
        aria-label="Octa AI Tutor"
      >
        <div className="tutor-header">
          <div className="tutor-header-left">
            <div className="tutor-avatar-glow">
              <Octa expression={mascotExpression} size={28} interactive={false} />
            </div>
            <div className="tutor-header-title">
              <span className="tutor-header-name">Octa</span>
              <span className="tutor-header-subtitle">
                AI learning tutor
                {providerStatus === 'connected' && <span className="tutor-status tutor-status-connected" title={providerStatusCopy[providerStatus]} aria-label={providerStatusCopy[providerStatus]}><i className="tutor-status-dot" aria-hidden="true" /><span>Ready</span></span>}
              </span>
            </div>
          </div>

          <div className="tutor-header-actions">
            <div className="tutor-menu-anchor">
              <button type="button" className="tutor-icon-btn" onClick={() => setActionsMenuOpen((open) => !open)} title="More tutor options" aria-label="More tutor options" aria-expanded={actionsMenuOpen}>
                <MoreHorizontal size={19} aria-hidden="true" />
              </button>
              {actionsMenuOpen && <div className="tutor-actions-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { closeMenu(); setLearningProfileOpen(true); }}><UserRound size={16} /> Learning profile</button>
                <button type="button" role="menuitem" onClick={() => { closeMenu(); setIsSettingsOpen(true); }}><Settings size={16} /> AI model settings</button>
                <button type="button" role="menuitem" onClick={() => { closeMenu(); clearHistory(); }}><Trash2 size={16} /> New conversation</button>
              </div>}
            </div>
            {!isMinimized && <button type="button" className="tutor-icon-btn" onClick={() => setIsExpanded((value) => !value)} title={isExpanded ? 'Restore panel size' : 'Expand tutor'} aria-label={isExpanded ? 'Restore panel size' : 'Expand tutor'} aria-pressed={isExpanded}>
              {isExpanded ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}
            </button>}
            {!isMinimized && <button type="button" className="tutor-icon-btn" onClick={() => setIsMinimized(true)} title="Minimize tutor" aria-label="Minimize tutor"><Minimize2 size={18} aria-hidden="true" /></button>}
            <button type="button" className="tutor-icon-btn" onClick={toggleTutor} title="Close tutor" aria-label="Close tutor"><X size={18} aria-hidden="true" /></button>
          </div>
        </div>

        {isMinimized ? (
          <div className="tutor-minimized-body">
            <span>Conversation saved while Octa is minimized.</span>
            <button type="button" className="tutor-restore-btn" onClick={() => setIsMinimized(false)}>Return to chat</button>
          </div>
        ) : <>

        <div className="tutor-context-ribbon">
          <span className="context-chip"><MessageSquare size={14} aria-hidden="true" />{currentPageLabel}</span>
          {totalSteps > 0 && <span className="step-chip">Step {currentStepIndex + 1} of {totalSteps}</span>}
        </div>

        <div className="tutor-mode-row">
          <div className="tutor-mode-bar" role="group" aria-label="Tutor response mode">
            <button type="button" className={`tutor-mode-btn ${tutorMode === 'natural' ? 'active' : ''}`} onClick={() => setTutorMode('natural')} aria-pressed={tutorMode === 'natural'} title="Explain concepts and answer open questions">
              <BrainCircuit size={15} aria-hidden="true" /> Concept
            </button>
            {hasVisualizerContext && <button type="button" className={`tutor-mode-btn ${tutorMode === 'interactive' ? 'active' : ''}`} onClick={() => setTutorMode('interactive')} aria-pressed={tutorMode === 'interactive'} title="Use the live visualizer state to explain each step">
              <Workflow size={15} aria-hidden="true" /> Step-by-step
            </button>}
          </div>
          <p className="tutor-mode-hint" aria-live="polite">{tutorMode === 'natural' ? 'Ask about concepts, code, or STEM Studio.' : totalSteps > 0 ? `Using the live state at step ${currentStepIndex + 1}.` : 'Open a visualizer to explain its active step.'}</p>
          {hasVisualizerContext && totalSteps > 0 && <button type="button" className="tutor-explain-step" disabled={isLoading} onClick={() => { followMessagesRef.current = true; setTutorMode('interactive'); void sendMessage(`Explain the current step, step ${currentStepIndex + 1}, using the active visualization state.`, 'interactive'); }} title="Explain the current visualizer step">
            <Sparkles size={14} aria-hidden="true" /> Explain current step
          </button>}
        </div>

        <div className={`tutor-message-list${hasWelcomeOnly ? ' is-empty' : ''}`} ref={messageListRef} onScroll={(event) => {
          const list = event.currentTarget;
          followMessagesRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
        }}>
          {hasServiceIssue && <div className={`tutor-service-note tutor-service-${providerStatus}`} role="status">
            <div><strong>{providerStatus === 'missing' ? 'Connect an AI model' : providerStatus === 'limit' ? 'AI provider limit reached' : 'AI service is unavailable'}</strong><p>{providerStatusCopy[providerStatus]}</p></div>
            <button type="button" onClick={() => setIsSettingsOpen(true)}>{providerStatus === 'missing' ? 'Open settings' : 'Check settings'}</button>
          </div>}

          {hasWelcomeOnly && <section className="tutor-welcome" aria-label="Welcome to Octa">
            <div className="tutor-welcome-avatar"><Octa expression="happy" size={38} interactive={false} /></div>
            <h2>What are you learning today?</h2>
            <p>Ask Octa to explain a concept, reason through code, or walk through the active visualization.</p>
            {suggestions.length > 0 && <div className="tutor-suggestions" aria-label="Suggested questions">
              {suggestions.slice(0, 4).map((suggestion) => <button type="button" key={suggestion.label} className="tutor-suggestion-pill" disabled={isLoading} onClick={() => { followMessagesRef.current = true; void sendMessage(suggestion.text); }}>{suggestion.label}<span aria-hidden="true">↗</span></button>)}
            </div>}
          </section>}

          {messages.filter((message) => !(hasWelcomeOnly && message.id.startsWith('welcome'))).map((msg, messageIndex, visibleMessages) => {
            const isAssis = msg.role === 'assistant';
            const isTyping = isAssis && msg.id === revealedMessage?.id && revealedMessage.count < Array.from(msg.content).length;
            const visibleContent = isAssis && msg.id === revealedMessage?.id ? Array.from(msg.content).slice(0, revealedMessage.count).join('') : msg.content;
            const previousUser = isAssis ? [...visibleMessages.slice(0, messageIndex)].reverse().find((message) => message.role === 'user') : undefined;
            return (
              <div key={msg.id} className={`tutor-message-bubble ${msg.role}${msg.requestFailed ? ' is-failed' : ''}`}>
                <div className="tutor-message-content">{renderFormattedMessage(visibleContent)}{isTyping && <span className="tutor-typing-caret" aria-hidden="true" />}</div>
                {isAssis && msg.answerSource === 'offline' && <div className="tutor-offline-note"><span>Built-in lesson answer</span><button type="button" onClick={() => setIsSettingsOpen(true)}>Connect AI model</button></div>}
                {isAssis && msg.answerSource === 'grounded' && <div className="tutor-grounded-note" role="note">Based on the supplied visualization state</div>}
                {isAssis && msg.proposedActions?.length ? <div className="tutor-action-card" role="group" aria-label="Octa action approval">
                  <div className="tutor-action-card__copy"><strong>{msg.actionDecision === 'pending' ? 'Octa is ready to' : msg.actionDecision === 'allowed' ? 'Approved' : 'Cancelled'}</strong><ul>{msg.proposedActions.map((action, index) => <li key={`${action.name}-${index}`}>{describeAction(action, currentPageLabel)}</li>)}</ul></div>
                  {msg.actionDecision === 'pending' ? <div className="tutor-action-card__buttons"><button type="button" className="tutor-action-allow" onClick={() => approveActions(msg.id)}><Check size={14} /> Allow</button><button type="button" className="tutor-action-cancel" onClick={() => dismissActions(msg.id)}>Cancel</button></div> : <p className="tutor-action-result" role="status">{msg.actionDecision === 'allowed' ? 'Action approved and sent to this page.' : 'No action was run.'}</p>}
                </div> : null}
                <div className="tutor-message-tools" role="group" aria-label={`${isAssis ? 'Octa' : 'Your'} message actions`}>
                  <button type="button" onClick={() => void copyMessage(msg.id, msg.content)} title="Copy message" aria-label="Copy message">{copiedMessageId === msg.id ? <Check size={14} /> : <Copy size={14} />}<span>{copiedMessageId === msg.id ? 'Copied' : 'Copy'}</span></button>
                  {!isAssis && <button type="button" onClick={() => { setInputText(msg.content); composerRef.current?.focus(); }} title="Edit this message in the composer" aria-label="Edit message"><span>Edit</span></button>}
                  {isAssis && msg.requestFailed && <button type="button" onClick={() => resendAssistantMessage(msg.id)} disabled={isLoading} title="Retry this question" aria-label="Retry this question"><RotateCcw size={14} /><span>Retry</span></button>}
                  {isAssis && !msg.requestFailed && previousUser && !msg.proposedActions?.length && <button type="button" onClick={() => resendAssistantMessage(msg.id)} disabled={isLoading} title="Generate another answer to the previous question" aria-label="Regenerate answer"><RefreshCw size={14} /><span>Regenerate</span></button>}
                  {isAssis && !msg.requestFailed && !msg.proposedActions?.length && msg.answerSource !== 'grounded' && <>
                    {feedbackState[msg.id] && feedbackState[msg.id] !== 'failed' && feedbackState[msg.id] !== 'saving' ? <span className="tutor-feedback-confirmation" role="status">{feedbackState[msg.id] === 'helpful' ? 'Thanks for the feedback.' : 'Preference saved.'}</span> : <>
                      <button type="button" title="Helpful answer" aria-label="Helpful answer" disabled={feedbackState[msg.id] === 'saving'} onClick={() => void handleFeedback(msg.id, true)}><ThumbsUp size={14} /></button>
                      <button type="button" title="Needs a different explanation" aria-label="Needs a different explanation" disabled={feedbackState[msg.id] === 'saving'} onClick={() => setFeedbackOpenFor((id) => id === msg.id ? null : msg.id)}><ThumbsDown size={14} /></button>
                    </>}
                    {feedbackState[msg.id] === 'failed' && <span role="alert">Feedback could not be saved.</span>}
                  </>}
                </div>
                {isAssis && feedbackOpenFor === msg.id && <div className="tutor-feedback-options" role="group" aria-label="Choose a clearer response style"><span>What would help next time?</span><button type="button" onClick={() => void handleFeedback(msg.id, false, 'simpler')}>Simpler</button><button type="button" onClick={() => void handleFeedback(msg.id, false, 'stepwise')}>More steps</button><button type="button" onClick={() => void handleFeedback(msg.id, false, 'examples')}>More examples</button></div>}
              </div>
            );
          })}

          {isLoading && <div className="tutor-thinking" role="status" aria-live="polite"><span className="tutor-thinking-dots" aria-hidden="true"><i /><i /><i /></span><span>Octa is working through your question</span></div>}
        </div>

        <div className="tutor-input-container">
          <form className="tutor-input-form" onSubmit={handleInputSubmit}>
            <label className="sr-only" htmlFor="octa-tutor-message">Message Octa</label>
            <textarea
              ref={composerRef}
              id="octa-tutor-message"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (inputText.trim() && !isLoading) { followMessagesRef.current = true; sendMessage(); } } }}
              placeholder={tutorMode === 'interactive' ? 'Ask about this step…' : 'Ask Octa a question…'}
              rows={1}
              maxLength={5000}
              aria-describedby="octa-tutor-keyboard-hint"
            />
            <div className="tutor-input-footer">
              <div className="tutor-input-hint" id="octa-tutor-keyboard-hint">
                {isListening ? (
                  <select aria-label="Voice input language" value={speechLang} onChange={(event) => setSpeechLang(event.target.value as typeof speechLang)}>
                    <option value="en-US">English</option><option value="ur-PK">Urdu</option><option value="zh-CN">Chinese</option>
                  </select>
                ) : <span>Enter to send · Shift + Enter for a new line</span>}
              </div>
              <div className="tutor-input-actions">
                {isSpeechSupported && <button type="button" className={`tutor-input-icon-btn ${isListening ? 'listening' : ''}`} onClick={isListening ? stopListening : startListening} aria-label={isListening ? 'Stop voice input' : 'Start voice input'} title={isListening ? 'Stop voice input' : 'Voice input'} disabled={isLoading}><Mic size={17} /></button>}
                {isLoading
                  ? <button type="button" className="tutor-stop-btn" onClick={stopGeneration} aria-label="Stop generating" title="Stop generating"><Square size={14} fill="currentColor" /> <span>Stop</span></button>
                  : <button type="submit" className="tutor-send-btn" disabled={!inputText.trim()} aria-label="Send message" title="Send message"><Send size={16} /><span>Send</span></button>}
              </div>
            </div>
          </form>
        </div>
        </>}
      </m.div> : <m.button
        key="octa-tutor-fab"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="octa-tutor-fab"
        onClick={() => requireAuth(() => { setIsMinimized(false); toggleTutor(); }, 'Sign in to chat with Octa AI Tutor and keep your learning context.')}
        title="Open Octa AI Tutor"
        aria-label="Open Octa AI Tutor"
      >
        <div className="fab-octa-glow">
          <Octa expression="happy" size={26} interactive={false} />
        </div>
        <span className="fab-text">Octa AI</span>
        <span className={`octa-tutor-fab-dot tutor-status-${providerStatus}`} title={providerStatusCopy[providerStatus]} aria-label={providerStatusCopy[providerStatus]} />
      </m.button>}
      </AnimatePresence>
      {learningProfileOpen && <OctaLearningProfile onClose={() => setLearningProfileOpen(false)} />}
      <OctaTutorSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={llmConfig}
        onSaveConfig={saveLLMConfig}
        onResetDefault={resetLLMConfig}
      />
    </LazyMotion>
  );
};

export default OctaTutor;
