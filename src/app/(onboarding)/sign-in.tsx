import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleLogo, Scan } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { haptics, PressableScale, Staggered, useReducedMotion } from '@/components/motion';
import { ActionButton } from '@/components/ui-kit';
import { useAuth } from '@/auth/provider';
import { fonts, motion, radius, spacing, usePolyClawTheme } from '@/theme';

export default function SignInScreen() {
  const { theme } = usePolyClawTheme();
  const { signIn, signInWithApple, signInWithGoogle, biometricSupported, biometricEnabled, setBiometricEnabled } = useAuth();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [offeredBiometric, setOfferedBiometric] = useState(false);

  const emailFocus = useSharedValue(0); const passwordFocus = useSharedValue(0);
  const shake = useSharedValue(0); const previousError = useRef<string | null>(null);
  useEffect(() => {
    if (error && error !== previousError.current && !reduce) {
      shake.value = withSequence(withTiming(-9, motion.fast), withTiming(9, motion.fast), withTiming(-5, motion.fast), withTiming(5, motion.fast), withTiming(0, motion.base));
      haptics.error();
    }
    previousError.current = error;
  }, [error, reduce, shake]);

  const emailStyle = useAnimatedStyle(() => ({ borderColor: emailFocus.value ? theme.accent : theme.border, shadowOpacity: emailFocus.value * 0.35 }));
  const passwordStyle = useAnimatedStyle(() => ({ borderColor: passwordFocus.value ? theme.accent : theme.border, shadowOpacity: passwordFocus.value * 0.35 }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await signIn(email, password);
      if (!reduce) haptics.success();
      setOfferedBiometric(biometricSupported && !biometricEnabled);
      if (!(biometricSupported && !biometricEnabled)) router.replace('/' as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed');
    } finally { setBusy(false); }
  };
  const finishWithBiometric = (enabled: boolean) => {
    setBiometricEnabled(enabled);
    if (enabled) haptics.success();
    router.replace('/' as never);
  };
  const apple = async () => {
    setBusy(true); setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
      await signInWithApple({ identityToken: credential.identityToken, givenName: credential.fullName?.givenName ?? undefined, familyName: credential.fullName?.familyName ?? undefined });
      router.replace('/' as never);
    } catch (caught) {
      if ((caught as { code?: string }).code !== 'ERR_REQUEST_CANCELED') setError(caught instanceof Error ? caught.message : 'Apple sign in failed');
    } finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.kicker, { color: theme.accent }]}>POLYCLAW ACCESS</Text>
        <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
        <Staggered index={1} style={{ width: '100%' }}>
          <Animated.View style={shakeStyle}>
            <View style={styles.form}>
              <View>
                <Text style={[styles.label, { color: theme.textMuted }]}>EMAIL</Text>
                <AnimatedTextInput
                  autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="operator@example.com" placeholderTextColor={theme.textMuted}
                  onFocus={() => { emailFocus.value = 1; }} onBlur={() => { emailFocus.value = 0; }}
                  style={[styles.input, inputShadow, { color: theme.text, backgroundColor: theme.field }, emailStyle]}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: theme.textMuted }]}>PASSWORD</Text>
                <AnimatedTextInput
                  secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={theme.textMuted}
                  onFocus={() => { passwordFocus.value = 1; }} onBlur={() => { passwordFocus.value = 0; }}
                  style={[styles.input, inputShadow, { color: theme.text, backgroundColor: theme.field }, passwordStyle]}
                />
              </View>
              {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
              <ActionButton label="Sign in securely" loading={busy} disabled={busy || !email || !password} onPress={submit} haptic={null} />
              <ActionButton label="Continue with Google" icon={GoogleLogo as never} variant="secondary" loading={busy} onPress={async () => { setBusy(true); setError(null); try { await signInWithGoogle(); router.replace('/' as never); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Google sign in failed'); } finally { setBusy(false); } }} />
              {Platform.OS === 'ios' ? <AppleAuthentication.AppleAuthenticationButton accessibilityLabel="Sign in with Apple" buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={theme.mode === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={10} style={styles.apple} onPress={() => void apple()} /> : null}
              <PressableScale accessibilityRole="button" accessibilityLabel="Create account" onPress={() => router.push('/(onboarding)/sign-up' as never)} style={styles.create}><Text style={[styles.createText, { color: theme.accent }]}>New to PolyClaw? Create an account</Text></PressableScale>
            </View>
          </Animated.View>
        </Staggered>
        {offeredBiometric ? (
          <View style={[styles.offerCard, { backgroundColor: theme.panelRaised, borderColor: theme.border }]}>
            <Scan size={20} color={theme.accent} />
            <View style={styles.flex}><Text style={[styles.offerTitle, { color: theme.text }]}>Enable Face ID?</Text><Text style={[styles.offerCopy, { color: theme.textMuted }]}>Unlock live data instantly next time.</Text></View>
            <PressableScale accessibilityRole="button" onPress={() => finishWithBiometric(false)} containerStyle={styles.offerButton} style={({ pressed }) => [styles.offerSecondary, { borderColor: theme.border }, pressed && styles.pressed]}><Text style={[styles.offerSecondaryText, { color: theme.textSoft }]}>Not now</Text></PressableScale>
            <PressableScale accessibilityRole="button" onPress={() => finishWithBiometric(true)} containerStyle={styles.offerButton} style={({ pressed }) => [{ backgroundColor: theme.accentStrong }, pressed && styles.pressed]}><Text style={[styles.offerPrimaryText, { color: theme.accentInk }]}>Enable</Text></PressableScale>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const inputShadow = { shadowColor: '#8B5CF6', shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 0 };
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 28, gap: 12 },
  flex: { flex: 1 },
  kicker: { fontFamily: fonts.bold, letterSpacing: 2, fontSize: 10 },
  title: { fontFamily: fonts.bold, fontSize: 32, letterSpacing: -1.4, marginBottom: 10 },
  form: { gap: spacing.lg },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.3, marginBottom: 7 },
  input: { height: 54, borderWidth: 1.5, borderRadius: radius.sm + 2, paddingHorizontal: 15, fontFamily: fonts.medium, fontSize: 15 },
  error: { fontFamily: fonts.medium, fontSize: 13 },
  offerCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 11 },
  offerTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  offerCopy: { fontFamily: fonts.regular, fontSize: 11, marginTop: 3 },
  offerButton: { borderRadius: radius.sm },
  offerSecondary: { borderWidth: 1, paddingHorizontal: 12, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  offerSecondaryText: { fontFamily: fonts.semibold, fontSize: 12 },
  offerPrimaryText: { fontFamily: fonts.bold, fontSize: 12 },
  pressed: { opacity: 0.85 },
  apple: { height: 50, width: '100%' },
  create: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  createText: { fontFamily: fonts.semibold, fontSize: 13 },
});
