import { useState } from 'react';
import { SignOut } from 'phosphor-react-native';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemePicker } from '@/components/theme-picker';
import { AdminSettingsSkeleton } from '@/components/page-skeletons';
import { ActionButton, Card, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminConnections, AdminPlatformControl } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

type AuditRow = { id: string; subjectUserId: string; actorId: string; action: string; reason: string; createdAt: string };

/**
 * Settings: platform ceilings, global pause, connections and the publisher/platform audit
 * trail. Personal limits remain user-controlled; admins can only set the platform-wide
 * safety ceiling or lower it during an incident.
 */
export default function AdminSettingsScreen() {
  const { theme } = usePolyClawTheme();
  const { admin, signOut } = useAuth();
  const control = useAdminResource<AdminPlatformControl>('platformControl', undefined, 30_000);
  const connections = useAdminResource<AdminConnections>('connections', undefined, 60_000);
  const audit = useAdminResource<AuditRow[]>('publisherAudit', { limit: 25 }, 60_000);
  const [perTrade, setPerTrade] = useState('');
  const [daily, setDaily] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveCeilings = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await admin('updatePlatformControl', {
        ...(perTrade ? { maxStakePerTradeUsdc: Number(perTrade) } : {}),
        ...(daily ? { maxStakePerUtcDayUsdc: Number(daily) } : {}),
      });
      setMessage('Platform ceilings updated.');
      setPerTrade('');
      setDaily('');
      await control.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const setPaused = async (paused: boolean) => {
    setBusy(true);
    try {
      await admin('setGlobalPause', { paused, reason: paused ? 'Global halt from admin Settings' : undefined });
      await control.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  const data = control.data;
  const initialLoading = (control.loading && control.data === null)
    || (connections.loading && connections.data === null)
    || (audit.loading && audit.data === null);

  if (initialLoading) return (
    <Screen refreshControl={<RefreshControl refreshing onRefresh={control.refresh} tintColor={theme.accent} />}>
      <Header action={<StatusPill label="SYNCING" tone="neutral" />} title="Settings" />
      <ResourceState loading loadingFallback={<AdminSettingsSkeleton />} />
    </Screen>
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={control.loading} onRefresh={control.refresh} tintColor={theme.accent} />}>
      <Header
        action={<StatusPill label={data?.globallyPaused ? 'HALTED' : 'RUNNING'} live={!data?.globallyPaused} tone={data?.globallyPaused ? 'danger' : 'success'} />}
        title="Settings"
      />
      <ResourceState error={control.error} />
      {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}

      <Card>
        <ThemePicker />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Platform ceilings</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>Current: {data?.maxStakePerTradeUsdc ?? '—'} per trade · {data?.maxStakePerUtcDayUsdc ?? '—'} per UTC day</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>Users choose their own limits up to these ceilings. Hard maximum: {data?.hardCaps.maxStakePerTradeUsdc ?? 25} per trade · {data?.hardCaps.maxStakePerUtcDayUsdc ?? 100} per day.</Text>
        <View style={styles.fieldRow}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>PER TRADE (USDC)</Text>
            <TextInput accessibilityLabel="Maximum stake per trade" keyboardType="decimal-pad" onChangeText={setPerTrade} placeholder={String(data?.maxStakePerTradeUsdc ?? 5)} placeholderTextColor={theme.textMuted} style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={perTrade} />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>PER DAY (USDC)</Text>
            <TextInput accessibilityLabel="Maximum stake per UTC day" keyboardType="decimal-pad" onChangeText={setDaily} placeholder={String(data?.maxStakePerUtcDayUsdc ?? 15)} placeholderTextColor={theme.textMuted} style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={daily} />
          </View>
        </View>
        <ActionButton label="Save ceilings" loading={busy} onPress={() => void saveCeilings()} variant="secondary" />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Global pause</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          {data?.globallyPaused ? `New signals are halted: ${data.pauseReason ?? 'no reason recorded'}.` : 'New signals may be placed within published ceilings.'}
        </Text>
        <ActionButton
          label={data?.globallyPaused ? 'Resume auto-trading' : 'Halt all auto-trading'}
          loading={busy}
          onPress={() => void setPaused(!data?.globallyPaused)}
          variant={data?.globallyPaused ? 'primary' : 'danger'}
        />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Connections</Text>
        <Row label="Admin signals" value={connections.data?.adminSignalsEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
        <Row label="Live transport" value={connections.data?.liveTransportEnabled ? 'Armed' : 'Not armed'} theme={theme} />
        <Row label="Execution channel" value={connections.data?.executionChannelConfigured ? 'Configured' : 'Missing'} theme={theme} />
        <Row label="Engine status" value={connections.data?.executionEngine ? 'Reachable' : 'Unavailable'} theme={theme} />
        <Row label="Engine admin signals" value={connections.data?.executionEngine?.adminSignalsEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
        <Row label="Global engine approval" value={connections.data?.executionEngine?.globalEngineApproved ? 'Approved' : 'Not approved'} theme={theme} />
        <Row label="iOS approval" value={connections.data?.executionEngine?.iosApproved ? 'Approved' : 'Not approved'} theme={theme} />
        <Row label="Builder + signer" value={connections.data?.executionEngine?.builderApproved && connections.data.executionEngine.builderCodeConfigured && connections.data.executionEngine.remoteBuilderSignerConfigured ? 'Ready' : 'Incomplete'} theme={theme} />
        <Row label="KMS + chain" value={connections.data?.executionEngine?.kmsConfigured && connections.data.executionEngine.rpcConfigured && connections.data.executionEngine.collateralConfigured && connections.data.executionEngine.contractAllowlistConfigured ? 'Ready' : 'Incomplete'} theme={theme} />
        <Row label="Raw private key" value={connections.data?.executionEngine?.rawPrivateKeyAbsent ? 'Absent' : 'Unsafe configuration'} theme={theme} />
        <Row label="Supported jurisdictions" value={connections.data?.supportedJurisdictions.length ? connections.data.supportedJurisdictions.join(', ') : 'Blocked until configured'} theme={theme} />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Audit</Text>
        {(audit.data ?? []).length ? (audit.data ?? []).map((row) => (
          <View key={row.id} style={[styles.auditRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.auditText, { color: theme.text }]}>{row.action} · {row.reason}</Text>
            <Text style={[styles.auditMeta, { color: theme.textMuted }]}>{new Date(row.createdAt).toLocaleString()}</Text>
          </View>
        )) : <Text style={[styles.copy, { color: theme.textMuted }]}>No publisher or platform audit entries yet.</Text>}
      </Card>

      <ActionButton
        disabled={busy}
        icon={SignOut as never}
        label="Sign out"
        onPress={() => void signOut()}
        variant="secondary"
      />
    </Screen>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof usePolyClawTheme>['theme'] }) {
  return (
    <View style={[styles.fact, { borderBottomColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.factValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  auditMeta: { fontFamily: fonts.regular, fontSize: 11.5, marginTop: 3 },
  auditRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  auditText: { fontFamily: fonts.semibold, fontSize: 13 },
  copy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  fact: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 40 },
  factValue: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 12.5, textAlign: 'right', ...numeric },
  field: { flex: 1, gap: 6 },
  fieldRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  input: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.semibold, fontSize: 15, minHeight: 44, paddingHorizontal: spacing.md, ...numeric },
  label: { fontFamily: fonts.semibold, fontSize: 11 },
  message: { fontFamily: fonts.medium, fontSize: 12.5 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17, marginBottom: spacing.sm },
});
