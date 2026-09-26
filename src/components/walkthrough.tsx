import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowRight, Check, Key, ShieldCheck, Wallet, type Icon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui-kit';
import { PressableScale } from '@/components/motion';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

const TOUR_SEEN_KEY = 'polyclaw.tour.seen';

type TourSlide = { icon: Icon; title: string; description: string };

const SLIDES: TourSlide[] = [
  { icon: ShieldCheck, title: 'Copy-trading, done for you', description: 'When the PolyClaw publisher selects a football market, the same trade is placed on your wallet within your own limits.' },
  { icon: Wallet, title: 'Set your limits', description: 'Choose a per-trade amount and a daily cap. Trades never exceed your limits and you can pause at any time.' },
  { icon: Key, title: 'Set up your wallet', description: 'Set up your dedicated PolyClaw Deposit Wallet and authorize a withdrawal-disabled signer so trades can be placed for you.' },
  { icon: Check, title: 'Go live when ready', description: 'Complete the setup steps and enable auto-trading. Paper mode lets you try it without real money first.' },
];

/** Shows the onboarding tour once, then records that it has been seen locally. */
export function useWalkthrough() {
  const [visible, setVisible] = useState(false);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(TOUR_SEEN_KEY)
      .then((seen) => { if (active) setVisible(seen !== 'true'); })
      .catch(() => undefined)
      .finally(() => { if (active) setResolved(true); });
    return () => { active = false; };
  }, []);
  const dismiss = useCallback(() => {
    setVisible(false);
    void AsyncStorage.setItem(TOUR_SEEN_KEY, 'true').catch(() => undefined);
  }, []);
  return { visible, resolved, dismiss };
}

export function Walkthrough({ onDone }: { onDone: () => void }) {
  const { theme } = usePolyClawTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };
  const advance = () => {
    if (last) onDone();
    else scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

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
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
              <slide.icon size={40} color={theme.accent} weight="regular" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((_, dotIndex) => (
          <View key={dotIndex} style={[styles.dot, { backgroundColor: dotIndex === index ? theme.accent : theme.border }]} />
        ))}
      </View>
      <View style={styles.footer}>
        <ActionButton icon={(last ? Check : ArrowRight) as never} label={last ? 'Get started' : 'Next'} onPress={advance} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 20 },
  pager: { flex: 1 },
  slide: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon: { alignItems: 'center', borderRadius: radius.pill, height: 84, justifyContent: 'center', marginBottom: spacing.xl, width: 84 },
  title: { fontFamily: fonts.semibold, fontSize: 22, marginBottom: spacing.sm, textAlign: 'center' },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, maxWidth: 320, textAlign: 'center' },
  skip: { position: 'absolute', right: spacing.lg, top: spacing.md, zIndex: 10 },
  skipText: { fontFamily: fonts.semibold, fontSize: 14 },
  dots: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.lg },
  dot: { borderRadius: radius.pill, height: 8, width: 8 },
  footer: { paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
});
