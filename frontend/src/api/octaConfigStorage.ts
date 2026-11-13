import type { UserLLMConfig } from './octaTutorApi';
import { deleteTutorConfig, getSavedTutorConfig, saveTutorConfig } from './octaTutorApi';

const LEGACY_STORAGE_KEY = 'octa_llm_config';
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

/** API keys live only in the account database; browser storage keeps no secret. */
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

/** Forget only the current device's in-memory provider selection on logout. */
export function clearOctaConfig(): void {
  activeUserId = null;
  activeConfig = { ...DEFAULT_OCTA_CONFIG };
  removeLegacyBrowserCredential();
  notifySettingsChanged();
}
