import type { UserLLMConfig } from './octaTutorApi';

const STORAGE_KEY = 'octa_llm_config';
const AI_EXPLANATIONS_KEY = 'octa_ai_step_explanations_enabled';

export const OCTA_SETTINGS_CHANGE_EVENT = 'octa-settings-change';

function notifySettingsChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OCTA_SETTINGS_CHANGE_EVENT));
}

export const DEFAULT_OCTA_CONFIG: UserLLMConfig = {
  provider: 'dashscope',
  apiKey: '',
  baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  modelName: 'qwen-plus',
};

/** BYOK credentials live in this tab's session storage, never persistent local storage. */
export function readOctaConfig(): UserLLMConfig {
  try {
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as UserLLMConfig;
      localStorage.removeItem(STORAGE_KEY);
      if (parsed.apiKey) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return { ...DEFAULT_OCTA_CONFIG, ...parsed };
    }
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_OCTA_CONFIG, ...JSON.parse(saved) } : DEFAULT_OCTA_CONFIG;
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return DEFAULT_OCTA_CONFIG;
  }
}

export function writeOctaConfig(config: UserLLMConfig): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  notifySettingsChanged();
}

export function clearOctaConfig(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  notifySettingsChanged();
}

/** This is a non-secret user preference, so it persists across browser sessions. */
export function readAIExplanationsEnabled(): boolean {
  try {
    const saved = localStorage.getItem(AI_EXPLANATIONS_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function writeAIExplanationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AI_EXPLANATIONS_KEY, String(enabled));
  } catch {}
  notifySettingsChanged();
}
