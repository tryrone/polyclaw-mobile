import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { fonts, spacing, usePolyClawTheme } from '@/theme';

export default function SignUpScreen() {
  const { theme } = usePolyClawTheme();
  const { signUp, signInWithApple, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signUp({ name, email, password });
      router.replace('/home');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.replace('/home');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign up failed');
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
      router.replace('/home');
    } catch (caught) {
      if ((caught as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setError(caught instanceof Error ? caught.message : 'Apple sign up failed');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScaffold>
      <AuthBrand />
      <AuthIntro
        copy="Create your profile, complete wallet setup, and set your limits before PolyClaw places real-money trades for you."
        eyebrow="AUTOMATED POLYMARKET TRADING"
        title="Put your bot to work"
      />
      <OAuthButtons action="sign-up" busy={busy} onApple={() => void apple()} onGoogle={() => void google()} />
      <AuthDivider label="OR" />
      <View style={styles.fields}>
        <AuthField
          autoComplete="name"
          label="Name"
          onChangeText={setName}
          placeholder="Name"
          textContentType="name"
          value={name}
        />
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
          autoComplete="new-password"
          label="Password"
          onChangeText={setPassword}
          placeholder="Password · 8+ characters"
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
        <AuthPrimaryButton
          accessibilityLabel="Create account"
          disabled={busy || name.trim().length < 2 || !email || password.length < 8}
          label="Create account"
          loading={busy}
          onPress={() => void submit()}
        />
      </View>
      <AuthSwitchLink
        accessibilityLabel="Already have an account? Sign in"
        action="Sign in"
        onPress={() => router.replace('/(onboarding)/sign-in' as never)}
        prefix="Already have an account?"
      />
      <AuthFootnote>Live trading requires a funded dedicated wallet, eligibility checks, and your approval. Trading can lose money.</AuthFootnote>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  error: { fontFamily: fonts.medium, fontSize: 12.5 },
});
