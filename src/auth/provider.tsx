import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { loginOperator, logoutOperator, operatorRequest, refreshOperator } from '@/lib/api';
import { readBiometricEnabled, readSession, writeBiometricEnabled, writeSession } from '@/lib/storage';
import type { AuthSession, OperatorEnvelope } from '@/lib/types';

type AuthState = 'hydrating' | 'anonymous' | 'authenticated';
type AuthValue = {
  state: AuthState;
  session: AuthSession | null;
  biometricSupported: boolean;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  unlockWithBiometric: () => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  request: <T>(path: string, init?: { method?: 'POST'; body?: Record<string, unknown>; idempotencyKey?: string }) => Promise<OperatorEnvelope<T>>;
};

const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('hydrating');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]).then(([hardware, enrolled]) => setBiometricSupported(hardware && enrolled)).catch(() => undefined);
    readBiometricEnabled().then(setBiometricEnabledState).catch(() => undefined);
  }, []);

  const save = useCallback(async (next: AuthSession | null) => {
    setSession(next);
    setState(next ? 'authenticated' : 'anonymous');
    await writeSession(next);
  }, []);

  useEffect(() => {
    readSession().then(async (stored) => {
      if (!stored) return save(null);
      if (new Date(stored.refreshExpiresAt).getTime() <= Date.now()) return save(null);
      if (new Date(stored.expiresAt).getTime() > Date.now() + 30_000) return save(stored);
      try { return save(await refreshOperator(stored.refreshToken)); }
      catch { return save(null); }
    }).catch(() => save(null));
  }, [save]);

  const signIn = useCallback(async (email: string, password: string) => save(await loginOperator(email.trim(), password)), [save]);
  const signOut = useCallback(async () => {
    if (session) await logoutOperator(session).catch(() => undefined);
    await save(null);
  }, [save, session]);
  const setBiometricEnabled = useCallback((enabled: boolean) => {
    setBiometricEnabledState(enabled);
    void writeBiometricEnabled(enabled);
  }, []);
  const unlockWithBiometric = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock PolyClaw', fallbackLabel: 'Use password' }).catch(() => ({ success: false } as const));
    return result.success;
  }, []);

  const freshSession = useCallback(async () => {
    if (!session) throw Object.assign(new Error('Sign in required'), { status: 401 });
    if (new Date(session.expiresAt).getTime() > Date.now() + 30_000) return session;
    const next = await refreshOperator(session.refreshToken);
    await save(next);
    return next;
  }, [save, session]);

  const request = useCallback(async <T,>(path: string, init?: { method?: 'POST'; body?: Record<string, unknown>; idempotencyKey?: string }) => {
    const active = await freshSession();
    try { return await operatorRequest<T>(path, active.accessToken, init); }
    catch (error) {
      if ((error as Error & { status?: number }).status !== 401) throw error;
      if (error instanceof Error && error.message.includes('Recent authentication')) throw error;
      try {
        const next = await refreshOperator(active.refreshToken);
        await save(next);
        return await operatorRequest<T>(path, next.accessToken, init);
      } catch (refreshError) {
        await save(null);
        throw refreshError;
      }
    }
  }, [freshSession, save]);

  const value = useMemo(() => ({ state, session, biometricSupported, biometricEnabled, setBiometricEnabled, unlockWithBiometric, signIn, signOut, request }), [state, session, biometricSupported, biometricEnabled, setBiometricEnabled, unlockWithBiometric, signIn, signOut, request]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
