/**
 * Copyright (c) 2020-2022 Kenneth Tran and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 */
const fs = require('fs');
const path = require('path');

const EXPECTED_HOMEPAGE =
  'https://github.com/Cookie-AutoDelete/Cookie-AutoDelete';
const EXPECTED_AUTHOR = 'CAD Team';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Build validation failed: ${message}`);
};

const listFiles = (directory, base = directory) => {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(absolute, base));
    } else {
      files.push(path.relative(base, absolute).replaceAll(path.sep, '/'));
    }
  }
  return files.sort();
};

const localeNames = (directory) => {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const validateLocales = (stageDir, sourceDir) => {
  const sourceLocales = localeNames(path.join(sourceDir, '_locales'));
  const stagedLocales = localeNames(path.join(stageDir, '_locales'));

  assert(sourceLocales.length > 0, 'source locale list is empty');
  assert(
    JSON.stringify(stagedLocales) === JSON.stringify(sourceLocales),
    `locale directories differ. source=${sourceLocales.join(',')} staged=${stagedLocales.join(',')}`,
  );

  for (const locale of stagedLocales) {
    const messages = path.join(stageDir, '_locales', locale, 'messages.json');
    assert(fs.existsSync(messages), `${locale}/messages.json is missing`);
    JSON.parse(fs.readFileSync(messages, 'utf8'));
  }
};

const validateBuildStage = (
  target,
  stageDir,
  { production = false, sourceDir = stageDir } = {},
) => {
  assert(['chromium', 'firefox'].includes(target), `unknown target ${target}`);

  const manifestPath = path.join(stageDir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json is missing');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert(manifest.manifest_version === 3, 'manifest_version must be 3');
  assert(manifest.homepage_url === EXPECTED_HOMEPAGE, 'homepage_url changed');
  assert(manifest.author === EXPECTED_AUTHOR, 'author metadata changed');
  assert(manifest.action, 'MV3 action entry is missing');
  assert(Array.isArray(manifest.host_permissions), 'host_permissions missing');
  assert(
    manifest.host_permissions.includes('<all_urls>'),
    '<all_urls> host permission missing',
  );
  assert(
    Array.isArray(manifest.permissions) &&
      manifest.permissions.includes('scripting'),
    'scripting permission missing',
  );
  assert(
    !manifest.permissions.includes('unlimitedStorage'),
    'unlimitedStorage must not be added without a demonstrated requirement',
  );

  if (target === 'chromium') {
    assert(
      manifest.background?.service_worker === 'background.js',
      'Chromium service_worker must be background.js',
    );
    assert(
      !manifest.background?.scripts,
      'Chromium manifest must not contain background.scripts',
    );
    assert(
      !manifest.permissions.includes('contextualIdentities'),
      'Chromium manifest contains Firefox-only contextualIdentities',
    );
    assert(
      fs.existsSync(path.join(stageDir, 'background.js')),
      'Chromium background.js loader is missing',
    );
  } else {
    assert(
      Array.isArray(manifest.background?.scripts),
      'Firefox background.scripts is missing',
    );
    assert(
      !manifest.background?.service_worker,
      'Firefox manifest must not contain background.service_worker',
    );
    assert(
      manifest.permissions.includes('contextualIdentities'),
      'Firefox contextualIdentities permission is missing',
    );
    assert(
      manifest.browser_specific_settings?.gecko?.id ===
        'CookieAutoDelete@kennydo.com',
      'Firefox extension ID changed',
    );
  }

  for (const required of [
    'bundles/background.bundle.js',
    'bundles/popup.bundle.js',
    'bundles/setting.bundle.js',
    'global_files/browser-polyfill.min.js',
    'global_files/browserDetect.js',
    'popup/popup.html',
    'settings/settings.html',
  ]) {
    assert(fs.existsSync(path.join(stageDir, required)), `${required} is missing`);
  }

  validateLocales(stageDir, sourceDir);

  const files = listFiles(stageDir);
  assert(
    !files.some((file) => file.endsWith('redux-webext.js')),
    'deprecated redux-webext.js is packaged',
  );
  if (production) {
    assert(
      !files.some((file) => file.endsWith('.map')),
      'source map found in production package',
    );
  }

  console.log(`Validated ${target} build stage (${files.length} files).`);
};

module.exports = { validateBuildStage };

if (require.main === module) {
  const [, , target, stageDir, sourceDir] = process.argv;
  if (!target || !stageDir) {
    console.error(
      'Usage: node tools/validateBuildStage.js <chromium|firefox> <stageDir> [sourceExtensionDir]',
    );
    process.exitCode = 1;
  } else {
    validateBuildStage(target, path.resolve(stageDir), {
      production: false,
      sourceDir: sourceDir ? path.resolve(sourceDir) : path.resolve(stageDir),
    });
  }
}
