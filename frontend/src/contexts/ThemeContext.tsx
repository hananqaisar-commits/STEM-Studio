import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/apiClient';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    // Legacy theme names fall back to the new blue light theme
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return 'light';
  });

  const [actualTheme, setActualTheme] = useState<Theme>('light');
  const [remoteReady, setRemoteReady] = useState(false);
  const lastSyncedTheme = useRef<Theme | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      lastSyncedTheme.current = null;
      setRemoteReady(true);
      return;
    }
    let active = true;
    setRemoteReady(false);
    lastSyncedTheme.current = null;
    apiClient<{ theme: Theme | null }>('/api/preferences', { requiresAuth: true })
      .then(({ theme: savedTheme }) => {
        if (!active) return;
        if (savedTheme === 'light' || savedTheme === 'dark') {
          lastSyncedTheme.current = savedTheme;
          setThemeState(savedTheme);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setRemoteReady(true); });
    return () => { active = false; };
  }, [isAuthenticated, isLoading, user?.user_id]);

  useEffect(() => {
    localStorage.setItem('app-theme', theme);

    const applyTheme = (t: Theme) => {
      const root = window.document.documentElement;
      root.setAttribute('data-theme', t);
      if (t === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setActualTheme(t);
    };

    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!remoteReady || !isAuthenticated || !user || lastSyncedTheme.current === theme) return;
    lastSyncedTheme.current = theme;
    void apiClient('/api/preferences', {
      method: 'PATCH',
      body: { theme },
      requiresAuth: true,
    }).catch(() => { lastSyncedTheme.current = null; });
  }, [isAuthenticated, remoteReady, theme, user]);

  const setTheme = useCallback((nextTheme: Theme) => setThemeState(nextTheme), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
