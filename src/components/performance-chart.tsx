import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Performance } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';
import { useReducedMotion } from './motion';

type EquityPoint = Performance['series'][number] | { at: string; equityUsdc: number };

export function PerformanceChart({ series, selectedIndex, onSelect }: { series: EquityPoint[]; selectedIndex?: number | null; onSelect?: (index: number) => void }) {
  const { theme } = usePolyClawTheme();
  const reduce = useReducedMotion();
  const wipe = useSharedValue(0);
  useEffect(() => {
    if (!series || series.length < 2) return;
    if (reduce) { wipe.value = 0; return; }
    wipe.value = 0;
    wipe.value = withTiming(1, { duration: 900 });
  }, [reduce, series, wipe]);
  const wipeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: `${wipe.value * 102}%` }] }));
  if (!series || series.length < 2) return <View style={styles.empty}><Text style={[styles.text, { color: theme.textMuted }]}>The equity curve appears after two bankroll snapshots.</Text></View>;
  const values = series.map((point) => 'bankroll' in point ? point.bankroll : point.equityUsdc); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1);
  const points = values.map((value, index) => ({ x: (index / (values.length - 1)) * 320, y: 130 - ((value - min) / range) * 110 }));
  const line = points.map((point, index) => (index ? 'L ' : 'M ') + point.x + ' ' + point.y).join(' ');
  const fill = line + ' L 320 145 L 0 145 Z';
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Equity curve"
      accessibilityHint="Touch the chart to inspect the nearest snapshot"
      onPress={(event) => onSelect?.(Math.max(0, Math.min(series.length - 1, Math.round((event.nativeEvent.locationX / 320) * (series.length - 1)))))}
      style={styles.wrap}
    >
      <Svg width="100%" height="150" viewBox="0 0 320 150" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.accent} stopOpacity="0.30" />
            <Stop offset="1" stopColor={theme.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={fill} fill="url(#equity)" />
        <Path d={line} fill="none" stroke={theme.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {selectedIndex != null && points[selectedIndex] ? <View pointerEvents="none" style={[styles.marker, { left: `${(selectedIndex / (points.length - 1)) * 100}%`, backgroundColor: theme.accent }]} /> : null}
      {!reduce ? <Animated.View style={[styles.wipe, { backgroundColor: theme.panel }, wipeStyle]} pointerEvents="none" /> : null}
    </Pressable>
  );
}
const styles = StyleSheet.create({ wrap: { height: 150, marginHorizontal: -4, overflow: 'hidden', borderRadius: 12 }, empty: { height: 150, alignItems: 'center', justifyContent: 'center', padding: 24 }, text: { fontFamily: fonts.regular, fontSize: 12, textAlign: 'center' }, marker: { position: 'absolute', top: 12, bottom: 10, width: 2 }, wipe: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } });
