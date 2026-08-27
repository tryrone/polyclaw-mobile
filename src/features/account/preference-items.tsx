import { StyleSheet, Switch, Text, View } from 'react-native';
import { Bell, Palette } from 'phosphor-react-native';
import { PressableScale } from '@/components/motion';
import { type ThemePreference, usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';
import { humanize, notificationPreferences } from './utils';

export function NotificationItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { notifications, ui } = controller;
  const values = notifications.values;
  const allCriticalEnabled = notifications.enabledCritical === notifications.totalCritical;
  return (
    <AccountItem
      Icon={Bell}
      title="Notifications"
      detail={`${notifications.enabledCritical} of ${notifications.totalCritical} critical alerts on`}
      status={allCriticalEnabled ? 'All on' : 'Review'}
      tone={allCriticalEnabled ? 'success' : 'warning'}
      expanded={ui.expanded === 'notifications'}
      onPress={() => ui.toggleSection('notifications')}
    >
      <View>
        {values
          ? notificationPreferences.map((preference, index) => (
              <View
                key={preference.key}
                style={[
                  styles.preference,
                  index < notificationPreferences.length - 1 && {
                    borderBottomColor: theme.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.flex}>
                  <Text style={[styles.preferenceName, { color: theme.text }]}>{preference.label}</Text>
                  <Text style={[styles.preferenceDetail, { color: theme.textMuted }]}>{preference.detail}</Text>
                </View>
                <Switch
                  accessibilityLabel={preference.label}
                  accessibilityHint="Updates this notification preference"
                  disabled={ui.isBusy}
                  value={values[preference.key]}
                  onValueChange={(next) => void notifications.update(preference.key, next)}
                  trackColor={{ false: theme.greySoft, true: theme.accentSoft }}
                  thumbColor={values[preference.key] ? theme.accent : theme.textMuted}
                />
              </View>
            ))
          : null}
      </View>
    </AccountItem>
  );
}

export function AppearanceItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const { appearance, ui } = controller;
  return (
    <AccountItem
      Icon={Palette}
      title="Appearance"
      detail="Use your preferred light or dark theme"
      status={humanize(appearance.preference)}
      expanded={ui.expanded === 'appearance'}
      onPress={() => ui.toggleSection('appearance')}
    >
      <View accessibilityRole="radiogroup" style={[styles.segmented, { backgroundColor: theme.field }]}>
        {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => {
          const selected = appearance.preference === option;
          return (
            <PressableScale
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${humanize(option)} appearance`}
              haptic="select"
              onPress={() => appearance.setPreference(option)}
              containerStyle={styles.segmentWrap}
              style={[styles.segment, selected && { backgroundColor: theme.panelRaised, borderColor: theme.borderStrong }]}
            >
              <Text style={[styles.segmentText, { color: selected ? theme.text : theme.textMuted }]}>{humanize(option)}</Text>
            </PressableScale>
          );
        })}
      </View>
    </AccountItem>
  );
}
