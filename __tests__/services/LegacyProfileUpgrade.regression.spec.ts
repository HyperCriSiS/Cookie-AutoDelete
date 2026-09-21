/**
 * Regression coverage for representative persisted legacy profiles.
 */

import { browserName, SettingID } from '../../src/typings/Enums';
import { validateSettings } from '../../src/redux/Actions';
import { initialState } from '../../src/redux/State';
// tslint:disable-next-line: import-name
import createStore from '../../src/redux/Store';
import { ReduxConstants } from '../../src/typings/ReduxConstants';

describe.each([
  ['Firefox', browserName.Firefox],
  ['Chromium', browserName.Chrome],
])('legacy profile upgrade compatibility: %s', (_label, detectedBrowser) => {
  it('restores later settings without overwriting existing user values', () => {
    const legacySettings = { ...initialState.settings };

    // Representative user-customized values that must survive normalization.
    legacySettings[SettingID.CLEAN_DELAY] = {
      ...initialState.settings[SettingID.CLEAN_DELAY],
      value: 73,
    };
    legacySettings[SettingID.NOTIFY_DURATION] = {
      ...initialState.settings[SettingID.NOTIFY_DURATION],
      value: 19,
    };

    // Simulate settings introduced after the persisted profile was created.
    delete legacySettings[SettingID.CLEANUP_CACHE];
    delete legacySettings[SettingID.CONTEXTUAL_IDENTITIES];
    delete legacySettings[SettingID.CONTEXT_MENUS];

    const store = createStore({
      ...initialState,
      settings: legacySettings,
    });
    store.dispatch({
      type: ReduxConstants.ADD_CACHE,
      payload: { key: 'browserDetect', value: detectedBrowser },
    });
    store.dispatch({
      type: ReduxConstants.ADD_CACHE,
      payload: { key: 'browserVersion', value: 140 },
    });
    store.dispatch({
      type: ReduxConstants.ADD_CACHE,
      payload: { key: 'platformOs', value: 'linux' },
    });

    store.dispatch(validateSettings());

    const upgraded = store.getState().settings;
    expect(upgraded[SettingID.CLEAN_DELAY].value).toBe(73);
    expect(upgraded[SettingID.NOTIFY_DURATION].value).toBe(19);
    expect(upgraded[SettingID.CLEANUP_CACHE]).toEqual(
      initialState.settings[SettingID.CLEANUP_CACHE],
    );
    expect(upgraded[SettingID.CONTEXT_MENUS]).toEqual(
      initialState.settings[SettingID.CONTEXT_MENUS],
    );

    if (detectedBrowser === browserName.Chrome) {
      // Chrome intentionally disables the unsupported containers option.
      expect(upgraded[SettingID.CONTEXTUAL_IDENTITIES].value).toBe(false);
    } else {
      expect(upgraded[SettingID.CONTEXTUAL_IDENTITIES]).toEqual(
        initialState.settings[SettingID.CONTEXTUAL_IDENTITIES],
      );
    }

    expect(Object.keys(upgraded).sort()).toEqual(
      Object.keys(initialState.settings).sort(),
    );
  });

  it('repairs an older setting shape while retaining its persisted value', () => {
    const legacySettings = { ...initialState.settings };
    legacySettings[SettingID.CLEAN_DELAY] = {
      name: SettingID.CLEAN_DELAY,
      value: 37,
    } as any;

    const store = createStore({
      ...initialState,
      settings: legacySettings,
    });
    store.dispatch({
      type: ReduxConstants.ADD_CACHE,
      payload: { key: 'browserDetect', value: detectedBrowser },
    });
    store.dispatch({
      type: ReduxConstants.ADD_CACHE,
      payload: { key: 'browserVersion', value: 140 },
    });
    store.dispatch({
      type: ReduxConstants.ADD_CACHE,
      payload: { key: 'platformOs', value: 'linux' },
    });

    store.dispatch(validateSettings());

    expect(store.getState().settings[SettingID.CLEAN_DELAY]).toEqual({
      ...initialState.settings[SettingID.CLEAN_DELAY],
      value: 37,
    });
  });
});
