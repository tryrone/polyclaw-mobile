import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const require = createRequire(import.meta.url);

test('iOS builds compile React Native from source', () => {
  const configureApp = require('../app.config.js') as (input: { config: Record<string, unknown> }) => {
    plugins: unknown[];
  };
  const config = configureApp({ config: { plugins: [] } });
  const buildProperties = config.plugins.find(
    (plugin): plugin is [string, { ios?: { buildReactNativeFromSource?: boolean } }] =>
      Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
  );

  assert.equal(buildProperties?.[1].ios?.buildReactNativeFromSource, true);
});

test('only an explicit TestFlight paper pilot can build without wallet credentials', () => {
  const check = (overrides: Record<string, string | undefined>) => spawnSync(process.execPath, ['-e', "require('./app.config.js')({ config: {} })"], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: {
      ...process.env,
      EAS_BUILD_PROFILE: 'testflight',
      EAS_BUILD_PLATFORM: 'ios',
      EXPO_PUBLIC_API_URL: 'https://example.invalid',
      EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: 'com.googleusercontent.apps.test',
      EXPO_PUBLIC_POLYCLAW_ACCESS_MODE: 'PILOT',
      EXPO_PUBLIC_POLYCLAW_WALLET_ENABLED: 'false',
      EXPO_PUBLIC_PRIVY_APP_ID: '',
      EXPO_PUBLIC_PRIVY_CLIENT_ID: '',
      EXPO_PUBLIC_PRIVY_PASSKEY_DOMAIN: '',
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: '',
      ...overrides,
    },
  });
  assert.equal(check({}).status, 0);
  for (const overrides of [
    { EAS_BUILD_PROFILE: 'production' },
    { EAS_BUILD_PROFILE: 'preview' },
    { EXPO_PUBLIC_POLYCLAW_WALLET_ENABLED: 'true' },
    { EXPO_PUBLIC_POLYCLAW_ACCESS_MODE: 'SUBSCRIPTION' },
    { EXPO_PUBLIC_API_URL: 'http://example.invalid' },
    { EAS_BUILD_PLATFORM: 'android' },
    { EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: '' },
  ]) assert.notEqual(check(overrides).status, 0);
});
