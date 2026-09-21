const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateManifest } = require('../../tools/generateManifest');

describe.each(['chromium', 'firefox'])(
  '%s popup/options build surface',
  (target) => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-ui-manifest-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('keeps popup and options entry points wired in the generated MV3 manifest', () => {
      const output = path.join(tempDir, `${target}.json`);
      generateManifest(target, output);
      const manifest = JSON.parse(fs.readFileSync(output, 'utf8'));

      expect(manifest.action.default_popup).toBe('popup/popup.html');
      expect(manifest.options_ui).toEqual(
        expect.objectContaining({
          page: 'settings/settings.html',
          open_in_tab: true,
        }),
      );

      if (target === 'chromium') {
        expect(manifest.background.service_worker).toBe('background.js');
      } else {
        expect(manifest.background.scripts).toContain(
          'bundles/background.bundle.js',
        );
      }
    });
  },
);
