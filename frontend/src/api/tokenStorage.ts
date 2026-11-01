import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Web sessions use browser storage. Native sessions keep token material in
 * Android Keystore-backed / iOS Keychain-backed secure storage and expose only
 * an in-memory copy to the API client after app startup.
 */
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REMEMBERED_SESSION_KEY = 'remembered_session';
const SECURE_STORAGE_PREFIX = 'stem-studio-auth';
const isNative = Capacitor.isNativePlatform();

let initialized = !isNative;
let initialization: Promise<void> | null = null;
let nativeAccessToken: string | null = null;
let nativeRefreshToken: string | null = null;
let nativeRememberedSession = true;

function clearLegacyWebTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function removeNativeTokens(): Promise<void> {
  await Promise.all([
    SecureStorage.removeItem(ACCESS_TOKEN_KEY),
    SecureStorage.removeItem(REFRESH_TOKEN_KEY),
    SecureStorage.removeItem(REMEMBERED_SESSION_KEY),
  ]);
}

export async function initializeTokenStorage(): Promise<void> {
  if (!isNative || initialized) return;
  if (!initialization) {
    initialization = (async () => {
      await SecureStorage.setKeyPrefix(SECURE_STORAGE_PREFIX);
      const [secureAccess, secureRefresh, rememberedMode] = await Promise.all([
        SecureStorage.getItem(ACCESS_TOKEN_KEY),
        SecureStorage.getItem(REFRESH_TOKEN_KEY),
        SecureStorage.getItem(REMEMBERED_SESSION_KEY),
      ]);

      if (secureAccess && secureRefresh && rememberedMode !== 'session') {
        nativeAccessToken = secureAccess;
        nativeRefreshToken = secureRefresh;
        nativeRememberedSession = true;
        clearLegacyWebTokens();
        initialized = true;
        return;
      }

      // A session-only native login is intentionally cleared on the next app
      // launch. A remembered session survives app restarts using native secure
      // storage, while the backend still rotates and expires refresh tokens.
      if (rememberedMode === 'session') {
        await removeNativeTokens();
        clearLegacyWebTokens();
        nativeAccessToken = null;
        nativeRefreshToken = null;
        nativeRememberedSession = false;
        initialized = true;
        return;
      }

      if (secureAccess || secureRefresh) await removeNativeTokens();

      // Upgrade tokens created by an earlier Capacitor WebView build.
      const legacyAccess = sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
      const legacyRefresh = sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
      if (legacyAccess && legacyRefresh) {
        nativeRememberedSession = localStorage.getItem(REFRESH_TOKEN_KEY) === legacyRefresh;
        await SecureStorage.setItem(ACCESS_TOKEN_KEY, legacyAccess);
        await SecureStorage.setItem(REFRESH_TOKEN_KEY, legacyRefresh);
        await SecureStorage.setItem(REMEMBERED_SESSION_KEY, nativeRememberedSession ? 'remembered' : 'session');
        nativeAccessToken = legacyAccess;
        nativeRefreshToken = legacyRefresh;
      } else {
        nativeAccessToken = null;
        nativeRefreshToken = null;
        nativeRememberedSession = true;
      }
      clearLegacyWebTokens();
      initialized = true;
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

export function getAccessToken(): string | null {
  if (isNative) return initialized ? nativeAccessToken : null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (isNative) return initialized ? nativeRefreshToken : null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function isRememberedSession(): boolean {
  if (isNative) return nativeRememberedSession;
  const refreshToken = getRefreshToken();
  return !!refreshToken && localStorage.getItem(REFRESH_TOKEN_KEY) === refreshToken;
}

export async function storeTokens(accessToken: string, refreshToken: string, rememberMe: boolean): Promise<void> {
  await initializeTokenStorage();
  if (isNative) {
    await SecureStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await SecureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await SecureStorage.setItem(REMEMBERED_SESSION_KEY, rememberMe ? 'remembered' : 'session');
    nativeAccessToken = accessToken;
    nativeRefreshToken = refreshToken;
    nativeRememberedSession = rememberMe;
    clearLegacyWebTokens();
    return;
  }

  await clearTokens();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (isNative) {
    await initializeTokenStorage();
    await removeNativeTokens();
    nativeAccessToken = null;
    nativeRefreshToken = null;
    nativeRememberedSession = false;
  }
}
