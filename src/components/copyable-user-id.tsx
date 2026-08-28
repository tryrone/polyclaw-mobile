import { useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { StyleSheet, Text } from 'react-native';
import { Check, Copy } from '@/components/modern-icons';
import { PressableScale } from '@/components/motion';
import { fonts, usePolyClawTheme } from '@/theme';

export function CopyableUserId({
  userId,
  accessibilityLabel = 'Copy user ID',
}: {
  userId?: string | null;
  accessibilityLabel?: string;
}) {
  const { theme } = usePolyClawTheme();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  if (!userId) return null;

  const copy = async () => {
    await Clipboard.setStringAsync(userId);
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1_500);
  };

  return <>
    <Text style={[styles.label, { color: theme.textMuted }]}>USER ID</Text>
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Copies your immutable BetsClaw user ID"
      onPress={() => void copy()}
      style={[styles.row, { backgroundColor: theme.field, borderColor: theme.border }]}
    >
      <Text selectable numberOfLines={1} style={[styles.value, { color: theme.textSoft }]}>{userId}</Text>
      {copied ? <Check size={17} color={theme.success} /> : <Copy size={17} color={theme.accent} />}
    </PressableScale>
    <Text accessibilityLiveRegion="polite" style={styles.srOnly}>{copied ? 'User ID copied' : ''}</Text>
  </>;
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bold, fontSize: 8.5, letterSpacing: 1.1, marginTop: 12 },
  row: { alignItems: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 44, marginTop: 6, paddingHorizontal: 12 },
  value: { flex: 1, fontFamily: fonts.medium, fontSize: 10.5 },
  srOnly: { height: 1, opacity: 0, position: 'absolute', width: 1 },
});
