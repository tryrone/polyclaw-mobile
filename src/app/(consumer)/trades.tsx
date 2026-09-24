import { SoccerBall } from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ActionButton, Card, EmptyState, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { ConsumerTradesSkeleton } from '@/components/page-skeletons';
import { PnlChartCard } from '@/components/pnl-chart-card';
import { PressableScale } from '@/components/motion';
import { useAuth } from '@/auth/provider';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { AutoTradePerformance, AutoTradePerformanceRange, ConsumerAutoTradeDetail, ConsumerAutoTradeRow, ConsumerTradeResult } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

type Lens = 'pending' | 'open' | 'closed';
type Tone = 'success' | 'warning' | 'danger' | 'neutral';

const lenses: { label: string; value: Lens }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
];

function toneFor(status: string, result: ConsumerTradeResult | null): Tone {
  if (result === 'WON') return 'success';
  if (result === 'LOST') return 'danger';
  if (result === 'REFUNDED' || result === 'VOIDED') return 'neutral';
  if (['PENDING', 'RESERVED', 'DISPATCHED', 'SUBMISSION_UNKNOWN'].includes(status)) return 'warning';
  if (['FAILED', 'SKIPPED', 'CANCELLED'].includes(status)) return 'danger';
  return 'neutral';
}

function signedMoney(value: number) {
  return `${value >= 0 ? '+' : '-'}${money(Math.abs(value))}`;
}

function tradeStatus(row: Pick<ConsumerAutoTradeRow, 'result' | 'status' | 'settlementState'>) {
  if (row.settlementState === 'AWAITING_POLYMARKET') return 'Awaiting Polymarket';
  return row.result ?? row.status;
}

/**
 * Trades is one ledger with Pending / Open / Closed filters on a single surface. Rows stay
 * quiet: a circular market icon, game/market label, one status line, and the right-aligned
 * stake or outcome. Tapping a row opens the trade detail in place.
 */
export default function ConsumerTradesScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const [lens, setLens] = useState<Lens>('pending');
  const [range, setRange] = useState<AutoTradePerformanceRange>('1M');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const resource = useConsumerResource<ConsumerAutoTradeRow[]>('autoTradeTrades', { filter: lens }, 20_000);
  const performance = useConsumerResource<AutoTradePerformance>('autoTradePerformance', { range, timeZone }, 20_000);
  const [detail, setDetail] = useState<ConsumerAutoTradeDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => resource.data ?? [], [resource.data]);
  const initialLoading = resource.loading && resource.data === null;

  const openDetail = useCallback(async (id: string) => {
    if (detail?.id === id) { setDetail(null); return; }
    setDetailError(null);
    try {
      setDetail(await consumer<ConsumerAutoTradeDetail>('autoTradeTrade', { deliveryId: id }));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Could not load this trade.');
    }
  }, [consumer, detail?.id]);

  const closePosition = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await consumer('closeAutoTradePosition', { deliveryId: detail.id });
      setDetail(null);
      await resource.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (initialLoading) return (
    <Screen refreshControl={<RefreshControl refreshing onRefresh={() => void Promise.all([resource.refresh(), performance.refresh()])} tintColor={theme.accent} />}>
      <Header title="Trades" />
      <ResourceState loading loadingFallback={<ConsumerTradesSkeleton />} />
    </Screen>
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading || performance.loading} onRefresh={() => void Promise.all([resource.refresh(), performance.refresh()])} tintColor={theme.accent} />}>
      <Header title="Trades" />
      <ResourceState error={resource.error} />

      <PnlChartCard
        data={performance.data?.range === range ? performance.data : null}
        error={performance.error}
        loading={performance.loading || Boolean(performance.data && performance.data.range !== range)}
        onRangeChange={setRange}
        range={range}
      />

      <View style={styles.lensRow}>
        {lenses.map((item) => {
          const active = lens === item.value;
          return (
            <PressableScale
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              containerStyle={styles.flex}
              haptic="select"
              key={item.value}
              onPress={() => { setLens(item.value); setDetail(null); }}>
              <View style={[styles.lens, { backgroundColor: active ? theme.text : theme.field, borderColor: active ? theme.text : theme.border }]}>
                <Text style={[styles.lensText, { color: active ? theme.background : theme.textMuted }]}>{item.label}</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      {detailError ? <Text style={[styles.error, { color: theme.danger }]}>{detailError}</Text> : null}

      {rows.length ? (
        rows.map((row) => (
          <View key={row.id}>
            <PressableScale accessibilityLabel={`${row.eventTitle} ${row.selectionLabel}`} accessibilityRole="button" onPress={() => void openDetail(row.id)}>
              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <View style={[styles.marketIcon, { backgroundColor: theme.field }]}>
                  <SoccerBall color={theme.textMuted} size={18} weight="regular" />
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[styles.fixture, { color: theme.text }]}>{row.eventTitle}</Text>
                  <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>
                    {row.executionMode === 'PAPER' ? 'Test' : 'Live'} · {row.selectionLabel} · {tradeStatus(row)}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text numberOfLines={1} style={[styles.figure, { color: row.netPnlUsdc == null ? theme.text : row.netPnlUsdc >= 0 ? theme.success : theme.danger }]}>
                    {row.status === 'SETTLED' && row.netPnlUsdc == null ? 'PnL unavailable' : row.netPnlUsdc == null ? money(row.actualStakeUsdc || row.stakeUsdc) : signedMoney(row.netPnlUsdc)}
                  </Text>
                  <StatusPill label={tradeStatus(row)} tone={row.settlementState === 'AWAITING_POLYMARKET' ? 'warning' : toneFor(row.status, row.result)} />
                </View>
              </View>
            </PressableScale>

            {detail?.id === row.id ? (
              <Card>
                <DetailRows detail={detail} />
                {detail.polymarketUrl ? <ActionButton
                  label="Open on Polymarket"
                  onPress={() => void Linking.openURL(detail.polymarketUrl!)}
                  variant="secondary"
                /> : null}
                <ActionButton
                  disabled={!detail.canClose}
                  label={detail.canClose ? 'Close position' : 'No open position'}
                  loading={busy}
                  onPress={() => void closePosition()}
                  variant="secondary"
                />
              </Card>
            ) : null}
          </View>
        ))
      ) : (
        <EmptyState
          detail={`No ${lens} trades right now. New signals appear here the moment your auto-trade places them.`}
          title="Nothing here"
        />
      )}
    </Screen>
  );
}

function DetailRows({ detail }: { detail: ConsumerAutoTradeDetail }) {
  const { theme } = usePolyClawTheme();
  const unavailable = detail.status === 'SETTLED' && detail.result == null;
  const facts: [string, string][] = [
    ['Mode', detail.executionMode === 'PAPER' ? 'Test · simulated funds' : 'Live · funded wallet'],
    ['Maximum price', `${(detail.maxPrice * 100).toFixed(1)}¢`],
    ['Approved maximum', money(detail.stakeUsdc)],
    ['Actual stake', money(detail.actualStakeUsdc)],
    ['Average entry', detail.averageFillPrice == null ? '—' : `${(detail.averageFillPrice * 100).toFixed(1)}¢`],
    ['Potential return', detail.potentialPayoutUsdc == null ? '—' : `${money(detail.potentialPayoutUsdc)} · not spendable`],
    ['Returned', detail.returnedUsdc == null ? (unavailable ? 'Unavailable' : 'Pending') : money(detail.returnedUsdc)],
    ['Fees', money(detail.feesUsdc)],
    ['Net PnL', detail.netPnlUsdc == null ? (unavailable ? 'Unavailable' : 'Pending') : signedMoney(detail.netPnlUsdc)],
    ['Result', detail.settlementState === 'AWAITING_POLYMARKET' ? 'Awaiting Polymarket' : detail.result ?? (unavailable ? 'Outcome unavailable' : detail.status)],
    ['Settlement source', detail.settlementSource ?? (unavailable ? 'Unavailable' : detail.settlementState === 'AWAITING_POLYMARKET' ? 'Polymarket · pending finalization' : 'Pending')],
    ['Settled', detail.settledAt ? new Date(detail.settledAt).toLocaleString() : unavailable ? 'Unavailable' : 'Pending'],
    ['Expires', new Date(detail.expiresAt).toLocaleString()],
  ];
  return (
    <View>
      {detail.note ? <Text style={[styles.note, { color: theme.textMuted }]}>{detail.note}</Text> : null}
      {facts.map(([label, value]) => (
        <View key={label} style={[styles.fact, { borderBottomColor: theme.border }]}>
          <Text style={[styles.factLabel, { color: theme.textMuted }]}>{label}</Text>
          <Text style={[styles.factValue, { color: theme.text }]}>{value}</Text>
        </View>
      ))}
      {detail.fills.length ? (
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Fills</Text>
      ) : null}
      {detail.fills.map((fill, index) => (
        <View key={`${fill.occurredAt}:${index}`} style={[styles.fact, { borderBottomColor: theme.border }]}>
          <Text style={[styles.factLabel, { color: theme.textMuted }]}>{new Date(fill.occurredAt).toLocaleString()}</Text>
          <Text style={[styles.factValue, { color: theme.text }]}>{fill.shares.toFixed(2)} @ {(fill.price * 100).toFixed(1)}¢</Text>
        </View>
      ))}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
      {detail.timeline.map((step) => (
        <View key={`${step.label}:${step.at}`} style={[styles.fact, { borderBottomColor: theme.border }]}>
          <Text style={[styles.factLabel, { color: theme.textMuted }]}>{step.label}</Text>
          <Text style={[styles.factValue, { color: theme.text }]}>{new Date(step.at).toLocaleTimeString()}</Text>
        </View>
      ))}
      {detail.failureReason ? <Text style={[styles.error, { color: theme.danger }]}>{detail.failureReason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, fontSize: 12.5, marginTop: spacing.sm },
  fact: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 40 },
  factLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5 },
  factValue: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 12.5, textAlign: 'right', ...numeric },
  figure: { fontFamily: fonts.bold, fontSize: 15, ...numeric },
  fixture: { fontFamily: fonts.semibold, fontSize: 14.5 },
  flex: { flex: 1, minWidth: 0 },
  lens: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44 },
  lensRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  lensText: { fontFamily: fonts.bold, fontSize: 12.5 },
  marketIcon: { alignItems: 'center', borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  right: { alignItems: 'flex-end', gap: 6 },
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 64, paddingVertical: spacing.sm },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 15, marginBottom: spacing.xs, marginTop: spacing.md },
  sub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
});
