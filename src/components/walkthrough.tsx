import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, ArrowRight, Check, CreditCard, Key, LinkSimple, ShieldCheck, Wallet, type Icon } from 'phosphor-react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui-kit';
import { PressableScale } from '@/components/motion';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

const WALKTHROUGH_VERSION = 'live-setup-v2';

type TourSlide = { icon: Icon; eyebrow: string; title: string; description: string; note: string };

const SLIDES: TourSlide[] = [
  { icon: ShieldCheck, eyebrow: 'YOUR SETUP PLAN', title: 'How PolyClaw trades for you', description: 'After you opt in, PolyClaw copies admin-published football trades into your dedicated wallet within your personal and platform limits.', note: 'You stay in control: review every permission, pause new entries, or revoke the signer at any time.' },
  { icon: CreditCard, eyebrow: 'STEP 1', title: 'Subscribe and choose limits', description: 'Activate your PolyClaw subscription, then set the most you allow per trade and per UTC day.', note: 'The effective limit is always the lower of your personal limit and the platform safety cap.' },
  { icon: Wallet, eyebrow: 'STEP 2', title: 'Create and fund your trading wallet', description: 'Create the dedicated owner and deposit wallet, approve the trading contracts, then copy a deposit route and add USDC.', note: 'Start with at least $15 for the canary. This dedicated wallet—not a linked history address—is the only Live trading path.' },
  { icon: LinkSimple, eyebrow: 'OPTIONAL', title: 'Link Polymarket history', description: 'In Account → Advanced, enter your existing Polymarket address, copy the challenge, sign that exact text in its wallet, and paste the signature.', note: 'This connection is read-only. It can show history, but it cannot fund trades or authorize PolyClaw.' },
  { icon: Key, eyebrow: 'STEP 3', title: 'Authorize without withdrawal access', description: 'Complete the risk review, wait for Polymarket Session Key approval, then sign the CLOB-only 30-day authorization.', note: 'The restricted signer can place and close approved trades. It cannot withdraw your funds.' },
  { icon: Check, eyebrow: 'STEP 4', title: 'Turn on Live and Auto-trade', description: 'After the operator safety release, sign the final Live activation, select Live mode, and enable Auto-trade.', note: 'PolyClaw will trade only eligible published signals within your effective limits. You can pause immediately from Account.' },
];

type WalkthroughController = { visible: boolean; resolved: boolean; dismiss: () => void; show: () => void };
const WalkthroughContext = createContext<WalkthroughController | null>(null);

function seenKey(userId: string) {
  return `polyclaw.walkthrough.${WALKTHROUGH_VERSION}.${userId}`;
}

/** Shows the onboarding tour once, then records that it has been seen locally. */
export function useWalkthrough(userId: string) {
  const [visible, setVisible] = useState(false);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(seenKey(userId))
      .then((seen) => { if (active) setVisible(seen !== 'true'); })
      .catch(() => { if (active) setVisible(true); })
      .finally(() => { if (active) setResolved(true); });
    return () => { active = false; };
  }, [userId]);
  const dismiss = useCallback(() => {
    setVisible(false);
    void AsyncStorage.setItem(seenKey(userId), 'true').catch(() => undefined);
  }, [userId]);
  const show = useCallback(() => setVisible(true), []);
  return { visible, resolved, dismiss, show };
}

export function WalkthroughProvider({ children, value }: { children: ReactNode; value: WalkthroughController }) {
  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}

export function useWalkthroughControls() {
  return useContext(WalkthroughContext);
}

export function Walkthrough({ onDone, onSetup, userName }: { onDone: () => void; onSetup: () => void; userName?: string | null }) {
  const { theme } = usePolyClawTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const firstName = userName?.trim().split(/\s+/)[0];

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };
  const advance = () => {
    if (last) onSetup();
    else scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  };
  const back = () => scrollRef.current?.scrollTo({ x: width * Math.max(0, index - 1), animated: true });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
      <PressableScale accessibilityLabel="Skip tour" accessibilityRole="button" onPress={onDone} style={styles.skip}>
        <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
      </PressableScale>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide, slideIndex) => (
          <ScrollView
            key={slide.title}
            contentContainerStyle={styles.slideContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={{ width }}
          >
            <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
              <slide.icon size={40} color={theme.accent} weight="regular" />
            </View>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>{slide.eyebrow}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>{slide.description}</Text>
            <View style={[styles.note, { backgroundColor: theme.panelRaised, borderColor: theme.border }]}>
              <Text style={[styles.noteText, { color: theme.textSoft }]}>
                {slideIndex === 0 && firstName ? `${firstName}, ${slide.note.charAt(0).toLowerCase()}${slide.note.slice(1)}` : slide.note}
              </Text>
            </View>
          </ScrollView>
        ))}
      </ScrollView>
      <Text accessibilityLiveRegion="polite" style={[styles.progressLabel, { color: theme.textMuted }]}>Step {index + 1} of {SLIDES.length}</Text>
      <View style={styles.dots}>
        {SLIDES.map((_, dotIndex) => (
          <View key={dotIndex} style={[styles.dot, { backgroundColor: dotIndex === index ? theme.accent : theme.border }]} />
        ))}
      </View>
      <View style={styles.footer}>
        {index > 0 ? <ActionButton icon={ArrowLeft as never} label="Back" variant="secondary" onPress={back} /> : null}
        <View style={styles.primaryAction}>
          <ActionButton icon={(last ? Check : ArrowRight) as never} label={last ? 'Open Account setup' : 'Next'} onPress={advance} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 20 },
  pager: { flex: 1 },
  slideContent: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl * 2 },
  icon: { alignItems: 'center', borderRadius: radius.pill, height: 84, justifyContent: 'center', marginBottom: spacing.xl, width: 84 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, marginBottom: spacing.sm, textAlign: 'center' },
  title: { fontFamily: fonts.semibold, fontSize: 22, marginBottom: spacing.sm, textAlign: 'center' },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, maxWidth: 320, textAlign: 'center' },
  note: { borderRadius: radius.md, borderWidth: 1, marginTop: spacing.xl, maxWidth: 360, padding: spacing.lg, width: '100%' },
  noteText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  skip: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, position: 'absolute', right: spacing.md, top: spacing.xs, zIndex: 10 },
  skipText: { fontFamily: fonts.semibold, fontSize: 14 },
  progressLabel: { fontFamily: fonts.semibold, fontSize: 12, marginBottom: spacing.sm, textAlign: 'center' },
  dots: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.lg },
  dot: { borderRadius: radius.pill, height: 8, width: 8 },
  footer: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
  primaryAction: { flex: 1 },
});
