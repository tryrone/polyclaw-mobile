import type { ConsumerAccount } from '@/lib/types';
import type { ApprovalChecklistItem } from './types';

export type NotificationKey = keyof ConsumerAccount['notifications'];

export type LiveSetupStepId = 'access' | 'wallet' | 'approvals' | 'funding' | 'review' | 'signer' | 'activation';

export type LiveSetupStep = {
  id: LiveSetupStepId;
  label: string;
  detail: string;
  passed: boolean;
};

export const notificationPreferences = [
  {
    key: 'authorizationExpiry',
    label: 'Authorization expiry',
    detail: 'Signer renewal and expiry warnings',
    critical: true,
  },
  {
    key: 'orderUpdates',
    label: 'Order updates',
    detail: 'Fills, rejections and cancellations',
    critical: true,
  },
  {
    key: 'riskHalts',
    label: 'Risk halts',
    detail: 'Drawdown and account safety stops',
    critical: true,
  },
  {
    key: 'billingWindDown',
    label: 'Billing wind-down',
    detail: 'Subscription expiry and bot wind-down',
    critical: true,
  },
  {
    key: 'eligibilityLoss',
    label: 'Eligibility changes',
    detail: 'Location and approval changes',
    critical: true,
  },
  {
    key: 'marketing',
    label: 'Product news',
    detail: 'Optional product updates',
    critical: false,
  },
] as const satisfies readonly {
  key: NotificationKey;
  label: string;
  detail: string;
  critical: boolean;
}[];

export const criticalNotificationTotal = notificationPreferences.filter((preference) => preference.critical).length;

export function countEnabledCriticalNotifications(notifications?: ConsumerAccount['notifications']) {
  if (!notifications) return 0;
  return notificationPreferences.filter((preference) => preference.critical && notifications[preference.key]).length;
}

function lacks(reasons: string[], ...required: string[]) {
  return required.some((reason) => reasons.includes(reason));
}

export function buildApprovalChecklist(account?: ConsumerAccount): ApprovalChecklistItem[] {
  const approval = account?.approval;
  const botReasons = approval?.botReasons ?? [];
  const reviewReasons = approval?.reviewMissingReasons ?? [];
  const accessDetail = account?.access?.active
    ? account.access?.pilotGrant?.expiresAt
      ? `Active until ${new Date(account.access.pilotGrant.expiresAt).toLocaleDateString()}`
      : 'Active access confirmed'
    : account?.access?.mode === 'SUBSCRIPTION'
      ? 'Active PolyClaw access is required for new bot positions'
      : account?.access?.pilotRequest?.status === 'PENDING'
      ? 'Renewal request is waiting for an admin'
      : 'Request a pilot grant to continue';
  return [
    {
      id: 'access',
      label: account?.access?.mode === 'SUBSCRIPTION' ? 'Active subscription access' : 'Active pilot access',
      detail: accessDetail,
      passed: Boolean(account?.access?.active),
    },
    {
      id: 'disclosures',
      label: 'Invitation and disclosures',
      detail: 'Invitation, age confirmation, and trading-risk disclosure',
      passed: Boolean(approval && !lacks(botReasons, 'invite_required', 'adult_confirmation_required', 'risk_disclosure_required')),
    },
    {
      id: 'paper',
      label: 'Paper trading history',
      detail: `${approval?.paperDays ?? 0} of 7 days · ${approval?.settledBotPositions ?? 0} of 10 settled positions`,
      passed: Boolean(approval && approval.paperDays >= 7 && approval.settledBotPositions >= 10),
    },
    {
      id: 'eligibility',
      label: 'Risk acknowledgements',
      detail: 'Complete the trading-risk acknowledgements below',
      passed: Boolean(approval && !lacks(botReasons, 'risk_quiz_required')),
    },
    {
      id: 'wallet',
      label: 'Fund and verify your bot wallet',
      detail: 'Approve the bot wallet, hold $15–$25 pUSD, then confirm the $1 test withdrawal',
      passed: Boolean(approval && !lacks(reviewReasons, 'deposit_wallet_not_funded', 'pilot_wallet_balance_out_of_range', 'owner_withdrawal_test_required', 'deposit_wallet_approvals_pending')),
    },
    {
      id: 'approval',
      label: 'Live trading approval',
      detail: account?.approvalStatus === 'PENDING_REVIEW' ? 'Your evidence is waiting for an operator decision' : 'Approval is tied to the exact wallet evidence reviewed',
      passed: Boolean(approval && account?.approvalStatus === 'APPROVED' && approval.globalEngineApproved && approval.platformApproved),
    },
    {
      id: 'signer',
      label: '30-day bot authorization',
      detail: 'Passkey authorization can trade and close, but cannot withdraw',
      passed: Boolean(account?.signerStatus === 'ACTIVE' && account.signerExpiresAt && new Date(account.signerExpiresAt) > new Date()),
    },
  ];
}

export function buildLiveSetupSteps(account?: ConsumerAccount): LiveSetupStep[] {
  const botReasons = account?.approval?.botReasons ?? [];
  const accessAndDisclosuresReady = Boolean(
    account?.access?.active
      && !lacks(botReasons, 'invite_required', 'adult_confirmation_required', 'risk_disclosure_required'),
  );
  const approvalsConfirmed = Boolean(
    account?.depositWalletAddress
      && ['FUNDING_PENDING', 'FUNDED'].includes(account.walletLifecycle),
  );
  const availablePusd = Number(account?.availablePusd ?? 0);
  const fundingReady = Boolean(
    account?.walletLifecycle === 'FUNDED'
      && Number.isFinite(availablePusd)
      && availablePusd >= (account?.funding.minimumReadyPusd ?? 15),
  );
  const signerActive = Boolean(
    account?.signerStatus === 'ACTIVE'
      && account.signerExpiresAt
      && new Date(account.signerExpiresAt) > new Date(),
  );

  return [
    {
      id: 'access',
      label: 'Access and disclosures',
      detail: accessAndDisclosuresReady ? 'Subscription or pilot access and required disclosures are active.' : 'Complete access, age, and risk disclosure requirements.',
      passed: accessAndDisclosuresReady,
    },
    {
      id: 'wallet',
      label: 'Create your dedicated wallet',
      detail: account?.depositWalletAddress ? 'Your PolyClaw owner and deposit wallet are ready.' : 'Create the wallet used only for PolyClaw trading and withdrawals.',
      passed: Boolean(account?.embeddedOwnerAddress && account.depositWalletAddress),
    },
    {
      id: 'approvals',
      label: 'Approve trading contracts',
      detail: approvalsConfirmed ? 'Owner-signed trading approvals are confirmed.' : 'Approve only the contracts needed to trade; withdrawals stay excluded.',
      passed: approvalsConfirmed,
    },
    {
      id: 'funding',
      label: 'Fund the trading wallet',
      detail: fundingReady
        ? `${availablePusd.toFixed(2)} pUSD available.`
        : `Deposit at least ${(account?.funding.minimumReadyPusd ?? 15).toFixed(2)} USDC for the live canary.`,
      passed: fundingReady,
    },
    {
      id: 'review',
      label: 'Confirm the Live review',
      detail: account?.approvalStatus === 'APPROVED' ? 'Wallet evidence and risk acknowledgement are approved.' : 'Review the risks and submit your funded wallet evidence.',
      passed: account?.approvalStatus === 'APPROVED',
    },
    {
      id: 'signer',
      label: 'Authorize the restricted signer',
      detail: signerActive
        ? `CLOB-only authorization expires ${new Date(account!.signerExpiresAt!).toLocaleDateString()}.`
        : 'Polymarket Session Key approval must be confirmed before this 30-day authorization can finish.',
      passed: signerActive,
    },
    {
      id: 'activation',
      label: 'Activate Live access',
      detail: account?.mode === 'LIVE'
        ? 'Live access is active. Choose Live and enable Auto-trade below.'
        : signerActive && account?.approval.globalEngineApproved && account.approval.platformApproved
          ? 'Sign the final activation message, then choose Live and enable Auto-trade.'
          : 'This unlocks after signer authorization and the operator safety release.',
      passed: account?.mode === 'LIVE',
    },
  ];
}

export function compactAddress(address: string) {
  return address.length > 15 ? `${address.slice(0, 8)}…${address.slice(-5)}` : address;
}

export function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
}
