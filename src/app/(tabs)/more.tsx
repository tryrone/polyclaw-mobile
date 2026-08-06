import { router } from 'expo-router';
import { Bell, BrainCircuit, Cable, ChevronRight, ClipboardCheck, ClipboardList, LogOut, Moon, ShieldAlert } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/provider';
import { ActionButton, Card, Header, Screen } from '@/components/ui-kit';
import { fonts, usePolyClawTheme } from '@/theme';

const links = [{ label: 'Models', detail: 'Shared ensemble health and shadow gates', route: '/models', icon: BrainCircuit }, { label: 'Risk controls', detail: 'Limits, halt state and mode', route: '/risk', icon: ShieldAlert }, { label: 'Connections', detail: 'Venue and research health', route: '/connections', icon: Cable }, { label: 'Manual bets', detail: 'SportyBet handoff and confirmation', route: '/manual-bets', icon: ClipboardCheck }, { label: 'Alerts', detail: 'Operational warnings', route: '/alerts', icon: Bell }, { label: 'Audit log', detail: 'Operator action history', route: '/audit', icon: ClipboardList }];
export default function MoreScreen() {
  const { theme, preference, setPreference } = usePolyClawTheme(); const { session, signOut } = useAuth();
  return <Screen><Header eyebrow="SETTINGS & CONTROL" title="More" /><Card>{links.map(({ label, detail, route, icon: Icon }, index) => <Pressable key={route} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} onPress={() => router.push(route as never)} style={[styles.link, index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}><Icon size={20} color={theme.lime} /><View style={{ flex: 1 }}><Text style={[styles.label, { color: theme.text }]}>{label}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text></View><ChevronRight size={18} color={theme.textMuted} /></Pressable>)}</Card>
    <Card><Pressable onPress={() => setPreference(preference === 'dark' ? 'light' : 'dark')} style={styles.link}><Moon size={20} color={theme.lime} /><View style={{ flex: 1 }}><Text style={[styles.label, { color: theme.text }]}>Appearance</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{preference === 'dark' ? 'Dark' : 'Light'} mode</Text></View><ChevronRight size={18} color={theme.textMuted} /></Pressable></Card>
    <View><Text style={[styles.account, { color: theme.textMuted }]}>SIGNED IN AS</Text><Text style={[styles.email, { color: theme.text }]}>{session?.user.email}</Text></View><ActionButton label="Sign out" icon={LogOut} variant="secondary" onPress={signOut} />
  </Screen>;
}
const styles = StyleSheet.create({ link: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13 }, label: { fontFamily: fonts.semibold, fontSize: 14 }, detail: { fontFamily: fonts.regular, fontSize: 11, marginTop: 4 }, account: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.2 }, email: { fontFamily: fonts.medium, fontSize: 14, marginTop: 6 } });
