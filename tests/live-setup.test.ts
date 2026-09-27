import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import type { ConsumerAccount } from '../src/lib/types';
import { buildLiveSetupSteps } from '../src/features/account/utils';

const accountScreen = readFileSync('src/app/(consumer)/account.tsx', 'utf8');
const liveSetup = readFileSync('src/features/account/access-items.tsx', 'utf8');
const historyLink = readFileSync('src/features/account/membership-items.tsx', 'utf8');

function account(overrides: Partial<ConsumerAccount> = {}): ConsumerAccount {
  return {
    mode: 'PAPER',
    embeddedOwnerAddress: null,
    depositWalletAddress: null,
    walletStatus: 'UNLINKED',
    walletLifecycle: 'UNLINKED',
    botLifecycle: 'PAPER',
    availablePusd: 0,
    liveCanaryAllowed: true,
    approvalStatus: 'NOT_SUBMITTED',
    signerStatus: 'NOT_PROVISIONED',
    offboardingState: 'NONE',
    notifications: {
      authorizationExpiry: true,
      orderUpdates: true,
      riskHalts: true,
      billingWindDown: true,
      eligibilityLoss: true,
      marketing: false,
    },
    approval: {
      paperDays: 7,
      settledBotPositions: 10,
      globalEngineApproved: false,
      platformApproved: false,
      reviewReady: false,
      reviewMissingReasons: ['deposit_wallet_not_funded'],
      ownerWithdrawalComplete: false,
      manualLiveEligible: false,
      botLiveEligible: false,
      manualReasons: ['manual_live_trading_disabled'],
      botReasons: ['funded_wallet_required', 'deposit_wallet_required', 'admin_approval_required', 'global_engine_not_approved', 'platform_not_approved', 'session_signer_required'],
    },
    funding: { minimumReadyPusd: 15, minimumEntryPusd: 5 },
    access: { mode: 'PILOT', active: true, source: 'PILOT' },
    ...overrides,
  };
}

describe('guided Live trading setup', () => {
  it('keeps the dedicated wallet, approvals, funding, review, restricted signer and activation in one ordered journey', () => {
    const steps = buildLiveSetupSteps(account());
    assert.deepEqual(steps.map((step) => step.id), ['access', 'wallet', 'approvals', 'funding', 'review', 'signer', 'activation']);
    assert.equal(steps[0]?.passed, true);
    assert.equal(steps[1]?.passed, false);
    assert.match(steps[5]?.detail ?? '', /Session Key approval/);
    assert.match(liveSetup, /Set up Live trading/);
    assert.match(liveSetup, /cannot withdraw/);
    assert.match(liveSetup, /Check approval and authorize signer/);
  });

  it('marks wallet funding and the withdrawal-disabled signer ready from verified account state', () => {
    const steps = buildLiveSetupSteps(account({
      embeddedOwnerAddress: '0x1111111111111111111111111111111111111111',
      depositWalletAddress: '0x2222222222222222222222222222222222222222',
      walletLifecycle: 'FUNDED',
      walletStatus: 'READY',
      availablePusd: 15,
      approvalStatus: 'APPROVED',
      signerStatus: 'ACTIVE',
      signerExpiresAt: '2099-01-01T00:00:00.000Z',
    }));
    assert.equal(steps.find((step) => step.id === 'wallet')?.passed, true);
    assert.equal(steps.find((step) => step.id === 'approvals')?.passed, true);
    assert.equal(steps.find((step) => step.id === 'funding')?.passed, true);
    assert.equal(steps.find((step) => step.id === 'signer')?.passed, true);
  });

  it('provides explicit funding copy controls, optional withdrawal recovery and a fail-closed operator release', () => {
    assert.match(liveSetup, /Copy wallet address/);
    assert.match(liveSetup, /Get deposit addresses/);
    assert.match(liveSetup, /Run optional \$1 withdrawal test/);
    assert.match(liveSetup, /Waiting for operator safety release/);
    assert.match(liveSetup, /globalEngineApproved/);
    assert.match(liveSetup, /platformApproved/);
  });

  it('moves optional read-only history linking under Advanced and explains the manual signing handoff', () => {
    assert.match(accountScreen, /SettingsGroup title="Advanced"/);
    assert.match(historyLink, /Copy challenge/);
    assert.match(historyLink, /Sign message or Sign personal message/);
    assert.match(historyLink, /skip this optional link/);
  });
});
