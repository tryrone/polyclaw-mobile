import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChartLineUp, ClockCounterClockwise, Clipboard, LinkSimple, Sparkle } from 'phosphor-react-native';

import { DoubleChanceOverview } from '@/components/double-chance-overview';
import { Disclosure } from '@/components/disclosure';
import { PressableScale } from '@/components/motion';
import { PerformanceChart } from '@/components/performance-chart';
import { ActionButton, Card, EmptyState, Header, Metric, money, percent, ResourceState, Screen, StatusPill, shortDate } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { marketLabel, decimalOdds, isDoubleChance } from '@/lib/markets';
import { features } from '@/lib/features';
import type { ConsumerAccount, ConsumerPortfolio } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

/**
 * Consumer Portfolio is a lensed surface rather than a long scroll.
 *
 * It absorbs the old Activity tab (Decisions) and the always-visible snapshots table, so the
 * archive is one tap away instead of competing with the equity figure.
 */
const ranges = ['1W', '1M', '3M', 'ALL'] as const;
const sources = features.manualFootballTrading ? ['COMBINED', 'BOT', 'MANUAL'] as const : ['COMBINED', 'BOT'] as const;

type Lens = 'performance' | 'decisions' | 'positions' | 'manual' | 'linked';

const lenses: { Icon: typeof ChartLineUp; label: string; value: Lens }[] = [
  { Icon: ChartLineUp, label: 'Performance', value: 'performance' },
  { Icon: Clipboard, label: 'Decisions', value: 'decisions' },
  { Icon: Sparkle, label: 'Positions', value: 'positions' },
  { Icon: ClockCounterClockwise, label: 'Manual', value: 'manual' },
  { Icon: LinkSimple, label: 'Linked', value: 'linked' },
];

export default function ConsumerPortfolioScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const [lens, setLens] = useState<Lens>('performance');
  const [range, setRange] = useState<(typeof ranges)[number]>('1M');
  const [source, setSource] = useState<(typeof sources)[number]>('COMBINED');
  const resource = useConsumerResource<ConsumerPortfolio>('portfolio', { range, source });
  const account = useConsumerResource<ConsumerAccount>('account', undefined, 60_000);
  const dashboard = useConsumerDashboard();
  const [selected, setSelected] = useState<number | null>(null);
  const [botBudget, setBotBudget] = useState<string | null>(null);
  const [manualBudget, setManualBudget] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null);

  const saveBudgets = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await consumer('updateBudgets', {
        botBudgetUsdc: Number(botBudget ?? resource.data?.budgets.botBudgetUsdc ?? 0),
        manualBudgetUsdc: Number(manualBudget ?? resource.data?.budgets.manualBudgetUsdc ?? 0),
      });
      setMessage('Budgets saved. Unallocated funds remain outside trading.');
      await resource.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save budgets');
    } finally {
      setSaving(false);
    }
  };

  const closePosition = async (positionId: string) => {
    if (resource.error || account.error) return;
    setClosingPositionId(positionId);
    setMessage(null);
    try {
      await consumer('prepareClosePosition', { positionId });
      setMessage('Risk-reducing SELL submitted. New entries remain paused while it reconciles.');
      await Promise.all([resource.refresh(), account.refresh()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not submit the risk-reducing close');
    } finally {
      setClosingPositionId(null);
    }
  };

  const point = selected == null ? resource.data?.series.at(-1) : resource.data?.series[selected];

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
      <Header
        action={
          <StatusPill label={account.data?.mode ?? 'PAPER'} tone={account.data?.mode === 'LIVE' ? 'success' : 'warning'} />
        }
        eyebrow="TRADING, NOT CASH FLOWS"
        title="Portfolio"
      />
      <ResourceState error={resource.error} loading={resource.loading} />

      <ScrollView contentContainerStyle={styles.lensContent} horizontal showsHorizontalScrollIndicator={false}>
        {lenses.map(({ Icon, label, value }) => {
          const active = lens === value;
          return (
            <PressableScale
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              haptic="select"
              key={value}
              onPress={() => setLens(value)}
              containerStyle={styles.lensContainer}>
              <View
                style={[
                  styles.lens,
                  {
                    backgroundColor: active ? theme.accentSoft : theme.panel,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}>
                <Icon size={15} color={active ? theme.accent : theme.textMuted} />
                <Text style={[styles.lensText, { color: active ? theme.accent : theme.textMuted }]}>{label}</Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {lens === 'performance' && resource.data ? (
        <>
          <Card variant="raised">
            <Text style={[styles.kicker, { color: theme.textMuted }]}>TOTAL EQUITY</Text>
            <Text style={[styles.balance, { color: theme.text }]}>{money(resource.data.summary.equityUsdc)}</Text>
            <View style={styles.metrics}>
              <Metric
                accent={resource.data.summary.tradingPnlUsdc >= 0}
                label="Trading P&L"
                value={money(resource.data.summary.tradingPnlUsdc)}
              />
              <Metric
                accent={resource.data.summary.returnFraction >= 0}
                label="Adjusted return"
                value={percent(resource.data.summary.returnFraction)}
              />
              <Metric label="Fees" value={money(resource.data.summary.feesUsdc)} />
              <Metric label="Drawdown" value={percent(resource.data.summary.drawdownFraction)} />
            </View>
          </Card>

          <Card>
            <View style={styles.filterRow}>
              {ranges.map((item) => (
                <Filter
                  key={item}
                  label={item}
                  onPress={() => {
                    setSelected(null);
                    setRange(item);
                  }}
                  selected={range === item}
                />
              ))}
            </View>
            <View style={styles.filterRow}>
              {sources.map((item) => (
                <Filter
                  key={item}
                  label={item === 'COMBINED' ? 'All' : item === 'BOT' ? 'Bot' : 'Manual'}
                  onPress={() => {
                    setSelected(null);
                    setSource(item);
                  }}
                  selected={source === item}
                />
              ))}
            </View>
            <PerformanceChart onSelect={setSelected} selectedIndex={selected} series={resource.data.series} />
            {point ? (
              <Text accessibilityLiveRegion="polite" style={[styles.inspect, { color: theme.textMuted }]}>
                {shortDate(point.at)} · {money(point.equityUsdc)} equity · {money(point.tradingPnlUsdc)} trading P&L
              </Text>
            ) : null}
          </Card>

          <Disclosure detail="Every recorded equity snapshot" label="Exact snapshots">
            {resource.data.series
              .slice(-12)
              .reverse()
              .map((item) => (
                <View key={`${item.at}-${item.source}`} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.tableDate, { color: theme.textMuted }]}>{shortDate(item.at)}</Text>
                  <Text style={[styles.tableValue, { color: theme.text }]}>{money(item.equityUsdc)}</Text>
                  <Text
                    style={[
                      styles.tableValue,
                      { color: item.tradingPnlUsdc >= 0 ? theme.success : theme.danger },
                    ]}>
                    {money(item.tradingPnlUsdc)}
                  </Text>
                </View>
              ))}
          </Disclosure>

          <Disclosure
            detail={`${money(resource.data.budgets.unallocatedUsdc)} unallocated`}
            label="Trading budgets">
            <Text style={[styles.copy, { color: theme.textMuted }]}>
              {features.manualFootballTrading
                ? 'Bot and manual limits are separate allocations over one reconciled account. Server limits still cap each order and combined daily exposure.'
                : 'Set the maximum amount the bot may use. Unallocated funds remain outside automated trading.'}
            </Text>
            <View style={styles.inputs}>
              <BudgetInput
                label="Bot USDC"
                onChangeText={setBotBudget}
                value={botBudget ?? String(resource.data.budgets.botBudgetUsdc)}
              />
              {features.manualFootballTrading ? (
                <BudgetInput
                  label="Manual USDC"
                  onChangeText={setManualBudget}
                  value={manualBudget ?? String(resource.data.budgets.manualBudgetUsdc)}
                />
              ) : null}
            </View>
            <ActionButton label="Save budget" loading={saving} onPress={() => void saveBudgets()} />
            {message ? <Text style={[styles.inspect, { color: theme.textMuted }]}>{message}</Text> : null}
          </Disclosure>
        </>
      ) : null}

      {lens === 'decisions' ? (
        <>
          <Text style={[styles.kicker, { color: theme.textMuted }]}>DECISION LEDGER</Text>
          {dashboard.data?.positions.length ? (
            dashboard.data.positions.map((position) => (
              <Card key={position.id}>
                <View style={styles.between}>
                  <View style={styles.flex}>
                    <Text style={[styles.heading, { color: theme.text }]}>{position.fixtureLabel}</Text>
                    <Text style={[styles.copy, { color: theme.textMuted }]}>
                      {marketLabel(position.market)} ·{' '}
                      {isDoubleChance(position.market)
                        ? `${decimalOdds(position.entryPrice)} odds · ${(position.entryPrice * 100).toFixed(1)}¢`
                        : position.selectionLabel}{' '}
                      · {(position.probability * 100).toFixed(1)}% model probability
                    </Text>
                  </View>
                  <StatusPill
                    label={position.status}
                    tone={
                      position.status === 'SETTLED' ? 'success' : position.status === 'SKIPPED' ? 'warning' : 'neutral'
                    }
                  />
                </View>
                <View style={styles.amounts}>
                  <Text style={[styles.amount, { color: theme.text }]}>{money(position.plannedStakeUsdc)}</Text>
                  {position.realizedPnlUsdc != null ? (
                    <Text
                      style={[
                        styles.amount,
                        { color: position.realizedPnlUsdc >= 0 ? theme.success : theme.danger },
                      ]}>
                      {position.realizedPnlUsdc >= 0 ? '+' : ''}
                      {money(position.realizedPnlUsdc)}
                    </Text>
                  ) : null}
                </View>
                {position.rejectionReasons?.length ? (
                  <Text style={[styles.reason, { color: theme.warning }]}>
                    Skipped: {position.rejectionReasons.join(' · ')}
                  </Text>
                ) : null}
              </Card>
            ))
          ) : (
            <EmptyState
              detail="Automatic decisions will appear here with their quote, risk snapshot, and outcome."
              title="No decisions yet"
            />
          )}
        </>
      ) : null}

      {lens === 'positions' ? (
        <>
          {resource.data?.livePositions.length ? (
            resource.data.livePositions.map((position) => (
              <Card key={position.id}>
                <View style={styles.between}>
                  <View style={styles.flex}>
                    <Text style={[styles.heading, { color: theme.text }]}>{position.fixtureLabel}</Text>
                    <Text style={[styles.copy, { color: theme.textMuted }]}>
                      {position.marketLabel} · {position.selectionLabel}
                    </Text>
                  </View>
                  <StatusPill label={position.status} tone="warning" />
                </View>
                <Text style={[styles.inspect, { color: theme.textMuted }]}>
                  {Number(position.positionShares).toFixed(4)} shares · {money(Number(position.currentValueUsdc))} current
                  value
                </Text>
                <ActionButton
                  disabled={
                    Boolean(resource.error || account.error) ||
                    (closingPositionId !== null && closingPositionId !== position.id)
                  }
                  label="Close risk now"
                  loading={closingPositionId === position.id}
                  onPress={() => void closePosition(position.id)}
                  variant="danger"
                />
              </Card>
            ))
          ) : (
            <EmptyState
              detail="Open paper or live positions appear here once a decision is filled."
              title="No open positions"
            />
          )}
          {dashboard.data?.doubleChance ? <DoubleChanceOverview items={dashboard.data.doubleChance} /> : null}
        </>
      ) : null}

      {lens === 'manual' ? (
        <>
          {!features.manualFootballTrading ? (
            <EmptyState
              detail="Manual football trading is not enabled in this build."
              title="Manual orders unavailable"
            />
          ) : resource.data?.manualOrders.length ? (
            resource.data.manualOrders
              .slice()
              .reverse()
              .map((order) => (
                <Card key={order.id}>
                  <View style={styles.between}>
                    <View style={styles.flex}>
                      <Text style={[styles.heading, { color: theme.text }]}>{order.fixtureLabel}</Text>
                      <Text style={[styles.copy, { color: theme.textMuted }]}>
                        {order.marketLabel} · {order.selectionLabel}
                      </Text>
                    </View>
                    <StatusPill
                      label={order.status}
                      tone={order.status.includes('REJECT') || order.status === 'EXPIRED' ? 'danger' : 'neutral'}
                    />
                  </View>
                  <Text style={[styles.inspect, { color: theme.textMuted }]}>
                    {money(order.approvedStakeUsdc)} at {(order.limitPrice * 100).toFixed(1)}¢ · max loss{' '}
                    {money(order.maximumLossUsdc)}
                  </Text>
                  {['QUOTED', 'PAPER_OPEN', 'OPEN', 'PARTIAL'].includes(order.status) ? (
                    <ActionButton
                      label="Cancel order"
                      onPress={() => void consumer('cancelManualOrder', { orderId: order.id }).then(resource.refresh)}
                      variant="secondary"
                    />
                  ) : null}
                </Card>
              ))
          ) : (
            <EmptyState detail="Authorized manual football orders appear here." title="No manual orders yet" />
          )}
        </>
      ) : null}

      {lens === 'linked' ? (
        <>
          {resource.data?.polymarketPositions.length ? (
            resource.data.polymarketPositions.map((position) => (
              <Card key={`${position.conditionId}-${position.asset}`}>
                <View style={styles.between}>
                  <View style={styles.flex}>
                    <Text style={[styles.heading, { color: theme.text }]}>
                      {position.title ?? 'Polymarket position'}
                    </Text>
                    <Text style={[styles.copy, { color: theme.textMuted }]}>
                      {position.outcome ?? 'Selection'} · {Number(position.size ?? 0).toFixed(3)} shares
                    </Text>
                  </View>
                  <Text style={[styles.tableValue, { color: theme.text }]}>{money(position.currentValue)}</Text>
                </View>
                <Text
                  style={[
                    styles.inspect,
                    { color: (position.cashPnl ?? 0) >= 0 ? theme.success : theme.danger },
                  ]}>
                  Cash P&L {money(position.cashPnl)} · avg {(Number(position.avgPrice ?? 0) * 100).toFixed(1)}¢
                </Text>
              </Card>
            ))
          ) : (
            <EmptyState
              detail="Link a Polymarket wallet in Account to review its history here, read-only."
              title="No linked positions"
            />
          )}
          <Card>
            <Text style={[styles.heading, { color: theme.text }]}>
              Live wallet balance: {money(account.data?.availablePusd ?? 0)}
            </Text>
            <Text style={[styles.copy, { color: theme.textMuted }]}>
              Deposit routes are generated natively from supported Bridge assets. New live entries pause below{' '}
              {money(account.data?.funding.minimumEntryPusd ?? 0)}; full readiness requires{' '}
              {money(account.data?.funding.minimumReadyPusd ?? 0)}.
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <ActionButton label="Manage bot wallet" onPress={() => consumer('account').then(() => undefined)} variant="secondary" />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Filter({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      haptic="select"
      onPress={onPress}
      containerStyle={styles.flex}>
      <View
        style={[
          styles.filter,
          {
            backgroundColor: selected ? theme.accentSoft : theme.field,
            borderColor: selected ? theme.accent : theme.border,
          },
        ]}>
        <Text style={[styles.filterText, { color: selected ? theme.accent : theme.textMuted }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function BudgetInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { theme } = usePolyClawTheme();
  return (
    <View style={styles.flex}>
      <Text style={[styles.kicker, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  amount: { fontFamily: fonts.bold, fontSize: 14 },
  balance: { fontFamily: fonts.displayExtraBold, fontSize: 38, letterSpacing: -1.5, marginBottom: spacing.md, marginTop: 5 },
  between: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19 },
  filter: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  filterText: { fontFamily: fonts.bold, fontSize: 11 },
  flex: { flex: 1 },
  heading: { fontFamily: fonts.display, fontSize: 15 },
  input: { borderRadius: radius.sm, borderWidth: 1, fontFamily: fonts.semibold, fontSize: 15, marginTop: 6, minHeight: 48, paddingHorizontal: 12 },
  inputs: { flexDirection: 'row', gap: 12 },
  inspect: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 18, marginTop: spacing.sm },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 },
  lens: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  lensContainer: { marginRight: spacing.sm },
  lensContent: { paddingRight: spacing.md },
  lensText: { fontFamily: fonts.bold, fontSize: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  reason: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
  tableDate: { flex: 1.4, fontFamily: fonts.regular, fontSize: 11 },
  tableRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, minHeight: 44 },
  tableValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 11, textAlign: 'right' },
});
