import { Tabs } from 'expo-router';
import { ChartLineUp, DotsThree, ListNumbers, Pulse, Receipt } from 'phosphor-react-native';

import { PolyClawTabBar, type TabItem } from '@/components/tab-bar';
import { useAuth } from '@/auth/provider';

/**
 * Operator surface: five tabs, unchanged set.
 *
 * The console keeps its information architecture; only presentation density changes.
 */
const tabs: (TabItem & { name: string })[] = [
  { name: 'index', href: '/', label: 'Monitor', Icon: Pulse },
  { name: 'queue', href: '/queue', label: 'Queue', Icon: ListNumbers },
  { name: 'operator-trades', href: '/operator-trades', label: 'Trades', Icon: Receipt },
  { name: 'performance', href: '/performance', label: 'Results', Icon: ChartLineUp },
  { name: 'more', href: '/more', label: 'More', Icon: DotsThree },
];

export default function TabsLayout() {
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
