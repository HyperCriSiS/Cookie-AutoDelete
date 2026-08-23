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

import { SettingID } from '../typings/Enums';
import StoreUser from './StoreUser';
import { addExpressionUI, removeListUI } from '../redux/Actions';
import contextualIdentitiesChangeInfo = browser.contextualIdentities.contextualIdentitiesChangeInfo;
import {
  cadLog,
  getSetting,
  isTemporaryContainerName,
  TEMPORARY_CONTAINER_STORE_ID,
} from './Libs';
import { ReduxConstants } from '../typings/ReduxConstants';

export default class ContextualIdentitiesEvents extends StoreUser {
  public static async init(): Promise<void> {
    if (
      !ContextualIdentitiesEvents.isEnabled() ||
      ContextualIdentitiesEvents.isInitialized
    )
      return;
    ContextualIdentitiesEvents.isInitialized = true;
    // Populate cache with mapped Container ID to Name. Event listeners are
    // registered synchronously by the background entry point.
    await ContextualIdentitiesEvents.cacheCookieStoreIdNames();
    cadLog(
      {
        msg: `ContextualIdentitiesEvents.init:  Container support has been initialized.`,
      },
      getSetting(StoreUser.store.getState(), SettingID.DEBUG_MODE) as boolean,
    );
  }

  /**
   * Disable container-specific behavior and remove cached container names.
   * Event listeners stay registered at the background entry point so an MV3
   * service worker never depends on asynchronous listener registration.
   */
  public static async deInit(): Promise<void> {
    if (
      !ContextualIdentitiesEvents.isInitialized ||
      !browser.contextualIdentities
    )
      return;
    ContextualIdentitiesEvents.isInitialized = false;
    const existingContainers = await browser.contextualIdentities.query({});
    for (const ci of existingContainers) {
      StoreUser.store.dispatch({
        payload: {
          key: ci.cookieStoreId,
          value: undefined,
        },
        type: ReduxConstants.ADD_CACHE,
      });
    }
    cadLog(
      {
        msg: `ContextualIdentitiesEvents.deInit:  Container support has been disabled.`,
      },
      getSetting(StoreUser.store.getState(), SettingID.DEBUG_MODE) as boolean,
    );
  }

  /**
   * This will add the new container mapping to the cache.
   * @param changeInfo The ContextualIdentity object that was created.
   */
  public static onContainerCreated(
    changeInfo: contextualIdentitiesChangeInfo,
  ): void {
    if (!ContextualIdentitiesEvents.isEnabled()) return;
    StoreUser.store.dispatch({
      payload: {
        key: changeInfo.contextualIdentity.cookieStoreId,
        value: changeInfo.contextualIdentity.name,
      },
      type: ReduxConstants.ADD_CACHE,
    });
  }

  /**
   * This should remove the related cookieStoreId/container when removed in Firefox.
   * @param changeInfo The ContextualIdentity Object that was removed.
   */
  public static onContainerRemoved(
    changeInfo: contextualIdentitiesChangeInfo,
  ): void {
    if (!ContextualIdentitiesEvents.isEnabled()) return;
    // Only remove expression list id if setting is enabled.
    if (
      getSetting(
        StoreUser.store.getState(),
        SettingID.CONTEXTUAL_IDENTITIES_AUTOREMOVE,
      )
    ) {
      StoreUser.store.dispatch(
        removeListUI(changeInfo.contextualIdentity.cookieStoreId),
      );
    }

    StoreUser.store.dispatch({
      payload: {
        key: changeInfo.contextualIdentity.cookieStoreId,
        value: undefined,
      },
      type: ReduxConstants.ADD_CACHE,
    });
  }

  /**
   * This should update the cache if a container was updated in Firefox.
   * @param changeInfo The ContextualIdentity Object that was updated.
   */
  public static onContainerUpdated(
    changeInfo: contextualIdentitiesChangeInfo,
  ): void {
    if (!ContextualIdentitiesEvents.isEnabled()) return;
    const cache = StoreUser.store.getState().cache;
    if (
      cache[changeInfo.contextualIdentity.cookieStoreId] &&
      cache[changeInfo.contextualIdentity.cookieStoreId] !==
        changeInfo.contextualIdentity.name
    ) {
      StoreUser.store.dispatch({
        payload: {
          key: changeInfo.contextualIdentity.cookieStoreId,
          value: changeInfo.contextualIdentity.name,
        },
        type: ReduxConstants.ADD_CACHE,
      });
    }
  }

  // Map the cookieStoreId to their actual names and store in cache
  public static async cacheCookieStoreIdNames(): Promise<void> {
    const contextualIdentitiesObjects =
      await browser.contextualIdentities.query({});
    StoreUser.store.dispatch({
      payload: {
        key: 'default',
        value: 'Default',
      },
      type: ReduxConstants.ADD_CACHE,
    });
    StoreUser.store.dispatch({
      payload: {
        key: 'firefox-default',
        value: 'Default',
      },
      type: ReduxConstants.ADD_CACHE,
    });
    StoreUser.store.dispatch({
      payload: {
        key: 'firefox-private',
        value: 'Private',
      },
      type: ReduxConstants.ADD_CACHE,
    });
    contextualIdentitiesObjects.forEach((object) =>
      StoreUser.store.dispatch({
        payload: {
          key: object.cookieStoreId,
          value: object.name,
        },
        type: ReduxConstants.ADD_CACHE,
      }),
    );

    ContextualIdentitiesEvents.consolidateTemporaryContainerLists(
      contextualIdentitiesObjects,
    );
  }

  /**
   * Temporary Containers creates short-lived cookieStoreIds. Older CAD state
   * may therefore contain one expression list per temporary container. Merge
   * those live legacy lists into the stable %tmp store and remove the old keys.
   * Existing %tmp rules win if the same expression already exists.
   */
  private static consolidateTemporaryContainerLists(
    contextualIdentitiesObjects: browser.contextualIdentities.ContextualIdentity[],
  ): void {
    const temporaryStoreIds = contextualIdentitiesObjects
      .filter((container) => isTemporaryContainerName(container.name))
      .map((container) => container.cookieStoreId)
      .sort();

    temporaryStoreIds.forEach((temporaryStoreId) => {
      const expressions =
        StoreUser.store.getState().lists[temporaryStoreId] || [];
      expressions.forEach((expression) => {
        StoreUser.store.dispatch(
          addExpressionUI({
            ...expression,
            storeId: TEMPORARY_CONTAINER_STORE_ID,
          }),
        );
      });
      if (expressions.length > 0) {
        StoreUser.store.dispatch(removeListUI(temporaryStoreId));
      }
    });
  }

  private static isEnabled(): boolean {
    return Boolean(
      browser.contextualIdentities &&
        getSetting(
          StoreUser.store.getState(),
          SettingID.CONTEXTUAL_IDENTITIES,
        ),
    );
  }

  protected static isInitialized = false;
}
