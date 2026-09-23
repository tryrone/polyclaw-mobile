import { randomUUID } from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { ArrowDown, ArrowLeft, ArrowUp, Check, MagnifyingGlass, Plus, Trash } from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/provider';
import { PressableScale } from '@/components/motion';
import { AdminGamesSkeleton } from '@/components/page-skeletons';
import { ActionButton, Card, EmptyState, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminBatchPreview, AdminFootballGame, AdminFootballGameMarkets, AdminFootballGames, AdminFootballOutcome, AdminSignalBatch, AdminSignalRow } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

type BatchView = AdminSignalBatch & { signals: AdminSignalRow[] };
type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW';
const SEARCH_DEBOUNCE_MS = 350;
const GAMES_PAGE_SIZE = 20;

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function cents(value: number | null) {
  return value == null ? '—' : `${Math.round(value * 100)}¢`;
}

/** Game → market → outcome → review. Only the four launch market families are returned. */
export default function AdminGamesScreen() {
  const { theme } = usePolyClawTheme();
  const { admin } = useAuth();
  const drafts = useAdminResource<AdminSignalBatch[]>('listBatches', { status: 'DRAFT' }, 30_000);
  const [batch, setBatch] = useState<BatchView | null>(null);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [competition, setCompetition] = useState<string | null>(null);
  const [games, setGames] = useState<AdminFootballGames | null>(null);
  const [selected, setSelected] = useState<AdminFootballGameMarkets | null>(null);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueLoadingMore, setCatalogueLoadingMore] = useState(false);
  const [preview, setPreview] = useState<AdminBatchPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, { maxPrice: string; expiryMinutes: string }>>({});
  const requestId = useRef(0);
  const catalogueRequestPending = useRef(false);
  const catalogueEndY = useRef<number | null>(null);

  const competitions = useMemo(() => [...new Set((games?.items ?? []).map((game) => game.competition).filter((value): value is string => Boolean(value)))].sort(), [games]);

  const loadGames = useCallback(async (searchQuery: string, filter: DateFilter, selectedCompetition: string | null, cursor: string | null = null) => {
    const append = cursor !== null;
    if (append && catalogueRequestPending.current) return;
    const request = ++requestId.current;
    catalogueRequestPending.current = true;
    if (append) setCatalogueLoadingMore(true);
    else setCatalogueLoading(true);
    setCatalogueError(null);
    try {
      const result = await admin<AdminFootballGames>('catalogueGames', {
        query: searchQuery.trim() || undefined,
        date: filter === 'TODAY' ? isoDate() : filter === 'TOMORROW' ? isoDate(1) : undefined,
        competition: selectedCompetition ?? undefined,
        cursor: cursor ?? undefined,
        pageSize: GAMES_PAGE_SIZE,
      });
      if (request === requestId.current) setGames((current) => {
        if (!append) return result;
        const merged = new Map([...(current?.items ?? []), ...result.items].map((game) => [game.id, game]));
        return { ...result, items: [...merged.values()] };
      });
    } catch (error) {
      if (request === requestId.current) setCatalogueError(error instanceof Error ? error.message : 'Could not load games.');
    } finally {
      if (request === requestId.current) {
        catalogueRequestPending.current = false;
        setCatalogueLoading(false);
        setCatalogueLoadingMore(false);
      }
    }
  }, [admin]);

  useEffect(() => {
    const timer = setTimeout(() => void loadGames(query, dateFilter, competition), query.trim() ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [competition, dateFilter, loadGames, query]);

  const loadNextGames = useCallback(() => {
    if (!selected && games?.nextCursor) void loadGames(query, dateFilter, competition, games.nextCursor);
  }, [competition, dateFilter, games, loadGames, query, selected]);

  const handleCatalogueScroll = useCallback((offsetY: number, viewportHeight: number) => {
    if (catalogueEndY.current !== null && offsetY + viewportHeight >= catalogueEndY.current - 240) loadNextGames();
  }, [loadNextGames]);

  const loadBatch = async (id: string) => {
    setPreview(null);
    setBatch(await admin<BatchView>('getBatch', { batchId: id }));
  };

  const ensureDraft = async () => {
    if (batch) return batch.id;
    const created = await admin<AdminSignalBatch>('createDraft', { title: `Games · ${new Date().toLocaleDateString()}` });
    await drafts.refresh();
    setBatch({ ...created, signals: [] });
    return created.id;
  };

  const openGame = async (game: AdminFootballGame) => {
    setCatalogueLoading(true);
    try { setSelected(await admin<AdminFootballGameMarkets>('catalogueGameMarkets', { gameId: game.id })); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'This game is no longer available.'); }
    finally { setCatalogueLoading(false); }
  };

  const addOutcome = async (outcome: AdminFootballOutcome) => {
    if (batch?.signals.some((signal) => signal.kickoff === outcome.kickoff && signal.eventTitle === outcome.eventTitle)) {
      setMessage('Only one outcome per game can be included. Remove the current selection first.');
      return;
    }
    setBusy(true);
    try {
      const batchId = await ensureDraft();
      const defaultPrice = Math.min(0.99, Math.max(0.01, Math.ceil((outcome.currentPrice ?? 0.5) * 100) / 100));
      await admin('addSignal', { batchId, item: {
        eventId: outcome.eventId, marketId: outcome.marketId, conditionId: outcome.conditionId, outcomeTokenId: outcome.tokenId,
        side: 'BUY', sport: 'football', eventTitle: outcome.eventTitle, marketLabel: outcome.marketLabel,
        selectionLabel: outcome.selectionLabel, competition: outcome.competition, country: outcome.country,
        homeTeam: outcome.homeTeam, awayTeam: outcome.awayTeam, kickoff: outcome.kickoff,
        maxPrice: defaultPrice, expiresAt: new Date(new Date(outcome.kickoff).getTime() - 10 * 60_000).toISOString(), note: null,
        marketSnapshot: { marketType: outcome.marketType, currentPrice: outcome.currentPrice, priceConfirmed: false },
      } });
      await loadBatch(batchId);
      setSelected(null);
      setMessage(`${outcome.selectionLabel} added. Confirm its price in Review.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not add this outcome.'); }
    finally { setBusy(false); }
  };

  const editFor = (signal: AdminSignalRow) => edits[signal.id] ?? {
    maxPrice: String(Math.round(signal.maxPrice * 100)),
    expiryMinutes: String(Math.max(1, Math.round((new Date(signal.kickoff).getTime() - new Date(signal.expiresAt).getTime()) / 60_000))),
  };

  const saveSignal = async (signal: AdminSignalRow) => {
    if (!batch) return;
    const edit = editFor(signal);
    const price = Number(edit.maxPrice);
    const expiryMinutes = Number(edit.expiryMinutes);
    const expiresAt = new Date(new Date(signal.kickoff).getTime() - expiryMinutes * 60_000);
    if (!Number.isFinite(price) || price < 1 || price > 99 || !Number.isFinite(expiryMinutes) || expiryMinutes < 1 || expiresAt <= new Date()) {
      setMessage('Use a 1–99¢ maximum price and close at least one minute before kickoff.');
      return;
    }
    setBusy(true);
    try {
      await admin('updateSignal', { batchId: batch.id, signalId: signal.id, item: {
        eventId: signal.eventId, marketId: signal.marketId, conditionId: signal.conditionId, outcomeTokenId: signal.outcomeTokenId,
        side: 'BUY', sport: 'football', eventTitle: signal.eventTitle, marketLabel: signal.marketLabel,
        selectionLabel: signal.selectionLabel, competition: signal.competition, country: signal.country,
        homeTeam: signal.homeTeam, awayTeam: signal.awayTeam, kickoff: signal.kickoff,
        maxPrice: price / 100, expiresAt: expiresAt.toISOString(), note: signal.note,
        marketSnapshot: { ...(signal.marketSnapshot ?? {}), priceConfirmed: true, publisherPriceConfirmedAt: new Date().toISOString() },
      } });
      await loadBatch(batch.id);
      setMessage('Maximum price confirmed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this selection.'); }
    finally { setBusy(false); }
  };

  const removeSignal = async (signalId: string) => {
    if (!batch) return;
    setBusy(true);
    try { await admin('removeSignal', { batchId: batch.id, signalId }); await loadBatch(batch.id); }
    finally { setBusy(false); }
  };

  const moveSignal = async (signalId: string, direction: 'UP' | 'DOWN') => {
    if (!batch) return;
    setBusy(true);
    try { await admin('moveSignal', { batchId: batch.id, signalId, direction }); await loadBatch(batch.id); }
    finally { setBusy(false); }
  };

  const review = async () => {
    if (!batch) return;
    setBusy(true);
    try {
      const result = await admin<AdminBatchPreview>('previewBatch', { batchId: batch.id });
      setPreview(result);
      setMessage(result.validation.publishable ? 'Checks passed. Review exposure, then publish.' : 'Fix the highlighted selections before publishing.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Preview failed.'); }
    finally { setBusy(false); }
  };

  const publish = async () => {
    if (!batch || !preview?.validation.publishable) return;
    const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    if (!hardware || !enrolled) {
      Alert.alert('Device authentication required', 'Set up Face ID, Touch ID, or device authentication before publishing.');
      return;
    }
    const authentication = await LocalAuthentication.authenticateAsync({ promptMessage: 'Publish PolyClaw trades', cancelLabel: 'Cancel', disableDeviceFallback: false });
    if (!authentication.success) return;
    Alert.alert('Publish immutable batch?', `${batch.signals.length} selection${batch.signals.length === 1 ? '' : 's'} · ${preview.eligibleUsers} eligible users · up to ${money(preview.aggregateExposureUsdc)} aggregate exposure.`, [
      { text: 'Keep reviewing', style: 'cancel' },
      { text: 'Publish', style: 'destructive', onPress: async () => {
        setBusy(true);
        try {
          await admin('publishBatch', { batchId: batch.id, idempotencyKey: randomUUID(), confirmed: true });
          setBatch(null); setPreview(null); setMessage('Published and dispatched. The minute worker will recover any interrupted delivery.');
          await drafts.refresh();
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Publish failed.'); }
        finally { setBusy(false); }
      } },
    ]);
  };

  const initialLoading = !games && !selected && (catalogueLoading || drafts.loading);

  if (initialLoading) return (
    <Screen refreshControl={<RefreshControl refreshing onRefresh={() => void loadGames(query, dateFilter, competition)} tintColor={theme.accent} />}>
      <Header eyebrow="ADMIN" title="Games" />
      <ResourceState loading loadingFallback={<AdminGamesSkeleton />} />
    </Screen>
  );

  return (
    <Screen onScrollPosition={selected ? undefined : handleCatalogueScroll} refreshControl={<RefreshControl refreshing={catalogueLoading} onRefresh={() => void loadGames(query, dateFilter, competition)} tintColor={theme.accent} />}>
      <Header eyebrow="ADMIN" title={selected ? selected.game.eventTitle : 'Games'} />
      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}

      {selected ? (
        <>
          <PressableScale accessibilityLabel="Back to games" accessibilityRole="button" onPress={() => setSelected(null)}><View style={styles.back}><ArrowLeft color={theme.text} size={18} /><Text style={[styles.backText, { color: theme.text }]}>All games</Text></View></PressableScale>
          <Text style={[styles.meta, { color: theme.textMuted }]}>{selected.game.competition ?? 'Football'} · {new Date(selected.game.kickoff).toLocaleString()}</Text>
          {selected.markets.map((market) => <View key={market.type} style={styles.marketGroup}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{market.label}</Text>
            <View style={styles.outcomes}>{market.outcomes.map((outcome) => <PressableScale accessibilityLabel={`Select ${outcome.selectionLabel} at ${cents(outcome.currentPrice)}`} accessibilityRole="button" key={`${outcome.conditionId}:${outcome.tokenId}`} onPress={() => void addOutcome(outcome)}><View style={[styles.outcome, { backgroundColor: theme.panel, borderColor: theme.border }]}><Text style={[styles.outcomeLabel, { color: theme.text }]}>{outcome.selectionLabel}</Text><Text style={[styles.price, { color: theme.textMuted }]}>{cents(outcome.currentPrice)}</Text></View></PressableScale>)}</View>
          </View>)}
        </>
      ) : (
        <>
          <View style={[styles.search, { backgroundColor: theme.field, borderColor: theme.border }]}><MagnifyingGlass color={theme.textMuted} size={18} /><TextInput accessibilityLabel="Search upcoming games" onChangeText={setQuery} placeholder="Search teams" placeholderTextColor={theme.textMuted} style={[styles.searchInput, { color: theme.text }]} value={query} /></View>
          <View style={styles.chips}>
            {(['ALL', 'TODAY', 'TOMORROW'] as const).map((filter) => <FilterChip active={dateFilter === filter} key={filter} label={filter === 'ALL' ? '7 days' : filter === 'TODAY' ? 'Today' : 'Tomorrow'} onPress={() => setDateFilter(filter)} />)}
            {competitions.slice(0, 4).map((item) => <FilterChip active={competition === item} key={item} label={item} onPress={() => setCompetition(competition === item ? null : item)} />)}
          </View>
          <ResourceState error={catalogueError} />
          <Text style={[styles.meta, { color: theme.textMuted }]}>{catalogueLoading ? 'Loading games…' : `Showing ${games?.items.length ?? 0} of ${games?.total ?? 0} upcoming game${games?.total === 1 ? '' : 's'}`}</Text>
          {(games?.items ?? []).map((game) => <PressableScale accessibilityLabel={`Open ${game.eventTitle}`} accessibilityRole="button" key={game.id} onPress={() => void openGame(game)}><View style={[styles.game, { borderBottomColor: theme.border }]}><View style={styles.flex}><Text style={[styles.gameTitle, { color: theme.text }]}>{game.eventTitle}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{game.competition ?? 'Football'} · {new Date(game.kickoff).toLocaleString()}</Text></View><Plus color={theme.textMuted} size={19} /></View></PressableScale>)}
          {games?.nextCursor ? <ActionButton label="Load more games" loading={catalogueLoadingMore} onPress={loadNextGames} variant="secondary" /> : null}
          <View onLayout={({ nativeEvent }) => { catalogueEndY.current = nativeEvent.layout.y; }} />
          {games && !games.items.length ? <EmptyState detail="Try another team, date, or competition." title="No matching games" /> : null}
        </>
      )}

      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: theme.text }]}>Review</Text><StatusPill label={`${batch?.signals.length ?? 0} selected`} tone={batch?.signals.length ? 'success' : 'neutral'} /></View>
      {batch?.signals.length ? <Card>
        {batch.signals.map((signal, index) => {
          const validation = preview?.validation.rows.find((row) => row.ordinal === signal.ordinal);
          const edit = editFor(signal);
          return <View key={signal.id} style={[styles.signal, { borderBottomColor: theme.border }]}>
            <View style={styles.signalHeader}><Text style={[styles.ordinal, { color: theme.textMuted }]}>{signal.ordinal}</Text><View style={styles.flex}><Text style={[styles.gameTitle, { color: theme.text }]}>{signal.eventTitle}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{signal.marketLabel} · {signal.selectionLabel}</Text></View><View style={styles.reorder}><IconButton disabled={index === 0 || busy} label="Move earlier" onPress={() => void moveSignal(signal.id, 'UP')}><ArrowUp color={theme.textMuted} size={17} /></IconButton><IconButton disabled={index === batch.signals.length - 1 || busy} label="Move later" onPress={() => void moveSignal(signal.id, 'DOWN')}><ArrowDown color={theme.textMuted} size={17} /></IconButton><IconButton disabled={busy} label="Remove selection" onPress={() => void removeSignal(signal.id)}><Trash color={theme.danger} size={17} /></IconButton></View></View>
            <View style={styles.fields}><Field label="Maximum price (¢)" value={edit.maxPrice} onChange={(value) => setEdits((current) => ({ ...current, [signal.id]: { ...edit, maxPrice: value } }))} /><Field label="Close before kickoff (min)" value={edit.expiryMinutes} onChange={(value) => setEdits((current) => ({ ...current, [signal.id]: { ...edit, expiryMinutes: value } }))} /></View>
            <ActionButton icon={Check as never} label={signal.marketSnapshot?.priceConfirmed === true ? 'Price confirmed' : 'Confirm price'} loading={busy} onPress={() => void saveSignal(signal)} variant="secondary" />
            {validation && !validation.valid ? <Text style={[styles.error, { color: theme.danger }]}>{validation.errors.join(' ')}</Text> : null}
          </View>;
        })}
        <ActionButton label="Preview batch" loading={busy} onPress={() => void review()} variant="secondary" />
      </Card> : <EmptyState detail="Open a game, choose a market, then choose one outcome." title="No games selected" />}

      {preview ? <Card><Text style={[styles.sectionTitle, { color: theme.text }]}>Publish preview</Text><View style={styles.previewGrid}><PreviewFact label="Eligible" value={String(preview.eligibleUsers)} /><PreviewFact label="Blocked" value={String(preview.blockedUsers)} /><PreviewFact label="Exposure" value={money(preview.aggregateExposureUsdc)} /><PreviewFact label="Mode" value="Paper" /></View>{preview.blockedByCode.length ? <Text style={[styles.meta, { color: theme.textMuted }]}>{preview.blockedByCode.map((item) => `${item.count} ${item.code.toLowerCase().replaceAll('_', ' ')}`).join(' · ')}</Text> : null}<ActionButton disabled={!preview.validation.publishable} label="Authenticate & publish" loading={busy} onPress={() => void publish()} /></Card> : null}

      {drafts.data?.some((item) => item.id !== batch?.id) ? <View><Text style={[styles.sectionTitle, { color: theme.text }]}>Saved drafts</Text>{drafts.data.filter((item) => item.id !== batch?.id).map((item) => <PressableScale accessibilityLabel={`Open ${item.title ?? 'draft'}`} accessibilityRole="button" key={item.id} onPress={() => void loadBatch(item.id)}><View style={[styles.game, { borderBottomColor: theme.border }]}><Text style={[styles.gameTitle, { color: theme.text }]}>{item.title ?? 'Untitled draft'}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{item.signalCount}</Text></View></PressableScale>)}</View> : null}
    </Screen>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return <PressableScale accessibilityRole="button" accessibilityState={{ selected: active }} haptic="select" onPress={onPress}><View style={[styles.chip, { backgroundColor: active ? theme.text : theme.field, borderColor: active ? theme.text : theme.border }]}><Text style={[styles.chipText, { color: active ? theme.background : theme.textMuted }]}>{label}</Text></View></PressableScale>;
}

function IconButton({ children, disabled, label, onPress }: { children: ReactNode; disabled?: boolean; label: string; onPress: () => void }) {
  return <PressableScale accessibilityLabel={label} accessibilityRole="button" disabled={disabled} onPress={onPress}><View style={[styles.iconButton, disabled && { opacity: 0.3 }]}>{children}</View></PressableScale>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text><TextInput accessibilityLabel={label} keyboardType="number-pad" onChangeText={onChange} style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={value} /></View>;
}

function PreviewFact({ label, value }: { label: string; value: string }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.previewFact}><Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.previewValue, { color: theme.text }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 44 }, backText: { fontFamily: fonts.semibold, fontSize: 14 },
  chip: { borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md }, chipText: { fontFamily: fonts.semibold, fontSize: 12 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 }, field: { flex: 1, gap: 6 }, fieldLabel: { fontFamily: fonts.medium, fontSize: 11.5 }, fields: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1, minWidth: 0 },
  game: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 68, paddingVertical: spacing.md }, gameTitle: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20 },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 36 }, input: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.semibold, fontSize: 15, minHeight: 44, paddingHorizontal: spacing.sm, ...numeric },
  marketGroup: { gap: spacing.sm }, message: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18 }, meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, ...numeric }, ordinal: { fontFamily: fonts.bold, fontSize: 12, paddingTop: 3, width: 18 },
  outcome: { alignItems: 'center', borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md }, outcomeLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5 }, outcomes: { gap: spacing.sm }, price: { fontFamily: fonts.bold, fontSize: 13.5, ...numeric },
  previewFact: { gap: 3, minWidth: '44%' }, previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, previewValue: { fontFamily: fonts.bold, fontSize: 18, ...numeric }, reorder: { flexDirection: 'row' },
  search: { alignItems: 'center', borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md }, searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, minHeight: 46 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg }, sectionTitle: { fontFamily: fonts.semibold, fontSize: 17 }, signal: { borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md, paddingVertical: spacing.md }, signalHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs },
});
