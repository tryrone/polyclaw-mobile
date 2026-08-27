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

export function buildApprovalChecklist(approval?: ConsumerAccount['approval']): ApprovalChecklistItem[] {
  return [
    {
      label: 'Invitation and disclosures',
      passed: Boolean(
        approval &&
          !approval.manualReasons.includes('invite_required') &&
          !approval.manualReasons.includes('adult_confirmation_required') &&
          !approval.manualReasons.includes('risk_disclosure_required'),
      ),
    },
    {
      label: `Paper history (${approval?.paperDays ?? 0}/7 days, ${approval?.settledBotPositions ?? 0}/10 positions)`,
      passed: Boolean(approval && approval.paperDays >= 7 && approval.settledBotPositions >= 10),
    },
    {
      label: 'Eligible location and risk quiz',
      passed: Boolean(
        approval &&
          !approval.manualReasons.includes('jurisdiction_not_eligible') &&
          !approval.manualReasons.includes('risk_quiz_required'),
      ),
    },
    {
      label: 'Funded Deposit Wallet',
      passed: Boolean(
        approval &&
          !approval.manualReasons.includes('deposit_wallet_required') &&
          !approval.manualReasons.includes('funded_wallet_required'),
      ),
    },
    {
      label: 'Admin, engine and platform approval',
      passed: Boolean(
        approval &&
          !approval.manualReasons.includes('admin_approval_required') &&
          !approval.manualReasons.includes('global_engine_not_approved') &&
          !approval.manualReasons.includes('platform_not_approved'),
      ),
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
