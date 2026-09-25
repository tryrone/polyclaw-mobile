import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, EmptyState, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { PressableScale } from '@/components/motion';
import { AdminTradesSkeleton } from '@/components/page-skeletons';
import { PnlChartCard } from '@/components/pnl-chart-card';
import { useAuth } from '@/auth/provider';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminDeliveryRow, AdminTradeDetail, AutoTradePerformance, AutoTradePerformanceRange } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';
import { AppBottomSheet, type AppBottomSheetHandle } from '@/components/app-bottom-sheet';

const filters = ['ALL', 'OPEN', 'FILLED', 'SETTLED', 'FAILED', 'SKIPPED'] as const;
type Filter = (typeof filters)[number];

/**
 * Trades: orders, fills, failures, open positions and settlements for published signals.
 * Rows stay concise; failure reasons are shown verbatim so the operator can act.
 */
export default function AdminTradesScreen() {
  const { theme } = usePolyClawTheme();
  const { admin } = useAuth();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [range, setRange] = useState<AutoTradePerformanceRange>('1M');
  const [mode, setMode] = useState<'LIVE' | 'PAPER'>('LIVE');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminTradeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cancellingBatchId, setCancellingBatchId] = useState<string | null>(null);
  const detailSheet = useRef<AppBottomSheetHandle>(null);
  const detailRequest = useRef(0);
  const resource = useAdminResource<AdminDeliveryRow[]>('listDeliveries', {
    ...(filter === 'ALL' ? {} : { status: filter }),
    ...(query.trim() ? { query: query.trim() } : {}),
    limit: 150,
  }, 20_000);
  const performance = useAdminResource<AutoTradePerformance>('tradePerformance', { range, mode }, 20_000);
  const rows = resource.data ?? [];
  const initialLoading = resource.loading && resource.data === null;

  const openDetail = async (deliveryId: string) => {
    const request = ++detailRequest.current;
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    detailSheet.current?.present();
    try { const result = await admin<AdminTradeDetail>('tradeDetail', { deliveryId }); if (request === detailRequest.current) setDetail(result); }
    catch (error) { if (request === detailRequest.current) setDetailError(error instanceof Error ? error.message : 'Could not load this trade.'); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  };

  const cancelBatch = async (batchId: string) => {
    setCancellingBatchId(batchId);
    try {
      const result = await admin<{ venueCancellation: { cancelled: number; failed: number } }>('cancelBatch', {
        batchId,
        reason: 'Cancelled by the publisher from the PolyClaw admin app.',
        idempotencyKey: randomUUID(),
        confirmed: true,
      });
      if (result.venueCancellation.failed > 0) {
        setMessage(`${result.venueCancellation.failed} venue order${result.venueCancellation.failed === 1 ? '' : 's'} could not be cancelled. Tap Retry venue cancellation.`);
      } else {
        setMessage(`Batch cancelled. ${result.venueCancellation.cancelled} open venue order${result.venueCancellation.cancelled === 1 ? '' : 's'} cancelled.`);
      }
      await resource.refresh();
      if (detail?.batchId === batchId) await openDetail(detail.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Batch cancellation failed.');
    } finally {
      setCancellingBatchId(null);
    }
  };

  const confirmCancellation = (batchId: string) => {
    Alert.alert(
      'Cancel this batch?',
      `${detail?.cancellationScope ? `${detail.cancellationScope.orders} unfilled orders across ${detail.cancellationScope.users} users and ${detail.cancellationScope.selections} selections. ` : ''}This affects the entire batch, including other users. Filled positions remain open for settlement.`,
      [{ text: 'Keep orders', style: 'cancel' }, { text: 'Cancel remaining', style: 'destructive', onPress: () => void cancelBatch(batchId) }],
    );
  };

  if (initialLoading) return (
    <Screen refreshControl={<RefreshControl refreshing onRefresh={() => void Promise.all([resource.refresh(), performance.refresh()])} tintColor={theme.accent} />}>
      <Header title="Trades" />
      <ResourceState loading loadingFallback={<AdminTradesSkeleton />} />
    </Screen>
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading || performance.loading} onRefresh={() => void Promise.all([resource.refresh(), performance.refresh()])} tintColor={theme.accent} />}>
      <Header title="Trades" />
      <ResourceState error={resource.error} />
      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
      <PnlChartCard
        data={performance.data?.range === range && performance.data.mode === mode ? performance.data : null}
        error={performance.error}
        loading={performance.loading || Boolean(performance.data && (performance.data.range !== range || performance.data.mode !== mode))}
        mode={mode}
        onModeChange={setMode}
        onRangeChange={setRange}
        range={range}
        showQuality
        title="Platform trade PnL"
      />

      <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
        {filters.map((item) => {
          const active = filter === item;
          return (
            <PressableScale accessibilityLabel={item} accessibilityRole="tab" accessibilityState={{ selected: active }} haptic="select" key={item} onPress={() => setFilter(item)}>
              <View style={[styles.filter, { backgroundColor: active ? theme.text : theme.field, borderColor: active ? theme.text : theme.border }]}>
                <Text style={[styles.filterText, { color: active ? theme.background : theme.textMuted }]}>{item}</Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      <TextInput
        accessibilityLabel="Search deliveries by user"
        autoCapitalize="none"
        onChangeText={setQuery}
        placeholder="Search user name or email"
        placeholderTextColor={theme.textMuted}
        style={[styles.search, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]}
        value={query}
      />

      {rows.length ? rows.map((row) => (
        <PressableScale accessibilityLabel={`Open ${row.eventTitle} trade details`} accessibilityRole="button" key={row.id} onPress={() => void openDetail(row.id)}><View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{row.eventTitle}</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>{row.executionMode === 'PAPER' ? 'Test' : 'Live'} · {row.email} · {row.selectionLabel}</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>Stake {money(row.actualStakeUsdc)}{row.returnedUsdc == null ? '' : ` · returned ${money(row.returnedUsdc)}`}</Text>
            {row.settlementState === 'AWAITING_POLYMARKET' && row.polymarketUrl ? <PressableScale accessibilityLabel={`Open ${row.eventTitle} on Polymarket`} accessibilityRole="link" onPress={() => void Linking.openURL(row.polymarketUrl!)}><Text style={[styles.marketLink, { color: theme.accent }]}>Open market</Text></PressableScale> : null}
            {row.failureReason ? <Text numberOfLines={2} style={[styles.failure, { color: theme.danger }]}>{row.failureReason}</Text> : null}
          </View>
          <View style={styles.right}>
            <Text style={[styles.figure, { color: row.netPnlUsdc == null ? theme.text : row.netPnlUsdc >= 0 ? theme.success : theme.danger }]}>
              {row.status === 'SETTLED' && row.netPnlUsdc == null ? 'PnL unavailable' : row.netPnlUsdc == null ? money(row.actualStakeUsdc || row.approvedStakeUsdc) : `${row.netPnlUsdc >= 0 ? '+' : '-'}${money(Math.abs(row.netPnlUsdc))}`}
            </Text>
            <StatusPill label={row.settlementState === 'AWAITING_POLYMARKET' ? 'Awaiting Polymarket' : row.result ?? row.status} tone={row.settlementState === 'AWAITING_POLYMARKET' ? 'warning' : row.result === 'WON' ? 'success' : row.result === 'LOST' || ['FAILED', 'SKIPPED'].includes(row.status) ? 'danger' : 'neutral'} />
          </View>
        </View></PressableScale>
      )) : <EmptyState detail="Deliveries appear here once a batch is published." title="No deliveries" />}

      <ActionButton
        disabled={!rows.length}
        label="Refresh ledger"
        loading={resource.loading}
        onPress={() => void resource.refresh()}
        variant="secondary"
      />
      <AppBottomSheet onDismiss={() => { detailRequest.current++; setDetail(null); setDetailError(null); }} ref={detailSheet} title={detail?.eventTitle ?? 'Trade details'}>
        {detailLoading ? <ResourceState loading /> : detailError ? <ResourceState error={detailError} /> : detail ? (
          <>
            <View style={styles.detailSummary}>
              <Text style={[styles.title, { color: theme.text }]}>{detail.selectionLabel}</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>{detail.marketLabel} · {detail.executionMode === 'PAPER' ? 'Test' : 'Live'} · {detail.email}</Text>
            </View>
            {([
              ['Status', detail.settlementState === 'AWAITING_POLYMARKET' ? 'Awaiting Polymarket' : detail.result ?? detail.status],
              ['Approved', money(detail.stakeUsdc)], ['Actual stake', money(detail.actualStakeUsdc)],
              ['Average entry', detail.averageFillPrice == null ? '—' : `${(detail.averageFillPrice * 100).toFixed(1)}¢`],
              ['Returned', detail.returnedUsdc == null ? 'Pending' : money(detail.returnedUsdc)],
              ['Net PnL', detail.netPnlUsdc == null ? 'Pending' : `${detail.netPnlUsdc >= 0 ? '+' : '-'}${money(Math.abs(detail.netPnlUsdc))}`],
            ] as [string, string][]).map(([label, value]) => <View key={label} style={[styles.fact, { borderBottomColor: theme.border }]}><Text style={[styles.sub, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.factValue, { color: theme.text }]}>{value}</Text></View>)}
            {detail.fills.length ? <Text style={[styles.sectionTitle, { color: theme.text }]}>Fills</Text> : null}
            {detail.fills.map((fill, index) => <View key={`${fill.occurredAt}:${index}`} style={[styles.fact, { borderBottomColor: theme.border }]}><Text style={[styles.sub, { color: theme.textMuted }]}>{new Date(fill.occurredAt).toLocaleString()}</Text><Text style={[styles.factValue, { color: theme.text }]}>{fill.shares.toFixed(2)} @ {(fill.price * 100).toFixed(1)}¢</Text></View>)}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
            {detail.timeline.map((step) => <View key={`${step.label}:${step.at}`} style={[styles.fact, { borderBottomColor: theme.border }]}><Text style={[styles.sub, { color: theme.textMuted }]}>{step.label}</Text><Text style={[styles.factValue, { color: theme.text }]}>{new Date(step.at).toLocaleString()}</Text></View>)}
            <Text style={[styles.sub, { color: theme.textMuted }]}>{detail.cancellationScope ? `${detail.cancellationScope.orders} unfilled orders · ${detail.cancellationScope.users} users · ${detail.cancellationScope.selections} selections in this batch` : 'This cancels unfilled orders for every user in this batch.'}</Text>
            <ActionButton disabled={detail.cancellationScope?.orders === 0} label="Cancel remaining orders in this batch" loading={cancellingBatchId === detail.batchId} onPress={() => confirmCancellation(detail.batchId)} variant="danger" />
            <Text style={[styles.sub, { color: theme.textMuted }]}>Only unfilled order quantities are cancelled. Filled positions remain open and keep their settlement history.</Text>
          </>
        ) : null}
      </AppBottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailSummary: { gap: spacing.xs },
  fact: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 44 },
  factValue: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, textAlign: 'right', ...numeric },
  failure: { fontFamily: fonts.medium, fontSize: 11.5, marginTop: 3 },
  figure: { fontFamily: fonts.bold, fontSize: 14.5, ...numeric },
  filter: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, paddingRight: spacing.lg },
  filterText: { fontFamily: fonts.bold, fontSize: 12 },
  flex: { flex: 1, minWidth: 0 },
  message: { fontFamily: fonts.medium, fontSize: 12.5, marginBottom: spacing.sm },
  marketLink: { fontFamily: fonts.semibold, fontSize: 12, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  search: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.medium, fontSize: 14, marginBottom: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17 },
  sub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 14 },
});
