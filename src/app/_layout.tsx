import { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
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
    const inOnboarding = pathname === '/welcome' || pathname === '/sign-in';
    if (state === 'anonymous' && !inOnboarding) router.replace('/welcome' as never);
    if (state === 'authenticated' && inOnboarding) router.replace('/');
  }, [pathname, router, state]);

  const needsUnlock = state === 'authenticated' && biometricEnabled && !!session && unlockedToken !== session.accessToken;
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {needsUnlock ? <UnlockView onSuccess={() => setUnlockedToken(session ? session.accessToken : 'unlocked')} /> : <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background }, animation: 'slide_from_right', animationDuration: 260 }} />}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return <PolyClawThemeProvider><AuthProvider><NotificationBootstrap /><AuthenticatedStack /></AuthProvider></PolyClawThemeProvider>;
}
