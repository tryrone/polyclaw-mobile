import { AppleLogo, Eye, EyeSlash } from 'phosphor-react-native';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion';
import { fonts, layout, radius, spacing, usePolyClawTheme, type Theme } from '@/theme';

const GOOGLE_G_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAACA0lEQVR42p2Qz2sTQRSAR9KUUqs37dVKDy3FQDKzKeTgZncNAVuq2c1BBP8VDyZRBAsePJiKB0uTnaDFYumvNKCIaNXipQcvQigekt30YrJFs1scZxMaOtt1xD74GHbfe9+8N8AbBIBTphKdMiS4YCqwWleg42JIwi4FNyQ049YAXtQkYcJQhI+mIhAedRl+3rsyOe4rocmEKQkWR8Aio3XfSbySuiLYhoSWDRndoU23TQW9dP91c+htIxY7c0xEE9vsbcK7WiI64lN3keYf1RKh08ckTjkwtT87TBpJ2JHQB/1UFcUB8L9hV/oKTiVIfhXOksa1S3ZdngyBk4S9Gai6oo5stX/Lr0bKWQt8mipol4OOK+kSmPMTyTmL8JCyrcegXQke9ESbgSccEYfWU2a1vY2BL/6i1hJDtrnimeg+sCr92JXsrJ8j08+vElTUwozFX5xgRHetW+B7eUhdXBklMZwiCGsE6eo2fDU9+DcJzJOgnG1tHUrimeYBFQ93knSKD67kEKir78Ol9KhXEppPnRcf7Kwy75OxSr2CsH59PFLUmkdl9NuBWFuDWM0hXcvQc5FeuI8KN39ffvimO03O+iHe+3mBHVnX4qyMTyyfr8WzVtJ//4I61luTz1dYSkfBvyKC1SQqqs9owzdUTLURTtn03I3o2guE0zfE12Kft+cPp/rL+NBPzN8AAAAASUVORK5CYII=';

function authControlColors(theme: Theme) {
  return theme.mode === 'dark'
    ? { background: 'rgba(27,27,30,0.96)', border: 'rgba(255,255,255,0.08)', text: '#F5F5F7' }
    : { background: 'rgba(255,255,255,0.92)', border: 'rgba(15,23,42,0.10)', text: '#111827' };
}

export function AuthScaffold({ children }: { children: ReactNode }) {
  const { theme } = usePolyClawTheme();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoider}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthBrand() {
  return (
    <View
      accessibilityLabel="PolyClaw"
      accessibilityRole="image"
      style={styles.brandLogoFrame}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={require('../../assets/images/splash-icon.png')}
        style={styles.brandLogo}
      />
    </View>
  );
}

export function AuthIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  const { theme } = usePolyClawTheme();

  return (
    <View style={styles.intro}>
      <Text maxFontSizeMultiplier={1.4} style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text maxFontSizeMultiplier={2} style={[styles.copy, { color: theme.textSoft }]}>{copy}</Text>
    </View>
  );
}

export function AuthCard({ children, title, detail }: { children: ReactNode; title: string; detail?: string }) {
  const { theme } = usePolyClawTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.panel,
          borderColor: theme.border,
          shadowColor: theme.shadow.color,
          shadowOpacity: theme.shadow.opacity,
        },
      ]}>
      <View style={styles.cardHeading}>
        <Text maxFontSizeMultiplier={1.6} style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        {detail ? <Text maxFontSizeMultiplier={2} style={[styles.cardDetail, { color: theme.textMuted }]}>{detail}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function AuthField({ label, helper, ...inputProps }: ComponentProps<typeof TextInput> & { label: string; helper?: string }) {
  const { theme } = usePolyClawTheme();
  const controlColors = authControlColors(theme);
  const isPassword = inputProps.secureTextEntry === true;
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <View
        style={[
          styles.inputShell,
          { backgroundColor: controlColors.background, borderColor: controlColors.border },
        ]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          maxFontSizeMultiplier={1.8}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={isPassword ? !passwordVisible : inputProps.secureTextEntry}
          selectionColor={theme.accent}
          style={[
            styles.input,
            { color: controlColors.text },
            isPassword && styles.passwordInput,
            inputProps.style,
          ]}
        />
        {isPassword ? (
          <PressableScale
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={4}
            haptic={null}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}>
            {passwordVisible
              ? <EyeSlash color={theme.textMuted} size={20} weight="regular" />
              : <Eye color={theme.textMuted} size={20} weight="regular" />}
          </PressableScale>
        ) : null}
      </View>
      {helper ? <Text maxFontSizeMultiplier={2} style={[styles.helper, { color: theme.textMuted }]}>{helper}</Text> : null}
    </View>
  );
}

export function AuthDivider({ label = 'OR CONTINUE WITH' }: { label?: string }) {
  const { theme } = usePolyClawTheme();

  return (
    <View accessibilityElementsHidden style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      <Text maxFontSizeMultiplier={1.4} style={[styles.dividerLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

export function OAuthButtons({
  action,
  busy,
  onApple,
  onGoogle,
}: {
  action: 'sign-in' | 'sign-up';
  busy: boolean;
  onApple: () => void;
  onGoogle: () => void;
}) {
  const { theme } = usePolyClawTheme();
  const verb = action === 'sign-up' ? 'Sign up' : 'Sign in';
  const controlColors = authControlColors(theme);

  return (
    <View style={styles.oauthStack}>
      <PressableScale
        accessibilityLabel={`${verb} with Google`}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        containerStyle={styles.oauthButtonContainer}
        disabled={busy}
        haptic={null}
        onPress={onGoogle}
        style={({ pressed }) => [
          styles.oauthPill,
          { backgroundColor: controlColors.background, borderColor: controlColors.border },
          pressed && styles.googleButtonPressed,
          busy && styles.disabled,
        ]}>
        <View style={styles.googleIconFrame}>
          {busy
            ? <ActivityIndicator color="#4285F4" size="small" />
            : <Image accessibilityIgnoresInvertColors source={{ uri: GOOGLE_G_DATA_URI }} style={styles.googleIcon} />}
        </View>
        <Text maxFontSizeMultiplier={1.3} style={[styles.googleLabel, { color: controlColors.text }]}>Google</Text>
      </PressableScale>
      {Platform.OS === 'ios' ? (
        <PressableScale
          accessibilityLabel={`${verb} with Apple`}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          containerStyle={styles.oauthButtonContainer}
          disabled={busy}
          haptic={null}
          onPress={onApple}
          style={({ pressed }) => [
            styles.oauthPill,
            { backgroundColor: controlColors.background, borderColor: controlColors.border },
            pressed && styles.googleButtonPressed,
            busy && styles.disabled,
          ]}>
          <AppleLogo color={controlColors.text} size={19} weight="fill" />
          <Text maxFontSizeMultiplier={1.3} style={[styles.googleLabel, { color: controlColors.text }]}>Apple</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

export function AuthPrimaryButton({ label, loading = false, ...props }: PressableProps & { label: string; loading?: boolean }) {
  const { theme } = usePolyClawTheme();
  const inactive = props.disabled || loading;

  return (
    <PressableScale
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: loading }}
      containerStyle={styles.primaryButtonContainer}
      disabled={inactive}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.text }, inactive && styles.disabled, pressed && styles.primaryButtonPressed]}>
      {loading ? <ActivityIndicator color={theme.background} size="small" /> : null}
      <Text maxFontSizeMultiplier={1.4} style={[styles.primaryButtonLabel, { color: theme.background }]}>{label}</Text>
    </PressableScale>
  );
}

export function AuthFootnote({ children }: { children: ReactNode }) {
  const { theme } = usePolyClawTheme();
  return <Text maxFontSizeMultiplier={1.8} style={[styles.footnote, { color: theme.textMuted }]}>{children}</Text>;
}

export function AuthSwitchLink({ prefix, action, accessibilityLabel, onPress }: { prefix: string; action: string; accessibilityLabel: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.switchLink}>
      <Text maxFontSizeMultiplier={1.7} style={[styles.switchPrefix, { color: theme.textMuted }]}>{prefix} </Text>
      <Text maxFontSizeMultiplier={1.7} style={[styles.switchAction, { color: theme.accent }]}>{action}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, overflow: 'hidden' },
  keyboardAvoider: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl, paddingTop: spacing.lg },
  content: { alignSelf: 'center', gap: spacing.lg, maxWidth: 520, paddingHorizontal: layout.onboardingGutter, width: '100%' },
  brandLogoFrame: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#08060F', borderColor: 'rgba(196,181,253,0.22)', borderRadius: 18, borderWidth: 1, height: 60, justifyContent: 'center', shadowColor: '#7C3AED', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.22, shadowRadius: 18, width: 60 },
  brandLogo: { height: 49, width: 49 },
  intro: { alignItems: 'center', alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.8, textAlign: 'center' },
  title: { alignSelf: 'stretch', fontFamily: fonts.displayExtraBold, fontSize: 34, letterSpacing: -1.35, textAlign: 'center' },
  copy: { alignSelf: 'center', fontFamily: fonts.regular, fontSize: 14, maxWidth: 400, textAlign: 'center', width: '100%' },
  card: { borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, padding: spacing.lg, shadowOffset: { height: 16, width: 0 }, shadowRadius: 28 },
  cardHeading: { gap: spacing.xs },
  cardTitle: { fontFamily: fonts.display, fontSize: 17 },
  cardDetail: { fontFamily: fonts.regular, fontSize: 12 },
  fieldGroup: { gap: 7 },
  inputShell: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 50, overflow: 'hidden' },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, height: '100%', paddingHorizontal: spacing.lg },
  passwordInput: { paddingRight: spacing.xs },
  passwordToggle: { alignItems: 'center', height: 44, justifyContent: 'center', marginRight: 3, width: 44 },
  passwordTogglePressed: { opacity: 0.6 },
  helper: { fontFamily: fonts.regular, fontSize: 11 },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.25 },
  oauthStack: { flexDirection: 'row', gap: spacing.sm },
  oauthButtonContainer: { borderRadius: radius.pill, flex: 1, overflow: 'hidden' },
  oauthPill: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.sm, height: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  googleButtonPressed: { opacity: 0.86 },
  googleIconFrame: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
  googleIcon: { height: 18, width: 18 },
  googleLabel: { fontFamily: fonts.medium, fontSize: 12.5 },
  primaryButtonContainer: { alignSelf: 'stretch', borderRadius: radius.pill, overflow: 'hidden' },
  primaryButton: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 50, overflow: 'hidden', paddingHorizontal: spacing.lg },
  primaryButtonLabel: { fontFamily: fonts.bold, fontSize: 13 },
  primaryButtonPressed: { opacity: 0.9 },
  disabled: { opacity: 0.45 },
  switchLink: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 44 },
  switchPrefix: { fontFamily: fonts.medium, fontSize: 13 },
  switchAction: { fontFamily: fonts.bold, fontSize: 13 },
  footnote: { fontFamily: fonts.regular, fontSize: 10.5, textAlign: 'center' },
});
