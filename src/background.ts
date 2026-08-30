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
import { browserName, SettingID, EventListenerAction } from './typings/Enums';
import { Store } from 'redux';
import { cookieCleanup, validateSettings } from './redux/Actions';
import createStore from './redux/Store';
import {
  checkIfProtected,
  setGlobalIcon,
} from './services/BrowserActionService';
import ContextMenuEvents from './services/ContextMenuEvents';
import DomainChangeEvents from './services/DomainChangeEvents';
import CookieEvents from './services/CookieEvents';
import {
  cadLog,
  convertVersionToNumber,
  eventListenerActions,
  extractMainDomain,
  getSetting,
} from './services/Libs';
import StoreUser from './services/StoreUser';
import StatePersistence from './services/StatePersistence';
import { parsePersistedState } from './services/StateHydration';
import TabEvents from './services/TabEvents';
import { ReduxAction, ReduxConstants } from './typings/ReduxConstants';
import ContextualIdentitiesEvents from './services/ContextualIdentitiesEvents';
import SettingService from './services/SettingService';
import { actionApi } from './services/BrowserApi';
import {
  getBrowserMajorVersionFromUserAgent,
  hasFirefoxSessionRestoreTab,
} from './services/BrowserCapabilities';

let store: Store<State, ReduxAction>;

const statePersistence = new StatePersistence(
  (values) => browser.storage.local.set(values),
  (error) => {
    console.error('Cookie AutoDelete state persistence failed.', error);
  },
);

const onStartUp = async () => {
  const mf = browser.runtime.getManifest();
  actionApi.setTitle({
    title: `${mf.name} ${mf.version} [STARTING UP...] (0)`,
  });
  const storage = await browser.storage.local.get();
  const stateFromStorage = parsePersistedState(storage);
  store = createStore(stateFromStorage);

  const detectedBrowser = browserDetect() as browserName;
  let browserVersion: number | undefined;

  if (detectedBrowser === browserName.Firefox) {
    const browserInfo = await browser.runtime.getBrowserInfo();
    browserVersion = Number.parseInt(browserInfo.version, 10);
    store.dispatch({
      payload: {
        key: 'browserInfo',
        value: browserInfo,
      },
      type: ReduxConstants.ADD_CACHE,
    });
    store.dispatch({
      payload: {
        key: 'browserVersion',
        value: browserInfo.version,
      },
      type: ReduxConstants.ADD_CACHE,
    });
  } else {
    browserVersion = getBrowserMajorVersionFromUserAgent(
      detectedBrowser,
      navigator.userAgent,
    );
    if (browserVersion !== undefined) {
      store.dispatch({
        payload: {
          key: 'browserVersion',
          value: browserVersion,
        },
        type: ReduxConstants.ADD_CACHE,
      });
    }
  }

  const platformInfo = await browser.runtime.getPlatformInfo();
  store.dispatch({
    payload: {
      key: 'platformOs',
      value: platformInfo.os,
    },
    type: ReduxConstants.ADD_CACHE,
  });

  store.dispatch({
    payload: {
      key: 'browserDetect',
      value: detectedBrowser,
    },
    type: ReduxConstants.ADD_CACHE,
  });

  const validatedSettings = validateSettings(store.getState().settings);
  store.dispatch({
    payload: validatedSettings,
    type: ReduxConstants.UPDATE_SETTINGS,
  });

  statePersistence.connect(store);

  await checkIfProtected(store.getState());

  if (browser.contextMenus) {
    await ContextMenuEvents.menuInit();
  }

  await ContextualIdentitiesEvents.initContainers();

  const settings = store.getState().settings;
  if (
    getSetting(store.getState(), SettingID.CONTEXTUAL_IDENTITIES) &&
    browser.contextualIdentities
  ) {
    await ContextualIdentitiesEvents.cacheContainers();
  }

  await setGlobalIcon(
    getSetting(store.getState(), SettingID.ACTIVE_MODE) as boolean,
    getSetting(store.getState(), SettingID.KEEP_DEFAULT_ICON) as boolean,
  );

  actionApi.setBadgeBackgroundColor({
    color: '#900000',
  });

  const activeModeSetting = settings[SettingID.ACTIVE_MODE];
  const activeMode = activeModeSetting ? activeModeSetting.value : false;
  actionApi.setTitle({
    title: `${mf.name} ${mf.version} (${
      activeMode ? browser.i18n.getMessage('activeModeText') : 'OFF'
    })`,
  });

  StoreUser.resolve(store);
};

const browserDetect = () => {
  const agent = navigator.userAgent.toLowerCase();
  if (agent.indexOf('edge') > -1) {
    return browserName.EdgeLegacy;
  }
  if (agent.indexOf('edg') > -1) {
    return browserName.EdgeChromium;
  }
  if (agent.indexOf('opr') > -1) {
    return browserName.Opera;
  }
  if (agent.indexOf('chrome') > -1) {
    return browserName.Chrome;
  }
  if (agent.indexOf('firefox') > -1) {
    return browserName.Firefox;
  }
  return browserName.Unknown;
};

const handleConnect = (p: browser.runtime.Port) => {
  StoreUser.usingStore((readyStore) => {
    readyStore.subscribe(() => {
      p.postMessage(readyStore.getState());
    });
    p.postMessage(readyStore.getState());

    p.onMessage.addListener((message) => {
      readyStore.dispatch(message);
    });
  }).catch((error) => {
    console.error('Cookie AutoDelete failed to connect extension UI.', error);
  });
};

browser.runtime.onConnect.addListener(handleConnect);

const cleanDomainByEvent = async (info: any, tab?: browser.tabs.Tab) => {
  if (!tab || !tab.url) return;
  const url = new URL(tab.url);
  const cookieDomain = await extractMainDomain(url.hostname);
  if (!cookieDomain) return;
  const payload = {
    cookieStoreId: (tab as any).cookieStoreId,
    domain: cookieDomain,
  };
  store.dispatch<any>(
    cookieCleanup({
      ignoreOpenTabs: false,
      ...payload,
    }),
  );
};

const handleEventListenerAction = async (
  action: EventListenerAction,
  info: any,
  tab?: browser.tabs.Tab,
) => {
  switch (action) {
    case EventListenerAction.CLEAN:
      await cleanDomainByEvent(info, tab);
      break;
    case EventListenerAction.CLEAN_ALL:
      store.dispatch<any>(cookieCleanup({ ignoreOpenTabs: true }));
      break;
    case EventListenerAction.CLEAN_OPEN_TABS:
      store.dispatch<any>(cookieCleanup({ ignoreOpenTabs: false }));
      break;
    default:
      break;
  }
};

eventListenerActions(handleEventListenerAction);

if (browser.contextualIdentities) {
  browser.contextualIdentities.onCreated.addListener(
    StoreUser.withStoreReady(ContextualIdentitiesEvents.onContainerCreated),
  );
  browser.contextualIdentities.onRemoved.addListener(
    StoreUser.withStoreReady(ContextualIdentitiesEvents.onContainerRemoved),
  );
  browser.contextualIdentities.onUpdated.addListener(
    StoreUser.withStoreReady(ContextualIdentitiesEvents.onContainerUpdated),
  );
}

const greyCleanup = () => {
  if (getSetting(store.getState(), SettingID.ACTIVE_MODE)) {
    cadLog(
      {
        msg: `background.greyCleanup:  dispatching browser restart greyCleanup.`,
      },
      getSetting(store.getState(), SettingID.DEBUG_MODE) as boolean,
    );
    store.dispatch<any>(
      cookieCleanup({
        greyCleanup: true,
        ignoreOpenTabs: getSetting(
          store.getState(),
          SettingID.CLEAN_OPEN_TABS_STARTUP,
        ),
      }),
    );
  }
};

const handleBrowserStartup = async (): Promise<void> => {
  store.dispatch({
    type: ReduxConstants.ON_STARTUP,
  });

  if (getSetting(store.getState(), SettingID.ACTIVE_MODE) === true) {
    if (getSetting(store.getState(), SettingID.ENABLE_GREYLIST) === true) {
      let isFFSessionRestore = false;
      if (store.getState().cache.browserDetect === browserName.Firefox) {
        // Firefox exposes an explicit session-restore page when startup is
        // waiting for the user to restore a crashed/previous session. Only
        // that page should suppress restart cleanup. Merely having entries in
        // sessions.getRecentlyClosed() is normal and can survive a browser
        // restart, so treating those entries as a restore silently skips the
        // configured greylist cleanup.
        const startupTabs = await browser.tabs.query({ windowType: 'normal' });
        isFFSessionRestore = hasFirefoxSessionRestoreTab(startupTabs);
      }
      if (!isFFSessionRestore) {
        greyCleanup();
      }
    }
  }
  await checkIfProtected(store.getState());
};

const handleInstalled = async (details: any): Promise<void> => {
  await checkIfProtected(store.getState());

  if (
    browser.contextMenus &&
    (details.reason === 'install' || details.reason === 'update')
  ) {
    await ContextMenuEvents.menuClear();
    await ContextMenuEvents.menuInit();
  }

  switch (details.reason) {
    case 'install':
      browser.runtime.openOptionsPage();
      break;
    case 'update':
      break;
    default:
      break;
  }
};

browser.tabs.onUpdated.addListener(
  StoreUser.withStoreReady(TabEvents.onDomainChange),
);
browser.tabs.onUpdated.addListener(
  StoreUser.withStoreReady(TabEvents.onTabDiscarded),
);
browser.tabs.onUpdated.addListener(
  StoreUser.withStoreReady(TabEvents.onTabUpdate),
);
browser.tabs.onRemoved.addListener(
  StoreUser.withStoreReady(TabEvents.onDomainChangeRemove),
);
browser.tabs.onRemoved.addListener(
  StoreUser.withStoreReady(TabEvents.cleanFromTabEvents),
);

// This should update the cookie badge count when cookies are changed.
browser.cookies.onChanged.addListener(
  StoreUser.withStoreReady(CookieEvents.onCookieChanged),
);

browser.runtime.onStartup.addListener(
  StoreUser.withStoreReady(handleBrowserStartup),
);
browser.runtime.onInstalled.addListener(
  StoreUser.withStoreReady(handleInstalled),
);

// Start hydration only after all core event listeners above have been
// registered synchronously.
void onStartUp()
  .then(() => {
    cadLog(
      {
        msg: `background.onStartUp has been executed`,
        type: 'info',
      },
      getSetting(store.getState(), SettingID.DEBUG_MODE) as boolean,
    );
  })
  .catch((error) => {
    // The store may not be available when hydration itself fails, so avoid
    // using state-dependent logging here.
    console.error('Cookie AutoDelete background initialization failed.', error);
  });
