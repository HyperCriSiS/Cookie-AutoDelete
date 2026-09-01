import { spawnSync } from 'node:child_process';
import path from 'node:path';

const extensionDir = process.argv[2] || process.env.CAD_E2E_EXTENSION_DIR;
if (!extensionDir) {
  throw new Error('Usage: node tests/e2e/chromium-suite.mjs <unpacked Chromium extension directory>');
}

for (const script of ['chromium.mjs', 'chromium-startup.mjs']) {
  const result = spawnSync(
    process.execPath,
    [path.resolve('tests/e2e', script), extensionDir],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
