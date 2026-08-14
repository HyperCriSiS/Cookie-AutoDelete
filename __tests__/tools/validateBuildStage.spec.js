const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateBuildStage } = require('../../tools/validateBuildStage');

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
};

const createStage = (target) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-stage-'));
  const stage = path.join(root, 'stage');
  const source = path.join(root, 'source');
  fs.mkdirSync(stage, { recursive: true });
  fs.mkdirSync(source, { recursive: true });

  for (const locale of ['en', 'de']) {
    writeJson(path.join(source, '_locales', locale, 'messages.json'), {
      extensionName: { message: 'CAD' },
    });
    writeJson(path.join(stage, '_locales', locale, 'messages.json'), {
      extensionName: { message: 'CAD' },
    });
  }

  for (const file of [
    'bundles/background.bundle.js',
    'bundles/popup.bundle.js',
    'bundles/setting.bundle.js',
    'global_files/browser-polyfill.min.js',
    'global_files/browserDetect.js',
    'popup/popup.html',
    'settings/settings.html',
  ]) {
    const absolute = path.join(stage, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, 'test');
  }

  const manifest = {
    manifest_version: 3,
    homepage_url: 'https://github.com/Cookie-AutoDelete/Cookie-AutoDelete',
    author: 'CAD Team',
    action: {},
    permissions: ['scripting'],
    host_permissions: ['<all_urls>'],
    background:
      target === 'chromium'
        ? { service_worker: 'background.js' }
        : { scripts: ['bundles/background.bundle.js'] },
  };

  if (target === 'chromium') {
    fs.writeFileSync(path.join(stage, 'background.js'), 'test');
  } else {
    manifest.permissions.push('contextualIdentities');
    manifest.browser_specific_settings = {
      gecko: { id: 'CookieAutoDelete@kennydo.com' },
    };
  }
  writeJson(path.join(stage, 'manifest.json'), manifest);

  return { root, source, stage };
};

describe('validateBuildStage', () => {
  it.each(['chromium', 'firefox'])('accepts a valid %s stage', (target) => {
    const { root, source, stage } = createStage(target);
    expect(() =>
      validateBuildStage(target, stage, { production: true, sourceDir: source }),
    ).not.toThrow();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('rejects missing locales', () => {
    const { root, source, stage } = createStage('chromium');
    fs.rmSync(path.join(stage, '_locales', 'de'), { recursive: true });
    expect(() =>
      validateBuildStage('chromium', stage, {
        production: true,
        sourceDir: source,
      }),
    ).toThrow(/locale directories differ/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('rejects deprecated runtime files in a package', () => {
    const { root, source, stage } = createStage('chromium');
    fs.writeFileSync(
      path.join(stage, 'global_files', 'redux-webext.js'),
      'legacy',
    );
    expect(() =>
      validateBuildStage('chromium', stage, {
        production: true,
        sourceDir: source,
      }),
    ).toThrow(/redux-webext/);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
