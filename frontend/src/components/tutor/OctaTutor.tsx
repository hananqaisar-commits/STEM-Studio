import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import { Settings, X, Trash2, Volume2, Sparkles, Bot, User as UserIcon, MessageSquare } from 'lucide-react';
import { useOctaTutor, type SupportedSpeechLang } from '../../hooks/useOctaTutor';
import { useTutorContext } from '../../contexts/TutorContext';
import { Octa } from '../mascot';
import { LoaderOne } from '../ui/loader';
import { PlaceholdersAndVanishInput } from '../ui/placeholders-and-vanish-input';
import './OctaTutor.css';

/**
 * Format & render rich markdown (bold, italic, code blocks, lists, headers)
 */
function parseInlineFormatting(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-purple-200 dark:text-purple-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-purple-950/60 text-purple-300 dark:bg-purple-900/50 dark:text-purple-200 font-mono text-[0.85em] px-1.5 py-0.5 rounded border border-purple-700/40">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-purple-300/90">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderTextBlocks(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} className="h-1.5" />;
    }

    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={idx} className="text-xs font-bold uppercase tracking-wider text-purple-300 dark:text-purple-200 mt-2 mb-1">
          {parseInlineFormatting(trimmed.slice(4))}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={idx} className="text-sm font-bold text-purple-300 dark:text-purple-200 mt-2.5 mb-1">
          {parseInlineFormatting(trimmed.slice(3))}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={idx} className="text-base font-bold text-purple-300 dark:text-purple-200 mt-3 mb-1.5">
          {parseInlineFormatting(trimmed.slice(2))}
        </h2>
      );
    }

    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      return (
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="text-purple-400 font-bold select-none">•</span>
          <span className="flex-1">{parseInlineFormatting(content)}</span>
        </div>
      );
    }

    return (
      <p key={idx} className="my-0.5 leading-relaxed">
        {parseInlineFormatting(line)}
      </p>
    );
  });
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

    parts.push(
      <div key={`code-${key++}`} className="my-2.5 rounded-md bg-slate-950 text-emerald-400 p-3 font-mono text-xs overflow-x-auto border border-purple-900/50 shadow-inner">
        {lang && <div className="text-[10px] uppercase font-bold text-purple-400/80 mb-1 tracking-wider">{lang}</div>}
        <pre className="whitespace-pre wrap-break-words"><code>{codeContent}</code></pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    parts.push(<div key={`text-${key++}`}>{renderTextBlocks(remainingText)}</div>);
  }

  return parts;
}

export const OctaTutor: React.FC = () => {
  const { contextState, isTutorOpen, toggleTutor } = useTutorContext();
  const {
    messages,
    inputText,
    setInputText,
    isLoading,
    isListening,
    speechLang,
    setSpeechLang,
    mascotExpression,
    sendMessage,
    startListening,
    stopListening,
    clearHistory,
    llmConfig,
    setIsSettingsOpen,
    tutorMode,
    setTutorMode,
    suggestions,
  } = useOctaTutor();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [revealedChars, setRevealedChars] = useState<Record<string, number>>({});

  useEffect(() => {
    if (messagesEndRef.current && isTutorOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTutorOpen, isLoading, revealedChars]);

  // Fast character-by-character streaming typewriter effect
  useEffect(() => {
    const latestMsg = messages[messages.length - 1];
    if (latestMsg && latestMsg.role === 'assistant' && latestMsg.isRevealing) {
      const msgId = latestMsg.id;
      const currentLen = revealedChars[msgId] || 0;
      if (currentLen < latestMsg.content.length) {
        const timer = setTimeout(() => {
          setRevealedChars((prev) => ({
            ...prev,
            [msgId]: currentLen + 5,
          }));
        }, 12);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, revealedChars]);

  const handleInputSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputText.trim() && !isLoading) {
        sendMessage();
      }
    },
    [inputText, isLoading, sendMessage]
  );

  if (!isTutorOpen) {
    return (
      <LazyMotion features={domAnimation}>
        <m.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="octa-tutor-fab"
          onClick={toggleTutor}
          title="Open Octa AI Tutor"
          aria-label="Open Octa AI Tutor"
        >
          <div className="fab-octa-glow">
            <Octa expression="happy" size={26} interactive={false} />
          </div>
          <span className="fab-text">Octa AI</span>
          <span className="octa-tutor-fab-dot" />
        </m.button>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="octa-tutor-window"
        role="region"
        aria-label="Octa AI Tutor"
      >
        {/* Premium Header */}
        <div className="tutor-header">
          <div className="tutor-header-left">
            <div className="tutor-avatar-glow">
              <Octa expression={mascotExpression} size={28} interactive={false} />
            </div>
            <div className="tutor-header-title">
              <span className="tutor-header-name">
                Octa AI Tutor <Sparkles size={12} className="inline text-purple-400" />
              </span>
              <span className="tutor-header-model">{llmConfig.modelName || 'Qwen AI Engine'}</span>
            </div>
          </div>

          <div className="tutor-header-actions">
            <button className="tutor-icon-btn" onClick={() => setIsSettingsOpen(true)} title="AI Model Settings">
              <Settings size={14} />
            </button>
            <button className="tutor-icon-btn" onClick={clearHistory} title="Clear Chat History">
              <Trash2 size={14} />
            </button>
            <button className="tutor-icon-btn tutor-close-btn" onClick={toggleTutor} title="Close Tutor">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Context & State Ribbon */}
        <div className="tutor-context-ribbon">
          <span className="context-chip">
            <MessageSquare size={11} className="inline mr-1" />
            {contextState.algorithmName || 'General DSA Curriculum'}
          </span>
          {contextState.totalSteps ? (
            <span className="step-chip">
              Step {contextState.currentStepIndex + 1} / {contextState.totalSteps}
            </span>
          ) : null}
        </div>

        {/* Mode Switcher Bar */}
        <div className="tutor-mode-bar">
          <button
            className={`tutor-mode-btn ${tutorMode === 'natural' ? 'active' : ''}`}
            onClick={() => setTutorMode('natural')}
            title="ChatGPT-style algorithm teaching & conceptual explanations"
          >
            AI Concept Mode
          </button>
          <button
            className={`tutor-mode-btn ${tutorMode === 'interactive' ? 'active' : ''}`}
            onClick={() => setTutorMode('interactive')}
            title="Live step visualizer execution & state debugging"
          >
            Interactive Step Mode
          </button>
        </div>

        {/* Message Output Scroll Box */}
        <div className="tutor-message-list">
          {messages.map((msg) => {
            const isAssis = msg.role === 'assistant';
            const maxChar = revealedChars[msg.id];
            const rawContent = isAssis && msg.isRevealing && maxChar !== undefined
              ? msg.content.slice(0, maxChar)
              : msg.content;

            return (
              <div key={msg.id} className={`tutor-message-bubble ${msg.role}`}>
                <div className="message-icon-avatar">
                  {isAssis ? (
                    <Octa expression="neutral" size={20} interactive={false} />
                  ) : (
                    <UserIcon size={14} />
                  )}
                </div>
                <div className="tutor-message-content">
                  {renderFormattedMessage(rawContent)}
                  {isAssis && msg.isRevealing && (revealedChars[msg.id] || 0) < msg.content.length && (
                    <span className="inline-block w-1.5 h-3.5 bg-purple-500 ml-0.5 animate-pulse rounded-full" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Premium LoaderOne Animation when Thinking */}
          {isLoading && (
            <div className="tutor-message-bubble assistant loading-bubble">
              <div className="message-icon-avatar">
                <Octa expression="thinking" size={20} interactive={false} />
              </div>
              <div className="tutor-loader-stage flex items-center gap-3 py-1 px-3">
                <LoaderOne size="sm" />
                <span className="text-xs font-semibold text-purple-400 dark:text-purple-300 animate-pulse">
                  Octa is thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Context Suggestions */}
        {suggestions.length > 0 && (
          <div className="tutor-suggestions">
            {suggestions.map((s, idx) => (
              <button key={idx} className="tutor-suggestion-pill" onClick={() => sendMessage(s.text)}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Field Section with Placeholders & Vanish Input + Voice Microphone */}
        <div className="tutor-input-container">
          <PlaceholdersAndVanishInput
            value={inputText}
            setValue={setInputText}
            onSubmit={(e) => {
              e.preventDefault();
              handleInputSubmit(e);
            }}
            disabled={isLoading}
            isListening={isListening}
            onToggleListening={isListening ? stopListening : startListening}
            speechLang={speechLang}
            onSelectLang={setSpeechLang}
            placeholders={[
              "Ask me anything...",
            ]}
          />
        </div>
      </m.div>
    </LazyMotion>
  );
};

export default OctaTutor;
