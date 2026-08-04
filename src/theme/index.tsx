import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

const dark = {
  mode: 'dark' as const,
  background: '#030704',
  backgroundGlow: '#17350f',
  panel: '#0a0f0b',
  panelRaised: '#101711',
  field: '#151c16',
  border: '#263027',
  borderStrong: '#3c4b3e',
  text: '#f8f8f8',
  textMuted: '#9fa3a1',
  textSoft: '#cfd4cf',
  lime: '#baff63',
  limeStrong: '#88fe2a',
  limeInk: '#102500',
  limeSoft: 'rgba(136,254,42,0.12)',
  amber: '#f5c451',
  amberSoft: 'rgba(245,196,81,0.13)',
  red: '#ff766f',
  redSoft: 'rgba(255,118,111,0.13)',
  greySoft: 'rgba(159,163,161,0.12)',
  overlay: 'rgba(0,0,0,0.62)',
};

export type Theme = Omit<typeof dark, 'mode'> & { mode: 'light' | 'dark' };

const light: Theme = {
  ...dark,
  mode: 'light',
  background: '#f3f5f1',
  backgroundGlow: '#d9eccd',
  panel: '#ffffff',
  panelRaised: '#f9fbf7',
  field: '#eef2ec',
  border: '#dce3d8',
  borderStrong: '#b6c2b1',
  text: '#101510',
  textMuted: '#657064',
  textSoft: '#344033',
  lime: '#4f9f14',
  limeStrong: '#3d8210',
  limeInk: '#ffffff',
  limeSoft: 'rgba(79,159,20,0.12)',
  amber: '#9c6900',
  amberSoft: 'rgba(156,105,0,0.12)',
  red: '#bd2923',
  redSoft: 'rgba(189,41,35,0.10)',
  greySoft: 'rgba(60,70,60,0.08)',
  overlay: 'rgba(12,18,12,0.42)',
};

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const Context = createContext<ThemeValue | null>(null);
const STORAGE_KEY = 'polyclaw.theme';

export function PolyClawThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'light' ? 'light' : 'dark';
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'system' || value === 'light' || value === 'dark') setPreferenceState(value);
    }).catch(() => undefined);
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  };
  const selected = preference === 'system' ? system : preference;
  const value = useMemo(() => ({ theme: selected === 'light' ? light : dark, preference, setPreference }), [selected, preference]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePolyClawTheme() {
  const value = useContext(Context);
  if (!value) throw new Error('usePolyClawTheme must be used inside PolyClawThemeProvider');
  return value;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
