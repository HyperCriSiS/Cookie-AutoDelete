/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Background-side compatibility bridge for the tiny redux-webext wire
 * protocol. Popup/settings can keep their existing UI store temporarily, while
 * the MV3 worker registers the wake-up relevant runtime listeners immediately
 * at module load rather than after asynchronous state hydration.
 */

import {
  addExpression,
  clearActivities,
  clearExpressions,
  cookieCleanup,
  removeActivity,
  removeExpression,
  removeList,
  resetAll,
  resetCookieDeletedCounter,
  resetSettings,
  updateExpression,
  updateSetting,
} from '../redux/Actions';
import { ReduxConstants } from '../typings/ReduxConstants';
import StoreUser from './StoreUser';

export const STORE_CONNECTION_NAME = 'redux-webext';
export const STORE_DISPATCH = '@@STORE_DISPATCH';
export const STORE_UPDATE_STATE = '@@STORE_UPDATE_STATE';

const actions: { [key in ReduxConstants]?: any } = {
  ADD_EXPRESSION: addExpression,
  CLEAR_ACTIVITY_LOG: clearActivities,
  CLEAR_EXPRESSIONS: clearExpressions,
  COOKIE_CLEANUP: cookieCleanup,
  REMOVE_ACTIVITY_LOG: removeActivity,
  REMOVE_EXPRESSION: removeExpression,
  REMOVE_LIST: removeList,
  RESET_ALL: resetAll,
  RESET_COOKIE_DELETED_COUNTER: resetCookieDeletedCounter,
  RESET_SETTINGS: resetSettings,
  UPDATE_EXPRESSION: updateExpression,
  UPDATE_SETTING: updateSetting,
};

type BridgeMessage = {
  type?: string;
  action?: {
    type: ReduxConstants;
    payload?: unknown;
    [key: string]: unknown;
  };
};

export const handleStoreMessage = async (
  message: BridgeMessage,
): Promise<unknown> => {
  if (message.type === STORE_UPDATE_STATE) {
    const store = await StoreUser.ready();
    return store.getState();
  }

  if (message.type === STORE_DISPATCH && message.action) {
    const store = await StoreUser.ready();
    const { type, ...actionData } = message.action;
    const actionCreator = actions[type];
    if (!actionCreator) {
      console.error(`Background store bridge does not contain action "${type}".`);
      return undefined;
    }

    const payload = actionData.payload;
    store.dispatch<any>(
      actionCreator(Object.keys(actionData).length ? payload : undefined),
    );
    return { ok: true };
  }

  return undefined;
};

export const handleStoreConnection = (
  connection: browser.runtime.Port,
): void => {
  if (connection.name !== STORE_CONNECTION_NAME) return;

  let disconnected = false;
  let unsubscribe: (() => void) | undefined;

  connection.onDisconnect.addListener(() => {
    disconnected = true;
    if (unsubscribe) unsubscribe();
  });

  void StoreUser.ready()
    .then((store) => {
      if (disconnected) return;
      unsubscribe = store.subscribe(() => {
        if (disconnected) return;
        connection.postMessage({
          type: STORE_UPDATE_STATE,
          data: store.getState(),
        });
      });
    })
    .catch((error) => {
      console.error('Could not connect UI to background store.', error);
    });
};

// Register synchronously as this module is loaded by the background entry
// graph. browser-polyfill translates Promise-returning onMessage listeners to
// Chromium's callback protocol for the supported browser range.
browser.runtime.onConnect.addListener(handleStoreConnection);
browser.runtime.onMessage.addListener(handleStoreMessage);
