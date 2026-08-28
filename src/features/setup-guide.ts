import type { ConsumerAccount, ConsumerDashboard } from '@/lib/types';

export type SetupGuideStep = {
  id: 'access' | 'paper' | 'wallet' | 'funding' | 'review' | 'signer' | 'live';
  title: string;
  detail: string;
  actionLabel: string;
  href: '/bot' | '/account';
  complete: boolean;
  state: 'COMPLETE' | 'CURRENT' | 'LOCKED';
};

export function buildSetupGuide(account?: ConsumerAccount | null, dashboard?: ConsumerDashboard | null) {
  const accessActive = Boolean(account?.access.active ?? dashboard?.access.active);
  const paperComplete = Boolean(account && account.approval.paperDays >= 7 && account.approval.settledBotPositions >= 10);
  const walletComplete = Boolean(account?.depositWalletAddress && ['APPROVALS_PENDING', 'FUNDING_PENDING', 'FUNDED'].includes(account.walletLifecycle));
  const availablePusd = Number(account?.availablePusd ?? 0);
  const fundingComplete = Boolean(account?.walletLifecycle === 'FUNDED' && availablePusd >= 15 && availablePusd <= 25 && account.approval.ownerWithdrawalComplete);
  const reviewComplete = account?.approvalStatus === 'APPROVED';
  const signerComplete = Boolean(account?.signerStatus === 'ACTIVE' && account.signerExpiresAt && new Date(account.signerExpiresAt) > new Date());
  const liveComplete = Boolean(account && ['LIVE_ENABLED', 'CANARY_AWAITING_RELEASE', 'CANARY_IN_FLIGHT', 'CANARY_CLOSE_REQUIRED'].includes(account.botLifecycle));
  const raw: Omit<SetupGuideStep, 'state'>[] = [
    {
      id: 'access',
      title: 'Receive pilot access',
      detail: accessActive
        ? `Your pilot is active${account?.access.pilotGrant?.expiresAt ? ` until ${new Date(account.access.pilotGrant.expiresAt).toLocaleDateString()}` : ''}.`
        : account?.access.mode === 'SUBSCRIPTION'
          ? 'An active subscription is required before the bot can create new positions.'
        : account?.access.pilotRequest?.status === 'PENDING'
          ? 'Your access request is waiting for an administrator.'
          : 'Request a 30-day grant. Only named internal pilot accounts can be approved.',
      actionLabel: accessActive ? 'Access active' : account?.access.mode === 'SUBSCRIPTION' ? 'Manage subscription' : account?.access.pilotRequest?.status === 'PENDING' ? 'Request pending' : 'Request access',
      href: '/bot',
      complete: accessActive,
    },
    {
      id: 'paper',
      title: 'Build your paper qualification',
      detail: `${account?.approval.paperDays ?? 0} of 7 elapsed days and ${account?.approval.settledBotPositions ?? 0} of 10 settled bot positions. Paper trades use a simulated $1,000 balance.`,
      actionLabel: dashboard?.profile.botState === 'ACTIVE' ? 'Paper bot is running' : 'Open paper bot',
      href: '/bot',
      complete: paperComplete,
    },
    {
      id: 'wallet',
      title: 'Create the dedicated bot wallet',
      detail: 'A passkey-backed owner controls a separate POLY_1271 Deposit Wallet. A history-linked address is read-only and cannot trade.',
      actionLabel: walletComplete ? 'Bot wallet created' : 'Set up bot wallet',
      href: '/account',
      complete: walletComplete,
    },
    {
      id: 'funding',
      title: 'Fund and prove withdrawal control',
      detail: `Hold $15–$25 pUSD, approve the trading contracts, then complete a $1 owner-signed withdrawal. Current reconciled balance: $${availablePusd.toFixed(2)}.`,
      actionLabel: fundingComplete ? 'Funding verified' : 'Complete wallet checks',
      href: '/account',
      complete: fundingComplete,
    },
    {
      id: 'review',
      title: 'Submit exact evidence for review',
      detail: reviewComplete ? 'An operator approved the current identity, location, wallet, funding, and paper evidence.' : 'An operator reviews the exact evidence package. Material wallet or eligibility changes invalidate approval.',
      actionLabel: reviewComplete ? 'Evidence approved' : account?.approvalStatus === 'PENDING_REVIEW' ? 'Review pending' : 'View requirements',
      href: '/account',
      complete: reviewComplete,
    },
    {
      id: 'signer',
      title: 'Authorize the bot for 30 days',
      detail: 'Confirm with your passkey or biometrics. The scoped signer may place, cancel, and close approved orders, but it cannot withdraw.',
      actionLabel: signerComplete ? 'Bot authorized' : 'Authorize bot',
      href: '/account',
      complete: signerComplete,
    },
    {
      id: 'live',
      title: 'Activate the controlled live canary',
      detail: 'Live mode uses real funds on Polymarket. The first entry is a single operator-released canary; profit is never guaranteed and losses are possible.',
      actionLabel: liveComplete ? 'Live canary active' : 'View live controls',
      href: '/account',
      complete: liveComplete,
    },
  ];
  const currentIndex = raw.findIndex((step) => !step.complete);
  return raw.map((step, index): SetupGuideStep => ({
    ...step,
    state: step.complete ? 'COMPLETE' : index === currentIndex ? 'CURRENT' : 'LOCKED',
  }));
}
