import { BottomClearanceProvider } from '@/components/bottom-clearance';
import { router, Tabs } from 'expo-router';
import { ArrowsLeftRight, HouseSimple, User } from 'phosphor-react-native';

import { PolyClawTabBar, type TabItem } from '@/components/tab-bar';
import { useWalkthrough, Walkthrough, WalkthroughProvider } from '@/components/walkthrough';
import { useAuth } from '@/auth/provider';

/**
 * Consumer surface: exactly three labelled tabs — Home, Trades, Account. The standalone Bot,
 * Portfolio, Activity, Wallet, Getting Started and Football Trade screens are removed.
 */
const tabs: (TabItem & { name: string })[] = [
  { name: 'home', href: '/home', label: 'Home', Icon: HouseSimple },
  { name: 'trades', href: '/trades', label: 'Trades', Icon: ArrowsLeftRight },
  { name: 'account', href: '/account', label: 'Account', Icon: User },
];

export default function ConsumerLayout() {
  const { session } = useAuth();
  const tour = useWalkthrough(session?.user.id ?? 'consumer');
  if (session?.user.role !== 'USER') return null;
  const openSetup = () => {
    tour.dismiss();
    router.replace('/account' as never);
  };
  return (
    <WalkthroughProvider value={tour}>
      <BottomClearanceProvider>
        <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
          {tabs.map(({ name }) => (
            <Tabs.Screen key={name} name={name} />
          ))}
        </Tabs>
        {tour.resolved && !tour.visible ? <PolyClawTabBar items={tabs} /> : null}
        {tour.visible ? <Walkthrough onDone={tour.dismiss} onSetup={openSetup} userName={session.user.name} /> : null}
      </BottomClearanceProvider>
    </WalkthroughProvider>
  );
}
