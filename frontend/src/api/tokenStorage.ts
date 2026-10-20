/**
 * Central auth-token storage.
 *
 * "Remember me" checked  → tokens live in localStorage and survive browser
 *                          restarts (paired with the extended 30-day
 *                          refresh-token lifetime issued by the backend).
 * "Remember me" unchecked → tokens live in sessionStorage, which the browser
 *                          clears when the tab/browser closes, logging the
 *                          user out automatically.
 *
 * Reads check sessionStorage first so a short-lived session always wins over
 * stale remembered tokens; writes/deletes touch both storages so switching
 * modes on a later login never leaves an old token behind.
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string, rememberMe: boolean): void {
  clearTokens();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
