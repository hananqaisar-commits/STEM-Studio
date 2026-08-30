import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from './tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

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
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If 401 and we have a refresh token, try to refresh
  if (response.status === 401 && requiresAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the original request with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new ApiError(response.status, errorData.detail || 'Request failed');
  }

  return response.json();
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // Preserve the storage the session was created in: remembered sessions
  // (localStorage) stay remembered, short-lived ones (sessionStorage)
  // still vanish when the browser closes.
  const remembered = localStorage.getItem('refresh_token') === refreshToken;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is also invalid, clear everything
      clearTokens();
      return false;
    }

    const data = await response.json();
    storeTokens(data.access_token, data.refresh_token, remembered);
    return true;
  } catch {
    return false;
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
