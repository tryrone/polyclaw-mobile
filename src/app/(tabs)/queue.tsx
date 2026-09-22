import { marketLabel, decimalOdds, isDoubleChance } from '@/lib/markets';
import { CheckCircle2, CircleX, Microscope } from '@/components/modern-icons';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Staggered } from '@/components/motion';
import { Disclosure } from '@/components/disclosure';
import { TradeCard } from '@/components/trade-card';
import { Card, EmptyState, Header, ResourceState, Screen, SectionHeading, StatusPill, percent, shortDate } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { DecisionCriterion, QueueData } from '@/lib/types';
import { decisionModeLabel, formatCriterionValue, humanizeIdentifier } from '@/lib/decision-evidence';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

function criteria(value: unknown): DecisionCriterion[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DecisionCriterion => Boolean(
    item && typeof item === 'object' && 'criterion' in item && 'pass' in item,
  ));
}

export default function QueueScreen() {
  const { theme } = usePolyClawTheme();
  const resource = useOperatorResource<QueueData>('queue', 15_000);

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
      <Header eyebrow="UPCOMING INTENTS" title="Trade queue" />
      <ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
      {resource.data?.ready.length ? [
        { title: 'Double Chance', items: resource.data.ready.filter((trade) => isDoubleChance(trade.market)) },
        { title: 'Other markets', items: resource.data.ready.filter((trade) => !isDoubleChance(trade.market)) },
      ].filter((group) => group.items.length).map((group) => <View key={group.title} style={{ gap: spacing.md }}>
        <SectionHeading title={group.title} meta="PRE-MATCH" />
        {group.items.map((trade, index) => <Staggered key={trade.id} index={index}><TradeCard trade={trade} /></Staggered>)}
      </View>) : !resource.loading ? <EmptyState title="Queue is clear" detail="New trades appear only after research, pricing, and risk checks pass." /> : null}

      {resource.data?.noBet.length ? (
        <Disclosure
          detail="Failed criteria, observed values, thresholds and provenance — fail-closed, not an error"
          label={`${resource.data.noBet.length} no-bet decisions`}>
          {resource.data.noBet.map((item, index) => {
            const allCriteria = criteria(item.reasons);
            const failed = allCriteria.filter((criterion) => !criterion.pass);
            const provenance = item.probabilityProvenance;
            return (
              <Staggered key={item.id} index={index + 2}>
                <Card accessible accessibilityLabel={`No bet decision for ${item.fixtureId ?? item.gammaId}, ${failed.length} failed checks`}>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <Text style={[styles.title, { color: theme.text }]}>{item.market ? marketLabel(item.market) : 'Candidate rejected'}</Text>
                      <Text style={[styles.copy, { color: theme.textMuted }]}>{item.fixtureId ?? item.gammaId} · {item.session} · {shortDate(item.createdAt)}</Text>
                    </View>
                    <StatusPill label="NO BET" tone="neutral" />
                  </View>

                  {isDoubleChance(item.market) ? <Text style={[styles.title, { color: theme.text }]}>Double Chance · {decimalOdds(item.tokenPrice)} odds{item.tokenPrice != null ? ` · ${(item.tokenPrice * 100).toFixed(1)}¢` : ''}</Text> : null}
                  <View style={styles.criteriaList}>
                    {(failed.length ? failed : allCriteria).slice(0, 5).map((criterion) => (
                      <View key={criterion.criterion} style={[styles.criterion, { backgroundColor: criterion.pass ? theme.successSoft : theme.dangerSoft }]}>
                        {criterion.pass ? <CheckCircle2 color={theme.success} size={16} /> : <CircleX color={theme.danger} size={16} />}
                        <View style={styles.flex}>
                          <Text style={[styles.criterionTitle, { color: theme.text }]}>{humanizeIdentifier(criterion.criterion)}</Text>
                          <Text style={[styles.criterionDetail, { color: theme.textMuted }]}>Observed {formatCriterionValue(criterion.value)}{criterion.threshold == null ? '' : ` · Required ${formatCriterionValue(criterion.threshold)}`}</Text>
                        </View>
                      </View>
                    ))}
                    {!allCriteria.length ? <Text style={[styles.copy, { color: theme.textMuted }]}>Structured rejection evidence was not recorded for this legacy audit.</Text> : null}
                  </View>

                  {provenance ? (
                    <View style={[styles.provenance, { borderTopColor: theme.border }]}>
                      <Microscope color={theme.accent} size={16} />
                      <Text style={[styles.provenanceText, { color: theme.textMuted }]}>
                        {decisionModeLabel(provenance.decisionMode)} · applied {percent(provenance.appliedProb)} · {provenance.modelVersion ?? 'no model artifact'}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              </Staggered>
            );
          })}
        </Disclosure>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 5 },
  criteriaList: { gap: spacing.sm, marginTop: spacing.md },
  criterion: { alignItems: 'flex-start', borderRadius: radius.sm, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  criterionDetail: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 2 },
  criterionTitle: { fontFamily: fonts.semibold, fontSize: 12 },
  flex: { flex: 1 },
  provenance: { alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md },
  provenanceText: { flex: 1, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  title: { fontFamily: fonts.semibold, fontSize: 14 },
});
