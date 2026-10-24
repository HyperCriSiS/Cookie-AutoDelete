const fs = require('fs');
const path = require('path');
const vm = require('vm');

const browserDetectSource = fs.readFileSync(
  path.join(__dirname, '../../extension/global_files/browserDetect.js'),
  'utf8',
);

const detectBrowser = (userAgent = '', browserApi = {}) => {
  const context = {
    browser: browserApi,
    navigator: { userAgent },
  };
  vm.createContext(context);
  vm.runInContext(browserDetectSource, context);
  return context.browserDetect();
};

describe('browserDetect', () => {
  it('detects Firefox by user agent', () => {
    expect(detectBrowser('Mozilla/5.0 Firefox/128.0')).toBe('Firefox');
  });

  it('detects Firefox by contextualIdentities capability', () => {
    expect(detectBrowser('worker', { contextualIdentities: {} })).toBe(
      'Firefox',
    );
  });

  it('detects Chromium browsers without window or document', () => {
    expect(
      detectBrowser(
        'Mozilla/5.0 AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome');
    expect(
      detectBrowser(
        'Mozilla/5.0 AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
      ),
    ).toBe('EdgeChromium');
    expect(
      detectBrowser(
        'Mozilla/5.0 AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36 OPR/120.0.0.0',
      ),
    ).toBe('Opera');
  });

  it('detects Safari', () => {
    expect(detectBrowser('Mozilla/5.0 Version/18.0 Safari/605.1.15')).toBe(
      'Safari',
    );
  });

  it('returns UnknownBrowser when no supported browser can be detected', () => {
    expect(detectBrowser('')).toBe('UnknownBrowser');
  });
});
