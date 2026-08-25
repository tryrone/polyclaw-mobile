import { LockKeyhole } from '@/components/modern-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { haptics, PressableScale, Staggered } from '@/components/motion';
import { useAuth } from '@/auth/provider';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

export function UnlockView({ onSuccess }: { onSuccess: () => void }) {
  const { theme } = usePolyClawTheme();
  const { unlockWithBiometric, signOut } = useAuth();
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);
  const attempt = async () => {
    const success = await unlockWithBiometric();
    if (success) {
      haptics.success();
      onSuccess();
      return;
    }
    haptics.error();
    setFailed(true);
  };
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.lockWrap, { backgroundColor: theme.accentSoft }]}><LockKeyhole size={26} color={theme.accent} /></View>
      <Staggered index={1}><Text style={[styles.title, { color: theme.text }]}>Unlock PolyClaw</Text></Staggered>
      <Staggered index={2}><Text style={[styles.copy, { color: theme.textMuted }]}>Authenticate to view live positions and controls.</Text></Staggered>
      <Staggered index={3} style={{ alignSelf: 'stretch', maxWidth: 420 }}>
        <PressableScale accessibilityRole="button" onPress={() => void attempt()} containerStyle={{ alignSelf: 'stretch', marginTop: spacing.lg }} style={({ pressed }) => [{ backgroundColor: theme.accentStrong, minHeight: 52, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' }, pressed && styles.pressed]}>
          <Text style={[styles.retryText, { color: theme.accentInk }]}>{failed ? 'Try again' : 'Authenticate'}</Text>
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel="Sign out and use a different account" onPress={() => void signOut()} containerStyle={{ alignSelf: 'stretch', marginTop: spacing.sm }} style={({ pressed }) => [{ borderColor: theme.border, borderWidth: 1, minHeight: 48, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' }, pressed && styles.pressed]}>
          <Text style={[styles.signOutText, { color: theme.textSoft }]}>Use a different account</Text>
        </PressableScale>
      </Staggered>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  lockWrap: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.8 },
  copy: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', marginTop: 8 },
  retryText: { fontFamily: fonts.bold, fontSize: 15 },
  signOutText: { fontFamily: fonts.semibold, fontSize: 13 },
  pressed: { opacity: 0.85 },
});
