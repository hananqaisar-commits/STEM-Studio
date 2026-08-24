import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'grayscale-light' | 'warm-light' | 'dark' | 'warm-neutral' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'grayscale-light' | 'warm-light' | 'dark' | 'warm-neutral';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    return savedTheme || 'grayscale-light';
  });

  const [actualTheme, setActualTheme] = useState<'grayscale-light' | 'warm-light' | 'dark' | 'warm-neutral'>('grayscale-light');

  useEffect(() => {
    localStorage.setItem('app-theme', theme);

    const applyTheme = (t: Theme) => {
      const root = window.document.documentElement;
      
      if (t === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolved = systemPrefersDark ? 'dark' : 'grayscale-light';
        root.setAttribute('data-theme', resolved);
        setActualTheme(resolved);
      } else {
        root.setAttribute('data-theme', t);
        setActualTheme(t);
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const resolved = e.matches ? 'dark' : 'grayscale-light';
        const root = window.document.documentElement;
        root.setAttribute('data-theme', resolved);
        setActualTheme(resolved);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, actualTheme }}>
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
