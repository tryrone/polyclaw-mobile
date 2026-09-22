import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Disclosure } from '@/components/disclosure';
import { PressableScale } from '@/components/motion';
import { Card, EmptyState, Header, money, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { decimalOdds, isDoubleChance, marketLabel } from '@/lib/markets';
import { features } from '@/lib/features';
import type { ConsumerPortfolio } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

type Row = {
  detail: string;
  facts: [string, string][];
  figure: string;
  fixture: string;
  id: string;
  open: boolean;
  status: string;
  tone: Tone;
};

type Lens = 'all' | 'open' | 'settled';

const lenses: { label: string; value: Lens }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'settled' },
];

function positionTone(status: string): Tone {
  if (status === 'SETTLED') return 'success';
  if (status === 'SKIPPED') return 'warning';
  return 'neutral';
}

/**
 * Trades is the single ledger for the consumer surface.
 *
 * It replaces both the old Activity tab and the Portfolio positions/manual lenses: every bot
 * decision, open position and manual order appears in one list, and tapping a row reveals its
 * detail in place instead of pushing another screen.
 */
export default function ConsumerTradesScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const dashboard = useConsumerDashboard();
  const portfolio = useConsumerResource<ConsumerPortfolio>('portfolio', { range: '1M', source: 'COMBINED' }, 30_000);
  const [lens, setLens] = useState<Lens>('all');

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];

    for (const position of dashboard.data?.positions ?? []) {
      const doubleChance = isDoubleChance(position.market);
      list.push({
        detail: `${marketLabel(position.market)} · ${doubleChance ? `${decimalOdds(position.entryPrice)} odds` : position.selectionLabel}`,
        facts: [
          ['Model probability', `${(position.probability * 100).toFixed(1)}%`],
          ['Stake', money(position.plannedStakeUsdc)],
          ...(position.realizedPnlUsdc != null ? ([['Result', money(position.realizedPnlUsdc)]] as [string, string][]) : []),
          ...(position.rejectionReasons?.length ? ([['Skipped because', position.rejectionReasons.join(' · ')]] as [string, string][]) : []),
        ],
        figure:
          position.realizedPnlUsdc != null
            ? `${position.realizedPnlUsdc >= 0 ? '+' : ''}${money(position.realizedPnlUsdc)}`
            : money(position.plannedStakeUsdc),
        fixture: position.fixtureLabel,
        id: `decision-${position.id}`,
        open: position.status !== 'SETTLED' && position.status !== 'SKIPPED',
        status: position.status,
        tone: positionTone(position.status),
      });
    }

    for (const position of portfolio.data?.livePositions ?? []) {
      list.push({
        detail: `${position.marketLabel} · ${position.selectionLabel}`,
        facts: [
          ['Shares', Number(position.positionShares).toFixed(4)],
          ['Current value', money(Number(position.currentValueUsdc))],
        ],
        figure: money(Number(position.currentValueUsdc)),
        fixture: position.fixtureLabel,
        id: `position-${position.id}`,
        open: true,
        status: position.status,
        tone: 'warning',
      });
    }

    for (const order of portfolio.data?.manualOrders ?? []) {
      const rejected = order.status.includes('REJECT') || order.status === 'EXPIRED';
      list.push({
        detail: `${order.marketLabel} · ${order.selectionLabel}`,
        facts: [
          ['Approved stake', money(order.approvedStakeUsdc)],
          ['Limit price', `${(order.limitPrice * 100).toFixed(1)}¢`],
          ['Maximum loss', money(order.maximumLossUsdc)],
        ],
        figure: money(order.approvedStakeUsdc),
        fixture: order.fixtureLabel,
        id: `order-${order.id}`,
        open: ['QUOTED', 'PAPER_OPEN', 'OPEN', 'PARTIAL'].includes(order.status),
        status: order.status,
        tone: rejected ? 'danger' : order.status === 'SETTLED' ? 'success' : 'neutral',
      });
    }

    return list;
  }, [dashboard.data?.positions, portfolio.data?.livePositions, portfolio.data?.manualOrders]);

  const visible = rows.filter((row) => (lens === 'all' ? true : lens === 'open' ? row.open : !row.open));
  const refreshing = dashboard.loading || portfolio.loading;

  const refresh = () => {
    void dashboard.refresh();
    void portfolio.refresh();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}>
      <Header eyebrow="EVERY DECISION AND ORDER" title="Trades" />
      <ResourceState error={dashboard.error ?? portfolio.error} loading={refreshing && !rows.length} />

      <View style={styles.lensRow}>
        {lenses.map((item) => {
          const active = lens === item.value;
          return (
            <PressableScale
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              haptic="select"
              key={item.value}
              onPress={() => setLens(item.value)}
              containerStyle={styles.flex}>
              <View
                style={[
                  styles.lens,
                  {
                    backgroundColor: active ? theme.accent : theme.panel,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}>
                <Text style={[styles.lensText, { color: active ? theme.accentInk : theme.textMuted }]}>{item.label}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      {visible.length ? (
        visible.map((row) => (
          <Card key={row.id}>
            <View style={styles.rowTop}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.fixture, { color: theme.text }]}>
                  {row.fixture}
                </Text>
                <Text numberOfLines={1} style={[styles.detail, { color: theme.textMuted }]}>
                  {row.detail}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.figure, { color: theme.text }]}>{row.figure}</Text>
                <StatusPill label={row.status} tone={row.tone} />
              </View>
            </View>
            <Disclosure detail="Recorded detail" label="Details">
              {row.facts.map(([label, value]) => (
                <View key={label} style={[styles.fact, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.factLabel, { color: theme.textMuted }]}>{label}</Text>
                  <Text style={[styles.factValue, { color: theme.text }]}>{value}</Text>
                </View>
              ))}
            </Disclosure>
          </Card>
        ))
      ) : (
        <EmptyState
          detail={
            lens === 'all'
              ? 'Bot decisions and manual orders appear here once your bot starts trading.'
              : `No ${lens === 'open' ? 'open' : 'closed'} trades right now.`
          }
          title={lens === 'all' ? 'No trades yet' : 'Nothing here'}
        />
      )}

      {features.manualFootballTrading ? (
        <PressableScale
          accessibilityLabel="Cancel the most recent cancellable manual order"
          accessibilityRole="button"
          onPress={() => {
            const cancellable = rows.find((row) => row.id.startsWith('order-') && row.open);
            if (cancellable) void consumer('cancelManualOrder', { orderId: cancellable.id.replace('order-', '') }).then(refresh);
          }}>
          <Text style={[styles.hiddenHint, { color: theme.textMuted }]}>
            Manual trading is enabled. Open manual orders include a cancel action in their detail.
          </Text>
        </PressableScale>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  detail: { fontFamily: fonts.regular, fontSize: 12.5, marginTop: 3 },
  fact: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 40 },
  factLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 12 },
  factValue: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 12, textAlign: 'right' },
  figure: { fontFamily: fonts.displayExtraBold, fontSize: 17, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  fixture: { fontFamily: fonts.display, fontSize: 15 },
  hiddenHint: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17 },
  lens: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44 },
  lensRow: { flexDirection: 'row', gap: spacing.sm },
  lensText: { fontFamily: fonts.bold, fontSize: 12.5 },
  right: { alignItems: 'flex-end', gap: 6 },
  rowTop: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
});
