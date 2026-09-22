import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Lightning, Pause, Play } from 'phosphor-react-native';
import { ActionButton } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { ConsumerHomeStatus } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';

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

  const run = async (action: () => Promise<unknown>, note: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(note);
      await resource.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  const saveLimits = async () => {
    const per = Number(perTrade || (data?.limits.perTradeUsdc ?? 0));
    const day = Number(daily || (data?.limits.dailyUsdc ?? 0));
    if (!Number.isFinite(per) || !Number.isFinite(day) || per <= 0 || day <= 0) { setMessage('Enter a valid per-trade and daily amount.'); return; }
    await run(async () => {
      if (!data?.consent.fresh) await consumer('acceptCopyConsent', { version: data?.consent.currentVersion ?? 1, accepted: true });
      await consumer('configureAutoTradeLimits', { perTradeUsdc: per, dailyUsdc: day });
    }, 'Limits saved.');
  };

  const toggle = () => {
    if (data?.enabled) void run(() => consumer('pauseAutoTrade', { reason: 'Paused from Account' }), 'Auto-trade paused.');
    else void run(() => consumer('enableAutoTrade'), 'Auto-trade enabled.');
  };

  const status = !data ? 'Syncing' : data.enabled ? 'On' : data.ready ? 'Off' : 'Not ready';
  return (
    <AccountItem
      Icon={Lightning}
      title="Auto-trade"
      detail={data ? `${money(data.limits.perTradeUsdc)} per trade · ${money(data.limits.dailyUsdc)} per day` : 'Copy published signals within your limits'}
      status={status}
      tone={data?.enabled ? 'success' : data?.ready ? 'neutral' : 'warning'}
      expanded={expanded}
      onPress={() => setExpanded((value) => !value)}
    >
      <Text style={[styles.body, { color: theme.textMuted }]}>
        {data?.consent.fresh
          ? `Copy-trading consent v${data.consent.currentVersion} accepted.`
          : 'Accept the current copy-trading consent to turn auto-trade on.'}
      </Text>
      {message ? <Text style={[styles.footnote, { color: theme.textMuted }]}>{message}</Text> : null}
      <View style={hostStyles.fieldRow}>
        <View style={hostStyles.field}>
          <Text style={[styles.itemDetail, { color: theme.textMuted }]}>PER TRADE (USDC)</Text>
          <TextInput
            accessibilityLabel="Per trade amount in USDC"
            keyboardType="decimal-pad"
            onChangeText={setPerTrade}
            placeholder={String(data?.limits.perTradeUsdc ?? 5)}
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
            onChangeText={setDaily}
            placeholder={String(data?.limits.dailyUsdc ?? 15)}
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
} as const;
