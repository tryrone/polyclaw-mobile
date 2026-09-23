import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { PressableScale, Skeleton, useReducedMotion } from '@/components/motion';
import { Card } from '@/components/ui-kit';
import { buildPnlChartGeometry, nearestPnlPointIndex } from '@/lib/pnl-chart';
import type { AutoTradePerformance, AutoTradePerformanceRange } from '@/lib/types';
import { fonts, numeric, radius, spacing, usePolyClawTheme } from '@/theme';

const ranges: { label: string; value: AutoTradePerformanceRange }[] = [
  { label: '7D', value: '1W' },
  { label: '30D', value: '1M' },
  { label: '90D', value: '3M' },
  { label: 'All', value: 'ALL' },
];

function signedMoney(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

function signedPercent(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${prefix}${Math.abs(value * 100).toFixed(1)}%`;
}

function pointDate(value: string) {
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function PnlChartSkeleton() {
  return (
    <View accessibilityLabel="Loading trade performance" accessibilityRole="progressbar" style={styles.skeletonCard}>
      <View style={styles.headingRow}><Skeleton radius={radius.sm} style={styles.skeletonTitle} /><Skeleton radius={radius.pill} style={styles.skeletonMode} /></View>
      <View style={styles.metrics}><Skeleton radius={radius.sm} style={styles.skeletonMetric} /><Skeleton radius={radius.sm} style={styles.skeletonMetric} /><Skeleton radius={radius.sm} style={styles.skeletonMetric} /></View>
      <Skeleton radius={radius.sm} style={styles.skeletonChart} />
    </View>
  );
}

type Props = {
  data: AutoTradePerformance | null;
  error?: string | null;
  loading?: boolean;
  title?: string;
  range?: AutoTradePerformanceRange;
  onRangeChange?: (range: AutoTradePerformanceRange) => void;
  mode?: 'LIVE' | 'PAPER';
  onModeChange?: (mode: 'LIVE' | 'PAPER') => void;
  showQuality?: boolean;
  compact?: boolean;
};

export function PnlChartCard({
  data,
  error,
  loading,
  title = 'Trade PnL',
  range,
  onRangeChange,
  mode,
  onModeChange,
  showQuality = false,
  compact = false,
}: Props) {
  const { theme } = usePolyClawTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [selection, setSelection] = useState<{ dataKey: string; index: number } | null>(null);
  const chartHeight = compact ? 66 : 86;
  const geometry = useMemo(() => buildPnlChartGeometry(data?.points ?? [], width, chartHeight), [chartHeight, data?.points, width]);
  const selectedIndex = selection && selection.dataKey === data?.asOf ? selection.index : null;
  const selectedPoint = selectedIndex == null ? null : data?.points[selectedIndex] ?? null;
  const selectedCoordinate = selectedIndex == null ? null : geometry.coordinates[selectedIndex] ?? null;

  const selectAt = useCallback((x: number) => {
    const index = nearestPnlPointIndex(geometry.coordinates, x);
    if (index < 0) return;
    const dataKey = data?.asOf ?? '';
    setSelection((previous) => {
      if (previous?.dataKey !== dataKey || previous.index !== index) void Haptics.selectionAsync().catch(() => undefined);
      return { dataKey, index };
    });
  }, [data?.asOf, geometry.coordinates]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => geometry.coordinates.length > 0 && Math.abs(gesture.dx) > 3 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: (event) => selectAt(event.nativeEvent.locationX),
    onPanResponderMove: (event) => selectAt(event.nativeEvent.locationX),
  }), [geometry.coordinates.length, selectAt]);

  if (!data && loading) return <PnlChartSkeleton />;
  if (!data && error) {
    return (
      <Card style={compact ? styles.compactError : styles.errorCard}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text accessibilityLiveRegion="polite" style={[styles.errorTitle, { color: theme.danger }]}>Performance unavailable</Text>
        <Text style={[styles.caption, { color: theme.textMuted }]}>{error}. Pull to refresh and try again.</Text>
      </Card>
    );
  }

  const net = data?.summary.netPnlUsdc ?? 0;
  const lineColor = net > 0 ? theme.success : net < 0 ? theme.danger : theme.textMuted;
  const fillColor = net > 0 ? theme.successSoft : net < 0 ? theme.dangerSoft : theme.greySoft;
  const rangeLabel = data?.range === 'ALL' ? 'since tracking began' : data?.range === '1W' ? '7 days' : data?.range === '3M' ? '90 days' : '30 days';
  const accessibilitySummary = data
    ? `${rangeLabel} net PnL, ${net >= 0 ? 'positive' : 'negative'} ${Math.abs(net).toFixed(2)} dollars across ${data.summary.settledTrades} settled trades. ROI ${signedPercent(data.summary.roiFraction)}.`
    : 'Trade performance unavailable.';

  const chart = (
    <View
      accessibilityLabel={accessibilitySummary}
      accessible
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onTouchEnd={(event) => selectAt(event.nativeEvent.locationX)}
      style={[styles.chart, { height: chartHeight }]}
      {...responder.panHandlers}
    >
      {width > 0 && data?.points.length ? (
        <Svg height={chartHeight} width={width}>
          <Line stroke={theme.border} strokeDasharray="3 5" strokeWidth={1} x1={0} x2={width} y1={geometry.zeroY} y2={geometry.zeroY} />
          {geometry.areaPath ? <Path d={geometry.areaPath} fill={fillColor} /> : null}
          {geometry.linePath ? <Path d={geometry.linePath} fill="none" stroke={lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} /> : null}
          {geometry.coordinates.length === 1 ? <Circle cx={geometry.coordinates[0]!.x} cy={geometry.coordinates[0]!.y} fill={lineColor} r={4} /> : null}
          {selectedCoordinate ? (
            <>
              <Line stroke={theme.borderStrong} strokeWidth={1} x1={selectedCoordinate.x} x2={selectedCoordinate.x} y1={0} y2={chartHeight} />
              <Circle cx={selectedCoordinate.x} cy={selectedCoordinate.y} fill={theme.panel} r={5} stroke={lineColor} strokeWidth={2.5} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );

  return (
    <Card style={compact ? styles.compactCard : styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.caption, { color: theme.textMuted }]}>{data?.mode === 'PAPER' ? 'Paper results' : 'Funded trades'} · {rangeLabel}</Text>
        </View>
        <View style={[styles.modeBadge, { backgroundColor: data?.mode === 'PAPER' ? theme.warningSoft : theme.successSoft }]}>
          <Text style={[styles.modeText, { color: data?.mode === 'PAPER' ? theme.warning : theme.success }]}>{data?.mode ?? mode ?? 'LIVE'}</Text>
        </View>
      </View>

      {onModeChange ? (
        <View style={styles.switchRow}>
          {(['LIVE', 'PAPER'] as const).map((item) => <Choice active={(mode ?? data?.mode) === item} key={item} label={item === 'LIVE' ? 'Live' : 'Paper'} onPress={() => onModeChange(item)} />)}
        </View>
      ) : null}
      {onRangeChange ? (
        <View style={styles.switchRow}>
          {ranges.map((item) => <Choice active={(range ?? data?.range) === item.value} key={item.value} label={item.label} onPress={() => onRangeChange(item.value)} />)}
        </View>
      ) : null}

      <View style={styles.metrics}>
        <Metric label="NET PNL" tone={lineColor} value={signedMoney(net)} />
        <Metric label="ROI" value={signedPercent(data?.summary.roiFraction ?? 0)} />
        <Metric label="SETTLED" value={String(data?.summary.settledTrades ?? 0)} />
      </View>

      {data?.points.length ? (
        <>
          <View key={data.asOf}>{reduceMotion ? chart : <Animated.View entering={FadeIn.duration(200)}>{chart}</Animated.View>}</View>
          <View style={styles.axisRow}>
            <Text style={[styles.axis, { color: theme.textMuted }]}>{pointDate(data.points[0]!.at)}</Text>
            {selectedPoint ? <Text style={[styles.selection, { color: lineColor }]}>{pointDate(selectedPoint.at)} · {signedMoney(selectedPoint.cumulativePnlUsdc)}</Text> : null}
            <Text style={[styles.axis, { color: theme.textMuted }]}>{pointDate(data.points.at(-1)!.at)}</Text>
          </View>
        </>
      ) : (
        <View style={[styles.empty, { backgroundColor: theme.field }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No settled trades yet</Text>
          <Text style={[styles.caption, { color: theme.textMuted }]}>Your PnL chart will appear after the first trade settles.</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.updated, { color: theme.textMuted }]}>{data ? `Updated ${new Date(data.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Performance unavailable'}</Text>
        {loading && data ? <Text style={[styles.updated, { color: theme.textMuted }]}>Refreshing…</Text> : null}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: data ? theme.warning : theme.danger }]}>{data ? 'Update delayed — showing the last confirmed result.' : error}</Text> : null}
      {showQuality && data?.dataQuality.excludedRecords ? <Text style={[styles.notice, { color: theme.warning }]}>{data.dataQuality.excludedRecords} incomplete record{data.dataQuality.excludedRecords === 1 ? '' : 's'} excluded</Text> : null}
    </Card>
  );
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return (
    <PressableScale accessibilityRole="tab" accessibilityState={{ selected: active }} containerStyle={styles.choiceFlex} haptic="select" onPress={onPress}>
      <View style={[styles.choice, { backgroundColor: active ? theme.text : theme.field, borderColor: active ? theme.text : theme.border }]}>
        <Text style={[styles.choiceText, { color: active ? theme.background : theme.textMuted }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { theme } = usePolyClawTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: tone ?? theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { fontFamily: fonts.medium, fontSize: 10 },
  axisRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 11.5, marginTop: 2 },
  card: { gap: spacing.md, minHeight: 250 },
  chart: { overflow: 'hidden', width: '100%' },
  choice: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 34, paddingHorizontal: spacing.sm },
  choiceFlex: { flex: 1 },
  choiceText: { fontFamily: fonts.bold, fontSize: 10.5 },
  compactCard: { gap: spacing.sm, marginBottom: spacing.md, minHeight: 210 },
  compactError: { gap: spacing.sm, marginBottom: spacing.md, minHeight: 120 },
  empty: { alignItems: 'center', borderRadius: radius.sm, gap: 3, justifyContent: 'center', minHeight: 86, padding: spacing.md },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 13 },
  errorCard: { gap: spacing.sm, minHeight: 132 },
  errorTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  flex: { flex: 1, minWidth: 0 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  headingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  metric: { flex: 1, minWidth: 0 },
  metricLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  metricValue: { fontFamily: fonts.bold, fontSize: 17, marginTop: 3, ...numeric },
  metrics: { flexDirection: 'row', gap: spacing.md },
  modeBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  modeText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  notice: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 17 },
  selection: { fontFamily: fonts.bold, fontSize: 10.5, ...numeric },
  skeletonCard: { borderRadius: radius.md, gap: spacing.md, minHeight: 250, padding: spacing.lg },
  skeletonChart: { height: 86, width: '100%' },
  skeletonMetric: { height: 36, width: '30%' },
  skeletonMode: { height: 24, width: 48 },
  skeletonTitle: { height: 16, width: '34%' },
  switchRow: { flexDirection: 'row', gap: spacing.xs },
  title: { fontFamily: fonts.semibold, fontSize: 16 },
  updated: { fontFamily: fonts.medium, fontSize: 10.5 },
});
