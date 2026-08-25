import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircle, Pause, Play, ShieldChevron } from 'phosphor-react-native';
import { useAuth } from '@/auth/provider';
import { PressableScale } from '@/components/motion';
import { ActionButton, Card, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

const riskOptions = [
  { value: 'CONSERVATIVE', title: 'Conservative', detail: '0.5% per trade · 3% daily · 5% drawdown' },
  { value: 'BALANCED', title: 'Balanced', detail: '1% per trade · 5% daily · 8% drawdown' },
  { value: 'AGGRESSIVE', title: 'Aggressive', detail: '2% per trade · 8% daily · 12% drawdown' },
] as const;

export default function BotScreen() {
  const { theme } = usePolyClawTheme(); const { consumer } = useAuth(); const resource = useConsumerDashboard();
  const [risk, setRisk] = useState<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | null>(null);
  const [maximum, setMaximum] = useState<string | null>(null); const [country, setCountry] = useState('NG'); const [invite, setInvite] = useState('');
  const [age, setAge] = useState(false); const [disclosure, setDisclosure] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const selectedRisk = risk ?? resource.data?.profile.riskAppetite ?? 'BALANCED';
  const maximumValue = maximum ?? String(resource.data?.profile.maximumTradeUsdc ?? 10);
  const setup = resource.data?.profile.botState === 'SETUP';
  const act = async (kind: 'activate' | 'save' | 'pause' | 'resume') => {
    setBusy(true); setError(null);
    try {
      if (kind === 'activate') await consumer('activate', { riskAppetite: selectedRisk, maximumTradeUsdc: Number(maximumValue), jurisdictionCode: country, ageConfirmed: age, riskDisclosureAccepted: disclosure, ...(invite ? { inviteCode: invite } : {}) });
      if (kind === 'save') await consumer('updateSettings', { riskAppetite: selectedRisk, maximumTradeUsdc: Number(maximumValue) });
      if (kind === 'pause') await consumer('pause');
      if (kind === 'resume') await consumer('resume');
      await resource.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update the bot'); }
    finally { setBusy(false); }
  };
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
    <Header eyebrow="AUTOMATION" title="Your bot" action={<StatusPill label={resource.data?.profile.botState ?? 'SYNCING'} tone={resource.data?.profile.botState === 'ACTIVE' ? 'success' : 'warning'} />} />
    <ResourceState loading={resource.loading} error={resource.error} />
    {resource.data ? <>
      <Card><Text style={[styles.heading, { color: theme.text }]}>Risk appetite</Text><Text style={[styles.copy, { color: theme.textMuted }]}>The server always applies the lowest of your trade cap and every profile limit.</Text>
        <View style={styles.options}>{riskOptions.map((option) => <PressableScale key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selectedRisk === option.value }} onPress={() => setRisk(option.value)} style={[styles.option, { borderColor: selectedRisk === option.value ? theme.accent : theme.border, backgroundColor: selectedRisk === option.value ? theme.accentSoft : theme.field }]}><View style={styles.flex}><Text style={[styles.optionTitle, { color: theme.text }]}>{option.title}</Text><Text style={[styles.optionDetail, { color: theme.textMuted }]}>{option.detail}</Text></View>{selectedRisk === option.value ? <CheckCircle size={22} color={theme.accent} weight="fill" /> : null}</PressableScale>)}</View>
      </Card>
      <Card><Text style={[styles.heading, { color: theme.text }]}>Maximum per trade</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Choose $1–$20. Your simulated balance stays fixed at $1,000.</Text><TextInput accessibilityLabel="Maximum amount per trade" keyboardType="decimal-pad" value={maximumValue} onChangeText={setMaximum} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} /></Card>
      {setup ? <Card variant="raised"><Text style={[styles.heading, { color: theme.text }]}>Release eligibility</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Paper trading only. No wallet, deposit, or real-money order is created.</Text><TextInput accessibilityLabel="Country code" autoCapitalize="characters" maxLength={3} value={country} onChangeText={setCountry} placeholder="NG" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} />{resource.data.release.activationRequiresInvite ? <TextInput accessibilityLabel="Invite code" value={invite} onChangeText={setInvite} placeholder="Invite code" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} /> : null}<Consent checked={age} onPress={() => setAge(!age)} label="I confirm I am 18 or older." /><Consent checked={disclosure} onPress={() => setDisclosure(!disclosure)} label="I understand this is a simulation and not financial advice." /><ActionButton label="Start 7-day paper trial" icon={ShieldChevron as never} loading={busy} disabled={busy || !age || !disclosure || Number(maximumValue) < 1 || Number(maximumValue) > 20} onPress={() => void act('activate')} /></Card> : <>
        <ActionButton label="Save risk settings" loading={busy} disabled={busy || Number(maximumValue) < 1 || Number(maximumValue) > 20} onPress={() => void act('save')} />
        {resource.data.profile.botState === 'ACTIVE' ? <ActionButton label="Pause bot" icon={Pause as never} variant="secondary" loading={busy} onPress={() => void act('pause')} /> : <ActionButton label="Resume bot" icon={Play as never} loading={busy} onPress={() => void act('resume')} />}
      </>}
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </> : null}
  </Screen>;
}

function Consent({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return <PressableScale accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.consent}>{checked ? <CheckCircle size={22} color={theme.success} weight="fill" /> : <View style={[styles.checkbox, { borderColor: theme.borderStrong }]} />}<Text style={[styles.consentText, { color: theme.textSoft }]}>{label}</Text></PressableScale>;
}

const styles = StyleSheet.create({ heading: { fontFamily: fonts.display, fontSize: 17 }, copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, marginTop: 5 }, options: { gap: spacing.sm, marginTop: spacing.lg }, option: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 66, padding: 13 }, optionTitle: { fontFamily: fonts.semibold, fontSize: 14 }, optionDetail: { fontFamily: fonts.regular, fontSize: 11, marginTop: 4 }, flex: { flex: 1 }, input: { borderRadius: radius.sm, borderWidth: 1, fontFamily: fonts.semibold, fontSize: 15, marginTop: spacing.lg, minHeight: 50, paddingHorizontal: 14 }, consent: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 48 }, checkbox: { borderRadius: 11, borderWidth: 1.5, height: 22, width: 22 }, consentText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18 }, error: { fontFamily: fonts.medium, fontSize: 12.5 } });
