import { router } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'phosphor-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBrand } from '@/components/auth-onboarding';
import { PressableScale } from '@/components/motion';
import { fonts, layout, spacing, usePolyClawTheme } from '@/theme';

export default function WelcomeScreen() {
  const { theme } = usePolyClawTheme();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <AuthBrand />
          <View style={styles.hero}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>POLYCLAW</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Your limits.{`\n`}Our trades.</Text>
            <Text style={[styles.copy, { color: theme.textSoft }]}>Fund your Polymarket account, choose how much can be traded, and stay in control.</Text>
          </View>
          <View style={[styles.explainer, { borderColor: theme.border }]}>
            <View style={styles.explainerRow}>
              <ShieldCheck color={theme.accent} size={20} />
              <View style={styles.explainerCopy}>
                <Text style={[styles.explainerTitle, { color: theme.text }]}>Built around your limits</Text>
                <Text style={[styles.explainerDetail, { color: theme.textMuted }]}>Every trade respects your per-trade and daily maximums. Pause anytime.</Text>
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            <PressableScale accessibilityLabel="Create a PolyClaw account" accessibilityRole="button" onPress={() => router.push('/(onboarding)/sign-up' as never)} style={({ pressed }) => [styles.primary, { backgroundColor: theme.text }, pressed && styles.pressed]}>
              <Text style={[styles.primaryLabel, { color: theme.background }]}>Create account</Text>
              <ArrowRight color={theme.background} size={19} />
            </PressableScale>
            <PressableScale accessibilityLabel="Sign in" accessibilityRole="button" haptic={null} onPress={() => router.push('/(onboarding)/sign-in' as never)} style={styles.secondary}>
              <Text style={[styles.secondaryLabel, { color: theme.text }]}>Sign in</Text>
            </PressableScale>
          </View>
          <Text style={[styles.footer, { color: theme.textMuted }]}>Real-money trading involves risk. You can lose money.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  content: { alignSelf: 'center', gap: spacing.xl, maxWidth: 520, paddingHorizontal: layout.onboardingGutter, width: '100%' },
  hero: { gap: spacing.md, paddingVertical: spacing.xl },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 46, letterSpacing: -2, lineHeight: 49 },
  copy: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, maxWidth: 420 },
  explainer: { borderBottomWidth: 1, borderTopWidth: 1, paddingVertical: spacing.lg },
  explainerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  explainerCopy: { flex: 1, gap: 4 },
  explainerTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  explainerDetail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  actions: { gap: spacing.sm },
  primary: { alignItems: 'center', borderRadius: layout.controlRadius, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 54, paddingHorizontal: spacing.lg },
  primaryLabel: { fontFamily: fonts.bold, fontSize: 15 },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  secondaryLabel: { fontFamily: fonts.semibold, fontSize: 14 },
  pressed: { opacity: 0.82 },
  footer: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
