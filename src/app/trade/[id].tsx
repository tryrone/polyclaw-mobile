import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { DetailScreen } from '@/components/detail-layout';
import { ActionButton, Card, Metric, ResourceState, StatusPill, money, percent, shortDate } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { Trade } from '@/lib/types';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export default function TradeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { theme } = usePolyClawTheme(); const { request } = useAuth();
  const resource = useOperatorResource<Trade>('trades/' + id, 20_000); const trade = resource.data;
  const cancel = async () => { await request('trades/' + id + '/cancel', { method: 'POST', body: { reason: 'Cancelled from PolyClaw mobile' } }); await resource.refresh(); };
  return <DetailScreen title="Trade detail" eyebrow="DECISION TRACE"><ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />{trade ? <>
    <Card><View style={styles.row}><StatusPill label={trade.mode} /><StatusPill label={trade.status} tone={trade.status === 'PLANNED' ? 'warning' : trade.status === 'CANCELLED' ? 'danger' : 'success'} /></View><Text style={[styles.fixture, { color: theme.text }]}>{trade.fixtureLabel}</Text><Text style={[styles.market, { color: theme.textMuted }]}>{trade.market} · {trade.side}</Text></Card>
    <Card><View style={styles.metrics}><Metric label="Planned stake" value={money(trade.plannedStake)} /><Metric label="Filled size" value={money(trade.filledSize)} /><Metric label="Probability" value={percent(trade.probability)} /><Metric label="Edge" value={percent(trade.edge)} accent /></View></Card>
    <Card><Row label="Venue" value={trade.venue} /><Row label="Client order ID" value={trade.clientOrderId} /><Row label="Exchange order ID" value={trade.exchangeOrderId ?? 'Not submitted'} /><Row label="Intent created" value={shortDate(trade.intentCreatedAt)} /><Row label="Submitted" value={shortDate(trade.submittedAt)} /><Row label="Kickoff" value={shortDate(trade.kickoff)} /></Card>
    {trade.status === 'PLANNED' ? <ActionButton label="Cancel planned trade" variant="danger" disabled={resource.stale || !!resource.error} onPress={cancel} /> : null}
  </> : null}</DetailScreen>;
}
function Row({ label, value }: { label: string; value: string }) { const { theme } = usePolyClawTheme(); return <View style={[styles.dataRow, { borderBottomColor: theme.border }]}><Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.rowValue, { color: theme.text }]} numberOfLines={2}>{value}</Text></View>; }
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8 }, fixture: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27, marginTop: 18 }, market: { fontFamily: fonts.regular, fontSize: 13, marginTop: 7 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, dataRow: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, rowLabel: { fontFamily: fonts.regular, fontSize: 12 }, rowValue: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'right', flex: 1 } });
