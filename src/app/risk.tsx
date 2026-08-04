import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PlayCircle } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { DetailScreen } from '@/components/detail-layout';
import { ActionButton, Card, Metric, ResourceState, StatusPill, money, percent } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { RiskData } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

export default function RiskScreen() {
  const { theme } = usePolyClawTheme(); const { request } = useAuth(); const resource = useOperatorResource<RiskData>('risk', 15_000); const data = resource.data; const [confirmation, setConfirmation] = useState(''); const [error, setError] = useState<string | null>(null);
  const expectedConfirmation = data?.executionMode === 'LIVE' ? 'RESUME LIVE TRADING' : 'RESUME PAPER TRADING';
  const resume = async () => { setError(null); try { await request('commands/resume', { method: 'POST', body: { confirmation, reason: 'Resumed from PolyClaw mobile' } }); setConfirmation(''); await resource.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not resume'); } };
  return <DetailScreen title="Risk controls" eyebrow="SERVER-ENFORCED"><ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />{data ? <>
    <Card><View style={styles.row}><View><Text style={[styles.heading, { color: theme.text }]}>Execution state</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{data.executionMode} mode · config {data.limits ? data.current.risk.configVersion : '—'}</Text></View><StatusPill label={data.tradingHalted ? 'HALTED' : 'ACTIVE'} tone={data.tradingHalted ? 'danger' : 'success'} /></View>{data.haltReason ? <Text style={[styles.reason, { color: theme.red }]}>{data.haltReason}</Text> : null}</Card>
    <Card><View style={styles.metrics}><Metric label="Fixed stake" value={money(data.limits.fixedStake)} /><Metric label="Open exposure" value={money(data.current.openExposure)} /><Metric label="Daily cap" value={money(data.limits.maxDailyExposure)} /><Metric label="Trades/session" value={String(data.limits.maxTradesPerSession)} /><Metric label="Warn drawdown" value={percent(data.limits.drawdownWarning)} /><Metric label="Halt drawdown" value={percent(data.limits.drawdownHalt)} /></View></Card>
    {data.tradingHalted ? <Card><Text style={[styles.heading, { color: theme.text }]}>Resume automation</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Verify venue health and exposure first. Type {expectedConfirmation} to continue.</Text><TextInput value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" placeholder={expectedConfirmation} placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} />{error ? <Text style={[styles.copy, { color: theme.red }]}>{error}</Text> : null}<ActionButton label={'Resume ' + data.executionMode.toLowerCase() + ' trading'} icon={PlayCircle} disabled={confirmation !== expectedConfirmation || resource.stale || !!resource.error} onPress={resume} /></Card> : null}
  </> : null}</DetailScreen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, heading: { fontFamily: fonts.semibold, fontSize: 16 }, copy: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 5 }, reason: { fontFamily: fonts.medium, fontSize: 12, marginTop: 14 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, input: { height: 50, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, marginVertical: 14, fontFamily: fonts.semibold, letterSpacing: 1 } });
