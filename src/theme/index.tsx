import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

/**
 * Palette derived from the Finora reference: a light, low-contrast, soft-glass surface language.
 *
 * One restrained violet-blue accent, near-black ink, and semantic colour reserved for state.
 * Chart hues (rose, green, amber) appear only inside data visualisation, never as decoration.
 * The dark palette is a calm counterpart for the Appearance toggle, not a second identity.
 */
const light = {
  mode: 'light' as const,
  background: '#F3F3F7',
  backgroundGlow: '#E7E3F4',
  panel: '#FFFFFF',
  panelRaised: '#FCFCFE',
  field: '#EFEFF4',
  border: '#E3E3EA',
  borderStrong: '#C9C9D6',
  text: '#0C0D12',
  textSoft: '#3B3D45',
  textMuted: '#71737C',
  accent: '#625BD8',
  accentStrong: '#4F48C8',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(98,91,216,0.10)',
  accentGradient: ['#8F89EC', '#625BD8'] as [string, string],
  success: '#1F8A4C',
  successSoft: 'rgba(31,138,76,0.10)',
  warning: '#A9690A',
  warningSoft: 'rgba(169,105,10,0.10)',
  danger: '#C2415A',
  dangerSoft: 'rgba(194,65,90,0.10)',
  greySoft: 'rgba(12,13,18,0.05)',
  overlay: 'rgba(12,13,18,0.40)',
  shadow: { color: '#2A2440', opacity: 0.08, radius: 20, elevation: 4 },
};

export type Theme = Omit<typeof light, 'mode'> & { mode: 'light' | 'dark' };

const dark: Theme = {
  ...light,
  mode: 'dark',
  background: '#101014',
  backgroundGlow: '#232036',
  panel: '#17171D',
  panelRaised: '#1D1D25',
  field: '#22222B',
  border: '#2E2E39',
  borderStrong: '#43434F',
  text: '#F6F6F8',
  textSoft: '#CFCFD8',
  textMuted: '#8E8F9A',
  accent: '#8B84F0',
  accentStrong: '#A29BF6',
  accentInk: '#12121A',
  accentSoft: 'rgba(139,132,240,0.16)',
  accentGradient: ['#6C64E0', '#A79FF5'] as [string, string],
  success: '#3DD68C',
  successSoft: 'rgba(61,214,140,0.14)',
  warning: '#F0B429',
  warningSoft: 'rgba(240,180,41,0.14)',
  danger: '#F0738C',
  dangerSoft: 'rgba(240,115,140,0.14)',
  greySoft: 'rgba(246,246,248,0.08)',
  overlay: 'rgba(6,6,10,0.62)',
  shadow: { color: '#050409', opacity: 0.5, radius: 18, elevation: 10 },
};

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const Context = createContext<ThemeValue | null>(null);
/**
 * Bumped when the shipped default flips from dark to light, so a previously persisted default
 * cannot silently override the new one. An explicit user choice made after this point still wins.
 */
const STORAGE_KEY = 'polyclaw.theme.v2';

export function PolyClawThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'light' ? 'light' : 'dark';
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

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
export const layout = { phoneGutter: 8, largeScreenGutter: 16, onboardingGutter: 16, controlRadius: 16, largeScreenBreakpoint: 768 } as const;
export const fonts = {
  display: 'Manrope_700Bold',
  displayExtraBold: 'Manrope_800ExtraBold',
  /** Oversized light-weight secondary headline, matching the reference's bold + light pairing. */
  displayLight: 'Manrope_300Light',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const motion = {
  press: { stiffness: 420, damping: 40, mass: 1 },
  enter: { stiffness: 260, damping: 22, mass: 1 },
  settle: { stiffness: 180, damping: 27, mass: 1 },
  fast: { duration: 140 },
  base: { duration: 220 },
} as const;
