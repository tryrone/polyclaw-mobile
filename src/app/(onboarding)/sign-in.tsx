import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { Scan } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useAuth } from '@/auth/provider';
import {
  AuthBrand,
  AuthDivider,
  AuthField,
  AuthFootnote,
  AuthIntro,
  AuthPrimaryButton,
  AuthScaffold,
  AuthSwitchLink,
  OAuthButtons,
} from '@/components/auth-onboarding';
import { haptics, PressableScale, useReducedMotion } from '@/components/motion';
import { fonts, layout, motion, radius, spacing, usePolyClawTheme } from '@/theme';

export default function SignInScreen() {
  const { theme } = usePolyClawTheme();
  const {
    signIn,
    signInWithApple,
    signInWithGoogle,
    biometricSupported,
    biometricEnabled,
    setBiometricEnabled,
  } = useAuth();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offeredBiometric, setOfferedBiometric] = useState(false);
  const shake = useSharedValue(0);
  const previousError = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== previousError.current && !reduce) {
      shake.value = withSequence(
        withTiming(-9, motion.fast),
        withTiming(9, motion.fast),
        withTiming(-5, motion.fast),
        withTiming(5, motion.fast),
        withTiming(0, motion.base),
      );
      haptics.error();
    }
    previousError.current = error;
  }, [error, reduce, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      if (!reduce) haptics.success();
      setOfferedBiometric(biometricSupported && !biometricEnabled);
      if (!(biometricSupported && !biometricEnabled)) router.replace('/' as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.replace('/' as never);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const apple = async () => {
    setBusy(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
      await signInWithApple({
        identityToken: credential.identityToken,
        givenName: credential.fullName?.givenName ?? undefined,
        familyName: credential.fullName?.familyName ?? undefined,
      });
      router.replace('/' as never);
    } catch (caught) {
      if ((caught as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setError(caught instanceof Error ? caught.message : 'Apple sign in failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const finishWithBiometric = (enabled: boolean) => {
    setBiometricEnabled(enabled);
    if (enabled) haptics.success();
    router.replace('/' as never);
  };

  return (
    <AuthScaffold>
      <AuthBrand />
      <AuthIntro
        copy="Return to your Polymarket portfolio, bot controls, wallet, and full trade history."
        eyebrow="WELCOME BACK"
        title="Your bot is waiting"
      />
      <OAuthButtons action="sign-in" busy={busy} onApple={() => void apple()} onGoogle={() => void google()} />
      <AuthDivider label="OR" />
      <Animated.View style={[shakeStyle, styles.fields]}>
        <AuthField
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          placeholder="Email address"
          textContentType="emailAddress"
          value={email}
        />
        <AuthField
          autoComplete="current-password"
          label="Password"
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          textContentType="password"
          value={password}
        />
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
        <AuthPrimaryButton
          accessibilityLabel="Sign in securely"
          disabled={busy || !email || !password}
          label="Sign in securely"
          loading={busy}
          onPress={() => void submit()}
        />
      </Animated.View>
      <AuthSwitchLink
        accessibilityLabel="New to PolyClaw? Create an account"
        action="Create an account"
        onPress={() => router.push('/(onboarding)/sign-up' as never)}
        prefix="New to PolyClaw?"
      />
      <AuthFootnote>Your trading account stays protected by BetsClaw authentication and Face ID.</AuthFootnote>
      {offeredBiometric ? (
        <View style={[styles.offerCard, { backgroundColor: theme.panelRaised, borderColor: theme.border }]}>
          <Scan color={theme.accent} size={20} />
          <View style={styles.flex}>
            <Text style={[styles.offerTitle, { color: theme.text }]}>Enable Face ID?</Text>
            <Text style={[styles.offerCopy, { color: theme.textMuted }]}>Unlock live data instantly next time.</Text>
          </View>
          <PressableScale
            accessibilityLabel="Not now"
            accessibilityRole="button"
            containerStyle={styles.offerButton}
            onPress={() => finishWithBiometric(false)}
            style={({ pressed }) => [styles.offerSecondary, { borderColor: theme.border }, pressed && styles.pressed]}>
            <Text style={[styles.offerSecondaryText, { color: theme.textSoft }]}>Not now</Text>
          </PressableScale>
          <PressableScale
            accessibilityLabel="Enable Face ID"
            accessibilityRole="button"
            containerStyle={styles.offerButton}
            onPress={() => finishWithBiometric(true)}
            style={({ pressed }) => [styles.offerPrimary, { backgroundColor: theme.accentStrong }, pressed && styles.pressed]}>
            <Text style={[styles.offerPrimaryText, { color: theme.accentInk }]}>Enable</Text>
          </PressableScale>
        </View>
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  error: { fontFamily: fonts.medium, fontSize: 13 },
  flex: { flex: 1 },
  offerCard: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 11, padding: spacing.lg },
  offerTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  offerCopy: { fontFamily: fonts.regular, fontSize: 11, marginTop: 3 },
  offerButton: { borderRadius: layout.controlRadius, overflow: 'hidden' },
  offerSecondary: { alignItems: 'center', borderRadius: layout.controlRadius, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  offerPrimary: { alignItems: 'center', borderRadius: layout.controlRadius, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  offerSecondaryText: { fontFamily: fonts.semibold, fontSize: 12 },
  offerPrimaryText: { fontFamily: fonts.bold, fontSize: 12 },
  pressed: { opacity: 0.85 },
});
