/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 */

import { Store } from 'redux';
import { initialState } from '../../src/redux/State';
import createStore from '../../src/redux/Store';
import { updateSetting } from '../../src/redux/Actions';
import DomainChangeEvents from '../../src/services/DomainChangeEvents';
import StoreUser from '../../src/services/StoreUser';
import TabEvents from '../../src/services/TabEvents';
import { ReduxAction } from '../../src/typings/ReduxConstants';

const store: Store<State, ReduxAction> = createStore(initialState);
StoreUser.init(store);

class TestStore extends StoreUser {
  public static changeSetting(
    name: SettingID,
    value: string | boolean | number,
  ) {
    StoreUser.store.dispatch(updateSetting({ name, value }));
  }
}

const makeTab = (url: string): browser.tabs.Tab =>
  ({
    active: true,
    discarded: false,
    hidden: false,
    highlighted: false,
    incognito: false,
    index: 0,
    pinned: false,
    status: 'complete',
    url,
    windowId: 1,
  } as browser.tabs.Tab);

describe('DomainChangeEvents', () => {
  const values: Record<string, unknown> = {};
  const session = {
    clear: jest.fn(),
    get: jest.fn(async (key: string) => ({ [key]: values[key] })),
    getBytesInUse: jest.fn(),
    remove: jest.fn(async (key: string) => {
      delete values[key];
    }),
    set: jest.fn(async (items: Record<string, unknown>) => {
      Object.assign(values, items);
    }),
  };
  const cleanup = jest
    .spyOn(TabEvents, 'cleanFromTabEvents')
    .mockResolvedValue(undefined);

  beforeAll(() => {
    (global.browser.storage as unknown as { session: typeof session }).session =
      session;
  });

  beforeEach(() => {
    Object.keys(values).forEach((key) => delete values[key]);
    jest.clearAllMocks();
    TestStore.changeSetting(SettingID.CLEAN_DOMAIN_CHANGE, false);
  });

  it('stores the first completed domain without cleaning', async () => {
    await DomainChangeEvents.onDomainChange(
      12,
      { status: 'complete' },
      makeTab('https://example.com/page'),
    );

    expect(values['cad-tab-domain-12']).toBe('example.com');
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('detects a domain change from session state after a worker restart', async () => {
    values['cad-tab-domain-12'] = 'example.com';
    TestStore.changeSetting(SettingID.CLEAN_DOMAIN_CHANGE, true);

    await DomainChangeEvents.onDomainChange(
      12,
      { status: 'complete' },
      makeTab('https://mozilla.org/'),
    );

    expect(values['cad-tab-domain-12']).toBe('mozilla.org');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('updates session state without cleaning when the feature is disabled', async () => {
    values['cad-tab-domain-12'] = 'example.com';

    await DomainChangeEvents.onDomainChange(
      12,
      { status: 'complete' },
      makeTab('https://mozilla.org/'),
    );

    expect(values['cad-tab-domain-12']).toBe('mozilla.org');
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('removes per-tab session state when the tab closes', async () => {
    values['cad-tab-domain-12'] = 'example.com';

    await DomainChangeEvents.onDomainChangeRemove(12, {
      isWindowClosing: false,
      windowId: 1,
    });

    expect(values['cad-tab-domain-12']).toBeUndefined();
    expect(session.remove).toHaveBeenCalledWith('cad-tab-domain-12');
  });
});
