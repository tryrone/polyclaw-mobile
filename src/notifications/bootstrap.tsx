import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '@/lib/api';
import { expoProjectId } from '@/lib/config';
import { useAuth } from '@/auth/provider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

export function NotificationBootstrap() {
  const { session } = useAuth();
  useEffect(() => {
    if (!session || !Device.isDevice || !expoProjectId) return;
    (async () => {
      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId: expoProjectId })).data;
      await registerPushToken(session.accessToken, token);
    })().catch(() => undefined);
  }, [session]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = response.notification.request.content.data?.path;
      if (typeof path === 'string' && path.startsWith('/')) router.push(path as never);
    });
    return () => subscription.remove();
  }, []);
  return null;
}
