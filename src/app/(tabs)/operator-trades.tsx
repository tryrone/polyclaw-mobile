import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { TradeCard } from '@/components/trade-card';
import { Staggered } from '@/components/motion';
import { EmptyState, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { TradesData } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';

export default function TradesScreen() {
  const { theme } = usePolyClawTheme(); const resource = useOperatorResource<TradesData>('trades?limit=50', 30_000);
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}><Header eyebrow="IMMUTABLE HISTORY" title="Trades" /><ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    <View style={styles.filters}><StatusPill label="ALL TRADES" tone="neutral" live /><Text style={[styles.note, { color: theme.textMuted }]}>Paper and live results are always labelled.</Text></View>
    {resource.data?.items.length ? resource.data.items.map((trade, index) => <Staggered key={trade.id} index={index + 1}><TradeCard trade={trade} /></Staggered>) : !resource.loading ? <EmptyState title="No trade history" detail="Executed and settled paper trades will appear here." /> : null}
  </Screen>;
}
const styles = StyleSheet.create({ filters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, note: { fontFamily: fonts.regular, fontSize: 11, flex: 1, textAlign: 'right' } });
