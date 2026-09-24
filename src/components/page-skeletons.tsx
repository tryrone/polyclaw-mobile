import { StyleSheet, View, type DimensionValue } from 'react-native';

import { Skeleton } from '@/components/motion';
import { radius, spacing, usePolyClawTheme } from '@/theme';

function Line({ width = '100%', height = 12 }: { width?: DimensionValue; height?: number }) {
  return <Skeleton radius={radius.sm} style={{ height, width }} />;
}

function CardFrame({ children, minHeight }: { children: React.ReactNode; minHeight?: number }) {
  const { theme } = usePolyClawTheme();
  return <View style={[styles.card, { borderColor: theme.border, minHeight }]}>{children}</View>;
}

function FilterRow({ count }: { count: number }) {
  return (
    <View style={styles.filters}>
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} radius={radius.pill} style={styles.filter} />)}
    </View>
  );
}

function SectionStub({ width = '28%' }: { width?: DimensionValue }) {
  return <View style={styles.sectionStub}><Line height={16} width={width} /><Line height={10} width="16%" /></View>;
}

function ListRow({ icon = false, status = true, tall = false }: { icon?: boolean; status?: boolean; tall?: boolean }) {
  return (
    <View style={[styles.row, tall && styles.tallRow]}>
      {icon ? <Skeleton radius={radius.pill} style={styles.rowIcon} /> : null}
      <View style={styles.rowCopy}>
        <Line height={13} width="72%" />
        <Line height={10} width="48%" />
        {tall ? <Line height={9} width="58%" /> : null}
      </View>
      {status ? <View style={styles.rowEnd}><Line height={13} width={52} /><Skeleton radius={radius.pill} style={styles.pill} /></View> : null}
    </View>
  );
}

function AccountGroup({ rows }: { rows: number }) {
  const { theme } = usePolyClawTheme();
  return (
    <View style={styles.groupSection}>
      <Line height={10} width="22%" />
      <View style={[styles.group, { borderColor: theme.border }]}>
        {Array.from({ length: rows }, (_, index) => <ListRow icon key={index} status={false} />)}
      </View>
    </View>
  );
}

function LoadingSurface({ label, children }: { label: string; children: React.ReactNode }) {
  return <View accessibilityLabel={label} accessibilityRole="progressbar" style={styles.stack}>{children}</View>;
}

export function ConsumerHomeSkeleton() {
  return (
    <LoadingSurface label="Loading auto-trade overview">
      <Skeleton radius={radius.md} style={styles.homeHero} />
      <Skeleton radius={radius.sm} style={styles.action} />
      <Skeleton radius={radius.md} style={styles.performanceCard} />
      <SectionStub width="18%" />
      <ListRow status />
      <ListRow status />
    </LoadingSurface>
  );
}

export function ConsumerTradesSkeleton() {
  return (
    <LoadingSurface label="Loading trades">
      <Skeleton radius={radius.md} style={styles.performanceCard} />
      <FilterRow count={3} />
      <ListRow icon />
      <ListRow icon />
      <ListRow icon />
      <ListRow icon />
    </LoadingSurface>
  );
}

export function ConsumerAccountSkeleton() {
  return (
    <LoadingSurface label="Loading account">
      <CardFrame minHeight={106}>
        <View style={styles.profileRow}>
          <Skeleton radius={radius.pill} style={styles.avatar} />
          <View style={styles.rowCopy}><Line height={16} width="52%" /><Line height={11} width="72%" /></View>
        </View>
        <Line height={10} width="44%" />
      </CardFrame>
      <AccountGroup rows={4} />
      <AccountGroup rows={3} />
      <Skeleton radius={radius.sm} style={styles.action} />
    </LoadingSurface>
  );
}

export function AdminGamesListSkeleton() {
  return (
    <LoadingSurface label="Loading games">
      <Line height={10} width="32%" />
      <ListRow status={false} />
      <ListRow status={false} />
      <ListRow status={false} />
    </LoadingSurface>
  );
}

export function AdminTradesSkeleton() {
  return (
    <LoadingSurface label="Loading published trades">
      <Skeleton radius={radius.md} style={styles.performanceCard} />
      <SectionStub width="36%" />
      <ListRow status={false} />
      <FilterRow count={5} />
      <ListRow />
      <ListRow />
      <ListRow />
      <Skeleton radius={radius.sm} style={styles.action} />
    </LoadingSurface>
  );
}

export function AdminUsersSkeleton() {
  return (
    <LoadingSurface label="Loading users">
      <Skeleton radius={radius.sm} style={styles.search} />
      <ListRow tall />
      <ListRow tall />
      <ListRow tall />
      <SectionStub width="24%" />
      <CardFrame minHeight={240}>
        <Line height={12} width="84%" />
        <ListRow status />
        <Skeleton radius={radius.sm} style={styles.input} />
        <Skeleton radius={radius.sm} style={styles.action} />
      </CardFrame>
    </LoadingSurface>
  );
}

export function AdminSettingsSkeleton() {
  return (
    <LoadingSurface label="Loading admin settings">
      <CardFrame minHeight={118}><Line height={16} width="28%" /><FilterRow count={3} /></CardFrame>
      <CardFrame minHeight={178}><Line height={16} width="38%" /><Line width="72%" /><View style={styles.twoColumns}><Skeleton radius={radius.sm} style={styles.input} /><Skeleton radius={radius.sm} style={styles.input} /></View><Skeleton radius={radius.sm} style={styles.action} /></CardFrame>
      <CardFrame minHeight={132}><Line height={16} width="28%" /><Line width="82%" /><Skeleton radius={radius.sm} style={styles.action} /></CardFrame>
      <CardFrame minHeight={190}><Line height={16} width="30%" /><ListRow status={false} /><ListRow status={false} /></CardFrame>
      <CardFrame minHeight={132}><Line height={16} width="18%" /><ListRow status={false} /></CardFrame>
    </LoadingSurface>
  );
}

const styles = StyleSheet.create({
  action: { height: 50, width: '100%' },
  avatar: { height: 56, width: 56 },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: spacing.md, padding: spacing.lg },
  filter: { flex: 1, height: 44, minWidth: 62 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  groupSection: { gap: spacing.sm },
  homeHero: { height: 176, width: '100%' },
  input: { flex: 1, height: 44, width: '100%' },
  pill: { height: 25, width: 68 },
  performanceCard: { height: 250, width: '100%' },
  profileRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  rowCopy: { flex: 1, gap: 8, minWidth: 0 },
  rowEnd: { alignItems: 'flex-end', gap: 7, width: 72 },
  rowIcon: { height: 40, width: 40 },
  search: { height: 48, width: '100%' },
  sectionStub: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 24 },
  stack: { gap: spacing.lg },
  tallRow: { minHeight: 72 },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
});
