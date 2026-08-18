import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import {
  browser,
  browserAction,
  browserName,
  cache,
  isChrome,
  isFirefox,
  isFirefoxAndroid,
} from '../services/BrowserApi';
import CleanupService from '../services/CleanupService';
import CookieDomainService from '../services/CookieDomainService';
import { createDefaultSettings, defaultSettings } from '../services/DefaultSettings';
import { cleanHostname, returnHostname } from '../services/Libs';
import SettingService from '../services/SettingService';
import Store from '../services/Store';
import StoreUser from '../services/StoreUser';
import { StoreUserEntry } from '../typings/Cleanup';
import {
  BadgeStatus,
  CookieCleanupEvent,
  IconName,
  ListType,
  SettingID,
  StartupState,
} from '../typings/Enums';
import { ReduxConstants } from '../typings/ReduxConstants';
import { RootState } from './Store';

export interface ReduxAction<T = any> extends Action<ReduxConstants> {
  payload?: T;
}

export type ReduxThunkAction<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  ReduxAction
>;

export const setBadgeStatus = (
  status: BadgeStatus,
  cookieCount?: number,
): ReduxThunkAction => async (dispatch, getState) => {
  const state = getState();
  const cleanupService = CleanupService.getInstance();
  const browserActionService = browserAction;

  if (!cleanupService || !browserActionService) {
    return;
  }

  await browserActionService.setBadgeStatus(status, cookieCount);
  dispatch({
    payload: status,
    type: ReduxConstants.SET_BADGE_STATUS,
  });

  if (state.settings[SettingID.DEBUG_MODE].value) {
    console.debug('Badge status changed:', status, cookieCount);
  }
};

export const updateSetting = (
  name: SettingID,
  value: boolean | number | string,
): ReduxThunkAction => async (dispatch) => {
  await SettingService.updateSetting(name, value);
  dispatch({
    payload: { name, value },
    type: ReduxConstants.UPDATE_SETTING,
  });
};

export const updateSettingWithSideEffects = (
  name: SettingID,
  value: boolean | number | string,
): ReduxThunkAction => async (dispatch) => {
  await dispatch(updateSetting(name, value));
  await SettingService.handleSettingSideEffects(name, value);
};

export const updateStartupState = (startupState: StartupState): ReduxAction => ({
  payload: startupState,
  type: ReduxConstants.UPDATE_STARTUP_STATE,
});

export const setActiveTab = (tab: browser.tabs.Tab): ReduxAction => ({
  payload: tab,
  type: ReduxConstants.SET_ACTIVE_TAB,
});

export const updateCookieDomains = (): ReduxThunkAction => async (dispatch) => {
  const cookieDomains = await CookieDomainService.getCookieDomains();
  dispatch({
    payload: cookieDomains,
    type: ReduxConstants.UPDATE_COOKIE_DOMAINS,
  });
};

export const updateCookieCount = (): ReduxThunkAction => async (
  dispatch,
  getState,
) => {
  const settings = getState().settings;
  if (!settings[SettingID.NUM_COOKIES_ICON].value) {
    return;
  }

  const count = await CookieDomainService.getCookieCount();
  dispatch({
    payload: count,
    type: ReduxConstants.UPDATE_COOKIE_COUNT,
  });
};

export const updateList = (
  listType: ListType,
  entry: StoreUserEntry,
): ReduxThunkAction => async (dispatch) => {
  const storeUser = StoreUser.getInstance();
  await storeUser.update(listType, entry);
  dispatch({
    payload: { entry, listType },
    type: ReduxConstants.UPDATE_LIST,
  });
};

export const removeFromList = (
  listType: ListType,
  hostname: string,
): ReduxThunkAction => async (dispatch) => {
  const storeUser = StoreUser.getInstance();
  await storeUser.remove(listType, hostname);
  dispatch({
    payload: { hostname, listType },
    type: ReduxConstants.REMOVE_FROM_LIST,
  });
};

export const importList = (
  listType: ListType,
  entries: StoreUserEntry[],
): ReduxThunkAction => async (dispatch) => {
  const storeUser = StoreUser.getInstance();
  await storeUser.import(listType, entries);
  dispatch({
    payload: { entries, listType },
    type: ReduxConstants.IMPORT_LIST,
  });
};

export const clearList = (listType: ListType): ReduxThunkAction => async (
  dispatch,
) => {
  const storeUser = StoreUser.getInstance();
  await storeUser.clear(listType);
  dispatch({
    payload: listType,
    type: ReduxConstants.CLEAR_LIST,
  });
};

export const cleanup = (
  event: CookieCleanupEvent,
  hostname?: string,
): ReduxThunkAction => async (dispatch) => {
  const cleanupService = CleanupService.getInstance();
  await cleanupService.cleanup(event, hostname);
  await dispatch(updateCookieDomains());
  await dispatch(updateCookieCount());
};

export const cleanSiteData = (hostname: string): ReduxThunkAction => async (
  dispatch,
) => {
  const cleanedHostname = cleanHostname(hostname);
  if (!cleanedHostname) {
    return;
  }

  const cleanupService = CleanupService.getInstance();
  await cleanupService.cleanup(CookieCleanupEvent.MANUAL, cleanedHostname);
  await dispatch(updateCookieDomains());
  await dispatch(updateCookieCount());
};

export const cleanCurrentTab = (): ReduxThunkAction => async (
  dispatch,
  getState,
) => {
  const tab = getState().activeTab;
  if (!tab || !tab.url) {
    return;
  }

  const hostname = returnHostname(tab.url);
  if (hostname) {
    await dispatch(cleanSiteData(hostname));
  }
};

export const updateBrowserAction = (): ReduxThunkAction => async (
  dispatch,
  getState,
) => {
  const state = getState();
  const activeTab = state.activeTab;
  if (!activeTab) {
    return;
  }

  const hostname = activeTab.url ? returnHostname(activeTab.url) : '';
  const storeUser = StoreUser.getInstance();
  const listStatus = hostname ? await storeUser.getListStatus(hostname) : undefined;

  dispatch({
    payload: listStatus,
    type: ReduxConstants.UPDATE_LIST_STATUS,
  });
};

export const updateSettings = (): ReduxThunkAction => async (dispatch) => {
  const settings = await SettingService.getSettings();
  dispatch({
    payload: settings,
    type: ReduxConstants.UPDATE_SETTINGS,
  });
};

export const initSettings = (): ReduxThunkAction => async (
  dispatch,
  getState,
) => {
  const currentSettings = await SettingService.getSettings();
  const defaults = createDefaultSettings();

  for (const settingID of Object.values(SettingID)) {
    if (!currentSettings[settingID] && defaults[settingID]) {
      await SettingService.updateSetting(
        settingID,
        defaults[settingID].value,
      );
      dispatch({
        payload: {
          name: settingID,
          value: defaults[settingID].value,
        },
        type: ReduxConstants.UPDATE_SETTING,
      });
    }
  }

  const disableSettingIfTrue = (setting: typeof defaultSettings[SettingID]) => {
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

  const cacheSetting = validatedSettings[SettingID.CACHE].value;
  if (typeof cacheSetting === 'boolean') {
    cache.cache = cacheSetting;
  }

  const debugMode = validatedSettings[SettingID.DEBUG_MODE].value;
  if (typeof debugMode === 'boolean') {
    cache.debug = debugMode;
  }

  if (isChrome(cache)) {
    cache.browser = browserName.CHROME;
  } else if (isFirefoxAndroid(cache)) {
    cache.browser = browserName.FIREFOX_ANDROID;
  } else {
    cache.browser = browserName.FIREFOX;
  }

  if (browserAction) {
    const keepDefaultIcon = validatedSettings[SettingID.KEEP_DEFAULT_ICON].value;
    if (typeof keepDefaultIcon === 'boolean') {
      await browserAction.setIcon(
        keepDefaultIcon ? IconName.DEFAULT : IconName.ACTIVE,
      );
    }
  }

  const store = Store.getInstance();
  await store.set('settings', validatedSettings);
};
