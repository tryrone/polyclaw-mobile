import { Text, View } from 'react-native';
import { SignOut } from 'phosphor-react-native';

import { ThemePicker } from '@/components/theme-picker';
import { ConsumerAccountSkeleton } from '@/components/page-skeletons';
import { ActionButton, Header, ResourceState, Screen } from '@/components/ui-kit';
import { SignerItem } from '@/features/account/access-items';
import { SubscriptionItem, WalletItem } from '@/features/account/membership-items';
import { AccountMessageBanner, AccountProfile, SettingsGroup } from '@/features/account/primitives';
import { NotificationItem } from '@/features/account/preference-items';
import { AccountControlsItem, SafetyItem } from '@/features/account/security-items';
import { AutoTradeItem } from '@/features/account/auto-trade-items';
import { accountStyles as styles } from '@/features/account/styles';
import { useAccountController } from '@/features/account/use-account-controller';
import { usePolyClawTheme } from '@/theme';

/**
 * Consumer Account: identity, auto-trade consent and limits, the PolyClaw trading wallet and
 * funding, subscription, notifications, security, signer status and sign-out.
 */
export default function ConsumerAccountScreen() {
  const { theme } = usePolyClawTheme();
  const controller = useAccountController();
  const initialLoading = controller.resource.loading && controller.resource.data === null;

  if (initialLoading) return (
    <Screen>
      <Header title="Account" />
      <ResourceState loading loadingFallback={<ConsumerAccountSkeleton />} />
    </Screen>
  );

  return (
    <Screen>
      <Header title="Account" />
      <ResourceState error={controller.resource.error} />
      <AccountProfile email={controller.profile.email} name={controller.profile.name} userId={controller.profile.id} />
      <AccountMessageBanner message={controller.ui.message} />

      <SettingsGroup title="Account">
        <AutoTradeItem />
        {controller.subscription.visible ? <SubscriptionItem controller={controller} /> : null}
        <WalletItem controller={controller} />
        <SignerItem controller={controller} />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <View style={styles.preferenceInset}>
          <ThemePicker />
        </View>
        <NotificationItem controller={controller} />
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
      <Text style={[styles.versionNote, { color: theme.textMuted }]}>PolyClaw · You control your limits</Text>
    </Screen>
  );
}
