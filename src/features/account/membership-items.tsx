import { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ArrowCounterClockwise, Check, Copy, CreditCard, LinkSimple, ShieldCheck, Wallet } from 'phosphor-react-native';
import { ActionButton } from '@/components/ui-kit';
import { usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';
import { compactAddress } from './utils';

export function SubscriptionItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { subscription, ui } = controller;
  return (
    <AccountItem Icon={CreditCard} title="Subscription" detail="Required for auto-trading" status={subscription.active ? 'Active' : `${subscription.price}/mo`} tone={subscription.active ? 'success' : 'neutral'} expanded={ui.expanded === 'subscription'} onPress={() => ui.toggleSection('subscription')}>
      <Text style={[styles.body, { color: theme.textMuted }]}>Your subscription keeps auto-trading and account monitoring active.</Text>
      {Platform.OS !== 'web' ? (
        <View style={styles.actionStack}>
          {subscription.active ? (
            <ActionButton label="Manage subscription" variant="secondary" loading={ui.busy === 'manage'} disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'manage')} onPress={() => void subscription.manage()} />
          ) : (
            <ActionButton label={`Subscribe for ${subscription.price}`} icon={CreditCard as never} loading={ui.busy === 'purchase'} disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'purchase')} onPress={() => void subscription.purchase()} />
          )}
          <ActionButton label="Restore purchases" icon={ArrowCounterClockwise as never} variant="secondary" loading={ui.busy === 'restore'} disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'restore')} onPress={() => void subscription.restore()} />
        </View>
      ) : <Text style={[styles.body, { color: theme.textMuted }]}>Subscriptions are available in the iOS and Android apps.</Text>}
    </AccountItem>
  );
}

export function WalletItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { wallet, ui } = controller;
  const address = wallet.account?.depositWalletAddress;
  return (
    <AccountItem Icon={Wallet} title="Trading wallet" detail={address ? compactAddress(address) : 'Set up and fund your wallet'} status={address ? 'Connected' : 'Set up'} tone={address ? 'success' : 'neutral'} expanded={ui.expanded === 'wallet'} onPress={() => ui.toggleSection('wallet')}>
      <View style={styles.subsectionHeading}>
        <View style={[styles.smallIcon, { backgroundColor: theme.accentSoft }]}><ShieldCheck size={17} color={theme.accent} /></View>
        <View style={styles.flex}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>You control withdrawals</Text>
          <Text style={[styles.itemDetail, { color: theme.textMuted }]}>PolyClaw can only place trades within your limits.</Text>
        </View>
      </View>
      {address ? <Text selectable style={[styles.address, { color: theme.text }]}>{address}</Text> : null}
      <ActionButton label={!wallet.configured ? 'Wallet setup unavailable' : address ? 'Refresh deposit details' : 'Set up trading wallet'} variant="secondary" disabled={ui.readOnly || !wallet.configured || (ui.isBusy && ui.busy !== 'deposit')} loading={ui.busy === 'deposit'} onPress={() => void wallet.beginDepositWallet()} />
      {wallet.account?.walletLifecycle === 'APPROVALS_PENDING' ? <ActionButton label="Approve trading access" disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'approve-wallet')} loading={ui.busy === 'approve-wallet'} onPress={() => void wallet.approveTrading()} /> : null}
      {wallet.depositSetup ? (
        <View style={styles.actionStack}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>DEPOSIT ADDRESSES</Text>
          {Object.entries(wallet.depositSetup.addresses).filter((entry): entry is [string, string] => Boolean(entry[1])).map(([network, depositAddress]) => (
            <View key={network}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{network.toUpperCase()}</Text>
              <Text selectable style={[styles.address, { color: theme.text }]}>{depositAddress}</Text>
            </View>
          ))}
          {wallet.depositSetup.note ? <Text style={[styles.footnote, { color: theme.warning }]}>{wallet.depositSetup.note}</Text> : null}
        </View>
      ) : null}
    </AccountItem>
  );
}

export function PolymarketHistoryItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { wallet, ui } = controller;
  const linkedAddress = wallet.account?.readOnlyAddress;
  const [copied, setCopied] = useState(false);
  return (
    <AccountItem
      Icon={LinkSimple}
      title="Polymarket history"
      detail={linkedAddress ? compactAddress(linkedAddress) : 'Optional read-only address'}
      status={linkedAddress ? 'Linked' : 'Optional'}
      tone={linkedAddress ? 'success' : 'neutral'}
      expanded={ui.expanded === 'polymarket'}
      onPress={() => ui.toggleSection('polymarket')}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>Optional: link an existing Polymarket address to view its history. It is never used to place trades, hold deposits, or authorize the PolyClaw signer.</Text>
      <TextInput
        accessibilityLabel="Existing Polymarket wallet address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!ui.readOnly && !linkedAddress}
        onChangeText={wallet.setAddress}
        placeholder="0x…"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        value={linkedAddress ?? wallet.address}
      />
      {!linkedAddress ? <ActionButton label="Create ownership challenge" loading={ui.busy === 'challenge'} disabled={ui.readOnly || !wallet.address.trim() || (ui.isBusy && ui.busy !== 'challenge')} onPress={() => void wallet.createChallenge()} variant="secondary" /> : null}
      {wallet.challenge && !linkedAddress ? <>
        <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>SIGN THIS EXACT TEXT</Text>
        <Text selectable style={[styles.challenge, { backgroundColor: theme.field, color: theme.text }]}>{wallet.challenge}</Text>
        <ActionButton
          label={copied ? 'Challenge copied' : 'Copy challenge'}
          icon={(copied ? Check : Copy) as never}
          variant="secondary"
          onPress={() => void Clipboard.setStringAsync(wallet.challenge!).then(() => setCopied(true))}
        />
        <Text style={[styles.footnote, { color: theme.textMuted }]}>Open the wallet that controls this address, choose its Sign message or Sign personal message action, sign the copied text exactly, then paste the returned signature below. If your wallet cannot sign arbitrary messages, skip this optional link.</Text>
        <TextInput
          accessibilityLabel="Wallet ownership signature"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={wallet.setSignature}
          placeholder="Paste signature"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, styles.signature, { borderColor: theme.border, color: theme.text }]}
          value={wallet.signature}
        />
        <ActionButton label="Verify and link read-only" loading={ui.busy === 'verify'} disabled={ui.readOnly || !wallet.signature.trim() || (ui.isBusy && ui.busy !== 'verify')} onPress={() => void wallet.verifyOwnership()} />
      </> : null}
      {linkedAddress ? <Text style={[styles.footnote, { color: theme.textMuted }]}>Your dedicated funded PolyClaw wallet remains the only trading path.</Text> : null}
    </AccountItem>
  );
}
