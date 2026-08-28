import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { CaretDown, CaretRight, CheckCircle, Info, type Icon } from 'phosphor-react-native';
import { CopyableUserId } from '@/components/copyable-user-id';
import { PressableScale } from '@/components/motion';
import { usePolyClawTheme } from '@/theme';
import { accountStyles as styles } from './styles';
import type { AccountMessage } from './types';

export function AccountProfile({ name, email, userId }: { name?: string | null; email?: string | null; userId?: string | null }) {
  const { theme } = usePolyClawTheme();
  const displayName = name || 'PolyClaw member';
  return (
    <View style={[styles.profileCard, { backgroundColor: theme.panelRaised, borderColor: theme.border }]}>
      <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.avatarText, { color: theme.accent }]}>{(name || email || 'P').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
        <Text style={[styles.profileEmail, { color: theme.textMuted }]}>{email}</Text>
        <CopyableUserId userId={userId} />
      </View>
    </View>
  );
}

export function AccountMessageBanner({ message }: { message: AccountMessage }) {
  const { theme } = usePolyClawTheme();
  if (!message) return null;
  const color = message.tone === 'success' ? theme.success : message.tone === 'warning' ? theme.warning : theme.danger;
  const backgroundColor = message.tone === 'success' ? theme.successSoft : message.tone === 'warning' ? theme.warningSoft : theme.dangerSoft;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={message.tone === 'danger' ? 'alert' : undefined}
      style={[styles.message, { backgroundColor }]}
    >
      {message.tone === 'success' ? <CheckCircle size={18} color={color} weight="fill" /> : <Info size={18} color={color} weight="fill" />}
      <Text style={[styles.messageText, { color }]}>{message.text}</Text>
    </View>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = usePolyClawTheme();
  return (
    <View style={styles.groupSection}>
      <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: theme.panel, borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

export function AccountItem({
  Icon,
  title,
  detail,
  status,
  tone = 'neutral',
  expanded,
  onPress,
  children,
}: {
  Icon: Icon;
  title: string;
  detail: string;
  status?: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
  expanded: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { theme } = usePolyClawTheme();
  const toneColor = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : tone === 'danger' ? theme.danger : theme.textMuted;
  return (
    <View style={[styles.item, { borderBottomColor: theme.border }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${detail}${status ? `. ${status}` : ''}`}
        accessibilityHint={expanded ? 'Collapses this section' : 'Expands this section'}
        haptic="select"
        onPress={onPress}
        style={({ pressed }) => [styles.itemHeader, pressed && { backgroundColor: theme.greySoft }]}
      >
        <View style={[styles.itemIcon, { backgroundColor: theme.accentSoft }]}>
          <Icon size={20} color={theme.accent} weight="regular" />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.itemDetail, { color: theme.textMuted }]}>{detail}</Text>
        </View>
        {status ? <Text numberOfLines={1} style={[styles.itemStatus, { color: toneColor }]}>{status}</Text> : null}
        {expanded ? <CaretDown size={18} color={theme.textMuted} /> : <CaretRight size={18} color={theme.textMuted} />}
      </PressableScale>
      {expanded ? <View style={[styles.itemBody, { borderTopColor: theme.border }]}>{children}</View> : null}
    </View>
  );
}

export function QuizItem({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { theme } = usePolyClawTheme();
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.quizRow}
    >
      {checked ? <CheckCircle size={21} color={theme.success} weight="fill" /> : <View style={[styles.quizBox, { borderColor: theme.borderStrong }]} />}
      <Text style={[styles.quizText, { color: theme.textSoft }]}>{label}</Text>
    </PressableScale>
  );
}
