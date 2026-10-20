import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from './tokenStorage';

// Use the Vite proxy during local development so the browser never has to make
// a cross-origin request to the loopback API. Production can target a separate
// API host through VITE_API_BASE_URL.
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL ?? '');

type RefreshResult = 'refreshed' | 'rejected' | 'unavailable';
let refreshInFlight: Promise<RefreshResult> | null = null;
let ownerCsrfToken: string | null = null;

export function setOwnerCsrfToken(token: string | null): void {
  ownerCsrfToken = token;
}

export async function refreshOwnerCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf-token`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) throw new ApiError(response.status, 'Unable to initialize the secure owner session.');
  const data = await response.json();
  if (typeof data?.csrf_token !== 'string') throw new ApiError(500, 'Invalid CSRF token response.');
  const token = data.csrf_token as string;
  ownerCsrfToken = token;
  return token;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

/**
 * Centralized API client with automatic JWT handling and token refresh.
 */
export async function apiClient<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, requiresAuth = false } = options;
  const upperMethod = method.toUpperCase();
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(upperMethod);

  if (isWrite && !ownerCsrfToken && !endpoint.endsWith('/login') && !endpoint.endsWith('/signup') && !endpoint.endsWith('/google')) {
    try { await refreshOwnerCsrfToken(); } catch { /* ordinary user writes do not require an owner CSRF token */ }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (isWrite && ownerCsrfToken) headers['X-CSRF-Token'] = ownerCsrfToken;

  // Attach access token if required
  if (requiresAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If 401 and we have a refresh token, try to refresh
  if (response.status === 401 && requiresAuth) {
    const refreshResult = await tryRefreshToken();
    if (refreshResult === 'refreshed') {
      // Retry the original request with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers });
    } else if (refreshResult === 'unavailable') {
      // Preserve the user's session when refresh failed due to a transient
      // network, throttling, or server error. Returning the original 401 here
      // would make AuthContext mistake that outage for an expired session.
      throw new ApiError(503, 'Session refresh is temporarily unavailable. Please try again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
    // FastAPI validation errors return detail as an array of objects;
    // ensure we always produce a human-readable string with field context.
    let detail = errorData.detail ?? 'Request failed';
    if (typeof detail !== 'string') {
      if (Array.isArray(detail)) {
        detail = detail
          .map((d: any) => {
            const loc = Array.isArray(d?.loc) ? d.loc.filter((item: any) => item !== 'body').join('.') : '';
            const msg = d?.msg || JSON.stringify(d);
            return loc ? `${loc}: ${msg}` : msg;
          })
          .join('; ');
      } else {
        detail = JSON.stringify(detail);
      }
    }
    throw new ApiError(response.status, detail);
  }

  return response.json();
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 */
async function tryRefreshToken(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    const refresh = typeof navigator !== 'undefined' && 'locks' in navigator
      ? navigator.locks.request('stem-studio-refresh-token', requestTokenRefresh)
      : requestTokenRefresh();
    refreshInFlight = refresh.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function requestTokenRefresh(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();
  if (!ownerCsrfToken) {
    try { await refreshOwnerCsrfToken(); } catch { /* regular refresh-token flow may still succeed */ }
  }

  // Preserve the storage the session was created in: remembered sessions
  // (localStorage) stay remembered, short-lived ones (sessionStorage)
  // still vanish when the browser closes.
  const remembered = localStorage.getItem('refresh_token') === refreshToken;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ownerCsrfToken ? { 'X-CSRF-Token': ownerCsrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        // These responses mean the stored refresh credential is invalid,
        // expired, or revoked. Do not clear credentials for 429/5xx responses.
        clearTokens();
        return 'rejected';
      }
      return 'unavailable';
    }

    const data = await response.json();
    if (data?.owner_session === true) {
      if (typeof data.csrf_token === 'string') ownerCsrfToken = data.csrf_token;
      return 'refreshed';
    }
    if (typeof data?.access_token !== 'string' || typeof data?.refresh_token !== 'string') {
      return 'unavailable';
    }
    storeTokens(data.access_token, data.refresh_token, remembered);
    return 'refreshed';
  } catch {
    return 'unavailable';
  }
}

/**
 * Custom API error class.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
