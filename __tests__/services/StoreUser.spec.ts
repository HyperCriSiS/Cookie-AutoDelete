describe('StoreUser readiness', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('resolves ready waiters when the store is initialized', async () => {
    const StoreUser = require('../../src/services/StoreUser').default;
    const fakeStore = { getState: jest.fn() };

    const waiting = StoreUser.ready();
    StoreUser.init(fakeStore);

    await expect(waiting).resolves.toBe(fakeStore);
    await expect(StoreUser.ready()).resolves.toBe(fakeStore);
  });

  it('defers wrapped handlers until initialization completes', async () => {
    const StoreUser = require('../../src/services/StoreUser').default;
    const fakeStore = { getState: jest.fn() };
    const handler = jest.fn((value: string) => `handled:${value}`);
    const wrapped = StoreUser.withStoreReady(handler);

    const result = wrapped('event');
    expect(handler).not.toHaveBeenCalled();

    StoreUser.init(fakeStore);

    await expect(result).resolves.toBe('handled:event');
    expect(handler).toHaveBeenCalledWith('event');
  });

  it('can attach the store without releasing events until markReady', async () => {
    const StoreUser = require('../../src/services/StoreUser').default;
    const fakeStore = { getState: jest.fn() };

    StoreUser.init(fakeStore, false);

    let resolved = false;
    const waiting = StoreUser.ready().then((store: unknown) => {
      resolved = true;
      return store;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    StoreUser.markReady();
    await expect(waiting).resolves.toBe(fakeStore);
  });

  it('rejects pending and future readiness requests after startup fails', async () => {
    const StoreUser = require('../../src/services/StoreUser').default;
    const failure = new Error('corrupt persisted state');

    const waiting = StoreUser.ready();
    StoreUser.markFailed(failure);

    await expect(waiting).rejects.toBe(failure);
    await expect(StoreUser.ready()).rejects.toBe(failure);
  });
});
