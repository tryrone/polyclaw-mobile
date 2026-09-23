import { randomUUID } from 'expo-crypto';
import { Plus, Trash } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton, Card, EmptyState, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { PressableScale } from '@/components/motion';
import { useAuth } from '@/auth/provider';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminSignalBatch, AdminSignalRow, AdminSignalValidation, ConsumerFootballCatalogue, ConsumerFootballMarket } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

type BatchView = AdminSignalBatch & { signals: AdminSignalRow[] };
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Games: search the verified football catalogue, add games individually to a draft, validate
 * the full list, publish, and review the delivery summary. CSV, pasted URLs and in-play entry
 * are outside v1.
 */
export default function AdminGamesScreen() {
  const { theme } = usePolyClawTheme();
  const { admin } = useAuth();
  const batches = useAdminResource<AdminSignalBatch[]>('listBatches', { status: 'DRAFT' }, 30_000);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchView | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ConsumerFootballMarket[] | null>(null);
  const [resultTotal, setResultTotal] = useState(0);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [validation, setValidation] = useState<AdminSignalValidation[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, { maxPrice: string; expiryMinutes: string }>>({});
  const searchRequest = useRef(0);

  const loadBatch = async (id: string) => {
    setBatchId(id);
    setValidation(null);
    setBatch(await admin<BatchView>('getBatch', { batchId: id }));
  };

  const startDraft = async () => {
    setBusy(true);
    try {
      const created = await admin<AdminSignalBatch>('createDraft', { title: `Draft ${new Date().toLocaleDateString()}` });
      await batches.refresh();
      await loadBatch(created.id);
      setMessage('Draft started. Search and add games.');
    } finally {
      setBusy(false);
    }
  };

  const search = useCallback(async (searchQuery: string) => {
    const request = searchRequest.current + 1;
    searchRequest.current = request;
    setCatalogueLoading(true);
    setCatalogueError(null);
    try {
      const catalogue = await admin<ConsumerFootballCatalogue>('catalogueSearch', { query: searchQuery.trim() || undefined, pageSize: 25 });
      if (request !== searchRequest.current) return;
      setResults(catalogue.items);
      setResultTotal(catalogue.total);
    } catch (error) {
      if (request !== searchRequest.current) return;
      setCatalogueError(error instanceof Error ? error.message : 'Catalogue search failed.');
    } finally {
      if (request === searchRequest.current) setCatalogueLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void search(query);
    }, query.trim() ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [query, search]);

  const addGame = async (market: ConsumerFootballMarket) => {
    setBusy(true);
    try {
      let id = batchId;
      if (!id) {
        const created = await admin<AdminSignalBatch>('createDraft', { title: `Draft ${new Date().toLocaleDateString()}` });
        id = created.id;
        await batches.refresh();
      }
      await admin('addSignal', {
        batchId: id,
        item: {
          eventId: market.eventId, marketId: market.marketId, conditionId: market.conditionId, outcomeTokenId: market.tokenId,
          side: 'BUY', sport: 'football', eventTitle: market.eventTitle, marketLabel: market.marketLabel,
          selectionLabel: market.selectionLabel, competition: market.competition, country: market.country,
          homeTeam: market.homeTeam, awayTeam: market.awayTeam, kickoff: market.kickoff,
          maxPrice: 0.99, expiresAt: market.kickoff, note: null,
        },
      });
      await loadBatch(id);
      setMessage(`${market.selectionLabel} added. Set its maximum price below.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add this game.');
    } finally {
      setBusy(false);
    }
  };

  const removeSignal = async (signalId: string) => {
    if (!batchId) return;
    setBusy(true);
    try {
      await admin('removeSignal', { batchId, signalId });
      await loadBatch(batchId);
    } finally {
      setBusy(false);
    }
  };

  const editFor = (signal: AdminSignalRow) => edits[signal.id] ?? {
    maxPrice: String(Math.round(signal.maxPrice * 100)),
    expiryMinutes: String(Math.max(1, Math.round((new Date(signal.kickoff).getTime() - new Date(signal.expiresAt).getTime()) / 60_000))),
  };

  const saveSignal = async (signal: AdminSignalRow) => {
    if (!batchId) return;
    const edit = editFor(signal);
    const cents = Number(edit.maxPrice);
    const expiryMinutes = Number(edit.expiryMinutes);
    const expiresAt = new Date(new Date(signal.kickoff).getTime() - expiryMinutes * 60_000);
    if (!Number.isFinite(cents) || cents < 1 || cents > 99 || !Number.isFinite(expiryMinutes) || expiryMinutes < 1 || expiresAt <= new Date()) {
      setMessage('Use a 1–99¢ maximum price and an expiry at least one minute before kickoff.');
      return;
    }
    setBusy(true);
    try {
      await admin('updateSignal', { batchId, signalId: signal.id, item: {
        eventId: signal.eventId, marketId: signal.marketId, conditionId: signal.conditionId, outcomeTokenId: signal.outcomeTokenId,
        side: 'BUY', sport: 'football', eventTitle: signal.eventTitle, marketLabel: signal.marketLabel,
        selectionLabel: signal.selectionLabel, competition: signal.competition, country: signal.country,
        homeTeam: signal.homeTeam, awayTeam: signal.awayTeam, kickoff: signal.kickoff,
        maxPrice: cents / 100, expiresAt: expiresAt.toISOString(), note: signal.note,
      } });
      setValidation(null);
      await loadBatch(batchId);
      setMessage('Trade limits saved. Validate the list again.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save trade limits.');
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    if (!batchId) return;
    setBusy(true);
    try {
      const result = await admin<{ rows: AdminSignalValidation[]; publishable: boolean }>('validateBatch', { batchId });
      setValidation(result.rows);
      setMessage(result.publishable ? 'Every row is valid. Ready to publish.' : 'Some rows still need attention.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!batchId) return;
    setBusy(true);
    try {
      await admin('publishBatch', { batchId, idempotencyKey: randomUUID(), confirmed: true });
      setMessage('Batch published. Eligible users received an independent limit order.');
      setBatch(null);
      setBatchId(null);
      setValidation(null);
      await batches.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Publish failed.');
    } finally {
      setBusy(false);
    }
  };

  const confirmPublish = () => {
    if (!batch) return;
    Alert.alert(
      'Publish this list?',
      `${batch.signals.length} trade${batch.signals.length === 1 ? '' : 's'} will be queued for users who are eligible now. This cannot be edited after publishing.`,
      [{ text: 'Keep reviewing', style: 'cancel' }, { text: 'Publish', style: 'destructive', onPress: () => void publish() }],
    );
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={batches.loading} onRefresh={batches.refresh} tintColor={theme.accent} />}>
      <Header title="Games" />
      <ResourceState error={batches.error} loading={batches.loading && !batches.data?.length} />
      {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Verified catalogue</Text>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search verified football games"
          onChangeText={setQuery}
          onSubmitEditing={() => void search(query)}
          placeholder="Search team or market"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={query}
        />
        <ActionButton label={query.trim() ? 'Search' : 'Refresh'} loading={catalogueLoading} onPress={() => void search(query)} />
      </View>
      <Text accessibilityLiveRegion="polite" style={[styles.searchStatus, { color: catalogueError ? theme.danger : theme.textMuted }]}>
        {catalogueLoading
          ? 'Searching games…'
          : catalogueError
            ? catalogueError
            : results
              ? `${results.length} of ${resultTotal} available outcome${resultTotal === 1 ? '' : 's'}`
              : 'Loading upcoming games…'}
      </Text>
      {results?.length ? results.map((market) => (
        <PressableScale accessibilityLabel={`Add ${market.eventTitle} ${market.selectionLabel}`} accessibilityRole="button" key={`${market.conditionId}:${market.tokenId}`} onPress={() => void addGame(market)}>
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.text }]}>{market.eventTitle}</Text>
              <Text numberOfLines={1} style={[styles.rowSub, { color: theme.textMuted }]}>{market.selectionLabel} · {new Date(market.kickoff).toLocaleString()}</Text>
            </View>
            <Plus color={theme.textMuted} size={18} />
          </View>
        </PressableScale>
      )) : results ? <Text style={[styles.copy, { color: theme.textMuted }]}>No matching verified markets.</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Draft</Text>
        {!batch ? <ActionButton label="New draft" loading={busy} onPress={() => void startDraft()} variant="secondary" /> : null}
      </View>
      {batch ? (
        <Card>
          {batch.signals.length ? batch.signals.map((signal) => {
            const row = validation?.find((item) => item.ordinal === signal.ordinal);
            return (
              <View key={signal.id} style={[styles.signalRow, { borderBottomColor: theme.border }]}>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.text }]}>{signal.eventTitle}</Text>
                  <Text numberOfLines={1} style={[styles.rowSub, { color: theme.textMuted }]}>{signal.selectionLabel} · {new Date(signal.kickoff).toLocaleString()}</Text>
                  <View style={styles.limitRow}>
                    <View style={styles.limitField}>
                      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Max price (¢)</Text>
                      <TextInput accessibilityLabel={`Maximum price for ${signal.selectionLabel} in cents`} keyboardType="number-pad" onChangeText={(value) => setEdits((current) => ({ ...current, [signal.id]: { ...editFor(signal), maxPrice: value } }))} style={[styles.smallInput, { borderColor: theme.border, color: theme.text }]} value={editFor(signal).maxPrice} />
                    </View>
                    <View style={styles.limitField}>
                      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Close before kickoff (min)</Text>
                      <TextInput accessibilityLabel={`Expiry before kickoff for ${signal.selectionLabel} in minutes`} keyboardType="number-pad" onChangeText={(value) => setEdits((current) => ({ ...current, [signal.id]: { ...editFor(signal), expiryMinutes: value } }))} style={[styles.smallInput, { borderColor: theme.border, color: theme.text }]} value={editFor(signal).expiryMinutes} />
                    </View>
                  </View>
                  <ActionButton label="Save limits" loading={busy} onPress={() => void saveSignal(signal)} variant="secondary" />
                  {row && !row.valid ? <Text style={[styles.rowError, { color: theme.danger }]}>{row.errors.join(' ')}</Text> : null}
                </View>
                {row ? <StatusPill label={row.valid ? 'Valid' : 'Fix'} tone={row.valid ? 'success' : 'danger'} /> : null}
                <PressableScale accessibilityLabel={`Remove ${signal.selectionLabel}`} accessibilityRole="button" onPress={() => void removeSignal(signal.id)}>
                  <View style={styles.iconButton}><Trash color={theme.textMuted} size={17} /></View>
                </PressableScale>
              </View>
            );
          }) : <Text style={[styles.copy, { color: theme.textMuted }]}>Search and add games to build this batch.</Text>}
          <View style={styles.actionRow}>
            <ActionButton disabled={!batch.signals.length} label="Validate list" loading={busy} onPress={() => void validate()} variant="secondary" />
            <ActionButton
              disabled={!batch.signals.length || !(validation?.every((row) => row.valid))}
              label="Publish batch"
              loading={busy}
              onPress={confirmPublish}
            />
          </View>
        </Card>
      ) : (
        <EmptyState detail="Start a draft, then search the verified catalogue and add games one at a time." title="No draft selected" />
      )}

      {batches.data?.length ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Open drafts</Text>
          {batches.data.filter((item) => item.id !== batch?.id).map((item) => (
            <PressableScale accessibilityLabel={`Open draft ${item.title ?? item.id}`} accessibilityRole="button" key={item.id} onPress={() => void loadBatch(item.id)}>
              <View style={[styles.row, { borderBottomColor: theme.border }]}>
                <View style={styles.flex}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{item.title ?? 'Untitled draft'}</Text>
                  <Text style={[styles.rowSub, { color: theme.textMuted }]}>{item.signalCount} signals · {new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <StatusPill label={item.status} tone="warning" />
              </View>
            </PressableScale>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  copy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  flex: { flex: 1, minWidth: 0 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 11 },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  input: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, flex: 1, fontFamily: fonts.regular, fontSize: 14.5, minHeight: 44, paddingHorizontal: spacing.md },
  message: { fontFamily: fonts.medium, fontSize: 12.5 },
  limitField: { flex: 1, gap: 5 },
  limitRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  row: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  rowError: { fontFamily: fonts.medium, fontSize: 11.5, marginTop: 3 },
  rowSub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2, ...numeric },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  signalRow: { alignItems: 'flex-start', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md },
  smallInput: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.medium, fontSize: 14, minHeight: 44, paddingHorizontal: spacing.sm },
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  searchStatus: { fontFamily: fonts.medium, fontSize: 12, marginTop: spacing.xs },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17, marginBottom: spacing.sm, marginTop: spacing.lg },
});
