/**
 * Copyright (c) 2020-2022 Kenneth Tran and CAD Team (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
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
  addExpressionUI,
  cookieCleanup,
  updateSetting,
} from '../redux/Actions';
import {
  clearCookiesForThisDomain,
  clearLocalStorageForThisDomain,
  clearSiteDataForThisDomain,
} from './CleanupService';
import {
  cadLog,
  getHostname,
  getSetting,
  localFileToRegex,
  parseCookieStoreId,
  showNotification,
  siteDataToBrowser,
  SITEDATATYPES,
} from './Libs';
import StoreUser from './StoreUser';

export default class ContextMenuEvents extends StoreUser {
  public static MenuID = {
    ACTIVE_MODE: 'cad-active-mode',
    CLEAN: 'cad-clean',
    CLEAN_OPEN: 'cad-clean-open',
    LINK_ADD_GREY_DOMAIN: 'cad-link-add-grey-domain',
    LINK_ADD_GREY_SUBS: 'cad-link-add-grey-subs',
    LINK_ADD_WHITE_DOMAIN: 'cad-link-add-white-domain',
    LINK_ADD_WHITE_SUBS: 'cad-link-add-white-subs',
    PAGE_ADD_GREY_DOMAIN: 'cad-page-add-grey-domain',
    PAGE_ADD_GREY_SUBS: 'cad-page-add-grey-subs',
    PAGE_ADD_WHITE_DOMAIN: 'cad-page-add-white-domain',
    PAGE_ADD_WHITE_SUBS: 'cad-page-add-white-subs',
    PARENT_CLEAN: 'cad-parent-clean',
    PARENT_EXPRESSION: 'cad-parent-expression',
    PARENT_LINK_DOMAIN: 'cad-parent-link-domain',
    PARENT_LINK_SUBS: 'cad-parent-link-subs',
    PARENT_PAGE_DOMAIN: 'cad-parent-page-domain',
    PARENT_PAGE_SUBS: 'cad-parent-page-subs',
    PARENT_SELECT_DOMAIN: 'cad-parent-select-domain',
    PARENT_SELECT_SUBS: 'cad-parent-select-subs',
    MANUAL_CLEAN_SITEDATA: 'cad-clean-sitedata-',
    SELECT_ADD_GREY_DOMAIN: 'cad-select-add-grey-domain',
    SELECT_ADD_GREY_SUBS: 'cad-select-add-grey-subs',
    SELECT_ADD_WHITE_DOMAIN: 'cad-select-add-white-domain',
    SELECT_ADD_WHITE_SUBS: 'cad-select-add-white-subs',
    SETTINGS: 'cad-settings',
  };

  public static menuInit(): void {
    if (!browser.contextMenus) return;
    if (
      !getSetting(
        StoreUser.store.getState(),
        SettingID.CONTEXT_MENUS,
      ) as boolean
    )
      return;
    if (ContextMenuEvents.isInitialized) return;
    ContextMenuEvents.isInitialized = true;
    // Clean Option Group
    ContextMenuEvents.menuCreate({
      id: ContextMenuEvents.MenuID.PARENT_CLEAN,
      title: browser.i18n.getMessage('contextMenusParentClean'),
    });
    // Regular Clean (exclude open tabs)
    ContextMenuEvents.menuCreate({
      id: ContextMenuEvents.MenuID.CLEAN,
      parentId: ContextMenuEvents.MenuID.PARENT_CLEAN,
      title: browser.i18n.getMessage('cleanText'),
    });
    // Clean (include open tabs)
    ContextMenuEvents.menuCreate({
      id: ContextMenuEvents.MenuID.CLEAN_OPEN,
      parentId: ContextMenuEvents.MenuID.PARENT_CLEAN,
      title: browser.i18n.getMessage('cleanIgnoringOpenTabsText'),
    });
    // Separator
    ContextMenuEvents.menuCreate({
      parentId: ContextMenuEvents.MenuID.PARENT_CLEAN,
      type: 'separator',
    });
    // Cleanup Warning
    ContextMenuEvents.menuCreate({
      enabled: false,
      parentId: ContextMenuEvents.MenuID.PARENT_CLEAN,
      title: browser.i18n.getMessage('cleanupActionsBypass'),
    });
    // Clean all available site data for domain.
    // SiteDataType (declare enum via Global.d.ts) somehow doesn't exist through the browser...
    [...SITEDATATYPES, 'All', 'Cookies'].sort().forEach((sd) => {
      ContextMenuEvents.menuCreate({
        id: `${ContextMenuEvents.MenuID.MANUAL_CLEAN_SITEDATA}${sd}`,
        parentId: ContextMenuEvents.MenuID.PARENT_CLEAN,
        title: browser.i18n.getMessage(`manualCleanSiteData${sd}`),
      });
    });
    // Separator
    ContextMenuEvents.menuCreate({
      type: 'separator',
    });
    // Add Expression Option Group - page
    ContextMenuEvents.menuCreate({
      contexts: ['link', 'page', 'selection'],
      id: ContextMenuEvents.MenuID.PARENT_EXPRESSION,
      title: browser.i18n.getMessage('contextMenusParentExpression'),
    });
    // Link Group
    ContextMenuEvents.menuCreate({
      contexts: ['link'],
      id: ContextMenuEvents.MenuID.PARENT_LINK_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_EXPRESSION,
      title: browser.i18n.getMessage('contextMenusSelectedDomainLink'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['link'],
      id: ContextMenuEvents.MenuID.LINK_ADD_GREY_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_LINK_DOMAIN,
      title: browser.i18n.getMessage('toGreyListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['link'],
      id: ContextMenuEvents.MenuID.LINK_ADD_WHITE_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_LINK_DOMAIN,
      title: browser.i18n.getMessage('toWhiteListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['link'],
      id: ContextMenuEvents.MenuID.PARENT_LINK_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_EXPRESSION,
      title: browser.i18n.getMessage('contextMenusSelectedSubdomainLink'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['link'],
      id: ContextMenuEvents.MenuID.LINK_ADD_GREY_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_LINK_SUBS,
      title: browser.i18n.getMessage('toGreyListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['link'],
      id: ContextMenuEvents.MenuID.LINK_ADD_WHITE_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_LINK_SUBS,
      title: browser.i18n.getMessage('toWhiteListText'),
    });
    // Page Group
    ContextMenuEvents.menuCreate({
      contexts: ['page'],
      id: ContextMenuEvents.MenuID.PARENT_PAGE_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_EXPRESSION,
      title: browser.i18n.getMessage('contextMenusSelectedDomainPage'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['page'],
      id: ContextMenuEvents.MenuID.PAGE_ADD_GREY_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_PAGE_DOMAIN,
      title: browser.i18n.getMessage('toGreyListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['page'],
      id: ContextMenuEvents.MenuID.PAGE_ADD_WHITE_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_PAGE_DOMAIN,
      title: browser.i18n.getMessage('toWhiteListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['page'],
      id: ContextMenuEvents.MenuID.PARENT_PAGE_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_EXPRESSION,
      title: browser.i18n.getMessage('contextMenusSelectedSubdomainPage'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['page'],
      id: ContextMenuEvents.MenuID.PAGE_ADD_GREY_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_PAGE_SUBS,
      title: browser.i18n.getMessage('toGreyListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['page'],
      id: ContextMenuEvents.MenuID.PAGE_ADD_WHITE_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_PAGE_SUBS,
      title: browser.i18n.getMessage('toWhiteListText'),
    });
    // Selection Group
    ContextMenuEvents.menuCreate({
      contexts: ['selection'],
      id: ContextMenuEvents.MenuID.PARENT_SELECT_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_EXPRESSION,
      title: browser.i18n.getMessage('contextMenusSelectedDomainText', ['%s']),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['selection'],
      id: ContextMenuEvents.MenuID.SELECT_ADD_GREY_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_SELECT_DOMAIN,
      title: browser.i18n.getMessage('toGreyListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['selection'],
      id: ContextMenuEvents.MenuID.SELECT_ADD_WHITE_DOMAIN,
      parentId: ContextMenuEvents.MenuID.PARENT_SELECT_DOMAIN,
      title: browser.i18n.getMessage('toWhiteListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['selection'],
      id: ContextMenuEvents.MenuID.PARENT_SELECT_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_EXPRESSION,
      title: browser.i18n.getMessage('contextMenusSelectedSubdomainText', [
        '%s',
      ]),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['selection'],
      id: ContextMenuEvents.MenuID.SELECT_ADD_GREY_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_SELECT_SUBS,
      title: browser.i18n.getMessage('toGreyListText'),
    });
    ContextMenuEvents.menuCreate({
      contexts: ['selection'],
      id: ContextMenuEvents.MenuID.SELECT_ADD_WHITE_SUBS,
      parentId: ContextMenuEvents.MenuID.PARENT_SELECT_SUBS,
      title: browser.i18n.getMessage('toWhiteListText'),
    });
    // Separator
    ContextMenuEvents.menuCreate({
      type: 'separator',
    });
    // Active Mode
    ContextMenuEvents.menuCreate({
      checked: getSetting(
        StoreUser.store.getState(),
        SettingID.ACTIVE_MODE,
      ) as boolean,
      id: ContextMenuEvents.MenuID.ACTIVE_MODE,
      title: browser.i18n.getMessage('activeModeText'),
      type: 'checkbox',
    });
    // CAD Settings Page.  Opens in a new tab next to the current one.
    ContextMenuEvents.menuCreate({
      id: ContextMenuEvents.MenuID.SETTINGS,
      title: browser.i18n.getMessage('settingsText'),
    });
  }

  public static async menuClear(): Promise<void> {
    await browser.contextMenus.removeAll();
    ContextMenuEvents.isInitialized = false;
    cadLog(
      {
        msg: `ContextMenuEvents.menuClear:  Context Menu has been removed.`,
      },
      getSetting(StoreUser.store.getState(), SettingID.DEBUG_MODE) as boolean,
    );
  }

  protected static menuCreate(
    createProperties: Parameters<typeof browser.contextMenus.create>[0],
  ): number | string {
    return browser.contextMenus.create(
      {
        ...createProperties,
        contexts: createProperties.contexts
          ? createProperties.contexts
          : ([
              browser.runtime.getManifest().manifest_version === 3
                ? 'action'
                : 'browser_action',
              'page',
            ] as browser.menus.ContextType[]),
      },
      ContextMenuEvents.onCreatedOrUpdated,
    );
  }

  protected static onCreatedOrUpdated(): void {
    if (browser.runtime.lastError) {
      cadLog(
        {
          msg: 'Context Menu Create/Update Error',
          type: 'error',
          x: browser.runtime.lastError,
        },
        getSetting(StoreUser.store.getState(), SettingID.DEBUG_MODE) as boolean,
      );
    }
  }

  public static updateMenuItemCheckbox(id: string, value: boolean): void {
    if (!ContextMenuEvents.isInitialized) return;
    browser.contextMenus.update(id, { checked: value });
  }

  protected static setMenuEnabled(id: string, value: boolean): void {
    if (!ContextMenuEvents.isInitialized) return;
    browser.contextMenus.update(id, { enabled: value });
  }

  public static async onContextMenuClicked(
    info: browser.contextMenus.OnClickData,
    tab?: browser.tabs.Tab,
  ): Promise<void> {
    if (!tab) return;
    const debug = getSetting(
      StoreUser.store.getState(),
      SettingID.DEBUG_MODE,
    ) as boolean;
    cadLog(
      {
        msg: `ContextMenuEvents.onContextMenuClicked:  Data received`,
        x: { info, tab: { ...tab, favIconUrl: undefined } },
      },
      debug,
    );

    if (
      typeof info.menuItemId === 'string' &&
      info.menuItemId.startsWith(ContextMenuEvents.MenuID.MANUAL_CLEAN_SITEDATA)
    ) {
      const siteData = info.menuItemId.substring(
        ContextMenuEvents.MenuID.MANUAL_CLEAN_SITEDATA.length,
      ) as SiteDataType | 'All' | 'Cookies';
      const hostname = getHostname(tab.url);
      if (!hostname) {
        showNotification(
          browser.i18n.getMessage('notificationClearDomainError'),
          browser.i18n.getMessage('notificationClearDomainErrorTitle'),
          getSetting(
            StoreUser.store.getState(),
            SettingID.NOTIFY_DURATION,
          ) as number,
        );
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked cannot clean ${siteData} from tab:`,
            type: 'warn',
            x: tab,
          },
          debug,
        );
        return;
      }
      cadLog(
        {
          msg: `ContextMenuEvents.onContextMenuClicked triggered Clean Site Data (${siteData}) For This Domain.`,
          x: { hostname, siteData },
        },
        debug,
      );
      switch (siteData) {
        case 'All':
          await clearSiteDataForThisDomain(
            StoreUser.store.getState(),
            'All',
            hostname,
          );
          await clearCookiesForThisDomain(StoreUser.store.getState(), tab);
          await clearLocalStorageForThisDomain(StoreUser.store.getState(), tab);
          break;
        case 'Cookies':
          await clearCookiesForThisDomain(StoreUser.store.getState(), tab);
          break;
        case SiteDataType.CACHE:
        case SiteDataType.INDEXEDDB:
        case SiteDataType.LOCALSTORAGE:
        case SiteDataType.PLUGINDATA:
        case SiteDataType.SERVICEWORKERS:
          await clearSiteDataForThisDomain(
            StoreUser.store.getState(),
            siteData,
            hostname,
          );
          break;
        default:
          cadLog(
            {
              msg: `ContextMenuEvents.onContextMenuClicked received unknown manual clean site data type: ${info.menuItemId}`,
              type: 'warn',
            },
            debug,
          );
          break;
      }
      return;
    }

    switch (info.menuItemId) {
      case ContextMenuEvents.MenuID.CLEAN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked triggered Normal Clean.`,
          },
          debug,
        );
        StoreUser.store.dispatch<any>(
          cookieCleanup({
            greyCleanup: false,
            ignoreOpenTabs: false,
          }),
        );
        break;
      case ContextMenuEvents.MenuID.CLEAN_OPEN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked triggered Clean, include open tabs.`,
          },
          debug,
        );
        StoreUser.store.dispatch<any>(
          cookieCleanup({
            greyCleanup: false,
            ignoreOpenTabs: true,
          }),
        );
        break;
      case ContextMenuEvents.MenuID.LINK_ADD_GREY_DOMAIN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was LINK_ADD_GREY_DOMAIN.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          getHostname(info.linkUrl),
          ListType.GREY,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.LINK_ADD_WHITE_DOMAIN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was LINK_ADD_WHITE_DOMAIN.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          getHostname(info.linkUrl),
          ListType.WHITE,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.LINK_ADD_GREY_SUBS:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was LINK_ADD_GREY_SUBS.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          `*.${getHostname(info.linkUrl)}`,
          ListType.GREY,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.LINK_ADD_WHITE_SUBS:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was LINK_ADD_WHITE_SUBS.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          `*.${getHostname(info.linkUrl)}`,
          ListType.WHITE,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.PAGE_ADD_GREY_DOMAIN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was PAGE_ADD_GREY_DOMAIN.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          getHostname(info.pageUrl),
          ListType.GREY,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.PAGE_ADD_WHITE_DOMAIN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was PAGE_ADD_WHITE_DOMAIN.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          getHostname(info.pageUrl),
          ListType.WHITE,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.PAGE_ADD_GREY_SUBS:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was PAGE_ADD_GREY_SUBS.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          `*.${getHostname(info.pageUrl)}`,
          ListType.GREY,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.PAGE_ADD_WHITE_SUBS:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was PAGE_ADD_WHITE_SUBS.`,
          },
          debug,
        );
        ContextMenuEvents.addNewExpression(
          `*.${getHostname(info.pageUrl)}`,
          ListType.WHITE,
          tab.cookieStoreId || '',
        );
        break;
      case ContextMenuEvents.MenuID.SELECT_ADD_GREY_DOMAIN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was SELECT_ADD_GREY_DOMAIN.`,
          },
          debug,
        );
        if (info.selectionText) {
          info.selectionText.split(',').forEach((selection) => {
            const selectionText = selection.trim();
            if (!selectionText) return;
            let encodedSelectionText = selectionText;
            try {
              encodedSelectionText = encodeURI(selectionText);
            } catch (e) {
              cadLog(
                {
                  msg: `ContextMenuEvents.onContextMenuClicked:  encodeURI on selected text`,
                  type: 'error',
                  x: e,
                },
                debug,
              );
            }
            ContextMenuEvents.addNewExpression(
              getHostname(encodedSelectionText) || selectionText,
              ListType.GREY,
              tab.cookieStoreId || '',
            );
          });
        }
        break;
      case ContextMenuEvents.MenuID.SELECT_ADD_WHITE_DOMAIN:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was SELECT_ADD_WHITE_DOMAIN.`,
          },
          debug,
        );
        if (info.selectionText) {
          info.selectionText.split(',').forEach((selection) => {
            const selectionText = selection.trim();
            if (!selectionText) return;
            let encodedSelectionText = selectionText;
            try {
              encodedSelectionText = encodeURI(selectionText);
            } catch (e) {
              cadLog(
                {
                  msg: `ContextMenuEvents.onContextMenuClicked:  encodeURI on selected text`,
                  type: 'error',
                  x: e,
                },
                debug,
              );
            }
            ContextMenuEvents.addNewExpression(
              getHostname(encodedSelectionText) || selectionText,
              ListType.WHITE,
              tab.cookieStoreId || '',
            );
          });
        }
        break;
      case ContextMenuEvents.MenuID.SELECT_ADD_GREY_SUBS:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was SELECT_ADD_GREY_SUBS.`,
          },
          debug,
        );
        if (info.selectionText) {
          info.selectionText.split(',').forEach((selection) => {
            const selectionText = selection.trim();
            if (!selectionText) return;
            let encodedSelectionText = selectionText;
            try {
              encodedSelectionText = encodeURI(selectionText);
            } catch (e) {
              cadLog(
                {
                  msg: `ContextMenuEvents.onContextMenuClicked:  encodeURI on selected text`,
                  type: 'error',
                  x: e,
                },
                debug,
              );
            }
            ContextMenuEvents.addNewExpression(
              `*.${getHostname(encodedSelectionText) || selectionText}`,
              ListType.GREY,
              tab.cookieStoreId || '',
            );
          });
        }
        break;
      case ContextMenuEvents.MenuID.SELECT_ADD_WHITE_SUBS:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked:  menuItemId was SELECT_ADD_WHITE_SUBS.`,
          },
          debug,
        );
        if (info.selectionText) {
          info.selectionText.split(',').forEach((selection) => {
            const selectionText = selection.trim();
            if (!selectionText) return;
            let encodedSelectionText = selectionText;
            try {
              encodedSelectionText = encodeURI(selectionText);
            } catch (e) {
              cadLog(
                {
                  msg: `ContextMenuEvents.onContextMenuClicked:  encodeURI on selected text`,
                  type: 'error',
                  x: e,
                },
                debug,
              );
            }
            ContextMenuEvents.addNewExpression(
              `*.${getHostname(encodedSelectionText) || selectionText}`,
              ListType.WHITE,
              tab.cookieStoreId || '',
            );
          });
        }
        break;
      case ContextMenuEvents.MenuID.ACTIVE_MODE:
        StoreUser.store.dispatch(
          updateSetting({
            name: SettingID.ACTIVE_MODE,
            value: info.checked as boolean,
          }),
        );
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked changed Automatic Cleaning value to:  ${info.checked}.`,
          },
          debug,
        );
        break;
      case ContextMenuEvents.MenuID.SETTINGS:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked triggered Open Settings.`,
          },
          debug,
        );
        await browser.runtime.openOptionsPage();
        break;
      default:
        cadLog(
          {
            msg: `ContextMenuEvents.onContextMenuClicked received unknown menu id: ${info.menuItemId}`,
            type: 'warn',
          },
          debug,
        );
        break;
    }
  }

  protected static addNewExpression(
    expression: string | undefined,
    listType: ListType,
    cookieStoreId: string,
  ): void {
    if (expression === undefined) {
      showNotification(
        browser.i18n.getMessage('addNewExpressionNotificationError'),
        browser.i18n.getMessage('errorText'),
        getSetting(
          StoreUser.store.getState(),
          SettingID.NOTIFY_DURATION,
        ) as number,
      );
      return;
    }
    const storeId = parseCookieStoreId(StoreUser.store.getState(), cookieStoreId);
    StoreUser.store.dispatch<any>(
      addExpressionUI({
        expression: localFileToRegex(expression),
        listType,
        storeId,
      }),
    );
    showNotification(
      browser.i18n.getMessage('addNewExpressionNotification', [
        expression,
        listType,
        storeId,
      ]),
      browser.i18n.getMessage('extensionName'),
      getSetting(
        StoreUser.store.getState(),
        SettingID.NOTIFY_DURATION,
      ) as number,
    );
  }

  protected static isInitialized = false;
}
