import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PauseCircle, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/auth/provider';
import { TradeCard } from '@/components/trade-card';
import { haptics, Staggered, Ticker, useReducedMotion } from '@/components/motion';
import { ActionButton, Card, Header, Metric, money, percent, ResourceState, Screen, SectionHeading, StatusPill } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { Overview } from '@/lib/types';
import { fonts, motion, radius, spacing, usePolyClawTheme } from '@/theme';

export default function MonitorScreen() {
  const { theme } = usePolyClawTheme(); const { request } = useAuth(); const reduce = useReducedMotion();
  const resource = useOperatorResource<Overview>('overview', 15_000); const [acting, setActing] = useState(false);
  const pause = async () => {
    setActing(true);
    try {
      await request('commands/pause', { method: 'POST', body: { reason: 'Paused from PolyClaw mobile' } });
      if (!reduce) haptics.warning();
      await resource.refresh();
    } finally { setActing(false); }
  };
  const data = resource.data;
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
    <Header eyebrow="POLYCLAW OPERATOR" title="Live monitor" action={<StatusPill label={data?.safetyState ?? 'SYNCING'} tone={data?.safetyState === 'HALTED' ? 'danger' : data?.mode === 'LIVE' ? 'warning' : 'success'} live={!data || data.safetyState !== 'HALTED'} />} />
    <ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {data ? <>
      <Staggered index={0}>
        <View style={[styles.heroShadow, { shadowColor: theme.shadow.color, shadowOpacity: theme.shadow.opacity, shadowRadius: theme.shadow.radius, elevation: theme.shadow.elevation }]}>
          <LinearGradient colors={[theme.panelRaised, theme.backgroundGlow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, styles.heroGradientBorder]}>
            <View style={styles.heroTop}>
              <View>
                <Text style={[styles.label, { color: theme.textMuted }]}>AVAILABLE BANKROLL</Text>
                <Ticker value={data.availableBalance} format={money} style={[styles.balance, { color: theme.text }]} />
              </View>
              {data.risk.halted ? <ShieldAlert size={28} color={theme.danger} /> : <ShieldCheck size={28} color={theme.success} />}
            </View>
            <View style={styles.metrics}>
              <Metric label="Open exposure" value={money(data.openExposure)} numeric={data.openExposure} format={money} />
              <Metric label="Realized P&L" value={money(data.realizedPnl)} numeric={data.realizedPnl} format={money} accent={data.realizedPnl >= 0} />
              <Metric label="ROI" value={percent(data.roi)} numeric={data.roi} format={percent} />
              <Metric label="Drawdown" value={percent(data.drawdown)} numeric={data.drawdown} format={percent} />
            </View>
          </LinearGradient>
        </View>
      </Staggered>
      {data.risk.halted ? (
        <Animated.View entering={reduce ? undefined : FadeInDown.springify().stiffness(motion.enter.stiffness).damping(motion.enter.damping)}>
          <View style={[styles.haltBanner, { backgroundColor: theme.dangerSoft }]}>
            <Text style={[styles.haltText, { color: theme.danger }]}>Trading is halted — review risk controls before resuming.</Text>
          </View>
        </Animated.View>
      ) : null}
      <SectionHeading title="Next decision" meta="AUTO REFRESH · 15S" />
      {data.upcomingTrade ? <TradeCard trade={data.upcomingTrade} /> : !resource.loading ? <Card><Text style={[styles.emptyTitle, { color: theme.text }]}>No planned trade</Text><Text style={[styles.copy, { color: theme.textMuted }]}>PolyClaw has no approved intent waiting for submission.</Text></Card> : null}
      <Staggered index={2}><Card><View style={styles.heroTop}><View><Text style={[styles.section, { color: theme.text }]}>Risk guardrails</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{data.risk.consecutiveLosses} consecutive losses · {percent(data.drawdown)} drawdown</Text></View><StatusPill label={data.risk.halted ? 'HALTED' : 'ENFORCED'} tone={data.risk.halted ? 'danger' : 'success'} live={!data.risk.halted} /></View></Card></Staggered>
      <ActionButton label={acting ? 'Pausing…' : data.risk.halted ? 'Trading is paused' : 'Pause trading'} icon={PauseCircle} variant="danger" loading={acting} disabled={acting || data.risk.halted || resource.stale || !!resource.error} haptic={null} onPress={pause} />
    </> : null}
  </Screen>;
}
const styles = StyleSheet.create({
  heroShadow: { borderRadius: radius.md },
  hero: { borderRadius: radius.md, padding: spacing.lg, gap: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(167,139,250,0.25)' },
  heroGradientBorder: {},
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 },
  balance: { fontFamily: fonts.bold, fontSize: 38, letterSpacing: -1.8, marginTop: 7 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  haltBanner: { borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 14 },
  haltText: { fontFamily: fonts.semibold, fontSize: 12.5 },
  section: { fontFamily: fonts.semibold, fontSize: 17 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, marginBottom: 6 },
  copy: { fontFamily: fonts.regular, fontSize: 13, marginTop: 5, lineHeight: 19 },
});
