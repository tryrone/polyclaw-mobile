const base = require('./app.json');

const easProjectId = 'c162f4a8-1f69-4cbf-be9a-e2fd1a5db083';

function requestedPlatform() {
  const index = process.argv.findIndex((argument) => argument === '--platform' || argument === '-p');
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function googlePlugin() {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  const needsIos = process.argv.includes('run:ios') || (process.argv.includes('prebuild') && requestedPlatform() !== 'android');
  if (!iosUrlScheme && needsIos) throw new Error('EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is required for a PolyClaw iOS native build.');
  return iosUrlScheme ? [['react-native-nitro-google-signin', { iosUrlScheme }]] : [];
}

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    updates: {
      ...(base.expo.updates ?? {}),
      url: `https://u.expo.dev/${easProjectId}`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      ...(base.expo.extra ?? {}),
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      eas: {
        projectId: easProjectId,
      },
    },
    plugins: [
      ...(base.expo.plugins ?? []),
      ...googlePlugin(),
    ],
  },
};
