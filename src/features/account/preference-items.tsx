import { StyleSheet, Switch, Text, View } from 'react-native';
import { Bell } from 'phosphor-react-native';
import { usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';
import { notificationPreferences } from './utils';

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
                  ios_backgroundColor={theme.borderStrong}
                  trackColor={{ false: theme.borderStrong, true: theme.accent }}
                  thumbColor={theme.switchThumb}
                />
              </View>
            ))
          : null}
      </View>
    </AccountItem>
  );
}
