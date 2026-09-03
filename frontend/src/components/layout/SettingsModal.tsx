import React, { useState } from 'react';
import { X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import type { LLMProvider, UserLLMConfig } from '../../api/octaTutorApi';
import { testTutorConnection } from '../../api/octaTutorApi';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS: { id: LLMProvider; name: string }[] = [
  { id: 'dashscope', name: 'Alibaba Cloud Qwen (System Default)' },
  { id: 'openai', name: 'OpenAI (GPT-4o / GPT-4o-mini)' },
  { id: 'openrouter', name: 'OpenRouter (Unified API)' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'custom', name: 'Custom OpenAI-Compatible (Ollama, Local)' },
];

const DEFAULT_CONFIG: UserLLMConfig = {
  provider: 'dashscope',
  apiKey: '',
  baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  modelName: 'qwen-plus',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
      const res = await testTutorConnection({ provider, apiKey, baseUrl, modelName });
      setTestResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection failed.' });
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
            <h3>AI Model Settings</h3>
            <p>Configure LLM model API keys and custom endpoints</p>
          </div>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="settings-modal-body">
          <div className="settings-field">
            <label className="settings-label">Provider</label>
            <select
              className="settings-select"
              value={provider}
              onChange={(e) => handleProviderSelect(e.target.value as LLMProvider)}
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {provider !== 'custom' && (
            <div className="settings-field">
              <label className="settings-label">API Key</label>
              <div className="settings-input-wrapper">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="settings-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'dashscope' ? 'Optional (system key active)' : `Enter ${provider.toUpperCase()} API Key`}
                />
                <button
                  type="button"
                  className="settings-eye-btn"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          <div className="settings-field">
            <label className="settings-label">Model Name</label>
            <input
              type="text"
              className="settings-input"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. qwen-plus, gpt-4o-mini"
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Base Endpoint URL</label>
            <input
              type="text"
              className="settings-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          {testResult && (
            <div className={`settings-status-banner ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Reset Defaults
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
