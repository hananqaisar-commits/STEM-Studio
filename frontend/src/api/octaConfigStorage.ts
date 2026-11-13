import type { UserLLMConfig } from './octaTutorApi';
import { deleteTutorConfig, getSavedTutorConfig, saveTutorConfig } from './octaTutorApi';

const LEGACY_STORAGE_KEY = 'octa_llm_config';
const AI_EXPLANATIONS_KEY = 'octa_ai_step_explanations_enabled';

export const OCTA_SETTINGS_CHANGE_EVENT = 'octa-settings-change';

function notifySettingsChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OCTA_SETTINGS_CHANGE_EVENT));
}

export const DEFAULT_OCTA_CONFIG: UserLLMConfig = {
  provider: 'dashscope',
  apiKey: '',
  apiKeyConfigured: false,
  baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  modelName: 'qwen-plus',
};

let activeUserId: number | null = null;
let activeConfig: UserLLMConfig = { ...DEFAULT_OCTA_CONFIG };

function removeLegacyBrowserCredential(): void {
  try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* storage may be unavailable */ }
  try { sessionStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* storage may be unavailable */ }
}

/**
 * API credentials are never persisted in Web Storage. The server owns the
 * encrypted, account-scoped copy; this module only keeps a secret in memory
 * while the user is actively editing the form.
 */
export function readOctaConfig(): UserLLMConfig {
  removeLegacyBrowserCredential();
  return { ...activeConfig };
}

export function activateOctaConfigUser(userId: number | null): void {
  if (activeUserId === userId) return;
  activeUserId = userId;
  activeConfig = { ...DEFAULT_OCTA_CONFIG };
  removeLegacyBrowserCredential();
  notifySettingsChanged();
}

export async function loadOctaConfig(userId: number): Promise<UserLLMConfig> {
  activateOctaConfigUser(userId);
  const config = await getSavedTutorConfig();
  if (activeUserId === userId) {
    activeConfig = { ...config, apiKey: '' };
    notifySettingsChanged();
  }
  return { ...config, apiKey: '' };
}

export async function persistOctaConfig(userId: number, config: UserLLMConfig): Promise<UserLLMConfig> {
  activateOctaConfigUser(userId);
  const saved = await saveTutorConfig(config);
  if (activeUserId === userId) {
    activeConfig = { ...saved, apiKey: '' };
    notifySettingsChanged();
  }
  return { ...saved, apiKey: '' };
}

export async function resetPersistedOctaConfig(userId: number): Promise<UserLLMConfig> {
  activateOctaConfigUser(userId);
  const reset = await deleteTutorConfig();
  if (activeUserId === userId) {
    activeConfig = { ...reset, apiKey: '' };
    notifySettingsChanged();
  }
  return { ...reset, apiKey: '' };
}

/** Forget only this device's in-memory state on logout/account switch. */
export function clearOctaConfig(): void {
  activeUserId = null;
  activeConfig = { ...DEFAULT_OCTA_CONFIG };
  removeLegacyBrowserCredential();
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
  } catch { /* keep the current session usable if storage is blocked */ }
  notifySettingsChanged();
}
