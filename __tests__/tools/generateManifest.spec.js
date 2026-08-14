const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  generateManifest,
  mergeManifest,
  validateManifest,
} = require('../../tools/generateManifest');

describe('generateManifest', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-manifest-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('unions permission arrays while overriding ordinary arrays', () => {
    expect(
      mergeManifest(
        { permissions: ['storage'], scripts: ['a.js'] },
        { permissions: ['cookies'], scripts: ['b.js'] },
      ),
    ).toEqual({
      permissions: ['storage', 'cookies'],
      scripts: ['b.js'],
    });
  });

  it('generates a Chromium MV3 manifest without Firefox-only permissions', () => {
    const output = path.join(tempDir, 'chromium.json');
    generateManifest('chromium', output);
    const manifest = JSON.parse(fs.readFileSync(output, 'utf8'));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.permissions).not.toContain('contextualIdentities');
    expect(manifest.permissions).not.toContain('<all_urls>');
    expect(manifest.host_permissions).toContain('<all_urls>');
    expect(() => validateManifest(manifest, 'chromium')).not.toThrow();
  });

  it('generates a Firefox MV3 manifest with Firefox-only settings', () => {
    const output = path.join(tempDir, 'firefox.json');
    generateManifest('firefox', output);
    const manifest = JSON.parse(fs.readFileSync(output, 'utf8'));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background.scripts).toContain(
      'bundles/background.bundle.js',
    );
    expect(manifest.permissions).toContain('contextualIdentities');
    expect(manifest.browser_specific_settings.gecko.id).toBe(
      'CookieAutoDelete@kennydo.com',
    );
    expect(() => validateManifest(manifest, 'firefox')).not.toThrow();
  });

  it('rejects unknown targets', () => {
    expect(() =>
      generateManifest('unknown', path.join(tempDir, 'x.json')),
    ).toThrow('Unknown target');
  });
});
