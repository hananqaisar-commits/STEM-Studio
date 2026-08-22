import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../api/apiClient';

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
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiClient<UserData>('/api/auth/me', { requiresAuth: true });
      setUser(userData);
    } catch {
      // Token invalid, clear stored tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await apiClient<{ access_token: string; refresh_token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: { email, password },
      }
    );

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    // Fetch user profile after login
    const userData = await apiClient<UserData>('/api/auth/me', { requiresAuth: true });
    setUser(userData);
  };

  const signup = async (username: string, email: string, password: string) => {
    await apiClient('/api/auth/signup', {
      method: 'POST',
      body: { username, email, password },
    });
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
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

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const data = await apiClient<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
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
