import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PauseCircle, ShieldCheck, ShieldAlert } from '@/components/modern-icons';
import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/auth/provider';
import { Disclosure } from '@/components/disclosure';
import { TradeCard } from '@/components/trade-card';
import { haptics, Staggered, Ticker, useReducedMotion } from '@/components/motion';
import { ActionButton, Card, Header, Metric, money, percent, ResourceState, Screen, SectionHeading, StatusPill } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { Overview, SessionSummary } from '@/lib/types';
import { fonts, motion, radius, spacing, usePolyClawTheme } from '@/theme';

/**
 * Operator Monitor, unchanged in content and control boundaries.
 *
 * Presentation only: the risk-guardrail card folds into the hero state chip and the 8-step
 * session funnel collapses to one expanding line that reveals the same steps and preparation
 * evidence.
 */
export default function MonitorScreen() {
  const { theme } = usePolyClawTheme();
  const { request } = useAuth();
  const reduce = useReducedMotion();
  const resource = useOperatorResource<Overview>('overview', 15_000);
  const [acting, setActing] = useState(false);

  const pause = async () => {
    setActing(true);
    try {
      await request('commands/pause', { method: 'POST', body: { reason: 'Paused from PolyClaw mobile' } });
      if (!reduce) haptics.warning();
      await resource.refresh();
    } finally {
      setActing(false);
    }
  };

  const data = resource.data;
  const halted = Boolean(data?.risk.halted);

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
      <Header
        action={
          <StatusPill
            label={data?.safetyState ?? 'SYNCING'}
            live={!data || data.safetyState !== 'HALTED'}
            tone={halted ? 'danger' : data?.mode === 'LIVE' ? 'warning' : 'success'}
          />
        }
        eyebrow="POLYCLAW OPERATOR"
        title={data?.mode === 'PAPER' ? 'Paper monitor' : data?.mode === 'LIVE' ? 'Live monitor' : 'Operator monitor'}
      />
      <ResourceState error={resource.error} loading={resource.loading} stale={resource.stale} />
      {data ? (
        <>
          <Staggered index={0}>
            <View style={[styles.heroShadow, { elevation: theme.shadow.elevation, shadowColor: theme.shadow.color, shadowOpacity: theme.shadow.opacity, shadowRadius: theme.shadow.radius }]}>
              <LinearGradient
                colors={[theme.panelRaised, theme.backgroundGlow]}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={[styles.hero, { borderColor: theme.borderStrong }]}>
                <View style={styles.heroTop}>
                  <View>
                    <Text style={[styles.label, { color: theme.textMuted }]}>AVAILABLE BANKROLL</Text>
                    <Ticker format={money} style={[styles.balance, { color: theme.text }]} value={data.availableBalance} />
                  </View>
                  {halted ? <ShieldAlert size={28} color={theme.danger} /> : <ShieldCheck size={28} color={theme.success} />}
                </View>
                <View style={styles.metrics}>
                  <Metric format={money} label="Open exposure" numeric={data.openExposure} value={money(data.openExposure)} />
                  <Metric accent={data.realizedPnl >= 0} format={money} label="Realized P&L" numeric={data.realizedPnl} value={money(data.realizedPnl)} />
                  <Metric format={percent} label="ROI" numeric={data.roi} value={percent(data.roi)} />
                  <Metric format={percent} label="Drawdown" numeric={data.drawdown} value={percent(data.drawdown)} />
                </View>
                <View style={styles.heroRisk}>
                  <StatusPill label={halted ? 'HALTED' : 'ENFORCED'} live={!halted} tone={halted ? 'danger' : 'success'} />
                  <Text style={[styles.heroRiskText, { color: theme.textMuted }]}>
                    {data.risk.consecutiveLosses} consecutive losses · {percent(data.drawdown)} drawdown
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </Staggered>

          {halted ? (
            <Animated.View entering={reduce ? undefined : FadeInDown.springify().stiffness(motion.enter.stiffness).damping(motion.enter.damping)}>
              <View style={[styles.haltBanner, { backgroundColor: theme.dangerSoft }]}>
                <Text style={[styles.haltText, { color: theme.danger }]}>
                  Trading is halted — review risk controls before resuming.
                </Text>
              </View>
            </Animated.View>
          ) : null}

          <SectionHeading meta="AUTO REFRESH · 15S" title="Next decision" />
          {data.upcomingTrade ? (
            <TradeCard trade={data.upcomingTrade} />
          ) : !resource.loading ? (
            <Card>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No planned trade</Text>
              <Text style={[styles.copy, { color: theme.textMuted }]}>
                PolyClaw has no approved intent waiting for submission.
              </Text>
            </Card>
          ) : null}

          <SectionHeading meta="LATEST 6" title="Session funnel" />
          {data.sessions.length ? (
            data.sessions.map((session, index) => (
              <Staggered index={index + 2} key={session.id}>
                <Card accessible accessibilityLabel={`${session.slot} session ${session.status}`}>
                  <View style={styles.sessionHead}>
                    <View>
                      <Text style={[styles.section, { color: theme.text }]}>{session.slot}</Text>
                      <Text style={[styles.sessionDate, { color: theme.textMuted }]}>
                        {new Date(session.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <StatusPill
                      label={session.status}
                      tone={session.status === 'COMPLETED' ? 'success' : session.status === 'FAILED' ? 'danger' : 'warning'}
                    />
                  </View>
                  {session.summary ? (
                    <Disclosure
                      detail="Discovered → supported → matched → quoted → forecasted → passed → selected → filled"
                      label={`${session.summary.discovered ?? 0} discovered → ${session.summary.filled ?? 0} filled`}>
                      <SessionFunnel summary={session.summary} />
                    </Disclosure>
                  ) : (
                    <Text style={[styles.copy, { color: theme.textMuted }]}>
                      {session.haltReason ?? 'This legacy session has no structured funnel summary.'}
                    </Text>
                  )}
                </Card>
              </Staggered>
            ))
          ) : (
            <Card>
              <Text style={[styles.copy, { color: theme.textMuted }]}>
                No sessions have run in the active ledger epoch.
              </Text>
            </Card>
          )}

          <ActionButton
            disabled={acting || halted || resource.stale || Boolean(resource.error)}
            haptic={null}
            icon={PauseCircle}
            label={acting ? 'Pausing…' : halted ? 'Trading is paused' : 'Pause trading'}
            loading={acting}
            onPress={pause}
            variant="danger"
          />
        </>
      ) : null}
    </Screen>
  );
}

function SessionFunnel({ summary }: { summary: SessionSummary }) {
  const { theme } = usePolyClawTheme();
  const steps = [
    ['Discovered', summary.discovered],
    ['Supported', summary.supported],
    ['Matched', summary.confident],
    ['Quoted', summary.quoted],
    ['Forecasted', summary.forecasted],
    ['Passed', summary.passedGates],
    ['Selected', summary.selected],
    ['Filled', summary.filled],
  ] as const;
  return (
    <View style={styles.funnel}>
      {steps.map(([label, value], index) => (
        <View key={label} style={styles.funnelStep}>
          <Text style={[styles.funnelValue, { color: value ? theme.text : theme.textMuted }]}>{value ?? 0}</Text>
          <Text style={[styles.funnelLabel, { color: theme.textMuted }]}>{label}</Text>
          {index < steps.length - 1 ? <View style={[styles.funnelLine, { backgroundColor: theme.border }]} /> : null}
        </View>
      ))}
      {summary.preparation ? (
        <Text style={[styles.preparation, { color: theme.textMuted }]}>
          Evidence ready {summary.preparation.ready ?? 0}/{summary.preparation.requested ?? 0} · odds refreshed{' '}
          {summary.preparation.oddsRefreshed ?? 0} · failures {summary.preparation.failures?.length ?? 0}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { fontFamily: fonts.bold, fontSize: 38, letterSpacing: -1.8, marginTop: 7 },
  copy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 5 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, marginBottom: 6 },
  funnel: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  funnelLabel: { fontFamily: fonts.medium, fontSize: 9, marginTop: 2 },
  funnelLine: { height: StyleSheet.hairlineWidth, marginTop: 7, width: 28 },
  funnelStep: { alignItems: 'center', flexDirection: 'column', minWidth: 56 },
  funnelValue: { fontFamily: fonts.bold, fontSize: 17 },
  haltBanner: { borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12 },
  haltText: { fontFamily: fonts.semibold, fontSize: 12.5 },
  hero: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: 24, padding: spacing.lg },
  heroRisk: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heroRiskText: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 11.5 },
  heroShadow: { borderRadius: radius.md },
  heroTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  preparation: { flexBasis: '100%', fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  section: { fontFamily: fonts.semibold, fontSize: 17 },
  sessionDate: { fontFamily: fonts.regular, fontSize: 11, marginTop: 3 },
  sessionHead: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
});
