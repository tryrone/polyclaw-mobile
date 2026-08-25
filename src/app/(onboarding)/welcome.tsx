import { router } from 'expo-router';
import { Activity, ChevronDown, History, ShieldCheck } from '@/components/modern-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics, PressableScale, Staggered, useReducedMotion } from '@/components/motion';
import { fonts, motion, radius, spacing, usePolyClawTheme } from '@/theme';

const valueRows = [
  { icon: Activity, title: 'Automatic paper trading', detail: 'Eligible model decisions appear in your simulated portfolio automatically.' },
  { icon: ShieldCheck, title: 'Server-enforced risk', detail: 'Your profile, daily cap, and drawdown halt are applied to every decision.' },
  { icon: History, title: 'Clear decision history', detail: 'See simulated stakes, skipped decisions, outcomes, and P&L.' },
];

export default function WelcomeScreen() {
  const { theme } = usePolyClawTheme();
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const chevron = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${chevron.value * 180}deg` }] }));
  const toggle = () => {
    if (!reduce) haptics.select();
    chevron.value = withSpring(expanded ? 0 : 1, motion.press);
    setExpanded((value) => !value);
  };
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={theme.accentGradient} style={[styles.orbA, { opacity: theme.mode === 'dark' ? 0.3 : 0.16 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <LinearGradient colors={theme.accentGradient} style={[styles.orbB, { opacity: theme.mode === 'dark' ? 0.18 : 0.1 }]} />
      <View style={styles.content}>
        <Animated.View entering={reduce ? undefined : FadeInDown.springify().stiffness(motion.enter.stiffness).damping(motion.enter.damping)}>
          <LinearGradient colors={theme.accentGradient} style={styles.mark}>
            <Text style={[styles.markText, { color: theme.accentInk }]}>P</Text>
          </LinearGradient>
        </Animated.View>
        <Staggered index={1}><Text style={[styles.kicker, { color: theme.accent }]}>YOUR AUTOMATED PAPER BOT</Text></Staggered>
        <Staggered index={2}><Text style={[styles.title, { color: theme.text }]}>Set your risk.{'\n'}Let PolyClaw work.</Text></Staggered>
        <Staggered index={3}><Text style={[styles.copy, { color: theme.textMuted }]}>Start with a fixed $1,000 simulation and follow every model-driven decision without funding a wallet.</Text></Staggered>
        <Staggered index={4} style={styles.ctaWrap}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Get started" onPress={() => router.push('/(onboarding)/sign-up' as never)} containerStyle={[styles.ctaShadow, { shadowColor: theme.accentStrong }]} style={({ pressed }) => [styles.cta, { backgroundColor: theme.accentStrong }, pressed && styles.pressed]}>
            <Text style={[styles.ctaText, { color: theme.accentInk }]}>Get started</Text>
          </PressableScale>
        </Staggered>
        <Staggered index={5} style={{ width: '100%' }}>
          <PressableScale accessibilityRole="button" onPress={toggle} haptic={null} containerStyle={styles.expander} style={styles.expanderInner}>
            <Text style={[styles.expanderLabel, { color: theme.textSoft }]}>What PolyClaw does</Text>
            <Animated.View style={chevronStyle}><ChevronDown size={17} color={theme.textMuted} /></Animated.View>
          </PressableScale>
          {expanded ? (
            <View style={[styles.rows, { borderColor: theme.border }]}>
              {valueRows.map(({ icon: Icon, title, detail }, index) => (
                <Staggered key={title} index={index + 6}>
                  <View style={styles.row}>
                    <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}><Icon size={17} color={theme.accent} /></View>
                    <View style={styles.flex}><Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.rowDetail, { color: theme.textMuted }]}>{detail}</Text></View>
                  </View>
                </Staggered>
              ))}
            </View>
          ) : null}
        </Staggered>
      </View>
      <Text style={[styles.footer, { color: theme.textMuted }]}>Paper trading only. No guaranteed returns. Live wallets remain unavailable.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  orbA: { position: 'absolute', width: 340, height: 340, borderRadius: 170, top: -110, right: -90 },
  orbB: { position: 'absolute', width: 220, height: 220, borderRadius: 110, bottom: -70, left: -60 },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 28, gap: 14 },
  mark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: '#6D28D9', shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  markText: { fontFamily: fonts.bold, fontSize: 26 },
  kicker: { fontFamily: fonts.bold, letterSpacing: 2, fontSize: 10 },
  title: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 43, letterSpacing: -1.8 },
  copy: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, maxWidth: 380 },
  ctaWrap: { marginTop: spacing.lg },
  cta: { minHeight: 54, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bold, fontSize: 15 },
  ctaShadow: { shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 10 },
  pressed: { opacity: 0.92 },
  expander: { marginTop: spacing.md, alignSelf: 'stretch' },
  expanderInner: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  expanderLabel: { fontFamily: fonts.semibold, fontSize: 13 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 4, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  rowDetail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 3 },
  footer: { fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', paddingBottom: 26 },
  flex: { flex: 1 },
});
