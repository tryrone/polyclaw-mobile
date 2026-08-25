import { Tabs, usePathname, useRouter } from 'expo-router';
import { ChartLineUp, ClockCounterClockwise, DotsThree, ListNumbers, Pulse, type Icon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics, useReducedMotion } from '@/components/motion';
import { fonts, motion, radius, spacing, usePolyClawTheme } from '@/theme';
import { useAuth } from '@/auth/provider';

const glassAvailable = isGlassEffectAPIAvailable();

const tabs = [
  { name: 'index', href: '/' as const, label: 'Monitor', Icon: Pulse },
  { name: 'queue', href: '/queue' as const, label: 'Queue', Icon: ListNumbers },
  { name: 'trades', href: '/trades' as const, label: 'Trades', Icon: ClockCounterClockwise },
  { name: 'performance', href: '/performance' as const, label: 'Results', Icon: ChartLineUp },
  { name: 'more', href: '/more' as const, label: 'More', Icon: DotsThree },
] as const;

function TabButton({ href, label, Icon, active }: { name: string; href: '/' | '/queue' | '/trades' | '/performance' | '/more'; label: string; Icon: Icon; active: boolean }) {
  const { theme } = usePolyClawTheme();
  const reduce = useReducedMotion();
  const router = useRouter();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = active ? withSpring(1.14, motion.enter) : withTiming(1, motion.fast);
  }, [active, scale]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = active ? theme.accent : theme.textMuted;
  const onPress = () => {
    if (!active) {
      router.navigate(href);
      if (!reduce) haptics.select();
    }
  };
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={onPress} style={styles.tab}>
      <Animated.View style={iconStyle}><Icon size={22} color={color} weight={active ? 'fill' : 'regular'} /></Animated.View>
      {active ? <Text numberOfLines={1} style={[styles.label, { color }, styles.labelActive]}>{label}</Text> : null}
    </Pressable>
  );
}

function FloatingTabBar({ active }: { active: string }) {
  const { theme } = usePolyClawTheme();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const slide = useSharedValue(140);
  useEffect(() => {
    if (reduce) { slide.value = 0; return; }
    requestAnimationFrame(() => setMounted(true));
  }, [reduce, slide]);
  useEffect(() => {
    if (mounted) {
      // eslint-disable-next-line react-hooks/immutability
      slide.value = withSpring(0, motion.enter);
    }
  }, [mounted, slide]);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }] }));
  const glass = glassAvailable && theme.mode === 'dark' && !reduce;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) }]}>
      <Animated.View style={[styles.bar, barStyle, glass ? styles.glass : { backgroundColor: theme.panel, borderColor: theme.border, shadowColor: theme.shadow.color, shadowOpacity: theme.shadow.opacity, shadowRadius: theme.shadow.radius, shadowOffset: { width: 0, height: 10 }, elevation: theme.shadow.elevation }]}>
        {glass ? <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" tintColor={theme.accentSoft} /> : null}
        <View style={styles.row}>
          {tabs.map(({ name, href, label, Icon }) => (
            <TabButton key={name} name={name} href={href} label={label} Icon={Icon} active={active === name} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  const { session } = useAuth();
  const pathname = usePathname();
  if (session?.user.role !== 'ADMIN') return null;
  const active = pathname === '/' ? 'index' : pathname.replace(/^\//, '').replace(/\/$/, '');
  return (
    <>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        {tabs.map(({ name }) => <Tabs.Screen key={name} name={name} />)}
      </Tabs>
      <FloatingTabBar active={active} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  bar: { borderRadius: radius.lg + 2, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  glass: { borderColor: 'rgba(167,139,250,0.30)' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6 },
  tab: { flex: 1, minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 3 },
  label: { fontFamily: fonts.semibold, fontSize: 10 },
  labelActive: { fontFamily: fonts.bold },
});
