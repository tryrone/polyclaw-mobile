const expectedProjectId = 'c162f4a8-1f69-4cbf-be9a-e2fd1a5db083';
const expectedUpdateUrl = `https://u.expo.dev/${expectedProjectId}`;

let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  const config = JSON.parse(input);
  const actual = {
    projectId: config.extra?.eas?.projectId ?? null,
    runtimePolicy: config.runtimeVersion?.policy ?? null,
    updatesUrl: config.updates?.url ?? null,
  };

  if (
    actual.projectId !== expectedProjectId ||
    actual.runtimePolicy !== 'appVersion' ||
    actual.updatesUrl !== expectedUpdateUrl
  ) {
    console.error(JSON.stringify({ error: 'EAS_UPDATE_CONFIG_MISMATCH', ...actual }));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(actual));
});
