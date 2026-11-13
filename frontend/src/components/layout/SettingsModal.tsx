import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useTheme } from '../../contexts/ThemeContext';
import { ApiError, useAuth } from '../../contexts/AuthContext';
import type { LLMProvider, UserLLMConfig } from '../../api/octaTutorApi';
import { testTutorConnection } from '../../api/octaTutorApi';
import './SettingsModal.css';
import { activateOctaConfigUser, DEFAULT_OCTA_CONFIG, loadOctaConfig, persistOctaConfig, readOctaConfig, resetPersistedOctaConfig } from '../../api/octaConfigStorage';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS: { id: LLMProvider; name: string }[] = [
  { id: 'dashscope', name: 'Alibaba Cloud Qwen (System Default)' },
  { id: 'openai', name: 'OpenAI (GPT-4o / GPT-4o-mini)' },
  { id: 'openrouter', name: 'OpenRouter (Unified API)' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'custom', name: 'Custom OpenAI-Compatible API' },
];

const DEFAULT_CONFIG: UserLLMConfig = DEFAULT_OCTA_CONFIG;

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, onClose, dialogRef);
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance' | 'account'>('ai');

  const [llmConfig, setLlmConfig] = useState<UserLLMConfig>(readOctaConfig);

  const [provider, setProvider] = useState<LLMProvider>(llmConfig.provider || 'dashscope');
  const [apiKey, setApiKey] = useState<string>(llmConfig.apiKey || '');
  const [baseUrl, setBaseUrl] = useState<string>(llmConfig.baseUrl || DEFAULT_CONFIG.baseUrl);
  const [modelName, setModelName] = useState<string>(llmConfig.modelName || 'qwen-plus');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [aiConfigBusy, setAiConfigBusy] = useState(false);
  const [aiConfigMessage, setAiConfigMessage] = useState('');
  const [aiConfigError, setAiConfigError] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false);
  const [emailPreferenceBusy, setEmailPreferenceBusy] = useState(false);
  const [emailPreferenceMessage, setEmailPreferenceMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setApiKey('');
    setAiConfigMessage('');
    setAiConfigError(false);
    if (!isAuthenticated || !user) {
      activateOctaConfigUser(null);
      setLlmConfig({ ...DEFAULT_CONFIG });
      setProvider(DEFAULT_CONFIG.provider);
      setBaseUrl(DEFAULT_CONFIG.baseUrl);
      setModelName(DEFAULT_CONFIG.modelName);
      return;
    }
    let active = true;
    activateOctaConfigUser(user.user_id);
    setAiConfigBusy(true);
    loadOctaConfig(user.user_id)
      .then((saved) => {
        if (!active) return;
        setLlmConfig(saved);
        setProvider(saved.provider);
        setBaseUrl(saved.baseUrl);
        setModelName(saved.modelName);
      })
      .catch(() => {
        if (active) {
          setAiConfigError(true);
          setAiConfigMessage('Saved Octa settings could not be loaded. Check your connection and retry.');
        }
      })
      .finally(() => { if (active) setAiConfigBusy(false); });
    return () => { active = false; };
  }, [isAuthenticated, isOpen, user?.user_id]);

  useEffect(() => {
    if (!isAuthenticated && activeTab === 'account') {
      setActiveTab('ai');
      setDeleteConfirmation('');
      setDeleteError('');
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'account' || !isAuthenticated) return;
    let active = true;
    apiClient<{ marketing_email_opt_in: boolean }>('/api/preferences', { requiresAuth: true })
      .then((preferences) => { if (active) setMarketingEmailOptIn(preferences.marketing_email_opt_in); })
      .catch(() => { if (active) setEmailPreferenceMessage('Email preferences could not be loaded.'); });
    return () => { active = false; };
  }, [activeTab, isAuthenticated, isOpen]);

  const updateMarketingEmailPreference = async (enabled: boolean) => {
    setEmailPreferenceBusy(true);
    setEmailPreferenceMessage('');
    try {
      const preferences = await apiClient<{ marketing_email_opt_in: boolean }>('/api/preferences', {
        method: 'PATCH', body: { marketing_email_opt_in: enabled }, requiresAuth: true,
      });
      setMarketingEmailOptIn(preferences.marketing_email_opt_in);
      setEmailPreferenceMessage(enabled ? 'Promotional email preference saved.' : 'Promotional emails are turned off.');
    } catch {
      setEmailPreferenceMessage('Could not save this email preference. Try again.');
    } finally {
      setEmailPreferenceBusy(false);
    }
  };

  if (!isOpen) return null;

  const handleProviderSelect = (p: LLMProvider) => {
    setProvider(p);
    setApiKey('');
    setTestResult(null);
    setAiConfigMessage('');
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
      setBaseUrl('');
      setModelName('llama3');
    } else {
      setBaseUrl('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');
      setModelName('qwen-plus');
    }
  };

  const handleTestConnection = async () => {
    if (!isAuthenticated) {
      setTestResult({ success: false, message: 'Sign in to test an account-scoped provider connection.' });
      return;
    }
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

  const handleSave = async () => {
    if (activeTab !== 'ai') {
      onClose();
      return;
    }
    if (!isAuthenticated || !user) {
      setAiConfigError(true);
      setAiConfigMessage('Sign in to save your API key securely to your account.');
      return;
    }
    setAiConfigBusy(true);
    setAiConfigError(false);
    setAiConfigMessage('');
    try {
      const saved = await persistOctaConfig(user.user_id, {
        provider,
        apiKey,
        apiKeyConfigured: llmConfig.apiKeyConfigured,
        baseUrl,
        modelName,
      });
      setLlmConfig(saved);
      setApiKey('');
      setAiConfigMessage(saved.apiKeyConfigured
        ? 'Saved securely to your account. Octa uses this provider on website and mobile.'
        : 'Provider settings saved. Octa will use the system provider when available.');
    } catch (error) {
      setAiConfigError(true);
      setAiConfigMessage(error instanceof Error ? error.message : 'Octa settings could not be saved. Try again.');
    } finally {
      setAiConfigBusy(false);
    }
  };

  const handleReset = async () => {
    if (activeTab === 'appearance') {
      setTheme('light');
      return;
    }
    setApiKey('');
    setTestResult(null);
    setAiConfigBusy(true);
    setAiConfigError(false);
    setAiConfigMessage('');
    try {
      const reset = isAuthenticated && user
        ? await resetPersistedOctaConfig(user.user_id)
        : { ...DEFAULT_CONFIG };
      setLlmConfig(reset);
      setProvider(reset.provider);
      setBaseUrl(reset.baseUrl);
      setModelName(reset.modelName);
      setAiConfigMessage(isAuthenticated ? 'Saved provider and API key removed from your account.' : 'Defaults restored for this session. Sign in to save account settings.');
    } catch (error) {
      setAiConfigError(true);
      setAiConfigMessage(error instanceof Error ? error.message : 'Saved Octa settings could not be reset. Try again.');
    } finally {
      setAiConfigBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE' || deletingAccount) return;
    setDeletingAccount(true);
    setDeleteError('');
    try {
      await deleteAccount();
      onClose();
      navigate('/');
    } catch (error) {
      setDeleteError(
        error instanceof ApiError
          ? error.message
          : 'The account could not be deleted. Please try again.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="settings-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="settings-modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" tabIndex={-1}>
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-header-title">
            <h3 id="settings-modal-title">Settings</h3>
            <p>Configure model API keys and preferences</p>
          </div>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs-bar">
          <button
            className={`settings-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI Model (BYOK)
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
          {isAuthenticated && (
            <button
              className={`settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
          )}
        </div>

        {/* Body */}
        <div className="settings-modal-body">
          {activeTab === 'ai' && (
            <>
              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-provider">Provider</label>
                <select
                  id="settings-provider"
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

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-api-key">API Key</label>
                <div className="settings-input-wrapper">
                  <input
                    id="settings-api-key"
                    type={showKey ? 'text' : 'password'}
                    className="settings-input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="new-password"
                    placeholder={llmConfig.apiKeyConfigured && llmConfig.provider === provider
                      ? 'Saved for your account — enter a new key to replace it'
                      : provider === 'dashscope' ? 'Optional (system key may be active)' : 'Enter provider API key'}
                    disabled={!isAuthenticated || aiConfigBusy}
                  />
                  <button
                    type="button"
                    className="settings-eye-btn"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    disabled={!isAuthenticated || aiConfigBusy}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <p className="settings-key-note">
                {isAuthenticated
                  ? 'One account setting powers Octa and quiz feedback on website and mobile. The key is encrypted on the server and never sent back to the app. Leave blank to keep a saved key.'
                  : 'Sign in to save a provider key securely to your account and use it on both website and mobile.'}
              </p>
              {aiConfigMessage && <div className={`settings-status-banner${aiConfigError ? ' error' : ''}`} role={aiConfigError ? 'alert' : 'status'}><span>{aiConfigMessage}</span></div>}

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-model-name">Model Name</label>
                <input
                  id="settings-model-name"
                  type="text"
                  className="settings-input"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. qwen-plus, gpt-4o-mini"
                />
              </div>

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-base-url">Base Endpoint URL</label>
                <input
                  id="settings-base-url"
                  type="text"
                  className="settings-input"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>

              {testResult && (
                <div className={`settings-status-banner ${testResult.success ? 'success' : 'error'}`} role={testResult.success ? 'status' : 'alert'}>
                  {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-field">
              <label className="settings-label" htmlFor="settings-theme">Interface Theme</label>
              <select
                id="settings-theme"
                className="settings-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          )}

          {activeTab === 'account' && isAuthenticated && (
            <>
              <section className="settings-email-preference" aria-labelledby="marketing-email-title">
                <div>
                  <h4 id="marketing-email-title">Product updates and promotions</h4>
                  <p>Choose whether STEM Studio may send you promotional email. Essential account and security messages are separate.</p>
                </div>
                <label className="settings-email-toggle">
                  <input
                    type="checkbox"
                    checked={marketingEmailOptIn}
                    disabled={emailPreferenceBusy}
                    onChange={(event) => void updateMarketingEmailPreference(event.target.checked)}
                  />
                  <span>Receive promotional email</span>
                </label>
                {emailPreferenceMessage && <p className="settings-email-preference-status" role="status">{emailPreferenceMessage}</p>}
              </section>
              <section className="settings-danger-zone" aria-labelledby="delete-account-title">
              <div>
                <p className="settings-danger-eyebrow">Permanent action</p>
                <h4 id="delete-account-title">Delete your account</h4>
                <p>
                  This permanently removes your account, learning progress, saved sessions,
                  and active sign-in sessions. This cannot be undone.
                </p>
              </div>
              <label className="settings-label" htmlFor="delete-account-confirmation">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                id="delete-account-confirmation"
                className="settings-input"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={deletingAccount}
              />
              {deleteError && (
                <div className="settings-status-banner error" role="alert">
                  <AlertCircle size={14} />
                  <span>{deleteError}</span>
                </div>
              )}
              <button
                type="button"
                className="settings-danger-btn"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || deletingAccount}
              >
                {deletingAccount ? 'Deleting account…' : 'Delete account permanently'}
              </button>
              <p className="settings-danger-note">
                For your security, sign in again if this session is more than 10 minutes old.
              </p>
            </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          {activeTab === 'account' ? (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={handleReset} disabled={activeTab === 'ai' && aiConfigBusy}>
                {activeTab === 'appearance' ? 'Reset Theme' : activeTab === 'ai' && aiConfigBusy ? 'Working…' : 'Reset Provider'}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {activeTab === 'ai' && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleTestConnection}
                    disabled={testing || aiConfigBusy || !isAuthenticated}
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={handleSave} disabled={aiConfigBusy || (activeTab === 'ai' && !isAuthenticated)}>
                  {activeTab === 'ai' && aiConfigBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
