import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from './ui-kit';
import { fonts, usePolyClawTheme } from '@/theme';

export function DetailScreen({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const { theme } = usePolyClawTheme();
  return <Screen><View style={styles.head}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12} style={[styles.back, { backgroundColor: theme.field }]}><ChevronLeft size={22} color={theme.text} /></Pressable><View><Text style={[styles.eyebrow, { color: theme.lime }]}>{eyebrow}</Text><Text style={[styles.title, { color: theme.text }]}>{title}</Text></View></View>{children}</Screen>;
}
const styles = StyleSheet.create({ head: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13 }, back: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, eyebrow: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }, title: { fontFamily: fonts.bold, fontSize: 25, letterSpacing: -0.8 } });
