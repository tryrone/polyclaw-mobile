import { usePathname, useRouter } from 'expo-router';
import type { Icon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, useReducedMotion } from '@/components/motion';
import { fonts, layout, radius, spacing, usePolyClawTheme } from '@/theme';

export type TabItem = {
  /** Pathname that the item navigates to. */
  href: string;
  label: string;
  Icon: Icon;
  /** Extra pathnames that should highlight this item (for content absorbed into it). */
  active?: string[];
};

const ICON_SLOT = { height: 30, width: 56 } as const;

function isActive(item: TabItem, pathname: string) {
  return [item.href, ...(item.active ?? [])].some((path) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * One tab. Active state is a soft pill behind the icon, a regular → fill icon cross-fade and a
 * label colour change. The transition is a single restrained 180ms timing curve (applied
 * immediately when reduced motion is on), never a spring-heavy slide.
 */
function TabButton({ item, selected }: { item: TabItem; selected: boolean }) {
  const { theme } = usePolyClawTheme();
  const router = useRouter();
  const reduce = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: reduce ? 0 : 180 });
  }, [progress, reduce, selected]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: reduce ? 1 : interpolate(progress.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) }],
  }));

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  const filledStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [theme.textMuted, theme.accent]),
  }));

  return (
    <PressableScale
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      containerStyle={styles.tabContainer}
      haptic={selected ? null : 'select'}
      onPress={() => {
        if (!selected) router.navigate(item.href as never);
      }}>
      <View style={styles.tabInner}>
        <View style={styles.iconSlot}>
          <Animated.View style={[styles.pill, { backgroundColor: theme.accentSoft }, pillStyle]} />
          <Animated.View style={[styles.iconLayer, outlineStyle]}>
            <item.Icon color={theme.textMuted} size={21} weight="regular" />
          </Animated.View>
          <Animated.View style={[styles.iconLayer, filledStyle]}>
            <item.Icon color={theme.accent} size={21} weight="fill" />
          </Animated.View>
        </View>
        <Animated.Text adjustsFontSizeToFit numberOfLines={1} style={[styles.label, labelStyle]}>
          {item.label}
        </Animated.Text>
      </View>
    </PressableScale>
  );
}

/**
 * The single tab bar for both PolyClaw surfaces. Flat panel, one hairline top border and a
 * shallow shadow; bottom labels are retained for accessibility.
 */
export function PolyClawTabBar({ items }: { items: readonly TabItem[] }) {
  const { theme } = usePolyClawTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          {
            backgroundColor: theme.panel,
            borderColor: theme.border,
            elevation: theme.shadow.elevation,
            shadowColor: theme.shadow.color,
            shadowOpacity: theme.shadow.opacity,
            shadowRadius: theme.shadow.radius,
          },
        ]}>
        <View style={styles.row}>
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
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 64,
    overflow: 'hidden',
    shadowOffset: { height: 6, width: 0 },
  },
  host: {
    bottom: 0,
    left: layout.phoneGutter,
    position: 'absolute',
    right: layout.phoneGutter,
  },
  iconLayer: {
    alignItems: 'center',
    height: ICON_SLOT.height,
    justifyContent: 'center',
    position: 'absolute',
    width: ICON_SLOT.width,
  },
  iconSlot: {
    alignItems: 'center',
    height: ICON_SLOT.height,
    justifyContent: 'center',
    width: ICON_SLOT.width,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  pill: {
    borderRadius: radius.pill,
    height: ICON_SLOT.height,
    position: 'absolute',
    width: ICON_SLOT.width,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  tabContainer: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
});
