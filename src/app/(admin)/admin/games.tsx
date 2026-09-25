import { randomUUID } from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { ArrowDown, ArrowLeft, ArrowUp, Check, MagnifyingGlass, Plus, Trash } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBottomClearance } from '@/components/bottom-clearance';

import { useAuth } from '@/auth/provider';
import { PressableScale } from '@/components/motion';
import { AdminGamesListSkeleton } from '@/components/page-skeletons';
import { ActionButton, Card, EmptyState, Header, ResourceState, Screen, ListScreen, money } from '@/components/ui-kit';
import { useAdminResource } from '@/hooks/use-admin-resource';
import type { AdminBatchPreview, AdminFootballGame, AdminFootballGameMarkets, AdminFootballGames, AdminFootballOutcome, AdminSignalBatch, AdminSignalRow } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';
import { AppBottomSheet, BottomSheetTextInput, type AppBottomSheetHandle } from '@/components/app-bottom-sheet';

type BatchView = AdminSignalBatch & { signals: AdminSignalRow[] };
type DateFilter = 'TODAY' | 'TOMORROW' | 'WEEK';
const SEARCH_DEBOUNCE_MS = 350;
const GAMES_PAGE_SIZE = 20;

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cents(value: number | null) {
  return value == null ? '—' : `${Math.round(value * 100)}¢`;
}

/** Game → market → outcome → review. The server returns only verified admin market families. */
export default function AdminGamesScreen() {
  const { theme } = usePolyClawTheme();
  const { height: navigationHeight } = useBottomClearance();
  const [reviewHeight, setReviewHeight] = useState(50);
  const gameRequest = useRef(0);
  const { admin } = useAuth();
  const [batch, setBatch] = useState<BatchView | null>(null);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('TODAY');
  const [competition, setCompetition] = useState<string | null>(null);
  const [games, setGames] = useState<AdminFootballGames | null>(null);
  const [selected, setSelected] = useState<AdminFootballGameMarkets | null>(null);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueLoadingMore, setCatalogueLoadingMore] = useState(false);
  const [catalogueHydrated, setCatalogueHydrated] = useState(false);
  const [preview, setPreview] = useState<AdminBatchPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, { maxPrice: string; expiryMinutes: string }>>({});
  const requestId = useRef(0);
  const catalogueRequestPending = useRef(false);
  const reviewSheet = useRef<AppBottomSheetHandle>(null);
  const pendingOutcomeIds = useRef(new Set<string>());
  const draftCreation = useRef<Promise<string> | null>(null);
  const drafts = useAdminResource<AdminSignalBatch[]>('listBatches', { status: 'DRAFT' }, 30_000, games !== null || catalogueError !== null);

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
        date: filter === 'WEEK' ? undefined : filter === 'TODAY' ? isoDate() : isoDate(1),
        timeZoneOffsetMinutes: new Date().getTimezoneOffset(),
        competition: selectedCompetition ?? undefined,
        cursor: cursor ?? undefined,
        pageSize: GAMES_PAGE_SIZE,
      });
      if (request === requestId.current) setGames((current) => {
        if (!append) return result;
        const merged = new Map([...(current?.items ?? []), ...result.items].map((game) => [game.id, game]));
        return { ...result, leagues: [...new Set([...(current?.leagues ?? []), ...result.leagues])].sort(), items: [...merged.values()] };
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
    const frame = requestAnimationFrame(() => setCatalogueHydrated(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!catalogueHydrated) return;
    const timer = setTimeout(() => void loadGames(query, dateFilter, competition), query.trim() ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [catalogueHydrated, competition, dateFilter, loadGames, query]);

  const loadNextGames = useCallback(() => {
    if (!selected && games?.nextCursor) void loadGames(query, dateFilter, competition, games.nextCursor);
  }, [competition, dateFilter, games, loadGames, query, selected]);

  const loadBatch = async (id: string) => {
    setPreview(null);
    setBatch(await admin<BatchView>('getBatch', { batchId: id }));
  };

  const ensureDraft = async () => {
    if (batch) return batch.id;
    if (draftCreation.current) return draftCreation.current;
    draftCreation.current = admin<AdminSignalBatch>('createDraft', { title: `Games · ${new Date().toLocaleDateString()}` }).then(async (created) => {
      await drafts.refresh();
      setBatch({ ...created, signals: [] });
      return created.id;
    }).finally(() => { draftCreation.current = null; });
    return draftCreation.current;
  };

  const openGame = async (game: AdminFootballGame) => {
    const request = ++gameRequest.current;
    setCatalogueLoading(true);
    try {
      const detail = await admin<AdminFootballGameMarkets>('catalogueGameMarkets', { gameId: game.id });
      if (request === gameRequest.current) setSelected(detail);
    } catch (error) { if (request === gameRequest.current) setMessage(error instanceof Error ? error.message : 'This game is no longer available.'); }
    finally { if (request === gameRequest.current) setCatalogueLoading(false); }
  };

  const addOutcome = async (outcome: AdminFootballOutcome) => {
    const outcomeKey = `${outcome.eventId}:${outcome.conditionId}:${outcome.tokenId}`;
    if (pendingOutcomeIds.current.has(outcomeKey)) return;
    if (batch?.signals.some((signal) => signal.kickoff === outcome.kickoff && signal.eventTitle === outcome.eventTitle)) {
      setMessage('Only one outcome per game can be included. Remove the current selection first.');
      return;
    }
    pendingOutcomeIds.current.add(outcomeKey);
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
        marketSnapshot: { marketType: outcome.marketType, currentPrice: outcome.currentPrice, polymarketUrl: outcome.polymarketUrl, priceConfirmed: false },
      } });
      await loadBatch(batchId);
      setSelected(null);
      setMessage(`${outcome.selectionLabel} added. Confirm its price in Review.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not add this outcome.'); }
    finally { pendingOutcomeIds.current.delete(outcomeKey); setBusy(false); }
  };

  const editFor = (signal: AdminSignalRow) => edits[signal.id] ?? {
    maxPrice: String(Math.round(signal.maxPrice * 100)),
    expiryMinutes: String(Math.max(10, Math.round((new Date(signal.kickoff).getTime() - new Date(signal.expiresAt).getTime()) / 60_000))),
  };

  const saveSignal = async (signal: AdminSignalRow) => {
    if (!batch) return;
    const edit = editFor(signal);
    const price = Number(edit.maxPrice);
    const expiryMinutes = Number(edit.expiryMinutes);
    const expiresAt = new Date(new Date(signal.kickoff).getTime() - expiryMinutes * 60_000);
    const selectedPrice = typeof signal.marketSnapshot?.currentPrice === 'number' ? signal.marketSnapshot.currentPrice : null;
    if (!Number.isFinite(price) || price < 1 || price > 99 || selectedPrice == null || price / 100 > selectedPrice + 0.02000001 || !Number.isFinite(expiryMinutes) || expiryMinutes < 10 || expiresAt <= new Date()) {
      setMessage('Use a maximum no more than 2¢ above the selected price and close at least 10 minutes before kickoff.');
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
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not remove this selection.'); }
    finally { setBusy(false); }
  };

  const moveSignal = async (signalId: string, direction: 'UP' | 'DOWN') => {
    if (!batch) return;
    setBusy(true);
    try { await admin('moveSignal', { batchId: batch.id, signalId, direction }); await loadBatch(batch.id); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not reorder this selection.'); }
    finally { setBusy(false); }
  };

  const review = async () => {
    if (!batch) return;
    if (batch.signals.some((signal) => {
      const edit = edits[signal.id];
      return edit && (Number(edit.maxPrice) / 100 !== signal.maxPrice || Number(edit.expiryMinutes) !== Math.round((new Date(signal.kickoff).getTime() - new Date(signal.expiresAt).getTime()) / 60_000));
    })) { setPreview(null); setMessage('Confirm your edited prices and expiry times before previewing.'); return; }
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
    Alert.alert('Publish immutable batch?', `${batch.signals.length} selection${batch.signals.length === 1 ? '' : 's'} · ${preview.testUsers} Test and ${preview.liveUsers} Live recipients · up to ${money(preview.aggregateExposureUsdc)} aggregate exposure.`, [
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

  return (
    <>
    <ListScreen
      bottomAccessoryHeight={batch?.signals.length ? reviewHeight + spacing.md : 0}
      data={games?.items ?? []}
      keyExtractor={(game) => game.id}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={5}
      onEndReached={() => { if (!catalogueLoading && !catalogueLoadingMore && games?.items.length) loadNextGames(); }}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={catalogueLoading} onRefresh={() => void loadGames(query, dateFilter, competition)} tintColor={theme.accent} />}
      ListHeaderComponent={<View style={{ gap: spacing.md }}>
        <Header eyebrow="ADMIN" title="Games" />
        {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
        <View style={[styles.search, { backgroundColor: theme.field, borderColor: theme.border }]}><MagnifyingGlass color={theme.textMuted} size={18} /><TextInput accessibilityLabel="Search upcoming games" onChangeText={setQuery} placeholder="Search teams" placeholderTextColor={theme.textMuted} style={[styles.searchInput, { color: theme.text }]} value={query} /></View>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {(['TODAY', 'TOMORROW', 'WEEK'] as const).map((filter) => <FilterChip active={dateFilter === filter} key={filter} label={filter === 'TODAY' ? 'Today' : filter === 'TOMORROW' ? 'Tomorrow' : 'Next 7 days'} onPress={() => setDateFilter(filter)} />)}
        </ScrollView>
        {games?.leagues.length ? <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip active={competition === null} label="All leagues" onPress={() => setCompetition(null)} />
          {games.leagues.map((item) => <FilterChip active={competition === item} key={item} label={item} onPress={() => setCompetition(item)} />)}
        </ScrollView> : null}
        <ResourceState error={catalogueError} />
        <Text style={[styles.meta, { color: theme.textMuted }]}>{catalogueLoading ? 'Refreshing games…' : `${games?.items.length ?? 0} games loaded`}</Text>
      </View>}
      renderItem={({ item: game }) => <FixtureCard game={game} onPress={() => void openGame(game)} selected={Boolean(batch?.signals.some((signal) => signal.eventTitle === game.eventTitle && signal.kickoff === game.kickoff))} />}
      ListEmptyComponent={!catalogueHydrated || catalogueLoading ? <AdminGamesListSkeleton /> : <EmptyState detail={games?.nextCursor ? 'Load more to continue searching this date range.' : 'Try another team, date, or competition.'} title={games?.nextCursor ? 'No matches on this page' : 'No matching games'} />}
      ListFooterComponent={<View style={{ gap: spacing.md }}>
        {games?.nextCursor ? <ActionButton label="Load more games" loading={catalogueLoadingMore} onPress={loadNextGames} variant="secondary" /> : null}
        {drafts.data?.some((item) => item.id !== batch?.id) ? <View style={{ gap: spacing.sm }}><Text style={[styles.sectionTitle, { color: theme.text }]}>Saved drafts</Text>{drafts.data.filter((item) => item.id !== batch?.id).map((item) => <PressableScale accessibilityLabel={`Open ${item.title ?? 'draft'}`} accessibilityRole="button" key={item.id} onPress={() => void loadBatch(item.id)}><View style={[styles.game, { borderBottomColor: theme.border }]}><Text style={[styles.gameTitle, { color: theme.text }]}>{item.title ?? 'Untitled draft'}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{item.signalCount}</Text></View></PressableScale>)}</View> : null}
      </View>}
    />
    {selected ? <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}>
      <Screen bottomAccessoryHeight={batch?.signals.length ? reviewHeight + spacing.md : 0}>
        <PressableScale accessibilityLabel="Back to games" accessibilityRole="button" onPress={() => { gameRequest.current++; setSelected(null); }}><View style={styles.back}><ArrowLeft color={theme.text} size={18} /><Text style={[styles.backText, { color: theme.text }]}>All games</Text></View></PressableScale>
        <FixtureCard game={selected.game} />
        {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
        {selected.markets.map((market) => <Card key={market.type}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{market.label}</Text>
          <View style={styles.outcomes}>{market.outcomes.map((outcome) => <PressableScale disabled={busy} accessibilityLabel={`Select ${outcome.selectionLabel} at ${cents(outcome.currentPrice)}`} accessibilityRole="button" key={`${outcome.conditionId}:${outcome.tokenId}`} onPress={() => void addOutcome(outcome)}><View style={[styles.outcome, { backgroundColor: theme.field, borderColor: theme.border }]}><Text style={[styles.outcomeLabel, { color: theme.text }]}>{outcome.selectionLabel}</Text><Text style={[styles.price, { color: theme.accent }]}>{cents(outcome.currentPrice)}</Text><Plus color={theme.accent} size={16} /></View></PressableScale>)}</View>
        </Card>)}
      </Screen>
    </View> : null}

    {batch?.signals.length ? <View onLayout={({ nativeEvent }) => setReviewHeight(nativeEvent.layout.height)} pointerEvents="box-none" style={[styles.reviewHost, { bottom: navigationHeight + spacing.md }]}><ActionButton label={`Review · ${batch.signals.length}`} onPress={() => reviewSheet.current?.present()} /></View> : null}
    <AppBottomSheet onDismiss={() => undefined} ref={reviewSheet} title={`Review · ${batch?.signals.length ?? 0}`}>
      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
      {batch?.signals.length ? <Card>
        {batch.signals.map((signal, index) => {
          const validation = preview?.validation.rows.find((row) => row.ordinal === signal.ordinal);
          const edit = editFor(signal);
          return <View key={signal.id} style={[styles.signal, { borderBottomColor: theme.border }]}>
            <View style={styles.signalHeader}><Text style={[styles.ordinal, { color: theme.textMuted }]}>{signal.ordinal}</Text><View style={styles.flex}><Text style={[styles.gameTitle, { color: theme.text }]}>{signal.eventTitle}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{signal.marketLabel} · {signal.selectionLabel}</Text></View><View style={styles.reorder}><IconButton disabled={index === 0 || busy} label="Move earlier" onPress={() => void moveSignal(signal.id, 'UP')}><ArrowUp color={theme.textMuted} size={17} /></IconButton><IconButton disabled={index === batch.signals.length - 1 || busy} label="Move later" onPress={() => void moveSignal(signal.id, 'DOWN')}><ArrowDown color={theme.textMuted} size={17} /></IconButton><IconButton disabled={busy} label="Remove selection" onPress={() => void removeSignal(signal.id)}><Trash color={theme.danger} size={17} /></IconButton></View></View>
            <View style={styles.fields}><Field label="Maximum price (¢)" value={edit.maxPrice} onChange={(value) => { setPreview(null); setEdits((current) => ({ ...current, [signal.id]: { ...edit, maxPrice: value } })); }} /><Field label="Close before kickoff (min)" value={edit.expiryMinutes} onChange={(value) => { setPreview(null); setEdits((current) => ({ ...current, [signal.id]: { ...edit, expiryMinutes: value } })); }} /></View>
            <ActionButton icon={Check as never} label={signal.marketSnapshot?.priceConfirmed === true ? 'Price confirmed' : 'Confirm price'} loading={busy} onPress={() => void saveSignal(signal)} variant="secondary" />
            {validation && !validation.valid ? <Text style={[styles.error, { color: theme.danger }]}>{validation.errors.join(' ')}</Text> : null}
          </View>;
        })}
        <ActionButton label="Preview batch" loading={busy} onPress={() => void review()} variant="secondary" />
      </Card> : <EmptyState detail="Open a game, choose a market, then choose one outcome." title="No games selected" />}

      {preview ? <Card><Text style={[styles.sectionTitle, { color: theme.text }]}>Publish preview</Text><View style={styles.previewGrid}><PreviewFact label="Test recipients" value={String(preview.testUsers)} /><PreviewFact label="Live recipients" value={String(preview.liveUsers)} /><PreviewFact label="Test exposure" value={money(preview.testExposureUsdc)} /><PreviewFact label="Funded exposure" value={money(preview.liveExposureUsdc)} /><PreviewFact label="Blocked" value={String(preview.blockedUsers)} /><PreviewFact label="Total exposure" value={money(preview.aggregateExposureUsdc)} /></View>{preview.blockedByCode.length ? <Text style={[styles.meta, { color: theme.textMuted }]}>{preview.blockedByCode.map((item) => `${item.count} ${item.code.toLowerCase().replaceAll('_', ' ')}`).join(' · ')}</Text> : null}<ActionButton disabled={!preview.validation.publishable} label="Authenticate & publish" loading={busy} onPress={() => void publish()} /></Card> : null}

    </AppBottomSheet>
    </>
  );
}

function FixtureCard({ game, onPress, selected = false }: { game: AdminFootballGame; onPress?: () => void; selected?: boolean }) {
  const { theme } = usePolyClawTheme();
  const content = <View style={[styles.fixture, { backgroundColor: theme.panel, borderColor: selected ? theme.accent : theme.border }]}>
    <View style={styles.fixtureMeta}><Text numberOfLines={1} style={[styles.meta, styles.flex, { color: theme.textMuted }]}>{game.competition ?? 'Football'}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{new Date(game.kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>{selected ? <Check color={theme.accent} size={18} /> : null}</View>
    {[game.homeTeam, game.awayTeam].map((team, index) => <View key={`${team}:${index}`} style={styles.teamRow}><View style={[styles.teamBadge, { backgroundColor: theme.field }]}><Text style={[styles.teamInitial, { color: theme.accent }]}>{team.split(' ').map((word) => word[0]).slice(0, 2).join('')}</Text></View><Text style={[styles.teamName, { color: theme.text }]}>{team}</Text></View>)}
    <View style={styles.fixturePrices}>{game.prices?.length ? game.prices.map((price) => <View key={price.label} style={[styles.priceChip, { backgroundColor: theme.field }]}><Text numberOfLines={1} style={[styles.meta, { color: theme.textMuted }]}>{price.label}</Text><Text style={[styles.price, { color: theme.accent }]}>{cents(price.price)}</Text></View>) : <Text style={[styles.meta, { color: theme.textMuted }]}>{game.marketTypes.length} market groups</Text>}</View>
    <Text style={[styles.meta, { color: theme.textMuted }]}>{new Date(game.kickoff).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {onPress ? 'View markets' : 'Choose one outcome below'}</Text>
  </View>;
  return onPress ? <PressableScale accessibilityLabel={`Open ${game.eventTitle}`} accessibilityRole="button" onPress={onPress}>{content}</PressableScale> : content;
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
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text><BottomSheetTextInput accessibilityLabel={label} keyboardType="decimal-pad" onChangeText={onChange} style={[styles.input, { borderColor: theme.border, color: theme.text }]} value={value} /></View>;
}

function PreviewFact({ label, value }: { label: string; value: string }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.previewFact}><Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.previewValue, { color: theme.text }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  fixture: { padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderRadius: radius.md },
  fixtureMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  teamInitial: { fontFamily: fonts.bold, fontSize: 10 },
  teamName: { flex: 1, fontFamily: fonts.semibold, fontSize: 16 },
  fixturePrices: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  priceChip: { flex: 1, minWidth: 0, padding: spacing.sm, borderRadius: radius.sm, gap: 3 },
  back: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 44 }, backText: { fontFamily: fonts.semibold, fontSize: 14 },
  chip: { borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md }, chipText: { fontFamily: fonts.semibold, fontSize: 12 }, chips: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  error: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 }, field: { flex: 1, gap: 6 }, fieldLabel: { fontFamily: fonts.medium, fontSize: 11.5 }, fields: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1, minWidth: 0 },
  game: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 68, paddingVertical: spacing.md }, gameTitle: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20 },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 36 }, input: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, fontFamily: fonts.semibold, fontSize: 15, minHeight: 44, paddingHorizontal: spacing.sm, ...numeric },
  marketGroup: { gap: spacing.sm }, message: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18 }, meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, ...numeric }, ordinal: { fontFamily: fonts.bold, fontSize: 12, paddingTop: 3, width: 18 },
  outcome: { alignItems: 'center', borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md }, outcomeLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 13.5 }, outcomes: { gap: spacing.sm }, price: { fontFamily: fonts.bold, fontSize: 13.5, ...numeric },
  previewFact: { gap: 3, minWidth: '44%' }, previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, previewValue: { fontFamily: fonts.bold, fontSize: 18, ...numeric }, reorder: { flexDirection: 'row' },
  reviewHost: { left: spacing.lg, position: 'absolute', right: spacing.lg, zIndex: 20 },
  search: { alignItems: 'center', borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md }, searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, minHeight: 46 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17 }, signal: { borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md, paddingVertical: spacing.md }, signalHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs },
});
