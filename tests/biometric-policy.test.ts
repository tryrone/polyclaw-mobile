import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recoveryBlocksProcedure, requiresMandatoryBiometric, shouldRelockAfterBackground } from '../src/auth/biometric-policy';

describe('PolyClaw biometric policy', () => {
  it('locks after 60 seconds but not at 59 seconds', () => {
    assert.equal(shouldRelockAfterBackground(1_000, 60_000, true), false);
    assert.equal(shouldRelockAfterBackground(1_000, 62_000, true), true);
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
    assert.equal(recoveryBlocksProcedure('prepareClosePosition'), false);
    assert.equal(recoveryBlocksProcedure('prepareOwnerAction'), false);
  });
});
