import { useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { BookOpen, CaretRight, CheckCircle, Info, Pause, Play, Robot, ShieldChevron } from 'phosphor-react-native';
import { useAuth } from '@/auth/provider';
import { PressableScale } from '@/components/motion';
import { ActionButton, Card, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

const riskOptions = [
  { value: 'CONSERVATIVE', title: 'Conservative', detail: 'Lower exposure', limits: ['0.5%', '3%', '5%'] },
  { value: 'BALANCED', title: 'Balanced', detail: 'Moderate exposure', limits: ['1%', '5%', '8%'] },
  { value: 'AGGRESSIVE', title: 'Aggressive', detail: 'Higher exposure', limits: ['10%', '10%', '12%'] },
] as const;

export default function BotScreen() {
  const { theme } = usePolyClawTheme(); const { consumer } = useAuth(); const resource = useConsumerDashboard(); const router = useRouter();
  const [risk, setRisk] = useState<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | null>(null);
  const [maximum, setMaximum] = useState<string | null>(null); const [country, setCountry] = useState('NG'); const [invite, setInvite] = useState('');
  const [age, setAge] = useState(false); const [disclosure, setDisclosure] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const selectedRisk = risk ?? resource.data?.profile.riskAppetite ?? 'BALANCED';
  const maximumValue = maximum ?? String(resource.data?.profile.maximumTradeUsdc ?? 10);
  const [saved, setSaved] = useState(false);
  const validMaximum = maximumValue.trim() !== '' && Number.isFinite(Number(maximumValue)) && Number(maximumValue) >= 1 && Number(maximumValue) <= 100;
  const dirty = selectedRisk !== resource.data?.profile.riskAppetite || Number(maximumValue) !== resource.data?.profile.maximumTradeUsdc;
  const selectedOption = riskOptions.find((option) => option.value === selectedRisk)!;
  const setup = resource.data?.profile.botState === 'SETUP';
  const pilotAccessMode = resource.data?.access.mode !== 'SUBSCRIPTION';
  const act = async (kind: 'activate' | 'save' | 'pause' | 'resume' | 'request-access') => {
    setBusy(true); setError(null); setSaved(false);
    try {
      if (kind === 'activate') await consumer('activate', { riskAppetite: selectedRisk, maximumTradeUsdc: Number(maximumValue), jurisdictionCode: country, ageConfirmed: age, riskDisclosureAccepted: disclosure, ...(invite ? { inviteCode: invite } : {}) });
      if (kind === 'save') await consumer('updateSettings', { riskAppetite: selectedRisk, maximumTradeUsdc: Number(maximumValue) });
      if (kind === 'pause') await consumer('pause');
      if (kind === 'resume') await consumer('resume');
      if (kind === 'request-access') await consumer('requestPilotAccess', { reason: 'Request access to continue the PolyClaw internal pilot', idempotencyKey: randomUUID() });
      await resource.refresh();
      if (kind === 'save') setSaved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update the bot'); }
    finally { setBusy(false); }
  };
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
    <Header eyebrow="PAPER TRADING" title="Your bot" action={<StatusPill label={!resource.data ? 'SYNCING' : setup ? 'SETUP' : resource.data.profile.botState === 'ACTIVE' ? 'RUNNING' : resource.data.profile.botState === 'CLOSED' ? 'CLOSED' : 'PAUSED'} tone={resource.data?.profile.botState === 'ACTIVE' ? 'success' : 'warning'} />} />
    <ResourceState loading={resource.loading} error={resource.error} />
    {resource.data ? <>
      {!resource.data.access.active ? <Card variant="raised"><View style={styles.noticeTitle}><Info size={21} color={theme.warning} weight="fill" /><Text style={[styles.heading, { color: theme.text }]}>{pilotAccessMode ? 'Pilot access needed' : 'Subscription access needed'}</Text></View><Text style={[styles.copy, { color: theme.textMuted }]}>{!pilotAccessMode ? 'Open Account to restore or manage the subscription required for new bot positions.' : resource.data.access.pilotRequest?.status === 'PENDING' ? 'Your request is waiting for a pilot administrator. You can still review your portfolio, but the paper bot cannot create new positions until access is renewed.' : resource.data.access.pilotGrant?.status === 'EXPIRED' ? `Your pilot grant expired${resource.data.access.pilotGrant.expiresAt ? ` on ${new Date(resource.data.access.pilotGrant.expiresAt).toLocaleDateString()}` : ''}. Request renewal to continue building your paper history.` : 'Request a 30-day pilot grant to start or resume your paper bot.'}</Text><ActionButton label={!pilotAccessMode ? 'Open account' : resource.data.access.pilotRequest?.status === 'PENDING' ? 'Access request pending' : 'Request pilot access'} variant="secondary" loading={busy} disabled={busy || (pilotAccessMode && resource.data.access.pilotRequest?.status === 'PENDING')} onPress={() => pilotAccessMode ? void act('request-access') : router.push('/account')} /></Card> : null}
      {!setup && resource.data.access.active ? <Card variant="raised">
        <View style={styles.statusRow}>
          <View style={[styles.botIcon, { backgroundColor: theme.accentSoft }]}><Robot size={24} color={theme.accent} /></View>
          <View style={styles.flex}><Text style={[styles.heading, { color: theme.text }]}>{resource.data.profile.botState === 'ACTIVE' ? 'Paper bot is running' : 'Paper bot is paused'}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Simulated trades · $1,000 practice balance</Text></View>
        </View>
        {resource.data.profile.botState === 'ACTIVE' ? <ActionButton label="Pause bot" icon={Pause as never} variant="secondary" loading={busy} onPress={() => void act('pause')} /> : resource.data.access.active ? <ActionButton label="Resume bot" icon={Play as never} variant="secondary" loading={busy} onPress={() => void act('resume')} /> : <Text style={[styles.copy, { color: theme.warning }]}>Restore access above to resume trading.</Text>}
      </Card> : null}
      <Card>
        <Text style={[styles.heading, { color: theme.text }]}>Risk profile</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>Choose how much of your balance the bot can put at risk.</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Risk profile" style={styles.options}>{riskOptions.map((option) => <PressableScale key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selectedRisk === option.value }} onPress={() => { setRisk(option.value); setSaved(false); }} style={[styles.option, { borderColor: selectedRisk === option.value ? theme.accent : theme.border, backgroundColor: selectedRisk === option.value ? theme.accentSoft : theme.panel }]}>
          <View style={styles.flex}><Text style={[styles.optionTitle, { color: theme.text }]}>{option.title}</Text><Text style={[styles.optionDetail, { color: theme.textMuted }]}>{option.detail}</Text></View>
          {selectedRisk === option.value ? <CheckCircle size={22} color={theme.accent} weight="fill" /> : <View style={[styles.checkbox, { borderColor: theme.borderStrong }]} />}
        </PressableScale>)}</View>
        <View style={[styles.limits, { backgroundColor: theme.field }]}>{['Per trade', 'Daily limit', 'Drawdown'].map((label, index) => <View key={label} style={styles.limit}><Text style={[styles.limitValue, { color: theme.text }]}>{selectedOption.limits[index]}</Text><Text style={[styles.limitLabel, { color: theme.textMuted }]}>{label}</Text></View>)}</View>
      </Card>
      <Card>
        <View style={styles.between}><Text style={[styles.heading, { color: theme.text }]}>Trade cap</Text><Text style={[styles.optionDetail, { color: theme.textMuted }]}>$1–$100</Text></View>
        <Text style={[styles.copy, { color: theme.textMuted }]}>The most you want to stake on a single trade.</Text>
        <View style={[styles.amountField, { backgroundColor: theme.field, borderColor: validMaximum ? theme.border : theme.danger }]}><Text style={[styles.currency, { color: theme.textMuted }]}>$</Text><TextInput accessibilityLabel="Maximum amount per trade in US dollars" keyboardType="decimal-pad" returnKeyType="done" value={maximumValue} onChangeText={(value) => { setMaximum(value); setSaved(false); }} style={[styles.amountInput, { color: theme.text }]} /><Text style={[styles.optionDetail, { color: theme.textMuted }]}>USD</Text></View>
        <View style={styles.presets}>{[5, 10, 25, 50, 100].map((value) => <PressableScale key={value} containerStyle={styles.flex} accessibilityRole="button" accessibilityLabel={`Set trade cap to ${value} dollars`} accessibilityState={{ selected: Number(maximumValue) === value }} onPress={() => { setMaximum(String(value)); setSaved(false); }} style={[styles.preset, { backgroundColor: Number(maximumValue) === value ? theme.accentSoft : theme.field, borderColor: Number(maximumValue) === value ? theme.accent : theme.border }]}><Text style={[styles.presetText, { color: Number(maximumValue) === value ? theme.accent : theme.textSoft }]}>${value}</Text></PressableScale>)}</View>
        <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: validMaximum ? theme.textMuted : theme.danger }]}>{validMaximum ? 'Your risk profile and remaining daily allowance may reduce the actual stake.' : 'Enter an amount from $1 to $100.'}</Text>
        {!setup ? <View style={styles.saveAction}><ActionButton label={saved && !dirty ? 'Settings saved' : 'Save risk settings'} loading={busy} disabled={busy || !validMaximum || !dirty} onPress={() => void act('save')} />{saved ? <Text accessibilityLiveRegion="polite" style={[styles.saved, { color: theme.success }]}>Your risk settings are up to date.</Text> : null}</View> : null}
      </Card>
      {setup ? <Card variant="raised"><Text style={[styles.heading, { color: theme.text }]}>Release eligibility</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Paper trading only. No wallet, deposit, or real-money order is created.</Text><TextInput accessibilityLabel="Country code" autoCapitalize="characters" maxLength={3} value={country} onChangeText={setCountry} placeholder="NG" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} />{resource.data.release.activationRequiresInvite ? <TextInput accessibilityLabel="Invite code" value={invite} onChangeText={setInvite} placeholder="Invite code" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} /> : null}<Consent checked={age} onPress={() => setAge(!age)} label="I confirm I am 18 or older." /><Consent checked={disclosure} onPress={() => setDisclosure(!disclosure)} label="I understand this is a simulation and not financial advice." /><ActionButton label={!resource.data.access.active ? 'Pilot access required' : resource.data.access.mode === 'PILOT' ? 'Start pilot paper bot' : 'Start 7-day paper trial'} icon={ShieldChevron as never} loading={busy} disabled={busy || !resource.data.access.active || !age || !disclosure || !validMaximum} onPress={() => void act('activate')} /></Card> : null}
      <PressableScale accessibilityRole="button" onPress={() => router.push('/getting-started')} style={styles.guide}><BookOpen size={20} color={theme.accent} /><Text style={[styles.guideText, { color: theme.textSoft }]}>How paper trading works</Text><CaretRight size={18} color={theme.textMuted} /></PressableScale>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </> : null}
  </Screen>;
}

function Consent({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return <PressableScale accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.consent}>{checked ? <CheckCircle size={22} color={theme.success} weight="fill" /> : <View style={[styles.checkbox, { borderColor: theme.borderStrong }]} />}<Text style={[styles.consentText, { color: theme.textSoft }]}>{label}</Text></PressableScale>;
}

const styles = StyleSheet.create({ heading: { fontFamily: fonts.display, fontSize: 17, flexShrink: 1 }, copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, marginTop: 5 }, statusRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }, botIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, limits: { flexDirection: 'row', borderRadius: 12, marginTop: 16, paddingVertical: 14 }, limit: { flex: 1, alignItems: 'center', gap: 5 }, limitValue: { fontFamily: fonts.bold, fontSize: 19 }, limitLabel: { fontFamily: fonts.medium, fontSize: 11 }, amountField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginTop: 16, paddingHorizontal: 16, gap: 8 }, currency: { fontSize: 24, fontFamily: fonts.medium }, amountInput: { flex: 1, minWidth: 0, minHeight: 64, fontFamily: fonts.display, fontSize: 30 }, presets: { flexDirection: 'row', gap: 6, marginVertical: 12 }, preset: { minHeight: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, presetText: { fontFamily: fonts.semibold, fontSize: 12 }, saveAction: { marginTop: 16, gap: 8 }, saved: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'center' }, guide: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 }, guideText: { flex: 1, fontFamily: fonts.medium, fontSize: 13 }, noticeTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, options: { gap: spacing.sm, marginTop: spacing.lg }, option: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 66, padding: 13 }, optionTitle: { fontFamily: fonts.semibold, fontSize: 14 }, optionDetail: { fontFamily: fonts.regular, fontSize: 11, marginTop: 4 }, flex: { flex: 1 }, input: { borderRadius: radius.sm, borderWidth: 1, fontFamily: fonts.semibold, fontSize: 15, marginTop: spacing.lg, minHeight: 50, paddingHorizontal: 14 }, consent: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 48 }, checkbox: { borderRadius: 11, borderWidth: 1.5, height: 22, width: 22 }, consentText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18 }, error: { fontFamily: fonts.medium, fontSize: 12.5 } });
