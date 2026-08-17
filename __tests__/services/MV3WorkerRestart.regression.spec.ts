/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 */

const makeTab = (url: string): browser.tabs.Tab => ({
  active: true,
  discarded: false,
  hidden: false,
  highlighted: false,
  incognito: false,
  index: 0,
  isArticle: false,
  isInReaderMode: false,
  lastAccessed: 0,
  pinned: false,
  selected: false,
  status: 'complete',
  url,
  windowId: 1,
});

const loadFreshWorker = async () => {
  jest.resetModules();

  const { default: createStore } = await import('../../src/redux/Store');
  const { initialState } = await import('../../src/redux/State');
  const { updateSetting } = await import('../../src/redux/Actions');
  const { default: StoreUser } = await import('../../src/services/StoreUser');
  const { default: DomainChangeEvents } = await import(
    '../../src/services/DomainChangeEvents'
  );
  const { default: TabEvents } = await import('../../src/services/TabEvents');

  const store = createStore(initialState);
  StoreUser.init(store);

  return {
    DomainChangeEvents,
    TabEvents,
    store,
    updateSetting,
  };
};

describe('MV3 worker restart regression', () => {
  const values: Record<string, unknown> = {};
  const session = {
    clear: jest.fn(async () => {
      Object.keys(values).forEach((key) => delete values[key]);
    }),
    get: jest.fn(async (key: string) => ({ [key]: values[key] })),
    getBytesInUse: jest.fn(),
    remove: jest.fn(async (key: string) => {
      delete values[key];
    }),
    set: jest.fn(async (items: Record<string, unknown>) => {
      Object.assign(values, items);
    }),
  };

  beforeAll(() => {
    (global.browser.storage as unknown as { session: typeof session }).session =
      session;
  });

  beforeEach(() => {
    Object.keys(values).forEach((key) => delete values[key]);
    jest.clearAllMocks();
  });

  it('restores session-backed domain state after the worker module graph is discarded', async () => {
    const firstWorker = await loadFreshWorker();
    firstWorker.store.dispatch(
      firstWorker.updateSetting({
        name: SettingID.CLEAN_DOMAIN_CHANGE,
        value: true,
      }),
    );
    const firstCleanup = jest
      .spyOn(firstWorker.TabEvents, 'cleanFromTabEvents')
      .mockResolvedValue(undefined);

    await firstWorker.DomainChangeEvents.onDomainChange(
      12,
      { status: 'complete' },
      makeTab('https://example.com/page'),
    );

    expect(values['cad-tab-domain-12']).toBe('example.com');
    expect(firstCleanup).not.toHaveBeenCalled();

    // A suspended MV3 service worker loses all module/static memory. Reload the
    // entire module graph while keeping browser.storage.session intact.
    const restartedWorker = await loadFreshWorker();
    restartedWorker.store.dispatch(
      restartedWorker.updateSetting({
        name: SettingID.CLEAN_DOMAIN_CHANGE,
        value: true,
      }),
    );
    const restartedCleanup = jest
      .spyOn(restartedWorker.TabEvents, 'cleanFromTabEvents')
      .mockResolvedValue(undefined);

    await restartedWorker.DomainChangeEvents.onDomainChange(
      12,
      { status: 'complete' },
      makeTab('https://mozilla.org/'),
    );

    expect(values['cad-tab-domain-12']).toBe('mozilla.org');
    expect(restartedCleanup).toHaveBeenCalledTimes(1);
  });
});
