import '@/polyfills';
import { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth/provider';
import { PolyClawThemeProvider, usePolyClawTheme } from '@/theme';
import { NotificationBootstrap } from '@/notifications/bootstrap';
import { UnlockView } from '@/components/unlock-view';
import { features } from '@/lib/features';
import { PolyClawWalletProvider } from '@/wallet/privy-provider';
import { readConsumerGuideCompleted } from '@/lib/storage';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 500, fade: true });

function AuthenticatedStack() {
  const { state, session, biometricEnabled, biometricRequired, locked, recoveryMode, securityResolved, markUnlocked } = useAuth();
  const { theme } = usePolyClawTheme();
  const router = useRouter();
  const pathname = usePathname();
  const guideCheckedFor = useRef<string | null>(null);

  useEffect(() => {
    if (state === 'hydrating') return;
    const inOnboarding = pathname === '/welcome' || pathname === '/sign-in' || pathname === '/sign-up';
    const consumerRoutes = ['/home', '/bot', '/portfolio', '/activity', '/account', '/getting-started', ...(features.manualFootballTrading ? ['/football-trade'] : [])];
    const inConsumer = consumerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
    if (state === 'anonymous' && !inOnboarding) router.replace('/welcome' as never);
    if (state === 'authenticated' && inOnboarding) router.replace(session?.user.role === 'ADMIN' ? '/' : '/home');
    if (state === 'authenticated' && session?.user.role !== 'ADMIN' && !inOnboarding && !inConsumer) router.replace('/home');
    if (state === 'authenticated' && session?.user.role === 'ADMIN' && inConsumer) router.replace('/');
  }, [pathname, router, session?.user.role, state]);

  useEffect(() => {
    const userId = session?.user.id;
    if (state !== 'authenticated' || !userId || session.user.role !== 'USER') return;
    const inOnboarding = pathname === '/welcome' || pathname === '/sign-in' || pathname === '/sign-up';
    if (inOnboarding || guideCheckedFor.current === userId) return;
    guideCheckedFor.current = userId;
    readConsumerGuideCompleted(userId).then((complete) => {
      if (!complete && pathname !== '/getting-started') router.replace('/getting-started?firstRun=1' as never);
    }).catch(() => undefined);
  }, [pathname, router, session, state]);

  if (state === 'authenticated' && !securityResolved) return null;
  const needsUnlock = state === 'authenticated' && !recoveryMode && (biometricRequired || biometricEnabled) && locked;
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {needsUnlock ? <UnlockView onSuccess={markUnlocked} /> : <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background }, animation: 'slide_from_right', animationDuration: 260 }} />}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Manrope_700Bold, Manrope_800ExtraBold });
  useEffect(() => { if (loaded) SplashScreen.hide(); }, [loaded]);
  if (!loaded) return null;
  return <PolyClawThemeProvider><AuthProvider><PolyClawWalletProvider><NotificationBootstrap /><AuthenticatedStack /></PolyClawWalletProvider></AuthProvider></PolyClawThemeProvider>;
}
