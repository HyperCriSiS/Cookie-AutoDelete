import StatePersistence from '../../src/services/StatePersistence';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};

describe('StatePersistence', () => {
  it('starts a storage write immediately without a timer', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const persistence = new StatePersistence(writer);

    persistence.save({ lists: { default: ['example.com'] } });

    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith({
      state: JSON.stringify({ lists: { default: ['example.com'] } }),
    });
    await persistence.whenIdle();
  });

  it('serializes writes and coalesces queued state to the newest snapshot', async () => {
    const firstWrite = deferred();
    const writer = jest
      .fn()
      .mockImplementationOnce(() => firstWrite.promise)
      .mockResolvedValue(undefined);
    const persistence = new StatePersistence(writer);

    persistence.save({ revision: 1 });
    persistence.save({ revision: 2 });
    persistence.save({ revision: 3 });

    expect(writer).toHaveBeenCalledTimes(1);

    firstWrite.resolve();
    await persistence.whenIdle();

    expect(writer).toHaveBeenCalledTimes(2);
    expect(writer).toHaveBeenNthCalledWith(1, {
      state: JSON.stringify({ revision: 1 }),
    });
    expect(writer).toHaveBeenNthCalledWith(2, {
      state: JSON.stringify({ revision: 3 }),
    });
  });

  it('reports write failures and continues with newer pending state', async () => {
    const firstWrite = deferred();
    const failure = new Error('storage write failed');
    const writer = jest
      .fn()
      .mockImplementationOnce(() => firstWrite.promise)
      .mockResolvedValue(undefined);
    const onError = jest.fn();
    const persistence = new StatePersistence(writer, onError);

    persistence.save({ revision: 1 });
    persistence.save({ revision: 2 });

    firstWrite.reject(failure);
    await persistence.whenIdle();

    expect(onError).toHaveBeenCalledWith(failure);
    expect(writer).toHaveBeenCalledTimes(2);
    expect(writer).toHaveBeenLastCalledWith({
      state: JSON.stringify({ revision: 2 }),
    });
  });
});
