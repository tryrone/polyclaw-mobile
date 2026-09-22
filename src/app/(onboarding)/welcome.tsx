import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBrand } from '@/components/auth-onboarding';
import { ArrowRight, Bot, History, ShieldCheck } from '@/components/modern-icons';
import { PressableScale, Staggered } from '@/components/motion';
import { fonts, layout, radius, spacing, usePolyClawTheme } from '@/theme';

const benefits = [
  { icon: Bot, label: 'AUTO TRADING' },
  { icon: ShieldCheck, label: 'RISK CONTROLS' },
  { icon: History, label: 'CLEAR HISTORY' },
];

export default function WelcomeScreen() {
  const { theme } = usePolyClawTheme();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={theme.mode === 'dark'
          ? ['rgba(37,99,235,0.78)', 'rgba(109,40,217,0.42)', 'rgba(8,6,15,0)']
          : ['rgba(59,130,246,0.48)', 'rgba(139,92,246,0.24)', 'rgba(247,246,251,0)']}
        end={{ x: 0.58, y: 1 }}
        pointerEvents="none"
        start={{ x: 0.5, y: 0 }}
        style={styles.skyGlow}
      />
      <LinearGradient
        colors={['rgba(34,211,238,0.24)', 'rgba(34,211,238,0)']}
        pointerEvents="none"
        style={styles.sideGlow}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Staggered index={0}>
            <AuthBrand />
          </Staggered>

          <Staggered index={1} style={styles.heroWrap}>
            <View accessibilityLabel="Example PolyClaw automated Polymarket trade signal" style={styles.hero}>
              <View style={[styles.orbitOuter, { borderColor: theme.mode === 'dark' ? 'rgba(165,243,252,0.18)' : 'rgba(37,99,235,0.14)' }]} />
              <View style={[styles.orbitInner, { borderColor: theme.mode === 'dark' ? 'rgba(196,181,253,0.20)' : 'rgba(109,40,217,0.14)' }]} />
              <LinearGradient
                colors={theme.mode === 'dark' ? ['#2563EB', '#6D28D9', '#08060F'] : ['#60A5FA', '#A78BFA', '#F7F6FB']}
                end={{ x: 0.72, y: 1 }}
                start={{ x: 0.24, y: 0 }}
                style={styles.orb}
              >
                <View style={styles.orbShine} />
              </LinearGradient>

              <View style={[styles.signalCard, { backgroundColor: theme.mode === 'dark' ? 'rgba(12,15,28,0.88)' : 'rgba(255,255,255,0.91)', borderColor: theme.mode === 'dark' ? 'rgba(165,243,252,0.24)' : theme.border }]}>
                <View style={styles.signalHeader}>
                  <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                  <Text maxFontSizeMultiplier={1} style={[styles.signalEyebrow, { color: theme.textMuted }]}>POLYMARKET SIGNAL</Text>
                  <Text maxFontSizeMultiplier={1} style={[styles.signalScore, { color: theme.success }]}>72%</Text>
                </View>
                <Text maxFontSizeMultiplier={1} style={[styles.signalMatch, { color: theme.text }]}>Arsenal vs Liverpool</Text>
                <Text maxFontSizeMultiplier={1} style={[styles.signalPick, { color: theme.textSoft }]}>Under 2.5 total goals</Text>
                <View style={[styles.track, { backgroundColor: theme.greySoft }]}>
                  <LinearGradient colors={['#4776FF', '#8BE7F7']} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={styles.progress} />
                </View>
              </View>

              <View style={[styles.floatingChip, styles.balanceChip, { backgroundColor: theme.mode === 'dark' ? 'rgba(15,12,24,0.88)' : 'rgba(255,255,255,0.92)', borderColor: theme.border }]}>
                <Text maxFontSizeMultiplier={1} style={[styles.chipLabel, { color: theme.textMuted }]}>BOT WALLET</Text>
                <Text maxFontSizeMultiplier={1} style={[styles.chipValue, { color: theme.text }]}>$25.00</Text>
              </View>
              <View style={[styles.floatingChip, styles.riskChip, { backgroundColor: theme.mode === 'dark' ? 'rgba(15,12,24,0.88)' : 'rgba(255,255,255,0.92)', borderColor: theme.border }]}>
                <ShieldCheck color={theme.success} size={16} />
                <Text maxFontSizeMultiplier={1} style={[styles.riskLabel, { color: theme.textSoft }]}>Risk limits on</Text>
              </View>
            </View>
          </Staggered>

          <Staggered index={2} style={styles.intro}>
            <Text maxFontSizeMultiplier={1.25} style={[styles.kicker, { color: theme.accent }]}>AUTOMATED POLYMARKET TRADING</Text>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={[styles.title, { color: theme.text }]}>Trade on Polymarket.{`\n`}Automatically.</Text>
            <Text maxFontSizeMultiplier={1.45} style={[styles.copy, { color: theme.textSoft }]}>Fund your dedicated wallet, set your risk limits, and let PolyClaw place eligible Polymarket trades for you.</Text>
          </Staggered>

          <Staggered index={3} style={styles.actions}>
            <PressableScale
              accessibilityLabel="Create a PolyClaw account"
              accessibilityRole="button"
              containerStyle={[styles.primaryContainer, { shadowColor: theme.accent }]}
              onPress={() => router.push('/(onboarding)/sign-up' as never)}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <LinearGradient colors={theme.accentGradient} end={{ x: 1, y: 0.5 }} start={{ x: 0, y: 0.5 }} style={styles.primaryFill}>
                <Text maxFontSizeMultiplier={1.25} style={[styles.primaryLabel, { color: theme.accentInk }]}>Create account</Text>
                <ArrowRight color={theme.accentInk} size={19} />
              </LinearGradient>
            </PressableScale>
            <PressableScale
              accessibilityLabel="Already have an account? Sign in"
              accessibilityRole="button"
              haptic={null}
              onPress={() => router.push('/(onboarding)/sign-in' as never)}
              style={styles.signInButton}>
              <Text maxFontSizeMultiplier={1.4} style={[styles.signInPrefix, { color: theme.textMuted }]}>Already have an account? </Text>
              <Text maxFontSizeMultiplier={1.4} style={[styles.signInAction, { color: theme.text }]}>Sign in</Text>
            </PressableScale>
          </Staggered>

          <Staggered index={4}>
            <View style={styles.benefits}>
              {benefits.map(({ icon: Icon, label }) => (
                <View key={label} style={styles.benefit}>
                  <View style={[styles.benefitIcon, { backgroundColor: theme.accentSoft }]}><Icon color={theme.accent} size={16} /></View>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.benefitLabel, { color: theme.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>
          </Staggered>

          <Text maxFontSizeMultiplier={1.5} style={[styles.footer, { color: theme.textMuted }]}>Real-money trading involves risk. Profits are not guaranteed, and you can lose money.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, overflow: 'hidden' },
  skyGlow: { height: 500, left: -110, position: 'absolute', right: -110, top: -180 },
  sideGlow: { borderRadius: 190, height: 380, opacity: 0.84, position: 'absolute', right: -210, top: 120, width: 380 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.lg, paddingTop: spacing.md },
  content: { alignSelf: 'center', gap: spacing.lg, maxWidth: 520, paddingHorizontal: layout.onboardingGutter, width: '100%' },
  heroWrap: { alignItems: 'center' },
  hero: { height: 270, maxWidth: 410, position: 'relative', width: '100%' },
  orbitOuter: { borderRadius: 125, borderWidth: 1, height: 250, left: '50%', marginLeft: -125, position: 'absolute', top: 8, width: 250 },
  orbitInner: { borderRadius: 96, borderWidth: 1, height: 192, left: '50%', marginLeft: -96, position: 'absolute', top: 37, width: 192 },
  orb: { borderRadius: 82, height: 164, left: '50%', marginLeft: -82, overflow: 'hidden', position: 'absolute', shadowColor: '#2563EB', shadowOffset: { height: 16, width: 0 }, shadowOpacity: 0.5, shadowRadius: 36, top: 51, width: 164 },
  orbShine: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 48, height: 96, left: 24, position: 'absolute', top: -26, transform: [{ rotate: '-14deg' }], width: 50 },
  signalCard: { borderRadius: radius.md, borderWidth: 1, bottom: 12, left: '50%', marginLeft: -142, padding: spacing.md, position: 'absolute', shadowColor: '#020617', shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.42, shadowRadius: 24, width: 284 },
  signalHeader: { alignItems: 'center', flexDirection: 'row' },
  statusDot: { borderRadius: 3, height: 6, marginRight: 6, width: 6 },
  signalEyebrow: { flex: 1, fontFamily: fonts.bold, fontSize: 8.5, letterSpacing: 1.35 },
  signalScore: { fontFamily: fonts.bold, fontSize: 11 },
  signalMatch: { fontFamily: fonts.display, fontSize: 14, marginTop: 8 },
  signalPick: { fontFamily: fonts.medium, fontSize: 12, marginTop: 3 },
  track: { borderRadius: radius.pill, height: 4, marginTop: 11, overflow: 'hidden' },
  progress: { borderRadius: radius.pill, height: 4, width: '72%' },
  floatingChip: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', position: 'absolute', shadowColor: '#020617', shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.28, shadowRadius: 16 },
  balanceChip: { left: 0, paddingHorizontal: 12, paddingVertical: 9, top: 45 },
  riskChip: { gap: 7, paddingHorizontal: 11, paddingVertical: 9, right: 0, top: 82 },
  chipLabel: { fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1 },
  chipValue: { fontFamily: fonts.display, fontSize: 12, marginLeft: 7 },
  riskLabel: { fontFamily: fonts.semibold, fontSize: 10 },
  intro: { alignItems: 'center', gap: spacing.sm },
  kicker: { fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.8, textAlign: 'center' },
  title: { alignSelf: 'stretch', fontFamily: fonts.displayExtraBold, fontSize: 37, letterSpacing: -1.7, textAlign: 'center' },
  copy: { fontFamily: fonts.regular, fontSize: 14, maxWidth: 390, textAlign: 'center' },
  actions: { gap: spacing.sm },
  primaryContainer: { borderRadius: layout.controlRadius, overflow: 'hidden', shadowColor: '#4F8CFF', shadowOffset: { height: 9, width: 0 }, shadowOpacity: 0.3, shadowRadius: 18 },
  primary: { borderRadius: layout.controlRadius, minHeight: 54, overflow: 'hidden' },
  primaryFill: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 54, paddingHorizontal: spacing.lg },
  primaryLabel: { color: '#07101D', fontFamily: fonts.bold, fontSize: 15 },
  pressed: { opacity: 0.9 },
  signInButton: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', minHeight: 44 },
  signInPrefix: { fontFamily: fonts.medium, fontSize: 12.5 },
  signInAction: { fontFamily: fonts.bold, fontSize: 12.5 },
  benefits: { borderTopColor: 'rgba(155,150,171,0.18)', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.lg },
  benefit: { alignItems: 'center', flex: 1, gap: 7 },
  benefitIcon: { alignItems: 'center', borderRadius: 12, height: 34, justifyContent: 'center', width: 34 },
  benefitLabel: { fontFamily: fonts.bold, fontSize: 7.5, letterSpacing: 0.75, textAlign: 'center' },
  footer: { fontFamily: fonts.regular, fontSize: 10, textAlign: 'center' },
});
