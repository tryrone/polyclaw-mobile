import { useMemo, useState } from 'react';
import { ArrowClockwise, CaretRight, MagnifyingGlass, Users } from 'phosphor-react-native';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { DetailScreen } from '@/components/detail-layout';
import { PressableScale } from '@/components/motion';
import { ActionButton, Card, ResourceState, StatusPill } from '@/components/ui-kit';
import { pilotAccessPrimaryAction, type PilotAccessGrantAction } from '@/features/pilot-access-policy';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { fonts, layout, spacing, usePolyClawTheme } from '@/theme';

type MembershipState = { active: boolean; source: 'ENV' | 'DATABASE' | null; version: number | 'bootstrap' | null };
type PilotUser = {
  id: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
  pilotUser: MembershipState;
  pilotAdmin: MembershipState;
  grantActive: boolean;
  polyClawPilotGrant?: { status: string; expiresAt: string } | null;
  readiness: { paperDays: number; settledBotPositions: number; paperQualified: boolean; walletFunded: boolean; approvalStatus: string; signerStatus: string };
};
type MembershipItem = {
  id: string;
  userId: string;
  kind: 'PILOT_USER' | 'PILOT_ADMIN';
  status: 'ACTIVE' | 'REVOKED';
  source: 'ENV' | 'DATABASE';
  protected: boolean;
  version: number | 'bootstrap';
  user: { id: string; email: string; name?: string | null; role: 'USER' | 'ADMIN'; isActive: boolean; polyClawPilotGrant?: { status: string; expiresAt: string } | null };
};
type MembershipResponse = { bootstrapAdmin: boolean; items: MembershipItem[] };
type PilotAccessRequest = { id: string; userId: string; reason: string; createdAt: string; user: { id: string; email: string; name?: string | null } };
type MembershipAudit = { id: string; userId: string; kind: string; action: string; reason: string; membershipVersion: number; createdAt: string; actor: { email: string; name?: string | null } };
type PilotAdminAction = PilotAccessGrantAction | 'revoke' | 'add-admin' | 'revoke-admin';

export default function PilotAccessScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const memberships = useConsumerResource<MembershipResponse>('pilotMemberships', undefined, 30_000);
  const requests = useConsumerResource<PilotAccessRequest[]>('pilotAccessRequestQueue', undefined, 30_000);
  const audits = useConsumerResource<MembershipAudit[]>('pilotMembershipAudit', undefined, 30_000);
  const [tab, setTab] = useState<'USERS' | 'ADMINS'>('USERS');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PilotUser[]>([]);
  const [selected, setSelected] = useState<PilotUser | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => { await Promise.all([memberships.refresh(), requests.refresh(), audits.refresh()]); };
  const search = async (searchQuery = query) => {
    const normalized = searchQuery.trim();
    if (!normalized) return;
    setBusy('search'); setMessage(null);
    try {
      const users = await consumer<PilotUser[]>('searchPilotUsers', { query: normalized });
      setResults(users);
      if (users.length === 1) setSelected(users[0]);
      if (!users.length) setMessage('No active BetsClaw user matched that name, email, or UUID.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'User search failed.'); }
    finally { setBusy(null); }
  };
  const selectById = async (userId: string) => { setQuery(userId); await search(userId); };
  const act = async (action: PilotAdminAction, user: PilotUser | { id: string; email: string; name?: string | null }) => {
    const operatorReason = reason.trim();
    if (!operatorReason) { setMessage('Enter an operator reason before continuing.'); return; }
    const label = action === 'grant' ? 'grant 30-day pilot access' : action === 'renew' ? 'renew pilot access for 30 days' : action === 'revoke' ? 'revoke pilot access and wind down trading' : action === 'add-admin' ? 'appoint this pilot administrator' : 'revoke this pilot administrator';
    Alert.alert('Confirm protected action', `Are you sure you want to ${label} for ${user.name || user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: action.includes('revoke') ? 'destructive' : 'default', onPress: () => void runAction(action, user.id, operatorReason) },
    ]);
  };
  const runAction = async (action: PilotAdminAction, userId: string, operatorReason: string) => {
    setBusy(action); setMessage(null);
    try {
      if (action === 'grant' || action === 'renew') await consumer('grantPilotAccess', { userId, reason: operatorReason, confirmed: true, idempotencyKey: randomUUID() });
      if (action === 'revoke') await consumer('revokePilotAccess', { userId, reason: operatorReason, confirmed: true, idempotencyKey: randomUUID() });
      if (action === 'add-admin') await consumer('addPilotMembership', { userId, kind: 'PILOT_ADMIN', reason: operatorReason, confirmed: true, idempotencyKey: randomUUID() });
      if (action === 'revoke-admin') await consumer('revokePilotMembership', { userId, kind: 'PILOT_ADMIN', reason: operatorReason, confirmed: true, idempotencyKey: randomUUID() });
      setMessage(action === 'grant' || action === 'renew' ? pilotAccessPrimaryAction(action === 'renew').successMessage : action === 'revoke' ? 'Pilot access revoked. New entries are blocked and wind-down has started.' : action === 'add-admin' ? 'Pilot administrator appointed.' : 'Pilot administrator access revoked.');
      setReason('');
      await refresh();
      if (selected?.id === userId) await selectById(userId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The protected action failed.'); }
    finally { setBusy(null); }
  };

  const userMemberships = memberships.data?.items.filter((item) => item.kind === 'PILOT_USER' && item.status === 'ACTIVE') ?? [];
  const adminMemberships = memberships.data?.items.filter((item) => item.kind === 'PILOT_ADMIN' && item.status === 'ACTIVE') ?? [];
  const selectedAudits = useMemo(() => audits.data?.filter((audit) => audit.userId === selected?.id).slice(0, 8) ?? [], [audits.data, selected?.id]);
  const refreshing = memberships.loading || requests.loading || audits.loading;

  return <DetailScreen title="Pilot access" eyebrow="ADMINISTRATION">
    <ResourceState loading={memberships.loading} error={memberships.error} />
    <View style={styles.toolbar}>
      <Text style={[styles.copy, { color: theme.textMuted, flex: 1 }]}>Manage pilot members and access requests.</Text>
      <PressableScale accessibilityRole="button" accessibilityLabel="Refresh access data" accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing} onPress={() => void refresh()} style={[styles.refresh, { backgroundColor: theme.field }]}><ArrowClockwise size={20} color={theme.accent} /></PressableScale>
    </View>
    {message ? <Card><Text accessibilityRole="alert" style={[styles.copy, { color: theme.warning }]}>{message}</Text></Card> : null}
    <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: theme.field }]}>
      {(['USERS', 'ADMINS'] as const).map((value) => {
        const disabled = value === 'ADMINS' && !memberships.data?.bootstrapAdmin;
        return <PressableScale key={value} containerStyle={styles.flex} accessibilityRole="tab" accessibilityState={{ selected: tab === value, disabled }} disabled={disabled} onPress={() => { setTab(value); setResults([]); setSelected(null); setReason(''); setQuery(''); setMessage(null); }} style={[styles.tab, tab === value && { backgroundColor: theme.panelRaised, borderColor: theme.accent }, disabled && styles.disabled]}><Text style={[styles.tabText, { color: tab === value ? theme.accent : theme.textMuted }]}>{value === 'USERS' ? `Users (${userMemberships.length})` : `Admins (${adminMemberships.length})`}</Text></PressableScale>;
      })}
    </View>

    {tab === 'USERS' ? <>
      {requests.data?.length ? <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.text }]}>Pending requests</Text>{requests.data.map((request) => <Card key={request.id}><View style={styles.between}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{request.user.name || request.user.email}</Text><Text selectable style={[styles.uuid, { color: theme.textMuted }]}>{request.userId}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Requested {new Date(request.createdAt).toLocaleString()}{'\n'}“{request.reason}”</Text></View><StatusPill label="REQUESTED" tone="warning" /></View><ActionButton label="Review user" variant="secondary" onPress={() => void selectById(request.userId)} /></Card>)}</View> : null}
      <Card>
        <Text style={[styles.name, { color: theme.text }]}>Find a user</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>Search by name, email, or user ID.</Text>
        <TextInput accessibilityLabel="Search pilot users" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} placeholder="Name, email, or user ID" returnKeyType="search" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} onSubmitEditing={() => void search()} />
        <ActionButton label="Search users" icon={MagnifyingGlass as never} loading={busy === 'search'} disabled={!query.trim() || Boolean(busy)} onPress={() => void search()} />
      </Card>
      {results.map((user) => <Card key={user.id} style={selected?.id === user.id ? { borderColor: theme.accent } : undefined}><View style={styles.between}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{user.name || user.email}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{user.email} · {user.role}</Text><Text selectable style={[styles.uuid, { color: theme.textMuted }]}>{user.id}</Text></View><StatusPill label={user.grantActive ? 'ACTIVE' : user.pilotUser.active ? 'ENROLLED' : 'NOT ENROLLED'} tone={user.grantActive ? 'success' : 'neutral'} /></View><ActionButton label="Review user" variant="secondary" onPress={() => setSelected(user)} /></Card>)}
      {selected ? <Card>
        <View style={styles.between}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{selected.name || selected.email}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{selected.email}</Text><Text selectable style={[styles.uuid, { color: theme.textMuted }]}>{selected.id}</Text></View><StatusPill label={selected.grantActive ? 'ACCESS ACTIVE' : 'ACCESS INACTIVE'} tone={selected.grantActive ? 'success' : 'warning'} /></View>
        <View style={[styles.requirements, { borderColor: theme.border }]}>
          <Requirement label="Paper history" value={`${selected.readiness.paperDays}/7 days · ${selected.readiness.settledBotPositions}/10 positions`} passed={selected.readiness.paperQualified} />
          <Requirement label="Deposit wallet" value={selected.readiness.walletFunded ? 'Funded' : 'Not funding-ready'} passed={selected.readiness.walletFunded} />
          <Requirement label="Live review" value={selected.readiness.approvalStatus} passed={selected.readiness.approvalStatus === 'APPROVED'} />
          <Requirement label="Bot signer" value={selected.readiness.signerStatus} passed={selected.readiness.signerStatus === 'ACTIVE'} />
        </View>
        <Text style={[styles.copy, { color: theme.textMuted }]}>Pilot access does not bypass wallet verification or live trading approval.</Text>
        <TextInput accessibilityLabel="Required operator reason" value={reason} onChangeText={setReason} placeholder="Required operator reason" placeholderTextColor={theme.textMuted} multiline style={[styles.input, styles.reason, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} />
        <View style={styles.section}>
        <ActionButton label={pilotAccessPrimaryAction(selected.grantActive).label} loading={busy === pilotAccessPrimaryAction(selected.grantActive).action} disabled={!reason.trim() || Boolean(busy)} onPress={() => void act(pilotAccessPrimaryAction(selected.grantActive).action, selected)} />
        {selected.grantActive ? <ActionButton label="Revoke pilot access" variant="danger" loading={busy === 'revoke'} disabled={!reason.trim() || Boolean(busy)} onPress={() => void act('revoke', selected)} /> : null}
        <ActionButton label="Open Live Review" variant="secondary" onPress={() => router.push('/live-review' as never)} />
        </View>
        {selectedAudits.length ? <View style={[styles.audit, { borderTopColor: theme.border }]}><Text style={[styles.sectionTitle, { color: theme.text }]}>Recent membership history</Text>{selectedAudits.map((audit) => <Text key={audit.id} style={[styles.auditLine, { color: theme.textMuted }]}>{audit.action} {audit.kind} v{audit.membershipVersion} · {new Date(audit.createdAt).toLocaleString()}{'\n'}{audit.reason} · {audit.actor.name || audit.actor.email}</Text>)}</View> : null}
      </Card> : null}
      {!memberships.loading && !memberships.error && !userMemberships.length ? <Card><View style={styles.empty}><Users size={28} color={theme.accent} /><Text style={[styles.name, { color: theme.text }]}>No pilot members yet</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Find a user above to review their access.</Text></View></Card> : null}
      {userMemberships.length ? <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.text }]}>Enrolled users · {userMemberships.length}</Text>{userMemberships.map((membership) => <MembershipCard key={membership.id} membership={membership} onReview={() => void selectById(membership.userId)} />)}</View> : null}
    </> : <>
      <Card><Text style={[styles.name, { color: theme.text }]}>Protected administrator boundary</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Only a bootstrap administrator can appoint or remove pilot administrators. BetsClaw account roles stay unchanged.</Text></Card>
      <Card>
        <Text style={[styles.name, { color: theme.text }]}>Appoint an administrator</Text>
        <TextInput accessibilityLabel="Search administrator candidate" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} placeholder="ADMIN email or UUID" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} onSubmitEditing={() => void search()} />
        <ActionButton label="Find ADMIN user" loading={busy === 'search'} disabled={!query.trim() || Boolean(busy)} onPress={() => void search()} />
      </Card>
      {results.filter((user) => user.role === 'ADMIN').map((user) => <Card key={user.id}><View style={styles.between}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{user.name || user.email}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{user.email}</Text><Text selectable style={[styles.uuid, { color: theme.textMuted }]}>{user.id}</Text></View><StatusPill label={user.pilotAdmin.active ? user.pilotAdmin.source === 'ENV' ? 'BOOTSTRAP' : 'PILOT ADMIN' : 'ELIGIBLE'} tone={user.pilotAdmin.active ? 'success' : 'neutral'} /></View>{!user.pilotAdmin.active ? <><TextInput accessibilityLabel="Administrator appointment reason" value={reason} onChangeText={setReason} placeholder="Required appointment reason" placeholderTextColor={theme.textMuted} multiline style={[styles.input, styles.reason, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} /><ActionButton label="Appoint pilot administrator" disabled={!reason.trim() || Boolean(busy)} loading={busy === 'add-admin'} onPress={() => void act('add-admin', user)} /></> : null}</Card>)}
      <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.text }]}>Pilot administrators</Text>{adminMemberships.map((membership) => <Card key={membership.id}><MembershipSummary membership={membership} />{membership.protected ? <Text style={[styles.protected, { color: theme.warning, backgroundColor: theme.warningSoft }]}>Protected administrator · contact the deployment owner to remove</Text> : <><TextInput accessibilityLabel={`Revocation reason for ${membership.user.email}`} value={reason} onChangeText={setReason} placeholder="Required revocation reason" placeholderTextColor={theme.textMuted} multiline style={[styles.input, styles.reason, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]} /><ActionButton label="Revoke pilot administrator" variant="danger" disabled={!reason.trim() || Boolean(busy)} loading={busy === 'revoke-admin'} onPress={() => void act('revoke-admin', membership.user)} /></>}</Card>)}</View>
    </>}
  </DetailScreen>;
}

function Requirement({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.requirement}><View style={[styles.requirementDot, { backgroundColor: passed ? theme.success : theme.warning }]} /><View style={styles.flex}><Text style={[styles.requirementLabel, { color: theme.text }]}>{label}</Text><Text style={[styles.requirementValue, { color: theme.textMuted }]}>{value}</Text></View></View>;
}

function MembershipSummary({ membership }: { membership: MembershipItem }) {
  const { theme } = usePolyClawTheme();
  return <View style={styles.between}><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{membership.user.name || membership.user.email}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{membership.user.email} · {membership.user.role}</Text><Text selectable style={[styles.uuid, { color: theme.textMuted }]}>{membership.userId}</Text></View><StatusPill label={membership.source === 'ENV' ? 'BOOTSTRAP' : membership.status} tone={membership.status === 'ACTIVE' ? 'success' : 'danger'} /></View>;
}

function MembershipCard({ membership, onReview }: { membership: MembershipItem; onReview: () => void }) {
  const { theme } = usePolyClawTheme();
  return <PressableScale accessibilityRole="button" accessibilityLabel={`Review ${membership.user.name || membership.user.email}`} onPress={onReview} style={[styles.memberCard, { backgroundColor: theme.panel, borderColor: theme.border }]}>
    <View style={styles.memberHead}><View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}><Text style={[styles.avatarText, { color: theme.accent }]}>{(membership.user.name || membership.user.email).slice(0, 1).toUpperCase()}</Text></View><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{membership.user.name || membership.user.email}</Text><Text style={[styles.copy, { color: theme.textMuted }]}>{membership.user.email}</Text></View><CaretRight size={20} color={theme.textMuted} /></View>
    <View style={[styles.memberFooter, { borderColor: theme.border }]}><StatusPill label={membership.source === 'ENV' ? 'BOOTSTRAP' : 'ENROLLED'} tone="success" /><Text style={[styles.reviewLink, { color: theme.accent }]}>Review access</Text></View>
  </PressableScale>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  refresh: { minWidth: 44, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 16 },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 18 },
  memberFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewLink: { fontFamily: fonts.semibold, fontSize: 12 },
  empty: { alignItems: 'center', gap: 8, padding: 16 },
  tabs: { borderRadius: layout.controlRadius, flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
  tab: { alignItems: 'center', borderColor: 'transparent', borderRadius: layout.controlRadius, borderWidth: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 8, paddingVertical: 10 },
  tabText: { fontFamily: fonts.semibold, fontSize: 12 },
  disabled: { opacity: 0.4 },
  section: { gap: spacing.md },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17 },
  between: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 15 },
  copy: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  uuid: { fontFamily: fonts.medium, fontSize: 10.5, lineHeight: 16, marginTop: spacing.xs },
  input: { borderRadius: layout.controlRadius, borderWidth: 1, fontFamily: fonts.medium, fontSize: 16, minHeight: 50, marginVertical: spacing.md, paddingHorizontal: 14 },
  reason: { minHeight: 78, paddingTop: 14, textAlignVertical: 'top' },
  requirements: { borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.md, marginVertical: spacing.md, paddingVertical: spacing.md },
  requirement: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  requirementDot: { borderRadius: 5, height: 10, width: 10 },
  requirementLabel: { fontFamily: fonts.semibold, fontSize: 12.5 },
  requirementValue: { fontFamily: fonts.regular, fontSize: 11, marginTop: 2 },
  audit: { borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.lg },
  auditLine: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 16 },
  protected: { borderRadius: 12, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 17, marginTop: spacing.md, padding: spacing.md, textAlign: 'center' },
});
