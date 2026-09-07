import { Text, View } from 'react-native';
import { Card, SectionHeading, shortDate } from './ui-kit';
import { decimalOdds, marketLabel, probabilityLabel } from '@/lib/markets';
import type { ConsumerDashboard } from '@/lib/types';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export function DoubleChanceOverview({ items }: { items: NonNullable<ConsumerDashboard['doubleChance']> }) {
  const { theme } = usePolyClawTheme();
  return <>
    <SectionHeading title="Double Chance" meta="PRE-MATCH · PAPER" />
    {items.map((item) => <Card key={item.market}>
      <Text style={{ color: theme.text, fontFamily: fonts.display, fontSize: 16 }}>{marketLabel(item.market)}</Text>
      {item.fixtureLabel ? <Text style={{ color: theme.textMuted, fontFamily: fonts.regular, marginTop: spacing.sm }}>{item.fixtureLabel}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.md }}>
        <Text style={{ color: theme.text, fontFamily: fonts.display, fontSize: 22 }}>{decimalOdds(item.tokenPrice)} <Text style={{ fontFamily: fonts.medium, fontSize: 12 }}>quoted odds</Text></Text>
        <Text style={{ color: theme.textMuted, fontFamily: fonts.regular }}>{item.tokenPrice == null ? 'Quote unavailable' : `${(item.tokenPrice * 100).toFixed(1)}¢ per token`}</Text>
      </View>
      <Text style={{ color: theme.textMuted, fontFamily: fonts.regular, marginTop: spacing.sm }}>{probabilityLabel(item.probability, item.decisionMode)} · 90 min + stoppage</Text>
      <Text style={{ color: theme.textMuted, fontFamily: fonts.regular, marginTop: spacing.sm }}>{item.reason}</Text>
      {item.quotedAt ? <Text style={{ color: theme.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: spacing.sm }}>Quote recorded {shortDate(item.quotedAt)} · odds before fees</Text> : null}
    </Card>)}
  </>;
}
