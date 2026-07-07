export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  blue: string;
  shadow: string;
};

export const themes: Record<ThemeMode, AppTheme> = {
  light: {
    mode: 'light',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2F7',
    text: '#111827',
    muted: '#64748B',
    border: '#E2E8F0',
    primary: '#4F46E5',
    primarySoft: '#E0E7FF',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    blue: '#0284C7',
    shadow: '#0F172A',
  },
  dark: {
    mode: 'dark',
    background: '#0B1120',
    surface: '#111827',
    surfaceAlt: '#1F2937',
    text: '#F8FAFC',
    muted: '#94A3B8',
    border: '#263244',
    primary: '#818CF8',
    primarySoft: '#1E1B4B',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    blue: '#38BDF8',
    shadow: '#000000',
  },
};
