import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Check, AlertCircle, Camera, LogOut, Save, UserRound } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useTheme, type AppStyle } from '../../contexts/ThemeContext';
import { ApiError, useAuth } from '../../contexts/AuthContext';
import type { LLMProvider, UserLLMConfig } from '../../api/octaTutorApi';
import { testTutorConnection } from '../../api/octaTutorApi';
import './SettingsModal.css';
import { clearOctaConfig, DEFAULT_OCTA_CONFIG, readAIExplanationsEnabled, readOctaConfig, writeAIExplanationsEnabled, writeOctaConfig } from '../../api/octaConfigStorage';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'ai' | 'preferences' | 'account';
}

const PROVIDER_OPTIONS: { id: LLMProvider; name: string }[] = [
  { id: 'dashscope', name: 'Alibaba Cloud Qwen (System Default)' },
  { id: 'openai', name: 'OpenAI (GPT-4o / GPT-4o-mini)' },
  { id: 'openrouter', name: 'OpenRouter (Unified API)' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'custom', name: 'Custom OpenAI-Compatible (Ollama, Local)' },
];

const DEFAULT_CONFIG: UserLLMConfig = DEFAULT_OCTA_CONFIG;

const LANGUAGE_OPTIONS = [
  'English', 'العربية — Arabic', 'বাংলা — Bengali', '简体中文 — Chinese (Simplified)', '繁體中文 — Chinese (Traditional)',
  'Azərbaycan — Azerbaijani', 'Euskara — Basque', 'Беларуская — Belarusian', 'Bosanski — Bosnian', 'Български — Bulgarian',
  'Català — Catalan', 'Čeština — Czech', 'Dansk — Danish', 'Deutsch — German', 'Ελληνικά — Greek',
  'فارسی — Persian', 'Suomi — Finnish', 'Filipino', 'Français — French', 'Gaeilge — Irish',
  'עברית — Hebrew', 'हिन्दी — Hindi', 'Hrvatski — Croatian', 'Magyar — Hungarian', 'Հայերեն — Armenian',
  'Bahasa Indonesia — Indonesian', 'Íslenska — Icelandic', 'Italiano — Italian', 'ქართული — Georgian', 'Қазақша — Kazakh',
  '日本語 — Japanese', '한국어 — Korean', 'मराठी — Marathi', 'Bahasa Melayu — Malay', 'မြန်မာ — Burmese',
  'Nederlands — Dutch', 'नेपाली — Nepali', 'Norsk — Norwegian', 'ਪੰਜਾਬੀ — Punjabi', 'Polski — Polish',
  'Português — Portuguese', 'پښتو — Pashto', 'Română — Romanian', 'Русский — Russian', 'සිංහල — Sinhala',
  'Slovenčina — Slovak', 'Српски — Serbian', 'Svenska — Swedish', 'தமிழ் — Tamil', 'తెలుగు — Telugu',
  'ไทย — Thai', 'Тоҷикӣ — Tajik', 'Türkçe — Turkish', 'Українська — Ukrainian', 'اردو — Urdu',
  'Oʻzbek — Uzbek', 'Tiếng Việt — Vietnamese', 'Kiswahili — Swahili', 'Hausa', 'Yorùbá — Yoruba',
  'አማርኛ — Amharic', 'isiZulu — Zulu', 'Kinyarwanda', 'Кыргызча — Kyrgyz', 'Монгол — Mongolian',
  'Shqip — Albanian', 'Македонски — Macedonian', 'Lietuvių — Lithuanian', 'Latviešu — Latvian',
  'Malagasy', 'ייִדיש — Yiddish', 'Other — enter any language',
];
const OTHER_LANGUAGE = 'Other — enter any language';

const UI_STYLE_OPTIONS: { id: AppStyle; title: string; description: string }[] = [
  { id: 'material', title: 'Material You', description: 'Clean, adaptive and modern · Best foundation' },
  { id: 'glass', title: 'Glassmorphism', description: 'Transparent glass and blur · Great for overlays' },
  { id: 'neumorphic', title: 'Neumorphism', description: 'Soft raised and inset surfaces · Use selectively' },
  { id: 'outline', title: 'Outline style', description: 'Minimal borders and subtle surfaces · Professional tools' },
];

interface SavedPreferences {
  theme: 'light' | 'dark' | null;
  marketing_email_opt_in: boolean;
  preferred_language: string | null;
  display_name: string | null;
  avatar_data_url: string | null;
  learning_prompt: string | null;
}

async function optimizeAvatar(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the profile photo.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let dataUrl = canvas.toDataURL('image/webp', 0.82);
  if (!dataUrl.startsWith('data:image/webp;')) dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  if (dataUrl.length > 350_000) throw new Error('This image could not be compressed enough. Choose a smaller image.');
  return dataUrl;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'ai' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, onClose, dialogRef);
  const { theme, setTheme, uiStyle, setUiStyle } = useTheme();
  const { isAuthenticated, user, logout, refreshUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ai' | 'preferences' | 'account'>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const [llmConfig, setLlmConfig] = useState<UserLLMConfig>(readOctaConfig);
  const [aiExplanationsEnabled, setAIExplanationsEnabled] = useState(readAIExplanationsEnabled);

  const [provider, setProvider] = useState<LLMProvider>(llmConfig.provider || 'dashscope');
  const [apiKey, setApiKey] = useState<string>(llmConfig.apiKey || '');
  const [baseUrl, setBaseUrl] = useState<string>(llmConfig.baseUrl || DEFAULT_CONFIG.baseUrl);
  const [modelName, setModelName] = useState<string>(llmConfig.modelName || 'qwen-plus');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false);
  const [emailPreferenceBusy, setEmailPreferenceBusy] = useState(false);
  const [emailPreferenceMessage, setEmailPreferenceMessage] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  const [learningPrompt, setLearningPrompt] = useState('');
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState('');
  const [preferenceError, setPreferenceError] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const saved = readOctaConfig();
    setLlmConfig(saved);
    setProvider(saved.provider);
    setApiKey(saved.apiKey);
    setBaseUrl(saved.baseUrl);
    setModelName(saved.modelName);
    setAIExplanationsEnabled(readAIExplanationsEnabled());
  }, [isOpen]);

  useEffect(() => {
    if (!isAuthenticated && activeTab === 'account') {
      setActiveTab('ai');
      setDeleteConfirmation('');
      setDeleteError('');
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isAuthenticated) {
      const savedLanguage = localStorage.getItem('stem_preferred_language') || 'English';
      if (LANGUAGE_OPTIONS.includes(savedLanguage) && savedLanguage !== OTHER_LANGUAGE) {
        setPreferredLanguage(savedLanguage);
        setCustomLanguage('');
      } else {
        setPreferredLanguage(OTHER_LANGUAGE);
        setCustomLanguage(savedLanguage === OTHER_LANGUAGE ? '' : savedLanguage);
      }
      setLearningPrompt(localStorage.getItem('stem_octa_learning_prompt') || '');
      return;
    }
    let active = true;
    apiClient<SavedPreferences>('/api/preferences', { requiresAuth: true })
      .then((preferences) => {
        if (!active) return;
        setMarketingEmailOptIn(preferences.marketing_email_opt_in);
        const savedLanguage = preferences.preferred_language || 'English';
        if (LANGUAGE_OPTIONS.includes(savedLanguage) && savedLanguage !== OTHER_LANGUAGE) {
          setPreferredLanguage(savedLanguage);
          setCustomLanguage('');
        } else {
          setPreferredLanguage(OTHER_LANGUAGE);
          setCustomLanguage(savedLanguage === 'English' ? '' : savedLanguage);
        }
        setLearningPrompt(preferences.learning_prompt || '');
        setDisplayName(preferences.display_name || user?.display_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '');
        setAvatarDataUrl(preferences.avatar_data_url || user?.avatar_data_url || null);
      })
      .catch(() => { if (active) setEmailPreferenceMessage('Your saved preferences could not be loaded.'); });
    return () => { active = false; };
  }, [isAuthenticated, isOpen, user?.avatar_data_url, user?.display_name, user?.first_name, user?.last_name]);

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

  const saveLearningPreferences = async () => {
    const language = preferredLanguage === OTHER_LANGUAGE ? customLanguage.trim() : preferredLanguage;
    if (!language) {
      setPreferenceError(true);
      setPreferenceMessage('Enter a language name before saving.');
      return;
    }
    setPreferenceBusy(true);
    setPreferenceError(false);
    setPreferenceMessage('');
    try {
      if (isAuthenticated) {
        const saved = await apiClient<SavedPreferences>('/api/preferences', {
          method: 'PATCH',
          body: { preferred_language: language, learning_prompt: learningPrompt.trim() || null, theme },
          requiresAuth: true,
        });
        const savedLanguage = saved.preferred_language || 'English';
        setPreferredLanguage(LANGUAGE_OPTIONS.includes(savedLanguage) && savedLanguage !== OTHER_LANGUAGE ? savedLanguage : OTHER_LANGUAGE);
        setCustomLanguage(savedLanguage === OTHER_LANGUAGE ? '' : LANGUAGE_OPTIONS.includes(savedLanguage) ? '' : savedLanguage);
        setLearningPrompt(saved.learning_prompt || '');
      } else {
        localStorage.setItem('stem_preferred_language', language);
        localStorage.setItem('stem_octa_learning_prompt', learningPrompt.trim());
      }
      setPreferenceMessage('Language and Octa learning preferences saved.');
    } catch {
      setPreferenceError(true);
      setPreferenceMessage('Your preferences could not be saved. Please try again.');
    } finally {
      setPreferenceBusy(false);
    }
  };

  const saveAccountProfile = async () => {
    if (!isAuthenticated) return;
    setProfileBusy(true);
    setProfileMessage('');
    try {
      const saved = await apiClient<SavedPreferences>('/api/preferences', {
        method: 'PATCH',
        body: { display_name: displayName.trim() || null, avatar_data_url: avatarDataUrl },
        requiresAuth: true,
      });
      setDisplayName(saved.display_name || '');
      setAvatarDataUrl(saved.avatar_data_url);
      try { await refreshUser(); } catch { /* The profile is saved; a page refresh will sync the menu. */ }
      setProfileMessage('Profile updated.');
    } catch {
      setProfileMessage('Your profile could not be saved. Please try again.');
    } finally {
      setProfileBusy(false);
    }
  };

  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setProfileMessage('Preparing photo…');
    try {
      setAvatarDataUrl(await optimizeAvatar(file));
      setProfileMessage('Photo ready. Save your profile to apply it.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'This photo could not be used.');
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/');
  };

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
      writeOctaConfig(updated);
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
      clearOctaConfig();
    } catch {}
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE' || deletingAccount) return;
    if (user?.is_owner) {
      setDeleteError('Owner accounts cannot be deleted from the public account settings.');
      return;
    }
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
            className={`settings-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          {isAuthenticated && (
            <button
              className={`settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Profile & Account
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

              {provider !== 'custom' && (
                <div className="settings-field">
                  <label className="settings-label" htmlFor="settings-api-key">API Key</label>
                  <div className="settings-input-wrapper">
                    <input
                      id="settings-api-key"
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
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}
              <p className="settings-key-note">Provider keys stay in this browser tab only and are cleared when its session ends. They are sent to the STEM Studio backend when Octa uses them; avoid configuring a key on a shared device.</p>

              <section className="settings-ai-explanation-setting" aria-labelledby="settings-ai-explanation-title">
                <div>
                  <h4 id="settings-ai-explanation-title">AI-generated step explanations</h4>
                  <p>Use your connected model for the current step in Execution Trace. Built-in explanations remain available when this is off or no model is connected.</p>
                </div>
                <label>
                  <span className="sr-only">Use AI-generated step explanations</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={aiExplanationsEnabled}
                    aria-checked={aiExplanationsEnabled}
                    onChange={(event) => {
                      setAIExplanationsEnabled(event.target.checked);
                      writeAIExplanationsEnabled(event.target.checked);
                    }}
                    aria-label="Use AI-generated step explanations"
                  />
                </label>
              </section>

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

          {activeTab === 'preferences' && (
            <>
              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-theme">Interface theme</label>
                <select
                  id="settings-theme"
                  className="settings-select"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as 'light' | 'dark')}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <section className="settings-style-section" aria-labelledby="settings-style-title">
                <div className="settings-style-heading">
                  <h4 id="settings-style-title">Interface style</h4>
                  <p>Choose a surface style for the whole app. Your choice is saved on this device.</p>
                </div>
                <div className="settings-style-grid" role="group" aria-label="Interface style">
                  {UI_STYLE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`settings-style-option ${uiStyle === option.id ? 'active' : ''}`}
                      aria-pressed={uiStyle === option.id}
                      onClick={() => setUiStyle(option.id)}
                    >
                      <span className={`settings-style-preview ${option.id}`} aria-hidden="true">
                        <span className="settings-style-preview-header"><i /><i /><i /></span>
                        <span className="settings-style-preview-search"><i /> Search…</span>
                        <span className="settings-style-preview-card" />
                      </span>
                      <span className="settings-style-copy">
                        <strong>{option.title}</strong>
                        <span>{option.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-language">Preferred language for Octa</label>
                <select
                  id="settings-language"
                  className="settings-select"
                  value={LANGUAGE_OPTIONS.includes(preferredLanguage) ? preferredLanguage : OTHER_LANGUAGE}
                  onChange={(event) => setPreferredLanguage(event.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((language) => <option key={language} value={language}>{language}</option>)}
                </select>
                {preferredLanguage === OTHER_LANGUAGE && (
                  <input
                    className="settings-input"
                    value={customLanguage}
                    onChange={(event) => setCustomLanguage(event.target.value)}
                    maxLength={80}
                    placeholder="Enter any language name"
                    aria-label="Other preferred language"
                  />
                )}
                <p className="settings-help-text">English is the default. Octa uses this language when a model API is connected; the app interface is currently in English.</p>
              </div>

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-learning-prompt">Octa learning instructions</label>
                <textarea
                  id="settings-learning-prompt"
                  className="settings-input settings-textarea"
                  value={learningPrompt}
                  onChange={(event) => setLearningPrompt(event.target.value)}
                  maxLength={1200}
                  placeholder="For example: connect concepts to practical engineering examples, define new terms, and ask one quick check-for-understanding question."
                />
                <p className="settings-help-text">A connected model uses these preferences when they fit the topic and keep the explanation accurate. {learningPrompt.length}/1200</p>
              </div>
              {preferenceMessage && <p className={`settings-preference-status ${preferenceError ? 'error' : ''}`} role={preferenceError ? 'alert' : 'status'}>{preferenceMessage}</p>}
            </>
          )}

          {activeTab === 'account' && isAuthenticated && (
            <>
              <section className="settings-profile-card" aria-labelledby="settings-profile-title">
                <div className="settings-profile-heading">
                  <div>
                    <h4 id="settings-profile-title">Your profile</h4>
                    <p>Choose the name and photo shown in your account menu.</p>
                  </div>
                  <div className="settings-profile-avatar">
                    {avatarDataUrl ? <img src={avatarDataUrl} alt="Profile preview" /> : <UserRound size={25} aria-hidden="true" />}
                  </div>
                </div>
                <label className="settings-label" htmlFor="settings-display-name">Display name</label>
                <input
                  id="settings-display-name"
                  className="settings-input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={80}
                  placeholder={user?.username || 'Your name'}
                />
                <div className="settings-profile-actions">
                  <label className="settings-photo-button">
                    <Camera size={15} aria-hidden="true" /> Choose photo
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleAvatarFile(event)} />
                  </label>
                  {avatarDataUrl && <button type="button" className="settings-link-button" onClick={() => setAvatarDataUrl(null)}>Remove photo</button>}
                  <button type="button" className="btn-primary" onClick={() => void saveAccountProfile()} disabled={profileBusy}>
                    <Save size={14} aria-hidden="true" /> {profileBusy ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
                {profileMessage && <p className="settings-preference-status" role="status">{profileMessage}</p>}
                <p className="settings-help-text">Signed in as {user?.email}. Profile photos are resized before they are saved.</p>
              </section>

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

              <section className="settings-account-actions" aria-label="Account actions">
                <div>
                  <h4>Sign out</h4>
                  <p>Sign out of this device. You can sign back in at any time.</p>
                </div>
                <button type="button" className="btn-secondary settings-logout-button" onClick={() => void handleLogout()}>
                  <LogOut size={15} aria-hidden="true" /> Log out
                </button>
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
                disabled={deleteConfirmation !== 'DELETE' || deletingAccount || Boolean(user?.is_owner)}
              >
                {deletingAccount ? 'Deleting account…' : 'Delete account permanently'}
              </button>
              {user?.is_owner && <p className="settings-danger-note">Owner accounts cannot be deleted from this settings page.</p>}
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
          ) : activeTab === 'preferences' ? (
            <>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => void saveLearningPreferences()} disabled={preferenceBusy}>
                {preferenceBusy ? 'Saving…' : 'Save preferences'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={handleReset}>
                Reset Defaults
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {activeTab === 'ai' && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
