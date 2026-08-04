import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth/provider';
import { PolyClawThemeProvider, usePolyClawTheme } from '@/theme';
import { NotificationBootstrap } from '@/notifications/bootstrap';

SplashScreen.preventAutoHideAsync();

function AuthenticatedStack() {
  const { state } = useAuth();
  const { theme } = usePolyClawTheme();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (state === 'hydrating') return;
    const onLogin = pathname === '/login';
    if (state === 'anonymous' && !onLogin) router.replace('/login');
    if (state === 'authenticated' && onLogin) router.replace('/');
  }, [pathname, router, state]);
  return <>
    <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
  </>;
}

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return <PolyClawThemeProvider><AuthProvider><NotificationBootstrap /><AuthenticatedStack /></AuthProvider></PolyClawThemeProvider>;
}
