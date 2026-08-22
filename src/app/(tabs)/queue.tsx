import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { TradeCard } from '@/components/trade-card';
import { Staggered } from '@/components/motion';
import { Card, EmptyState, Header, ResourceState, Screen, SectionHeading, StatusPill } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { QueueData } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';

export default function QueueScreen() {
  const { theme } = usePolyClawTheme(); const resource = useOperatorResource<QueueData>('queue', 15_000);
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}><Header eyebrow="UPCOMING INTENTS" title="Trade queue" /><ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {resource.data?.ready.length ? resource.data.ready.map((trade, index) => <Staggered key={trade.id} index={index}><TradeCard trade={trade} /></Staggered>) : !resource.loading ? <EmptyState title="Queue is clear" detail="New trades appear only after research, pricing, and risk checks pass." /> : null}
    {resource.data?.noBet.length ? <><SectionHeading title="No-bet decisions" meta={`${resource.data.noBet.length}`} />{resource.data.noBet.map((item, index) => <Staggered key={item.id} index={index + 2}><Card><View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.title, { color: theme.text }]}>Candidate rejected</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{item.fixtureId ?? item.gammaId}</Text></View><StatusPill label="NO BET" tone="neutral" /></View></Card></Staggered>)}</> : null}
  </Screen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { fontFamily: fonts.semibold, fontSize: 14 }, copy: { fontFamily: fonts.regular, fontSize: 12, marginTop: 5 } });
