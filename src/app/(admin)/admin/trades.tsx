import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ActionButton, EmptyState, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { PressableScale } from '@/components/motion';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminDeliveryRow } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

const filters = ['ALL', 'OPEN', 'FILLED', 'FAILED', 'SKIPPED'] as const;
type Filter = (typeof filters)[number];

/**
 * Trades: orders, fills, failures, open positions and settlements for published signals.
 * Rows stay concise; failure reasons are shown verbatim so the operator can act.
 */
export default function AdminTradesScreen() {
  const { theme } = usePolyClawTheme();
  const [filter, setFilter] = useState<Filter>('ALL');
  const resource = useAdminResource<AdminDeliveryRow[]>('listDeliveries', filter === 'ALL' ? { limit: 150 } : { status: filter, limit: 150 }, 20_000);
  const rows = resource.data ?? [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
      <Header title="Trades" />
      <ResourceState error={resource.error} loading={resource.loading && !rows.length} />
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

      {rows.length ? rows.map((row) => (
        <View key={row.id} style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{row.eventTitle}</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>{row.email} · {row.selectionLabel}</Text>
            {row.failureReason ? <Text numberOfLines={2} style={[styles.failure, { color: theme.danger }]}>{row.failureReason}</Text> : null}
          </View>
          <View style={styles.right}>
            <Text style={[styles.figure, { color: theme.text }]}>{money(row.approvedStakeUsdc)}</Text>
            <StatusPill label={row.status} tone={['FILLED', 'SETTLED'].includes(row.status) ? 'success' : ['FAILED', 'SKIPPED'].includes(row.status) ? 'danger' : 'warning'} />
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
  failure: { fontFamily: fonts.medium, fontSize: 11.5, marginTop: 3 },
  figure: { fontFamily: fonts.bold, fontSize: 14.5, ...numeric },
  filter: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  filterText: { fontFamily: fonts.bold, fontSize: 12 },
  flex: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end', gap: 6 },
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  sub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 14 },
});
