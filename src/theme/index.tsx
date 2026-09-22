import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

/**
 * Ink-first, warm-neutral foundation; the supplied Minimal Apps reference informs the
 * hierarchy and restraint, not the exact assets.
 *
 * Violet is limited to active navigation, focus, selection and small brand cues. Green,
 * amber and red are semantic states only and are always paired with text or an icon.
 * Decorative gradients, lavender glows and default glass surfaces are removed.
 */
const light = {
  mode: 'light' as const,
  /** App background: warm near-white. */
  background: '#F7F7F4',
  /** Retained for compatibility; no decorative glow is rendered from this token. */
  backgroundGlow: '#F7F7F4',
  /** Primary surface. */
  panel: '#FFFFFF',
  /** Flat group surface; shadows are reserved for hero panels and sheets. */
  panelRaised: '#FFFFFF',
  /** Secondary field / group surface. */
  field: '#F0F0EC',
  /** Hairline separators. */
  border: '#D9D9D4',
  borderStrong: '#C4C4BE',
  /** Primary ink and primary actions. */
  text: '#111111',
  textSoft: '#3A3A36',
  /** Secondary text. */
  textMuted: '#66645F',
  accent: '#625BD8',
  accentStrong: '#4F48C8',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(98,91,216,0.10)',
  /** Neutralised: primary CTAs render as flat ink, not decorative violet gradients. */
  accentGradient: ['#111111', '#111111'] as [string, string],
  success: '#1F7A45',
  successSoft: 'rgba(31,122,69,0.10)',
  warning: '#8A5A00',
  warningSoft: 'rgba(138,90,0,0.10)',
  danger: '#B23A48',
  dangerSoft: 'rgba(178,58,72,0.10)',
  greySoft: 'rgba(17,17,17,0.05)',
  overlay: 'rgba(17,17,17,0.40)',
  shadow: { color: '#111111', opacity: 0.05, radius: 12, elevation: 1 },
};

export type Theme = Omit<typeof light, 'mode'> & { mode: 'light' | 'dark' };

/** System dark appearance, not a second identity. */
const dark: Theme = {
  ...light,
  mode: 'dark',
  background: '#0E0E0F',
  backgroundGlow: '#0E0E0F',
  panel: '#17171A',
  panelRaised: '#1D1D21',
  field: '#232327',
  border: '#2E2E33',
  borderStrong: '#43434A',
  text: '#F4F4F2',
  textSoft: '#C9C9C4',
  textMuted: '#8A8A85',
  accent: '#8B84F0',
  accentStrong: '#A29BF6',
  accentInk: '#121214',
  accentSoft: 'rgba(139,132,240,0.16)',
  accentGradient: ['#3A3A40', '#2A2A30'] as [string, string],
  success: '#4FCB8B',
  successSoft: 'rgba(79,203,139,0.14)',
  warning: '#E8B049',
  warningSoft: 'rgba(232,176,73,0.14)',
  danger: '#F07A88',
  dangerSoft: 'rgba(240,122,136,0.14)',
  greySoft: 'rgba(244,244,242,0.07)',
  overlay: 'rgba(8,8,8,0.62)',
  shadow: { color: '#000000', opacity: 0.4, radius: 12, elevation: 6 },
};

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const Context = createContext<ThemeValue | null>(null);
const STORAGE_KEY = 'polyclaw.theme.v3';

export function PolyClawThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'light' ? 'light' : 'dark';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

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

/** 4/8px spacing system with 16px screen gutters and 24–32px major separation. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** 16px standard radii; full pills and circles are reserved for compact controls and icons. */
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const layout = { phoneGutter: 16, largeScreenGutter: 16, onboardingGutter: 16, controlRadius: 16, largeScreenBreakpoint: 768 } as const;

export const fonts = {
  display: 'Manrope_600SemiBold',
  displayExtraBold: 'Manrope_700Bold',
  displayLight: 'Manrope_300Light',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

/** Tabular numerals for balances, prices, limits, shares and P&L. */
export const numeric = { fontVariant: ['tabular-nums'] as ('tabular-nums')[] };

/** Restrained 140–220ms fades, opacity changes and small scale feedback. */
export const motion = {
  press: { stiffness: 420, damping: 40, mass: 1 },
  enter: { stiffness: 260, damping: 30, mass: 1 },
  settle: { stiffness: 220, damping: 30, mass: 1 },
  fast: { duration: 140 },
  base: { duration: 200 },
  slow: { duration: 220 },
} as const;
