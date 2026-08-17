/**
 * Copyright (c) 2020-2022 Kenneth Tran and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Generate browser-specific manifests from a shared Manifest V3 base without
 * modifying source files.
 */
const fs = require('fs');
const path = require('path');

const ROOTDIR = path.resolve(__dirname, '..');
const MANIFESTDIR = path.join(ROOTDIR, 'manifest');
const SUPPORTED_TARGETS = new Set(['chromium', 'firefox']);
const UNION_ARRAY_KEYS = new Set(['permissions', 'host_permissions']);

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const mergeManifest = (base, override, key = '') => {
  if (Array.isArray(base) && Array.isArray(override)) {
    if (UNION_ARRAY_KEYS.has(key)) {
      return [...new Set([...base, ...override])];
    }
    return [...override];
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const result = { ...base };
    for (const [childKey, value] of Object.entries(override)) {
      result[childKey] =
        childKey in result
          ? mergeManifest(result[childKey], value, childKey)
          : value;
    }
    return result;
  }

  return override;
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const validateManifest = (manifest, target) => {
  if (manifest.manifest_version !== 3) {
    throw new Error('Generated manifest must use Manifest V3.');
  }
  if (!manifest.action || manifest.browser_action) {
    throw new Error('Generated manifest must use action instead of browser_action.');
  }
  if (manifest.permissions.includes('<all_urls>')) {
    throw new Error('<all_urls> must be declared in host_permissions under MV3.');
  }
  if (!manifest.host_permissions.includes('<all_urls>')) {
    throw new Error('Expected <all_urls> host permission is missing.');
  }
  if (manifest.permissions.includes('tabs')) {
    throw new Error('tabs permission is redundant when <all_urls> is granted.');
  }

  if (target === 'chromium') {
    if (!manifest.background?.service_worker) {
      throw new Error('Chromium MV3 manifest requires a background service worker.');
    }
    if (manifest.permissions.includes('contextualIdentities')) {
      throw new Error('Chromium manifest must not request contextualIdentities.');
    }
  }

  if (target === 'firefox') {
    if (!Array.isArray(manifest.background?.scripts)) {
      throw new Error('Firefox manifest requires background.scripts.');
    }
    if (!manifest.permissions.includes('contextualIdentities')) {
      throw new Error('Firefox manifest requires contextualIdentities.');
    }
    if (!manifest.browser_specific_settings?.gecko?.id) {
      throw new Error('Firefox MV3 manifest requires a Gecko extension ID.');
    }
  }
};

const generateManifest = (target, outputFile) => {
  if (!SUPPORTED_TARGETS.has(target)) {
    throw new Error(
      `Unknown target "${target}". Expected one of: ${[
        ...SUPPORTED_TARGETS,
      ].join(', ')}`,
    );
  }

  const base = readJson(path.join(MANIFESTDIR, 'base.json'));
  const override = readJson(path.join(MANIFESTDIR, `${target}.json`));
  const manifest = mergeManifest(base, override);
  validateManifest(manifest, target);

  const destination =
    outputFile || path.join(ROOTDIR, 'builds', target, 'manifest.json');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
  return destination;
};

if (require.main === module) {
  const target = process.argv[2];
  const outputFile = process.argv[3]
    ? path.resolve(process.argv[3])
    : undefined;
  const destination = generateManifest(target, outputFile);
  console.log(`Generated ${target} manifest: ${destination}`);
}

module.exports = {
  generateManifest,
  mergeManifest,
  validateManifest,
};
