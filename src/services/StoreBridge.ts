/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Background-side compatibility bridge for the former redux-webext wire
 * protocol. It registers wake-up relevant runtime listeners immediately at
 * module load rather than after asynchronous state hydration.
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
import {
  STORE_CONNECTION_NAME,
  STORE_DISPATCH,
  STORE_UPDATE_STATE,
} from '../redux/StoreProtocol';
import { ReduxConstants } from '../typings/ReduxConstants';
import StoreUser from './StoreUser';

export {
  STORE_CONNECTION_NAME,
  STORE_DISPATCH,
  STORE_UPDATE_STATE,
} from '../redux/StoreProtocol';

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

export const handleStoreMessage = (
  message: BridgeMessage,
): Promise<unknown> | undefined => {
  if (message.type === STORE_UPDATE_STATE) {
    return StoreUser.ready().then((store) => store.getState());
  }

  if (message.type === STORE_DISPATCH && message.action) {
    return StoreUser.ready().then((store) => {
      const { type, ...actionData } = message.action as NonNullable<
        BridgeMessage['action']
      >;
      const actionCreator = actions[type];
      if (!actionCreator) {
        console.error(
          `Background store bridge does not contain action "${type}".`,
        );
        return undefined;
      }

      const payload = actionData.payload;
      store.dispatch<any>(
        actionCreator(Object.keys(actionData).length ? payload : undefined),
      );
      return { ok: true };
    });
  }

  // Important for runtime.onMessage: returning a Promise would claim unrelated
  // messages and could prevent another listener from responding to them.
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

browser.runtime.onConnect.addListener(handleStoreConnection);
// Older web-ext typings do not model Promise-returning onMessage listeners
// consistently. browser-polyfill supports this runtime contract.
browser.runtime.onMessage.addListener(handleStoreMessage as any);
