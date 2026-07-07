import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppTheme, ThemeMode, themes } from '../theme/colors';

type ThemeContextValue = {
  mode: ThemeMode;
  theme: AppTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = 'flowtask-theme-mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedMode) => {
      if (mounted && (savedMode === 'light' || savedMode === 'dark')) {
        setMode(savedMode);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      mode,
      theme: themes[mode],
      toggleTheme: () =>
        setMode((current) => {
          const nextMode = current === 'light' ? 'dark' : 'light';
          AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
          return nextMode;
        }),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
