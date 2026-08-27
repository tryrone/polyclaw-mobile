import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
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
import type { ConsumerAccount } from '@/lib/types';
import { usePolyClawTheme } from '@/theme';
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
  const { preference, setPreference } = usePolyClawTheme();
  const { session, signOut, consumer, biometricSupported, unlockWithBiometric } = useAuth();
  const account = useConsumerResource<ConsumerAccount>('account', undefined, 45_000);
  const dashboard = useConsumerDashboard(60_000);
  const [expanded, setExpanded] = useState<AccountSectionKey | null>(null);
  const [price, setPrice] = useState('$9.99');
  const [storeActive, setStoreActive] = useState(false);
  const [busy, setBusy] = useState<BusyOperation | null>(null);
  const [message, setMessage] = useState<AccountMessage>(null);
  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [dangerArmed, setDangerArmed] = useState(false);
  const [riskAcknowledgements, setRiskAcknowledgements] = useState(initialRiskAcknowledgements);
  const operationInFlight = useRef(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
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
  }, [userId]);

  const run = async (name: BusyOperation, operation: () => Promise<unknown>, success: string) => {
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

  const protectedRun = async (operation: () => Promise<void>) => {
    if (biometricSupported && !(await unlockWithBiometric())) {
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

  const checklist = useMemo(() => buildApprovalChecklist(account.data?.approval), [account.data?.approval]);
  const readiness = checklist.filter((item) => item.passed).length;
  const riskQuizRequired = Boolean(account.data?.approval.manualReasons.includes('risk_quiz_required'));

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
      name: session?.user.name,
      email: session?.user.email,
    },
    ui: {
      busy,
      isBusy: busy !== null,
      expanded,
      message,
      toggleSection,
    },
    subscription: {
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
            const result = await consumer<{ url: string }>('beginDepositWallet');
            await Linking.openURL(result.url);
          },
          'Opened Polymarket wallet onboarding.',
        ),
    },
    approval: {
      checklist,
      readiness,
      riskAcknowledgements,
      riskQuizRequired,
      allRiskAcknowledged: Object.values(riskAcknowledgements).every(Boolean),
      toggleRiskAcknowledgement,
      submitReview: () => run('review', () => consumer('submitLiveReview', { riskQuizPassed: true }), 'Live review status updated.'),
    },
    signer: {
      account: account.data,
      renew: () => protectedRun(() => run('renew', () => consumer('renewSigner'), 'Signer authorization request started.')),
      revoke: () => protectedRun(() => run('revoke', () => consumer('revokeSigner'), 'Signer revocation started.')),
    },
    notifications: {
      values: account.data?.notifications,
      enabledCritical: countEnabledCriticalNotifications(account.data?.notifications),
      totalCritical: criticalNotificationTotal,
      update: updateNotification,
    },
    appearance: {
      preference,
      setPreference,
    },
    controls: {
      hasLinkedWallet: Boolean(account.data?.readOnlyAddress),
      dangerArmed,
      armDeletion: () => setDangerArmed(true),
      disconnectWallet: () =>
        protectedRun(() =>
          run('disconnect', () => consumer('disconnectWallet'), 'Polymarket disconnect and signer revocation started.'),
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
  };
}

export type AccountController = ReturnType<typeof useAccountController>;
