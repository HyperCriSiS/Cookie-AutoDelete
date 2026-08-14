/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Central capability decisions for browser-specific WebExtension behavior.
 * Keep browser/version checks here instead of scattering them through cleanup
 * and UI code. Runtime-detectable APIs are detected directly where possible.
 */

export type StorageTypeSupport = Readonly<{
  cache: boolean;
  indexedDb: boolean;
  localStorage: boolean;
  pluginData: boolean;
  serviceWorkers: boolean;
}>;

export type RuntimeCapabilities = Readonly<{
  action: boolean;
  browsingData: boolean;
  contextualIdentities: boolean;
  scripting: boolean;
  sessionStorage: boolean;
}>;

const NONE: StorageTypeSupport = Object.freeze({
  cache: false,
  indexedDb: false,
  localStorage: false,
  pluginData: false,
  serviceWorkers: false,
});

const CHROMIUM_STORAGE: StorageTypeSupport = Object.freeze({
  cache: true,
  indexedDb: true,
  localStorage: true,
  // Chromium has ignored pluginData since Chrome 88 after Flash removal.
  pluginData: false,
  serviceWorkers: true,
});

const FIREFOX_MODERN_STORAGE: StorageTypeSupport = Object.freeze({
  cache: true,
  indexedDb: true,
  localStorage: true,
  pluginData: true,
  serviceWorkers: true,
});

const isChromiumFamily = (name: browserName | undefined): boolean =>
  name === browserName.Chrome ||
  name === browserName.EdgeChromium ||
  name === browserName.Opera;

export const usesBrowsingDataOrigins = (
  name: browserName | undefined,
): boolean => isChromiumFamily(name);

export const getStorageTypeSupport = (
  cache: CacheMap,
): StorageTypeSupport => {
  if (isChromiumFamily(cache.browserDetect)) return CHROMIUM_STORAGE;
  if (cache.browserDetect !== browserName.Firefox) return NONE;

  const version = Number.parseInt(String(cache.browserVersion), 10);
  if (!Number.isFinite(version)) return NONE;

  // Firefox for Android gained the relevant browsingData storage cleanup
  // support as a group. Our current Firefox floor (115) is above this, but the
  // threshold is retained here so imported/test states are evaluated safely.
  if (cache.platformOs === 'android') {
    return version >= 85 ? FIREFOX_MODERN_STORAGE : NONE;
  }

  return {
    cache: version >= 78,
    indexedDb: version >= 77,
    localStorage: version >= 58,
    pluginData: version >= 78,
    serviceWorkers: version >= 77,
  };
};

export const supportsStorageType = (
  cache: CacheMap,
  siteData: SiteDataType,
): boolean => {
  const support = getStorageTypeSupport(cache);
  switch (siteData) {
    case SiteDataType.CACHE:
      return support.cache;
    case SiteDataType.INDEXEDDB:
      return support.indexedDb;
    case SiteDataType.LOCALSTORAGE:
      return support.localStorage;
    case SiteDataType.PLUGINDATA:
      return support.pluginData;
    case SiteDataType.SERVICEWORKERS:
      return support.serviceWorkers;
    default:
      return false;
  }
};

export const getRuntimeCapabilities = (): RuntimeCapabilities => {
  const api = browser as any;
  return {
    action: Boolean(api.action || api.browserAction),
    browsingData: typeof api.browsingData?.remove === 'function',
    contextualIdentities: Boolean(api.contextualIdentities),
    scripting: typeof api.scripting?.executeScript === 'function',
    sessionStorage: Boolean(api.storage?.session),
  };
};
