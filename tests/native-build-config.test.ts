import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
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
