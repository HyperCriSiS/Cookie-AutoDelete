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

  // Store the FF version in cache
  if (browserDetect() === browserName.Firefox) {
    const browserInfo = await browser.runtime.getBrowserInfo();
    const browserVersion = Number.parseInt(browserInfo.version);
    store.dispatch({
      payload: {
        key: 'browserVersion',
        value: browserVersion,
      },
      type: ReduxConstants.ADD_CACHE,
    });
    store.dispatch({
      payload: {
        key: 'browserInfo',
        value: browserInfo,
      },
      type: ReduxConstants.ADD_CACHE,
    });
  }
  // Store which browser environment in cache
  store.dispatch({
    payload: {
      key: 'browserDetect',
      value: browserDetect(),
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
  cookie: browser.cookies.Cookie;
  cause: browser.cookies.OnChangedCause;
}) {
  const cDomain = extractMainDomain(changeInfo.cookie.domain);
  cookiePopupPorts.forEach((p) => {
    if (!p.name) return;
    if (!p.name.startsWith('popupCAD_')) return;
    const pn = p.name.slice(9).split(',');
    if (pn[0].endsWith(changeInfo.cookie.domain) || pn[0].endsWith(cDomain)) {
      p.postMessage({ cookieUpdated: true });
    }
  });
}

function handleConnect(p: browser.runtime.Port) {
  if (!p.name || !p.name.startsWith('popupCAD_')) return;
  eventListenerActions(
    browser.cookies.onChanged,
    onCookiePopupUpdates,
    EventListenerAction.ADD,
  );
  p.onMessage.addListener((m) => {
    cadLog(
      {
        msg: 'Received unexpected message from CAD Popup',
        type: 'warn',
        x: JSON.stringify(m),
      },
      true,
    );
  });
  p.onDisconnect.addListener((dp: browser.runtime.Port) => {
    if (cookiePopupPorts.length - 1 === 0) {
      eventListenerActions(
        browser.cookies.onChanged,
        onCookiePopupUpdates,
        EventListenerAction.REMOVE,
      );
    }
    if (!dp.name) return;
    const i: number = cookiePopupPorts.findIndex((pp: browser.runtime.Port) => {
      if (!pp.name) return false;
      return pp.name === dp.name;
    });
    if (i !== -1) {
      cookiePopupPorts.splice(i, 1);
    }
  });
  p.postMessage({ cookieUpdated: true });
  cookiePopupPorts.push(p);
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
      const startupTabs = await browser.tabs.query({ windowType: 'normal' });
      startupTabs.forEach((tab) => {
        if (tab.url === 'about:sessionrestore') isFFSessionRestore = true;
      });
      if (!isFFSessionRestore) {
        greyCleanup();
      } else {
        cadLog(
          {
            msg: 'Found a tab with [ about:sessionrestore ] in Firefox. Skipping Grey startup cleanup this time.',
            type: 'info',
          },
          getSetting(store.getState(), SettingID.DEBUG_MODE) === true,
        );
      }
    } else {
      cadLog(
        {
          msg: 'GreyList Cleanup setting is disabled.  Not cleaning cookies on startup.',
          type: 'info',
        },
        getSetting(store.getState(), SettingID.DEBUG_MODE) === true,
      );
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
    case 'update':
      // Validate Settings to get new settings (if any).
      store.dispatch<any>(validateSettings());
      if (convertVersionToNumber(details.previousVersion) < 350) {
        // Migrate State Setting Name localstorageCleanup to localStorageCleanup
        if (store.getState().settings[SettingID.CLEANUP_LOCALSTORAGE_OLD]) {
          store.dispatch({
            payload: {
              name: SettingID.CLEANUP_LOCALSTORAGE,
              value: store.getState().settings[
                SettingID.CLEANUP_LOCALSTORAGE_OLD
              ].value as boolean,
            },
            type: ReduxConstants.UPDATE_SETTING,
          });
        }
        // Migrate Expression Option 'cleanLocalStorage' to cleanSiteData: [ LocalStorage ]
        Object.values(store.getState().lists).forEach((list) => {
          list.forEach((exp) => {
            // Only migrate if cleanSiteData array is undefined/empty.
            if (exp.cleanLocalStorage && !exp.cleanSiteData) {
              store.dispatch({
                payload: {
                  ...exp,
                  cleanSiteData: [SiteDataType.LOCALSTORAGE],
                },
                type: ReduxConstants.UPDATE_EXPRESSION,
              });
            }
          });
        });
        // Migrate Settings [uncheck 'Keep LocalStorage' on New [GREY/WHITE] Expressions]
        // Only does this if either was checked.
        for (const lt of [ListType.GREY, ListType.WHITE]) {
          if (
            getSetting(
              store.getState(),
              `${lt.toLowerCase()}CleanLocalstorage` as SettingID,
            )
          ) {
            const containers = new Set<string>(
              Object.keys(store.getState().lists),
            );
            containers.add('default');
            if (getSetting(store.getState(), SettingID.CONTEXTUAL_IDENTITIES)) {
              const contextualIdentitiesObjects =
                await browser.contextualIdentities.query({});
              contextualIdentitiesObjects.forEach((c) =>
                containers.add(c.cookieStoreId),
              );
            }
            containers.forEach((list) => {
              store.dispatch({
                payload: {
                  expression: `_Default:${lt}`,
                  cleanSiteData: [SiteDataType.LOCALSTORAGE],
                  listType: lt,
                  storeId: list,
                },
                type: ReduxConstants.ADD_EXPRESSION,
              });
            });
          }
        }
      }
      if (convertVersionToNumber(details.previousVersion) < 300) {
        store.dispatch({
          type: ReduxConstants.RESET_COOKIE_DELETED_COUNTER,
        });
      }
      if (getSetting(store.getState(), SettingID.ENABLE_NEW_POPUP)) {
        await browser.runtime.openOptionsPage();
      }
      break;
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
    // using state-dependent logging here. Reject pending UI/event readiness
    // requests as well so callers fail explicitly instead of hanging forever.
    StoreUser.markFailed(error);
    console.error('Cookie AutoDelete background initialization failed.', error);
  });
