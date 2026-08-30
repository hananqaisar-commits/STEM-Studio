import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../api/apiClient';
import { getAccessToken, getRefreshToken, storeTokens, clearTokens } from '../api/tokenStorage';

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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiClient<UserData>('/api/auth/me', { requiresAuth: true });
      setUser(userData);
    } catch {
      // Token invalid, clear stored tokens
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string, rememberMe = false) => {
    const data = await apiClient<{ access_token: string; refresh_token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: { email, password, remember_me: rememberMe },
      }
    );

    // Remember me → localStorage (survives browser restarts); otherwise
    // sessionStorage (cleared when the browser closes).
    storeTokens(data.access_token, data.refresh_token, rememberMe);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
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
