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
});
