import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lightning, Pause, Play } from 'phosphor-react-native';
import { ActionButton } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { ConsumerHomeStatus } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';
import { autoTradeModeNotice, type AutoTradeModeResult } from './auto-trade-mode';

/**
 * Auto-trade group: per-trade and daily limits, copy-trading consent, and enable/pause.
 * All numeric fields use tabular figures so balances and limits line up.
 */
export function AutoTradeItem() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const resource = useConsumerResource<ConsumerHomeStatus>('homeStatus', undefined, 30_000);
  const [expanded, setExpanded] = useState(false);
  const [perTrade, setPerTrade] = useState('');
  const [daily, setDaily] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const data = resource.data;
  const limits = data?.limits;
  const consent = data?.consent;
  const edited = useRef(false);
  useEffect(() => {
    if (limits && !edited.current) {
      setPerTrade(String(limits.requestedPerTradeUsdc ?? limits.perTradeUsdc));
      setDaily(String(limits.requestedDailyUsdc ?? limits.dailyUsdc));
    }
  }, [limits]);

  const run = async <T,>(action: () => Promise<T>, note: string | ((result: T) => string)) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      setMessage(typeof note === 'function' ? note(result) : note);
      await resource.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  const saveLimits = async () => {
    const per = Number(perTrade);
    const day = Number(daily);
    if (!Number.isFinite(per) || !Number.isFinite(day) || per <= 0 || day <= 0) { setMessage('Enter a valid per-trade and daily amount.'); return; }
    if (per < 1) { setMessage('Per-trade amount must be at least $1.'); return; }
    if (day < per) { setMessage('Daily amount must be at least the per-trade amount.'); return; }
    await run(async () => {
      if (!consent?.fresh) await consumer('acceptCopyConsent', { version: consent?.currentVersion ?? 1, accepted: true });
      await consumer('configureAutoTradeLimits', { perTradeUsdc: per, dailyUsdc: day });
    }, 'Limits saved.');
  };

  const toggle = () => {
    if (data?.enabled) void run(() => consumer('pauseAutoTrade', { reason: 'Paused from Account' }), 'Auto-trade paused.');
    else void run(() => consumer('enableAutoTrade'), 'Auto-trade enabled.');
  };

  const setMode = (mode: 'PAPER' | 'LIVE') => {
    if (!data || data.executionMode === mode) return;
    const apply = () => void run(
      () => consumer<AutoTradeModeResult>('configureAutoTradeMode', { mode }),
      (result) => autoTradeModeNotice(mode, result),
    );
    if (mode === 'LIVE') {
      if (!data.liveAccess?.available) {
        setMessage(data.liveAccess?.reason ?? 'Live trading is not available for this account yet.');
        return;
      }
      Alert.alert(
        'Switch to Live?',
        'Future published signals will use real funds from your dedicated PolyClaw execution wallet, within your limits. Your linked Polymarket wallet remains read-only.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Use Live funds', style: 'destructive', onPress: () => void (async () => {
          const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
          if (!hardware || !enrolled) { setMessage('Set up Face ID, Touch ID, or device authentication before using Live funds.'); return; }
          const authenticated = await LocalAuthentication.authenticateAsync({ promptMessage: 'Switch PolyClaw to Live', cancelLabel: 'Cancel', disableDeviceFallback: false });
          if (authenticated.success) apply();
        })() }],
      );
      return;
    }
    apply();
  };

  const status = !data ? 'Syncing' : data.enabled ? 'On' : data.ready ? 'Off' : 'Not ready';
  return (
    <AccountItem
      Icon={Lightning}
      title="Auto-trade"
      detail={limits ? `${money(limits.perTradeUsdc)} per trade · ${money(limits.dailyUsdc)} per day` : 'Copy published signals within your limits'}
      status={status}
      tone={data?.enabled ? 'success' : data?.ready ? 'neutral' : 'warning'}
      expanded={expanded}
      onPress={() => setExpanded((value) => !value)}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>
        {consent?.fresh
          ? `Copy-trading consent v${consent.currentVersion} accepted.`
          : 'Accept the current copy-trading consent to turn auto-trade on.'}
      </Text>
      <View accessibilityLabel="Trading mode" style={[hostStyles.modeControl, { backgroundColor: theme.field, borderColor: theme.border }]}>
        {(['PAPER', 'LIVE'] as const).map((mode) => {
          const active = data?.executionMode === mode;
          const unavailable = mode === 'LIVE' && data?.liveAccess?.available !== true;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: busy || !data || unavailable }}
              disabled={busy || !data || unavailable}
              key={mode}
              onPress={() => setMode(mode)}
              style={[hostStyles.modeOption, active && { backgroundColor: theme.panel }]}
            >
              <Text style={[hostStyles.modeLabel, { color: active ? theme.text : theme.textMuted }]}>{mode === 'PAPER' ? 'Test' : 'Live'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.footnote, { color: theme.textMuted }]}>
        {data?.executionMode === 'LIVE'
          ? 'Live uses real USDC from your dedicated execution wallet. The signer cannot withdraw.'
          : 'Test uses simulated funds. No order is sent to Polymarket.'}
      </Text>
      {data && data.liveAccess?.available !== true ? <Text style={[styles.footnote, { color: theme.textMuted }]}>{data.liveAccess?.reason ?? 'Live trading is not available for this account yet.'}</Text> : null}
      {limits ? (
        <Text style={[styles.footnote, { color: theme.textMuted }]}>
          {money(limits.dailyUsedUsdc)} used · {money(limits.dailyRemainingUsdc)} remaining · next full trade {money(limits.approvedStakePreviewUsdc)}.{`\n`}
          Your saved authorization does not change unless you edit it. Resets {new Date(limits.resetsAt).toLocaleString()}.
        </Text>
      ) : null}
      {message ? <Text style={[styles.footnote, { color: theme.textMuted }]}>{message}</Text> : null}
      <View style={hostStyles.fieldRow}>
        <View style={hostStyles.field}>
          <Text style={[styles.itemDetail, { color: theme.textMuted }]}>PER TRADE (USDC)</Text>
          <TextInput
            accessibilityLabel="Per trade amount in USDC"
            keyboardType="decimal-pad"
            onChangeText={(value) => { edited.current = true; setPerTrade(value); }}
            placeholder={String(limits?.requestedPerTradeUsdc ?? limits?.perTradeUsdc ?? 5)}
            placeholderTextColor={theme.textMuted}
            style={[hostStyles.input, { borderColor: theme.border, color: theme.text }]}
            value={perTrade}
          />
        </View>
        <View style={hostStyles.field}>
          <Text style={[styles.itemDetail, { color: theme.textMuted }]}>PER DAY (USDC)</Text>
          <TextInput
            accessibilityLabel="Daily amount in USDC"
            keyboardType="decimal-pad"
            onChangeText={(value) => { edited.current = true; setDaily(value); }}
            placeholder={String(limits?.requestedDailyUsdc ?? limits?.dailyUsdc ?? 15)}
            placeholderTextColor={theme.textMuted}
            style={[hostStyles.input, { borderColor: theme.border, color: theme.text }]}
            value={daily}
          />
        </View>
      </View>
      <ActionButton label="Save limits" loading={busy} onPress={() => void saveLimits()} variant="secondary" />
      <ActionButton
        disabled={!data?.enabled && !data?.ready}
        icon={(data?.enabled ? Pause : Play) as never}
        label={data?.enabled ? 'Pause auto-trade' : 'Enable auto-trade'}
        loading={busy}
        onPress={toggle}
        variant={data?.enabled ? 'secondary' : 'primary'}
      />
    </AccountItem>
  );
}

function money(value: number) {
  return `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

const hostStyles = {
  field: { flex: 1, gap: 6 },
  fieldRow: { flexDirection: 'row', gap: spacing.md },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    ...numeric,
  },
  modeControl: { borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', padding: 3 },
  modeOption: { alignItems: 'center', borderRadius: radius.sm - 2, flex: 1, minHeight: 38, justifyContent: 'center' },
  modeLabel: { fontFamily: fonts.semibold, fontSize: 14 },
} as const;
