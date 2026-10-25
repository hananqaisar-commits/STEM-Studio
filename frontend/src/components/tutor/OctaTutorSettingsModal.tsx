import React, { useRef, useState } from 'react';
import { AlertCircle, Bot, BrainCircuit, Check, Cpu, Eye, EyeOff, Globe, Settings2, ShieldCheck, X, Zap, type LucideIcon } from 'lucide-react';
import type { LLMProvider, UserLLMConfig } from '../../api/octaTutorApi';
import { testTutorConnection } from '../../api/octaTutorApi';
import './OctaTutorSettingsModal.css';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface OctaTutorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserLLMConfig;
  onSaveConfig: (newConfig: UserLLMConfig) => void;
  onResetDefault: () => void;
}

const PROVIDERS: { id: LLMProvider; name: string; icon: LucideIcon; desc: string }[] = [
  { id: 'dashscope', name: 'Alibaba Qwen', icon: Zap, desc: 'System default' },
  { id: 'openai', name: 'OpenAI', icon: Bot, desc: 'GPT models' },
  { id: 'openrouter', name: 'OpenRouter', icon: Globe, desc: 'Multiple providers' },
  { id: 'anthropic', name: 'Claude', icon: BrainCircuit, desc: 'Claude models' },
  { id: 'custom', name: 'Custom / Local', icon: Settings2, desc: 'Ollama and compatible APIs' },
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
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, onClose, dialogRef);
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
    <div className="tutor-settings-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="tutor-settings-modal" role="dialog" aria-modal="true" aria-labelledby="tutor-settings-title" tabIndex={-1}>
        {/* Header */}
        <div className="tutor-settings-header">
          <div className="tutor-settings-title">
            <div className="brand-logo-glow">
              <Cpu size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 id="tutor-settings-title">AI model settings</h3>
              <p>Configure custom LLM models, API keys & custom endpoints</p>
            </div>
          </div>
          <button type="button" className="tutor-icon-btn" onClick={onClose} title="Close settings" aria-label="Close settings">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="tutor-settings-body">
          {/* Provider Selector */}
          <div className="tutor-field-group">
            <label className="tutor-field-label">
              <span>Select Model Provider</span>
                  <span style={{ fontSize: '0.7rem' }}>Bring your own key</span>
            </label>
            <div className="tutor-provider-grid">
              {PROVIDERS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`tutor-provider-card ${provider === p.id ? 'selected' : ''}`}
                  onClick={() => handleProviderSelect(p.id)}
                  aria-pressed={provider === p.id}
                >
                  <span className="tutor-provider-card__icon"><p.icon size={18} aria-hidden="true" /></span>
                  <span className="tutor-provider-card__name">{p.name}</span>
                  <span className="tutor-provider-card__description">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          {provider !== 'custom' && (
            <div className="tutor-field-group">
              <label className="tutor-field-label">
                <span>API Key</span>
                {provider === 'dashscope' && (
                  <span className="tutor-key-optional">
                    <ShieldCheck size={13} aria-hidden="true" />
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
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                >
                  {showKey ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
          <p className="tutor-key-note">Your key stays in this browser tab only and is cleared when its session ends. It is sent to the STEM Studio backend when Octa uses it; avoid configuring a key on a shared device.</p>

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
