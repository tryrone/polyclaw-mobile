import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSetupGuide } from '../src/features/setup-guide';
import { buildApprovalChecklist } from '../src/features/account/utils';
import type { ConsumerAccount, ConsumerDashboard } from '../src/lib/types';

function account(overrides: Partial<ConsumerAccount> = {}): ConsumerAccount {
  return {
    mode: 'PAPER',
    walletStatus: 'UNLINKED',
    walletLifecycle: 'UNLINKED',
    botLifecycle: 'DISABLED',
    availablePusd: 0,
    approvalStatus: 'NOT_ELIGIBLE',
    signerStatus: 'NOT_PROVISIONED',
    offboardingState: 'ACTIVE',
    notifications: { authorizationExpiry: true, orderUpdates: true, riskHalts: true, billingWindDown: true, eligibilityLoss: true, marketing: false },
    approval: {
      paperDays: 2,
      settledBotPositions: 4,
      globalEngineApproved: true,
      platformApproved: true,
      reviewReady: false,
      reviewMissingReasons: ['paper_history_too_short', 'settled_history_too_short', 'deposit_wallet_not_funded', 'owner_withdrawal_test_required'],
      ownerWithdrawalComplete: false,
      manualLiveEligible: false,
      botLiveEligible: false,
      manualReasons: ['manual_live_trading_disabled'],
      botReasons: ['paper_days_required', 'settled_bot_positions_required', 'deposit_wallet_required', 'funded_wallet_required', 'admin_approval_required', 'session_signer_required', 'bot_subscription_required'],
    },
    funding: { minimumReadyPusd: 15, minimumEntryPusd: 5 },
    access: { mode: 'PILOT', active: false, source: null, pilotRequest: null },
    ...overrides,
  };
}

describe('PolyClaw setup education', () => {
  it('does not turn missing live gates green from manual-trading reasons', () => {
    const checklist = buildApprovalChecklist(account());
    assert.equal(checklist.find((item) => item.id === 'access')?.passed, false);
    assert.equal(checklist.find((item) => item.id === 'paper')?.passed, false);
    assert.equal(checklist.find((item) => item.id === 'wallet')?.passed, false);
    assert.equal(checklist.find((item) => item.id === 'approval')?.passed, false);
    assert.equal(checklist.find((item) => item.id === 'signer')?.passed, false);
  });

  it('makes the first incomplete setup step current and later steps locked', () => {
    const dashboard = { profile: { botState: 'PAUSED_BILLING' }, access: { active: false } } as ConsumerDashboard;
    const steps = buildSetupGuide(account(), dashboard);
    assert.equal(steps[0]?.state, 'CURRENT');
    assert.equal(steps[1]?.state, 'LOCKED');
    assert.match(steps[0]?.detail ?? '', /Request a 30-day grant/);
  });

  it('moves the user to paper qualification after pilot access is restored', () => {
    const active = account({ access: { mode: 'PILOT', active: true, source: 'PILOT', pilotGrant: { status: 'ACTIVE', startsAt: '2026-08-28T00:00:00.000Z', expiresAt: '2026-09-27T00:00:00.000Z', walletCapPusd: 25, canaryAttemptsUsed: 0, canaryAttemptLimit: 1 } } });
    const steps = buildSetupGuide(active, { profile: { botState: 'ACTIVE' } } as ConsumerDashboard);
    assert.equal(steps[0]?.state, 'COMPLETE');
    assert.equal(steps[1]?.state, 'CURRENT');
  });
});
