import { Tabs, usePathname, useRouter } from 'expo-router';
import { ClockCounterClockwise, House, Robot, UserCircle, Wallet, type Icon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/provider';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

const tabs: { name: string; href: '/home' | '/bot' | '/activity' | '/wallet' | '/account'; label: string; Icon: Icon }[] = [
  { name: 'home', href: '/home', label: 'Home', Icon: House },
  { name: 'bot', href: '/bot', label: 'Bot', Icon: Robot },
  { name: 'activity', href: '/activity', label: 'Activity', Icon: ClockCounterClockwise },
  { name: 'wallet', href: '/wallet', label: 'Wallet', Icon: Wallet },
  { name: 'account', href: '/account', label: 'Account', Icon: UserCircle },
];

function ConsumerTabBar() {
  const { theme } = usePolyClawTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
    <View accessibilityRole="tablist" style={[styles.bar, { backgroundColor: theme.panel, borderColor: theme.border, shadowColor: theme.shadow.color }]}>
      {tabs.map(({ href, label, Icon }) => {
        const selected = pathname === href;
        return <Pressable key={href} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => router.navigate(href)} style={[styles.tab, selected && { backgroundColor: theme.accentSoft }]}>
          <Icon size={22} color={selected ? theme.accent : theme.textMuted} weight={selected ? 'fill' : 'regular'} />
          {selected ? <Text numberOfLines={1} style={[styles.label, { color: theme.accent }]}>{label}</Text> : null}
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
  host: { bottom: 0, left: spacing.lg, position: 'absolute', right: spacing.lg },
  bar: { alignItems: 'center', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, elevation: 10, flexDirection: 'row', minHeight: 62, padding: 6, shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.2, shadowRadius: 18 },
  tab: { alignItems: 'center', borderRadius: radius.md, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 48, minWidth: 48, paddingHorizontal: 8 },
  label: { fontFamily: fonts.bold, fontSize: 11 },
});
