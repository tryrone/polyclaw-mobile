import { useState } from 'react';
import { Text, View } from 'react-native';
import { CaretDown, CaretUp, CheckCircle, Key, ShieldCheck } from 'phosphor-react-native';
import { PressableScale } from '@/components/motion';
import { ActionButton, shortDate } from '@/components/ui-kit';
import { usePolyClawTheme } from '@/theme';
import { AccountItem, QuizItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';
import { humanize } from './utils';

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
