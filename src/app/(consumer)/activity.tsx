import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card, Header, money, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export default function ConsumerActivity() {
  const { theme } = usePolyClawTheme(); const resource = useConsumerDashboard(30_000); const data = resource.data;
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}><Header eyebrow="DECISION LEDGER" title="Activity" /><ResourceState loading={resource.loading} error={resource.error} />
    {data?.positions.map((position) => <Card key={position.id}><View style={styles.row}><View style={styles.flex}><Text style={[styles.title, { color: theme.text }]}>{position.fixtureLabel}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{position.selectionLabel} · {position.market} · {(position.probability * 100).toFixed(1)}% model probability</Text></View><StatusPill label={position.status} tone={position.status === 'SETTLED' ? 'success' : position.status === 'SKIPPED' ? 'warning' : 'neutral'} /></View><View style={styles.amounts}><Text style={[styles.amount, { color: theme.text }]}>{money(position.plannedStakeUsdc)}</Text>{position.realizedPnlUsdc != null ? <Text style={[styles.pnl, { color: position.realizedPnlUsdc >= 0 ? theme.success : theme.danger }]}>{position.realizedPnlUsdc >= 0 ? '+' : ''}{money(position.realizedPnlUsdc)}</Text> : null}</View>{position.rejectionReasons?.length ? <Text style={[styles.reason, { color: theme.warning }]}>Skipped: {position.rejectionReasons.join(' · ')}</Text> : null}</Card>)}
    {data && !data.positions.length ? <Card><Text style={[styles.title, { color: theme.text }]}>No decisions yet</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Automatic decisions will appear here with their quote, risk snapshot, and outcome.</Text></Card> : null}
  </Screen>;
}
const styles = StyleSheet.create({ row: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 }, flex: { flex: 1 }, title: { fontFamily: fonts.display, fontSize: 15 }, detail: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, marginTop: 4 }, amounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg }, amount: { fontFamily: fonts.bold, fontSize: 14 }, pnl: { fontFamily: fonts.bold, fontSize: 14 }, reason: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, marginTop: spacing.md } });
