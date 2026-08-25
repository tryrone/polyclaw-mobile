import { StyleSheet, Text, View } from 'react-native';
import { Moon, ShieldCheck, SignOut, Sun } from 'phosphor-react-native';
import { useAuth } from '@/auth/provider';
import { PressableScale } from '@/components/motion';
import { ActionButton, Card, Header, Screen } from '@/components/ui-kit';
import { fonts, usePolyClawTheme } from '@/theme';

export default function ConsumerAccount() {
  const { theme, preference, setPreference } = usePolyClawTheme(); const { session, signOut } = useAuth();
  return <Screen><Header eyebrow="PROFILE & SAFETY" title="Account" /><Card><View style={styles.row}><View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}><Text style={[styles.avatarText, { color: theme.accent }]}>{(session?.user.name || session?.user.email || 'P').slice(0, 1).toUpperCase()}</Text></View><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>{session?.user.name || 'PolyClaw member'}</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{session?.user.email}</Text></View></View></Card>
    <Card><PressableScale accessibilityRole="button" accessibilityLabel="Change appearance" onPress={() => setPreference(preference === 'dark' ? 'light' : 'dark')} style={styles.row}>{preference === 'dark' ? <Moon size={22} color={theme.accent} weight="fill" /> : <Sun size={22} color={theme.warning} weight="fill" />}<View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>Appearance</Text><Text style={[styles.detail, { color: theme.textMuted }]}>{preference === 'dark' ? 'Dark' : 'Light'} mode</Text></View></PressableScale></Card>
    <Card><View style={styles.row}><ShieldCheck size={22} color={theme.success} weight="fill" /><View style={styles.flex}><Text style={[styles.name, { color: theme.text }]}>Paper-first protection</Text><Text style={[styles.detail, { color: theme.textMuted }]}>The consumer app holds no trading key and cannot bypass server risk controls.</Text></View></View></Card>
    <ActionButton label="Sign out" icon={SignOut as never} variant="secondary" onPress={() => void signOut()} />
  </Screen>;
}
const styles = StyleSheet.create({ row: { alignItems: 'center', flexDirection: 'row', gap: 13, minHeight: 54 }, avatar: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 }, avatarText: { fontFamily: fonts.displayExtraBold, fontSize: 20 }, flex: { flex: 1 }, name: { fontFamily: fonts.semibold, fontSize: 14 }, detail: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, marginTop: 3 } });
