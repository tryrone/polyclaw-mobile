import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import type { LucideIcon } from '@/components/modern-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions, type PressableProps, type RefreshControlProps, type ViewProps } from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, layout, radius, spacing, usePolyClawTheme, type Theme } from '@/theme';
import { haptics, PulsingDot, PressableScale, Skeleton, Staggered, Ticker } from './motion';

const glassAvailable = isGlassEffectAPIAvailable();

export function Screen({ children, refreshControl }: { children: React.ReactNode; refreshControl?: ReactElement<RefreshControlProps> }) {
  const { theme } = usePolyClawTheme();
  const { width } = useWindowDimensions();
  const gutter = width >= layout.largeScreenBreakpoint ? layout.largeScreenGutter : layout.phoneGutter;
  return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={[styles.screen, { paddingHorizontal: gutter }]} refreshControl={refreshControl}>{children}</ScrollView></SafeAreaView>;
}

export function Header({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.header}><View style={{ flex: 1 }}>{eyebrow ? <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text> : null}<Text style={[styles.title, { color: theme.text }]}>{title}</Text></View>{action}</View>;
}

type CardVariant = 'default' | 'raised' | 'glass';

export function Card({ children, style, variant = 'default' }: ViewProps & { variant?: CardVariant }) {
  const { theme } = usePolyClawTheme();
  if (variant === 'glass' && glassAvailable && theme.mode === 'dark') {
    return <GlassView style={[styles.card, styles.glass, style]} glassEffectStyle="regular">{children}</GlassView>;
  }
  const raised = variant === 'raised';
  const surface = raised ? [styles.raised, shadowStyle(theme)] : null;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: raised ? theme.panelRaised : theme.panel, borderColor: theme.border },
        ...(surface ? [surface] : []),
        style,
      ]}
    >
      {children}
    </View>
  );
}

function shadowStyle(theme: Theme): object {
  return { shadowColor: theme.shadow.color, shadowOpacity: theme.shadow.opacity, shadowRadius: theme.shadow.radius, shadowOffset: { width: 0, height: 8 }, elevation: theme.shadow.elevation };
}

export function StatusPill({ label, tone = 'neutral', live = false }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'neutral'; live?: boolean }) {
  const { theme } = usePolyClawTheme();
  const palette = tone === 'success' ? [theme.successSoft, theme.success] : tone === 'warning' ? [theme.warningSoft, theme.warning] : tone === 'danger' ? [theme.dangerSoft, theme.danger] : [theme.greySoft, theme.textMuted];
  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }]}>
      {live ? <PulsingDot color={palette[1]} /> : <View style={[styles.dot, { backgroundColor: palette[1] }]} />}
      <Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}

export function Metric({ label, value, numeric, format, detail, accent }: { label: string; value: string; numeric?: number; format?: (input: number) => string; detail?: string; accent?: boolean }) {
  const { theme } = usePolyClawTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
      {numeric !== undefined && format ? (
        <Ticker value={numeric} format={format} style={[styles.metricValue, { color: accent ? theme.success : theme.text }]} />
      ) : (
        <Text style={[styles.metricValue, { color: accent ? theme.success : theme.text }]}>{value}</Text>
      )}
      {detail ? <Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text> : null}
    </View>
  );
}

type ActionVariant = 'primary' | 'secondary' | 'danger';

export function ActionButton({ label, icon: Icon, variant = 'primary', loading = false, haptic = 'tap', ...props }: PressableProps & { label: string; icon?: LucideIcon; variant?: ActionVariant; loading?: boolean; haptic?: keyof typeof haptics | null }) {
  const { theme } = usePolyClawTheme();
  const backgroundColor = variant === 'primary' ? theme.accentStrong : variant === 'danger' ? theme.dangerSoft : theme.field;
  const color = variant === 'primary' ? theme.accentInk : variant === 'danger' ? theme.danger : theme.text;
  const inactive = props.disabled || loading;
  return (
    <PressableScale {...props} disabled={inactive} haptic={haptic} containerStyle={{ alignSelf: 'stretch' }} style={({ pressed }) => [styles.button, { backgroundColor, borderColor: variant === 'secondary' ? theme.border : backgroundColor }, inactive && styles.disabled]}>
      {loading ? <ActivityIndicator color={color} size="small" /> : Icon ? <Icon size={17} color={color} /> : null}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </PressableScale>
  );
}

export function EmptyState({ title, detail, icon: Icon }: { title: string; detail: string; icon?: LucideIcon }) {
  const { theme } = usePolyClawTheme();
  return (
    <Card style={styles.empty}>
      {Icon ? <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}><Icon size={22} color={theme.accent} /></View> : null}
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text>
    </Card>
  );
}

export function ResourceState({ loading, error, stale }: { loading?: boolean; error?: string | null; stale?: boolean }) {
  const { theme } = usePolyClawTheme();
  if (loading) {
    return (
      <View style={styles.skeletonStack}>
        <Skeleton style={{ height: 132 }} radius={radius.md} />
        <Skeleton style={{ height: 104 }} radius={radius.md} />
        <Skeleton style={{ height: 72 }} radius={radius.md} />
      </View>
    );
  }
  if (error) return <Card><StatusPill label="OFFLINE" tone="danger" /><Text style={[styles.detail, { color: theme.textMuted, marginTop: 10 }]}>{error}. Commands are disabled until connectivity returns.</Text></Card>;
  if (stale) return <View style={[styles.stale, { backgroundColor: theme.warningSoft }]}><Text style={[styles.detail, { color: theme.warning }]}>Data is stale — showing the last confirmed snapshot.</Text></View>;
  return null;
}

export function SectionHeading({ title, meta }: { title: string; meta?: string }) {
  const { theme } = usePolyClawTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {meta ? <Text style={[styles.sectionMeta, { color: theme.textMuted }]}>{meta}</Text> : null}
    </View>
  );
}

export { Staggered };
export { money, percent, shortDate } from '@/lib/format';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { paddingVertical: spacing.lg, paddingBottom: 130, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.8, marginBottom: 5 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 30, letterSpacing: -1.2 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  raised: { borderWidth: StyleSheet.hairlineWidth },
  glass: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(167,139,250,0.28)' },
  pill: { paddingHorizontal: 10, height: 28, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  metric: { minWidth: '45%', flex: 1, gap: 5 },
  metricLabel: { fontFamily: fonts.medium, fontSize: 12 },
  metricValue: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.8 },
  detail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 50, borderRadius: layout.controlRadius, paddingHorizontal: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontFamily: fonts.bold, fontSize: 14 },
  disabled: { opacity: 0.45 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  skeletonStack: { gap: spacing.lg },
  stale: { borderRadius: radius.sm, padding: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17 },
  sectionMeta: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1 },
});
