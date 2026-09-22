import { Tabs } from 'expo-router';
import { Receipt, SlidersHorizontal, SoccerBall, Users } from 'phosphor-react-native';

import { PolyClawTabBar, type TabItem } from '@/components/tab-bar';
import { useAuth } from '@/auth/provider';

/**
 * Operator surface: exactly four labelled tabs — Games, Trades, Users, Settings.
 *
 * Paths live under `/admin/*` so they can never collide with the consumer `/trades`
 * ledger. Monitor, Queue, Models, the prediction funnel, Results/Performance and the
 * SportyBet manual-bet surface are removed.
 */
const tabs: (TabItem & { name: string })[] = [
  { name: 'games', href: '/admin/games', label: 'Games', Icon: SoccerBall },
  { name: 'trades', href: '/admin/trades', label: 'Trades', Icon: Receipt },
  { name: 'users', href: '/admin/users', label: 'Users', Icon: Users },
  { name: 'settings', href: '/admin/settings', label: 'Settings', Icon: SlidersHorizontal },
];

export default function AdminLayout() {
  const { session } = useAuth();
  if (session?.user.role !== 'ADMIN') return null;
  return (
    <>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        {tabs.map(({ name }) => (
          <Tabs.Screen key={name} name={name} />
        ))}
      </Tabs>
      <PolyClawTabBar items={tabs} />
    </>
  );
}
