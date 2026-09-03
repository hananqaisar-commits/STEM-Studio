import React, { useState } from 'react';
import { X, Eye, EyeOff, Check, Cpu, Key, Globe, Sparkles, RefreshCw, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import type { LLMProvider, UserLLMConfig } from '../../api/octaTutorApi';
import { testTutorConnection } from '../../api/octaTutorApi';
import './OctaTutorSettingsModal.css';

interface OctaTutorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserLLMConfig;
  onSaveConfig: (newConfig: UserLLMConfig) => void;
  onResetDefault: () => void;
}

const PROVIDERS: { id: LLMProvider; name: string; icon: string; desc: string }[] = [
  { id: 'dashscope', name: 'Alibaba Qwen', icon: '⚡', desc: 'System Free Default' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', desc: 'GPT-4o & GPT-4o-mini' },
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐', desc: '100+ Models Unified' },
  { id: 'anthropic', name: 'Claude', icon: '🧠', desc: 'Claude 3.5 Sonnet & Haiku' },
  { id: 'custom', name: 'Custom / Local', icon: '⚙️', desc: 'Ollama, LMStudio, vLLM' },
];

const PRESETS: Record<LLMProvider, { models: string[]; baseUrl: string }> = {
  dashscope: {
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  },
  openai: {
    models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
    baseUrl: 'https://api.openai.com/v1/chat/completions',
  },
  openrouter: {
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-r1'],
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  },
  anthropic: {
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    baseUrl: 'https://api.anthropic.com/v1/messages',
  },
  custom: {
    models: ['llama3', 'mistral', 'deepseek-r1'],
    baseUrl: 'http://localhost:11434/v1/chat/completions',
  },
};

export const OctaTutorSettingsModal: React.FC<OctaTutorSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDefault,
}) => {
  const [provider, setProvider] = useState<LLMProvider>(config.provider || 'dashscope');
  const [apiKey, setApiKey] = useState<string>(config.apiKey || '');
  const [baseUrl, setBaseUrl] = useState<string>(config.baseUrl || PRESETS.dashscope.baseUrl);
  const [modelName, setModelName] = useState<string>(config.modelName || PRESETS.dashscope.models[0]);

  const [showKey, setShowKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleProviderSelect = (p: LLMProvider) => {
    setProvider(p);
    setTestResult(null);
    const preset = PRESETS[p];
    if (preset) {
      setBaseUrl(preset.baseUrl);
      setModelName(preset.models[0]);
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
        message: err?.message || 'Failed to reach API endpoint.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      provider,
      apiKey,
      baseUrl,
      modelName,
    });
    onClose();
  };

  return (
    <div className="tutor-settings-backdrop" onClick={onClose}>
      <div className="tutor-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tutor-settings-header">
          <div className="tutor-settings-title">
            <div className="brand-logo-glow">
              <Cpu size={24} className="text-purple-600" />
            </div>
            <div>
              <h3>AI Model Settings (BYOK)</h3>
              <p>Configure custom LLM models, API keys & custom endpoints</p>
            </div>
          </div>
          <button className="tutor-icon-btn" onClick={onClose} title="Close Settings">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="tutor-settings-body">
          {/* Provider Selector */}
          <div className="tutor-field-group">
            <label className="tutor-field-label">
              <span>Select Model Provider</span>
              <span style={{ fontSize: '0.7rem', color: '#a855f7' }}>Bring Your Own Key</span>
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

          {/* API Key */}
          {provider !== 'custom' && (
            <div className="tutor-field-group">
              <label className="tutor-field-label">
                <span>API Key</span>
                {provider === 'dashscope' && (
                  <span style={{ fontSize: '0.72rem', color: '#34d399' }}>
                    <ShieldCheck size={12} style={{ display: 'inline', marginRight: 2 }} />
                    Optional (System Key Active)
                  </span>
                )}
              </label>
              <div className="tutor-input-with-icon">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="tutor-setting-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'dashscope' ? 'Enter API Key or leave blank for system key' : `Enter ${provider.toUpperCase()} API Key`}
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

          {/* Model Name */}
          <div className="tutor-field-group">
            <label className="tutor-field-label">
              <span>Model Name</span>
            </label>
            <input
              type="text"
              className="tutor-setting-input"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. gpt-4o-mini, qwen-plus, llama3"
            />
            {PRESETS[provider]?.models && (
              <div className="tutor-preset-chips">
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Presets:</span>
                {PRESETS[provider].models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="tutor-preset-chip"
                    onClick={() => setModelName(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Base Endpoint URL */}
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

          {/* Connection Test Banner */}
          {testResult && (
            <div className={`tutor-status-banner ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tutor-settings-footer">
          <button
            type="button"
            className="tutor-btn-secondary"
            onClick={() => {
              onResetDefault();
              setProvider('dashscope');
              setApiKey('');
              setBaseUrl(PRESETS.dashscope.baseUrl);
              setModelName(PRESETS.dashscope.models[0]);
              setTestResult(null);
            }}
          >
            Reset System Default
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="tutor-btn-secondary"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="button" className="tutor-btn-primary" onClick={handleSave}>
              <Check size={16} /> Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
