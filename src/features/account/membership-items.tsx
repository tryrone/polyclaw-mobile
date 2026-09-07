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
              disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'manage')}
              onPress={() => void subscription.manage()}
            />
          ) : (
            <ActionButton
              label={`Subscribe for ${subscription.price}`}
              icon={CreditCard as never}
              loading={ui.busy === 'purchase'}
              disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'purchase')}
              onPress={() => void subscription.purchase()}
            />
          )}
          <ActionButton
            label="Restore purchases"
            icon={ArrowCounterClockwise as never}
            variant="secondary"
            loading={ui.busy === 'restore'}
            disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'restore')}
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
      detail={wallet.account?.depositWalletAddress ? compactAddress(wallet.account.depositWalletAddress) : linkedAddress ? compactAddress(linkedAddress) : 'Create a bot wallet or link history'}
      status={wallet.account?.depositWalletAddress ? 'Bot wallet' : linkedAddress ? 'History linked' : 'Set up'}
      tone={wallet.account?.depositWalletAddress ? 'success' : 'neutral'}
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
            Link an existing wallet to view its Polymarket history. You’ll sign a message to confirm ownership. Your private key stays with you.
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
              disabled={ui.readOnly || !wallet.address.trim() || (ui.isBusy && ui.busy !== 'challenge')}
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
                disabled={ui.readOnly || !wallet.signature.trim() || (ui.isBusy && ui.busy !== 'verify')}
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
            <Text style={[styles.itemTitle, { color: theme.text }]}>Bot trading wallet</Text>
            <Text style={[styles.itemDetail, { color: theme.textMuted }]}>{wallet.account?.depositWalletAddress ? compactAddress(wallet.account.depositWalletAddress) : 'For deposits and approved bot trades'}</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          You control this wallet with your passkey. The bot can manage approved trades; only you can withdraw funds.
        </Text>
        <ActionButton
          label={!wallet.configured ? 'Wallet setup unavailable' : wallet.account?.depositWalletAddress ? 'Refresh deposit routes' : 'Create bot wallet'}
          variant="secondary"
          disabled={ui.readOnly || !wallet.configured || (ui.isBusy && ui.busy !== 'deposit')}
          loading={ui.busy === 'deposit'}
          onPress={() => void wallet.beginDepositWallet()}
        />
        {wallet.account?.walletLifecycle === 'APPROVALS_PENDING' ? <ActionButton label="Approve trading contracts" disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'approve-wallet')} loading={ui.busy === 'approve-wallet'} onPress={() => void wallet.approveTrading()} /> : null}
        {wallet.account?.walletLifecycle === 'FUNDED' ? <ActionButton label="Run $1 withdrawal test" variant="secondary" disabled={ui.readOnly || (ui.isBusy && ui.busy !== 'withdrawal')} loading={ui.busy === 'withdrawal'} onPress={() => void wallet.withdrawTestDollar()} /> : null}
        {!wallet.configured ? <Text style={[styles.footnote, { color: theme.warning }]}>Wallet setup is unavailable in this app version. You can continue reviewing your linked history.</Text> : null}
        {wallet.depositSetup ? (
          <View style={styles.actionStack}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>SUPPORTED ASSETS</Text>
            <Text style={[styles.body, { color: theme.text }]}>{wallet.depositSetup.supportedAssets.map((asset) => `${asset.symbol ?? asset.name ?? asset.assetId ?? 'Asset'} · chain ${asset.chainId}`).join('\n')}</Text>
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
      </View>
    </AccountItem>
  );
}
