import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { ActionButton } from '@/components/ui-kit';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

export default function LoginScreen() {
  const { theme } = usePolyClawTheme();
  const { signIn, state } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => { setBusy(true); setError(null); try { await signIn(email, password); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Sign in failed'); } finally { setBusy(false); } };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={styles.content}>
      <View style={[styles.mark, { backgroundColor: theme.lime }]}><Text style={[styles.markText, { color: theme.limeInk }]}>P</Text></View>
      <Text style={[styles.kicker, { color: theme.lime }]}>PRIVATE OPERATOR ACCESS</Text>
      <Text style={[styles.title, { color: theme.text }]}>See every move.{'\n'}Control the risk.</Text>
      <Text style={[styles.copy, { color: theme.textMuted }]}>A dedicated monitoring console for PolyClaw paper and live trading.</Text>
      <View style={styles.form}>
        <View><Text style={[styles.label, { color: theme.textMuted }]}>EMAIL</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="operator@example.com" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} /></View>
        <View><Text style={[styles.label, { color: theme.textMuted }]}>PASSWORD</Text><TextInput secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.border }]} /></View>
        {error ? <Text style={[styles.error, { color: theme.red }]}>{error}</Text> : null}
        <ActionButton label={busy ? 'Signing in…' : 'Sign in securely'} icon={busy ? undefined : ShieldCheck} disabled={busy || !email || !password || state === 'hydrating'} onPress={submit} />
      </View>
      {state === 'hydrating' ? <ActivityIndicator color={theme.lime} /> : null}
      <Text style={[styles.footer, { color: theme.textMuted }]}>Monitoring is read-only while data is stale or offline.</Text>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center' }, content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 28, gap: 14 }, mark: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, markText: { fontFamily: fonts.bold, fontSize: 24 }, kicker: { fontFamily: fonts.bold, letterSpacing: 2, fontSize: 10 }, title: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 43, letterSpacing: -1.8 }, copy: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, maxWidth: 380 }, form: { gap: spacing.lg, marginTop: spacing.lg }, label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.3, marginBottom: 7 }, input: { height: 54, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 15, fontFamily: fonts.medium, fontSize: 15 }, error: { fontFamily: fonts.medium, fontSize: 13 }, footer: { fontFamily: fonts.regular, fontSize: 11, marginTop: 10 } });
