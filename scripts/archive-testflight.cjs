// Use the same public TestFlight configuration for native generation and Metro.
// Provider secrets belong on the backend and must never be supplied here.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
process.env.NODE_ENV = 'production';
require('@expo/env').load(process.cwd());
Object.assign(process.env, require('../eas.json').build.testflight.env, {
  EAS_BUILD_PROFILE: 'testflight',
  EAS_BUILD_PLATFORM: 'ios',
});

function run(command, args) {
  const result = spawnSync(command, args, { env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [require.resolve('expo/bin/cli'), 'prebuild', '--platform', 'ios', '--no-install']);
if (!process.argv.includes('--prepare-only')) {
  run('pod', ['install', '--project-directory=ios']);
  const { expo } = require('../app.json');
  const archivePath = path.join('/tmp', `PolyClaw-${expo.version}-${expo.ios.buildNumber}.xcarchive`);
  run('xcodebuild', ['archive', '-workspace', 'ios/PolyClaw.xcworkspace', '-scheme', 'PolyClaw',
    '-configuration', 'Release', '-destination', 'generic/platform=iOS',
    '-archivePath', archivePath, '-allowProvisioningUpdates']);
}
