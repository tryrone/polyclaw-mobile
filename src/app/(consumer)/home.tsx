import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, Pause, Play, Robot } from 'phosphor-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PerformanceChart } from '@/components/performance-chart';
import { PressableScale } from '@/components/motion';
import { ActionButton, Card, Header, Metric, money, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { ConsumerPortfolio } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

/**
 * Consumer Home answers exactly three questions: what do I have, what is invested, and what is my
 * bot doing. Trades live in their own tab; Portfolio holds the deeper performance record.
 */
export default function ConsumerHome() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const resource = useConsumerDashboard();
  const portfolio = useConsumerResource<ConsumerPortfolio>('portfolio', { range: '1W', source: 'COMBINED' }, 60_000);
  const [busy, setBusy] = useState(false);

  const data = resource.data;
  const setup = data?.profile.botState === 'SETUP';
  const running = data?.profile.botState === 'ACTIVE';

  const setBotRunning = async (next: 'pause' | 'resume') => {
    setBusy(true);
    try {
      await consumer(next);
      await resource.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />
      }>
      <Header
        action={
          <StatusPill
            label={data?.profile.botState ?? 'SYNCING'}
            live={running}
            tone={running ? 'success' : data?.profile.botState === 'PAUSED_SAFETY' ? 'danger' : 'warning'}
          />
        }
        eyebrow="YOUR POLYCLAW"
        title="Paper portfolio"
      />
      <ResourceState error={resource.error} loading={resource.loading} />

      {data ? (
        <>
          <LinearGradient
            colors={[theme.panelRaised, theme.backgroundGlow]}
            style={[styles.hero, { borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textMuted }]}>SIMULATED EQUITY</Text>
            <Text style={[styles.balance, { color: theme.text }]}>{money(data.summary.equityUsdc)}</Text>
            <View style={styles.metrics}>
              <Metric label="Available" value={money(data.summary.availableBalanceUsdc)} />
              <Metric label="Invested" value={money(data.summary.openExposureUsdc)} />
              <Metric
                accent={data.summary.realizedPnlUsdc >= 0}
                label="Realized P&L"
                value={money(data.summary.realizedPnlUsdc)}
              />
            </View>
          </LinearGradient>

          <Card variant="raised">
            <View style={styles.botRow}>
              <View style={[styles.botIcon, { backgroundColor: theme.accentSoft }]}>
                <Robot size={22} color={theme.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.heading, { color: theme.text }]}>
                  {setup ? 'Your bot is ready to start' : running ? 'Your bot is trading' : 'Your bot is paused'}
                </Text>
                <Text style={[styles.copy, { color: theme.textMuted }]}>
                  {setup
                    ? 'Pick a risk level and a trade cap, then start paper trading.'
                    : running
                      ? 'Simulating eligible Polymarket decisions within your limits.'
                      : 'New paper positions are paused until you resume.'}
                </Text>
              </View>
              <PressableScale
                accessibilityLabel="Open bot settings"
                accessibilityRole="button"
                haptic="select"
                onPress={() => router.push('/bot' as never)}>
                <View style={styles.manage}>
                  <Text style={[styles.manageText, { color: theme.accent }]}>Manage</Text>
                  <ArrowRight size={15} color={theme.accent} />
                </View>
              </PressableScale>
            </View>

            {setup || !data.access.active ? (
              <ActionButton
                icon={ArrowRight as never}
                label={data.access.active ? 'Set up my bot' : 'Restore access'}
                onPress={() => router.push('/bot' as never)}
              />
            ) : running ? (
              <ActionButton
                icon={Pause as never}
                label="Pause bot"
                loading={busy}
                onPress={() => void setBotRunning('pause')}
                variant="secondary"
              />
            ) : (
              <ActionButton
                icon={Play as never}
                label="Resume bot"
                loading={busy}
                onPress={() => void setBotRunning('resume')}
                variant="secondary"
              />
            )}
          </Card>

          <Card>
            <View style={styles.between}>
              <View style={styles.flex}>
                <Text style={[styles.heading, { color: theme.text }]}>7-day equity</Text>
                <Text style={[styles.copy, { color: theme.textMuted }]}>
                  Deposits and withdrawals are excluded from return.
                </Text>
              </View>
              <PressableScale
                accessibilityLabel="Open full performance record"
                accessibilityRole="button"
                haptic="select"
                onPress={() => router.push('/portfolio' as never)}>
                <View style={styles.manage}>
                  <Text style={[styles.manageText, { color: theme.accent }]}>View all</Text>
                  <ArrowRight size={15} color={theme.accent} />
                </View>
              </PressableScale>
            </View>
            <PerformanceChart series={portfolio.data?.series ?? []} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { fontFamily: fonts.displayExtraBold, fontSize: 44, letterSpacing: -1.6, marginTop: 6 },
  between: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  botIcon: { alignItems: 'center', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  botRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: spacing.lg },
  copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  flex: { flex: 1, minWidth: 0 },
  heading: { fontFamily: fonts.display, fontSize: 16 },
  hero: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing.md, padding: spacing.xl },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4 },
  manage: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 44 },
  manageText: { fontFamily: fonts.bold, fontSize: 12.5 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
});
