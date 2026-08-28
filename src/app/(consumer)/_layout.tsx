import { useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { ChartLineUp, ClockCounterClockwise, House, Robot, UserCircle, type Icon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { useAuth } from '@/auth/provider';
import { useReducedMotion } from '@/components/motion';
import { fonts, layout, motion, radius, usePolyClawTheme } from '@/theme';

const tabs: { name: string; href: '/home' | '/bot' | '/portfolio' | '/activity' | '/account'; label: string; Icon: Icon }[] = [
  { name: 'home', href: '/home', label: 'Overview', Icon: House },
  { name: 'bot', href: '/bot', label: 'Bot', Icon: Robot },
  { name: 'portfolio', href: '/portfolio', label: 'Portfolio', Icon: ChartLineUp },
  { name: 'activity', href: '/activity', label: 'Activity', Icon: ClockCounterClockwise },
  { name: 'account', href: '/account', label: 'Account', Icon: UserCircle },
];

function ConsumerTabBar() {
  const { theme } = usePolyClawTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex(({ href }) => pathname === href || pathname.startsWith(`${href}/`)));
  const indicatorWidth = Math.max(0, (barWidth - 12) / tabs.length);
  const indicatorX = useDerivedValue(() => {
    const target = activeIndex * indicatorWidth;
    return reduceMotion ? target : withSpring(target, motion.settle);
  }, [activeIndex, indicatorWidth, reduceMotion]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));

  return <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
    <View accessibilityRole="tablist" onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)} style={[styles.bar, { backgroundColor: theme.panel, borderColor: theme.border, shadowColor: theme.shadow.color }]}>
      <Animated.View pointerEvents="none" style={[styles.indicator, { backgroundColor: theme.accentSoft, width: indicatorWidth }, indicatorStyle]} />
      {tabs.map(({ href, label, Icon }) => {
        const selected = pathname === href;
        return <Pressable key={href} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => router.navigate(href)} style={styles.tab}>
          <Icon size={22} color={selected ? theme.accent : theme.textMuted} weight={selected ? 'fill' : 'regular'} />
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label, { color: selected ? theme.accent : theme.textMuted }]}>{label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export default function ConsumerLayout() {
  const { session } = useAuth();
  if (session?.user.role !== 'USER') return null;
  return <><Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>{tabs.map(({ name }) => <Tabs.Screen key={name} name={name} />)}</Tabs><ConsumerTabBar /></>;
}

const styles = StyleSheet.create({
  host: { bottom: 0, left: layout.phoneGutter, position: 'absolute', right: layout.phoneGutter },
  bar: { alignItems: 'center', borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, elevation: 10, flexDirection: 'row', minHeight: 62, padding: 6, shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.2, shadowRadius: 18 },
  indicator: { bottom: 6, borderRadius: radius.md, left: 6, position: 'absolute', top: 6 },
  tab: { alignItems: 'center', borderRadius: radius.md, flex: 1, gap: 3, justifyContent: 'center', minHeight: 52, minWidth: 48, paddingHorizontal: 2, zIndex: 1 },
  label: { fontFamily: fonts.bold, fontSize: 9.5 },
});
