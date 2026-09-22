import { useEffect, useMemo, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '@/auth/provider';
import {
  getPolyClawSubscription,
  listenForCustomerInfo,
  openSubscriptionManagement,
  purchasePolyClawBot,
  restorePolyClawBot,
} from '@/billing/revenuecat';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { ConsumerAccount, DepositSetup, OwnerActionPreparation } from '@/lib/types';
import { usePolyClawWallet } from '@/wallet/privy-provider';
import type { AccountMessage, AccountSectionKey, BusyOperation, RiskAcknowledgements } from './types';
import {
  buildApprovalChecklist,
  countEnabledCriticalNotifications,
  criticalNotificationTotal,
  type NotificationKey,
} from './utils';

const initialRiskAcknowledgements: RiskAcknowledgements = {
  fullLoss: false,
  unfilled: false,
  noGuarantee: false,
};

export function useAccountController() {
  const { session, signOut, consumer, biometricSupported, biometricRequired, recoveryMode, unlockWithBiometric } = useAuth();
  const ownerWallet = usePolyClawWallet();
  const account = useConsumerResource<ConsumerAccount>('account', undefined, 45_000);
  const depositWalletAddress = account.data?.depositWalletAddress;
  const refreshAccount = account.refresh;
  const dashboard = useConsumerDashboard(60_000);
  const [expanded, setExpanded] = useState<AccountSectionKey | null>(null);
  const [price, setPrice] = useState('$9.99');
  const [storeActive, setStoreActive] = useState(false);
  const [busy, setBusy] = useState<BusyOperation | null>(null);
  const [message, setMessage] = useState<AccountMessage>(null);
  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [depositSetup, setDepositSetup] = useState<DepositSetup | null>(null);
  const [dangerArmed, setDangerArmed] = useState(false);
  const [riskAcknowledgements, setRiskAcknowledgements] = useState(initialRiskAcknowledgements);
  const operationInFlight = useRef(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId || account.data?.access.mode === 'PILOT' || !account.data?.access.mode) return;
    let cleanup: (() => boolean) | undefined;
    void getPolyClawSubscription(userId)
      .then((state) => {
        setPrice(state.localizedPrice);
        setStoreActive(state.active);
      })
      .catch(() => undefined);
    void listenForCustomerInfo(userId, (info) => setStoreActive(Boolean(info.entitlements.active.POLYCLAW_BOT)))
      .then((remove) => {
        cleanup = remove;
      })
      .catch(() => undefined);
    return () => {
      cleanup?.();
    };
  }, [account.data?.access.mode, userId]);

  useEffect(() => {
    if (!depositWalletAddress || !session) return;
    const poll = () => consumer('depositStatus').then(() => refreshAccount()).catch(() => undefined);
    const timer = setInterval(() => void poll(), 15_000);
    void poll();
    return () => clearInterval(timer);
  }, [depositWalletAddress, session, consumer, refreshAccount]);

  const readOnly = Boolean(account.error || dashboard.error);
  const run = async (name: BusyOperation, operation: () => Promise<unknown>, success: string) => {
    if (readOnly) {
      setMessage({ text: 'Controls are read-only until the latest server state can be verified.', tone: 'warning' });
      return;
    }
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(name);
    setMessage(null);
    try {
      await operation();
      setMessage({ text: success, tone: 'success' });
      await Promise.all([account.refresh(), dashboard.refresh()]);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'The request could not be completed',
        tone: 'danger',
      });
    } finally {
      operationInFlight.current = false;
      setBusy(null);
    }
  };

  const protectedRun = async (operation: () => Promise<void>, allowRecovery = false) => {
    if (recoveryMode) {
      if (allowRecovery) await operation();
      else setMessage({ text: 'Re-enroll biometrics before changing live-bot or pilot authorization.', tone: 'warning' });
      return;
    }
    if (!biometricSupported) {
      setMessage({ text: 'Face ID or Touch ID must be enrolled before changing live-bot authorization.', tone: 'warning' });
      return;
    }
    if (!(await unlockWithBiometric())) {
      setMessage({ text: 'Authorization cancelled.', tone: 'warning' });
      return;
    }
    await operation();
  };

  const billing = (mode: 'purchase' | 'restore' | 'manage') => {
    if (!session) return Promise.resolve();
    if (mode === 'purchase') return purchasePolyClawBot(session.user.id);
    if (mode === 'restore') return restorePolyClawBot(session.user.id);
    return openSubscriptionManagement(session.user.id);
  };

  const checklist = useMemo(() => buildApprovalChecklist(account.data ?? undefined), [account.data]);
  const readiness = checklist.filter((item) => item.passed).length;
  const riskQuizRequired = Boolean(account.data?.approval.botReasons.includes('risk_quiz_required'));

  const toggleSection = (section: AccountSectionKey) => {
    setExpanded((current) => (current === section ? null : section));
  };

  const toggleRiskAcknowledgement = (key: keyof RiskAcknowledgements) => {
    setRiskAcknowledgements((current) => ({ ...current, [key]: !current[key] }));
  };

  const updateNotification = async (key: NotificationKey, value: boolean) => {
    const current = account.data;
    if (!current) return;
    await run(
      'notifications',
      () => consumer('updateNotifications', { ...current.notifications, [key]: value }),
      'Notification preferences saved.',
    );
  };

  return {
    resource: account,
    profile: {
      id: session?.user.id,
      name: session?.user.name,
      email: session?.user.email,
    },
    ui: {
      busy,
      isBusy: busy !== null,
      readOnly,
      expanded,
      message,
      toggleSection,
    },
    subscription: {
      visible: Boolean(account.data && account.data.access.mode !== 'PILOT'),
      active: Boolean(dashboard.data?.entitlement?.active || storeActive),
      price,
      purchase: () => run('purchase', () => billing('purchase'), 'Subscription confirmed. Server access will refresh shortly.'),
      manage: () => run('manage', () => billing('manage'), 'Opened store subscription management.'),
      restore: () => run('restore', () => billing('restore'), 'Purchases restored. Server access will refresh shortly.'),
    },
    wallet: {
      account: account.data,
      address,
      signature,
      challenge,
      setAddress,
      setSignature,
      createChallenge: () =>
        run(
          'challenge',
          async () => {
            const result = await consumer<{ challenge: string }>('createWalletChallenge', { address });
            setChallenge(result.challenge);
          },
          'Challenge created. Sign the exact text, then paste the signature below.',
        ),
      verifyOwnership: () =>
        run(
          'verify',
          () => consumer('verifyWalletOwnership', { address, signature }),
          'Polymarket address linked for read-only history.',
        ),
      beginDepositWallet: () =>
        run(
          'deposit',
          async () => {
            const owner = await ownerWallet.ensureOwnerWallet();
            const wallet = await consumer<{ approvalsConfirmed?: boolean }>('provisionDepositWallet', { ...owner, platform: 'IOS' });
            if (wallet.approvalsConfirmed) setDepositSetup(await consumer<DepositSetup>('createDepositAddress'));
          },
          'Wallet setup refreshed. Approve trading contracts before requesting deposit routes.',
        ),
      approveTrading: () => protectedRun(() => run('approve-wallet', async () => {
        const prepared = await consumer<OwnerActionPreparation>('prepareOwnerAction', { kind: 'APPROVALS', reason: 'Authorize PolyClaw trading contracts', idempotencyKey: randomUUID() });
        const ownerSignature = await ownerWallet.signTypedData(prepared.typedData);
        await consumer('submitOwnerAction', { actionId: prepared.id, ownerSignature });
      }, 'Owner-signed trading approvals submitted for reconciliation.')),
      configured: ownerWallet.configured,
      ownerAddress: ownerWallet.ownerAddress,
      depositSetup,
      withdrawTestDollar: () => protectedRun(() => run('withdrawal', async () => {
        if (!ownerWallet.ownerAddress) throw new Error('Create the embedded owner wallet first.');
        const prepared = await consumer<OwnerActionPreparation>('prepareOwnerAction', { kind: 'WITHDRAWAL', amountPusd: 1, destinationAddress: ownerWallet.ownerAddress, reason: 'Internal pilot withdrawal test', idempotencyKey: randomUUID() });
        const ownerSignature = await ownerWallet.signTypedData(prepared.typedData);
        await consumer('submitOwnerAction', { actionId: prepared.id, ownerSignature });
      }, '$1 owner-signed withdrawal submitted for reconciliation.'), true),
    },
    approval: {
      checklist,
      readiness,
      reviewReady: Boolean(account.data?.approval.reviewReady),
      status: account.data?.approvalStatus,
      riskAcknowledgements,
      riskQuizRequired,
      allRiskAcknowledged: Object.values(riskAcknowledgements).every(Boolean),
      toggleRiskAcknowledgement,
      submitReview: () => run('review', () => consumer('submitLiveReview', { riskQuizPassed: true }), 'Live review status updated.'),
    },
    signer: {
      account: account.data,
      renew: () => protectedRun(() => run('renew', async () => {
        const prepared = await consumer<{ authorizationPayload: string }>('renewSigner');
        const ownerSignature = await ownerWallet.signMessage(prepared.authorizationPayload);
        await consumer('authorizeBotSigner', { authorizationPayload: prepared.authorizationPayload, ownerSignature, platform: 'IOS' });
      }, 'Bot signer authorized for 30 days. It cannot withdraw funds.')),
      revoke: () => protectedRun(() => run('revoke', () => consumer('revokeSigner'), 'Signer revocation started.')),
      enable: () => protectedRun(() => run('enable', async () => {
        const prepared = await consumer<{ activationPayload: string }>('prepareLiveActivation', { platform: 'IOS' });
        const ownerSignature = await ownerWallet.signMessage(prepared.activationPayload);
        await consumer('enableLiveBot', { platform: 'IOS', activationPayload: prepared.activationPayload, ownerSignature });
      }, 'Auto-trading authorization enabled.')),
      disable: () => run('disable', () => consumer('disableLiveBot'), 'New auto-trading entries paused.'),
    },
    notifications: {
      values: account.data?.notifications,
      enabledCritical: countEnabledCriticalNotifications(account.data?.notifications),
      totalCritical: criticalNotificationTotal,
      update: updateNotification,
    },
    controls: {
      hasLinkedWallet: Boolean(account.data?.readOnlyAddress),
      dangerArmed,
      armDeletion: () => setDangerArmed(true),
      disconnectWallet: () =>
        protectedRun(() =>
          run('disconnect', () => consumer('disconnectWallet'), 'Read-only Polymarket history disconnected. Your bot wallet is unchanged.'),
        ),
      requestOffboarding: () =>
        protectedRun(() =>
          run(
            'delete',
            () => consumer('requestOffboarding'),
            'Safe wind-down and offboarding started. Withdrawal access remains available.',
          ),
        ),
      signOut,
    },
    security: { biometricRequired, biometricSupported, recoveryMode },
  };
}

export type AccountController = ReturnType<typeof useAccountController>;
