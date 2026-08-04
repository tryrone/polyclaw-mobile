import { StyleSheet, Text } from 'react-native';
import { DetailScreen } from '@/components/detail-layout';
import { Card, EmptyState, ResourceState, StatusPill, shortDate } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { AuditItem, ItemsData } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';

export default function AuditScreen() {
  const { theme } = usePolyClawTheme();
  const resource = useOperatorResource<ItemsData<AuditItem>>('audit', 30_000);
  const items = resource.data?.items ?? [];
  return <DetailScreen title="Audit log" eyebrow="APPEND-ONLY ACTIONS">
    <ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {items.length ? items.map((item) => <Card key={item.id}>
      <StatusPill label={item.action} tone="neutral" />
      <Text style={[styles.target, { color: theme.text }]}>{item.targetType ?? 'SYSTEM'}{item.targetId ? ' · ' + item.targetId : ''}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>{shortDate(item.createdAt)} · actor {item.actorId}</Text>
    </Card>) : !resource.loading ? <EmptyState title="No operator actions" detail="Pause, resume, cancel, acknowledgement, and manual-bet decisions are recorded here." /> : null}
  </DetailScreen>;
}
const styles = StyleSheet.create({ target: { fontFamily: fonts.semibold, fontSize: 14, marginTop: 13 }, meta: { fontFamily: fonts.regular, fontSize: 11, marginTop: 6 } });
