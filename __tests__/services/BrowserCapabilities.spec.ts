import {
  getRuntimeCapabilities,
  getStorageTypeSupport,
} from '../../src/services/BrowserCapabilities';

describe('BrowserCapabilities', () => {
  it('supports all targeted storage types on Chromium', () => {
    expect(
      getStorageTypeSupport({ browserDetect: browserName.Chrome }),
    ).toEqual({
      cache: true,
      indexedDb: true,
      localStorage: true,
      pluginData: true,
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
