import React, { useRef, useEffect, useState } from 'react';
import { Bot, Send, Mic, MicOff, Settings, X, Trash2, Volume2 } from 'lucide-react';
import { useOctaTutor, type SupportedSpeechLang } from '../../hooks/useOctaTutor';
import { useTutorContext } from '../../contexts/TutorContext';
import { Octa } from '../mascot';
import './OctaTutor.css';

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
    isSpeechSupported,
    mascotExpression,
    sendMessage,
    startListening,
    stopListening,
    clearHistory,
    llmConfig,
    setIsSettingsOpen,
  } = useOctaTutor();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [revealedChars, setRevealedChars] = useState<Record<string, number>>({});

  useEffect(() => {
    if (messagesEndRef.current && isTutorOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTutorOpen]);

  // Fast char reveal animation
  useEffect(() => {
    const latestMsg = messages[messages.length - 1];
    if (latestMsg && latestMsg.role === 'assistant' && latestMsg.isRevealing) {
      const msgId = latestMsg.id;
      let currentLen = revealedChars[msgId] || 0;
      if (currentLen < latestMsg.content.length) {
        const timer = setTimeout(() => {
          setRevealedChars((prev) => ({
            ...prev,
            [msgId]: currentLen + 4,
          }));
        }, 15);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, revealedChars]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isTutorOpen) {
    return (
      <button
        className="octa-tutor-fab"
        onClick={toggleTutor}
        title="Open Octa AI Tutor"
        aria-label="Open Octa AI Tutor"
      >
        <Octa expression="happy" size={24} interactive={false} />
        <span>Octa Tutor</span>
        <span className="octa-tutor-fab-dot" />
      </button>
    );
  }

  const suggestions = [
    { label: 'Explain step', text: `Explain step ${contextState.currentStepIndex + 1} of ${contextState.totalSteps || 1}.` },
    { label: 'Dark Mode', text: 'Switch to dark mode.' },
    { label: 'Hide Debugger', text: 'Hide code debugger.' },
    { label: 'Generate Quiz', text: `Generate a quiz on ${contextState.algorithmName || 'this algorithm'}.` },
  ];

  return (
    <div className="octa-tutor-window" role="region" aria-label="Octa AI Tutor">
      {/* Header */}
      <div className="tutor-header">
        <div className="tutor-header-title">
          <span className="tutor-header-name">Octa Tutor</span>
          <span className="tutor-header-model">{llmConfig.modelName || 'qwen-plus'}</span>
        </div>
        <div className="tutor-header-actions">
          <button className="tutor-icon-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Settings size={14} />
          </button>
          <button className="tutor-icon-btn" onClick={clearHistory} title="Clear Chat">
            <Trash2 size={14} />
          </button>
          <button className="tutor-icon-btn" onClick={toggleTutor} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Context Ribbon */}
      <div className="tutor-context-ribbon">
        <span>Context: {contextState.algorithmName || 'General DSA'}</span>
        <span>Step {contextState.currentStepIndex + 1} / {contextState.totalSteps || 1}</span>
      </div>

      {/* Message Output Box */}
      <div className="tutor-message-list">
        {messages.map((msg) => {
          const isAssis = msg.role === 'assistant';
          const maxChar = revealedChars[msg.id];
          const displayContent = isAssis && msg.isRevealing && maxChar !== undefined
            ? msg.content.slice(0, maxChar)
            : msg.content;

          return (
            <div key={msg.id} className={`tutor-message-bubble ${msg.role}`}>
              <div className="tutor-message-content">
                {displayContent}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="tutor-message-bubble assistant">
            <div className="tutor-message-content">
              <span className="tutor-typing-dots">
                <span className="tutor-typing-dot" />
                <span className="tutor-typing-dot" />
                <span className="tutor-typing-dot" />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="tutor-suggestions">
        {suggestions.map((s, idx) => (
          <button key={idx} className="tutor-suggestion-pill" onClick={() => sendMessage(s.text)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Input Container + Perched Mascot TOP-RIGHT */}
      <div className="tutor-input-container">
        {/* Mascot Perched Exactly Top-Right of Input Box */}
        <div className="tutor-perched-mascot">
          <Octa expression={mascotExpression} size="small" interactive={true} />
        </div>

        <div className="tutor-input-tools">
          <div className="tutor-lang-selector">
            {(['en-US', 'ur-PK', 'zh-CN'] as SupportedSpeechLang[]).map((lang) => (
              <button
                key={lang}
                className={`tutor-lang-chip ${speechLang === lang ? 'active' : ''}`}
                onClick={() => setSpeechLang(lang)}
              >
                {lang === 'en-US' ? 'EN' : lang === 'ur-PK' ? 'UR' : 'ZH'}
              </button>
            ))}
          </div>
          {isListening && (
            <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Volume2 size={12} /> Listening...
            </span>
          )}
        </div>

        <div className="tutor-input-box-wrapper">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Octa Tutor..."
            className="tutor-textarea"
            rows={1}
          />
          {isSpeechSupported && (
            <button
              className={`tutor-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              type="button"
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
          <button
            className="tutor-send-btn"
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            type="button"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
