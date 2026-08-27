import { Text } from 'react-native';
import { SignOut } from 'phosphor-react-native';
import { ActionButton, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { ApprovalItem, SignerItem } from '@/features/account/access-items';
import { SubscriptionItem, WalletItem } from '@/features/account/membership-items';
import { AccountMessageBanner, AccountProfile, SettingsGroup } from '@/features/account/primitives';
import { AppearanceItem, NotificationItem } from '@/features/account/preference-items';
import { AccountControlsItem, SafetyItem } from '@/features/account/security-items';
import { accountStyles as styles } from '@/features/account/styles';
import { useAccountController } from '@/features/account/use-account-controller';
import { usePolyClawTheme } from '@/theme';

export default function ConsumerAccountScreen() {
  const { theme } = usePolyClawTheme();
  const controller = useAccountController();
  return (
    <Screen>
      <Header
        title="Account"
        action={
          <StatusPill
            label={controller.resource.data?.mode ?? 'PAPER'}
            tone={controller.resource.data?.mode === 'LIVE' ? 'success' : 'warning'}
          />
        }
      />
      <ResourceState loading={controller.resource.loading} error={controller.resource.error} />
      <AccountProfile name={controller.profile.name} email={controller.profile.email} />
      <AccountMessageBanner message={controller.ui.message} />

      <SettingsGroup title="Membership & trading">
        <SubscriptionItem controller={controller} />
        <WalletItem controller={controller} />
        <ApprovalItem controller={controller} />
        <SignerItem controller={controller} />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <NotificationItem controller={controller} />
        <AppearanceItem controller={controller} />
      </SettingsGroup>

      <SettingsGroup title="Security & account">
        <SafetyItem controller={controller} />
        <AccountControlsItem controller={controller} />
      </SettingsGroup>

      <ActionButton
        label="Sign out"
        icon={SignOut as never}
        variant="secondary"
        disabled={controller.ui.isBusy}
        onPress={() => void controller.controls.signOut()}
      />
      <Text style={[styles.versionNote, { color: theme.textMuted }]}>PolyClaw · Paper trading by default</Text>
    </Screen>
  );
}
