import { StyleSheet, Text, View } from 'react-native';
import { DetailScreen } from '@/components/detail-layout';
import { Card, ResourceState, StatusPill } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { Connections } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';

export default function ConnectionsScreen() {
  const resource = useOperatorResource<Connections>('connections', 30_000); const data = resource.data;
  return <DetailScreen title="Connections" eyebrow="VENUE HEALTH"><ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />{data ? <>
    <Connection name="Polymarket" detail={'Automated · ' + data.polymarket.environment + ' · collateral ' + data.polymarket.collateral} status={data.polymarket.status} healthy={data.polymarket.configured} />
    <Connection name="SportyBet" detail="Manual execution only; no credentials are stored." status={data.sportyBet.status} healthy={data.sportyBet.status === 'MANUAL_ONLY'} />
    <Connection name="Research pipeline" detail={data.research.mode} status={data.research.status} healthy={data.research.configured} />
  </> : null}</DetailScreen>;
}
function Connection({ name, detail, status, healthy }: { name: string; detail: string; status: string; healthy: boolean }) { const { theme } = usePolyClawTheme(); return <Card><View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.name, { color: theme.text }]}>{name}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text></View><StatusPill label={status} tone={healthy ? 'success' : 'warning'} /></View></Card>; }
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { fontFamily: fonts.semibold, fontSize: 16 }, detail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 5 } });
