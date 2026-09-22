import { usePathname, useRouter } from 'expo-router';
import type { Icon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, useReducedMotion } from '@/components/motion';
import { fonts, layout, motion, radius, spacing, usePolyClawTheme } from '@/theme';

export type TabItem = {
  /** Pathname that the item navigates to. */
  href: string;
  label: string;
  Icon: Icon;
  /** Extra pathnames that should highlight this item (for content absorbed into it). */
  active?: string[];
};

const BAR_INSET = 5;

function isActive(item: TabItem, pathname: string) {
  return [item.href, ...(item.active ?? [])].some((path) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * One fixed-width tab target. The active icon and label cross-fade over the shared moving capsule,
 * while inactive destinations remain crisp outline icons like the supplied reference.
 */
function TabButton({ item, selected }: { item: TabItem; selected: boolean }) {
  const { theme } = usePolyClawTheme();
  const router = useRouter();
  const reduce = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: reduce ? 0 : motion.base.duration });
  }, [progress, reduce, selected]);

  const inactiveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.88], Extrapolation.CLAMP) }],
  }));

  const activeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: reduce ? 1 : interpolate(progress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <PressableScale
      accessibilityLabel={item.label}
      accessibilityHint={`Opens ${item.label}`}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      containerStyle={styles.tabContainer}
      haptic={selected ? null : 'select'}
      onPress={() => {
        if (!selected) router.navigate(item.href as never);
      }}>
      <View style={styles.tabInner}>
        <Animated.View style={[styles.iconLayer, inactiveStyle]}>
          <item.Icon color={theme.textMuted} size={23} weight="regular" />
        </Animated.View>
        <Animated.View style={[styles.activeContent, activeStyle]}>
          <item.Icon color={theme.background} size={20} weight="bold" />
          <Animated.Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.label, { color: theme.background }]}>
            {item.label}
          </Animated.Text>
        </Animated.View>
      </View>
    </PressableScale>
  );
}

/**
 * The single floating tab bar for both PolyClaw surfaces. A high-contrast capsule glides between
 * equal-width targets, so the bar never reflows while the user changes destinations.
 */
export function PolyClawTabBar({ items }: { items: readonly TabItem[] }) {
  const { theme } = usePolyClawTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const rowWidth = useSharedValue(0);
  const selectedIndex = Math.max(0, items.findIndex((item) => isActive(item, pathname)));
  const activeIndex = useSharedValue(selectedIndex);

  useEffect(() => {
    activeIndex.value = reduce
      ? withTiming(selectedIndex, { duration: 0 })
      : withSpring(selectedIndex, motion.settle);
  }, [activeIndex, reduce, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => {
    const cellWidth = Math.max(0, (rowWidth.value - BAR_INSET * 2) / items.length);
    return {
      opacity: rowWidth.value > 0 ? 1 : 0,
      transform: [{ translateX: activeIndex.value * cellWidth }],
      width: cellWidth,
    };
  });

  const measureRow = (event: LayoutChangeEvent) => {
    rowWidth.value = event.nativeEvent.layout.width;
  };

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          {
            backgroundColor: theme.panel,
            borderColor: theme.borderStrong,
            elevation: theme.shadow.elevation,
            shadowColor: theme.shadow.color,
            shadowOpacity: theme.mode === 'dark' ? 0.48 : 0.18,
            shadowRadius: 18,
          },
        ]}>
        <View onLayout={measureRow} style={styles.row}>
          <Animated.View pointerEvents="none" style={[styles.activeIndicator, { backgroundColor: theme.text }, indicatorStyle]} />
          {items.map((item) => (
            <TabButton item={item} key={item.href} selected={isActive(item, pathname)} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 60,
    overflow: 'hidden',
    shadowOffset: { height: 8, width: 0 },
  },
  host: {
    bottom: 0,
    left: layout.phoneGutter,
    position: 'absolute',
    right: layout.phoneGutter,
  },
  iconLayer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
    padding: BAR_INSET,
  },
  tabContainer: {
    flex: 1,
    zIndex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 44,
  },
  activeContent: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    left: 2,
    position: 'absolute',
    right: 2,
    top: 0,
  },
  activeIndicator: {
    borderRadius: radius.pill,
    bottom: BAR_INSET,
    left: BAR_INSET,
    position: 'absolute',
    top: BAR_INSET,
  },
});
