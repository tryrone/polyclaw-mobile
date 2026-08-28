export const BIOMETRIC_BACKGROUND_LOCK_MS = 60_000;

export function shouldRelockAfterBackground(backgroundedAt: number | null, resumedAt: number, protectedAccount: boolean) {
  return protectedAccount && backgroundedAt !== null && resumedAt - backgroundedAt >= BIOMETRIC_BACKGROUND_LOCK_MS;
}

export function requiresMandatoryBiometric(input: { role: 'USER' | 'ADMIN'; pilotGrantStatus?: string | null; depositWalletAddress?: string | null; walletLifecycle?: string | null }) {
  return input.role === 'ADMIN' || input.pilotGrantStatus === 'ACTIVE' || Boolean(input.depositWalletAddress) || Boolean(input.walletLifecycle && input.walletLifecycle !== 'UNLINKED');
}

export function recoveryBlocksProcedure(procedure: string) {
  return new Set(['grantPilotAccess', 'revokePilotAccess', 'approveLiveAccount', 'denyLiveAccount', 'revokeLiveAccount', 'releaseCanaryIntent', 'resetCanaryAttempt', 'renewSigner', 'authorizeBotSigner', 'prepareLiveActivation', 'enableLiveBot']).has(procedure);
}
