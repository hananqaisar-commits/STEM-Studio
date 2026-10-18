import React, { useEffect, useState, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import {
  BrainCircuit,
  Check,
  Mic,
  MoreHorizontal,
  MessageSquare,
  Send,
  Settings,
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
    case 'navigate_to_algorithm': {
      const category = CATEGORY_TOPICS.find((item) => item.categoryId === call.args.category_id);
      const topic = category?.topics.find((item) => item.id === call.args.topic_id);
      return `Open ${topic?.name || category?.categoryName || call.args.category_id}`;
    }
    case 'control_playback':
      return ({ play: 'Start the visualization', pause: 'Pause the visualization', step_forward: 'Move forward one step', reset: 'Reset the visualization' } as Record<string, string>)[call.args.action] || 'Control the visualization';
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
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
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
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="tutor-markdown-emphasis">{part.slice(1, -1)}</em>;
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
        <h4 key={idx} className="tutor-markdown-h4">
          {parseInlineFormatting(trimmed.slice(4))}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={idx} className="tutor-markdown-h3">
          {parseInlineFormatting(trimmed.slice(3))}
        </h3>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={idx} className="tutor-markdown-h2">
          {parseInlineFormatting(trimmed.slice(2))}
        </h2>
      );
    }

    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      return (
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="tutor-markdown-bullet">•</span>
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
      <div key={`code-${key++}`} className="tutor-code-block">
        {lang && <div className="tutor-code-language">{lang}</div>}
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
  const messageListRef = React.useRef<HTMLDivElement>(null);
  const providerStatusCopy = {
    checking: 'Checking AI configuration',
    connected: 'AI API configured',
    limit: 'AI provider limit reached',
    missing: 'AI API key not configured',
    unavailable: 'AI provider unavailable',
  }[providerStatus];

  // Keep the conversation scrolled inside its own panel, without moving the page.
  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [isTutorOpen, messages.length, isLoading]);

  const handleInputSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputText.trim() && !isLoading) {
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

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait" initial={false}>
      {isTutorOpen ? <m.div
        key="octa-tutor-panel"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 16 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="octa-tutor-window"
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
                <span className={`tutor-status tutor-status-${providerStatus}`} title={providerStatusCopy} aria-label={providerStatusCopy}>
                  <i className="tutor-status-dot" aria-hidden="true" />
                  <span>{providerStatus === 'connected' ? 'API ready' : providerStatus === 'checking' ? 'Checking' : providerStatus === 'limit' ? 'Limit reached' : providerStatus === 'missing' ? 'API missing' : 'Unavailable'}</span>
                </span>
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
            <button type="button" className="tutor-icon-btn" onClick={toggleTutor} title="Minimize tutor" aria-label="Minimize tutor">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="tutor-context-ribbon">
          <span className="context-chip"><MessageSquare size={14} aria-hidden="true" />{currentPageLabel}</span>
          {totalSteps > 0 && <span className="step-chip">Step {currentStepIndex + 1} of {totalSteps}</span>}
        </div>

        <div className="tutor-mode-bar" role="group" aria-label="Tutor response mode">
          <button
            type="button"
            className={`tutor-mode-btn ${tutorMode === 'natural' ? 'active' : ''}`}
            onClick={() => setTutorMode('natural')}
            aria-pressed={tutorMode === 'natural'}
            title="Ask open questions and learn concepts"
          >
            <BrainCircuit size={16} aria-hidden="true" /> Concept mode
          </button>
          {hasVisualizerContext && (
            <button
              type="button"
              className={`tutor-mode-btn ${tutorMode === 'interactive' ? 'active' : ''}`}
              onClick={() => setTutorMode('interactive')}
              aria-pressed={tutorMode === 'interactive'}
              title="Explain the active visualizer step"
            >
              <Workflow size={16} aria-hidden="true" /> Step mode
            </button>
          )}
        </div>
        <p className="tutor-mode-hint" aria-live="polite">
          {tutorMode === 'natural'
            ? 'Ask about a concept, code, or an issue in STEM Studio.'
            : hasVisualizerContext && totalSteps > 0
              ? `Explaining step ${currentStepIndex + 1} from the live visualizer. Requested controls wait for your approval.`
              : 'Open a visualizer for step-by-step guidance. Requested controls wait for your approval.'}
        </p>

        <div className="tutor-message-list" ref={messageListRef}>
          {messages.map((msg) => {
            const isAssis = msg.role === 'assistant';

            return (
              <div key={msg.id} className={`tutor-message-bubble ${msg.role}`}>
                <div className="tutor-message-content">
                  {renderFormattedMessage(msg.content)}
                </div>
                {isAssis && msg.answerSource === 'offline' && (
                  <div className="tutor-offline-note">
                    <span>Offline guide</span>
                    <button type="button" onClick={() => setIsSettingsOpen(true)}>Connect AI model</button>
                  </div>
                )}
                {isAssis && msg.answerSource === 'grounded' && (
                  <div className="tutor-grounded-note" role="note">
                    Verified from the supplied visualizer state
                  </div>
                )}
                {isAssis && msg.proposedActions?.length ? (
                  <div className="tutor-action-card" role="group" aria-label="Octa action approval">
                    <div className="tutor-action-card__copy">
                      <div>
                        <strong>{msg.actionDecision === 'pending' ? 'Octa is ready to' : msg.actionDecision === 'allowed' ? 'Approved' : 'Cancelled'}</strong>
                        <ul>
                          {msg.proposedActions.map((action, index) => <li key={`${action.name}-${index}`}>{describeAction(action, currentPageLabel)}</li>)}
                        </ul>
                      </div>
                    </div>
                    {msg.actionDecision === 'pending' ? (
                      <div className="tutor-action-card__buttons">
                        <button type="button" className="tutor-action-allow" onClick={() => approveActions(msg.id)}>
                          <Check size={14} /> Allow
                        </button>
                        <button type="button" className="tutor-action-cancel" onClick={() => dismissActions(msg.id)}>Cancel</button>
                      </div>
                    ) : (
                      <p className="tutor-action-result" role="status">
                        {msg.actionDecision === 'allowed' ? 'Action approved and sent to this page.' : 'No action was run.'}
                      </p>
                    )}
                  </div>
                ) : null}
                {isAssis && msg.id !== 'welcome-1' && !msg.proposedActions?.length && msg.answerSource !== 'grounded' && (
                  <div className="tutor-answer-feedback">
                    {feedbackState[msg.id] && feedbackState[msg.id] !== 'failed' && feedbackState[msg.id] !== 'saving' ? (
                      <span role="status">{feedbackState[msg.id] === 'helpful' ? 'Thanks, this helps Octa adapt.' : 'Got it — Octa will adjust future explanations.'}</span>
                    ) : (
                      <>
                        <span>Was this useful?</span>
                        <button type="button" aria-label="This answer was useful" title="Helpful" disabled={feedbackState[msg.id] === 'saving'} onClick={() => void handleFeedback(msg.id, true)}><ThumbsUp size={14} /></button>
                        <button type="button" aria-label="This answer needs a different explanation" title="Needs a different explanation" disabled={feedbackState[msg.id] === 'saving'} onClick={() => setFeedbackOpenFor((id) => id === msg.id ? null : msg.id)}><ThumbsDown size={14} /></button>
                        {feedbackState[msg.id] === 'saving' && <span>Saving…</span>}
                        {feedbackState[msg.id] === 'failed' && <span role="alert">Could not save feedback.</span>}
                      </>
                    )}
                  </div>
                )}
                {isAssis && feedbackOpenFor === msg.id && (
                  <div className="tutor-feedback-options" role="group" aria-label="Choose a clearer response style">
                    <span>What would help next time?</span>
                    <button type="button" onClick={() => void handleFeedback(msg.id, false, 'simpler')}>Simpler</button>
                    <button type="button" onClick={() => void handleFeedback(msg.id, false, 'stepwise')}>More steps</button>
                    <button type="button" onClick={() => void handleFeedback(msg.id, false, 'examples')}>More examples</button>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="tutor-thinking" role="status" aria-live="polite">
              <span className="tutor-thinking-dots" aria-hidden="true"><i /><i /><i /></span>
              <span>Octa is working through your question</span>
              </div>
          )}
        </div>

        {suggestions.length > 0 && messages.length === 1 && (
          <div className="tutor-suggestions">
            {suggestions.slice(0, 2).map((suggestion) => <button type="button" key={suggestion.label} className="tutor-suggestion-pill" onClick={() => sendMessage(suggestion.text)}>{suggestion.label}</button>)}
          </div>
        )}

        <div className="tutor-input-container">
          <form className="tutor-input-form" onSubmit={handleInputSubmit}>
            <label className="sr-only" htmlFor="octa-tutor-message">Message Octa</label>
            <textarea
              id="octa-tutor-message"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (inputText.trim() && !isLoading) sendMessage(); } }}
              placeholder={tutorMode === 'interactive' ? 'Ask about this step…' : 'Ask Octa a question…'}
              rows={2}
              maxLength={5000}
              disabled={isLoading}
            />
            <div className="tutor-input-footer">
              <div className="tutor-input-hint">
                {isListening ? (
                  <select aria-label="Voice input language" value={speechLang} onChange={(event) => setSpeechLang(event.target.value as typeof speechLang)}>
                    <option value="en-US">English</option><option value="ur-PK">Urdu</option><option value="zh-CN">Chinese</option>
                  </select>
                ) : <span>Enter to send · Shift + Enter for a new line</span>}
              </div>
              <div className="tutor-input-actions">
                {isSpeechSupported && <button type="button" className={`tutor-input-icon-btn ${isListening ? 'listening' : ''}`} onClick={isListening ? stopListening : startListening} aria-label={isListening ? 'Stop voice input' : 'Start voice input'} title={isListening ? 'Stop voice input' : 'Voice input'}><Mic size={17} /></button>}
                <button type="submit" className="tutor-send-btn" disabled={!inputText.trim() || isLoading} aria-label="Send message" title="Send message"><Send size={16} /></button>
              </div>
            </div>
          </form>
        </div>
      </m.div> : <m.button
        key="octa-tutor-fab"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="octa-tutor-fab"
        onClick={() => requireAuth(toggleTutor, 'Sign in to chat with Octa AI Tutor and keep your learning context.')}
        title="Open Octa AI Tutor"
        aria-label="Open Octa AI Tutor"
      >
        <div className="fab-octa-glow">
          <Octa expression="happy" size={26} interactive={false} />
        </div>
        <span className="fab-text">Octa AI</span>
        <span className={`octa-tutor-fab-dot tutor-status-${providerStatus}`} title={providerStatusCopy} aria-label={providerStatusCopy} />
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
