import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Card, Header, money, ResourceState, Screen, SectionHeading, StatusPill } from '@/components/ui-kit';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { useAuth } from '@/auth/provider';
import type { ConsumerPortfolio } from '@/lib/types';
import { features } from '@/lib/features';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export default function ConsumerActivity() {
  const { theme } = usePolyClawTheme(); const resource = useConsumerDashboard(30_000); const data = resource.data;
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}><Header eyebrow="DECISION LEDGER" title="Activity" /><ResourceState loading={resource.loading} error={resource.error} />
    {data?.positions.map((position) => <Card key={position.id}><View style={styles.row}><View style={styles.flex}><Text style={[styles.title, { color: theme.text }]}>{position.fixtureLabel}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{position.selectionLabel} · {position.market} · {(position.probability * 100).toFixed(1)}% model probability</Text></View><StatusPill label={position.status} tone={position.status === 'SETTLED' ? 'success' : position.status === 'SKIPPED' ? 'warning' : 'neutral'} /></View><View style={styles.amounts}><Text style={[styles.amount, { color: theme.text }]}>{money(position.plannedStakeUsdc)}</Text>{position.realizedPnlUsdc != null ? <Text style={[styles.pnl, { color: position.realizedPnlUsdc >= 0 ? theme.success : theme.danger }]}>{position.realizedPnlUsdc >= 0 ? '+' : ''}{money(position.realizedPnlUsdc)}</Text> : null}</View>{position.rejectionReasons?.length ? <Text style={[styles.reason, { color: theme.warning }]}>Skipped: {position.rejectionReasons.join(' · ')}</Text> : null}</Card>)}
    {data && !data.positions.length ? <Card><Text style={[styles.title, { color: theme.text }]}>No decisions yet</Text><Text style={[styles.detail, { color: theme.textMuted }]}>Automatic decisions will appear here with their quote, risk snapshot, and outcome.</Text></Card> : null}
    {features.manualFootballTrading ? <ManualOrderActivity /> : null}
  </Screen>;
}

function ManualOrderActivity() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const portfolio = useConsumerResource<ConsumerPortfolio>('portfolio', { range: '1M', source: 'COMBINED' }, 30_000);
  return <><SectionHeading title="Manual football orders" meta={`${portfolio.data?.manualOrders.length ?? 0}`} />{portfolio.data?.manualOrders.slice().reverse().map((order) => <Card key={order.id}><View style={styles.row}><View style={styles.flex}><Text style={[styles.title, { color: theme.text }]}>{order.fixtureLabel}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{order.marketLabel} · {order.selectionLabel} · limit {(order.limitPrice * 100).toFixed(1)}¢</Text></View><StatusPill label={order.status} tone={order.status === 'REJECTED' || order.status === 'EXPIRED' ? 'danger' : order.status === 'SETTLED' ? 'success' : 'neutral'} /></View><View style={styles.amounts}><Text style={[styles.amount, { color: theme.text }]}>{money(order.approvedStakeUsdc)}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>max loss {money(order.maximumLossUsdc)}</Text></View>{['QUOTED', 'PAPER_OPEN', 'OPEN', 'PARTIAL'].includes(order.status) ? <ActionButton label="Cancel order" variant="secondary" onPress={() => void consumer('cancelManualOrder', { orderId: order.id }).then(portfolio.refresh)} /> : null}</Card>)}</>;
}
const styles = StyleSheet.create({ row: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 }, flex: { flex: 1 }, title: { fontFamily: fonts.display, fontSize: 15 }, detail: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, marginTop: 4 }, amounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg }, amount: { fontFamily: fonts.bold, fontSize: 14 }, pnl: { fontFamily: fonts.bold, fontSize: 14 }, reason: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, marginTop: spacing.md } });
