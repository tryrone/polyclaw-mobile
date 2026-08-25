import type { OneTapResponse } from 'react-native-nitro-google-signin';
import { loginWithGoogleIdToken } from '@/lib/api';

type GoogleModule = typeof import('react-native-nitro-google-signin');
let loaded: GoogleModule | null | undefined;

async function nativeModule() {
  if (loaded !== undefined) return loaded;
  loaded = await import('react-native-nitro-google-signin').catch(() => null);
  return loaded;
}

function responseError(module: GoogleModule, response: OneTapResponse) {
  if (module.isCancelledResponse(response)) return new Error('Google sign in was cancelled.');
  return new Error('Google sign in did not return a complete account.');
}

export async function signInWithGoogle() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!webClientId) throw new Error('Google sign in is not configured for this build.');
  const module = await nativeModule();
  if (!module) throw new Error('Google sign in requires a PolyClaw development or store build.');
  module.GoogleOneTapSignIn.configure({ webClientId, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() });
  await module.GoogleOneTapSignIn.checkPlayServices(true);
  let response = await module.GoogleOneTapSignIn.signIn();
  if (module.isNoSavedCredentialFoundResponse(response)) response = await module.GoogleOneTapSignIn.createAccount();
  if (!module.isSuccessResponse(response)) throw responseError(module, response);
  if (!response.data.idToken) throw new Error('Google sign in did not return an ID token.');
  return loginWithGoogleIdToken(response.data.idToken);
}
