import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Card, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { AdminUsersSkeleton } from '@/components/page-skeletons';
import { PnlChartCard } from '@/components/pnl-chart-card';
import { PressableScale } from '@/components/motion';
import { useAuth } from '@/auth/provider';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminEligibilityRow, AdminPublisher, AutoTradePerformance } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

type PublisherStatus = { isAdministrator: boolean; granted: boolean; status: string | null; grantedAt: string | null };

/**
 * Users: eligibility with concise blocking reasons, plus publisher grants. Publisher
 * permission is separate from the broad ADMIN role and is granted explicitly here.
 */
export default function AdminUsersScreen() {
  const { theme } = usePolyClawTheme();
  const { admin, session } = useAuth();
  const [query, setQuery] = useState('');
  const directory = useAdminResource<AdminEligibilityRow[]>('eligibilityDirectory', undefined, 30_000);
  const publishers = useAdminResource<AdminPublisher[]>('listPublishers', undefined, 60_000);
  const publisherStatus = useAdminResource<PublisherStatus>('publisherStatus', undefined, 60_000);
  const [grantUserId, setGrantUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [performanceUserId, setPerformanceUserId] = useState<string | null>(null);
  const [userPerformance, setUserPerformance] = useState<AutoTradePerformance | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const performanceRequest = useRef(0);

  const loadPerformance = useCallback(async (userId: string, clear = false) => {
    const request = performanceRequest.current + 1;
    performanceRequest.current = request;
    if (clear) setUserPerformance(null);
    setPerformanceError(null);
    setPerformanceLoading(true);
    try {
      const result = await admin<AutoTradePerformance>('tradePerformance', { range: '1M', mode: 'LIVE', userId });
      if (performanceRequest.current === request) setUserPerformance(result);
    } catch (error) {
      if (performanceRequest.current === request) setPerformanceError(error instanceof Error ? error.message : 'Could not load user performance.');
    } finally {
      if (performanceRequest.current === request) setPerformanceLoading(false);
    }
  }, [admin]);

  const togglePerformance = async (userId: string) => {
    if (performanceUserId === userId) {
      performanceRequest.current += 1;
      setPerformanceUserId(null);
      setUserPerformance(null);
      setPerformanceError(null);
      setPerformanceLoading(false);
      return;
    }
    setPerformanceUserId(userId);
    await loadPerformance(userId, true);
  };

  useEffect(() => {
    if (!performanceUserId) return;
    const timer = setInterval(() => void loadPerformance(performanceUserId), 30_000);
    return () => clearInterval(timer);
  }, [loadPerformance, performanceUserId]);

  const refresh = () => Promise.all([
    directory.refresh(),
    publishers.refresh(),
    publisherStatus.refresh(),
    ...(performanceUserId ? [loadPerformance(performanceUserId)] : []),
  ]);

  const rows = (directory.data ?? []).filter((row) => !query.trim() || `${row.email} ${row.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const initialLoading = (directory.loading && directory.data === null)
    || (publishers.loading && publishers.data === null)
    || (publisherStatus.loading && publisherStatus.data === null);

  const grant = async (requestedUserId?: string) => {
    const userId = requestedUserId?.trim() || grantUserId.trim();
    if (!userId) { setMessage('Enter the user id to grant publisher access.'); return; }
    setBusy(true);
    try {
      await admin('grantPublisher', { userId, reason: userId === session?.user.id ? 'Administrator enabled their publisher access' : 'Granted from admin Users tab', idempotencyKey: randomUUID(), confirmed: true });
      setMessage('Publisher grant created.');
      setGrantUserId('');
      await Promise.all([publishers.refresh(), publisherStatus.refresh()]);
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

  if (initialLoading) return (
    <Screen refreshControl={<RefreshControl refreshing onRefresh={() => void refresh()} tintColor={theme.accent} />}>
      <Header title="Users" />
      <ResourceState loading loadingFallback={<AdminUsersSkeleton />} />
    </Screen>
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={directory.loading || performanceLoading} onRefresh={() => void refresh()} tintColor={theme.accent} />}>
      <Header title="Users" />
      <ResourceState error={directory.error} />
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
        <View key={row.userId}>
          <PressableScale accessibilityLabel={`View ${row.name ?? row.email} 30-day PnL`} accessibilityRole="button" onPress={() => void togglePerformance(row.userId)}>
            <View style={[styles.row, { borderBottomColor: theme.border }]}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{row.name ?? row.email}</Text>
                <Text numberOfLines={1} style={[styles.sub, { color: theme.textMuted }]}>
                  {money(row.perTradeUsdc)}/trade · {money(row.dailyUsdc)}/day · consent v{row.consentVersion ?? '—'}
                </Text>
                {row.blockingReason ? <Text numberOfLines={2} style={[styles.blocking, { color: theme.warning }]}>{row.blockingReason}</Text> : null}
              </View>
              <StatusPill label={row.eligible ? 'Eligible' : row.blockingCode ?? 'Blocked'} tone={row.eligible ? 'success' : 'warning'} />
            </View>
          </PressableScale>
          {performanceUserId === row.userId ? (
            <PnlChartCard
              compact
              data={userPerformance}
              error={performanceError}
              loading={performanceLoading}
              showQuality
              title={`${row.name ?? row.email} · 30-day PnL`}
            />
          ) : null}
        </View>
      )) : <Text style={[styles.copy, { color: theme.textMuted }]}>No Auto-trade users yet.</Text>}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Publishers</Text>
      <Card>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          Publishers can assemble, validate, publish and cancel signal batches. This is separate from the broad admin role.
        </Text>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: theme.text }]}>Your publishing access</Text>
            <Text style={[styles.sub, { color: theme.textMuted }]}>{publisherStatus.data?.granted ? 'You can create and publish game lists.' : 'Enable this before creating your first list.'}</Text>
          </View>
          <StatusPill label={publisherStatus.data?.granted ? 'Enabled' : 'Off'} tone={publisherStatus.data?.granted ? 'success' : 'warning'} />
        </View>
        {!publisherStatus.data?.granted ? (
          <ActionButton label="Enable publishing for me" loading={busy} onPress={() => void grant(session?.user.id)} />
        ) : null}
        <TextInput
          accessibilityLabel="User id to grant publisher access"
          autoCapitalize="none"
          onChangeText={setGrantUserId}
          placeholder="BetsClaw user id"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={grantUserId}
        />
        <ActionButton label="Grant another publisher" loading={busy} onPress={() => void grant()} variant="secondary" />
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
