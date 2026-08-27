const { IOSConfig, withInfoPlist, withXcodeProject } = require('expo/config-plugins');

function getIosVersion(config) {
  return config.ios?.version || config.version || '1.0.0';
}

function getIosBuildNumber(config) {
  const buildNumber = config.ios?.buildNumber;
  if (!buildNumber || !/^\d+$/.test(buildNumber)) {
    throw new Error('expo.ios.buildNumber must be a positive integer string before generating the iOS project.');
  }
  return buildNumber;
}

function withIosVersionSync(config) {
  const marketingVersion = getIosVersion(config);
  const buildNumber = getIosBuildNumber(config);

  config = withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.CFBundleShortVersionString = '$(MARKETING_VERSION)';
    nextConfig.modResults.CFBundleVersion = '$(CURRENT_PROJECT_VERSION)';
    return nextConfig;
  });

  return withXcodeProject(config, (nextConfig) => {
    const [, nativeTarget] = IOSConfig.Target.findFirstNativeTarget(nextConfig.modResults);
    const buildConfigurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      nextConfig.modResults,
      nativeTarget.buildConfigurationList,
    );

    for (const [, buildConfiguration] of buildConfigurations) {
      buildConfiguration.buildSettings.MARKETING_VERSION = marketingVersion;
      buildConfiguration.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
    }

    return nextConfig;
  });
}

module.exports = withIosVersionSync;
