import createUIStore from '../../src/redux/UIStore';
import {
  STORE_CONNECTION_NAME,
  STORE_UPDATE_STATE,
} from '../../src/redux/StoreProtocol';

describe('UIStore reconnect regression', () => {
  const initialState = {
    cache: { browserDetect: browserName.Chrome },
  } as unknown as State;
  const restartedState = {
    cache: { browserDetect: browserName.Firefox },
  } as unknown as State;

  let disconnectListener: (() => void) | undefined;
  let messageListener: ((message: unknown) => void) | undefined;

  const port = {
    onDisconnect: {
      addListener: jest.fn((listener: () => void) => {
        disconnectListener = listener;
      }),
    },
    onMessage: {
      addListener: jest.fn((listener: (message: unknown) => void) => {
        messageListener = listener;
      }),
    },
    postMessage: jest.fn(),
  };

  const flushMicrotasks = async () => {
    for (let index = 0; index < 10; index += 1) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    disconnectListener = undefined;
    messageListener = undefined;
    global.browser.runtime.connect.mockReturnValue(port as never);
    global.browser.runtime.sendMessage.mockResolvedValue(initialState as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reconnects and refreshes state after the background port is lost', async () => {
    const store = await createUIStore();

    expect(global.browser.runtime.connect).toHaveBeenCalledTimes(1);
    expect(global.browser.runtime.connect).toHaveBeenCalledWith({
      name: STORE_CONNECTION_NAME,
    });
    expect(store.getState()).toBe(initialState);

    global.browser.runtime.sendMessage.mockResolvedValue(restartedState as never);
    disconnectListener?.();

    jest.advanceTimersByTime(250);
    await flushMicrotasks();

    expect(global.browser.runtime.connect).toHaveBeenCalledTimes(2);
    expect(global.browser.runtime.sendMessage).toHaveBeenLastCalledWith({
      type: STORE_UPDATE_STATE,
    });
    expect(store.getState()).toBe(restartedState);

    messageListener?.({
      type: STORE_UPDATE_STATE,
      data: initialState,
    });
    expect(store.getState()).toBe(initialState);
  });
});
