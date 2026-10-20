import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../api/apiClient';
import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from '../api/tokenStorage';
import { rememberUsername } from '../api/authPreferences';
import { clearOctaConfig } from '../api/octaConfigStorage';

interface UserData {
  user_id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_verified: boolean;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: (credential: string, clientId: string, rememberMe?: boolean) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let attempt = 0;
    try {
      while (true) {
        try {
          const userData = await apiClient<UserData>('/api/auth/me', { requiresAuth: true });
          setUser(userData);
          return;
        } catch (error) {
          const credentialsRejected = error instanceof ApiError &&
            (error.status === 401 || error.status === 403);
          if (credentialsRejected) {
            clearTokens();
            setUser(null);
            return;
          }

          // A network error or server outage is not proof that the account or
          // its session is gone. Keep the refresh credential and make one
          // short retry before showing the signed-out routes.
          if (attempt === 0 && getAccessToken()) {
            attempt += 1;
            await new Promise((resolve) => window.setTimeout(resolve, 800));
            continue;
          }

          setUser(null);
          return;
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const restoreSessionOnFocus = () => {
      if (!user && getAccessToken()) void fetchUser();
    };
    window.addEventListener('focus', restoreSessionOnFocus);
    return () => window.removeEventListener('focus', restoreSessionOnFocus);
  }, [fetchUser, user]);

  const login = async (identifier: string, password: string, rememberMe = false) => {
    const cleanId = identifier ? identifier.trim() : '';
    const data = await apiClient<{ access_token: string; refresh_token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: {
          username: cleanId,
          password,
          remember_me: rememberMe,
        },
      }
    );

    // Remember me → localStorage (survives browser restarts); otherwise
    // sessionStorage (cleared when the browser closes).
    storeTokens(data.access_token, data.refresh_token, rememberMe);
    rememberUsername(cleanId);

    // Fetch user profile after login
    const userData = await apiClient<UserData>('/api/auth/me', { requiresAuth: true });
    setUser(userData);
  };

  const signup = async (
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    await apiClient('/api/auth/signup', {
      method: 'POST',
      body: {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      },
    });
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient('/api/auth/logout', {
          method: 'POST',
          body: { refresh_token: refreshToken },
          requiresAuth: true,
        });
      } catch {
        // Even if server logout fails, clear local state
      }
    }

    clearTokens();
    clearOctaConfig();
    setUser(null);
  };

  const deleteAccount = async () => {
    await apiClient('/api/auth/me', {
      method: 'DELETE',
      body: { confirmation: 'DELETE' },
      requiresAuth: true,
    });
    clearTokens();
    clearOctaConfig();
    setUser(null);
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const data = await apiClient<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
    return data.message;
  };

  const resetPassword = async (token: string, newPassword: string): Promise<string> => {
    const data = await apiClient<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: { token, new_password: newPassword },
    });
    return data.message;
  };

  const loginWithGoogle = async (credential: string, clientId: string, rememberMe = false) => {
    const data = await apiClient<{ access_token: string; refresh_token: string }>(
      '/api/auth/google',
      {
        method: 'POST',
        body: { credential, client_id: clientId, remember_me: rememberMe },
      }
    );
    storeTokens(data.access_token, data.refresh_token, rememberMe);
    const userData = await apiClient<UserData>('/api/auth/me', { requiresAuth: true });
    rememberUsername(userData.username);
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        signup,
        logout,
        deleteAccount,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { ApiError };
