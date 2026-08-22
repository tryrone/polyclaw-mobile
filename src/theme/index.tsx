import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

const dark = {
  mode: 'dark' as const,
  background: '#08060F',
  backgroundGlow: '#241A47',
  panel: '#0F0C18',
  panelRaised: '#141020',
  field: '#191427',
  border: '#2B2440',
  borderStrong: '#40365C',
  text: '#F8F8F8',
  textMuted: '#9B96AB',
  textSoft: '#D0CBDE',
  accent: '#A78BFA',
  accentStrong: '#8B5CF6',
  accentInk: '#150A2E',
  accentSoft: 'rgba(167,139,250,0.14)',
  accentGradient: ['#6D28D9', '#C4B5FD'] as [string, string],
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.13)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.13)',
  danger: '#FB7185',
  dangerSoft: 'rgba(251,113,133,0.13)',
  greySoft: 'rgba(155,150,171,0.12)',
  overlay: 'rgba(4,2,10,0.62)',
  shadow: { color: '#050309', opacity: 0.55, radius: 18, elevation: 10 },
};

export type Theme = Omit<typeof dark, 'mode'> & { mode: 'light' | 'dark' };

const light: Theme = {
  ...dark,
  mode: 'light',
  background: '#F7F6FB',
  backgroundGlow: '#E6DEFA',
  panel: '#FFFFFF',
  panelRaised: '#FBFAFE',
  field: '#EFEDF7',
  border: '#DFDBEC',
  borderStrong: '#BCB4D6',
  text: '#131019',
  textMuted: '#67627A',
  textSoft: '#3A3547',
  accent: '#7C3AED',
  accentStrong: '#6D28D9',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(124,58,237,0.09)',
  accentGradient: ['#7C3AED', '#A78BFA'] as [string, string],
  success: '#047857',
  successSoft: 'rgba(4,120,87,0.10)',
  warning: '#92610B',
  warningSoft: 'rgba(146,97,11,0.10)',
  danger: '#BE123C',
  dangerSoft: 'rgba(190,18,60,0.08)',
  greySoft: 'rgba(60,55,75,0.07)',
  overlay: 'rgba(19,16,25,0.42)',
  shadow: { color: '#221B38', opacity: 0.1, radius: 16, elevation: 6 },
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

export const motion = {
  press: { stiffness: 420, damping: 40, mass: 1 },
  enter: { stiffness: 260, damping: 22, mass: 1 },
  settle: { stiffness: 180, damping: 27, mass: 1 },
  fast: { duration: 140 },
  base: { duration: 220 },
} as const;
