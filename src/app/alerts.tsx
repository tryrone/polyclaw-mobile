import { StyleSheet, Text } from 'react-native';
import { useAuth } from '@/auth/provider';
import { DetailScreen } from '@/components/detail-layout';
import { ActionButton, Card, EmptyState, ResourceState, StatusPill, shortDate } from '@/components/ui-kit';
import { useOperatorResource } from '@/hooks/use-operator-resource';
import type { AlertItem, ItemsData } from '@/lib/types';
import { fonts, usePolyClawTheme } from '@/theme';

export default function AlertsScreen() {
  const { theme } = usePolyClawTheme();
  const { request } = useAuth();
  const resource = useOperatorResource<ItemsData<AlertItem>>('alerts', 20_000);
  const acknowledge = async (id: string) => {
    await request('alerts/' + id + '/acknowledge', { method: 'POST' });
    await resource.refresh();
  };
  const items = resource.data?.items ?? [];
  return <DetailScreen title="Alerts" eyebrow="OPERATIONAL EVENTS">
    <ResourceState loading={resource.loading} error={resource.error} stale={resource.stale} />
    {items.length ? items.map((alert) => <Card key={alert.id}>
      <StatusPill label={alert.severity} tone={alert.severity === 'CRITICAL' ? 'danger' : alert.severity === 'WARNING' ? 'warning' : 'neutral'} />
      <Text style={[styles.title, { color: theme.text }]}>{alert.title}</Text>
      <Text style={[styles.copy, { color: theme.textMuted }]}>{alert.description}</Text>
      <Text style={[styles.date, { color: theme.textMuted }]}>{shortDate(alert.createdAt)}</Text>
      {!alert.acknowledgedAt ? <ActionButton label="Acknowledge" variant="secondary" disabled={resource.stale || !!resource.error} onPress={() => acknowledge(alert.id)} /> : <StatusPill label="ACKNOWLEDGED" tone="success" />}
    </Card>) : !resource.loading ? <EmptyState title="No active alerts" detail="Operational warnings and critical events appear here." /> : null}
  </DetailScreen>;
}
const styles = StyleSheet.create({ title: { fontFamily: fonts.semibold, fontSize: 16, marginTop: 14 }, copy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginVertical: 7 }, date: { fontFamily: fonts.medium, fontSize: 10, marginBottom: 14 } });
