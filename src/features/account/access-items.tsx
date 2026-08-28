import { Text, View } from 'react-native';
import { CheckCircle, Key, ShieldCheck } from 'phosphor-react-native';
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
      <View style={[styles.progressTrack, { backgroundColor: theme.field }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.accent, width: `${(approval.readiness / approval.checklist.length) * 100}%` as `${number}%` },
          ]}
        />
      </View>
      <View style={styles.checklist}>
        {approval.checklist.map((item) => (
          <View key={item.id} style={styles.checkRow}>
            {item.passed ? <CheckCircle size={20} color={theme.success} weight="fill" /> : <View style={[styles.pendingDot, { borderColor: theme.borderStrong }]} />}
            <View style={styles.flex}>
              <Text style={[styles.checkText, { color: item.passed ? theme.text : theme.textMuted }]}>{item.label}</Text>
              <Text style={[styles.itemDetail, { color: theme.textMuted }]}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
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
        variant="secondary"
        loading={ui.busy === 'review'}
        disabled={ui.readOnly || !approval.reviewReady || approval.status === 'PENDING_REVIEW' || approval.status === 'APPROVED' || (approval.riskQuizRequired && !approval.allRiskAcknowledged) || (ui.isBusy && ui.busy !== 'review')}
        onPress={() => void approval.submitReview()}
      />
      <Text style={[styles.footnote, { color: theme.textMuted }]}>During the internal pilot, an active grant and exact operator approval replace subscription access.</Text>
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
      title="Bot authorization"
      detail={signer.account?.signerExpiresAt ? `Expires ${shortDate(signer.account.signerExpiresAt)}` : 'No active session signer'}
      status={humanize(signer.account?.signerStatus ?? 'not provisioned')}
      tone={signer.account?.signerStatus === 'ACTIVE' ? 'success' : 'neutral'}
      expanded={expanded}
      onPress={() => ui.toggleSection('signer')}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>
        This CLOB-only authorization can place approved bot orders. It cannot withdraw funds.
      </Text>
      <View style={styles.actionStack}>
        {signer.account?.mode === 'LIVE' ? (
          <ActionButton
            label="Pause live bot"
            variant="secondary"
            loading={ui.busy === 'disable'}
            disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'disable')}
            onPress={() => void signer.disable()}
          />
        ) : signer.account?.signerStatus === 'ACTIVE' ? (
          <ActionButton
            label="Enable Live Bot"
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
