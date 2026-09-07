import { marketLabel } from '@/lib/markets';
import { CheckCircle2, CircleAlert, CircleDashed, Clock3, Cpu, Database, ShieldX } from '@/components/modern-icons';
import type { LucideIcon } from '@/components/modern-icons';
import { StyleSheet, Text, View } from 'react-native';
import { DetailScreen } from '@/components/detail-layout';
import { Card, EmptyState, ResourceState, StatusPill } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { ModelConsumerHealth, ModelMarketActivation, ModelMarketMetrics, ModelsData } from '@/lib/types';
import { fonts, spacing, usePolyClawTheme } from '@/theme';

const MARKETS = ['O15', 'O25', 'U35', 'U45', 'DC_12', 'DC_1X', 'DC_X2'] as const;
type MarketActivationMode = NonNullable<ModelsData['marketActivationMode']>;

function consumerStatusLabel(status: ModelConsumerHealth['status']) {
  return status === 'SHADOW' ? 'RESEARCH ONLY' : status;
}

function score(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(3);
}

function hash(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '—';
}

function StatusIcon({ status }: { status: ModelConsumerHealth['status'] }) {
  const { theme } = usePolyClawTheme();
  const props = { size: 24, color: status === 'ACTIVE' || status === 'ELIGIBLE' ? theme.success : status === 'SHADOW' ? theme.warning : theme.danger };
  if (status === 'ACTIVE') return <CheckCircle2 {...props} accessibilityLabel="Active" />;
  if (status === 'ELIGIBLE') return <CircleAlert {...props} accessibilityLabel="Eligible for manual promotion" />;
  if (status === 'SHADOW') return <Clock3 {...props} accessibilityLabel="Running in shadow" />;
  if (status === 'BLOCKED') return <ShieldX {...props} accessibilityLabel="Blocked" />;
  return <CircleDashed {...props} accessibilityLabel="Fallback" />;
}

function MetricCell({ label, metrics }: { label: string; metrics: ModelMarketMetrics }) {
  const { theme } = usePolyClawTheme();
  return <Card style={styles.marketCard} accessible accessibilityLabel={`${label}, ${metrics.sample ?? 0} holdout examples`}>
    <View style={styles.marketHead}><Text style={[styles.marketTitle, { color: theme.text }]}>{label}</Text><Text style={[styles.sample, { color: theme.textMuted }]}>{metrics.sample ?? 0} rows</Text></View>
    <Text style={[styles.columnHead, { color: theme.textMuted }]}>Brier · log loss</Text>
    <MetricRow label="Ensemble" left={score(metrics.ensembleBrier)} right={score(metrics.ensembleLogLoss)} accent />
    <MetricRow label="Bookmaker" left={score(metrics.bookmakerBrier)} right={score(metrics.bookmakerLogLoss)} />
    <MetricRow label="Heuristic" left={score(metrics.heuristicBrier)} right={score(metrics.heuristicLogLoss)} />
  </Card>;
}

function MetricRow({ label, left, right, accent = false }: { label: string; left: string; right: string; accent?: boolean }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.metricRow}>
    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
    <Text style={[styles.metricValue, { color: accent ? theme.success : theme.text }]}>{left} · {right}</Text>
  </View>;
}

export default function ModelsScreen() {
  const { theme } = usePolyClawTheme();
  const resource = useOperatorResource<ModelsData>('models', 30_000);
  const consumer = resource.data?.consumers.find((item) => item.consumer === 'POLYCLAW') ?? null;
  const artifact = consumer?.candidate ?? consumer?.active ?? null;
  const metrics = artifact?.metrics.markets ?? {};
  const marketActivations = resource.data?.marketActivations?.filter((item) => item.consumer === 'POLYCLAW') ?? [];
  return <DetailScreen title="Models" eyebrow="READ-ONLY MONITOR">
    <ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {consumer ? <>
      <Card accessible accessibilityLabel={`PolyClaw model status ${consumerStatusLabel(consumer.status)}`}>
        <View style={styles.statusRow}>
          <StatusIcon status={consumer.status} />
          <View style={styles.flex}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>{consumerStatusLabel(consumer.status)}</Text>
            <Text style={[styles.detail, { color: theme.textMuted }]}>
              {consumer.status === 'SHADOW' ? 'Predictions are recorded but do not change paper selections.' : consumer.status === 'ELIGIBLE' ? 'All gates pass; an administrator must still promote manually.' : consumer.status === 'ACTIVE' ? 'The ensemble is applied to paper decisions only.' : consumer.status === 'FALLBACK' ? 'BetClaw is using the prior safe probability.' : 'New paper positions fail closed until model evidence is healthy.'}
            </Text>
          </View>
          <StatusPill label={resource.data?.service.status.toUpperCase() ?? 'UNKNOWN'} tone={resource.data?.service.status === 'healthy' ? 'success' : 'danger'} />
        </View>
      </Card>

      <View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Market activation</Text>
        <Text style={[styles.detail, { color: theme.textMuted, marginTop: 4 }]}>Each market moves independently from shadow evidence to a manually controlled paper canary.</Text>
      </View>
      <View style={styles.marketGrid}>
        {marketActivations.length ? marketActivations.map((activation) => <ActivationCard activation={activation} activationMode={resource.data?.marketActivationMode ?? 'off'} key={activation.id} />) : (
          <Card style={styles.activationEmpty}>
            <Text style={[styles.componentName, { color: theme.text }]}>Market-scoped rollout is {resource.data?.marketActivationMode ?? 'off'}</Text>
            <Text style={[styles.detail, { color: theme.textMuted }]}>No PolyClaw market activation rows are available. Legacy consumer-level evidence remains visible below.</Text>
          </Card>
        )}
      </View>

      <View style={styles.componentGrid}>
        <ComponentCard icon={Database} name="Dixon–Coles" version={artifact?.componentVersions?.dixonColes ?? 'dixon-coles-v1'} detail={`${artifact?.metadata.dixonMatches ?? 0} settled fixtures · Brier ${score(artifact?.metrics.overall?.dixonColesBrier)} · SHA ${hash(artifact?.components?.dixonColes?.artifactSha256)}`} healthy={Boolean(artifact)} />
        <ComponentCard icon={Cpu} name="CatBoost" version={artifact?.componentVersions?.catboost ?? 'catboost-ordered-v1'} detail={artifact?.metadata.catboostTrained ? `Artifact trained · Brier ${score(artifact?.metrics.overall?.catboostBrier)} · SHA ${hash(artifact?.components?.catboost?.artifactSha256)}` : 'Awaiting sufficient fit data'} healthy={Boolean(artifact?.metadata.catboostTrained)} />
        <ComponentCard icon={CheckCircle2} name="Calibration" version={artifact?.componentVersions?.calibration ?? 'sigmoid-v1'} detail={`Consumer-specific activation · SHA ${hash(artifact?.components?.calibration?.artifactSha256)}`} healthy={Boolean(artifact)} />
      </View>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>14-day promotion checklist</Text>
        <Text style={[styles.detail, { color: theme.textMuted }]}>Manual promotion remains disabled until every item passes.</Text>
        <View style={styles.gateList}>{consumer.gates.map((gate) => <View key={gate.key} style={[styles.gate, { borderBottomColor: theme.border }]} accessible accessibilityLabel={`${gate.pass ? 'Passed' : 'Failed'} ${gate.key}: ${gate.detail}`}>
          {gate.pass ? <CheckCircle2 size={18} color={theme.success} /> : <CircleAlert size={18} color={theme.warning} />}
          <View style={styles.flex}><Text style={[styles.gateTitle, { color: theme.text }]}>{gate.key.replaceAll('_', ' ')}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{gate.detail}</Text></View>
        </View>)}{consumer.gates.length === 0 ? <Text style={[styles.detail, { color: theme.textMuted }]}>No candidate is currently awaiting promotion.</Text> : null}</View>
      </Card>

      <View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Holdout comparison</Text>
        <Text style={[styles.detail, { color: theme.textMuted, marginTop: 4 }]}>Lower Brier score and log loss are better.</Text>
      </View>
      <View style={styles.marketGrid}>{MARKETS.map((market) => <MetricCell key={market} label={marketLabel(market)} metrics={metrics[market] ?? {}} />)}</View>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Calibration and drift trend</Text>
        <Text style={[styles.detail, { color: consumer.drift.status === 'WATCH' ? theme.warning : theme.textMuted }]}>
          {consumer.drift.status.replaceAll('_', ' ')} · Brier change {consumer.drift.brierDelta == null ? 'not available' : `${consumer.drift.brierDelta >= 0 ? '+' : ''}${consumer.drift.brierDelta.toFixed(4)}`} versus the previous artifact.
        </Text>
        <View style={styles.trendTable} accessibilityLabel="Model metric history table">
          {consumer.trend.length ? consumer.trend.map((point) => <View key={point.version} style={[styles.trendRow, { borderBottomColor: theme.border }]}>
            <View style={styles.flex}><Text style={[styles.trendVersion, { color: theme.text }]} numberOfLines={1}>{point.version}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{new Date(point.createdAt).toLocaleDateString()}</Text></View>
            <Text style={[styles.trendScore, { color: theme.text }]}>Brier {score(point.metrics.ensembleBrier)}{`\n`}Log {score(point.metrics.ensembleLogLoss)}</Text>
          </View>) : <Text style={[styles.detail, { color: theme.textMuted }]}>No completed model history yet.</Text>}
        </View>
      </Card>
    </> : !resource.loading ? <EmptyState title="No PolyClaw model evidence" detail="BetClaw has not published a shadow artifact yet." /> : null}
  </DetailScreen>;
}

function ComponentCard({ icon: Icon, name, version, detail, healthy }: { icon: LucideIcon; name: string; version: string; detail: string; healthy: boolean }) {
  const { theme } = usePolyClawTheme();
  return <Card style={styles.componentCard} accessible accessibilityLabel={`${name}, ${healthy ? 'healthy' : 'not ready'}, ${version}`}>
    <View style={styles.componentTitle}><Icon size={19} color={healthy ? theme.success : theme.warning} /><Text style={[styles.componentName, { color: theme.text }]}>{name}</Text></View>
    <Text style={[styles.version, { color: theme.textSoft }]}>{version}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text>
  </Card>;
}

function ActivationCard({ activation, activationMode }: { activation: ModelMarketActivation; activationMode: MarketActivationMode }) {
  const { theme } = usePolyClawTheme();
  const status = activationMode === 'off'
    ? 'DISABLED'
    : activation.promotionsPaused
      ? 'PAUSED'
      : activationMode === 'shadow'
        ? 'RESEARCH ONLY'
        : activation.activeVersion && activation.rolloutPercent > 0
          ? 'ACTIVE'
          : activation.candidateVersion
            ? 'RESEARCH ONLY'
            : 'BLOCKED';
  const tone = status === 'ACTIVE' ? 'success' : status === 'BLOCKED' || status === 'PAUSED' ? 'danger' : 'warning';
  const performance = activation.performance;
  return <Card style={styles.activationCard} accessible accessibilityLabel={`${activation.marketType} ${status}, ${activation.rolloutPercent} percent rollout`}>
    <View style={styles.marketHead}><Text style={[styles.marketTitle, { color: theme.text }]}>{marketLabel(activation.marketType)}</Text><StatusPill label={status} tone={tone} /></View>
    <Text style={[styles.version, { color: theme.textSoft }]}>{activation.activeVersion ?? activation.candidateVersion ?? 'No verified artifact'}</Text>
    <MetricRow label="Paper rollout" left={`${activation.rolloutPercent}%`} right={`${performance?.settledForecasts ?? 0} settled`} accent={status === 'ACTIVE'} />
    <MetricRow label="Ensemble Brier" left={score(performance?.ensembleBrier)} right={`ROI ${performance?.policyRoi == null ? '—' : `${(performance.policyRoi * 100).toFixed(1)}%`}`} />
    {activation.pauseReason ? <Text style={[styles.detail, { color: theme.danger }]}>{activation.pauseReason}</Text> : null}
  </Card>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, statusTitle: { fontFamily: fonts.bold, fontSize: 20, marginBottom: 5 }, detail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  componentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, componentCard: { minWidth: 165, flexBasis: '47%', flexGrow: 1, gap: 7 }, componentTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 }, componentName: { fontFamily: fonts.semibold, fontSize: 14 }, version: { fontFamily: fonts.medium, fontSize: 11 }, activationCard: { minWidth: 240, flexBasis: '47%', flexGrow: 1, gap: 7 }, activationEmpty: { flexGrow: 1 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17 }, gateList: { marginTop: 12 }, gate: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 }, gateTitle: { fontFamily: fonts.semibold, fontSize: 13, textTransform: 'capitalize', marginBottom: 2 },
  marketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, marketCard: { minWidth: 240, flexBasis: '47%', flexGrow: 1 }, marketHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, marketTitle: { fontFamily: fonts.bold, fontSize: 15 }, sample: { fontFamily: fonts.medium, fontSize: 11 }, columnHead: { fontFamily: fonts.medium, fontSize: 10, textAlign: 'right', marginTop: 12 }, metricRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, metricLabel: { fontFamily: fonts.regular, fontSize: 12 }, metricValue: { fontFamily: fonts.semibold, fontSize: 12 },
  trendTable: { marginTop: 12 }, trendRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 }, trendVersion: { fontFamily: fonts.medium, fontSize: 12 }, trendScore: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, textAlign: 'right' },
});
