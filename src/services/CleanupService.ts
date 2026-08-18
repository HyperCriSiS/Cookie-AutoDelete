/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import {
  getStorageTypeSupport,
  usesBrowsingDataOrigins,
} from './BrowserCapabilities';
import {
  cookiePartitionDetails,
  getAllCookiesIncludingPartitions,
} from './CookieApi';
import {
  CADCOOKIENAME,
  cadLog,
  extractMainDomain,
  getHostname,
  getSetting,
  isAWebpage,
  prepareCleanupDomains,
  prepareCookieDomain,
  returnMatchedExpressionObject,
  returnOptionalCookieAPIAttributes,
  showNotification,
  siteDataToBrowser,
  SITEDATATYPES,
  sleep,
  throwErrorNotification,
  trimDot,
  undefinedIsTrue,
} from './Libs';

/** Prepare a cookie for deletion */
export const prepareCookie = (
  cookie: CadCookie,
  debug = false,
): CookiePropertiesCleanup => {
  const cookieProperties = {
    ...cookie,
    hostname: '',
    mainDomain: '',
    preparedCookieDomain: prepareCookieDomain(cookie),
  };
  if (cookieProperties.preparedCookieDomain.startsWith('file:')) {
    cookieProperties.hostname = cookieProperties.preparedCookieDomain;
    cookieProperties.mainDomain = cookieProperties.preparedCookieDomain;
  } else {
    cookieProperties.hostname = getHostname(
      cookieProperties.preparedCookieDomain,
    );
    cookieProperties.mainDomain = extractMainDomain(cookieProperties.hostname);
  }
  cadLog(
    {
      msg: 'CleanupService.prepareCookie: results',
      x: {
        domain: cookie.domain,
        path: cookie.path,
        preparedCookieDomain: cookieProperties.preparedCookieDomain,
        mainDomain: cookieProperties.mainDomain,
        hostname: cookieProperties.hostname,
      },
    },
    debug,
  );
  return cookieProperties;
};

/** Returns an object representing the cookie with internal flags */
export const isSafeToClean = (
  state: State,
  cookieProperties: CookiePropertiesCleanup,
  cleanupProperties: CleanupPropertiesInternal,
): CleanReasonObject => {
  const debug = getSetting(state, SettingID.DEBUG_MODE) as boolean;
  const {
    mainDomain,
    storeId,
    hostname,
    name,
    expirationDate,
    firstPartyDomain,
    session,
  } = cookieProperties;
  const partialCookieInfo = {
    mainDomain,
    storeId,
    hostname,
    name,
    expirationDate,
    firstPartyDomain,
    session,
  };
  const { greyCleanup, openTabDomains, ignoreOpenTabs } = cleanupProperties;
  const openTabStatus = ignoreOpenTabs
    ? OpenTabStatus.TabsWereIgnored
    : OpenTabStatus.TabsWasNotIgnored;
  cadLog(
    {
      msg: 'CleanupService.isSafeToClean:  Properties Debug',
      x: { partialCookieInfo, cleanupProperties, openTabStatus },
    },
    debug,
  );

  if (openTabDomains[storeId] && openTabDomains[storeId].includes(mainDomain)) {
    cadLog(
      {
        msg: `CleanupService.isSafeToClean:  mainDomain found in openTabsDomain[${storeId}] - not cleaning.`,
        x: { partialCookieInfo, openTabsInStoreId: openTabDomains[storeId] },
      },
      debug,
    );
    return {
      cached: false,
      cleanCookie: false,
      cookie: cookieProperties,
      openTabStatus,
      reason: ReasonKeep.OpenTabs,
    };
  }

  const matchedExpression = returnMatchedExpressionObject(
    state,
    storeId,
    hostname,
  );

  if (
    matchedExpression &&
    cookieProperties.name === CADCOOKIENAME &&
    (matchedExpression.listType === ListType.WHITE ||
      (matchedExpression.listType === ListType.GREY &&
        (greyCleanup ||
          (matchedExpression.cleanSiteData &&
            matchedExpression.cleanSiteData.length !== 0))))
  ) {
    cadLog(
      {
        msg: 'CleanupService.isSafeToClean:  Internal CAD Cookie.  Removing Cookie to trigger browsingData cleanups.',
        x: {
          partialCookieInfo,
          cleanSiteData: matchedExpression.cleanSiteData,
        },
      },
      debug,
    );
    return {
      cached: false,
      cleanCookie: true,
      cookie: cookieProperties,
      expression: matchedExpression,
      openTabStatus,
      reason: greyCleanup
        ? ReasonClean.CADSiteDataCookieRestart
        : ReasonClean.CADSiteDataCookie,
    };
  }

  if (getSetting(state, SettingID.CLEAN_EXPIRED) as boolean) {
    const now = Math.ceil(Date.now() / 1000);
    if (expirationDate && expirationDate < now) {
      cadLog(
        {
          msg: `CleanupService.isSafeToClean:  Cookie Expired since ${expirationDate}.  Date.now is ${now}`,
          x: {
            partialCookieInfo,
            cleanSiteData: matchedExpression?.cleanSiteData,
          },
        },
        debug,
      );
      return {
        cached: false,
        cleanCookie: true,
        cookie: cookieProperties,
        expression: matchedExpression,
        openTabStatus,
        reason: greyCleanup
          ? ReasonClean.ExpiredCookieRestart
          : ReasonClean.ExpiredCookie,
      };
    }
  }

  if (greyCleanup && !matchedExpression) {
    cadLog(
      {
        msg: 'CleanupService.isSafeToClean:  unmatched and greyCleanup.  Safe to Clean',
        x: partialCookieInfo,
      },
      debug,
    );
    return {
      cached: false,
      cleanCookie: true,
      cookie: cookieProperties,
      openTabStatus,
      reason: ReasonClean.StartupNoMatchedExpression,
    };
  }

  if (
    greyCleanup &&
    matchedExpression &&
    matchedExpression.listType === ListType.GREY &&
    (undefinedIsTrue(matchedExpression.cleanAllCookies) ||
      (matchedExpression.cookieNames &&
        !matchedExpression.cookieNames.includes(cookieProperties.name)))
  ) {
    cadLog(
      {
        msg: 'CleanupService.isSafeToClean:  greyCleanup - matching Expression and cookie name was unchecked.  Safe to Clean.',
        x: { partialCookieInfo, matchedExpression },
      },
      debug,
    );
    return {
      cached: false,
      cleanCookie: true,
      cookie: cookieProperties,
      expression: matchedExpression,
      openTabStatus,
      reason: ReasonClean.StartupCleanupAndGreyList,
    };
  }

  if (!matchedExpression) {
    cadLog(
      {
        msg: 'CleanupService.isSafeToClean:  unmatched Expression.  Safe to Clean.',
        x: partialCookieInfo,
      },
      debug,
    );
    return {
      cached: false,
      cleanCookie: true,
      cookie: cookieProperties,
      openTabStatus,
      reason: ReasonClean.NoMatchedExpression,
    };
  }
  if (
    matchedExpression &&
    !undefinedIsTrue(matchedExpression.cleanAllCookies) &&
    matchedExpression.cookieNames &&
    !matchedExpression.cookieNames.includes(cookieProperties.name)
  ) {
    cadLog(
      {
        msg: 'CleanupService.isSafeToClean:  matched Expression but unchecked cookie name.  Safe to Clean.',
        x: { partialCookieInfo, matchedExpression },
      },
      debug,
    );
    return {
      cached: false,
      cleanCookie: true,
      cookie: cookieProperties,
      expression: matchedExpression,
      openTabStatus,
      reason: ReasonClean.MatchedExpressionButNoCookieName,
    };
  }
  cadLog(
    {
      msg: 'CleanupService.isSafeToClean:  Matched Expression and cookie name.  Cookie stays!',
      x: { partialCookieInfo, matchedExpression },
    },
    debug,
  );
  return {
    cached: false,
    cleanCookie: false,
    cookie: cookieProperties,
    expression: matchedExpression,
    openTabStatus,
    reason: ReasonKeep.MatchedExpression,
  };
};

/** Clean cookies and return only entries the browser confirms were removed. */
export const cleanCookies = async (
  state: State,
  markedForDeletion: CleanReasonObject[],
): Promise<CleanReasonObject[]> => {
  const operations = markedForDeletion.map(async (obj) => {
    const cookieProperties = obj.cookie;
    const cookieAPIProperties = returnOptionalCookieAPIAttributes(state, {
      firstPartyDomain: cookieProperties.firstPartyDomain,
      storeId: cookieProperties.storeId,
    });
    const cookieRemove = {
      ...cookieAPIProperties,
      ...cookiePartitionDetails(cookieProperties),
      name: cookieProperties.name,
      url: cookieProperties.preparedCookieDomain,
    };
    cadLog(
      {
        msg: 'CleanupService.cleanCookies: Cookie being removed through browser.cookies.remove via Promises:',
        x: cookieRemove,
      },
      getSetting(state, SettingID.DEBUG_MODE) as boolean,
    );

    return {
      obj,
      result: await browser.cookies.remove(cookieRemove),
    };
  });

  const results = await Promise.all(operations);
  const removed: CleanReasonObject[] = [];

  results.forEach((result) => {
    if (result.result != null) {
      removed.push(result.obj);
      return;
    }

    cadLog(
      {
        msg: 'CleanupService.cleanCookies: browser.cookies.remove did not confirm removal; cookie was not removed.',
        type: 'warn',
        x: {
          domain: result.obj.cookie.domain,
          name: result.obj.cookie.name,
          path: result.obj.cookie.path,
          storeId: result.obj.cookie.storeId,
        },
      },
      getSetting(state, SettingID.DEBUG_MODE) as boolean,
    );
  });

  return removed;
};

export const clearCookiesForThisDomain = async (
  state: State,
  tab: browser.tabs.Tab,
): Promise<boolean> => {
  const hostname = getHostname(tab.url);
  const getCookies = await getAllCookiesIncludingPartitions(
    state,
    returnOptionalCookieAPIAttributes(state, {
      domain: hostname,
      storeId: tab.cookieStoreId,
    }),
  );
  const cookies = getCookies.filter((c) => c.name !== CADCOOKIENAME);

  if (cookies.length > 0) {
    let cookieDeletedCount = 0;
    for (const cookie of cookies) {
      const r = await browser.cookies.remove(
        returnOptionalCookieAPIAttributes(state, {
          firstPartyDomain: cookie.firstPartyDomain,
          ...cookiePartitionDetails(cookie),
          name: cookie.name,
          storeId: cookie.storeId,
          url: prepareCookieDomain(cookie),
        }) as {
          name: string;
          url: string;
        },
      );
      if (r) cookieDeletedCount += 1;
    }
    showNotification(
      {
        duration: getSetting(state, SettingID.NOTIFY_DURATION) as number,
        msg: `${browser.i18n.getMessage('manualCleanSuccess', [
          browser.i18n.getMessage('cookiesText'),
          hostname,
        ])}\n${browser.i18n.getMessage('manualCleanRemoved', [
          cookieDeletedCount.toString(),
          cookies.length.toString(),
        ])}`,
      },
      getSetting(state, SettingID.NOTIFY_MANUAL) as boolean,
    );

    return cookieDeletedCount > 0;
  }

  showNotification(
    {
      duration: getSetting(state, SettingID.NOTIFY_DURATION) as number,
      msg: `${browser.i18n.getMessage('manualCleanNothing', [
        browser.i18n.getMessage('cookiesText'),
        hostname,
      ])}`,
    },
    getSetting(state, SettingID.NOTIFY_MANUAL) as boolean,
  );

  return cookies.length > 0;
};

type StorageClearResult = {
  local: number;
  session: number;
};

type ScriptingApi = {
  executeScript: (details: {
    target: { tabId: number };
    func: () => StorageClearResult;
  }) => Promise<Array<{ result?: StorageClearResult }>>;
};

const clearWebStorageInPage = (): StorageClearResult => {
  const result = {
    local: window.localStorage.length,
    session: window.sessionStorage.length,
  };
  window.localStorage.clear();
  window.sessionStorage.clear();
  return result;
};

export const clearLocalStorageForThisDomain = async (
  state: State,
  tab: browser.tabs.Tab,
): Promise<boolean> => {
  try {
    if (tab.id === undefined) return false;

    const scripting = (browser as unknown as { scripting?: ScriptingApi })
      .scripting;
    if (!scripting) {
      throw new Error('browser.scripting.executeScript is unavailable.');
    }

    let local = 0;
    let session = 0;
    const result = await scripting.executeScript({
      target: { tabId: tab.id },
      func: clearWebStorageInPage,
    });
    result.forEach((frame) => {
      if (!frame.result) return;
      local += frame.result.local;
      session += frame.result.session;
    });
    showNotification(
      {
        duration: getSetting(state, SettingID.NOTIFY_DURATION) as number,
        msg: `${browser.i18n.getMessage('manualCleanSuccess', [
          browser.i18n.getMessage('localStorageText'),
          getHostname(tab.url),
        ])}\n${browser.i18n.getMessage('removeStorageCount', [
          local.toString(),
          browser.i18n.getMessage('localStorageText'),
        ])}\n${browser.i18n.getMessage('removeStorageCount', [
          session.toString(),
          browser.i18n.getMessage('sessionStorageText'),
        ])}`,
      },
      getSetting(state, SettingID.NOTIFY_MANUAL) as boolean,
    );
    return true;
  } catch (e: unknown) {
    if (e instanceof Error) {
      throwErrorNotification(
        e,
        getSetting(state, SettingID.NOTIFY_DURATION) as number,
      );
    }
    await sleep(750);
    showNotification({
      duration: getSetting(state, SettingID.NOTIFY_DURATION) as number,
      msg: `${browser.i18n.getMessage('manualCleanNothing', [
        browser.i18n.getMessage('localStorageText'),
        getHostname(tab.url),
      ])}`,
    });
    return false;
  }
};

export const clearSiteDataForThisDomain = async (
  state: State,
  siteData: SiteDataType | 'All',
  hostname: string,
): Promise<boolean> => {
  if (hostname.trim() === '') return false;
  const debug = getSetting(state, SettingID.DEBUG_MODE) as boolean;
  cadLog(
    {
      msg: `CleanupService.clearSiteDataForThisDomain: Received ${siteData} clean request for ${hostname}.`,
    },
    debug,
  );
  const domains = prepareCleanupDomains(hostname, state.cache.browserDetect);
  if (siteData === 'All') {
    const siteDataAll: string[] = [];
    const results: boolean[] = [];
    for (const sd of SITEDATATYPES) {
      results.push(
        await removeSiteData(
          state,
          sd,
          state.cache.browserDetect,
          domains,
          debug,
          false,
        ),
      );
      siteDataAll.push(browser.i18n.getMessage(`${siteDataToBrowser(sd)}Text`));
    }
    showNotification(
      {
        duration: getSetting(state, SettingID.NOTIFY_DURATION) as number,
        msg: browser.i18n.getMessage('activityLogSiteDataDomainsText', [
          siteDataAll.join(', '),
          domains.join(', '),
        ]),
        title: browser.i18n.getMessage('notificationTitleSiteData'),
      },
      getSetting(state, SettingID.NOTIFY_MANUAL) as boolean,
    );
    return results.every(Boolean);
  }

  return removeSiteData(
    state,
    siteData,
    state.cache.browserDetect,
    domains,
    debug,
    true,
  );
};

export const removeSiteData = async (
  state: State,
  siteData: SiteDataType,
  bName: browserName = browserDetect() as browserName,
  domains: string[],
  debug: boolean,
  manual = false,
): Promise<boolean> => {
  const listName = usesBrowsingDataOrigins(bName) ? 'origins' : 'hostnames';
  const sd = siteDataToBrowser(siteData);
  cadLog(
    {
      msg: `CleanupService.removeSiteData: Cleanup of ${listName} in ${bName} for ${sd}:`,
      x: domains,
    },
    debug,
  );
  try {
    await browser.browsingData.remove(
      {
        [listName]: domains,
      },
      {
        [sd]: true,
      },
    );
    showNotification(
      {
        duration: getSetting(state, SettingID.NOTIFY_DURATION) as number,
        msg: browser.i18n.getMessage('activityLogSiteDataDomainsText', [
          browser.i18n.getMessage(`${sd}Text`),
          domains.join(', '),
        ]),
        title: browser.i18n.getMessage('notificationTitleSiteData'),
      },
      manual && (getSetting(state, SettingID.NOTIFY_MANUAL) as boolean),
    );
    return true;
  } catch (e: unknown) {
    cadLog(
      {
        msg: `CleanupService.removeSiteData:  browser.browsingData.remove of ${listName} for ${sd} returned an error:`,
        type: 'error',
        x: e,
      },
      debug,
    );
    if (e instanceof Error) {
      throwErrorNotification(
        e,
        getSetting(state, SettingID.NOTIFY_DURATION) as number,
      );
    }

    return false;
  }
};

export const otherBrowsingDataCleanup = async (
  state: State,
  isSafeToCleanObjects: CleanReasonObject[],
): Promise<ActivityLog['browsingDataCleanup']> => {
  const debug = getSetting(state, SettingID.DEBUG_MODE) as boolean;
  const browsingDataResult: ActivityLog['browsingDataCleanup'] = {};
  const storageSupport = getStorageTypeSupport(state.cache);
  if (
    getSetting(state, SettingID.CLEANUP_CACHE) &&
    storageSupport.cache
  ) {
    browsingDataResult[SiteDataType.CACHE] = await cleanSiteData(
      state,
      SiteDataType.CACHE,
      isSafeToCleanObjects,
      state.cache.browserDetect,
      debug,
    );
  }
  if (
    getSetting(state, SettingID.CLEANUP_INDEXEDDB) &&
    storageSupport.indexedDb
  ) {
    browsingDataResult[SiteDataType.INDEXEDDB] = await cleanSiteData(
      state,
      SiteDataType.INDEXEDDB,
      isSafeToCleanObjects,
      state.cache.browserDetect,
      debug,
    );
  }
  if (
    getSetting(state, SettingID.CLEANUP_LOCALSTORAGE) &&
    storageSupport.localStorage
  ) {
    browsingDataResult[SiteDataType.LOCALSTORAGE] = await cleanSiteData(
      state,
      SiteDataType.LOCALSTORAGE,
      isSafeToCleanObjects,
      state.cache.browserDetect,
      debug,
    );
  }
  if (
    getSetting(state, SettingID.CLEANUP_PLUGINDATA) &&
    storageSupport.pluginData
  ) {
    browsingDataResult[SiteDataType.PLUGINDATA] = await cleanSiteData(
      state,
      SiteDataType.PLUGINDATA,
      isSafeToCleanObjects,
      state.cache.browserDetect,
      debug,
    );
  }
  if (
    getSetting(state, SettingID.CLEANUP_SERVICEWORKERS) &&
    storageSupport.serviceWorkers
  ) {
    browsingDataResult[SiteDataType.SERVICEWORKERS] = await cleanSiteData(
      state,
      SiteDataType.SERVICEWORKERS,
      isSafeToCleanObjects,
      state.cache.browserDetect,
      debug,
    );
  }

  return browsingDataResult;
};

export const cleanSiteData = async (
  state: State,
  siteData: SiteDataType,
  cleanReasonObjects: CleanReasonObject[],
  bName: browserName = browserDetect() as browserName,
  debug: boolean,
): Promise<string[]> => {
  const domains = cleanReasonObjects
    .filter((obj) => filterSiteData(obj, siteData, debug))
    .map((o) => o.cookie.domain)
    .filter((domain) => domain.trim() !== '');

  const cleanList: string[] = [];
  for (const domain of domains) {
    cleanList.push(...prepareCleanupDomains(domain, bName));
  }

  if (cleanList.length > 0) {
    const r = await removeSiteData(
      state,
      siteData,
      bName,
      [...new Set(cleanList)],
      debug,
      false,
    );
    if (r) {
      return domains;
    }
  }
  return [];
};

export const parseCleanSiteData = (bool?: boolean): boolean => {
  return bool === undefined ? false : bool;
};

export const filterSiteData = (
  obj: CleanReasonObject,
  siteData: SiteDataType,
  debug = false,
): boolean => {
  const notProtectedByOpenTab = obj.reason !== ReasonKeep.OpenTabs;
  const notInAnyLists =
    obj.reason === ReasonClean.NoMatchedExpression ||
    obj.reason === ReasonClean.StartupNoMatchedExpression;
  const isExpiredNotRestart = obj.reason === ReasonClean.ExpiredCookie;
  const isExpiredRestart = obj.reason === ReasonClean.ExpiredCookieRestart;
  const isCADCookieNoExpression =
    (obj.reason === ReasonClean.CADSiteDataCookie ||
      obj.reason === ReasonClean.CADSiteDataCookieRestart) &&
    obj.expression === undefined;
  const nonBlankCookieHostName = obj.cookie.hostname.trim() !== '';
  const cleanSiteDataInExpression = parseCleanSiteData(
    obj.expression?.cleanSiteData?.includes(siteData),
  );
  const isRestartCleanup =
    (isExpiredRestart && obj.expression?.listType === ListType.GREY) ||
    (obj.reason === ReasonClean.CADSiteDataCookieRestart &&
      obj.expression?.listType === ListType.GREY) ||
    obj.reason === ReasonClean.StartupCleanupAndGreyList;
  const canCleanSiteData =
    isCADCookieNoExpression || cleanSiteDataInExpression || isRestartCleanup;
  const cro: CleanReasonObject = {
    ...obj,
    cookie: {
      ...obj.cookie,
      value: debug ? '***' : obj.cookie.value,
    },
  };
  cadLog(
    {
      msg: 'CleanupService.filterSiteData: debug data.',
      x: {
        notProtectedByOpenTab,
        notInAnyLists,
        siteData,
        isExpiredNotRestart,
        isExpiredRestart,
        isCADCookieNoExpression,
        cleanSiteDataInExpression,
        isRestartCleanup,
        canCleanSiteData,
        nonBlankCookieHostName,
        notOpenTabAndCanClean: notProtectedByOpenTab && canCleanSiteData,
        CleanReasonObject: cro,
      },
    },
    debug,
  );
  const r =
    (notInAnyLists || (notProtectedByOpenTab && canCleanSiteData)) &&
    nonBlankCookieHostName;
  cadLog(
    {
      msg: `CleanupService.filterSiteData: ${siteData} cleanup returned ${r} for ${cro.cookie.hostname}`,
    },
    debug,
  );
  return r;
};

export const returnContainersOfOpenTabDomains = async (
  ignoreOpenTabs: boolean,
  cleanDiscardedTabs: boolean,
): Promise<Record<string, string[]>> => {
  if (ignoreOpenTabs) {
    return {};
  }
  const tabs = await browser.tabs.query({
    windowType: 'normal',
  });
  const openTabs: { [k: string]: Set<string> } = {};
  for (const tab of tabs) {
    if (isAWebpage(tab.url) && (!cleanDiscardedTabs || !tab.discarded)) {
      const cookieStoreId = tab.cookieStoreId || (tab.incognito ? '1' : '0');
      if (!openTabs[cookieStoreId]) {
        openTabs[cookieStoreId] = new Set<string>();
      }
      openTabs[cookieStoreId].add(extractMainDomain(getHostname(tab.url)));
    }
  }
  const openTabsArray: { [k: string]: string[] } = {};
  for (const id of Object.keys(openTabs)) {
    openTabsArray[id] = Array.from(openTabs[id]);
  }
  return openTabsArray;
};

export const cleanCookiesOperation = async (
  state: State,
  cleanupProperties: CleanupProperties = {
    greyCleanup: false,
    ignoreOpenTabs: false,
  },
): Promise<Record<string, any>> => {
  const debug = getSetting(state, SettingID.DEBUG_MODE) as boolean;
  const deletedSiteDataArrays: ActivityLog['browsingDataCleanup'] = {};
  const setOfDeletedDomainCookies = new Set<string>();
  const cachedResults: Required<ActivityLog> = {
    dateTime: new Date().toString(),
    recentlyCleaned: 0,
    storeIds: {},
    browsingDataCleanup: {},
    siteDataCleaned: false,
  };
  const storesIdsToScrub = ['firefox-private', 'private', '1'];
  const openTabDomains = await returnContainersOfOpenTabDomains(
    cleanupProperties.ignoreOpenTabs,
    getSetting(state, SettingID.CLEAN_DISCARDED) as boolean,
  );
  const newCleanupProperties: CleanupPropertiesInternal = {
    ...cleanupProperties,
    openTabDomains,
  };

  const cookieStoreIds = new Set<string>();

  switch (state.cache.browserDetect || (browserDetect() as browserName)) {
    case browserName.Firefox:
      cookieStoreIds.add('default');
      cookieStoreIds.add('firefox-default');
      if (await browser.extension.isAllowedIncognitoAccess()) {
        cookieStoreIds.add('firefox-private');
        cookieStoreIds.add('private');
      }
      break;
    case browserName.Chrome:
    case browserName.Opera:
      cookieStoreIds.add('0');
      if (await browser.extension.isAllowedIncognitoAccess()) {
        cookieStoreIds.add('1');
      }
      break;
    default:
      break;
  }

  if (getSetting(state, SettingID.CONTEXTUAL_IDENTITIES)) {
    const contextualIdentitiesObjects =
      await browser.contextualIdentities.query({});

    for (const cio of contextualIdentitiesObjects) {
      cookieStoreIds.add(cio.cookieStoreId);
    }
  }

  const cookieStores = (await browser.cookies.getAllCookieStores()) || [];
  for (const store of cookieStores) {
    if (
      getSetting(state, SettingID.CONTEXTUAL_IDENTITIES) ||
      !store.id.startsWith('firefox-container')
    ) {
      cookieStoreIds.add(store.id);
    }
  }

  for (const id of cookieStoreIds) {
    let cookies: CadCookie[] = [];
    try {
      cookies = await getAllCookiesIncludingPartitions(
        state,
        returnOptionalCookieAPIAttributes(state, {
          storeId: id,
        }),
      );
    } catch (e: unknown) {
      if (e instanceof Error) {
        cadLog(
          {
            msg: `CleanupService.cleanCookiesOperation:  browser.cookies.getAll for id: ${id} threw an error.`,
            type: 'error',
            x: e.message,
          },
          true,
        );
      }
    }

    if (!cookies || cookies.length === 0) continue;

    const isSafeToCleanObjects = cookies.map((cookie) => {
      return isSafeToClean(
        state,
        prepareCookie(cookie, debug),
        newCleanupProperties,
      );
    });

    if (debug) {
      const sanitized: CleanReasonObject[] = isSafeToCleanObjects.map((obj) => {
        return {
          ...obj,
          cookie: {
            ...obj.cookie,
            value: '***',
          },
        };
      });
      cadLog(
        {
          msg: 'CleanupService.cleanCookiesOperation:  isSafeToCleanObjects Result',
          x: sanitized,
        },
        debug,
      );
    }

    const markedForDeletion = isSafeToCleanObjects.filter((obj) => {
      const r = obj.cleanCookie && obj.cookie.hostname.trim() !== '';
      cadLog(
        {
          msg: `CleanupService.cleanCookiesOperation: Clean Cookies returned ${r} for ${obj.cookie.hostname}`,
        },
        debug,
      );
      return r;
    });

    if (debug) {
      const sanitized: CleanReasonObject[] = markedForDeletion.map((obj) => {
        return {
          ...obj,
          cookie: {
            ...obj.cookie,
            value: '***',
          },
        };
      });
      cadLog(
        {
          msg: 'CleanupService.cleanCookiesOperation:  Cookies markedForDeletion Result',
          x: sanitized,
        },
        debug,
      );
    }

    let successfullyRemoved: CleanReasonObject[] = [];
    try {
      successfullyRemoved = await cleanCookies(state, markedForDeletion);
    } catch (e: unknown) {
      cadLog(
        {
          type: 'error',
          x: e,
        },
        true,
      );
      if (e instanceof Error) {
        throwErrorNotification(
          e,
          getSetting(state, SettingID.NOTIFY_DURATION) as number,
        );
      }
    }

    const removedCookies = successfullyRemoved.filter((c) => {
      return c.cookie.name !== CADCOOKIENAME;
    });

    if (removedCookies.length !== 0) {
      cachedResults.storeIds[id] = removedCookies;
    }
    cachedResults.recentlyCleaned += removedCookies.length;
    removedCookies.forEach((obj) => {
      setOfDeletedDomainCookies.add(
        getSetting(state, SettingID.CONTEXTUAL_IDENTITIES)
          ? `${obj.cookie.hostname} (${state.cache[obj.cookie.storeId]})`
          : obj.cookie.hostname,
      );
    });

    const storeResults = await otherBrowsingDataCleanup(
      state,
      isSafeToCleanObjects,
    );
    if (storesIdsToScrub.includes(id) || !storeResults) continue;
    for (const sd of SITEDATATYPES) {
      if ((storeResults[sd] || []).length > 0) {
        cachedResults.siteDataCleaned = true;
        deletedSiteDataArrays[sd] = (deletedSiteDataArrays[sd] || []).concat(
          (storeResults[sd] as string[]).map((domain) => trimDot(domain)),
        );
      }
    }
  }

  for (const sd of SITEDATATYPES) {
    cachedResults.browsingDataCleanup[sd] = deletedSiteDataArrays[sd]
      ? Array.from(new Set(deletedSiteDataArrays[sd] as string[]))
      : [];
  }

  for (const id of storesIdsToScrub) {
    delete cachedResults.storeIds[id];
  }

  return {
    cachedResults,
    setOfDeletedDomainCookies: Array.from(setOfDeletedDomainCookies),
  };
};
