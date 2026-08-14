/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Domain-change tracking has browser-session lifetime, not service-worker
 * lifetime. storage.session preserves the previous domain across worker
 * shutdowns while automatically discarding stale tab IDs on browser restart.
 */

import {
  cadLog,
  createPartialTabInfo,
  extractMainDomain,
  getHostname,
  getSetting,
} from './Libs';
import StoreUser from './StoreUser';
import TabEvents from './TabEvents';

type SessionStorageArea = typeof browser.storage.local;
type StorageWithSession = typeof browser.storage & {
  session?: SessionStorageArea;
};

export default class DomainChangeEvents extends StoreUser {
  public static async onDomainChange(
    tabId: number,
    changeInfo: browser.tabs.TabChangeInfo,
    tab: browser.tabs.Tab,
  ): Promise<void> {
    if (tab.status !== 'complete') return;

    const debug = getSetting(
      StoreUser.store.getState(),
      SettingID.DEBUG_MODE,
    ) as boolean;
    const partialTabInfo = createPartialTabInfo(tab);
    const mainDomain = extractMainDomain(getHostname(tab.url));

    // Truncate ChangeInfo.favIconUrl as we have no use for it in debug.
    if (changeInfo.favIconUrl && debug) {
      changeInfo.favIconUrl = '***';
    }

    const storage = DomainChangeEvents.sessionStorage();
    const key = DomainChangeEvents.key(tabId);
    const stored = await storage.get(key);
    const previousDomain = stored[key] as string | undefined;

    if (previousDomain === undefined && mainDomain !== '') {
      await storage.set({ [key]: mainDomain });
      cadLog(
        {
          msg: 'DomainChangeEvents.onDomainChange: First mainDomain set.',
          x: { tabId, changeInfo, mainDomain, partialTabInfo },
        },
        debug,
      );
      return;
    }

    const isRecognizedBlankPage =
      tab.url === 'about:blank' ||
      tab.url === 'about:home' ||
      tab.url === 'about:newtab' ||
      tab.url === 'chrome://newtab/';

    if (
      previousDomain !== mainDomain &&
      (mainDomain !== '' || isRecognizedBlankPage)
    ) {
      await storage.set({ [key]: mainDomain });

      if (!getSetting(StoreUser.store.getState(), SettingID.CLEAN_DOMAIN_CHANGE)) {
        cadLog(
          {
            msg: 'DomainChangeEvents.onDomainChange: mainDomain changed, but cleanOnDomainChange is disabled.',
            x: {
              tabId,
              changeInfo,
              oldMainDomain: previousDomain,
              mainDomain,
              partialTabInfo,
            },
          },
          debug,
        );
        return;
      }

      if (previousDomain === '' || previousDomain === undefined) {
        cadLog(
          {
            msg: 'DomainChangeEvents.onDomainChange: mainDomain changed, but the previous domain was blank or unknown. Not cleaning.',
            x: { tabId, changeInfo, mainDomain, partialTabInfo },
          },
          debug,
        );
        return;
      }

      cadLog(
        {
          msg: 'DomainChangeEvents.onDomainChange: mainDomain changed. Executing domain-change cleanup.',
          x: {
            tabId,
            changeInfo,
            oldMainDomain: previousDomain,
            mainDomain,
            partialTabInfo,
          },
        },
        debug,
      );
      await TabEvents.cleanFromTabEvents();
      return;
    }

    cadLog(
      {
        msg: 'DomainChangeEvents.onDomainChange: mainDomain has not changed yet.',
        x: { tabId, changeInfo, mainDomain, partialTabInfo },
      },
      debug,
    );
  }

  public static async onDomainChangeRemove(
    tabId: number,
    removeInfo: {
      windowId: number;
      isWindowClosing: boolean;
    },
  ): Promise<void> {
    const storage = DomainChangeEvents.sessionStorage();
    const key = DomainChangeEvents.key(tabId);
    const stored = await storage.get(key);

    cadLog(
      {
        msg: 'DomainChangeEvents.onDomainChangeRemove: Tab closed. Removing session domain state.',
        x: { tabId, mainDomain: stored[key], removeInfo },
      },
      getSetting(StoreUser.store.getState(), SettingID.DEBUG_MODE) as boolean,
    );

    await storage.remove(key);
  }

  private static key(tabId: number): string {
    return `cad-tab-domain-${tabId}`;
  }

  private static sessionStorage(): SessionStorageArea {
    const session = (browser.storage as StorageWithSession).session;
    if (!session) {
      throw new Error(
        'Cookie AutoDelete requires browser.storage.session for MV3 domain-change tracking.',
      );
    }
    return session;
  }
}
