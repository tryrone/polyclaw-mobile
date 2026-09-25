import '@/polyfills';
import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import {
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth/provider';
import { PolyClawThemeProvider, usePolyClawTheme } from '@/theme';
import { NotificationBootstrap } from '@/notifications/bootstrap';
import { UnlockView } from '@/components/unlock-view';
import { PolyClawWalletProvider } from '@/wallet/privy-provider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@/components/app-bottom-sheet';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 500, fade: true });

function AuthenticatedStack() {
  const { state, session, biometricEnabled, biometricRequired, faceLoginEnabled, locked, recoveryMode, securityResolved, markUnlocked } = useAuth();
  const { theme } = usePolyClawTheme();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state === 'hydrating') return;
    const inOnboarding = pathname === '/welcome' || pathname === '/sign-in' || pathname === '/sign-up';
    const consumerRoutes = ['/home', '/trades', '/account'];
    const adminRoutes = ['/admin'];
    const inConsumer = consumerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
    const inAdmin = adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
    if (state === 'anonymous' && !inOnboarding) router.replace('/welcome' as never);
    if (state === 'authenticated' && inOnboarding) router.replace(session?.user.role === 'ADMIN' ? '/admin/games' : '/home');
    if (state === 'authenticated' && session?.user.role !== 'ADMIN' && !inOnboarding && !inConsumer) router.replace('/home');
    if (state === 'authenticated' && session?.user.role === 'ADMIN' && !inAdmin) router.replace('/admin/games');
  }, [pathname, router, session?.user.role, state]);

  if (state === 'authenticated' && !securityResolved) return null;
  const needsUnlock = faceLoginEnabled && state === 'authenticated' && !recoveryMode && (biometricRequired || biometricEnabled) && locked;
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {needsUnlock ? <UnlockView onSuccess={markUnlocked} /> : <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background }, animation: 'slide_from_right', animationDuration: 260 }} />}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  useEffect(() => { if (loaded) SplashScreen.hide(); }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PolyClawThemeProvider>
        <BottomSheetModalProvider>
          <AuthProvider><PolyClawWalletProvider><NotificationBootstrap /><AuthenticatedStack /></PolyClawWalletProvider></AuthProvider>
        </BottomSheetModalProvider>
      </PolyClawThemeProvider>
    </GestureHandlerRootView>
  );
}
