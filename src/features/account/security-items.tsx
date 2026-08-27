import { Text, View } from 'react-native';
import { Info, Trash, UserCircle } from 'phosphor-react-native';
import { ActionButton } from '@/components/ui-kit';
import { usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';

export function SafetyItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { ui } = controller;
  return (
    <AccountItem
      Icon={Info}
      title="Safety and disclosures"
      detail="How PolyClaw protects your access"
      expanded={ui.expanded === 'safety'}
      onPress={() => ui.toggleSection('safety')}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Paper performance is simulated and never guarantees future returns. Live trading remains gated by eligibility, wallet, risk, platform, and operational checks.
      </Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Contact support before trading if approval, order, wallet, or ledger information looks wrong.
      </Text>
    </AccountItem>
  );
}

export function AccountControlsItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { controls, ui } = controller;
  return (
    <AccountItem
      Icon={UserCircle}
      title="Account controls"
      detail="Disconnect wallet or delete your account"
      status="Sensitive"
      tone="danger"
      expanded={ui.expanded === 'controls'}
      onPress={() => ui.toggleSection('controls')}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Disconnecting revokes bot authorization after open orders are safely handled. Deletion preserves withdrawal access and legally required ledger records during wind-down.
      </Text>
      <View style={styles.actionStack}>
        <ActionButton
          label="Disconnect Polymarket"
          variant="secondary"
          disabled={!controls.hasLinkedWallet || (ui.isBusy && ui.busy !== 'disconnect')}
          loading={ui.busy === 'disconnect'}
          onPress={() => void controls.disconnectWallet()}
        />
        {controls.dangerArmed ? (
          <>
            <Text accessibilityRole="alert" style={[styles.dangerCopy, { color: theme.danger }]}>
              This begins safe wind-down and cannot be undone in the app.
            </Text>
            <ActionButton
              label="Confirm wind-down and deletion"
              icon={Trash as never}
              variant="danger"
              loading={ui.busy === 'delete'}
              disabled={ui.isBusy && ui.busy !== 'delete'}
              onPress={() => void controls.requestOffboarding()}
            />
          </>
        ) : (
          <ActionButton
            label="Delete PolyClaw account"
            icon={Trash as never}
            variant="danger"
            disabled={ui.isBusy}
            onPress={controls.armDeletion}
          />
        )}
      </View>
    </AccountItem>
  );
}
