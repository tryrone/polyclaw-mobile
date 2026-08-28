import { Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, ShieldCheck, SoccerBall } from 'phosphor-react-native';
import { PerformanceChart } from '@/components/performance-chart';
import { ActionButton, Card, Header, Metric, money, percent, ResourceState, Screen, SectionHeading, StatusPill } from '@/components/ui-kit';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { features } from '@/lib/features';
import type { ConsumerPortfolio } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

export default function ConsumerHome() {
  const { theme } = usePolyClawTheme();
  const resource = useConsumerDashboard();
  const portfolio = useConsumerResource<ConsumerPortfolio>('portfolio', { range: '1W', source: 'COMBINED' }, 60_000);
  const data = resource.data;
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
    <Header eyebrow="YOUR POLYCLAW" title="Paper portfolio" action={<StatusPill label={data?.profile.botState ?? 'SYNCING'} tone={data?.profile.botState === 'ACTIVE' ? 'success' : data?.profile.botState === 'PAUSED_SAFETY' ? 'danger' : 'warning'} live={data?.profile.botState === 'ACTIVE'} />} />
    <ResourceState loading={resource.loading} error={resource.error} />
    {data ? <>
      <LinearGradient colors={[theme.panelRaised, theme.backgroundGlow]} style={[styles.hero, { borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textMuted }]}>SIMULATED EQUITY</Text>
        <Text style={[styles.balance, { color: theme.text }]}>{money(data.summary.equityUsdc)}</Text>
        <View style={styles.metrics}><Metric label="Available" value={money(data.summary.availableBalanceUsdc)} /><Metric label="Realized P&L" value={money(data.summary.realizedPnlUsdc)} accent={data.summary.realizedPnlUsdc >= 0} /><Metric label="Open exposure" value={money(data.summary.openExposureUsdc)} /><Metric label="Drawdown" value={percent(data.summary.drawdownFraction)} /></View>
      </LinearGradient>
      <Card><View style={styles.between}><View><Text style={[styles.heading, { color: theme.text }]}>7-day equity</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Deposits and withdrawals are excluded from return.</Text></View></View><PerformanceChart series={portfolio.data?.series ?? []} />{features.manualFootballTrading && Platform.OS !== 'web' ? <ActionButton label="Trade a football match" icon={SoccerBall as never} variant="secondary" onPress={() => router.push('/football-trade')} /> : null}</Card>
      {data.profile.botState === 'SETUP' ? <Card variant="raised"><View style={styles.row}><View style={[styles.icon, { backgroundColor: theme.successSoft }]}><ShieldCheck size={23} color={theme.success} weight="fill" /></View><View style={styles.flex}><Text style={[styles.heading, { color: theme.text }]}>{data.access.mode === 'PILOT' ? 'Start your pilot paper bot' : 'Start your 7-day paper trial'}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Choose your risk, set a trade cap, and let the bot simulate eligible Polymarket decisions automatically.</Text></View></View><ActionButton label="Set up my bot" icon={ArrowRight as never} onPress={() => router.push('/bot')} /></Card> : null}
      <SectionHeading title="Latest activity" meta={`${data.positions.length} DECISIONS`} />
      {data.positions.slice(0, 4).map((position) => <Card key={position.id}><View style={styles.between}><View style={styles.flex}><Text style={[styles.heading, { color: theme.text }]}>{position.fixtureLabel}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{position.selectionLabel} · {position.market}</Text></View><StatusPill label={position.status} tone={position.status === 'SETTLED' ? 'success' : position.status === 'SKIPPED' ? 'warning' : 'neutral'} /></View><Text style={[styles.stake, { color: theme.text }]}>{money(position.plannedStakeUsdc)} paper stake</Text></Card>)}
      {!data.positions.length ? <Card><Text style={[styles.heading, { color: theme.text }]}>Waiting for an eligible decision</Text><Text style={[styles.copy, { color: theme.textMuted }]}>PolyClaw will add a simulated position only after the model, market-price, and your personal risk checks all pass.</Text></Card> : null}
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({ hero: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing.md, padding: spacing.xl }, label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.5 }, balance: { fontFamily: fonts.displayExtraBold, fontSize: 42, letterSpacing: -2 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, row: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: spacing.lg }, between: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, icon: { alignItems: 'center', borderRadius: 15, height: 48, justifyContent: 'center', width: 48 }, flex: { flex: 1 }, heading: { fontFamily: fonts.display, fontSize: 16 }, copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, marginTop: 4 }, stake: { fontFamily: fonts.bold, fontSize: 13, marginTop: 14 } });
