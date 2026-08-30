import { browserName, SiteDataType } from '../../src/typings/Enums';
import {
  getBrowserMajorVersionFromUserAgent,
  hasFirefoxSessionRestoreTab,
  getRuntimeCapabilities,
  getStorageTypeSupport,
  supportsPartitionedCookies,
  supportsStorageType,
  usesBrowsingDataOrigins,
} from '../../src/services/BrowserCapabilities';

describe('BrowserCapabilities', () => {
  it.each([
    browserName.Chrome,
    browserName.EdgeChromium,
    browserName.Opera,
  ])('supports modern Chromium storage types on %s', (name) => {
    expect(getStorageTypeSupport({ browserDetect: name })).toEqual({
      cache: true,
      indexedDb: true,
      localStorage: true,
      pluginData: false,
      serviceWorkers: true,
    });
  });

  it('supports modern Firefox Android storage cleanup', () => {
    expect(
      getStorageTypeSupport({
        browserDetect: browserName.Firefox,
        browserVersion: '115.0',
        platformOs: 'android',
      }),
    ).toEqual({
      cache: true,
      indexedDb: true,
      localStorage: true,
      pluginData: true,
      serviceWorkers: true,
    });
  });

  it('retains historical desktop Firefox storage thresholds', () => {
    expect(
      getStorageTypeSupport({
        browserDetect: browserName.Firefox,
        browserVersion: '77.0',
        platformOs: 'linux',
      }),
    ).toEqual({
      cache: false,
      indexedDb: true,
      localStorage: true,
      pluginData: false,
      serviceWorkers: true,
    });
  });

  it('fails closed when browser or version is unknown', () => {
    expect(getStorageTypeSupport({ browserDetect: browserName.Unknown })).toEqual(
      {
        cache: false,
        indexedDb: false,
        localStorage: false,
        pluginData: false,
        serviceWorkers: false,
      },
    );
    expect(
      getStorageTypeSupport({ browserDetect: browserName.Firefox }),
    ).toEqual({
      cache: false,
      indexedDb: false,
      localStorage: false,
      pluginData: false,
      serviceWorkers: false,
    });
  });

  it('treats Chromium pluginData as unsupported because the API ignores it', () => {
    expect(
      supportsStorageType(
        { browserDetect: browserName.Chrome },
        SiteDataType.PLUGINDATA,
      ),
    ).toBe(false);
  });

  it('uses origins for Chromium-family targeted browsing-data cleanup', () => {
    expect(usesBrowsingDataOrigins(browserName.Chrome)).toBe(true);
    expect(usesBrowsingDataOrigins(browserName.EdgeChromium)).toBe(true);
    expect(usesBrowsingDataOrigins(browserName.Opera)).toBe(true);
    expect(usesBrowsingDataOrigins(browserName.Firefox)).toBe(false);
  });

  it('parses Chromium-family major versions from user agents', () => {
    expect(
      getBrowserMajorVersionFromUserAgent(
        browserName.Chrome,
        'Mozilla/5.0 Chrome/119.0.0.0 Safari/537.36',
      ),
    ).toBe(119);
    expect(
      getBrowserMajorVersionFromUserAgent(
        browserName.EdgeChromium,
        'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
      ),
    ).toBe(130);
    expect(
      getBrowserMajorVersionFromUserAgent(
        browserName.Opera,
        'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
      ),
    ).toBe(115);
  });

  it('enables partitioned-cookie queries only on supported browser versions', () => {
    expect(
      supportsPartitionedCookies({
        browserDetect: browserName.Chrome,
        browserVersion: 118,
      }),
    ).toBe(false);
    expect(
      supportsPartitionedCookies({
        browserDetect: browserName.Chrome,
        browserVersion: 119,
      }),
    ).toBe(true);
    expect(
      supportsPartitionedCookies({
        browserDetect: browserName.Firefox,
        browserVersion: 94,
      }),
    ).toBe(true);
  });

  it('recognizes only an explicit Firefox session-restore page at startup', () => {
    expect(
      hasFirefoxSessionRestoreTab([
        { url: 'about:blank' },
        { url: 'https://example.com/' },
      ]),
    ).toBe(false);
    expect(
      hasFirefoxSessionRestoreTab([
        { url: 'about:blank' },
        { url: 'about:sessionrestore' },
      ]),
    ).toBe(true);
  });

  it('detects runtime APIs by capability instead of browser name', () => {
    const previousAction = (global.browser as any).action;
    const previousScripting = (global.browser as any).scripting;
    const previousSession = (global.browser.storage as any).session;

    (global.browser as any).action = {};
    (global.browser as any).scripting = { executeScript: jest.fn() };
    (global.browser.storage as any).session = {};

    expect(getRuntimeCapabilities()).toEqual(
      expect.objectContaining({
        action: true,
        contextualIdentities: Boolean(global.browser.contextualIdentities),
        scripting: true,
        sessionStorage: true,
      }),
    );

    (global.browser as any).action = previousAction;
    (global.browser as any).scripting = previousScripting;
    (global.browser.storage as any).session = previousSession;
  });
});
