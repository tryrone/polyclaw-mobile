import type { ConsumerAccount } from '@/lib/types';
import type { ApprovalChecklistItem } from './types';

export type NotificationKey = keyof ConsumerAccount['notifications'];

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
      ? 'An active subscription is required for new bot positions'
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
      label: 'Eligible location and risk quiz',
      detail: 'Location must remain eligible; complete the acknowledgements below',
      passed: Boolean(approval && !lacks(botReasons, 'jurisdiction_not_eligible', 'risk_quiz_required')),
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

export function compactAddress(address: string) {
  return address.length > 15 ? `${address.slice(0, 8)}…${address.slice(-5)}` : address;
}

export function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
}
