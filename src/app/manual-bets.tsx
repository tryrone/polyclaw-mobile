import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/provider';
import { DetailScreen } from '@/components/detail-layout';
import { ActionButton, Card, EmptyState, ResourceState, StatusPill, money, shortDate } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { ItemsData, ManualBet } from '@/lib/types';
import { fonts, radius, usePolyClawTheme } from '@/theme';

export default function ManualBetsScreen() {
  const { request } = useAuth();
  const resource = useOperatorResource<ItemsData<ManualBet>>('manual-bets', 20_000);
  const decide = async (id: string, decision: 'CONFIRM' | 'REJECT', acceptedOdds?: number, transactionCode?: string) => {
    await request('manual-bets/' + id + '/decision', { method: 'POST', body: { decision, acceptedOdds, transactionCode } });
    await resource.refresh();
  };
  const items = resource.data?.items ?? [];
  return <DetailScreen title="Manual bets" eyebrow="SPORTYBET HANDOFF">
    <ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {items.length ? items.map((bet) => <ManualBetCard key={bet.id} bet={bet} disabled={resource.stale || !!resource.error} decide={decide} />) : !resource.loading ? <EmptyState title="No manual bets" detail="SportyBet remains manual. Approved proposals will appear here for recording, never automatic submission." /> : null}
  </DetailScreen>;
}

function ManualBetCard({ bet, disabled, decide }: { bet: ManualBet; disabled: boolean; decide: (id: string, decision: 'CONFIRM' | 'REJECT', odds?: number, code?: string) => Promise<void> }) {
  const { theme } = usePolyClawTheme();
  const [odds, setOdds] = useState(String(bet.proposedOdds));
  const [code, setCode] = useState('');
  const actionable = bet.status === 'PROPOSED';
  return <Card>
    <StatusPill label={bet.status} tone={actionable ? 'warning' : bet.status === 'CONFIRMED' ? 'success' : 'neutral'} />
    <Text style={[styles.fixture, { color: theme.text }]}>{bet.fixtureLabel}</Text>
    <Text style={[styles.market, { color: theme.textMuted }]}>{bet.marketLabel} · planned stake {money(bet.plannedStake)}</Text>
    <Text style={[styles.expiry, { color: theme.textMuted }]}>Expires {shortDate(bet.expiresAt)}</Text>
    {actionable ? <>
      <TextInput keyboardType="decimal-pad" value={odds} onChangeText={setOdds} placeholder="Accepted odds" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} />
      <TextInput value={code} onChangeText={setCode} placeholder="SportyBet transaction code" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} />
      <View style={styles.actions}><View style={{ flex: 1 }}><ActionButton label="Reject" variant="secondary" disabled={disabled} onPress={() => decide(bet.id, 'REJECT')} /></View><View style={{ flex: 1 }}><ActionButton label="Record bet" disabled={disabled || !(Number(odds) > 1) || !code.trim()} onPress={() => decide(bet.id, 'CONFIRM', Number(odds), code.trim())} /></View></View>
    </> : null}
  </Card>;
}
const styles = StyleSheet.create({ fixture: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, marginTop: 14 }, market: { fontFamily: fonts.regular, fontSize: 12, marginTop: 6 }, expiry: { fontFamily: fonts.medium, fontSize: 10, marginVertical: 13 }, input: { height: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13, fontFamily: fonts.medium, fontSize: 13, marginTop: 10 }, actions: { flexDirection: 'row', gap: 10, marginTop: 12 } });
