import { useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircle, Info, Pause, Play, Robot, ShieldChevron } from 'phosphor-react-native';

import { useAuth } from '@/auth/provider';
import { Disclosure } from '@/components/disclosure';
import { PressableScale } from '@/components/motion';
import { ActionButton, Card, Header, ResourceState, Screen, StatusPill } from '@/components/ui-kit';
import { useConsumerDashboard } from '@/hooks/use-consumer-dashboard';
import { fonts, usePolyClawTheme } from '@/theme';

const riskOptions = [
  { value: 'CONSERVATIVE', title: 'Conservative', detail: 'Lower exposure', limits: ['0.5%', '3%', '5%'] },
  { value: 'BALANCED', title: 'Balanced', detail: 'Moderate exposure', limits: ['1%', '5%', '8%'] },
  { value: 'AGGRESSIVE', title: 'Aggressive', detail: 'Higher exposure', limits: ['10%', '10%', '12%'] },
] as const;

/**
 * Bot is a status surface with three rows plus one start action.
 *
 * The access notice, the risk radio group, the trade-cap field and the release-eligibility form
 * are all still here — collapsed into rows and one Start-bot disclosure. Country, invite code and
 * both consent checkboxes are preserved verbatim.
 */
export default function BotScreen() {
  const { theme } = usePolyClawTheme();
  const { consumer } = useAuth();
  const resource = useConsumerDashboard();
  const router = useRouter();
  const [risk, setRisk] = useState<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | null>(null);
  const [maximum, setMaximum] = useState<string | null>(null);
  const [country, setCountry] = useState('NG');
  const [invite, setInvite] = useState('');
  const [age, setAge] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const data = resource.data;
  const selectedRisk = risk ?? data?.profile.riskAppetite ?? 'BALANCED';
  const maximumValue = maximum ?? String(data?.profile.maximumTradeUsdc ?? 10);
  const validMaximum =
    maximumValue.trim() !== '' && Number.isFinite(Number(maximumValue)) && Number(maximumValue) >= 1 && Number(maximumValue) <= 100;
  const dirty = selectedRisk !== data?.profile.riskAppetite || Number(maximumValue) !== data?.profile.maximumTradeUsdc;
  const selectedOption = riskOptions.find((option) => option.value === selectedRisk) ?? riskOptions[1];
  const setup = data?.profile.botState === 'SETUP';
  const pilotAccessMode = data?.access.mode !== 'SUBSCRIPTION';

  const act = async (kind: 'activate' | 'save' | 'pause' | 'resume' | 'request-access') => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (kind === 'activate')
        await consumer('activate', {
          riskAppetite: selectedRisk,
          maximumTradeUsdc: Number(maximumValue),
          jurisdictionCode: country,
          ageConfirmed: age,
          riskDisclosureAccepted: disclosure,
          ...(invite ? { inviteCode: invite } : {}),
        });
      if (kind === 'save')
        await consumer('updateSettings', { riskAppetite: selectedRisk, maximumTradeUsdc: Number(maximumValue) });
      if (kind === 'pause') await consumer('pause');
      if (kind === 'resume') await consumer('resume');
      if (kind === 'request-access')
        await consumer('requestPilotAccess', {
          reason: 'Request access to continue the PolyClaw internal pilot',
          idempotencyKey: randomUUID(),
        });
      await resource.refresh();
      if (kind === 'save') setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the bot');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={theme.accent} />}>
      <Header
        action={
          <StatusPill
            label={!data ? 'SYNCING' : setup ? 'SETUP' : data.profile.botState === 'ACTIVE' ? 'RUNNING' : data.profile.botState === 'CLOSED' ? 'CLOSED' : 'PAUSED'}
            tone={data?.profile.botState === 'ACTIVE' ? 'success' : 'warning'}
          />
        }
        eyebrow="PAPER TRADING"
        title="Your bot"
      />
      <ResourceState error={resource.error} loading={resource.loading} />

      {data ? (
        <>
          <Card variant="raised">
            <View style={styles.statusRow}>
              <View style={[styles.botIcon, { backgroundColor: theme.accentSoft }]}>
                <Robot size={24} color={theme.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.heading, { color: theme.text }]}>
                  {data.profile.botState === 'ACTIVE' ? 'Paper bot is running' : 'Paper bot is paused'}
                </Text>
                <Text style={[styles.copy, { color: theme.textMuted }]}>Simulated trades · $1,000 practice balance</Text>
              </View>
            </View>
            {data.profile.botState === 'ACTIVE' ? (
              <ActionButton icon={Pause as never} label="Pause bot" loading={busy} onPress={() => void act('pause')} variant="secondary" />
            ) : data.access.active ? (
              <ActionButton icon={Play as never} label="Resume bot" loading={busy} onPress={() => void act('resume')} variant="secondary" />
            ) : (
              <Text style={[styles.copy, { color: theme.warning }]}>Restore access below to resume trading.</Text>
            )}
          </Card>

          {!data.access.active ? (
            <Card variant="raised">
              <View style={styles.noticeTitle}>
                <Info size={21} color={theme.warning} weight="fill" />
                <Text style={[styles.heading, { color: theme.text }]}>
                  {pilotAccessMode ? 'Need access to continue?' : 'Subscription access needed'}
                </Text>
              </View>
              <Text style={[styles.copy, { color: theme.textMuted }]}>
                {!pilotAccessMode
                  ? 'Open Account to restore or manage the subscription required for new bot positions.'
                  : data.access.pilotRequest?.status === 'PENDING'
                    ? 'Your request is waiting for a pilot administrator. You can still review your portfolio, but the paper bot cannot create new positions until access is renewed.'
                    : data.access.pilotGrant?.status === 'EXPIRED'
                      ? `Your pilot grant expired${data.access.pilotGrant.expiresAt ? ` on ${new Date(data.access.pilotGrant.expiresAt).toLocaleDateString()}` : ''}. Request renewal to continue building your paper history.`
                      : 'Request a 30-day pilot grant to start or resume your paper bot.'}
              </Text>
              <ActionButton
                disabled={busy || (pilotAccessMode && data.access.pilotRequest?.status === 'PENDING')}
                label={
                  !pilotAccessMode
                    ? 'Open account'
                    : data.access.pilotRequest?.status === 'PENDING'
                      ? 'Access request pending'
                      : 'Request pilot access'
                }
                loading={busy}
                onPress={() => (pilotAccessMode ? void act('request-access') : router.push('/account' as never))}
                variant="secondary"
              />
            </Card>
          ) : null}

          <Card>
            <Text style={[styles.heading, { color: theme.text }]}>Risk profile</Text>
            <Text style={[styles.copy, { color: theme.textMuted }]}>Choose how much of your balance the bot can put at risk.</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Risk profile" style={styles.segments}>
              {riskOptions.map((option) => {
                const active = selectedRisk === option.value;
                return (
                  <PressableScale
                    accessibilityLabel={option.title}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    haptic="select"
                    key={option.value}
                    onPress={() => {
                      setRisk(option.value);
                      setSaved(false);
                    }}
                    containerStyle={styles.flex}>
                    <View
                      style={[
                        styles.segment,
                        {
                          backgroundColor: active ? theme.accentSoft : theme.field,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}>
                      <Text style={[styles.segmentTitle, { color: active ? theme.accent : theme.text }]}>{option.title}</Text>
                      <Text style={[styles.segmentDetail, { color: theme.textMuted }]}>{option.detail}</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <View style={[styles.limits, { backgroundColor: theme.field }]}>
              {['Per trade', 'Daily limit', 'Drawdown'].map((label, index) => (
                <View key={label} style={styles.limit}>
                  <Text style={[styles.limitValue, { color: theme.text }]}>{selectedOption.limits[index]}</Text>
                  <Text style={[styles.limitLabel, { color: theme.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Disclosure
            detail={`$${maximumValue} per trade · ${validMaximum ? 'within $1–$100' : 'enter $1–$100'}`}
            label="Trade cap">
            <Text style={[styles.copy, { color: theme.textMuted }]}>The most you want to stake on a single trade.</Text>
            <View
              style={[
                styles.amountField,
                { backgroundColor: theme.field, borderColor: validMaximum ? theme.border : theme.danger },
              ]}>
              <Text style={[styles.currency, { color: theme.textMuted }]}>$</Text>
              <TextInput
                accessibilityLabel="Maximum amount per trade in US dollars"
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setMaximum(value);
                  setSaved(false);
                }}
                returnKeyType="done"
                style={[styles.amountInput, { color: theme.text }]}
                value={maximumValue}
              />
              <Text style={[styles.segmentDetail, { color: theme.textMuted }]}>USD</Text>
            </View>
            <View style={styles.presets}>
              {[5, 10, 25, 50, 100].map((value) => {
                const active = Number(maximumValue) === value;
                return (
                  <PressableScale
                    accessibilityLabel={`Set trade cap to ${value} dollars`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    containerStyle={styles.flex}
                    haptic="select"
                    key={value}
                    onPress={() => {
                      setMaximum(String(value));
                      setSaved(false);
                    }}>
                    <View
                      style={[
                        styles.preset,
                        {
                          backgroundColor: active ? theme.accentSoft : theme.field,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}>
                      <Text style={[styles.presetText, { color: active ? theme.accent : theme.textSoft }]}>${value}</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.copy, { color: validMaximum ? theme.textMuted : theme.danger }]}>
              {validMaximum
                ? 'Your risk profile and remaining daily allowance may reduce the actual stake.'
                : 'Enter an amount from $1 to $100.'}
            </Text>
            {!setup ? (
              <View style={styles.saveAction}>
                <ActionButton
                  disabled={busy || !validMaximum || !dirty}
                  label={saved && !dirty ? 'Settings saved' : 'Save risk settings'}
                  loading={busy}
                  onPress={() => void act('save')}
                />
                {saved ? (
                  <Text accessibilityLiveRegion="polite" style={[styles.saved, { color: theme.success }]}>
                    Your risk settings are up to date.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Disclosure>

          {setup ? (
            <Disclosure
              detail={`${country} · paper only${data.release.activationRequiresInvite ? ' · invite required' : ''}`}
              label={data.access.active ? 'Start bot' : 'Start bot (access required)'}>
              <Text style={[styles.copy, { color: theme.textMuted }]}>
                Release eligibility. Paper trading only — no wallet, deposit, or real-money order is created.
              </Text>
              <TextInput
                accessibilityLabel="Country code"
                autoCapitalize="characters"
                maxLength={3}
                onChangeText={setCountry}
                placeholder="NG"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]}
                value={country}
              />
              {data.release.activationRequiresInvite ? (
                <TextInput
                  accessibilityLabel="Invite code"
                  onChangeText={setInvite}
                  placeholder="Invite code"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { backgroundColor: theme.field, borderColor: theme.border, color: theme.text }]}
                  value={invite}
                />
              ) : null}
              <Consent checked={age} label="I confirm I am 18 or older." onPress={() => setAge(!age)} />
              <Consent
                checked={disclosure}
                label="I understand this is a simulation and not financial advice."
                onPress={() => setDisclosure(!disclosure)}
              />
              <ActionButton
                disabled={busy || !data.access.active || !age || !disclosure || !validMaximum}
                icon={ShieldChevron as never}
                label={
                  !data.access.active
                    ? 'Pilot access required'
                    : data.access.mode === 'PILOT'
                      ? 'Start pilot paper bot'
                      : 'Start 7-day paper trial'
                }
                loading={busy}
                onPress={() => void act('activate')}
              />
            </Disclosure>
          ) : null}

          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>
              {error}
            </Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Consent({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      haptic="select"
      onPress={onPress}
      containerStyle={styles.consentWrap}>
      <View style={styles.consent}>
        {checked ? (
          <CheckCircle size={22} color={theme.success} weight="fill" />
        ) : (
          <View style={[styles.checkbox, { borderColor: theme.borderStrong }]} />
        )}
        <Text style={[styles.consentText, { color: theme.textSoft }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  amountField: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  amountInput: { flex: 1, fontFamily: fonts.display, fontSize: 30, minHeight: 64, minWidth: 0 },
  botIcon: { alignItems: 'center', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  checkbox: { borderRadius: 6, borderWidth: 1.5, height: 22, width: 22 },
  consent: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 44 },
  consentText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18 },
  consentWrap: { alignSelf: 'stretch' },
  copy: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, marginTop: 5 },
  currency: { fontFamily: fonts.medium, fontSize: 24 },
  error: { fontFamily: fonts.medium, fontSize: 12.5 },
  flex: { flex: 1 },
  heading: { flexShrink: 1, fontFamily: fonts.display, fontSize: 17 },
  input: { borderRadius: 12, borderWidth: 1, fontFamily: fonts.medium, fontSize: 15, minHeight: 48, paddingHorizontal: 14 },
  limit: { alignItems: 'center', flex: 1, gap: 5 },
  limitLabel: { fontFamily: fonts.medium, fontSize: 11 },
  limits: { borderRadius: 12, flexDirection: 'row', marginTop: 16, paddingVertical: 14 },
  limitValue: { fontFamily: fonts.bold, fontSize: 19 },
  noticeTitle: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  preset: { alignItems: 'center', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 44 },
  presets: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  presetText: { fontFamily: fonts.semibold, fontSize: 12 },
  saved: { fontFamily: fonts.medium, fontSize: 12, textAlign: 'center' },
  saveAction: { gap: 8, marginTop: 16 },
  segment: { alignItems: 'center', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 62, paddingHorizontal: 6 },
  segmentDetail: { fontFamily: fonts.regular, fontSize: 10.5 },
  segments: { flexDirection: 'row', gap: 8, marginTop: 14 },
  segmentTitle: { fontFamily: fonts.bold, fontSize: 13 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 16 },
});
