import { Moon, Monitor, Sun, type Icon } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { fonts, layout, spacing, type ThemePreference, usePolyClawTheme } from '@/theme';

const options: { value: ThemePreference; label: string; Icon: Icon }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

/** Shared appearance control so both customer and admin surfaces expose the same preference. */
export function ThemePicker() {
  const { theme, preference, setPreference } = usePolyClawTheme();

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: theme.text }]}>Appearance</Text>
        <Text style={[styles.detail, { color: theme.textMuted }]}>System follows your iPhone setting.</Text>
      </View>
      <View accessibilityRole="radiogroup" style={[styles.track, { backgroundColor: theme.field }]}>
        {options.map((option) => {
          const selected = preference === option.value;
          const color = selected ? theme.background : theme.textMuted;
          return (
            <PressableScale
              key={option.value}
              accessibilityHint={`Switches PolyClaw to ${option.label.toLowerCase()} appearance`}
              accessibilityLabel={`${option.label} appearance`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              containerStyle={styles.segmentWrap}
              haptic={selected ? null : 'select'}
              onPress={() => setPreference(option.value)}
              style={({ pressed }) => [
                styles.segment,
                selected && { backgroundColor: theme.text },
                pressed && !selected && { backgroundColor: theme.greySoft },
              ]}>
              <option.Icon color={color} size={17} weight={selected ? 'bold' : 'regular'} />
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.segmentText, { color }]}>
                {option.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  heading: { gap: 2 },
  root: { gap: spacing.md },
  segment: {
    alignItems: 'center',
    borderRadius: layout.controlRadius,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  segmentText: { fontFamily: fonts.semibold, fontSize: 12 },
  segmentWrap: { flex: 1 },
  title: { fontFamily: fonts.semibold, fontSize: 16 },
  track: { borderRadius: layout.controlRadius, flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
});
