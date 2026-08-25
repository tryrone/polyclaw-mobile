import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, CircleX, Clock3 } from '@/components/modern-icons';
import { StyleSheet, Text, View } from 'react-native';
import { DetailScreen } from '@/components/detail-layout';
import { ActionButton, Card, Metric, ResourceState, StatusPill, money, percent, shortDate } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { DecisionCriterion, Trade } from '@/lib/types';
import { decisionModeLabel, formatCriterionValue, humanizeIdentifier } from '@/lib/decision-evidence';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export default function TradeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { theme } = usePolyClawTheme(); const { request } = useAuth();
  const resource = useOperatorResource<Trade>('trades/' + id, 20_000); const trade = resource.data;
  const cancel = async () => { await request('trades/' + id + '/cancel', { method: 'POST', body: { reason: 'Cancelled from PolyClaw mobile' } }); await resource.refresh(); };
  return <DetailScreen title="Trade detail" eyebrow="DECISION TRACE"><ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />{trade ? <>
    <Card><View style={styles.row}><StatusPill label={trade.mode} /><StatusPill label={trade.status} tone={trade.status === 'PLANNED' ? 'warning' : trade.status === 'CANCELLED' ? 'danger' : 'success'} /></View><Text style={[styles.fixture, { color: theme.text }]}>{trade.fixtureLabel}</Text><Text style={[styles.market, { color: theme.textMuted }]}>{trade.market} · {trade.side}</Text></Card>
    <Card><View style={styles.metrics}><Metric label="Planned stake" value={money(trade.plannedStake)} /><Metric label="Filled size" value={money(trade.filledSize)} /><Metric label="Probability" value={percent(trade.probability)} /><Metric label="Edge" value={percent(trade.edge)} accent /></View></Card>
    {trade.probabilityProvenance ? <Card accessible accessibilityLabel="Probability provenance">
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Probability breakdown</Text>
      <Text style={[styles.sectionDetail, { color: theme.textMuted }]}>The applied probability drives the decision. Polymarket price is used only for edge and execution.</Text>
      <Row label="Applied" value={percent(trade.probabilityProvenance.appliedProb)} />
      <Row label="Ensemble" value={optionalPercent(trade.probabilityProvenance.ensembleProb)} />
      <Row label="Bookmaker (de-vigged)" value={optionalPercent(trade.probabilityProvenance.bookmakerProb)} />
      <Row label="Dixon–Coles" value={optionalPercent(trade.probabilityProvenance.dixonColesProb)} />
      <Row label="CatBoost" value={optionalPercent(trade.probabilityProvenance.catboostProb)} />
      <Row label="Decision mode" value={decisionModeLabel(trade.probabilityProvenance.decisionMode)} />
      <Row label="Model health" value={trade.probabilityProvenance.modelHealth ?? 'UNKNOWN'} />
      <Row label="Model version" value={trade.probabilityProvenance.modelVersion ?? 'Baseline'} />
      <Row label="Forecast ID" value={trade.probabilityProvenance.forecastId ?? 'Not recorded'} />
    </Card> : null}
    {trade.criteria?.length ? <Card accessible accessibilityLabel="Decision criteria">
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Decision checklist</Text>
      <Text style={[styles.sectionDetail, { color: theme.textMuted }]}>The intent exists only because every enforced criterion passed.</Text>
      {trade.criteria.map((criterion) => <CriterionRow criterion={criterion} key={criterion.criterion} />)}
    </Card> : null}
    {trade.evidence ? <Card accessible accessibilityLabel="Market mapping evidence">
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Mapping evidence</Text>
      <Text style={[styles.sectionDetail, { color: theme.textMuted }]}>Canonical evidence used to map this venue market to the underlying fixture.</Text>
      {evidenceRows(trade.evidence).map(([label, value]) => <Row key={label} label={label} value={value} />)}
    </Card> : null}
    {trade.priceSnapshots?.length ? <Card accessible accessibilityLabel="Price snapshot timeline">
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Price timeline</Text>
      <Text style={[styles.sectionDetail, { color: theme.textMuted }]}>Recorded quotes show how the market moved from decision to kickoff.</Text>
      <View style={styles.timeline}>{trade.priceSnapshots.map((snapshot, index) => <View key={`${snapshot.kind}-${snapshot.takenAt}`} style={styles.timelineRow}>
        <View style={styles.timelineRail}><Clock3 color={theme.accent} size={16} />{index < (trade.priceSnapshots?.length ?? 0) - 1 ? <View style={[styles.timelineLine, { backgroundColor: theme.border }]} /> : null}</View>
        <View style={styles.flex}><Text style={[styles.timelineTitle, { color: theme.text }]}>{humanizeIdentifier(snapshot.kind)}</Text><Text style={[styles.timelineDetail, { color: theme.textMuted }]}>Bid {snapshot.bid.toFixed(3)} · Ask {snapshot.ask.toFixed(3)} · {shortDate(snapshot.takenAt)}</Text></View>
      </View>)}</View>
    </Card> : null}
    <Card><Row label="Venue" value={trade.venue} /><Row label="Client order ID" value={trade.clientOrderId} /><Row label="Exchange order ID" value={trade.exchangeOrderId ?? 'Not submitted'} /><Row label="Intent created" value={shortDate(trade.intentCreatedAt)} /><Row label="Submitted" value={shortDate(trade.submittedAt)} /><Row label="Kickoff" value={shortDate(trade.kickoff)} /></Card>
    {trade.status === 'PLANNED' ? <ActionButton label="Cancel planned trade" variant="danger" disabled={resource.stale || !!resource.error} onPress={cancel} /> : null}
  </> : null}</DetailScreen>;
}
function optionalPercent(value: number | null | undefined) { return value == null ? '—' : percent(value); }
function evidenceRows(value: unknown): [string, string][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [['Evidence', String(value)]];
  return Object.entries(value as Record<string, unknown>).slice(0, 12).map(([key, item]) => [
    humanizeIdentifier(key),
    item == null ? '—' : typeof item === 'object' ? JSON.stringify(item) : String(item),
  ]);
}
function CriterionRow({ criterion }: { criterion: DecisionCriterion }) { const { theme } = usePolyClawTheme(); return <View style={[styles.criterionRow, { borderBottomColor: theme.border }]}>{criterion.pass ? <CheckCircle2 color={theme.success} size={17} /> : <CircleX color={theme.danger} size={17} />}<View style={styles.flex}><Text style={[styles.criterionTitle, { color: theme.text }]}>{humanizeIdentifier(criterion.criterion)}</Text><Text style={[styles.criterionDetail, { color: theme.textMuted }]}>Observed {formatCriterionValue(criterion.value)}{criterion.threshold == null ? '' : ` · Required ${formatCriterionValue(criterion.threshold)}`}</Text></View></View>; }
function Row({ label, value }: { label: string; value: string }) { const { theme } = usePolyClawTheme(); return <View style={[styles.dataRow, { borderBottomColor: theme.border }]}><Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.rowValue, { color: theme.text }]} numberOfLines={2}>{value}</Text></View>; }
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 }, fixture: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27, marginTop: 18 }, market: { fontFamily: fonts.regular, fontSize: 13, marginTop: 7 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, sectionTitle: { fontFamily: fonts.bold, fontSize: 17 }, sectionDetail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 10 }, dataRow: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, rowLabel: { fontFamily: fonts.regular, fontSize: 12 }, rowValue: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'right', flex: 1 }, criterionRow: { alignItems: 'flex-start', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 54, paddingVertical: 10 }, criterionTitle: { fontFamily: fonts.semibold, fontSize: 12 }, criterionDetail: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 3 }, timeline: { marginTop: 4 }, timelineRow: { flexDirection: 'row', gap: 10, minHeight: 58 }, timelineRail: { alignItems: 'center', width: 18 }, timelineLine: { flex: 1, marginVertical: 4, width: StyleSheet.hairlineWidth }, timelineTitle: { fontFamily: fonts.semibold, fontSize: 12 }, timelineDetail: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 3 } });
