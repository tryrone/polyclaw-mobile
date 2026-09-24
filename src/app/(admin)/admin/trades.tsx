import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, EmptyState, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { PressableScale } from '@/components/motion';
import { AdminTradesSkeleton } from '@/components/page-skeletons';
import { PnlChartCard } from '@/components/pnl-chart-card';
import { useAuth } from '@/auth/provider';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminDeliveryRow, AdminSignalBatch, AutoTradePerformance, AutoTradePerformanceRange } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

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
  const [cancellingBatchId, setCancellingBatchId] = useState<string | null>(null);
  const [retryBatch, setRetryBatch] = useState<AdminSignalBatch | null>(null);
  const resource = useAdminResource<AdminDeliveryRow[]>('listDeliveries', {
    ...(filter === 'ALL' ? {} : { status: filter }),
    ...(query.trim() ? { query: query.trim() } : {}),
    limit: 150,
  }, 20_000);
  const published = useAdminResource<AdminSignalBatch[]>('listBatches', { status: 'PUBLISHED', limit: 30 }, 20_000);
  const performance = useAdminResource<AutoTradePerformance>('tradePerformance', { range, mode }, 20_000);
  const rows = resource.data ?? [];
  const initialLoading = (resource.loading && resource.data === null) || (published.loading && published.data === null);

  const cancelBatch = async (batch: AdminSignalBatch) => {
    setCancellingBatchId(batch.id);
    try {
      const result = await admin<AdminSignalBatch & { venueCancellation: { cancelled: number; failed: number } }>('cancelBatch', {
        batchId: batch.id,
        reason: 'Cancelled by the publisher from the PolyClaw admin app.',
        idempotencyKey: randomUUID(),
        confirmed: true,
      });
      if (result.venueCancellation.failed > 0) {
        setMessage(`${result.venueCancellation.failed} venue order${result.venueCancellation.failed === 1 ? '' : 's'} could not be cancelled. Tap Retry venue cancellation.`);
        setRetryBatch(batch);
      } else {
        setMessage(`Batch cancelled. ${result.venueCancellation.cancelled} open venue order${result.venueCancellation.cancelled === 1 ? '' : 's'} cancelled.`);
        setRetryBatch(null);
      }
      await Promise.all([published.refresh(), resource.refresh()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Batch cancellation failed.');
    } finally {
      setCancellingBatchId(null);
    }
  };

  const confirmCancellation = (batch: AdminSignalBatch) => {
    Alert.alert(
      'Cancel this batch?',
      'Pending trades will be stopped and PolyClaw will try to cancel every open venue order. Filled exposure remains open for settlement.',
      [{ text: 'Keep batch', style: 'cancel' }, { text: 'Cancel batch', style: 'destructive', onPress: () => void cancelBatch(batch) }],
    );
  };

  if (initialLoading) return (
    <Screen refreshControl={<RefreshControl refreshing onRefresh={() => void Promise.all([resource.refresh(), published.refresh(), performance.refresh()])} tintColor={theme.accent} />}>
      <Header title="Published" />
      <ResourceState loading loadingFallback={<AdminTradesSkeleton />} />
    </Screen>
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading || published.loading || performance.loading} onRefresh={() => void Promise.all([resource.refresh(), published.refresh(), performance.refresh()])} tintColor={theme.accent} />}>
      <Header title="Published" />
      <ResourceState error={resource.error} />
      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
      {retryBatch ? (
        <ActionButton
          label="Retry venue cancellation"
          loading={cancellingBatchId === retryBatch.id}
          onPress={() => void cancelBatch(retryBatch)}
          variant="secondary"
        />
      ) : null}

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

      {published.data?.length ? (
        <View style={styles.batchSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Published batches</Text>
          {published.data.map((batch) => (
            <View key={batch.id} style={[styles.batchRow, { borderBottomColor: theme.border }]}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{batch.title ?? 'Untitled batch'}</Text>
                <Text style={[styles.sub, { color: theme.textMuted }]}>{batch.signalCount} signals · published {batch.publishedAt ? new Date(batch.publishedAt).toLocaleString() : 'recently'}</Text>
              </View>
              <ActionButton label="Cancel batch" loading={cancellingBatchId === batch.id} onPress={() => confirmCancellation(batch)} variant="secondary" />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.filterRow}>
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
      </View>

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
        <View key={row.id} style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{row.eventTitle}</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>{row.executionMode === 'PAPER' ? 'Test' : 'Live'} · {row.email} · {row.selectionLabel}</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>Stake {money(row.actualStakeUsdc)}{row.returnedUsdc == null ? '' : ` · returned ${money(row.returnedUsdc)}`}</Text>
            {row.failureReason ? <Text numberOfLines={2} style={[styles.failure, { color: theme.danger }]}>{row.failureReason}</Text> : null}
          </View>
          <View style={styles.right}>
            <Text style={[styles.figure, { color: row.netPnlUsdc == null ? theme.text : row.netPnlUsdc >= 0 ? theme.success : theme.danger }]}>
              {row.status === 'SETTLED' && row.netPnlUsdc == null ? 'PnL unavailable' : row.netPnlUsdc == null ? money(row.actualStakeUsdc || row.approvedStakeUsdc) : `${row.netPnlUsdc >= 0 ? '+' : '-'}${money(Math.abs(row.netPnlUsdc))}`}
            </Text>
            <StatusPill label={row.result ?? row.status} tone={row.result === 'WON' ? 'success' : row.result === 'LOST' || ['FAILED', 'SKIPPED'].includes(row.status) ? 'danger' : 'neutral'} />
          </View>
        </View>
      )) : <EmptyState detail="Deliveries appear here once a batch is published." title="No deliveries" />}

      <ActionButton
        disabled={!rows.length}
        label="Refresh ledger"
        loading={resource.loading}
        onPress={() => void resource.refresh()}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  batchRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  batchSection: { gap: spacing.xs, marginBottom: spacing.md },
  failure: { fontFamily: fonts.medium, fontSize: 11.5, marginTop: 3 },
  figure: { fontFamily: fonts.bold, fontSize: 14.5, ...numeric },
  filter: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  filterText: { fontFamily: fonts.bold, fontSize: 12 },
  flex: { flex: 1, minWidth: 0 },
  message: { fontFamily: fonts.medium, fontSize: 12.5, marginBottom: spacing.sm },
  right: { alignItems: 'flex-end', gap: 6 },
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  search: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.medium, fontSize: 14, marginBottom: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17 },
  sub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 14 },
});
