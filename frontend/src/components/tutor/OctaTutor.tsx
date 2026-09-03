import React, { useRef, useEffect } from 'react';
import { Bot, Send, Mic, MicOff, X, Minimize2, Trash2, Sparkles, Volume2 } from 'lucide-react';
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
  } = useOctaTutor();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current && isTutorOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTutorOpen]);

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
        <div className="brand-logo-glow">
          <Octa expression="happy" size={32} interactive={false} />
        </div>
        <span>Octa AI Tutor</span>
        <span className="octa-tutor-fab-badge" />
      </button>
    );
  }

  const suggestions = [
    { label: 'Explain algorithm', text: `Explain how ${contextState.algorithmName || 'this algorithm'} works step-by-step.` },
    { label: 'Explain current step', text: `Explain what is happening in step ${contextState.currentStepIndex + 1}.` },
    { label: 'Switch theme', text: 'Switch to dark mode.' },
    { label: 'Toggle debugger', text: 'Hide code debugger.' },
    { label: 'Create a quiz', text: `Give me a 5-question quiz on ${contextState.algorithmName || 'this algorithm'}.` },
  ];

  return (
    <div className="octa-tutor-window animate-fade-in" role="region" aria-label="Octa AI Tutor Assistant">
      {/* Header */}
      <div className="tutor-header">
        <div className="tutor-header-title">
          <Bot size={20} className="text-purple-600" />
          <div>
            <div className="tutor-header-name">Octa AI Tutor</div>
            <div className="tutor-header-subtitle">
              {contextState.algorithmName ? `${contextState.algorithmName} Assistant` : 'DSA Assistant'}
            </div>
          </div>
        </div>
        <div className="tutor-header-actions">
          <button
            className="tutor-icon-btn"
            onClick={clearHistory}
            title="Clear Chat History"
            aria-label="Clear Chat History"
          >
            <Trash2 size={15} />
          </button>
          <button
            className="tutor-icon-btn"
            onClick={toggleTutor}
            title="Minimize Panel"
            aria-label="Minimize Panel"
          >
            <Minimize2 size={15} />
          </button>
        </div>
      </div>

      {/* Context Ribbon */}
      <div className="tutor-context-ribbon">
        <span>📍 Context: {contextState.algorithmName || 'General DSA'}</span>
        <span>
          Step {contextState.currentStepIndex + 1} / {contextState.totalSteps}
        </span>
      </div>

      {/* Messages Scroll View */}
      <div className="tutor-message-list">
        {messages.map((msg) => (
          <div key={msg.id} className={`tutor-message-bubble ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="tutor-avatar-mini">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div className="tutor-message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="tutor-message-bubble assistant">
            <div className="tutor-avatar-mini">
              <Bot size={14} className="text-white" />
            </div>
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

      {/* Quick Suggestions */}
      <div style={{ padding: '0 16px' }}>
        <div className="tutor-suggestions">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              className="tutor-suggestion-pill"
              onClick={() => sendMessage(s.text)}
            >
              <Sparkles size={10} style={{ display: 'inline', marginRight: 4 }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Container with Perched Mascot */}
      <div className="tutor-input-container">
        {/* Perched Mascot sitting ~1 inch right of input top-left, touching top edge */}
        <div className="tutor-perched-mascot" title={`Octa status: ${mascotExpression}`}>
          <Octa expression={mascotExpression} size="small" interactive={true} />
        </div>

        {/* Toolbar: Language Chips & Voice status */}
        <div className="tutor-input-tools">
          <div className="tutor-lang-selector" title="Voice Input Language">
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mic:</span>
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
            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Volume2 size={12} className="animate-pulse" /> Listening...
            </span>
          )}
        </div>

        {/* Textarea Input (Standard unmodified textarea for native copy/paste/select) */}
        <div className="tutor-input-box-wrapper">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Octa Tutor something..."
            className="tutor-textarea"
            rows={1}
          />
          {isSpeechSupported ? (
            <button
              className={`tutor-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop voice recording' : 'Start voice input (Web Speech API)'}
              type="button"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          ) : (
            <button
              className="tutor-mic-btn"
              disabled
              title="Voice input is not supported in this browser (Use Chrome/Edge/Safari)"
              type="button"
            >
              <MicOff size={18} style={{ opacity: 0.4 }} />
            </button>
          )}
          <button
            className="tutor-send-btn"
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            title="Send Message"
            type="button"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
