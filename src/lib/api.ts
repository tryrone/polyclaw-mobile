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

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  return client().auth.mobileLogin.mutate({ email, password, ...(await deviceInput()) }) as Promise<AuthSession>;
}

export async function registerUser(input: { email: string; password: string; name: string }): Promise<AuthSession> {
  return client().auth.mobileRegister.mutate({ ...input, ...(await deviceInput()) }) as Promise<AuthSession>;
}

export async function loginWithApple(input: { identityToken: string; givenName?: string; familyName?: string }): Promise<AuthSession> {
  return client().auth.mobileAppleLogin.mutate({ ...input, ...(await deviceInput()) }) as Promise<AuthSession>;
}

export async function loginWithGoogleIdToken(idToken: string): Promise<AuthSession> {
  return client().auth.mobileGoogleLogin.mutate({ idToken, ...(await deviceInput()) }) as Promise<AuthSession>;
}

export async function refreshUser(refreshToken: string): Promise<AuthSession> {
  return client().auth.mobileRefresh.mutate({ refreshToken, ...(await deviceInput()) }) as Promise<AuthSession>;
}

export async function logoutUser(session: AuthSession) {
  await client(session.accessToken).auth.mobileLogout.mutate({ accessToken: session.accessToken, refreshToken: session.refreshToken });
}

export type ConsumerProcedure = 'dashboard' | 'activate' | 'updateSettings' | 'pause' | 'resume' | 'portfolio' | 'footballMarkets' | 'quoteManualOrder' | 'submitManualOrder' | 'cancelManualOrder' | 'account' | 'walletIdentityToken' | 'provisionDepositWallet' | 'depositWalletStatus' | 'createDepositAddress' | 'depositStatus' | 'createWalletChallenge' | 'verifyWalletOwnership' | 'connectReadOnlyWallet' | 'beginDepositWallet' | 'updateBudgets' | 'submitLiveReview' | 'updateNotifications' | 'renewSigner' | 'authorizeBotSigner' | 'prepareLiveActivation' | 'enableLiveBot' | 'disableLiveBot' | 'revokeSigner' | 'revokeBotSigner' | 'prepareClosePosition' | 'closePositionStatus' | 'prepareOwnerAction' | 'submitOwnerAction' | 'ownerActionStatus' | 'prepareWithdrawal' | 'disconnectWallet' | 'requestOffboarding' | 'pilotGrantStatus' | 'requestPilotAccess' | 'grantPilotAccess' | 'revokePilotAccess' | 'pilotAccessRequestQueue' | 'searchPilotUsers' | 'pilotMemberships' | 'pilotMembershipAudit' | 'addPilotMembership' | 'revokePilotMembership' | 'liveReviewQueue' | 'approveLiveAccount' | 'denyLiveAccount' | 'revokeLiveAccount' | 'prepareCancellationPreflight' | 'cancellationPreflightStatus' | 'canaryIntentQueue' | 'releaseCanaryIntent' | 'resetCanaryAttempt';

/** Admin-directed auto-trading consumer procedures. */
export type ConsumerAutoTradeProcedure = 'homeStatus' | 'copyConsent' | 'acceptCopyConsent' | 'configureAutoTradeLimits' | 'enableAutoTrade' | 'pauseAutoTrade' | 'resumeAutoTrade' | 'autoTradeTrades' | 'autoTradeTrade' | 'closeAutoTradePosition' | 'autoTradeWalletReadiness';

const consumerQueries = new Set<ConsumerProcedure | ConsumerAutoTradeProcedure>(['dashboard', 'portfolio', 'footballMarkets', 'account', 'depositWalletStatus', 'depositStatus', 'pilotGrantStatus', 'pilotAccessRequestQueue', 'searchPilotUsers', 'pilotMemberships', 'pilotMembershipAudit', 'ownerActionStatus', 'closePositionStatus', 'liveReviewQueue', 'cancellationPreflightStatus', 'canaryIntentQueue', 'homeStatus', 'copyConsent', 'autoTradeTrades', 'autoTradeTrade', 'autoTradeWalletReadiness']);

export async function consumerRequest<T>(accessToken: string, procedure: ConsumerProcedure | ConsumerAutoTradeProcedure, input?: Record<string, unknown>): Promise<T> {
  const endpoint = client(accessToken).polyClawConsumer[procedure];
  return (consumerQueries.has(procedure) ? endpoint.query(input) : endpoint.mutate(input ?? {})) as Promise<T>;
}

/** Admin-directed auto-trading operator procedures (`polyClawAdmin` router). */
export type AdminProcedure = 'catalogueSearch' | 'listBatches' | 'getBatch' | 'createDraft' | 'addSignal' | 'updateSignal' | 'removeSignal' | 'discardDraft' | 'validateBatch' | 'publishBatch' | 'cancelBatch' | 'deliverySummary' | 'listDeliveries' | 'dispatchBatch' | 'dispatchDelivery' | 'expireStaleSignals' | 'eligibilityDirectory' | 'publisherStatus' | 'listPublishers' | 'publisherAudit' | 'grantPublisher' | 'revokePublisher' | 'platformControl' | 'updatePlatformControl' | 'setGlobalPause' | 'connections';

const adminQueries = new Set<AdminProcedure>(['catalogueSearch', 'listBatches', 'getBatch', 'validateBatch', 'deliverySummary', 'listDeliveries', 'eligibilityDirectory', 'publisherStatus', 'listPublishers', 'publisherAudit', 'platformControl', 'connections']);

export async function adminRequest<T>(accessToken: string, procedure: AdminProcedure, input?: Record<string, unknown>): Promise<T> {
  const endpoint = client(accessToken).polyClawAdmin[procedure];
  return (adminQueries.has(procedure) ? endpoint.query(input) : endpoint.mutate(input ?? {})) as Promise<T>;
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
