import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CaretDown, CaretUp, Check, CheckCircle, Copy, Key, ShieldCheck, Wallet } from 'phosphor-react-native';
import { PressableScale } from '@/components/motion';
import { ActionButton, shortDate } from '@/components/ui-kit';
import { usePolyClawTheme } from '@/theme';
import { AccountItem, QuizItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';
import { buildLiveSetupSteps, humanize, type LiveSetupStepId } from './utils';

export function LiveSetupItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { approval, signer, ui, wallet } = controller;
  const account = wallet.account;
  const expanded = ui.expanded === 'live-setup';
  const steps = buildLiveSetupSteps(account ?? undefined);
  const completed = steps.filter((step) => step.passed).length;
  const current = steps.find((step) => !step.passed);
  const allComplete = completed === steps.length;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(label);
  };

  const actionFor = (stepId: LiveSetupStepId) => {
    if (stepId === 'wallet') {
      return <ActionButton label={!wallet.configured ? 'Wallet setup unavailable' : 'Create dedicated wallet'} disabled={ui.readOnly || !wallet.configured || (ui.isBusy && ui.busy !== 'deposit')} loading={ui.busy === 'deposit'} onPress={() => void wallet.beginDepositWallet()} />;
    }
    if (stepId === 'approvals') {
      return <ActionButton label="Approve trading contracts" disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'approve-wallet')} loading={ui.busy === 'approve-wallet'} onPress={() => void wallet.approveTrading()} />;
    }
    if (stepId === 'funding') {
      return (
        <View style={styles.actionStack}>
          <ActionButton label={wallet.depositSetup ? 'Refresh funding status' : 'Get deposit addresses'} variant="secondary" disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'deposit')} loading={ui.busy === 'deposit'} onPress={() => void wallet.beginDepositWallet()} />
          {wallet.depositSetup ? (
            <View style={styles.depositRoutes}>
              {Object.entries(wallet.depositSetup.addresses).filter((entry): entry is [string, string] => Boolean(entry[1])).map(([network, address]) => (
                <View key={network} style={[styles.depositRoute, { borderColor: theme.border }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{network.toUpperCase()}</Text>
                    <Text selectable style={[styles.address, { color: theme.text }]}>{address}</Text>
                  </View>
                  <ActionButton label={copied === network ? 'Copied' : 'Copy'} icon={(copied === network ? Check : Copy) as never} variant="secondary" onPress={() => void copy(network, address)} />
                </View>
              ))}
              {wallet.depositSetup.note ? <Text style={[styles.footnote, { color: theme.warning }]}>{wallet.depositSetup.note}</Text> : null}
            </View>
          ) : null}
        </View>
      );
    }
    if (stepId === 'review') {
      return (
        <View style={styles.actionStack}>
          <QuizItem checked={approval.riskAcknowledgements.fullLoss} label="I can lose the full stake on a position." onPress={() => approval.toggleRiskAcknowledgement('fullLoss')} />
          <QuizItem checked={approval.riskAcknowledgements.unfilled} label="A limit order may remain partly filled or unfilled." onPress={() => approval.toggleRiskAcknowledgement('unfilled')} />
          <QuizItem checked={approval.riskAcknowledgements.noGuarantee} label="Subscription and past results do not guarantee profit or approval." onPress={() => approval.toggleRiskAcknowledgement('noGuarantee')} />
          <ActionButton
            label={approval.reviewReady ? 'Submit Live review' : 'Fund wallet before review'}
            disabled={ui.readOnly || !approval.reviewReady || !approval.allRiskAcknowledged || (ui.isBusy && ui.busy !== 'review')}
            loading={ui.busy === 'review'}
            onPress={() => void approval.submitReview()}
          />
        </View>
      );
    }
    if (stepId === 'signer') {
      return (
        <View style={styles.actionStack}>
          <View style={[styles.waitingNotice, { backgroundColor: theme.warningSoft }]}>
            <Key size={18} color={theme.warning} />
            <Text style={[styles.messageText, { color: theme.warning }]}>Waiting for Polymarket Session Key approval. You can tap below to recheck; no withdrawal permission is requested.</Text>
          </View>
          <ActionButton label="Check approval and authorize signer" disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'renew')} loading={ui.busy === 'renew'} onPress={() => void signer.renew()} />
        </View>
      );
    }
    if (stepId === 'activation') {
      const platformReady = Boolean(account?.approval.globalEngineApproved && account.approval.platformApproved);
      return <ActionButton label={platformReady ? 'Sign and activate Live' : 'Waiting for operator safety release'} disabled={ui.readOnly || !platformReady || (ui.isBusy && ui.busy !== 'enable')} loading={ui.busy === 'enable'} onPress={() => void signer.enable()} />;
    }
    return null;
  };

  return (
    <AccountItem
      Icon={ShieldCheck}
      title="Set up Live trading"
      detail={allComplete ? 'Ready to select Live and enable Auto-trade' : current?.label ?? 'Checking requirements'}
      status={allComplete ? 'Ready' : `${completed} of ${steps.length}`}
      tone={allComplete ? 'success' : 'warning'}
      expanded={expanded}
      onPress={() => ui.toggleSection('live-setup')}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>Your dedicated wallet is the only trading path. The restricted signer may place and close approved trades within your limits, but it cannot withdraw.</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length, now: completed }} accessibilityLabel="Live trading setup progress" style={[styles.progressTrack, { backgroundColor: theme.field }]}>
        <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${(completed / steps.length) * 100}%` as `${number}%` }]} />
      </View>
      <View style={styles.setupSteps}>
        {steps.map((step, index) => {
          const isCurrent = current?.id === step.id;
          return (
            <View key={step.id} style={[styles.setupStep, isCurrent && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
              <View style={[styles.stepMarker, { backgroundColor: step.passed ? theme.success : isCurrent ? theme.accent : theme.field, borderColor: step.passed ? theme.success : isCurrent ? theme.accent : theme.borderStrong }]}>
                {step.passed ? <Check size={15} color={theme.accentInk} weight="bold" /> : <Text style={[styles.stepNumber, { color: isCurrent ? theme.accentInk : theme.textMuted }]}>{index + 1}</Text>}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{step.label}</Text>
                <Text style={[styles.itemDetail, { color: theme.textMuted }]}>{step.detail}</Text>
                {isCurrent ? <View style={styles.currentStepAction}>{actionFor(step.id)}</View> : null}
              </View>
            </View>
          );
        })}
      </View>
      {account?.depositWalletAddress ? (
        <View style={[styles.walletSummary, { borderColor: theme.border }]}>
          <View style={styles.subsectionHeading}>
            <Wallet size={18} color={theme.accent} />
            <Text style={[styles.itemTitle, { color: theme.text }]}>Dedicated wallet</Text>
          </View>
          <Text selectable style={[styles.address, { color: theme.text }]}>{account.depositWalletAddress}</Text>
          <ActionButton label={copied === 'wallet' ? 'Wallet address copied' : 'Copy wallet address'} icon={(copied === 'wallet' ? Check : Copy) as never} variant="secondary" onPress={() => void copy('wallet', account.depositWalletAddress!)} />
        </View>
      ) : null}
      {account?.approval.ownerWithdrawalComplete ? (
        <Text style={[styles.footnote, { color: theme.success }]}>Withdrawal recovery test confirmed.</Text>
      ) : Number(account?.availablePusd ?? 0) >= 1 ? (
        <ActionButton
          label="Run optional $1 withdrawal test"
          variant="secondary"
          loading={ui.busy === 'withdrawal'}
          disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'withdrawal')}
          onPress={() => Alert.alert('Test withdrawal?', 'This returns $1 to your owner wallet and may lower your trading balance. It is not required to continue.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Withdraw $1', onPress: () => void wallet.withdrawTestDollar() }])}
        />
      ) : null}
      {account?.signerStatus && !['NOT_PROVISIONED', 'REVOKED'].includes(account.signerStatus) ? (
        <View style={[styles.subsection, { borderTopColor: theme.border }]}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>Safety controls</Text>
          {account.mode === 'LIVE' ? <ActionButton label="Pause new Live entries" variant="secondary" loading={ui.busy === 'disable'} disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'disable')} onPress={() => void signer.disable()} /> : null}
          <ActionButton label="Emergency revoke signer" variant="danger" loading={ui.busy === 'revoke'} disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'revoke')} onPress={() => void signer.revoke()} />
        </View>
      ) : null}
    </AccountItem>
  );
}

export function ApprovalItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { approval, ui } = controller;
  const expanded = ui.expanded === 'approval';
  const complete = approval.readiness === approval.checklist.length;
  const [showCompleted, setShowCompleted] = useState(false);
  const remaining = approval.checklist.filter((item) => !item.passed);
  const visibleSteps = showCompleted ? approval.checklist : remaining;
  return (
    <AccountItem
      Icon={ShieldCheck}
      title="Live trading access"
      detail={`${approval.readiness} of ${approval.checklist.length} requirements complete`}
      status={complete ? 'Ready' : 'In progress'}
      tone={complete ? 'success' : 'warning'}
      expanded={expanded}
      onPress={() => ui.toggleSection('approval')}
    >
      <View style={styles.progressSummary}>
        <Text style={[styles.itemTitle, { color: theme.text }]}>{complete ? 'All steps complete' : 'Your next steps'}</Text>
        <Text style={[styles.itemDetail, { color: theme.accent }]}>{approval.readiness}/{approval.checklist.length} complete</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: approval.checklist.length, now: approval.readiness }} accessibilityLabel="Live trading setup" style={[styles.progressTrack, { backgroundColor: theme.field }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.accent, width: `${(approval.readiness / approval.checklist.length) * 100}%` as `${number}%` },
          ]}
        />
      </View>
      <View style={styles.checklist}>
        {visibleSteps.map((item) => (
          <View key={item.id} style={styles.checkRow}>
            {item.passed ? <CheckCircle size={20} color={theme.success} weight="fill" /> : <View style={[styles.pendingDot, { borderColor: theme.accent }]} />}
            <View style={styles.flex}>
              <Text style={[styles.checkText, { color: theme.text }]}>{item.label}</Text>
              <Text style={[styles.itemDetail, { color: theme.textMuted }]}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      {approval.readiness > 0 ? <PressableScale accessibilityRole="button" accessibilityState={{ expanded: showCompleted }} onPress={() => setShowCompleted(!showCompleted)} style={styles.completedToggle}>
        <Text style={[styles.itemTitle, { color: theme.accent }]}>{showCompleted ? 'Hide completed steps' : `View ${approval.readiness} completed steps`}</Text>
        {showCompleted ? <CaretUp size={18} color={theme.accent} /> : <CaretDown size={18} color={theme.accent} />}
      </PressableScale> : null}
      {approval.riskQuizRequired ? (
        <View style={[styles.subsection, { borderTopColor: theme.border }]}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>Risk acknowledgement</Text>
          <QuizItem
            checked={approval.riskAcknowledgements.fullLoss}
            label="I can lose the full stake on a position."
            onPress={() => approval.toggleRiskAcknowledgement('fullLoss')}
          />
          <QuizItem
            checked={approval.riskAcknowledgements.unfilled}
            label="A limit order may remain partly filled or unfilled."
            onPress={() => approval.toggleRiskAcknowledgement('unfilled')}
          />
          <QuizItem
            checked={approval.riskAcknowledgements.noGuarantee}
            label="Subscription and past results do not guarantee profit or approval."
            onPress={() => approval.toggleRiskAcknowledgement('noGuarantee')}
          />
        </View>
      ) : null}
      <ActionButton
        label={approval.status === 'PENDING_REVIEW' ? 'Review pending' : approval.status === 'APPROVED' ? 'Wallet evidence approved' : approval.reviewReady ? 'Submit for live review' : 'Complete required steps first'}
        variant={approval.reviewReady ? "primary" : "secondary"}
        loading={ui.busy === 'review'}
        disabled={ui.readOnly || !approval.reviewReady || approval.status === 'PENDING_REVIEW' || approval.status === 'APPROVED' || (approval.riskQuizRequired && !approval.allRiskAcknowledged) || (ui.isBusy && ui.busy !== 'review')}
        onPress={() => void approval.submitReview()}
      />
      <Text style={[styles.footnote, { color: theme.textMuted }]}>Live trading starts only after your wallet review and bot authorization are approved.</Text>
    </AccountItem>
  );
}

export function SignerItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { signer, ui } = controller;
  const expanded = ui.expanded === 'signer';
  return (
    <AccountItem
      Icon={Key}
      title="Auto-trading authorization"
      detail={signer.account?.signerExpiresAt ? `Expires ${shortDate(signer.account.signerExpiresAt)}` : 'Permission to place published trades'}
      status={humanize(signer.account?.signerStatus ?? 'not provisioned')}
      tone={signer.account?.signerStatus === 'ACTIVE' ? 'success' : 'neutral'}
      expanded={expanded}
      onPress={() => ui.toggleSection('signer')}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Allow PolyClaw to place admin-published trades within your limits and close those positions. Withdrawals stay under your control.
      </Text>
      <View style={styles.actionStack}>
        {signer.account?.mode === 'LIVE' ? (
          <ActionButton
            label="Pause auto-trading"
            variant="secondary"
            loading={ui.busy === 'disable'}
            disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'disable')}
            onPress={() => void signer.disable()}
          />
        ) : signer.account?.signerStatus === 'ACTIVE' ? (
          <ActionButton
            label="Enable auto-trading"
            loading={ui.busy === 'enable'}
            disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'enable')}
            onPress={() => void signer.enable()}
          />
        ) : null}
        <ActionButton
          label="Renew authorization"
          variant="secondary"
          loading={ui.busy === 'renew'}
          disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'renew')}
          onPress={() => void signer.renew()}
        />
        <ActionButton
          label="Emergency revoke"
          variant="danger"
          loading={ui.busy === 'revoke'}
          disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'revoke')}
          onPress={() => void signer.revoke()}
        />
      </View>
    </AccountItem>
  );
}
