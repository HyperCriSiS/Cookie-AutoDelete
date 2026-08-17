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

import { combineReducers } from 'redux';
import { generateId } from '../services/IdService';
import { ReduxAction, ReduxConstants } from '../typings/ReduxConstants';
import { initialState } from './State';

const newExpressionObject = (
  action: ReduxAction,
  state: Expression[],
): Expression => ({
  ...action.payload,
  cleanAllCookies:
    action.payload.cleanAllCookies === undefined
      ? true
      : action.payload.cleanAllCookies,
  cleanSiteData: !action.payload.cleanSiteData
    ? []
    : action.payload.cleanSiteData,
  // Preserve IDs from imports/updates. Generate a new one only for genuinely
  // new expressions that do not already carry an ID.
  id: action.payload.id || generateId(),
  listType: !action.payload.listType ? ListType.WHITE : action.payload.listType,
});

export const expressions = (
  state: Expression[] = [],
  action: ReduxAction,
): Expression[] => {
  switch (action.type) {
    case ReduxConstants.ADD_EXPRESSION:
      return [...state, newExpressionObject(action, state)];

    case ReduxConstants.UPDATE_EXPRESSION:
      return state.map((e) =>
        e.id === action.payload.id ? newExpressionObject(action, state) : e,
      );

    case ReduxConstants.REMOVE_EXPRESSION:
      return state.filter((e) => e.id !== action.payload.id);

    case ReduxConstants.CLEAR_EXPRESSIONS:
    case ReduxConstants.RESET_ALL:
      return [];

    default:
      return state;
  }
};

export const lists = (
  state: StoreIdToExpressionList = initialState.lists,
  action: ReduxAction,
): StoreIdToExpressionList => {
  switch (action.type) {
    case ReduxConstants.ADD_EXPRESSION:
    case ReduxConstants.UPDATE_EXPRESSION: {
      const storeId = action.payload.storeId || 'default';
      return {
        ...state,
        [storeId]: expressions(state[storeId], action),
      };
    }

    case ReduxConstants.REMOVE_EXPRESSION: {
      const storeId = action.payload.storeId || 'default';
      return {
        ...state,
        [storeId]: expressions(state[storeId], action),
      };
    }

    case ReduxConstants.REMOVE_LIST: {
      const newState = { ...state };
      delete newState[action.payload];
      return newState;
    }

    case ReduxConstants.CLEAR_EXPRESSIONS:
    case ReduxConstants.RESET_ALL:
      return initialState.lists;

    default:
      return state;
  }
};

export const settings = (
  state: MapToSettingObject = initialState.settings,
  action: ReduxAction,
): MapToSettingObject => {
  switch (action.type) {
    case ReduxConstants.UPDATE_SETTING:
      return {
        ...state,
        [action.payload.name]: {
          ...state[action.payload.name],
          value: action.payload.value,
        },
      };

    case ReduxConstants.RESET_SETTINGS:
    case ReduxConstants.RESET_ALL:
      return initialState.settings;

    default:
      return state;
  }
};

export const cookieDeletedCounterTotal = (
  state: number = initialState.cookieDeletedCounterTotal,
  action: ReduxAction,
): number => {
  switch (action.type) {
    case ReduxConstants.ADD_COOKIE_DELETED_COUNTER:
      return state + action.payload;

    case ReduxConstants.RESET_COOKIE_DELETED_COUNTER:
    case ReduxConstants.RESET_ALL:
      return 0;

    default:
      return state;
  }
};

export const cookieDeletedCounterSession = (
  state: number = initialState.cookieDeletedCounterSession,
  action: ReduxAction,
): number => {
  switch (action.type) {
    case ReduxConstants.ADD_COOKIE_DELETED_COUNTER:
      return state + action.payload;

    case ReduxConstants.ON_STARTUP:
    case ReduxConstants.RESET_ALL:
      return 0;

    default:
      return state;
  }
};

export const activityLog = (
  state: ActivityLog[] = [],
  action: ReduxAction,
): ActivityLog[] => {
  switch (action.type) {
    case ReduxConstants.ADD_ACTIVITY_LOG:
      return [...state, action.payload];

    case ReduxConstants.REMOVE_ACTIVITY_LOG:
      return state.filter((log) => log.dateTime !== action.payload.dateTime);

    case ReduxConstants.RESET_ALL:
    case ReduxConstants.CLEAR_ACTIVITY_LOG:
      return [];
    default:
      return state;
  }
};

export const cache = (
  state: CacheMap = {},
  action: ReduxAction,
): Record<string, any> => {
  switch (action.type) {
    case ReduxConstants.ADD_CACHE: {
      const newCacheObject = {
        ...state,
      };
      newCacheObject[`${action.payload.key}`] = action.payload.value;
      return newCacheObject;
    }

    case ReduxConstants.RESET_ALL:
      return {};

    default:
      return state;
  }
};

// Redux 5 infers the combined state and action types from the reducer map;
// combineReducers no longer accepts the legacy <State, ReduxAction> pair.
export default combineReducers({
  activityLog,
  cache,
  cookieDeletedCounterSession,
  cookieDeletedCounterTotal,
  lists,
  settings,
});
