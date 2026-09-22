import { Text } from 'react-native';
import { SignOut } from 'phosphor-react-native';

import { ActionButton, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { ApprovalItem, SignerItem } from '@/features/account/access-items';
import { SubscriptionItem, WalletItem } from '@/features/account/membership-items';
import { AccountMessageBanner, AccountProfile, SettingsGroup } from '@/features/account/primitives';
import { AppearanceItem, NotificationItem } from '@/features/account/preference-items';
import { AccountControlsItem, SafetyItem } from '@/features/account/security-items';
import { EducationItem } from '@/features/account/education-item';
import { accountStyles as styles } from '@/features/account/styles';
import { useAccountController } from '@/features/account/use-account-controller';
import { usePolyClawTheme } from '@/theme';

/**
 * Consumer Account: identity, then two groups of four.
 *
 * Nothing was removed — the wallet link/create/deposit routes and the live-access approval
 * checklist still expand inline, one tap from the tab bar, exactly as before.
 */
export default function ConsumerAccountScreen() {
  const { theme } = usePolyClawTheme();
  const controller = useAccountController();
  return (
    <Screen>
      <Header
        action={
          <StatusPill
            label={controller.resource.data?.mode ?? 'PAPER'}
            tone={controller.resource.data?.mode === 'LIVE' ? 'success' : 'warning'}
          />
        }
        title="Account"
      />
      <ResourceState error={controller.resource.error} loading={controller.resource.loading} />
      <AccountProfile email={controller.profile.email} name={controller.profile.name} userId={controller.profile.id} />
      <AccountMessageBanner message={controller.ui.message} />
      <EducationItem controller={controller} />

      <SettingsGroup title="Account">
        {controller.subscription.visible ? <SubscriptionItem controller={controller} /> : null}
        <WalletItem controller={controller} />
        <ApprovalItem controller={controller} />
        <SignerItem controller={controller} />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <NotificationItem controller={controller} />
        <AppearanceItem controller={controller} />
        <SafetyItem controller={controller} />
        <AccountControlsItem controller={controller} />
      </SettingsGroup>

      <ActionButton
        disabled={controller.ui.isBusy}
        icon={SignOut as never}
        label="Sign out"
        onPress={() => void controller.controls.signOut()}
        variant="secondary"
      />
      <Text style={[styles.versionNote, { color: theme.textMuted }]}>PolyClaw · Paper trading by default</Text>
    </Screen>
  );
}
