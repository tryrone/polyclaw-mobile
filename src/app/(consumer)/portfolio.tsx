import { useState } from 'react';
import { Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowSquareOut, SoccerBall } from 'phosphor-react-native';
import { useAuth } from '@/auth/provider';
import { PerformanceChart } from '@/components/performance-chart';
import { ActionButton, Card, Header, Metric, money, percent, ResourceState, Screen, SectionHeading, shortDate, StatusPill } from '@/components/ui-kit';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { features } from '@/lib/features';
import type { ConsumerAccount, ConsumerPortfolio } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

const ranges = ['1W', '1M', '3M', 'ALL'] as const;
const sources = features.manualFootballTrading ? ['COMBINED', 'BOT', 'MANUAL'] as const : ['COMBINED', 'BOT'] as const;

export default function ConsumerPortfolioScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const [range, setRange] = useState<(typeof ranges)[number]>('1M');
  const [source, setSource] = useState<(typeof sources)[number]>('COMBINED');
  const resource = useConsumerResource<ConsumerPortfolio>('portfolio', { range, source });
  const account = useConsumerResource<ConsumerAccount>('account', undefined, 60_000);
  const [selected, setSelected] = useState<number | null>(null);
  const [botBudget, setBotBudget] = useState<string | null>(null);
  const [manualBudget, setManualBudget] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveBudgets = async () => {
    setSaving(true); setMessage(null);
    try {
      await consumer('updateBudgets', { botBudgetUsdc: Number(botBudget ?? resource.data?.budgets.botBudgetUsdc ?? 0), manualBudgetUsdc: Number(manualBudget ?? resource.data?.budgets.manualBudgetUsdc ?? 0) });
      setMessage('Budgets saved. Unallocated funds remain outside trading.');
      await resource.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save budgets'); }
    finally { setSaving(false); }
  };
  const point = selected == null ? resource.data?.series.at(-1) : resource.data?.series[selected];
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
    <Header eyebrow="TRADING, NOT CASH FLOWS" title="Portfolio" action={<StatusPill label={account.data?.mode ?? 'PAPER'} tone={account.data?.mode === 'LIVE' ? 'success' : 'warning'} />} />
    <ResourceState loading={resource.loading} error={resource.error} />
    {resource.data ? <>
      <Card variant="raised"><Text style={[styles.kicker, { color: theme.textMuted }]}>TOTAL EQUITY</Text><Text style={[styles.balance, { color: theme.text }]}>{money(resource.data.summary.equityUsdc)}</Text><View style={styles.metrics}><Metric label="Trading P&L" value={money(resource.data.summary.tradingPnlUsdc)} accent={resource.data.summary.tradingPnlUsdc >= 0} /><Metric label="Adjusted return" value={percent(resource.data.summary.returnFraction)} accent={resource.data.summary.returnFraction >= 0} /><Metric label="Fees" value={money(resource.data.summary.feesUsdc)} /><Metric label="Drawdown" value={percent(resource.data.summary.drawdownFraction)} /></View></Card>
      <Card><View style={styles.filterRow}>{ranges.map((item) => <Filter key={item} label={item} selected={range === item} onPress={() => { setSelected(null); setRange(item); }} />)}</View><View style={styles.filterRow}>{sources.map((item) => <Filter key={item} label={item === 'COMBINED' ? 'All' : item === 'BOT' ? 'Bot' : 'Manual'} selected={source === item} onPress={() => { setSelected(null); setSource(item); }} />)}</View><PerformanceChart series={resource.data.series} selectedIndex={selected} onSelect={setSelected} />{point ? <Text accessibilityLiveRegion="polite" style={[styles.inspect, { color: theme.textMuted }]}>{shortDate(point.at)} · {money(point.equityUsdc)} equity · {money(point.tradingPnlUsdc)} trading P&L</Text> : null}</Card>
      <SectionHeading title="Exact snapshots" meta="TABLE ALTERNATIVE" />
      <Card>{resource.data.series.slice(-12).reverse().map((item) => <View key={`${item.at}-${item.source}`} style={[styles.tableRow, { borderBottomColor: theme.border }]}><Text style={[styles.tableDate, { color: theme.textMuted }]}>{shortDate(item.at)}</Text><Text style={[styles.tableValue, { color: theme.text }]}>{money(item.equityUsdc)}</Text><Text style={[styles.tableValue, { color: item.tradingPnlUsdc >= 0 ? theme.success : theme.danger }]}>{money(item.tradingPnlUsdc)}</Text></View>)}</Card>
      <SectionHeading title="Trading budgets" meta={`${money(resource.data.budgets.unallocatedUsdc)} UNALLOCATED`} />
      <Card><Text style={[styles.copy, { color: theme.textMuted }]}>{features.manualFootballTrading ? 'Bot and manual limits are separate allocations over one reconciled account. Server limits still cap each order and combined daily exposure.' : 'Set the maximum amount the bot may use. Unallocated funds remain outside automated trading.'}</Text><View style={styles.inputs}><BudgetInput label="Bot USDC" value={botBudget ?? String(resource.data.budgets.botBudgetUsdc)} onChangeText={setBotBudget} />{features.manualFootballTrading ? <BudgetInput label="Manual USDC" value={manualBudget ?? String(resource.data.budgets.manualBudgetUsdc)} onChangeText={setManualBudget} /> : null}</View><ActionButton label="Save budget" loading={saving} onPress={() => void saveBudgets()} />{message ? <Text style={[styles.inspect, { color: theme.textMuted }]}>{message}</Text> : null}</Card>
      {features.manualFootballTrading && Platform.OS !== 'web' ? <ActionButton label="Trade a football match" icon={SoccerBall as never} onPress={() => router.push('/football-trade')} /> : null}
      <View style={styles.actions}>{account.data?.funding.depositUrl ? <ActionButton label="Deposit on Polymarket" icon={ArrowSquareOut as never} variant="secondary" onPress={() => void Linking.openURL(account.data!.funding.depositUrl!)} /> : null}{account.data?.funding.withdrawalUrl ? <ActionButton label="Withdraw on Polymarket" icon={ArrowSquareOut as never} variant="secondary" onPress={() => void Linking.openURL(account.data!.funding.withdrawalUrl!)} /> : null}</View>
      {features.manualFootballTrading ? <><SectionHeading title="Manual orders" meta={`${resource.data.manualOrders.length}`} />{resource.data.manualOrders.length ? resource.data.manualOrders.slice().reverse().map((order) => <Card key={order.id}><View style={styles.between}><View style={styles.flex}><Text style={[styles.heading, { color: theme.text }]}>{order.fixtureLabel}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{order.marketLabel} · {order.selectionLabel}</Text></View><StatusPill label={order.status} tone={order.status.includes('REJECT') || order.status === 'EXPIRED' ? 'danger' : 'neutral'} /></View><Text style={[styles.inspect, { color: theme.textMuted }]}>{money(order.approvedStakeUsdc)} at {(order.limitPrice * 100).toFixed(1)}¢ · max loss {money(order.maximumLossUsdc)}</Text></Card>) : <Card><Text style={[styles.copy, { color: theme.textMuted }]}>No manual football orders yet.</Text></Card>}</> : null}
      {resource.data.polymarketPositions.length ? <><SectionHeading title="Linked Polymarket positions" meta="READ ONLY" />{resource.data.polymarketPositions.map((position) => <Card key={`${position.conditionId}-${position.asset}`}><View style={styles.between}><View style={styles.flex}><Text style={[styles.heading, { color: theme.text }]}>{position.title ?? 'Polymarket position'}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{position.outcome ?? 'Selection'} · {Number(position.size ?? 0).toFixed(3)} shares</Text></View><Text style={[styles.tableValue, { color: theme.text }]}>{money(position.currentValue)}</Text></View><Text style={[styles.inspect, { color: (position.cashPnl ?? 0) >= 0 ? theme.success : theme.danger }]}>Cash P&L {money(position.cashPnl)} · avg {(Number(position.avgPrice ?? 0) * 100).toFixed(1)}¢</Text></Card>)}</> : null}
    </> : null}
  </Screen>;
}

function Filter({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.filter, { backgroundColor: selected ? theme.accentSoft : theme.field, borderColor: selected ? theme.accent : theme.border }]}><Text style={[styles.filterText, { color: selected ? theme.accent : theme.textMuted }]}>{label}</Text></Pressable>;
}

function BudgetInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.flex}><Text style={[styles.kicker, { color: theme.textMuted }]}>{label}</Text><TextInput accessibilityLabel={label} keyboardType="decimal-pad" value={value} onChangeText={onChangeText} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} /></View>;
}

const styles = StyleSheet.create({ kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 }, balance: { fontFamily: fonts.displayExtraBold, fontSize: 38, letterSpacing: -1.5, marginTop: 5, marginBottom: spacing.md }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, filterRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md }, filter: { borderRadius: radius.pill, borderWidth: 1, flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, filterText: { fontFamily: fonts.bold, fontSize: 11 }, inspect: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 18, marginTop: spacing.sm }, tableRow: { borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 44, alignItems: 'center', gap: 8 }, tableDate: { flex: 1.4, fontFamily: fonts.regular, fontSize: 11 }, tableValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 11, textAlign: 'right' }, copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19 }, inputs: { flexDirection: 'row', gap: 12, marginVertical: spacing.md }, input: { borderRadius: radius.sm, borderWidth: 1, fontFamily: fonts.semibold, fontSize: 15, marginTop: 6, minHeight: 48, paddingHorizontal: 12 }, actions: { gap: spacing.sm }, between: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, flex: { flex: 1 }, heading: { fontFamily: fonts.display, fontSize: 15 } });
