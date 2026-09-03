import React, { useState } from 'react';
import { X, Settings, Sun, Moon, Cpu, Mic, Eye, EyeOff, Check, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { LLMProvider, UserLLMConfig } from '../../api/octaTutorApi';
import { testTutorConnection } from '../../api/octaTutorApi';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: LLMProvider; name: string; icon: string; desc: string }[] = [
  { id: 'dashscope', name: 'Alibaba Qwen', icon: '⚡', desc: 'System Free Default' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', desc: 'GPT-4o & GPT-4o-mini' },
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐', desc: '100+ Models Unified' },
  { id: 'anthropic', name: 'Claude', icon: '🧠', desc: 'Claude 3.5 Sonnet' },
  { id: 'custom', name: 'Custom / Local', icon: '⚙️', desc: 'Ollama, LMStudio' },
];

const DEFAULT_CONFIG: UserLLMConfig = {
  provider: 'dashscope',
  apiKey: '',
  baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  modelName: 'qwen-plus',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'theme' | 'ai' | 'voice'>('ai');

  // LLM Config State
  const [llmConfig, setLlmConfig] = useState<UserLLMConfig>(() => {
    try {
      const saved = localStorage.getItem('octa_llm_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [provider, setProvider] = useState<LLMProvider>(llmConfig.provider || 'dashscope');
  const [apiKey, setApiKey] = useState<string>(llmConfig.apiKey || '');
  const [baseUrl, setBaseUrl] = useState<string>(llmConfig.baseUrl || DEFAULT_CONFIG.baseUrl);
  const [modelName, setModelName] = useState<string>(llmConfig.modelName || 'qwen-plus');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleProviderSelect = (p: LLMProvider) => {
    setProvider(p);
    setTestResult(null);
    if (p === 'openai') {
      setBaseUrl('https://api.openai.com/v1/chat/completions');
      setModelName('gpt-4o-mini');
    } else if (p === 'openrouter') {
      setBaseUrl('https://openrouter.ai/api/v1/chat/completions');
      setModelName('openai/gpt-4o-mini');
    } else if (p === 'anthropic') {
      setBaseUrl('https://api.anthropic.com/v1/messages');
      setModelName('claude-3-5-sonnet-20241022');
    } else if (p === 'custom') {
      setBaseUrl('http://localhost:11434/v1/chat/completions');
      setModelName('llama3');
    } else {
      setBaseUrl('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');
      setModelName('qwen-plus');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testTutorConnection({
        provider,
        apiKey,
        baseUrl,
        modelName,
      });
      setTestResult({
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to connect to API endpoint.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const updated: UserLLMConfig = { provider, apiKey, baseUrl, modelName };
    setLlmConfig(updated);
    try {
      localStorage.setItem('octa_llm_config', JSON.stringify(updated));
    } catch {}
    onClose();
  };

  const handleReset = () => {
    setProvider('dashscope');
    setApiKey('');
    setBaseUrl(DEFAULT_CONFIG.baseUrl);
    setModelName('qwen-plus');
    setTestResult(null);
    try {
      localStorage.removeItem('octa_llm_config');
    } catch {}
  };

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-header-title">
            <div className="brand-logo-glow">
              <Settings size={22} className="text-purple-600" />
            </div>
            <div>
              <h3>STEM Studio Settings</h3>
              <p>Configure interface theme, custom AI models (BYOK), & voice settings</p>
            </div>
          </div>
          <button className="tutor-icon-btn" onClick={onClose} title="Close Settings">
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="settings-tabs-bar">
          <button
            className={`settings-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Cpu size={15} /> AI Tutor (BYOK)
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            <Sun size={15} /> Appearance
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <Mic size={15} /> Voice & Audio
          </button>
        </div>

        {/* Body */}
        <div className="settings-modal-body">
          {/* TAB 1: AI TUTOR SETUP */}
          {activeTab === 'ai' && (
            <>
              <div className="tutor-field-group">
                <label className="tutor-field-label">
                  <span>Select AI Provider</span>
                  <span style={{ fontSize: '0.7rem', color: '#a855f7' }}>Bring Your Own Key (BYOK)</span>
                </label>
                <div className="tutor-provider-grid">
                  {PROVIDERS.map((p) => (
                    <div
                      key={p.id}
                      className={`tutor-provider-card ${provider === p.id ? 'selected' : ''}`}
                      onClick={() => handleProviderSelect(p.id)}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {provider !== 'custom' && (
                <div className="tutor-field-group">
                  <label className="tutor-field-label">
                    <span>API Key</span>
                    {provider === 'dashscope' && (
                      <span style={{ fontSize: '0.72rem', color: '#34d399' }}>
                        <ShieldCheck size={12} style={{ display: 'inline', marginRight: 2 }} />
                        System Free Key Active
                      </span>
                    )}
                  </label>
                  <div className="tutor-input-with-icon">
                    <input
                      type={showKey ? 'text' : 'password'}
                      className="tutor-setting-input"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={provider === 'dashscope' ? 'Optional — enter custom key or leave blank' : `Enter ${provider.toUpperCase()} API Key`}
                    />
                    <button
                      type="button"
                      className="tutor-eye-btn"
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="tutor-field-group">
                <label className="tutor-field-label">
                  <span>Model Name</span>
                </label>
                <input
                  type="text"
                  className="tutor-setting-input"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="qwen-plus, gpt-4o-mini, claude-3-5-sonnet"
                />
              </div>

              <div className="tutor-field-group">
                <label className="tutor-field-label">
                  <span>Base API Endpoint URL</span>
                </label>
                <input
                  type="text"
                  className="tutor-setting-input"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>

              {testResult && (
                <div className={`tutor-status-banner ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === 'theme' && (
            <div className="settings-section-card">
              <span className="tutor-field-label">Theme Mode</span>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  className={`tutor-provider-card ${theme === 'light' ? 'selected' : ''}`}
                  onClick={() => setTheme('light')}
                  style={{ flex: 1, padding: '16px' }}
                >
                  <Sun size={24} />
                  <span>Clean Light</span>
                </button>
                <button
                  type="button"
                  className={`tutor-provider-card ${theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => setTheme('dark')}
                  style={{ flex: 1, padding: '16px' }}
                >
                  <Moon size={24} />
                  <span>Midnight Dark</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE & AUDIO */}
          {activeTab === 'voice' && (
            <div className="settings-section-card">
              <span className="tutor-field-label">Speech Recognition Language</span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Speech input operates via browser-native Web Speech API with auto multi-lingual matching in English, Urdu, or Chinese.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button type="button" className="tutor-btn-secondary" onClick={handleReset}>
            Reset Default
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab === 'ai' && (
              <button
                type="button"
                className="tutor-btn-secondary"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            )}
            <button type="button" className="tutor-btn-primary" onClick={handleSave}>
              <Check size={16} /> Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
