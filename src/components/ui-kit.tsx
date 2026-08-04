import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type RefreshControlProps, type ViewProps } from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

export function Screen({ children, refreshControl }: { children: React.ReactNode; refreshControl?: ReactElement<RefreshControlProps> }) {
  const { theme } = usePolyClawTheme();
  return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.screen} refreshControl={refreshControl}>{children}</ScrollView></SafeAreaView>;
}

export function Header({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.header}><View style={{ flex: 1 }}>{eyebrow ? <Text style={[styles.eyebrow, { color: theme.lime }]}>{eyebrow}</Text> : null}<Text style={[styles.title, { color: theme.text }]}>{title}</Text></View>{action}</View>;
}

export function Card({ children, style }: ViewProps) {
  const { theme } = usePolyClawTheme();
  return <View style={[styles.card, { backgroundColor: theme.panel, borderColor: theme.border }, style]}>{children}</View>;
}

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' }) {
  const { theme } = usePolyClawTheme();
  const palette = tone === 'success' ? [theme.limeSoft, theme.lime] : tone === 'warning' ? [theme.amberSoft, theme.amber] : tone === 'danger' ? [theme.redSoft, theme.red] : [theme.greySoft, theme.textMuted];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><View style={[styles.dot, { backgroundColor: palette[1] }]} /><Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text></View>;
}

export function Metric({ label, value, detail, accent }: { label: string; value: string; detail?: string; accent?: boolean }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.metric}><Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.metricValue, { color: accent ? theme.lime : theme.text }]}>{value}</Text>{detail ? <Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text> : null}</View>;
}

export function ActionButton({ label, icon: Icon, variant = 'primary', ...props }: PressableProps & { label: string; icon?: LucideIcon; variant?: 'primary' | 'secondary' | 'danger' }) {
  const { theme } = usePolyClawTheme();
  const backgroundColor = variant === 'primary' ? theme.lime : variant === 'danger' ? theme.redSoft : theme.field;
  const color = variant === 'primary' ? theme.limeInk : variant === 'danger' ? theme.red : theme.text;
  return <Pressable {...props} style={({ pressed }) => [styles.button, { backgroundColor, borderColor: variant === 'secondary' ? theme.border : backgroundColor, opacity: pressed ? 0.72 : props.disabled ? 0.45 : 1 }]}>{Icon ? <Icon size={17} color={color} /> : null}<Text style={[styles.buttonText, { color }]}>{label}</Text></Pressable>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  const { theme } = usePolyClawTheme();
  return <Card style={styles.empty}><Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text></Card>;
}

export function ResourceState({ loading, error, stale }: { loading?: boolean; error?: string | null; stale?: boolean }) {
  const { theme } = usePolyClawTheme();
  if (loading) return <View style={styles.state}><ActivityIndicator color={theme.lime} /><Text style={[styles.detail, { color: theme.textMuted }]}>Syncing operator data…</Text></View>;
  if (error) return <Card><StatusPill label="OFFLINE" tone="danger" /><Text style={[styles.detail, { color: theme.textMuted, marginTop: 10 }]}>{error}. Commands are disabled until connectivity returns.</Text></Card>;
  if (stale) return <View style={[styles.stale, { backgroundColor: theme.amberSoft }]}><Text style={[styles.detail, { color: theme.amber }]}>Data is stale — showing the last confirmed snapshot.</Text></View>;
  return null;
}

export function money(value: number | null | undefined) { return `$${(value ?? 0).toFixed(2)}`; }
export function percent(value: number | null | undefined) { return `${((value ?? 0) * 100).toFixed(1)}%`; }
export function shortDate(value: string | null | undefined) { return value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

const styles = StyleSheet.create({
  safe: { flex: 1 }, screen: { padding: spacing.lg, paddingBottom: 110, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 }, eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.8, marginBottom: 5 }, title: { fontFamily: fonts.bold, fontSize: 30, letterSpacing: -1.2 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg }, pill: { paddingHorizontal: 10, height: 28, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }, dot: { width: 6, height: 6, borderRadius: 3 }, pillText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  metric: { minWidth: '45%', flex: 1, gap: 5 }, metricLabel: { fontFamily: fonts.medium, fontSize: 12 }, metricValue: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.8 }, detail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 48, borderRadius: radius.sm, paddingHorizontal: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonText: { fontFamily: fonts.bold, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 6 }, emptyTitle: { fontFamily: fonts.semibold, fontSize: 16 }, state: { paddingVertical: 28, alignItems: 'center', gap: 10 }, stale: { borderRadius: radius.sm, padding: 12 },
});
