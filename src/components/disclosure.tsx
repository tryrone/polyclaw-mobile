import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ChevronDown } from '@/components/modern-icons';
import { PressableScale, useReducedMotion } from '@/components/motion';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

/**
 * Progressive-disclosure row: a ≥48pt summary line that reveals detail in place.
 *
 * Used instead of a new page (or a permanently visible block) so a screen can stay inside the
 * density rules. Detail is collapsed, never deleted.
 */
export function Disclosure({
  children,
  defaultOpen = false,
  detail,
  label,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  detail?: string;
  label: string;
}) {
  const { theme } = usePolyClawTheme();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrap}>
      <PressableScale
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        haptic="select"
        onPress={() => setOpen((value) => !value)}
        containerStyle={styles.headingContainer}>
        <View style={[styles.heading, { backgroundColor: theme.panel, borderColor: theme.border }]}>
          <View style={styles.headingCopy}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            {detail ? (
              <Text numberOfLines={2} style={[styles.detail, { color: theme.textMuted }]}>
                {detail}
              </Text>
            ) : null}
          </View>
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <ChevronDown size={17} color={theme.textMuted} />
          </View>
        </View>
      </PressableScale>
      {open ? (
        <Animated.View entering={reduce ? FadeInDown.duration(140) : FadeInDown.springify()} style={styles.content}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  detail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  heading: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headingContainer: {
    alignSelf: 'stretch',
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  wrap: {
    gap: spacing.sm,
  },
});
