import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { ArrowLeft, CheckCircle, SoccerBall } from 'phosphor-react-native';
import { useAuth } from '@/auth/provider';
import { ActionButton, Card, Header, money, ResourceState, Screen, SectionHeading, shortDate, StatusPill } from '@/components/ui-kit';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import type { ConsumerFootballCatalogue, ConsumerFootballMarket, ConsumerManualOrder, ConsumerPortfolio } from '@/lib/types';
import { features } from '@/lib/features';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (letter) => {
    const value = Math.floor(Math.random() * 16);
    return (letter === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

export default function FootballTradeRoute() {
  if (!features.manualFootballTrading) return <Redirect href="/home" />;
  return <FootballTradeScreen />;
}

function FootballTradeScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const [query, setQuery] = useState(''); const [competition, setCompetition] = useState(''); const [country, setCountry] = useState(''); const [date, setDate] = useState('');
  const [minLiquidity, setMinLiquidity] = useState('0'); const [kickoffWindow, setKickoffWindow] = useState<'ALL' | '24H' | '72H'>('ALL');
  const catalogueInput = { query: query || undefined, competition: competition || undefined, country: country || undefined, date: date || undefined, pageSize: 100 };
  const catalogue = useConsumerResource<ConsumerFootballCatalogue>('footballMarkets', catalogueInput, 60_000);
  const portfolio = useConsumerResource<ConsumerPortfolio>('portfolio', { range: '1W', source: 'COMBINED' }, 60_000);
  const [selected, setSelected] = useState<ConsumerFootballMarket | null>(null); const [limitPrice, setLimitPrice] = useState('0.50'); const [stake, setStake] = useState('5');
  const [quote, setQuote] = useState<ConsumerManualOrder | null>(null); const [walletSignature, setWalletSignature] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const [pagination, setPagination] = useState<{ key: string; items: ConsumerFootballMarket[]; nextCursor: string | null }>({ key: "", items: [], nextCursor: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const catalogueKey = JSON.stringify(catalogueInput);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1_000); return () => clearInterval(timer); }, []);
  const nextCursor = pagination.key === catalogueKey ? pagination.nextCursor : catalogue.data?.nextCursor ?? null;
  const loadedMarkets = useMemo(() => {
    const byToken = new Map<string, ConsumerFootballMarket>();
    const additionalMarkets = pagination.key === catalogueKey ? pagination.items : [];
    for (const item of [...(catalogue.data?.items ?? []), ...additionalMarkets]) byToken.set(`${item.marketId}:${item.tokenId}`, item);
    return [...byToken.values()];
  }, [catalogue.data?.items, catalogueKey, pagination]);
  const filtered = useMemo(() => loadedMarkets.filter((item) => {
    if (item.liquidityUsdc < Number(minLiquidity || 0)) return false;
    const hours = (new Date(item.kickoff).getTime() - new Date(catalogue.data?.asOf ?? item.kickoff).getTime()) / 3_600_000;
    return kickoffWindow === 'ALL' || hours <= (kickoffWindow === '24H' ? 24 : 72);
  }), [catalogue.data?.asOf, kickoffWindow, loadedMarkets, minLiquidity]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true); setMessage(null);
    try {
      const page = await consumer<ConsumerFootballCatalogue>('footballMarkets', { ...catalogueInput, cursor: nextCursor });
      setPagination((current) => ({ key: catalogueKey, items: [...(current.key === catalogueKey ? current.items : []), ...page.items], nextCursor: page.nextCursor }));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load more markets'); }
    finally { setLoadingMore(false); }
  };

  if (Platform.OS === 'web') return <Screen><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}><ArrowLeft size={20} color={theme.text} /><Text style={[styles.backText, { color: theme.text }]}>Back</Text></Pressable><Header eyebrow="NATIVE ONLY" title="Manual football trading" /><Card><Text style={[styles.copy, { color: theme.textMuted }]}>Trading tickets are available only in the iOS and Android apps. No web trading surface is enabled.</Text></Card></Screen>;

  const createQuote = async () => {
    if (!selected) return;
    setBusy(true); setMessage(null);
    try {
      const next = await consumer<ConsumerManualOrder>('quoteManualOrder', { ...selected, limitPrice: Number(limitPrice), requestedStakeUsdc: Number(stake), idempotencyKey: uuid(), platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' });
      setQuote(next);
      if (next.status === 'REJECTED') setMessage((next.rejectionReasons ?? ['This order exceeds the current risk allowance.']).join(' · '));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create a quote'); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!quote) return;
    setBusy(true); setMessage(null);
    try {
      if (quote.mode === 'LIVE') {
        const geoblock = await fetch('https://polymarket.com/api/geoblock', { headers: { accept: 'application/json' } }).then((response) => response.json()) as { blocked?: boolean; country?: string; region?: string };
        if (geoblock.blocked !== false) throw new Error(`Polymarket trading is unavailable from ${[geoblock.country, geoblock.region].filter(Boolean).join('-') || 'this location'}.`);
      }
      const order = await consumer<ConsumerManualOrder>('submitManualOrder', { orderId: quote.id, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID', ...(quote.mode === 'LIVE' ? { walletSignature } : {}) });
      setQuote(order); setMessage(order.status === 'PAPER_OPEN' ? 'Paper limit order opened. It will follow the same cancellation and settlement lifecycle as live mode.' : `Order status: ${order.status}`);
      await portfolio.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit the order'); }
    finally { setBusy(false); }
  };

  return <Screen refreshControl={<RefreshControl refreshing={catalogue.loading} onRefresh={catalogue.refresh} tintColor={theme.accent} />}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}><ArrowLeft size={20} color={theme.text} /><Text style={[styles.backText, { color: theme.text }]}>Back</Text></Pressable>
    <Header eyebrow="FOOTBALL · PRE-MATCH · LIMIT ONLY" title="Manual trade" action={<StatusPill label={quote?.mode ?? 'PAPER'} tone={quote?.mode === 'LIVE' ? 'warning' : 'success'} />} />
    <Card><Text style={[styles.copy, { color: theme.textMuted }]}>Choose any supported market attached to an individual football fixture. Live matches, futures, other sports, awards and tournament winners are excluded.</Text><View style={styles.filters}><Field label="Club or market" value={query} onChangeText={setQuery} placeholder="Arsenal, total goals…" /><Field label="Competition" value={competition} onChangeText={setCompetition} placeholder="Premier League" /><Field label="Country" value={country} onChangeText={setCountry} placeholder="England" /><Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /><Field label="Minimum liquidity" value={minLiquidity} onChangeText={setMinLiquidity} placeholder="0" numeric /></View><View style={styles.chips}>{(['ALL', '24H', '72H'] as const).map((item) => <Chip key={item} label={item === 'ALL' ? 'Any kickoff' : `Next ${item}`} selected={kickoffWindow === item} onPress={() => setKickoffWindow(item)} />)}<StatusPill label="OPEN ONLY" tone="neutral" /></View></Card>
    <ResourceState loading={catalogue.loading} error={catalogue.error} />
    <SectionHeading title="Eligible selections" meta={`${filtered.length} OF ${catalogue.data?.total ?? filtered.length}`} />
    {filtered.map((market) => <Pressable key={`${market.marketId}-${market.tokenId}`} accessibilityRole="button" accessibilityLabel={`${market.eventTitle}, ${market.marketLabel}, ${market.selectionLabel}`} onPress={() => { setSelected(market); setQuote(null); setMessage(null); }}><Card style={selected?.tokenId === market.tokenId ? { borderColor: theme.accent, borderWidth: 2 } : undefined}><View style={styles.between}><View style={styles.flex}><Text style={[styles.fixture, { color: theme.text }]}>{market.eventTitle}</Text><Text style={[styles.market, { color: theme.textMuted }]}>{market.marketLabel}</Text><Text style={[styles.selection, { color: theme.accent }]}>{market.selectionLabel}</Text></View><View style={styles.right}><Text style={[styles.meta, { color: theme.textMuted }]}>{shortDate(market.kickoff)}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{money(market.liquidityUsdc)} liquidity</Text></View></View></Card></Pressable>)}
    {nextCursor ? <ActionButton label="Load more football markets" loading={loadingMore} onPress={() => void loadMore()} /> : null}
    {!catalogue.loading && !filtered.length ? <Card><Text style={[styles.fixture, { color: theme.text }]}>No eligible pre-match football markets</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Adjust the filters or refresh. Suspended and started fixtures never appear.</Text></Card> : null}
    {selected ? <><SectionHeading title="Limit ticket" meta="SERVER CHECKED" /><Card variant="raised"><View style={styles.titleRow}><SoccerBall size={24} color={theme.accent} weight="fill" /><View style={styles.flex}><Text style={[styles.fixture, { color: theme.text }]}>{selected.eventTitle}</Text><Text style={[styles.selection, { color: theme.accent }]}>{selected.marketLabel} · {selected.selectionLabel}</Text></View></View><View style={styles.ticketInputs}><Field label="Limit price (0–1)" value={limitPrice} onChangeText={setLimitPrice} numeric /><Field label="Stake (USDC)" value={stake} onChangeText={setStake} numeric /></View><Text style={[styles.copy, { color: theme.textMuted }]}>Available manual budget: {money(portfolio.data?.budgets.manualBudgetUsdc)} · Account risk allows at most the lesser of $5 or 1% equity, within the shared $15 daily cap.</Text>{quote ? <View style={[styles.quote, { backgroundColor: theme.field }]}><Row label="Approved stake" value={money(quote.approvedStakeUsdc)} /><Row label="Estimated shares" value={quote.estimatedShares.toFixed(4)} /><Row label="Maximum loss" value={money(quote.maximumLossUsdc)} /><Row label="Possible payout" value={money(quote.possiblePayoutUsdc)} /><Row label="Estimated fees" value={money(quote.estimatedFeeUsdc)} /><Row label="Quote age" value={`${clock ? Math.max(0, Math.round((clock - new Date(quote.quoteTakenAt).getTime()) / 1000)) : 0}s`} /></View> : null}{quote?.mode === 'LIVE' && quote.walletSigningPayload ? <><Text style={[styles.copy, { color: theme.textMuted }]}>Sign this exact one-time order text with the dedicated Deposit Wallet. Never paste a private key.</Text><Text selectable style={[styles.challenge, { color: theme.text }]}>{quote.walletSigningPayload}</Text><TextInput accessibilityLabel="Fresh wallet signature" value={walletSignature} onChangeText={setWalletSignature} multiline placeholder="0x signature" placeholderTextColor={theme.textMuted} style={[styles.input, styles.signature, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} /></> : null}{!quote ? <ActionButton label="Review current quote" loading={busy} onPress={() => void createQuote()} /> : quote.status === 'QUOTED' ? <ActionButton label={quote.mode === 'LIVE' ? 'Submit signed live limit order' : 'Confirm paper limit order'} icon={CheckCircle as never} loading={busy} disabled={quote.mode === 'LIVE' && !walletSignature} onPress={() => void submit()} /> : null}{message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: quote?.status === 'REJECTED' ? theme.danger : theme.textMuted }]}>{message}</Text> : null}</Card></> : null}
  </Screen>;
}

function Field({ label, value, onChangeText, placeholder, numeric }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; numeric?: boolean }) { const { theme } = usePolyClawTheme(); return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.textMuted} keyboardType={numeric ? 'decimal-pad' : 'default'} autoCapitalize="none" style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} /></View>; }
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const { theme } = usePolyClawTheme(); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? theme.accentSoft : theme.field, borderColor: selected ? theme.accent : theme.border }]}><Text style={[styles.meta, { color: selected ? theme.accent : theme.textMuted }]}>{label}</Text></Pressable>; }
function Row({ label, value }: { label: string; value: string }) { const { theme } = usePolyClawTheme(); return <View style={styles.row}><Text style={[styles.copy, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text></View>; }

const styles = StyleSheet.create({ back: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, minHeight: 44, paddingRight: 16 }, backText: { fontFamily: fonts.semibold, fontSize: 14 }, copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.md }, field: { flexGrow: 1, minWidth: '46%' }, fieldLabel: { fontFamily: fonts.medium, fontSize: 11, marginBottom: 5 }, input: { borderRadius: radius.sm, borderWidth: 1, fontFamily: fonts.medium, fontSize: 14, minHeight: 48, paddingHorizontal: 12 }, signature: { minHeight: 84, marginVertical: spacing.sm, paddingVertical: 10, textAlignVertical: 'top' }, challenge: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 16, marginTop: spacing.sm }, chips: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }, chip: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 13 }, between: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, flex: { flex: 1 }, fixture: { fontFamily: fonts.display, fontSize: 15 }, market: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 4 }, selection: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 18, marginTop: 4 }, right: { alignItems: 'flex-end', maxWidth: '35%' }, meta: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 17 }, titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 }, ticketInputs: { flexDirection: 'row', gap: 10, marginVertical: spacing.md }, quote: { borderRadius: radius.sm, gap: 8, marginVertical: spacing.md, padding: spacing.md }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, rowValue: { fontFamily: fonts.semibold, fontSize: 12.5 }, message: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: spacing.sm } });
