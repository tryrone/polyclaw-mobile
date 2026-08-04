import Constants from 'expo-constants';

const configured = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL;

export const apiBaseUrl = typeof configured === 'string' ? configured.replace(/\/$/, '') : '';
export const expoProjectId = Constants.expoConfig?.extra?.expoProjectId as string | undefined;
