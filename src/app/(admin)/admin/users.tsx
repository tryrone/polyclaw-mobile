import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Card, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminEligibilityRow, AdminPublisher } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

/**
 * Users: eligibility with concise blocking reasons, plus publisher grants. Publisher
 * permission is separate from the broad ADMIN role and is granted explicitly here.
 */
export default function AdminUsersScreen() {
  const { theme } = usePolyClawTheme();
  const { admin } = useAuth();
  const [query, setQuery] = useState('');
  const directory = useAdminResource<AdminEligibilityRow[]>('eligibilityDirectory', undefined, 30_000);
  const publishers = useAdminResource<AdminPublisher[]>('listPublishers', undefined, 60_000);
  const [grantUserId, setGrantUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rows = (directory.data ?? []).filter((row) => !query.trim() || `${row.email} ${row.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  const grant = async () => {
    if (!grantUserId.trim()) { setMessage('Enter the user id to grant publisher access.'); return; }
    setBusy(true);
    try {
      await admin('grantPublisher', { userId: grantUserId.trim(), reason: 'Granted from admin Users tab', idempotencyKey: randomUUID(), confirmed: true });
      setMessage('Publisher grant created.');
      setGrantUserId('');
      await publishers.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Grant failed.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (userId: string) => {
    setBusy(true);
    try {
      await admin('revokePublisher', { userId, reason: 'Revoked from admin Users tab', idempotencyKey: randomUUID(), confirmed: true });
      await publishers.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Revoke failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={directory.loading} onRefresh={directory.refresh} tintColor={theme.accent} />}>
      <Header title="Users" />
      <ResourceState error={directory.error} loading={directory.loading && !directory.data?.length} />
      {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}

      <TextInput
        accessibilityLabel="Filter users"
        onChangeText={setQuery}
        placeholder="Filter by email or name"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        value={query}
      />

      {rows.length ? rows.map((row) => (
        <View key={row.userId} style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{row.name ?? row.email}</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>
              {money(row.perTradeUsdc)}/trade · {money(row.dailyUsdc)}/day · consent v{row.consentVersion ?? '—'}
            </Text>
            {row.blockingReason ? <Text numberOfLines={2} style={[styles.blocking, { color: theme.warning }]}>{row.blockingReason}</Text> : null}
          </View>
          <StatusPill label={row.eligible ? 'Eligible' : row.blockingCode ?? 'Blocked'} tone={row.eligible ? 'success' : 'warning'} />
        </View>
      )) : <Text style={[styles.copy, { color: theme.textMuted }]}>No Auto-trade users yet.</Text>}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Publishers</Text>
      <Card>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          Publishers can assemble, validate, publish and cancel signal batches. This is separate from the broad admin role.
        </Text>
        <TextInput
          accessibilityLabel="User id to grant publisher access"
          autoCapitalize="none"
          onChangeText={setGrantUserId}
          placeholder="BetsClaw user id"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={grantUserId}
        />
        <ActionButton label="Grant publisher" loading={busy} onPress={() => void grant()} />
        {(publishers.data ?? []).map((publisher) => (
          <View key={publisher.userId} style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{publisher.email}</Text>
              <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>Granted {new Date(publisher.grantedAt).toLocaleDateString()}</Text>
            </View>
            <ActionButton label="Revoke" loading={busy} onPress={() => void revoke(publisher.userId)} variant="secondary" />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blocking: { fontFamily: fonts.medium, fontSize: 11.5, marginTop: 3 },
  copy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  flex: { flex: 1, minWidth: 0 },
  input: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.regular, fontSize: 14.5, marginTop: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  message: { fontFamily: fonts.medium, fontSize: 12.5 },
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17, marginBottom: spacing.sm, marginTop: spacing.xl },
  sub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2, ...numeric },
  title: { fontFamily: fonts.semibold, fontSize: 14 },
});
