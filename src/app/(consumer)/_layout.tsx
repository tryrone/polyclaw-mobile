import { Tabs } from 'expo-router';
import { House, Receipt, UserCircle } from 'phosphor-react-native';

import { PolyClawTabBar, type TabItem } from '@/components/tab-bar';
import { useAuth } from '@/auth/provider';

/**
 * Consumer surface: three tabs.
 *
 * A consumer only needs to know what they have, what is invested, what their bot is doing, and
 * what the bot has traded. Portfolio and Bot are now detail screens reached from Home, so they
 * stay registered as routes but no longer occupy the bar.
 */
const tabs: (TabItem & { name: string })[] = [
  { name: 'home', href: '/home', label: 'Home', Icon: House },
  { name: 'trades', href: '/trades', label: 'Trades', Icon: Receipt, active: ['/activity'] },
  { name: 'account', href: '/account', label: 'Account', Icon: UserCircle },
];

export default function ConsumerLayout() {
  const { session } = useAuth();
  if (session?.user.role !== 'USER') return null;
  return (
    <>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        {tabs.map(({ name }) => (
          <Tabs.Screen key={name} name={name} />
        ))}
        <Tabs.Screen name="bot" options={{ href: null }} />
        <Tabs.Screen name="portfolio" options={{ href: null }} />
        <Tabs.Screen name="activity" options={{ href: null }} />
        <Tabs.Screen name="wallet" options={{ href: null }} />
      </Tabs>
      <PolyClawTabBar items={tabs} />
    </>
  );
}
