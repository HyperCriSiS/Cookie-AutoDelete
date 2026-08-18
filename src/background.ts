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
import { browserName, SettingID } from './typings/Enums';
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
import { getBrowserMajorVersionFromUserAgent } from './services/BrowserCapabilities';

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
  } else {
    browserVersion = getBrowserMajorVersionFromUserAgent(
      detectedBrowser,
      typeof navigator !== 'undefined' ? navigator.userAgent : '',
    );
  }

  if (browserVersion !== undefined && Number.isFinite(browserVersion)) {
    store.dispatch({
      payload: {
        key: 'browserVersion',
        value: browserVersion,
      },
      type: ReduxConstants.ADD_CACHE,
    });
  }

  // Store which browser environment in cache
  store.dispatch({
    payload: {
      key: 'browserDetect',
      value: detectedBrowser,
    },
    type: ReduxConstants.ADD_CACHE,
  });

  // Store platform in cache
  const platformInfo = await browser.runtime.getPlatformInfo();
  store.dispatch({
    payload: {
      key: 'platformInfo',
      value: platformInfo,
    },
    type: ReduxConstants.ADD_CACHE,
  });
  store.dispatch({
    payload: {
      key: 'platformOs',
      value: platformInfo.os,
    },
    type: ReduxConstants.ADD_CACHE,
  });

  // The store is available to initialization services now, but browser event
  // handlers and UI requests remain gated until markReady() below.
  StoreUser.init(store, false);

  SettingService.init();
  store.subscribe(SettingService.onSettingsChange);
  store.subscribe(() => statePersistence.save(store.getState()));

  store.dispatch<any>(validateSettings());

  await setGlobalIcon(
    getSetting(store.getState(), SettingID.ACTIVE_MODE) as boolean,
  );

  await checkIfProtected(store.getState());

  if (browser.contextualIdentities) {
    await ContextualIdentitiesEvents.init();
  }
  actionApi.setTitle({
    title: `${mf.name} ${mf.version} [READY] (0)`,
  });

  // Only release synchronously registered browser listeners and UI store
  // requests after the entire background initialization completed.
  StoreUser.markReady();
};

// Keeps a memory of all runtime ports for popups.  Should only be one but just in case.
const cookiePopupPorts: browser.runtime.Port[] = [];

async function onCookiePopupUpdates(changeInfo: {
  removed: boolean;
  cookie: CadCookie;
  cause: browser.cookies.OnChangedCause;
}) {
  const cDomain = extractMainDomain(changeInfo.cookie.domain);
  cookiePopupPorts.forEach((p) => {
    if (!p.name) return;
    if (!p.name.startsWith('popupCAD_')) return;
    const d = p.name.split('_');
    if (d[2] !== changeInfo.cookie.storeId || d[1] !== cDomain) return;
    p.postMessage({
      popupHostname: cDomain,
      cookieUpdated: true,
    } as CookieCountMsg);
  });
}

browser.cookies.onChanged.addListener(onCookiePopupUpdates);

function handleConnect(p: browser.runtime.Port) {
  if (!p.name) return;
  if (!p.name.startsWith('popupCAD_')) return;
  cookiePopupPorts.push(p);
  p.onDisconnect.addListener((pp) => {
    const i = cookiePopupPorts.indexOf(pp);
    if (i !== -1) {
      cookiePopupPorts.splice(i, 1);
    }
  });
}

browser.runtime.onConnect.addListener(handleConnect);

if (browser.contextMenus) {
  eventListenerActions(
    browser.contextMenus.onClicked,
    StoreUser.withStoreReady(ContextMenuEvents.onContextMenuClicked),
    EventListenerAction.ADD,
  );
}

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
        // Firefox-specific to skip greylist cleanup on session restore
        const sessions = await browser.sessions.getRecentlyClosed({
          maxResults: 1,
        });
        if (sessions.length > 0) {
          const session = sessions[0];
          const tab = session.tab;
          if (tab && tab.sessionId) {
            const restoredTab = await browser.sessions.restore(tab.sessionId);
            if (restoredTab && restoredTab.tab) {
              await browser.tabs.remove(restoredTab.tab.id as number);
              isFFSessionRestore = true;
            }
          }
        }
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
    if (getSetting(store.getState(), SettingID.CONTEXT_MENUS)) {
      ContextMenuEvents.menuInit();
    }
  }

  switch (details.reason) {
    case 'install':
      await browser.runtime.openOptionsPage();
      break;
    case 'update': {
      const currentVersion = convertVersionToNumber(
        browser.runtime.getManifest().version,
      );
      const previousVersion = convertVersionToNumber(details.previousVersion);
      if (previousVersion < convertVersionToNumber('3.5.0')) {
        store.dispatch({
          payload: {
            name: SettingID.OLD_WHITE_CLEAN_LOCALSTORAGE,
            value: false,
          },
          type: ReduxConstants.UPDATE_SETTING,
        });
        store.dispatch({
          payload: {
            name: SettingID.OLD_GREY_CLEAN_LOCALSTORAGE,
            value: false,
          },
          type: ReduxConstants.UPDATE_SETTING,
        });
      }
      if (
        currentVersion > previousVersion &&
        getSetting(store.getState(), SettingID.ENABLE_NEW_POPUP)
      ) {
        await browser.runtime.openOptionsPage();
      }
      break;
    }
    default:
      break;
  }
};

// Register all core browser event listeners synchronously. The wrappers wait
// for asynchronous state hydration before invoking services that depend on the
// shared Redux store.
browser.tabs.onUpdated.addListener(
  StoreUser.withStoreReady(DomainChangeEvents.onDomainChange),
);
browser.tabs.onUpdated.addListener(
  StoreUser.withStoreReady(TabEvents.onTabDiscarded),
);
browser.tabs.onUpdated.addListener(
  StoreUser.withStoreReady(TabEvents.onTabUpdate),
);
browser.tabs.onRemoved.addListener(
  StoreUser.withStoreReady(DomainChangeEvents.onDomainChangeRemove),
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
    StoreUser.markFailed(error);
    console.error('Cookie AutoDelete background initialization failed.', error);
  });
