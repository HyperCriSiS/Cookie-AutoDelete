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

import StoreUser from './StoreUser';
import ContextualIdentitiesEvents from './ContextualIdentitiesEvents';
import { validateSettings } from '../redux/Actions';
import { initialState } from '../redux/State';
import { cadLog, siteDataToBrowser, SITEDATATYPES } from './Libs';
import { checkIfProtected, setGlobalIcon } from './BrowserActionService';
import ContextMenuEvents from './ContextMenuEvents';
import { ReduxConstants } from '../typings/ReduxConstants';
import { supportsStorageType } from './BrowserCapabilities';

export default class SettingService extends StoreUser {
  public static init(): void {
    SettingService.current = StoreUser.store.getState().settings;
    SettingService.isInitialized = true;
  }

  public static async onSettingsChange(): Promise<void> {
    if (!SettingService.isInitialized) {
      SettingService.init();
    }
    const previous = SettingService.current;
    SettingService.current = StoreUser.store.getState().settings;

    // Container Mode Changes
    if (SettingService.hasNewValue(previous, SettingID.CONTEXTUAL_IDENTITIES)) {
      if (SettingService.getCurrent(SettingID.CONTEXTUAL_IDENTITIES)) {
        await ContextualIdentitiesEvents.init();
      } else {
        await ContextualIdentitiesEvents.deInit();
      }
    }

    // BrowsingData Settings Check
    for (const siteData of SITEDATATYPES) {
      const sd = `${siteDataToBrowser(siteData)}Cleanup`;
      const currentSiteDataSetting = SettingService.current[sd];
      if (
        currentSiteDataSetting !== undefined &&
        (previous[sd] === undefined || !previous[sd].value) &&
        currentSiteDataSetting.value
      ) {
        if (!supportsStorageType(StoreUser.store.getState().cache, siteData)) {
          cadLog(
            {
              msg: `${siteData} cleanup is not supported by this browser/runtime. Skipping initial cleanup.`,
              type: 'info',
            },
            SettingService.getCurrent(SettingID.DEBUG_MODE) as boolean,
          );
          continue;
        }
        // Migration Check to prevent LocalStorage from being cleaned again.
        // Only if migrating from 3.4.0 to 3.5.1+
        if (
          siteData === SiteDataType.LOCALSTORAGE &&
          previous[SettingID.CLEANUP_LOCALSTORAGE_OLD] !== undefined &&
          previous[SettingID.CLEANUP_LOCALSTORAGE_OLD].value
        ) {
          continue;
        }
        if (SettingService.getCurrent(SettingID.SITEDATA_EMPTY_ON_ENABLE) === false) {
          cadLog(
            {
              msg: `${siteData} setting activated, but Empty Site Data on Enable is false. Existing site data kept.`,
              type: 'info',
            },
            SettingService.getCurrent(SettingID.DEBUG_MODE) as boolean,
          )
          continue;
        }
        await browser.browsingData.remove(
          { since: 0 },
          { [siteDataToBrowser(siteData)]: true },
        );
        cadLog(
          {
            msg: `${siteData} setting activated.  All previous ${siteData} has been cleared for a clean slate.`,
            type: 'info',
          },
          SettingService.getCurrent(SettingID.DEBUG_MODE) as boolean,
        );
      }
    }

    // Active Mode (Automatic Cleanup) changes
    if (SettingService.hasNewValue(previous, SettingID.ACTIVE_MODE)) {
      const active = SettingService.getCurrent(
        SettingID.ACTIVE_MODE,
      ) as boolean;
      if (!active) {
        await browser.alarms.clear('activeModeAlarm');
      }
      await setGlobalIcon(active);
      // Context menus survive MV3 service-worker restarts while static class
      // fields do not. Update the existing menu item based on persisted settings
      // instead of relying on ContextMenuEvents.isInitialized in RAM.
      if (
        browser.contextMenus &&
        SettingService.getCurrent(SettingID.CONTEXT_MENUS)
      ) {
        try {
          await browser.contextMenus.update(
            ContextMenuEvents.MenuID.ACTIVE_MODE,
            { checked: active },
          );
        } catch (error) {
          cadLog(
            {
              msg: 'Could not update the Auto-Clean context menu checkbox.',
              type: 'warn',
              x: error,
            },
            SettingService.getCurrent(SettingID.DEBUG_MODE) as boolean,
          );
        }
      }
    }

    // Context Menu Changes
    if (SettingService.hasNewValue(previous, SettingID.CONTEXT_MENUS)) {
      if (SettingService.getCurrent(SettingID.CONTEXT_MENUS)) {
        ContextMenuEvents.menuInit();
      } else {
        await ContextMenuEvents.menuClear();
      }
    }

    // Deprecated Setting Adjustments
    // Only for localstorageCleanup <-> localStorageCleanup
    SettingService.updateDeprecatedSetting(
      previous,
      SettingID.CLEANUP_LOCALSTORAGE,
      SettingID.CLEANUP_LOCALSTORAGE_OLD,
    );
    SettingService.updateDeprecatedSetting(
      previous,
      SettingID.CLEANUP_LOCALSTORAGE_OLD,
      SettingID.CLEANUP_LOCALSTORAGE,
    );

    await checkIfProtected(StoreUser.store.getState());

    // Validate Settings Again
    StoreUser.store.dispatch<any>(validateSettings());
  }

  private static getCurrent(s: SettingID): boolean | number | string {
    const setting = SettingService.current[s] || initialState.settings[s];
    return setting.value;
  }

  private static hasNewValue(p: MapToSettingObject, s: SettingID): boolean {
    const previous = p[s];
    const current = SettingService.current[s];
    return current !== undefined && (previous === undefined || previous.value !== current.value);
  }

  private static updateDeprecatedSetting(
    p: MapToSettingObject,
    a: SettingID,
    b: SettingID,
  ): void {
    if (p[a] && SettingService.current[a] && SettingService.hasNewValue(p, a)) {
      StoreUser.store.dispatch({
        payload: {
          name: b,
          value: SettingService.getCurrent(a),
        },
        type: ReduxConstants.UPDATE_SETTING,
      });
    }
  }

  protected static current: MapToSettingObject;
  protected static delaySave = false;
  protected static isInitialized = false;
}
