import { router } from 'expo-router';
import { ArrowUpRight, Clock3 } from '@/components/modern-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Trade } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';
import { PressableScale } from './motion';
import { Card, StatusPill, money, percent, shortDate } from './ui-kit';

const tone = (status: Trade['status']) => status === 'FILLED' || status === 'SETTLED' ? 'success' : status === 'CANCELLED' || status === 'EXPIRED' ? 'danger' : status === 'PLANNED' ? 'warning' : 'neutral';

export function TradeCard({ trade }: { trade: Trade }) {
  const { theme } = usePolyClawTheme();
  return (
    <PressableScale accessibilityRole="button" onPress={() => router.push(`/trade/${trade.id}`)} containerStyle={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.pills}>
            <StatusPill label={trade.mode} tone={trade.mode === 'PAPER' ? 'neutral' : 'warning'} />
            <StatusPill label={trade.status} tone={tone(trade.status)} live={trade.status === 'PLANNED'} />
          </View>
          <ArrowUpRight size={18} color={theme.textMuted} />
        </View>
        <Text style={[styles.fixture, { color: theme.text }]} numberOfLines={2}>{trade.fixtureLabel}</Text>
        <Text style={[styles.market, { color: theme.textMuted }]}>{trade.market} · {trade.side}</Text>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <View style={styles.row}>
          <View><Text style={[styles.label, { color: theme.textMuted }]}>STAKE</Text><Text style={[styles.value, { color: theme.text }]}>{money(trade.plannedStake)}</Text></View>
          <View><Text style={[styles.label, { color: theme.textMuted }]}>EDGE</Text><Text style={[styles.value, { color: theme.success }]}>{percent(trade.edge)}</Text></View>
          <View><Text style={[styles.label, { color: theme.textMuted }]}>ENTRY</Text><Text style={[styles.value, { color: theme.text }]}>{trade.entryPrice.toFixed(3)}</Text></View>
        </View>
        <View style={styles.time}><Clock3 size={13} color={theme.textMuted} /><Text style={[styles.timeText, { color: theme.textMuted }]}>{shortDate(trade.kickoff)}</Text></View>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({ wrap: { alignSelf: 'stretch' }, card: { gap: 11 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, pills: { flexDirection: 'row', gap: 7 }, fixture: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23 }, market: { fontFamily: fonts.regular, fontSize: 13 }, separator: { height: StyleSheet.hairlineWidth }, label: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2, marginBottom: 4 }, value: { fontFamily: fonts.semibold, fontSize: 15 }, time: { flexDirection: 'row', alignItems: 'center', gap: 6 }, timeText: { fontFamily: fonts.medium, fontSize: 11 } });
