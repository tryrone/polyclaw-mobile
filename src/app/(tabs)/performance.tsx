import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { PerformanceChart } from '@/components/performance-chart';
import { Card, Header, Metric, ResourceState, Screen, StatusPill, money, percent } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { Performance } from '@/lib/types';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export default function PerformanceScreen() {
  const { theme } = usePolyClawTheme(); const resource = useOperatorResource<Performance>('performance', 60_000); const data = resource.data;
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.lime} />}><Header eyebrow="SETTLED RESULTS" title="Performance" /><ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {data ? <><Card><View style={styles.metrics}><Metric label="Net P&L" value={money(data.netPnl)} accent={data.netPnl >= 0} /><Metric label="Hit rate" value={percent(data.hitRate)} /><Metric label="Wins" value={String(data.wins)} /><Metric label="Losses" value={String(data.losses)} /></View><PerformanceChart series={data.series} /></Card>
      <Card><View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.heading, { color: theme.text }]}>Paper-to-live gate</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{data.paperGate.settled}/{data.paperGate.requiredSettled} trades · {data.paperGate.days}/{data.paperGate.requiredDays} days · positive P&L required</Text></View><StatusPill label={data.paperGate.eligible ? 'ELIGIBLE' : 'LOCKED'} tone={data.paperGate.eligible ? 'success' : 'warning'} /></View></Card>
    </> : null}
  </Screen>;
}
const styles = StyleSheet.create({ metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: 18 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heading: { fontFamily: fonts.semibold, fontSize: 16 }, copy: { fontFamily: fonts.regular, fontSize: 12, marginTop: 6, lineHeight: 18 } });
