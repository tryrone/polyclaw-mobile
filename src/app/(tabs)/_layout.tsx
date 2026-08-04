import { Tabs } from 'expo-router';
import { Activity, ChartNoAxesCombined, History, ListOrdered, MoreHorizontal } from 'lucide-react-native';
import { fonts, usePolyClawTheme } from '@/theme';

export default function TabsLayout() {
  const { theme } = usePolyClawTheme();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.lime, tabBarInactiveTintColor: theme.textMuted, tabBarStyle: { backgroundColor: theme.panel, borderTopColor: theme.border, height: 78, paddingTop: 8 }, tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 10 } }}>
    <Tabs.Screen name="index" options={{ title: 'Monitor', tabBarIcon: ({ color, size }) => <Activity color={color} size={size} /> }} />
    <Tabs.Screen name="queue" options={{ title: 'Queue', tabBarIcon: ({ color, size }) => <ListOrdered color={color} size={size} /> }} />
    <Tabs.Screen name="trades" options={{ title: 'Trades', tabBarIcon: ({ color, size }) => <History color={color} size={size} /> }} />
    <Tabs.Screen name="performance" options={{ title: 'Results', tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} /> }} />
    <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} /> }} />
  </Tabs>;
}
