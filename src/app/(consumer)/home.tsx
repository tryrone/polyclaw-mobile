import { router } from 'expo-router';
import { Check, Pause, Play, Wallet } from 'phosphor-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { Disclosure } from '@/components/disclosure';
import { ActionButton, Card, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { ConsumerHomeStatus, PolyClawPrimaryAction } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

/**
 * Home leads with one dominant object: the Auto-trade / wallet hero. Below it are the current
 * readiness or pause state, the daily amount used and remaining, exactly one primary action,
 * and a short "Today" preview. No decorative gradients or metric walls.
 */
export default function ConsumerHome() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const resource = useConsumerResource<ConsumerHomeStatus>('homeStatus', undefined, 20_000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [perTrade, setPerTrade] = useState('');
  const [daily, setDaily] = useState('');

  const data = resource.data;

  const run = async (action: () => Promise<unknown>, note?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (note) setMessage(note);
      await resource.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  const onPrimary = () => {
    if (!data) return;
    const action: PolyClawPrimaryAction = data.primaryAction;
    if (action === 'FUND' || action === 'NONE') { router.push('/account' as never); return; }
    if (action === 'ENABLE') void run(() => consumer('enableAutoTrade'), 'Auto-trade enabled.');
    if (action === 'PAUSE') void run(() => consumer('pauseAutoTrade', { reason: 'Paused by user' }), 'Auto-trade paused.');
  };

  const submitSetup = async () => {
    const per = Number(perTrade);
    const day = Number(daily);
    if (!Number.isFinite(per) || !Number.isFinite(day) || per <= 0 || day <= 0) { setMessage('Enter a valid per-trade and daily amount.'); return; }
    await run(async () => {
      if (!data?.consent.fresh) await consumer('acceptCopyConsent', { version: data?.consent.currentVersion ?? 1, accepted: true });
      await consumer('configureAutoTradeLimits', { perTradeUsdc: per, dailyUsdc: day });
    }, 'Limits saved. Tap Enable when you are ready.');
  };

  const heroState = !data ? 'SYNCING'
    : !data.ready ? 'SETUP NEEDED'
      : data.executionMode === 'PAPER' ? (data.enabled ? 'PAPER ACTIVE' : 'PAPER READY')
        : data.enabled ? 'ACTIVE' : 'PAUSED';
  const heroTone = !data ? 'neutral' : !data.ready ? 'warning' : data.enabled ? 'success' : 'warning';
  const primaryLabel = data?.primaryAction === 'ENABLE' ? 'Enable auto-trade'
    : data?.primaryAction === 'PAUSE' ? 'Pause auto-trade'
      : data?.primaryAction === 'FUND' ? 'Fund wallet'
        : data?.primaryAction === 'NONE' ? 'View account'
          : 'Set up auto-trade';
  const PrimaryIcon = data?.primaryAction === 'PAUSE' ? Pause : data?.primaryAction === 'FUND' ? Wallet : data?.primaryAction === 'ENABLE' ? Play : Check;

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
      <Header action={<StatusPill label={heroState} live={data?.enabled} tone={heroTone} />} title="Auto-trade" />
      <ResourceState error={resource.error} loading={resource.loading} />

      <View style={[styles.hero, { backgroundColor: theme.text }]}>
        <Text style={[styles.heroLabel, { color: theme.background }]}>TODAY REMAINING</Text>
        <Text style={[styles.heroValue, { color: theme.background }]}>{money(data?.limits.dailyRemainingUsdc ?? 0)}</Text>
        <Text style={[styles.heroCaption, { color: theme.background }]}>
          {data ? `${money(data.limits.dailyUsedUsdc)} of ${money(data.limits.dailyUsdc)} used today` : 'Syncing your daily allowance'}
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={[styles.heroCellLabel, { color: theme.background }]}>Per trade</Text>
            <Text style={[styles.heroCellValue, { color: theme.background }]}>{money(data?.limits.perTradeUsdc ?? 0)}</Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={[styles.heroCellLabel, { color: theme.background }]}>Open trades</Text>
            <Text style={[styles.heroCellValue, { color: theme.background }]}>{data?.openTrades ?? 0}</Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={[styles.heroCellLabel, { color: theme.background }]}>{data?.executionMode === 'PAPER' ? 'Paper funds' : 'Wallet'}</Text>
            <Text style={[styles.heroCellValue, { color: theme.background }]}>{money(data?.wallet.availablePusd ?? 0)}</Text>
          </View>
        </View>
      </View>

      {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}

      {data && !data.ready && data.blockers.length ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Before you start</Text>
          {data.blockers.slice(0, 4).map((blocker) => (
            <Text key={blocker.code} style={[styles.blocker, { color: theme.textMuted }]}>· {blocker.label}</Text>
          ))}
        </Card>
      ) : null}

      {data && data.primaryAction === 'SET_UP' ? (
        <Card style={styles.setupCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Set your limits</Text>
          <Text style={[styles.copy, styles.setupCopy, { color: theme.textMuted }]}>
            Each published signal places at most your per-trade amount, capped by the platform and your remaining day.
          </Text>
          <View style={[styles.fieldRow, styles.setupFieldRow]}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Per trade (USDC)</Text>
              <TextInput
                accessibilityLabel="Per trade amount in USDC"
                keyboardType="decimal-pad"
                onChangeText={setPerTrade}
                placeholder="5"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={perTrade}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Per day (USDC)</Text>
              <TextInput
                accessibilityLabel="Daily amount in USDC"
                keyboardType="decimal-pad"
                onChangeText={setDaily}
                placeholder="15"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={daily}
              />
            </View>
          </View>
          <Disclosure detail="Copy trading lets PolyClaw place the publisher's signal on your wallet within your limits. You can pause any time and close individual positions yourself." label="What am I agreeing to?">
            <Text style={[styles.copy, { color: theme.textMuted }]}>
              Signals are pre-match football limit orders. Published terms are fixed and expire at kickoff at the latest.
            </Text>
          </Disclosure>
          <ActionButton icon={Check as never} label="Save limits" loading={busy} onPress={() => void submitSetup()} />
        </Card>
      ) : null}

      <ActionButton
        icon={PrimaryIcon as never}
        label={primaryLabel}
        loading={busy}
        onPress={onPrimary}
      />

      <View style={styles.previewHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today</Text>
        <Text style={[styles.previewMeta, { color: theme.textMuted }]}>{data?.today.length ?? 0} updates</Text>
      </View>
      {data?.today.length ? (
        data.today.map((row) => (
          <View key={row.id} style={[styles.previewRow, { borderBottomColor: theme.border }]}>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={[styles.previewTitle, { color: theme.text }]}>{row.eventTitle}</Text>
              <Text numberOfLines={1} style={[styles.previewSub, { color: theme.textMuted }]}>{row.selectionLabel} · {row.status}</Text>
            </View>
            <Text style={[styles.previewValue, { color: theme.text }]}>{money(row.stakeUsdc)}</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.copy, { color: theme.textMuted }]}>No fills or skips yet today.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  blocker: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  copy: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  field: { flex: 1, gap: 6 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11.5 },
  fieldRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  hero: { borderRadius: radius.md, gap: 2, padding: spacing.xl },
  heroCaption: { fontFamily: fonts.regular, fontSize: 13, opacity: 0.7 },
  heroCell: { flex: 1 },
  heroCellLabel: { fontFamily: fonts.medium, fontSize: 11, opacity: 0.6 },
  heroCellValue: { fontFamily: fonts.semibold, fontSize: 15, marginTop: 2, ...numeric },
  heroLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, opacity: 0.6 },
  heroRow: { flexDirection: 'row', marginTop: spacing.lg },
  heroValue: { fontFamily: fonts.displayLight, fontSize: 44, letterSpacing: -1.2, ...numeric },
  input: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.semibold, fontSize: 15, minHeight: 44, paddingHorizontal: spacing.md },
  message: { fontFamily: fonts.medium, fontSize: 12.5 },
  previewHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  previewMeta: { fontFamily: fonts.medium, fontSize: 11.5 },
  previewRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 52 },
  previewSub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  previewTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  previewValue: { fontFamily: fonts.bold, fontSize: 14, ...numeric },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17 },
  setupCard: { gap: spacing.md },
  setupCopy: { marginTop: 0 },
  setupFieldRow: { marginTop: 0 },
});
