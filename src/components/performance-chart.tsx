import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import type { Performance } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';

export function PerformanceChart({ series }: { series: Performance['series'] }) {
  const { theme } = usePolyClawTheme();
  if (series.length < 2) return <View style={styles.empty}><Text style={[styles.text, { color: theme.textMuted }]}>The equity curve appears after two bankroll snapshots.</Text></View>;
  const values = series.map((point) => point.bankroll); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(max - min, 1);
  const points = values.map((value, index) => ({ x: (index / (values.length - 1)) * 320, y: 130 - ((value - min) / range) * 110 }));
  const line = points.map((point, index) => (index ? 'L ' : 'M ') + point.x + ' ' + point.y).join(' ');
  const fill = line + ' L 320 145 L 0 145 Z';
  return <View style={styles.wrap}><Svg width="100%" height="150" viewBox="0 0 320 150" preserveAspectRatio="none"><Defs><LinearGradient id="equity" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={theme.lime} stopOpacity="0.28" /><Stop offset="1" stopColor={theme.lime} stopOpacity="0" /></LinearGradient></Defs><Path d={fill} fill="url(#equity)" /><Path d={line} fill="none" stroke={theme.lime} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
}
const styles = StyleSheet.create({ wrap: { height: 150, marginHorizontal: -4 }, empty: { height: 150, alignItems: 'center', justifyContent: 'center', padding: 24 }, text: { fontFamily: fonts.regular, fontSize: 12, textAlign: 'center' } });
