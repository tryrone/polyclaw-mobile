import { Platform, Text, TextInput, View } from 'react-native';
import { ArrowCounterClockwise, CreditCard, Link as LinkIcon, ShieldCheck, Wallet } from 'phosphor-react-native';
import { ActionButton } from '@/components/ui-kit';
import { usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';
import { compactAddress } from './utils';

export function SubscriptionItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { subscription, ui } = controller;
  const expanded = ui.expanded === 'subscription';
  return (
    <AccountItem
      Icon={CreditCard}
      title="Bot subscription"
      detail="Automation and advanced analytics"
      status={subscription.active ? 'Active' : `${subscription.price}/mo`}
      tone={subscription.active ? 'success' : 'neutral'}
      expanded={expanded}
      onPress={() => ui.toggleSection('subscription')}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Includes a one-time seven-day paper preview. Portfolio access stays available without a subscription.
      </Text>
      {Platform.OS !== 'web' ? (
        <View style={styles.actionStack}>
          {subscription.active ? (
            <ActionButton
              label="Manage subscription"
              variant="secondary"
              loading={ui.busy === 'manage'}
              disabled={ui.isBusy && ui.busy !== 'manage'}
              onPress={() => void subscription.manage()}
            />
          ) : (
            <ActionButton
              label={`Subscribe for ${subscription.price}`}
              icon={CreditCard as never}
              loading={ui.busy === 'purchase'}
              disabled={ui.isBusy && ui.busy !== 'purchase'}
              onPress={() => void subscription.purchase()}
            />
          )}
          <ActionButton
            label="Restore purchases"
            icon={ArrowCounterClockwise as never}
            variant="secondary"
            loading={ui.busy === 'restore'}
            disabled={ui.isBusy && ui.busy !== 'restore'}
            onPress={() => void subscription.restore()}
          />
        </View>
      ) : (
        <Text style={[styles.body, { color: theme.textMuted }]}>Subscriptions are available in the iOS and Android apps.</Text>
      )}
    </AccountItem>
  );
}

export function WalletItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { wallet, ui } = controller;
  const expanded = ui.expanded === 'wallet';
  const linkedAddress = wallet.account?.readOnlyAddress;
  return (
    <AccountItem
      Icon={Wallet}
      title="Polymarket wallet"
      detail={linkedAddress ? compactAddress(linkedAddress) : 'Link an address for read-only history'}
      status={linkedAddress ? 'Linked' : 'Not linked'}
      tone={linkedAddress ? 'success' : 'neutral'}
      expanded={expanded}
      onPress={() => ui.toggleSection('wallet')}
    >
      {linkedAddress ? (
        <>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>LINKED ADDRESS</Text>
          <Text selectable style={[styles.address, { color: theme.text }]}>{linkedAddress}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Prove ownership to import read-only history. PolyClaw never asks for your private key.
          </Text>
          <TextInput
            accessibilityLabel="Polymarket wallet address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="0x wallet address"
            placeholderTextColor={theme.textMuted}
            value={wallet.address}
            onChangeText={wallet.setAddress}
            style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]}
          />
          {!wallet.challenge ? (
            <ActionButton
              label="Create ownership challenge"
              icon={LinkIcon as never}
              loading={ui.busy === 'challenge'}
              disabled={!wallet.address.trim() || (ui.isBusy && ui.busy !== 'challenge')}
              onPress={() => void wallet.createChallenge()}
            />
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>MESSAGE TO SIGN</Text>
              <Text selectable style={[styles.challenge, { color: theme.text, backgroundColor: theme.field }]}>
                {wallet.challenge}
              </Text>
              <TextInput
                accessibilityLabel="Wallet signature"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                placeholder="0x signed message"
                placeholderTextColor={theme.textMuted}
                value={wallet.signature}
                onChangeText={wallet.setSignature}
                style={[styles.input, styles.signature, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]}
              />
              <ActionButton
                label="Verify and link address"
                loading={ui.busy === 'verify'}
                disabled={!wallet.signature.trim() || (ui.isBusy && ui.busy !== 'verify')}
                onPress={() => void wallet.verifyOwnership()}
              />
            </>
          )}
        </>
      )}

      <View style={[styles.subsection, { borderTopColor: theme.border }]}>
        <View style={styles.subsectionHeading}>
          <View style={[styles.smallIcon, { backgroundColor: theme.accentSoft }]}>
            <ShieldCheck size={17} color={theme.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.itemTitle, { color: theme.text }]}>Dedicated Deposit Wallet</Text>
            <Text style={[styles.itemDetail, { color: theme.textMuted }]}>Required only for approved live trading</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Funding and withdrawals stay on Polymarket. PolyClaw never receives withdrawal authority.
        </Text>
        <ActionButton
          label="Continue on Polymarket"
          variant="secondary"
          disabled={!linkedAddress || (ui.isBusy && ui.busy !== 'deposit')}
          loading={ui.busy === 'deposit'}
          onPress={() => void wallet.beginDepositWallet()}
        />
      </View>
    </AccountItem>
  );
}
