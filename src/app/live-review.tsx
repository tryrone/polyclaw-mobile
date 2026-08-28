import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '@/auth/provider';
import { ActionButton, Card, Header, ResourceState, Screen, StatusPill, money } from '@/components/ui-kit';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { fonts, layout, spacing, usePolyClawTheme } from '@/theme';

type ReviewAccount = { id: string; userId: string; walletStatus: string; walletLifecycle: string; botLifecycle: string; approvalStatus: string; embeddedOwnerAddress?: string | null; depositWalletAddress?: string | null; depositWalletDeploymentTxHash?: string | null; depositWalletApprovedAt?: string | null; availablePusd: number; signerStatus: string; reviewSubmittedAt?: string | null; currentEvidenceHash: string; evidenceChanged: boolean; currentEvidence: { identity?: unknown; wallet?: unknown; funding?: unknown; geography?: unknown; paper?: unknown; pilotGrant?: unknown; previousDecisions?: unknown[]; reconciliationFailures?: unknown[] }; user: { email: string; name?: string | null } };
type CanaryIntent = { id: string; userId: string; marketId: string; conditionId: string; tokenId: string; side: string; limitPrice: number; minimumOrderSize: number; stakePusd: number; evidenceHash: string; status: 'AWAITING_OPERATOR_RELEASE' | 'FAILED' | 'EXPIRED' | 'CANCELLED'; expiresAt: string; user: { email: string; name?: string | null } };

export default function LiveReviewScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const resource = useConsumerResource<ReviewAccount[]>('liveReviewQueue', undefined, 30_000);
  const canaries = useConsumerResource<CanaryIntent[]>('canaryIntentQueue', undefined, 15_000);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const decide = async (account: ReviewAccount, action: 'approveLiveAccount' | 'denyLiveAccount' | 'revokeLiveAccount') => {
    if (resource.error) return;
    const reason = reasons[account.id]?.trim();
    if (!reason) return;
    setBusy(`${action}:${account.id}`);
    try { await consumer(action, { userId: account.userId, reason, evidenceHash: account.currentEvidenceHash, idempotencyKey: randomUUID() }); await resource.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Decision failed'); }
    finally { setBusy(null); }
  };
  const release = async (intent: CanaryIntent) => { const reason = reasons[intent.id]?.trim(); if (!reason) return; setBusy(`release:${intent.id}`); setMessage(null); try { await consumer('releaseCanaryIntent', { intentId: intent.id, evidenceHash: intent.evidenceHash, reason, idempotencyKey: randomUUID() }); await canaries.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Canary release failed'); } finally { setBusy(null); } };
  const reset = async (intent: CanaryIntent) => { const reason = reasons[intent.id]?.trim(); if (!reason) return; setBusy(`reset:${intent.id}`); setMessage(null); try { await consumer('resetCanaryAttempt', { intentId: intent.id, reason, idempotencyKey: randomUUID() }); await canaries.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Canary reset failed'); } finally { setBusy(null); } };
  return <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
    <Header eyebrow="HUMAN PILOT GATE" title="Live account review" />
    {message ? <Card><Text accessibilityRole="alert" style={[styles.detail, { color: theme.warning }]}>{message}</Text></Card> : null}
    <ResourceState loading={resource.loading} error={resource.error} />
    {resource.data?.length ? resource.data.map((account) => <Card key={account.id}>
      <View style={styles.between}><View style={styles.flex}><Text style={[styles.title, { color: theme.text }]}>{account.user.name || account.user.email}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{account.user.email}</Text></View><StatusPill label={account.approvalStatus} tone="warning" /></View>
      <Text style={[styles.detail, { color: theme.textMuted }]}>Evidence {account.currentEvidenceHash}{`\n`}Owner {account.embeddedOwnerAddress ?? 'missing'}{`\n`}Deposit wallet {account.depositWalletAddress ?? 'missing'}{`\n`}Deployment tx {account.depositWalletDeploymentTxHash ?? 'missing'}{`\n`}Approvals {account.depositWalletApprovedAt ? 'confirmed' : 'pending'} · pUSD {money(Number(account.availablePusd))}{`\n`}Signer {account.signerStatus} · wallet {account.walletLifecycle} · bot {account.botLifecycle}</Text>
      <Text selectable style={[styles.evidence, { color: theme.textMuted, backgroundColor: theme.field }]}>{JSON.stringify(account.currentEvidence, null, 2)}</Text>
      <TextInput accessibilityLabel={`Review reason for ${account.user.email}`} placeholder="Required operator reason" placeholderTextColor={theme.textMuted} value={reasons[account.id] ?? ''} onChangeText={(value) => setReasons((current) => ({ ...current, [account.id]: value }))} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} />
      <View style={styles.actions}><ActionButton label="Approve pilot" disabled={Boolean(resource.error) || !reasons[account.id]?.trim() || Boolean(busy)} loading={busy === `approveLiveAccount:${account.id}`} onPress={() => void decide(account, 'approveLiveAccount')} /><ActionButton label="Deny" variant="secondary" disabled={Boolean(resource.error) || !reasons[account.id]?.trim() || Boolean(busy)} loading={busy === `denyLiveAccount:${account.id}`} onPress={() => void decide(account, 'denyLiveAccount')} /><ActionButton label="Revoke" variant="danger" disabled={Boolean(resource.error) || !reasons[account.id]?.trim() || Boolean(busy)} loading={busy === `revokeLiveAccount:${account.id}`} onPress={() => void decide(account, 'revokeLiveAccount')} /></View>
    </Card>) : !resource.loading ? <Card><Text style={[styles.detail, { color: theme.textMuted }]}>No accounts are waiting for review.</Text></Card> : null}
    <Header eyebrow="ONE ATTEMPT" title="Canary release queue" />
    <ResourceState loading={canaries.loading} error={canaries.error} />
    {canaries.data?.map((intent) => <Card key={intent.id}><View style={styles.between}><Text style={[styles.title, { color: theme.text }]}>{intent.user.name || intent.user.email}</Text><StatusPill label={intent.status} tone="warning" /></View><Text style={[styles.detail, { color: theme.textMuted }]}>Market {intent.marketId}{`\n`}Token {intent.tokenId}{`\n`}{intent.side} · {money(Number(intent.stakePusd))} · limit {Number(intent.limitPrice)} · venue minimum {Number(intent.minimumOrderSize)}{`\n`}Expires {new Date(intent.expiresAt).toLocaleString()}{`\n`}Evidence {intent.evidenceHash}</Text><TextInput accessibilityLabel={`Canary operator reason for ${intent.user.email}`} placeholder="Required operator reason" placeholderTextColor={theme.textMuted} value={reasons[intent.id] ?? ''} onChangeText={(value) => setReasons((current) => ({ ...current, [intent.id]: value }))} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} />{intent.status === 'AWAITING_OPERATOR_RELEASE' ? <ActionButton label="Release exact canary" variant="danger" disabled={!reasons[intent.id]?.trim() || Boolean(busy)} loading={busy === `release:${intent.id}`} onPress={() => void release(intent)} /> : <ActionButton label="Reset canary attempt" variant="secondary" disabled={!reasons[intent.id]?.trim() || Boolean(busy)} loading={busy === `reset:${intent.id}`} onPress={() => void reset(intent)} />}</Card>)}
  </Screen>;
}

const styles = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, justifyContent: 'space-between' }, flex: { flex: 1 }, title: { fontFamily: fonts.display, fontSize: 16 }, detail: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, marginTop: spacing.sm }, evidence: { borderRadius: layout.controlRadius, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, marginTop: spacing.md, padding: spacing.md }, input: { minHeight: 48, borderWidth: 1, borderRadius: layout.controlRadius, paddingHorizontal: 14, fontFamily: fonts.medium, marginTop: spacing.lg }, actions: { gap: spacing.sm, marginTop: spacing.md } });
