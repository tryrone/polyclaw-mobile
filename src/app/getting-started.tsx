import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, CheckCircle, Play, ShieldCheck, Wallet } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/provider';
import { ActionButton, Card, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { PressableScale } from '@/components/motion';
import { buildSetupGuide } from '@/features/setup-guide';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { useConsumerResource } from '@/hooks/use-consumer-resource';
import { writeConsumerGuideCompleted } from '@/lib/storage';
import type { ConsumerAccount } from '@/lib/types';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

const stages = [
  { Icon: Play, title: 'Qualify in paper mode', detail: 'The bot practices with a simulated balance while building your required history.' },
  { Icon: Wallet, title: 'Prepare your wallet', detail: 'You own the funded Deposit Wallet; the bot never receives withdrawal access.' },
  { Icon: ShieldCheck, title: 'Activate real trading', detail: 'After exact operator approval, live mode places controlled Polymarket orders with real funds.' },
];

export default function GettingStartedScreen() {
  const { theme } = usePolyClawTheme();
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ firstRun?: string }>();
  const dashboard = useConsumerDashboard(60_000);
  const account = useConsumerResource<ConsumerAccount>('account', undefined, 60_000);
  const [busy, setBusy] = useState(false);
  const steps = buildSetupGuide(account.data, dashboard.data);
  const current = steps.find((step) => step.state === 'CURRENT');

  const finishIntro = async (href: '/bot' | '/account' = current?.href ?? '/bot') => {
    if (!session) return;
    setBusy(true);
    await writeConsumerGuideCompleted(session.user.id);
    router.replace(href);
  };

  return <Screen>
    <Header eyebrow={params.firstRun ? 'WELCOME TO POLYCLAW' : 'SETUP GUIDE'} title="How PolyClaw works" action={<StatusPill label="PAPER → LIVE" tone="warning" />} />
    <Card variant="raised">
      <Text accessibilityRole="header" style={[styles.heroTitle, { color: theme.text }]}>One clear path from practice to controlled real-money trading</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>Paper mode is the qualification stage—not the final product. Once every safety and wallet gate is approved, PolyClaw can trade real funds on Polymarket within your limits.</Text>
      <View style={styles.stageStack}>{stages.map(({ Icon, title, detail }, index) => <View key={title} style={styles.stageRow}>
        <View style={[styles.stageIcon, { backgroundColor: theme.accentSoft }]}><Icon size={19} color={theme.accent} /></View>
        <View style={styles.flex}><Text style={[styles.stageTitle, { color: theme.text }]}>{index + 1}. {title}</Text><Text style={[styles.stageDetail, { color: theme.textMuted }]}>{detail}</Text></View>
      </View>)}</View>
    </Card>

    <ResourceState loading={account.loading || dashboard.loading} error={account.error ?? dashboard.error} />
    <View style={styles.headingRow}><Text style={[styles.sectionTitle, { color: theme.text }]}>Your setup progress</Text><Text style={[styles.progressText, { color: theme.textMuted }]}>{steps.filter((step) => step.complete).length}/{steps.length}</Text></View>
    <View style={styles.stepStack}>{steps.map((step, index) => {
      const tone = step.state === 'COMPLETE' ? theme.success : step.state === 'CURRENT' ? theme.accent : theme.textMuted;
      return <PressableScale
        key={step.id}
        accessibilityRole="button"
        accessibilityState={{ disabled: step.state === 'LOCKED' }}
        accessibilityLabel={`${index + 1}. ${step.title}. ${step.detail}`}
        disabled={step.state === 'LOCKED'}
        onPress={() => router.push(step.href)}
        style={[styles.step, { backgroundColor: step.state === 'CURRENT' ? theme.accentSoft : theme.panel, borderColor: step.state === 'CURRENT' ? theme.accent : theme.border }]}
      >
        <View style={[styles.stepMarker, { borderColor: tone, backgroundColor: step.state === 'COMPLETE' ? theme.successSoft : 'transparent' }]}>
          {step.complete ? <CheckCircle size={23} color={theme.success} weight="fill" /> : <Text style={[styles.stepNumber, { color: tone }]}>{index + 1}</Text>}
        </View>
        <View style={styles.flex}><Text style={[styles.stepTitle, { color: step.state === 'LOCKED' ? theme.textMuted : theme.text }]}>{step.title}</Text><Text style={[styles.stepDetail, { color: theme.textMuted }]}>{step.detail}</Text><Text style={[styles.actionLabel, { color: tone }]}>{step.actionLabel}</Text></View>
        {step.state !== 'LOCKED' ? <ArrowRight size={18} color={tone} /> : null}
      </PressableScale>;
    })}</View>

    <Card>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Know the wallet roles</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}><Text style={[styles.inlineStrong, { color: theme.text }]}>History-linked wallet:</Text> optional and read-only.{`\n\n`}<Text style={[styles.inlineStrong, { color: theme.text }]}>Dedicated Deposit Wallet:</Text> holds the funds used by live automation and remains under your passkey-backed ownership.{`\n\n`}<Text style={[styles.inlineStrong, { color: theme.text }]}>Bot authorization:</Text> expires after 30 days and can place, cancel, or close approved positions. It cannot withdraw.</Text>
    </Card>
    <Text style={[styles.warning, { color: theme.warning }]}>Live trading can lose money. Risk controls limit exposure; they do not guarantee profit.</Text>
    <ActionButton label={params.firstRun ? 'Continue to my paper bot' : current?.actionLabel ?? 'Open my bot'} icon={ArrowRight as never} loading={busy} onPress={() => void finishIntro()} />
    {!params.firstRun ? <ActionButton label="Back to account" variant="secondary" onPress={() => router.back()} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  heroTitle: { fontFamily: fonts.display, fontSize: 19, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  stageStack: { gap: spacing.md, marginTop: spacing.xl },
  stageRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  stageIcon: { alignItems: 'center', borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  stageTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  stageDetail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17 },
  progressText: { fontFamily: fonts.bold, fontSize: 12 },
  stepStack: { gap: spacing.sm },
  step: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 112, padding: spacing.lg },
  stepMarker: { alignItems: 'center', borderRadius: 18, borderWidth: 1.5, height: 36, justifyContent: 'center', width: 36 },
  stepNumber: { fontFamily: fonts.bold, fontSize: 13 },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  stepDetail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 3 },
  actionLabel: { fontFamily: fonts.bold, fontSize: 11, marginTop: spacing.sm },
  inlineStrong: { fontFamily: fonts.semibold },
  warning: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  flex: { flex: 1 },
});
