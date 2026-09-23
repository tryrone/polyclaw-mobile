import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { nextLockStateAfterSessionSave, recoveryBlocksProcedure, requiresMandatoryBiometric, shouldRelockAfterBackground } from '../src/auth/biometric-policy';

const authProvider = readFileSync('src/auth/provider.tsx', 'utf8');

describe('PolyClaw biometric policy', () => {
  it('locks after 60 seconds but not at 59 seconds', () => {
    assert.equal(shouldRelockAfterBackground(1_000, 60_000, true), false);
    assert.equal(shouldRelockAfterBackground(1_000, 62_000, true), true);
  });

  it('keeps an unlocked session unlocked during a transparent token refresh', () => {
    assert.equal(nextLockStateAfterSessionSave({
      hasSession: true,
      recoveryPending: false,
      preserveCurrentLock: true,
      currentlyLocked: false,
    }), false);
    assert.equal(nextLockStateAfterSessionSave({
      hasSession: true,
      recoveryPending: false,
      preserveCurrentLock: true,
      currentlyLocked: true,
    }), true);

    const adminRefresh = authProvider.match(/const admin = useCallback[\s\S]*?\n  }, \[[^\]]+\]\);/)?.[0] ?? '';
    assert.match(adminRefresh, /save\(next, \{ preserveCurrentLock: true \}\)/);
  });

  it('requires biometrics for admins, active pilots, and live wallets', () => {
    assert.equal(requiresMandatoryBiometric({ role: 'ADMIN' }), true);
    assert.equal(requiresMandatoryBiometric({ role: 'USER', pilotGrantStatus: 'ACTIVE' }), true);
    assert.equal(requiresMandatoryBiometric({ role: 'USER', depositWalletAddress: '0xwallet' }), true);
    assert.equal(requiresMandatoryBiometric({ role: 'USER', walletLifecycle: 'UNLINKED' }), false);
  });

  it('keeps exits and withdrawals available in recovery while blocking expansion', () => {
    assert.equal(recoveryBlocksProcedure('enableLiveBot'), true);
    assert.equal(recoveryBlocksProcedure('approveLiveAccount'), true);
    assert.equal(recoveryBlocksProcedure('addPilotMembership'), true);
    assert.equal(recoveryBlocksProcedure('revokePilotMembership'), true);
    assert.equal(recoveryBlocksProcedure('prepareClosePosition'), false);
    assert.equal(recoveryBlocksProcedure('prepareOwnerAction'), false);
  });
});
