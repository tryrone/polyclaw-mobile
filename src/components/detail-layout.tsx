import { router } from 'expo-router';
import { ChevronLeft } from '@/components/modern-icons';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './motion';
import { Screen } from './ui-kit';
import { fonts, layout, usePolyClawTheme } from '@/theme';

export function DetailScreen({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const { theme } = usePolyClawTheme();
  return <Screen><View style={styles.head}><PressableScale accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12} containerStyle={styles.backWrap} style={[styles.back, { backgroundColor: theme.field }]}><ChevronLeft size={22} color={theme.text} /></PressableScale><View><Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text><Text style={[styles.title, { color: theme.text }]}>{title}</Text></View></View>{children}</Screen>;
}
const styles = StyleSheet.create({ head: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13 }, backWrap: { borderRadius: layout.controlRadius }, back: { width: 44, height: 44, borderRadius: layout.controlRadius, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }, title: { fontFamily: fonts.bold, fontSize: 25, letterSpacing: -0.8 } });
