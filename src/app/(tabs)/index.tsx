import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { PauseCircle, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useAuth } from '@/auth/provider';
import { TradeCard } from '@/components/trade-card';
import { ActionButton, Card, Header, Metric, ResourceState, Screen, StatusPill, money, percent } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { Overview } from '@/lib/types';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export default function MonitorScreen() {
  const { theme } = usePolyClawTheme(); const { request } = useAuth();
  const resource = useOperatorResource<Overview>('overview', 15_000); const [acting, setActing] = useState(false);
  const pause = async () => { setActing(true); try { await request('commands/pause', { method: 'POST', body: { reason: 'Paused from PolyClaw mobile' } }); await resource.refresh(); } finally { setActing(false); } };
  const data = resource.data;
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.lime} />}>
    <Header eyebrow="POLYCLAW OPERATOR" title="Live monitor" action={<StatusPill label={data?.safetyState ?? 'SYNCING'} tone={data?.safetyState === 'HALTED' ? 'danger' : data?.mode === 'LIVE' ? 'warning' : 'success'} />} />
    <ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {data ? <>
      <Card style={[styles.hero, { backgroundColor: theme.panelRaised }]}>
        <View style={styles.heroTop}><View><Text style={[styles.label, { color: theme.textMuted }]}>AVAILABLE BANKROLL</Text><Text style={[styles.balance, { color: theme.text }]}>{money(data.availableBalance)}</Text></View><ShieldCheck size={28} color={data.risk.halted ? theme.red : theme.lime} /></View>
        <View style={styles.metrics}><Metric label="Open exposure" value={money(data.openExposure)} /><Metric label="Realized P&L" value={money(data.realizedPnl)} accent={data.realizedPnl >= 0} /><Metric label="ROI" value={percent(data.roi)} /><Metric label="Drawdown" value={percent(data.drawdown)} /></View>
      </Card>
      <View style={styles.sectionTitle}><Text style={[styles.section, { color: theme.text }]}>Next decision</Text><Text style={[styles.micro, { color: theme.textMuted }]}>AUTO REFRESH · 15S</Text></View>
      {data.upcomingTrade ? <TradeCard trade={data.upcomingTrade} /> : <Card><Text style={[styles.emptyTitle, { color: theme.text }]}>No planned trade</Text><Text style={[styles.copy, { color: theme.textMuted }]}>PolyClaw has no approved intent waiting for submission.</Text></Card>}
      <Card><View style={styles.heroTop}><View><Text style={[styles.section, { color: theme.text }]}>Risk guardrails</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{data.risk.consecutiveLosses} consecutive losses · {percent(data.drawdown)} drawdown</Text></View><StatusPill label={data.risk.halted ? 'HALTED' : 'ENFORCED'} tone={data.risk.halted ? 'danger' : 'success'} /></View></Card>
      <ActionButton label={acting ? 'Pausing…' : data.risk.halted ? 'Trading is paused' : 'Pause trading'} icon={PauseCircle} variant="danger" disabled={acting || data.risk.halted || resource.stale || !!resource.error} onPress={pause} />
    </> : null}
  </Screen>;
}
const styles = StyleSheet.create({ hero: { gap: 24 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }, label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 }, balance: { fontFamily: fonts.bold, fontSize: 38, letterSpacing: -1.8, marginTop: 7 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, section: { fontFamily: fonts.semibold, fontSize: 17 }, micro: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1 }, emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, marginBottom: 6 }, copy: { fontFamily: fonts.regular, fontSize: 13, marginTop: 5, lineHeight: 19 } });
