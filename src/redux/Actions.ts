import { browser } from './BrowserApi';
import store from './Store';
import { ActivityLog } from '../typings/Cleanup';
import { BrowserName, SettingID } from '../typings/Enums';
import { ReduxConstants } from '../typings/ReduxConstants';
import {
  cleanCookies,
  getDomain,
  getSetting,
  isSameDomain,
  showNotification,
  sleep,
} from '../services/Libs';
import { StoreUserEntry } from '../services/StoreUser';

export const reset = () => ({
  type: ReduxConstants.RESET,
});

export const updateSetting = (setting: Setting) => ({
  setting,
  type: ReduxConstants.UPDATE_SETTING,
});

export const updateSettings = (settings: Setting[]) => ({
  settings,
  type: ReduxConstants.UPDATE_SETTINGS,
});

export const updateList = (list: StoreUserEntry[]) => ({
  list,
  type: ReduxConstants.UPDATE_LIST,
});

export const updateCookieCount = (cookieCount: number) => ({
  cookieCount,
  type: ReduxConstants.UPDATE_COOKIE_COUNT,
});

export const updateActiveTab = (activeTab: browser.tabs.Tab) => ({
  activeTab,
  type: ReduxConstants.UPDATE_ACTIVE_TAB,
});

export const updateContextualIdentities = (
  contextualIdentities: browser.contextualIdentities.ContextualIdentity[],
) => ({
  contextualIdentities,
  type: ReduxConstants.UPDATE_CONTEXTUAL_IDENTITIES,
});

export const updateBrowser = (browserName: BrowserName) => ({
  browserName,
  type: ReduxConstants.UPDATE_BROWSER,
});

export const updateDarkTheme = (darkTheme: boolean) => ({
  darkTheme,
  type: ReduxConstants.UPDATE_DARK_THEME,
});

export const updateActiveTabList = (activeTabList: StoreUserEntry | null) => ({
  activeTabList,
  type: ReduxConstants.UPDATE_ACTIVE_TAB_LIST,
});

export const updateContainerList = (containerList: StoreUserEntry | null) => ({
  containerList,
  type: ReduxConstants.UPDATE_CONTAINER_LIST,
});

export const updateCookieDomainList = (cookieDomainList: StoreUserEntry[]) => ({
  cookieDomainList,
  type: ReduxConstants.UPDATE_COOKIE_DOMAIN_LIST,
});

export const updateTabDomainList = (tabDomainList: StoreUserEntry[]) => ({
  tabDomainList,
  type: ReduxConstants.UPDATE_TAB_DOMAIN_LIST,
});

export const updateRemainingDomainList = (
  remainingDomainList: StoreUserEntry[],
) => ({
  remainingDomainList,
  type: ReduxConstants.UPDATE_REMAINING_DOMAIN_LIST,
});

export const updateCleanupEnabled = (cleanupEnabled: boolean) => ({
  cleanupEnabled,
  type: ReduxConstants.UPDATE_CLEANUP_ENABLED,
});

export const updateRecentlyCleaned = (recentlyCleaned: number) => ({
  recentlyCleaned,
  type: ReduxConstants.UPDATE_RECENTLY_CLEANED,
});

export const updateActivityLog = (activityLog: ActivityLog) => ({
  activityLog,
  type: ReduxConstants.UPDATE_ACTIVITY_LOG,
});

export const updateBrowsingDataCleanup = (
  browsingDataCleanup: BrowsingDataCleanup | null,
) => ({
  browsingDataCleanup,
  type: ReduxConstants.UPDATE_BROWSING_DATA_CLEANUP,
});

export const updateSiteDataCleaned = (siteDataCleaned: boolean) => ({
  siteDataCleaned,
  type: ReduxConstants.UPDATE_SITE_DATA_CLEANED,
});

export const init = () => async (dispatch: any, getState: any) => {
  const { settings } = getState();
  const disableSettingIfTrue = (setting: Setting) => {
    if (setting.value) {
      dispatch({
        payload: {
          name: setting.name,
          value: false,
        },
        type: ReduxConstants.UPDATE_SETTING,
      });
    }
  };

  const cache = await browser.storage.local.get();
  const defaults = store.getState().settings;
  const existingSettings = settings || defaults;

  for (const setting of defaults) {
    if (existingSettings[setting.name] === undefined) {
      dispatch({
        payload: setting,
        type: ReduxConstants.UPDATE_SETTING,
      });
    }
  }

  // Refresh after missing legacy settings were populated above.
  const validatedSettings = getState().settings;

  // Disable unusable setting in Chrome
  if (isChrome(cache)) {
    disableSettingIfTrue(validatedSettings[SettingID.CONTEXTUAL_IDENTITIES]);
  }
  // Disable unusable setting in Firefox Android
  if (isFirefoxAndroid(cache)) {
    disableSettingIfTrue(validatedSettings[SettingID.NUM_COOKIES_ICON]);
    disableSettingIfTrue(validatedSettings[SettingID.CLEANUP_LOCALSTORAGE_OLD]);
    disableSettingIfTrue(validatedSettings[SettingID.CLEANUP_LOCALSTORAGE]);
    disableSettingIfTrue(validatedSettings[SettingID.CONTEXTUAL_IDENTITIES]);
    disableSettingIfTrue(validatedSettings[SettingID.CONTEXT_MENUS]);
  }

  const cleanDelay = validatedSettings[SettingID.CLEAN_DELAY].value;
  if (typeof cleanDelay === 'number') {
    // Minimum 1 second autoclean delay.
    if (cleanDelay < 1) {
      dispatch({
        payload: {
          name: SettingID.CLEAN_DELAY,
          value: 1,
        },
        type: ReduxConstants.UPDATE_SETTING,
      });
    }
    // Maximum 2147483 seconds due to signed 32-bit Integer (ms x 1000)
    if (cleanDelay > 2147483) {
      dispatch({
        payload: {
          name: SettingID.CLEAN_DELAY,
          value: 2147483,
        },
        type: ReduxConstants.UPDATE_SETTING,
      });
    }
  }

  // If show cookie count in badge is disabled, force change icon color instead
  if (
    !validatedSettings[SettingID.NUM_COOKIES_ICON].value &&
    validatedSettings[SettingID.KEEP_DEFAULT_ICON].value
  ) {
    disableSettingIfTrue(validatedSettings[SettingID.KEEP_DEFAULT_ICON]);
  }

  if (isFirefox(cache)) {
    if (validatedSettings[SettingID.CLEANUP_CACHE].value) {
      dispatch({
        payload: {
          name: SettingID.CLEANUP_CACHE,
          value: false,
        },
        type: ReduxConstants.UPDATE_SETTING,
      });
    }
  }

  const activeTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  dispatch(updateActiveTab(activeTab));
};

export const cleanup = (
  activeTabs: browser.tabs.Tab[],
  cookieDomains: Set<string>,
  keepDomains: Set<string>,
  cache: any,
) => async (dispatch: any, getState: any) => {
  const domains = new Set<string>();
  activeTabs.forEach((tab) => {
    if (tab.url) domains.add(getDomain(tab.url));
  });

  const deleted = new Set<string>();
  for (const domain of cookieDomains) {
    if (!keepDomains.has(domain) && !domains.has(domain)) {
      await cleanCookies(domain, cache);
      deleted.add(domain);
    }
  }

  dispatch(updateRecentlyCleaned(deleted.size));
};

export const updateTab = (
  tabId: number,
  changeInfo: browser.tabs.TabChangeInfo,
  tab: browser.tabs.Tab,
) => async (dispatch: any, getState: any) => {
  if (changeInfo.url && tab.url) {
    const state = getState();
    const previousTab = state.activeTab;
    if (previousTab && previousTab.url && !isSameDomain(previousTab.url, tab.url)) {
      dispatch(updateActiveTab(tab));
    }
  }
};

export const showCleanupNotification = (
  setOfDeletedDomainCookies: Set<string>,
  cachedResults: ActivityLog,
  browsingDataCleanup?: BrowsingDataCleanup,
  siteDataCleaned = false,
) => async (dispatch: any, getState: any) => {
  let recentlyCleaned = setOfDeletedDomainCookies.size;
  const domainsAll = new Set<string>();
  setOfDeletedDomainCookies.forEach((d) => domainsAll.add(d));
  Object.values((cachedResults as ActivityLog).storeIds).forEach((v) => {
    v.forEach((d) => domainsAll.add(d.cookie.hostname));
  });
  const bDomains = new Set<string>();
  // Count for Summary Notification
  if (browsingDataCleanup) {
    for (const domains of Object.values(browsingDataCleanup)) {
      if (!domains || domains.length === 0) continue;
      domains.forEach((d) => bDomains.add(d));
    }
    bDomains.forEach((d) => domainsAll.add(d));
  }

  if (setOfDeletedDomainCookies.length > 0) {
    // Cookie Notification
    const notifyMessage = browser.i18n.getMessage('notificationContent', [
      recentlyCleaned.toString(),
      domainsAll.size.toString(),
      (setOfDeletedDomainCookies as string[]).slice(0, 5).join(', '),
    ]);
    showNotification({
      duration: getSetting(getState(), SettingID.NOTIFY_DURATION) as number,
      msg: `${notifyMessage} ...`,
      title: browser.i18n.getMessage('notificationTitle'),
    });
    await sleep(750);
  }
  // Here we just show a generic 'Site Data' cleaned instead of the specifics, with all domains.
  if (siteDataCleaned && browsingDataCleanup && bDomains.size > 0) {
    await showNotification({
      duration: getSetting(getState(), SettingID.NOTIFY_DURATION) as number,
      msg: browser.i18n.getMessage('activityLogSiteDataDomainsText', [
        browser.i18n.getMessage('siteDataText'),
        Array.from(bDomains).join(', '),
      ]),
      title: browser.i18n.getMessage('notificationTitleSiteData'),
    });
  }
};
