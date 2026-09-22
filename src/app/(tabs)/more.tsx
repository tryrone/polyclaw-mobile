import { router } from 'expo-router';
import { Bell, BrainCircuit, Cable, ChevronRight, ClipboardCheck, ClipboardList, LogOut, Moon, ShieldAlert, ShieldCheck, Sun, Users } from '@/components/modern-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/provider';
import { haptics, PressableScale } from '@/components/motion';
import { ActionButton, Card, Header, Screen } from '@/components/ui-kit';
import { CopyableUserId } from '@/components/copyable-user-id';
import { fonts, usePolyClawTheme } from '@/theme';

const links = [{ label: 'Models', detail: 'Shared ensemble health and shadow gates', route: '/models', icon: BrainCircuit }, { label: 'Risk controls', detail: 'Limits, halt state and mode', route: '/risk', icon: ShieldAlert }, { label: 'Pilot access', detail: 'Enroll users and manage 30-day access', route: '/pilot-access', icon: Users }, { label: 'Live account review', detail: 'Identity, wallet, funding and approval evidence', route: '/live-review', icon: ShieldCheck }, { label: 'Connections', detail: 'Venue and research health', route: '/connections', icon: Cable }, { label: 'Manual bets', detail: 'SportyBet handoff and confirmation', route: '/manual-bets', icon: ClipboardCheck }, { label: 'Alerts', detail: 'Operational warnings', route: '/alerts', icon: Bell }, { label: 'Audit log', detail: 'Operator action history', route: '/audit', icon: ClipboardList }];

export default function MoreScreen() {
  const { theme, preference, setPreference } = usePolyClawTheme(); const { session, signOut } = useAuth();
  return <Screen><Header eyebrow="SETTINGS & CONTROL" title="More" />
    {[
      { title: 'TRADING SURFACES', items: links.slice(0, 4) },
      { title: 'OPERATIONS & EVIDENCE', items: links.slice(4) },
    ].map((group) => (
      <View key={group.title} style={styles.groupSection}>
        <Text style={[styles.groupLabel, { color: theme.textMuted }]}>{group.title}</Text>
        <Card>
          {group.items.map(({ label, detail, route, icon: Icon }, index) => (
            <PressableScale key={route} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} onPress={() => router.push(route as never)} containerStyle={[styles.linkWrap, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
              <View style={styles.link}><View style={[styles.linkIcon, { backgroundColor: theme.accentSoft }]}><Icon size={18} color={theme.accent} /></View><View style={{ flex: 1 }}><Text style={[styles.label, { color: theme.text }]}>{label}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text></View><ChevronRight size={17} color={theme.textMuted} /></View>
            </PressableScale>
          ))}
        </Card>
      </View>
    ))}
    <Card>
      <PressableScale accessibilityRole="button" onPress={() => { haptics.select(); setPreference(preference === 'dark' ? 'light' : 'dark'); }} haptic={null} containerStyle={styles.linkWrap}>
        <View style={styles.link}>
          <View style={[styles.linkIcon, { backgroundColor: preference === 'dark' ? theme.accentSoft : theme.warningSoft }]}>
            {preference === 'dark' ? <Moon size={18} color={theme.accent} /> : <Sun size={18} color={theme.warning} />}
          </View>
          <View style={{ flex: 1 }}><Text style={[styles.label, { color: theme.text }]}>Appearance</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{preference === 'dark' ? 'Dark' : 'Light'} mode</Text></View>
        </View>
      </PressableScale>
    </Card>
    <Card>
      <Text style={[styles.account, { color: theme.textMuted }]}>SIGNED IN AS</Text>
      <Text style={[styles.email, { color: theme.text }]}>{session?.user.email}</Text>
      <CopyableUserId userId={session?.user.id} accessibilityLabel="Copy administrator user ID" />
    </Card>
    <ActionButton label="Sign out" icon={LogOut} variant="secondary" onPress={() => void signOut()} />
  </Screen>;
}
const styles = StyleSheet.create({ groupSection: { gap: 8 }, groupLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, marginLeft: 4 }, linkWrap: { alignSelf: 'stretch' }, link: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 6 }, linkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, label: { fontFamily: fonts.semibold, fontSize: 14 }, detail: { fontFamily: fonts.regular, fontSize: 11, marginTop: 4 }, account: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2 }, email: { fontFamily: fonts.medium, fontSize: 14, marginTop: 6 } });
