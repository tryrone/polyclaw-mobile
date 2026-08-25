import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/provider';
export default function Index() {
  const { state, session } = useAuth();
  if (state === 'hydrating') return null;
  if (state === 'anonymous') return <Redirect href="/(onboarding)/welcome" />;
  return <Redirect href={session?.user.role === 'ADMIN' ? '/(tabs)' : '/(consumer)/home'} />;
}
