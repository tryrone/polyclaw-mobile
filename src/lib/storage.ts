import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthSession } from './types';

const KEY = 'polyclaw.operator.session';

async function secureAvailable() {
  return Platform.OS !== 'web' && SecureStore.isAvailableAsync();
}

export async function readSession(): Promise<AuthSession | null> {
  const raw = (await secureAvailable()) ? await SecureStore.getItemAsync(KEY) : await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthSession; } catch { return null; }
}

export async function writeSession(session: AuthSession | null) {
  if (!session) {
    if (await secureAvailable()) await SecureStore.deleteItemAsync(KEY);
    else await AsyncStorage.removeItem(KEY);
    return;
  }
  const raw = JSON.stringify(session);
  if (await secureAvailable()) await SecureStore.setItemAsync(KEY, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await AsyncStorage.setItem(KEY, raw);
}
