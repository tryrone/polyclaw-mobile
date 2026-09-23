import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, type AppStateStatus } from 'react-native';
import { adminRequest, consumerRequest, loginUser, loginWithApple, logoutUser, operatorRequest, refreshUser, registerUser, type AdminProcedure, type ConsumerAutoTradeProcedure, type ConsumerProcedure } from '@/lib/api';
import { readBiometricEnabled, readSession, writeBiometricEnabled, writeSession } from '@/lib/storage';
import { signInWithGoogle as googleSignIn } from '@/auth/google';
import type { AuthSession, OperatorEnvelope } from '@/lib/types';
import { nextLockStateAfterSessionSave, recoveryBlocksProcedure, requiresMandatoryBiometric, shouldRelockAfterBackground } from '@/auth/biometric-policy';

type AuthState = 'hydrating' | 'anonymous' | 'authenticated';
type AuthValue = {
  state: AuthState;
  session: AuthSession | null;
  biometricSupported: boolean;
  biometricEnabled: boolean;
  biometricRequired: boolean;
  locked: boolean;
  recoveryMode: boolean;
  securityResolved: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  unlockWithBiometric: () => Promise<boolean>;
  markUnlocked: () => void;
  beginRecoveryReauthentication: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; name: string }) => Promise<void>;
  signInWithApple: (input: { identityToken: string; givenName?: string; familyName?: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  request: <T>(path: string, init?: { method?: 'POST'; body?: Record<string, unknown>; idempotencyKey?: string }) => Promise<OperatorEnvelope<T>>;
  consumer: <T>(procedure: ConsumerProcedure | ConsumerAutoTradeProcedure, input?: Record<string, unknown>) => Promise<T>;
  admin: <T>(procedure: AdminProcedure, input?: Record<string, unknown>) => Promise<T>;
};

const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('hydrating');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricRequired, setBiometricRequired] = useState(false);
  const [locked, setLocked] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [securityResolved, setSecurityResolved] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const recoveryPending = useRef(false);

  useEffect(() => {
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]).then(([hardware, enrolled]) => setBiometricSupported(hardware && enrolled)).catch(() => undefined);
    readBiometricEnabled().then(setBiometricEnabledState).catch(() => undefined);
  }, []);

  const save = useCallback(async (next: AuthSession | null, options: { preserveCurrentLock?: boolean } = {}) => {
    const pendingRecovery = recoveryPending.current;
    setSession(next);
    setState(next ? 'authenticated' : 'anonymous');
    setSecurityResolved(!next);
    setLocked((currentlyLocked) => nextLockStateAfterSessionSave({
      hasSession: Boolean(next),
      recoveryPending: pendingRecovery,
      preserveCurrentLock: options.preserveCurrentLock ?? false,
      currentlyLocked,
    }));
    if (next && pendingRecovery) {
      recoveryPending.current = false;
      setRecoveryMode(true);
    } else if (!next) setRecoveryMode(false);
    await writeSession(next);
  }, []);

  useEffect(() => {
    readSession().then(async (stored) => {
      if (!stored) return save(null);
      if (new Date(stored.refreshExpiresAt).getTime() <= Date.now()) return save(null);
      if (new Date(stored.expiresAt).getTime() > Date.now() + 30_000) return save(stored);
      try { return save(await refreshUser(stored.refreshToken)); }
      catch { return save(null); }
    }).catch(() => save(null));
  }, [save]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    consumerRequest<{ depositWalletAddress?: string | null; walletLifecycle?: string; access?: { pilotGrant?: { status?: string } | null } }>(session.accessToken, 'account')
      .then((account) => {
        if (!active) return;
        const required = requiresMandatoryBiometric({ role: session.user.role, pilotGrantStatus: account.access?.pilotGrant?.status, depositWalletAddress: account.depositWalletAddress, walletLifecycle: account.walletLifecycle });
        setBiometricRequired(required);
        if (required) setBiometricEnabledState(true);
      })
      .catch(() => { if (active) setBiometricRequired(true); })
      .finally(() => { if (active) setSecurityResolved(true); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAt.current ??= Date.now();
        return;
      }
      if (next === 'active') {
        const resumedAt = Date.now();
        const previousBackgroundedAt = backgroundedAt.current;
        backgroundedAt.current = null;
        if (session && shouldRelockAfterBackground(previousBackgroundedAt, resumedAt, biometricRequired || biometricEnabled)) setLocked(true);
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [biometricEnabled, biometricRequired, session]);

  const signIn = useCallback(async (email: string, password: string) => save(await loginUser(email.trim(), password)), [save]);
  const signUp = useCallback(async (input: { email: string; password: string; name: string }) => save(await registerUser({ ...input, email: input.email.trim() })), [save]);
  const signInWithApple = useCallback(async (input: { identityToken: string; givenName?: string; familyName?: string }) => save(await loginWithApple(input)), [save]);
  const signInWithGoogle = useCallback(async () => save(await googleSignIn()), [save]);
  const signOut = useCallback(async () => {
    if (session) await logoutUser(session).catch(() => undefined);
    await save(null);
  }, [save, session]);
  const setBiometricEnabled = useCallback((enabled: boolean) => {
    if (biometricRequired && !enabled) return;
    setBiometricEnabledState(enabled);
    void writeBiometricEnabled(enabled);
  }, [biometricRequired]);
  const unlockWithBiometric = useCallback(async () => {
    const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
    if (!enrolled) { setBiometricSupported(false); return false; }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock PolyClaw', disableDeviceFallback: true, cancelLabel: 'Use account login' }).catch(() => ({ success: false } as const));
    return result.success;
  }, []);
  const markUnlocked = useCallback(() => { setLocked(false); setRecoveryMode(false); }, []);
  const beginRecoveryReauthentication = useCallback(async () => {
    recoveryPending.current = true;
    if (session) await logoutUser(session).catch(() => undefined);
    await save(null);
  }, [save, session]);

  const freshSession = useCallback(async () => {
    if (!session) throw Object.assign(new Error('Sign in required'), { status: 401 });
    if (new Date(session.expiresAt).getTime() > Date.now() + 30_000) return session;
    const next = await refreshUser(session.refreshToken);
    await save(next, { preserveCurrentLock: true });
    return next;
  }, [save, session]);

  const consumer = useCallback(async <T,>(procedure: ConsumerProcedure | ConsumerAutoTradeProcedure, input?: Record<string, unknown>) => {
    if (recoveryMode && recoveryBlocksProcedure(procedure as ConsumerProcedure)) throw new Error('Re-enroll and complete biometric authentication before this security-sensitive action.');
    const active = await freshSession();
    try { return await consumerRequest<T>(active.accessToken, procedure, input); }
    catch (error) {
      if ((error as Error & { data?: { httpStatus?: number } }).data?.httpStatus !== 401) throw error;
      const next = await refreshUser(active.refreshToken);
      await save(next, { preserveCurrentLock: true });
      return consumerRequest<T>(next.accessToken, procedure, input);
    }
  }, [freshSession, recoveryMode, save]);

  const admin = useCallback(async <T,>(procedure: AdminProcedure, input?: Record<string, unknown>) => {
    const active = await freshSession();
    try { return await adminRequest<T>(active.accessToken, procedure, input); }
    catch (error) {
      if ((error as Error & { data?: { httpStatus?: number } }).data?.httpStatus !== 401) throw error;
      const next = await refreshUser(active.refreshToken);
      await save(next, { preserveCurrentLock: true });
      return adminRequest<T>(next.accessToken, procedure, input);
    }
  }, [freshSession, save]);

  const request = useCallback(async <T,>(path: string, init?: { method?: 'POST'; body?: Record<string, unknown>; idempotencyKey?: string }) => {
    const active = await freshSession();
    try { return await operatorRequest<T>(path, active.accessToken, init); }
    catch (error) {
      if ((error as Error & { status?: number }).status !== 401) throw error;
      if (error instanceof Error && error.message.includes('Recent authentication')) throw error;
      try {
        const next = await refreshUser(active.refreshToken);
        await save(next, { preserveCurrentLock: true });
        return await operatorRequest<T>(path, next.accessToken, init);
      } catch (refreshError) {
        await save(null);
        throw refreshError;
      }
    }
  }, [freshSession, save]);

  const value = useMemo(() => ({ state, session, biometricSupported, biometricEnabled, biometricRequired, locked, recoveryMode, securityResolved, setBiometricEnabled, unlockWithBiometric, markUnlocked, beginRecoveryReauthentication, signIn, signUp, signInWithApple, signInWithGoogle, signOut, request, consumer, admin }), [state, session, biometricSupported, biometricEnabled, biometricRequired, locked, recoveryMode, securityResolved, setBiometricEnabled, unlockWithBiometric, markUnlocked, beginRecoveryReauthentication, signIn, signUp, signInWithApple, signInWithGoogle, signOut, request, consumer, admin]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
