import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { apiBaseUrl } from './config';
import type { AuthSession, OperatorEnvelope } from './types';

function ensureApiUrl() {
  if (!apiBaseUrl) throw new Error('EXPO_PUBLIC_API_URL is not configured');
}

function client(token?: string) {
  ensureApiUrl();
  return createTRPCClient<any>({
    links: [httpBatchLink({ url: `${apiBaseUrl}/api/trpc`, headers: token ? { authorization: `Bearer ${token}` } : {} })],
  }) as Record<string, any>;
}

async function deviceInput() {
  const appId = Application.applicationId ?? 'com.betclaw.polyclaw';
  return { deviceId: `${appId}:${Platform.OS}`, deviceName: Device.deviceName ?? 'PolyClaw device', platform: Platform.OS };
}

export async function loginOperator(email: string, password: string): Promise<AuthSession> {
  const result = await client().auth.mobileLogin.mutate({ email, password, ...(await deviceInput()) }) as AuthSession;
  if (result.user.role !== 'ADMIN') {
    await client(result.accessToken).auth.mobileLogout.mutate({ accessToken: result.accessToken, refreshToken: result.refreshToken }).catch(() => undefined);
    throw new Error('This account is not authorized as a PolyClaw operator');
  }
  return result;
}

export async function refreshOperator(refreshToken: string): Promise<AuthSession> {
  const result = await client().auth.mobileRefresh.mutate({ refreshToken, ...(await deviceInput()) }) as AuthSession;
  if (result.user.role !== 'ADMIN') throw new Error('Operator access was removed');
  return result;
}

export async function logoutOperator(session: AuthSession) {
  await client(session.accessToken).auth.mobileLogout.mutate({ accessToken: session.accessToken, refreshToken: session.refreshToken });
}

export async function registerPushToken(accessToken: string, expoPushToken: string) {
  return client(accessToken).mobile.registerPushDevice.mutate({ expoPushToken, ...(await deviceInput()) });
}

export async function operatorRequest<T>(path: string, accessToken: string, init?: { method?: 'POST'; body?: Record<string, unknown>; idempotencyKey?: string }): Promise<OperatorEnvelope<T>> {
  ensureApiUrl();
  const response = await fetch(`${apiBaseUrl}/api/operator/polyclaw/v1/${path.replace(/^\//, '')}`, {
    method: init?.method ?? 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      ...(init?.method === 'POST' ? { 'content-type': 'application/json', 'idempotency-key': init.idempotencyKey ?? `${Date.now()}-${Math.random()}` } : {}),
    },
    body: init?.method === 'POST' ? JSON.stringify(init.body ?? {}) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof payload?.error === 'string' ? payload.error : 'Operator request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as OperatorEnvelope<T>;
}
