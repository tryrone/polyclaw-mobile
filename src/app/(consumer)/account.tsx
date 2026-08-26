import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ArrowCounterClockwise, CreditCard, Key, Link as LinkIcon, Moon, ShieldCheck, SignOut, Sun, Trash } from 'phosphor-react-native';
import { useAuth } from '@/auth/provider';
import { getPolyClawSubscription, listenForCustomerInfo, openSubscriptionManagement, purchasePolyClawBot, restorePolyClawBot } from '@/billing/revenuecat';
import { PressableScale } from '@/components/motion';
import { ActionButton, Card, Header, ResourceState, Screen, SectionHeading, shortDate, StatusPill } from '@/components/ui-kit';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { ConsumerAccount } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

export default function ConsumerAccountScreen() {
  const { theme, preference, setPreference } = usePolyClawTheme();
  const { session, signOut, consumer, biometricSupported, unlockWithBiometric } = useAuth();
  const account = useConsumerResource<ConsumerAccount>('account', undefined, 45_000);
  const dashboard = useConsumerDashboard(60_000);
  const [price, setPrice] = useState('$9.99'); const [storeActive, setStoreActive] = useState(false); const [busy, setBusy] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const [address, setAddress] = useState(''); const [signature, setSignature] = useState(''); const [challenge, setChallenge] = useState<string | null>(null); const [dangerArmed, setDangerArmed] = useState(false);
  const [riskQuiz, setRiskQuiz] = useState({ fullLoss: false, unfilled: false, noGuarantee: false });
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cleanup: (() => boolean) | undefined;
    void getPolyClawSubscription(userId).then((state) => { setPrice(state.localizedPrice); setStoreActive(state.active); }).catch(() => undefined);
    void listenForCustomerInfo(userId, (info) => setStoreActive(Boolean(info.entitlements.active.POLYCLAW_BOT))).then((remove) => { cleanup = remove; }).catch(() => undefined);
    return () => { cleanup?.(); };
  }, [userId]);

  const run = async (name: string, operation: () => Promise<unknown>, success: string) => {
    setBusy(name); setMessage(null);
    try { await operation(); setMessage(success); await Promise.all([account.refresh(), dashboard.refresh()]); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The request could not be completed'); }
    finally { setBusy(null); }
  };
  const billing = (mode: 'purchase' | 'restore' | 'manage') => {
    if (!session) return Promise.resolve();
    return mode === 'purchase' ? purchasePolyClawBot(session.user.id) : mode === 'restore' ? restorePolyClawBot(session.user.id) : openSubscriptionManagement(session.user.id);
  };
  const protectedRun = async (operation: () => Promise<void>) => {
    if (biometricSupported && !(await unlockWithBiometric())) { setMessage('Authorization cancelled.'); return; }
    await operation();
  };
  const updateNotification = async (key: keyof ConsumerAccount['notifications'], value: boolean) => {
    if (!account.data) return;
    await run('notifications', () => consumer('updateNotifications', { ...account.data!.notifications, [key]: value }), 'Notification preferences saved.');
  };

  const checklist = [
    ['Invitation and disclosures', !account.data?.approval.manualReasons.includes('invite_required') && !account.data?.approval.manualReasons.includes('adult_confirmation_required') && !account.data?.approval.manualReasons.includes('risk_disclosure_required')],
    [`Paper history (${account.data?.approval.paperDays ?? 0}/7 days, ${account.data?.approval.settledBotPositions ?? 0}/10 bot positions)`, (account.data?.approval.paperDays ?? 0) >= 7 && (account.data?.approval.settledBotPositions ?? 0) >= 10],
    ['Eligible location and risk quiz', !account.data?.approval.manualReasons.includes('jurisdiction_not_eligible') && !account.data?.approval.manualReasons.includes('risk_quiz_required')],
    ['Funded Deposit Wallet', !account.data?.approval.manualReasons.includes('deposit_wallet_required') && !account.data?.approval.manualReasons.includes('funded_wallet_required')],
    ['Admin, engine and platform approval', !account.data?.approval.manualReasons.includes('admin_approval_required') && !account.data?.approval.manualReasons.includes('global_engine_not_approved') && !account.data?.approval.manualReasons.includes('platform_not_approved')],
  ] as const;

  return <Screen>
    <Header eyebrow="MEMBERSHIP · ACCESS · SECURITY" title="Account" action={<StatusPill label={account.data?.mode ?? 'PAPER'} tone={account.data?.mode === 'LIVE' ? 'success' : 'warning'} />} />
    <ResourceState loading={account.loading} error={account.error} />
    <Card><View style={styles.row}><View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}><Text style={[styles.avatarText, { color: theme.accent }]}>{(session?.user.name || session?.user.email || 'P').slice(0, 1).toUpperCase()}</Text></View><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{session?.user.name || 'PolyClaw member'}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{session?.user.email}</Text></View></View></Card>

    <SectionHeading title="Bot subscription" meta="NATIVE BILLING" />
    <Card><View style={styles.row}><CreditCard size={23} color={theme.accent} /><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>PolyClaw Bot · {price}/month</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Your one-time seven-day paper preview starts when you activate the bot. The store product has no second trial. Manual football trading and portfolio access do not require a subscription.</Text></View><StatusPill label={dashboard.data?.entitlement?.status ?? (storeActive ? 'ACTIVE' : 'NOT STARTED')} tone={dashboard.data?.entitlement?.active || storeActive ? 'success' : 'warning'} /></View>{Platform.OS !== 'web' ? <>{!dashboard.data?.entitlement?.active && !storeActive ? <ActionButton label={`Subscribe for ${price}`} icon={CreditCard as never} loading={busy === 'purchase'} onPress={() => void run('purchase', () => billing('purchase'), 'Subscription confirmed. Server access will refresh shortly.')} /> : <ActionButton label="Manage subscription" variant="secondary" onPress={() => void run('manage', () => billing('manage'), 'Opened store subscription management.')} />}<ActionButton label="Restore purchases" icon={ArrowCounterClockwise as never} variant="secondary" loading={busy === 'restore'} onPress={() => void run('restore', () => billing('restore'), 'Purchases restored. Server access will refresh shortly.')} /></> : <Text style={[styles.detail, { color: theme.textMuted }]}>Subscriptions are available only in the iOS and Android apps.</Text>}</Card>

    <SectionHeading title="Polymarket account" meta="READ ONLY FIRST" />
    <Card><Text style={[styles.name, { color: theme.text }]}>Existing account</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Linking proves address ownership for read-only history. PolyClaw never asks for or imports your existing private key.</Text>{account.data?.readOnlyAddress ? <><Text selectable style={[styles.address, { color: theme.accent }]}>{account.data.readOnlyAddress}</Text><StatusPill label={account.data.walletStatus} tone="success" /></> : <><TextInput accessibilityLabel="Polymarket wallet address" autoCapitalize="none" autoCorrect={false} placeholder="0x…" placeholderTextColor={theme.textMuted} value={address} onChangeText={setAddress} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} />{!challenge ? <ActionButton label="Create ownership challenge" icon={LinkIcon as never} loading={busy === 'challenge'} onPress={() => void run('challenge', async () => { const result = await consumer<{ challenge: string }>('createWalletChallenge', { address }); setChallenge(result.challenge); }, 'Challenge created. Sign the exact text with that wallet, then paste the signature below.')} /> : <><Text selectable style={[styles.challenge, { color: theme.text }]}>{challenge}</Text><TextInput accessibilityLabel="Wallet signature" autoCapitalize="none" autoCorrect={false} multiline placeholder="0x signed message" placeholderTextColor={theme.textMuted} value={signature} onChangeText={setSignature} style={[styles.input, styles.signature, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} /><ActionButton label="Verify and link address" loading={busy === 'verify'} onPress={() => void run('verify', () => consumer('verifyWalletOwnership', { address, signature }), 'Polymarket address linked for read-only history.')} /></>}</>}</Card>
    <Card><Text style={[styles.name, { color: theme.text }]}>Dedicated Deposit Wallet</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Live automation requires a compatible dedicated wallet. Funding and withdrawal stay on Polymarket-hosted pages; PolyClaw receives no withdrawal authority.</Text><StatusPill label={account.data?.walletStatus ?? 'UNLINKED'} tone={account.data?.walletStatus === 'DEPOSIT_WALLET_READY' ? 'success' : 'warning'} /><ActionButton label="Continue on Polymarket" variant="secondary" disabled={!account.data?.readOnlyAddress} loading={busy === 'deposit'} onPress={() => void run('deposit', async () => { const result = await consumer<{ url: string }>('beginDepositWallet'); await Linking.openURL(result.url); }, 'Opened Polymarket wallet onboarding.')} /></Card>

    <SectionHeading title="Live approval" meta={account.data?.approvalStatus ?? 'NOT ELIGIBLE'} />
    <Card>{checklist.map(([label, passed]) => <View key={label} style={styles.check}><ShieldCheck size={20} color={passed ? theme.success : theme.textMuted} weight={passed ? 'fill' : 'regular'} /><Text style={[styles.detail, { color: passed ? theme.text : theme.textMuted }]}>{label}</Text></View>)}<Text style={[styles.detail, { color: theme.textMuted }]}>Subscription is required for bot automation only. It can never unlock live trading by itself.</Text>{account.data?.approval.manualReasons.includes('risk_quiz_required') ? <View style={styles.quiz}><Text style={[styles.name, { color: theme.text }]}>Risk acknowledgement</Text><QuizItem checked={riskQuiz.fullLoss} label="I can lose the full stake on a position." onPress={() => setRiskQuiz((value) => ({ ...value, fullLoss: !value.fullLoss }))} /><QuizItem checked={riskQuiz.unfilled} label="A limit order can remain partially filled or unfilled." onPress={() => setRiskQuiz((value) => ({ ...value, unfilled: !value.unfilled }))} /><QuizItem checked={riskQuiz.noGuarantee} label="Subscriptions and past performance do not guarantee profit or live approval." onPress={() => setRiskQuiz((value) => ({ ...value, noGuarantee: !value.noGuarantee }))} /></View> : null}<ActionButton label="Submit for live review" variant="secondary" loading={busy === 'review'} disabled={account.data?.approval.manualReasons.includes('risk_quiz_required') && !Object.values(riskQuiz).every(Boolean)} onPress={() => void run('review', () => consumer('submitLiveReview', { riskQuizPassed: true }), 'Live review status updated.')} /></Card>

    <SectionHeading title="Session signer" meta={account.data?.signerStatus ?? 'NOT PROVISIONED'} />
    <Card><View style={styles.row}><Key size={22} color={theme.accent} /><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>CLOB-only authorization</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Expires {shortDate(account.data?.signerExpiresAt)}. It cannot withdraw funds or authorize your manual orders.</Text></View></View><ActionButton label="Renew authorization" variant="secondary" loading={busy === 'renew'} onPress={() => void protectedRun(() => run('renew', () => consumer('renewSigner'), 'Signer authorization request started.'))} /><ActionButton label="Emergency revoke" variant="danger" loading={busy === 'revoke'} onPress={() => void protectedRun(() => run('revoke', () => consumer('revokeSigner'), 'Signer revocation started.'))} /></Card>

    <SectionHeading title="Critical notifications" />
    <Card>{account.data ? (Object.entries(account.data.notifications) as [keyof ConsumerAccount['notifications'], boolean][]).map(([key, value]) => <View key={key} style={styles.preference}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{notificationLabel(key)}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{key === 'marketing' ? 'Optional product updates' : 'Safety and account-critical delivery'}</Text></View><Switch accessibilityLabel={notificationLabel(key)} value={value} onValueChange={(next) => void updateNotification(key, next)} trackColor={{ false: theme.greySoft, true: theme.accentSoft }} thumbColor={value ? theme.accent : theme.textMuted} /></View>) : null}</Card>

    <SectionHeading title="Security and support" />
    <Card><PressableScale accessibilityRole="button" accessibilityLabel="Change appearance" onPress={() => setPreference(preference === 'dark' ? 'light' : 'dark')} style={styles.row}>{preference === 'dark' ? <Moon size={22} color={theme.accent} weight="fill" /> : <Sun size={22} color={theme.warning} weight="fill" />}<View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>Appearance</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{preference === 'dark' ? 'Dark' : 'Light'} mode · dynamic text supported</Text></View></PressableScale><Text style={[styles.detail, { color: theme.textMuted }]}>Trading involves risk. Performance shown in paper mode is simulated and is not a promise of future results. Contact support before trading if any approval or ledger data looks wrong.</Text></Card>

    <SectionHeading title="Disconnect or leave" />
    <Card><Text style={[styles.detail, { color: theme.textMuted }]}>Disconnecting requires live orders to be settled or cancelled and begins signer revocation. Account deletion safely winds down bot entries, preserves withdrawals and required ledger records, then removes eligible personal data.</Text><ActionButton label="Disconnect Polymarket" variant="secondary" disabled={!account.data?.readOnlyAddress} onPress={() => void protectedRun(() => run('disconnect', () => consumer('disconnectWallet'), 'Polymarket disconnect and signer revocation started.'))} />{dangerArmed ? <ActionButton label="Confirm safe wind-down and deletion" icon={Trash as never} variant="danger" loading={busy === 'delete'} onPress={() => void protectedRun(() => run('delete', () => consumer('requestOffboarding'), 'Safe wind-down and offboarding started. Withdrawal access remains available.'))} /> : <ActionButton label="Delete PolyClaw account" icon={Trash as never} variant="danger" onPress={() => setDangerArmed(true)} />}</Card>
    <ActionButton label="Sign out" icon={SignOut as never} variant="secondary" onPress={() => void signOut()} />
    {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
  </Screen>;
}

function notificationLabel(key: keyof ConsumerAccount['notifications']) { return ({ authorizationExpiry: 'Authorization expiry', orderUpdates: 'Order updates', riskHalts: 'Drawdown and risk halts', billingWindDown: 'Billing wind-down', eligibilityLoss: 'Eligibility changes', marketing: 'Marketing' } as const)[key]; }

function QuizItem({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return <PressableScale accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.check}>{checked ? <ShieldCheck size={20} color={theme.success} weight="fill" /> : <View style={[styles.quizBox, { borderColor: theme.borderStrong }]} />}<Text style={[styles.detail, { color: theme.textMuted }]}>{label}</Text></PressableScale>;
}

const styles = StyleSheet.create({ row: { alignItems: 'center', flexDirection: 'row', gap: 13, minHeight: 54 }, avatar: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 }, avatarText: { fontFamily: fonts.displayExtraBold, fontSize: 20 }, flex: { flex: 1 }, name: { fontFamily: fonts.semibold, fontSize: 14 }, detail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 3 }, address: { fontFamily: fonts.semibold, fontSize: 12, marginVertical: spacing.md }, input: { borderRadius: radius.sm, borderWidth: 1, fontFamily: fonts.medium, fontSize: 13, minHeight: 48, marginTop: spacing.md, paddingHorizontal: 12 }, signature: { minHeight: 86, paddingVertical: 12, textAlignVertical: 'top' }, challenge: { borderRadius: radius.sm, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, marginTop: spacing.md }, check: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 44 }, quiz: { marginTop: spacing.md }, quizBox: { borderRadius: 4, borderWidth: 1.5, height: 20, width: 20 }, preference: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 58 }, message: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' } });
