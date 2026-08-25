import { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth/provider';
import { PolyClawThemeProvider, usePolyClawTheme } from '@/theme';
import { NotificationBootstrap } from '@/notifications/bootstrap';
import { UnlockView } from '@/components/unlock-view';

SplashScreen.preventAutoHideAsync();

function AuthenticatedStack() {
  const { state, session, biometricEnabled } = useAuth();
  const { theme } = usePolyClawTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [unlockedToken, setUnlockedToken] = useState<string | null>(null);

  useEffect(() => {
    if (state === 'hydrating') return;
    const inOnboarding = pathname === '/welcome' || pathname === '/sign-in' || pathname === '/sign-up';
    const inConsumer = ['/home', '/bot', '/activity', '/wallet', '/account'].some((route) => pathname === route || pathname.startsWith(`${route}/`));
    if (state === 'anonymous' && !inOnboarding) router.replace('/welcome' as never);
    if (state === 'authenticated' && inOnboarding) router.replace(session?.user.role === 'ADMIN' ? '/' : '/home');
    if (state === 'authenticated' && session?.user.role !== 'ADMIN' && !inOnboarding && !inConsumer) router.replace('/home');
    if (state === 'authenticated' && session?.user.role === 'ADMIN' && inConsumer) router.replace('/');
  }, [pathname, router, session?.user.role, state]);

  const needsUnlock = state === 'authenticated' && biometricEnabled && !!session && unlockedToken !== session.accessToken;
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {needsUnlock ? <UnlockView onSuccess={() => setUnlockedToken(session ? session.accessToken : 'unlocked')} /> : <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background }, animation: 'slide_from_right', animationDuration: 260 }} />}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Manrope_700Bold, Manrope_800ExtraBold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return <PolyClawThemeProvider><AuthProvider><NotificationBootstrap /><AuthenticatedStack /></AuthProvider></PolyClawThemeProvider>;
}
