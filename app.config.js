const easProjectId = 'c162f4a8-1f69-4cbf-be9a-e2fd1a5db083';

function requestedPlatform() {
  const index = process.argv.findIndex((argument) => argument === '--platform' || argument === '-p');
  return index >= 0 ? process.argv[index + 1] : process.env.EAS_BUILD_PLATFORM?.trim().toLowerCase();
}

function googlePlugin() {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  const needsIos = process.argv.includes('run:ios') || (process.argv.includes('prebuild') && requestedPlatform() !== 'android') || (Boolean(process.env.EAS_BUILD_PROFILE) && requestedPlatform() !== 'android');
  if (!iosUrlScheme && needsIos) throw new Error('EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is required for a PolyClaw iOS native build.');
  return iosUrlScheme ? [['react-native-nitro-google-signin', { iosUrlScheme }]] : [];
}

function passkeyDomain() {
  return process.env.EXPO_PUBLIC_PRIVY_PASSKEY_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function validateStoreBuild() {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile !== 'preview' && profile !== 'production') return;
  if (requestedPlatform() === 'android') throw new Error('PolyClaw Android store builds are disabled for the initial release.');
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
  const revenueCatKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';
  const productId = process.env.EXPO_PUBLIC_REVENUECAT_PRODUCT_ID?.trim() ?? '';
  const accessMode = process.env.EXPO_PUBLIC_POLYCLAW_ACCESS_MODE?.trim() || 'PILOT';
  if (!['PILOT', 'HYBRID', 'SUBSCRIPTION'].includes(accessMode)) throw new Error('EXPO_PUBLIC_POLYCLAW_ACCESS_MODE must be PILOT, HYBRID, or SUBSCRIPTION.');
  if (!apiUrl.startsWith('https://')) throw new Error('EXPO_PUBLIC_API_URL must use HTTPS for preview and production builds.');
  if (accessMode !== 'PILOT' && !revenueCatKey.startsWith('appl_')) throw new Error('The dedicated PolyClaw RevenueCat iOS appl_ public key is required outside PILOT mode.');
  if (accessMode !== 'PILOT' && productId !== 'polyclaw_bot_monthly') throw new Error('EXPO_PUBLIC_REVENUECAT_PRODUCT_ID must be polyclaw_bot_monthly outside PILOT mode.');
  if (!process.env.EXPO_PUBLIC_PRIVY_APP_ID?.trim() || !process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID?.trim()) throw new Error('The dedicated PolyClaw Privy app and client IDs are required for preview and production builds.');
  if (!passkeyDomain()) throw new Error('EXPO_PUBLIC_PRIVY_PASSKEY_DOMAIN is required for preview and production builds.');
}

validateStoreBuild();

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...(config.ios ?? {}),
    associatedDomains: passkeyDomain()
      ? [...new Set([...(config.ios?.associatedDomains ?? []), `webcredentials:${passkeyDomain()}`])]
      : config.ios?.associatedDomains,
  },
  updates: {
    ...(config.updates ?? {}),
    url: `https://u.expo.dev/${easProjectId}`,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    ...(config.extra ?? {}),
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    privyAppId: process.env.EXPO_PUBLIC_PRIVY_APP_ID,
    privyClientId: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,
    polyClawAccessMode: process.env.EXPO_PUBLIC_POLYCLAW_ACCESS_MODE ?? 'PILOT',
    eas: {
      projectId: easProjectId,
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    './plugins/with-ios-version-sync',
    ['expo-build-properties', {
      ios: {
        deploymentTarget: '16.4',
        // RN 0.86.3's precompiled iOS frameworks omit renderer symbols used by
        // our native modules (Nitro Google Sign-In, Reanimated, SVG, and RNGH).
        buildReactNativeFromSource: true,
      },
    }],
    ...googlePlugin(),
  ],
});
