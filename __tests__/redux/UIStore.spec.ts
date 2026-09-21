import { browserName, SettingID } from '../../src/typings/Enums';
import createUIStore from '../../src/redux/UIStore';
import {
  STORE_CONNECTION_NAME,
  STORE_DISPATCH,
  STORE_UPDATE_STATE,
} from '../../src/redux/StoreProtocol';
import { ReduxConstants } from '../../src/typings/ReduxConstants';

describe('UIStore', () => {
  const initialState = {
    cache: { browserDetect: browserName.Chrome },
  } as unknown as State;
  const updatedState = {
    cache: { browserDetect: browserName.Firefox },
  } as unknown as State;
  let onMessage: ((message: unknown) => void) | undefined;
  let onDisconnect: (() => void) | undefined;

  const port = {
    onDisconnect: {
      addListener: jest.fn((listener: () => void) => {
        onDisconnect = listener;
      }),
    },
    onMessage: {
      addListener: jest.fn((listener: (message: unknown) => void) => {
        onMessage = listener;
      }),
    },
    postMessage: jest.fn(),
  };

  beforeEach(() => {
    onMessage = undefined;
    onDisconnect = undefined;
    global.browser.runtime.connect.mockReturnValue(port as never);
    global.browser.runtime.sendMessage.mockResolvedValue(initialState as never);
  });

  it('loads initial state and opens the state-update port', async () => {
    const store = await createUIStore();

    expect(global.browser.runtime.connect).toHaveBeenCalledWith({
      name: STORE_CONNECTION_NAME,
    });
    expect(global.browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: STORE_UPDATE_STATE,
    });
    expect(store.getState()).toBe(initialState);
  });

  it('dispatches actions through the runtime bridge', async () => {
    const store = await createUIStore();
    const action = {
      type: ReduxConstants.UPDATE_SETTING,
      payload: { name: SettingID.ACTIVE_MODE, value: true },
    };

    expect(store.dispatch(action)).toBe(action);
    expect(global.browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: STORE_DISPATCH,
      action,
    });
  });

  it('applies pushed background state and notifies subscribers', async () => {
    const store = await createUIStore();
    const subscriber = jest.fn();
    store.subscribe(subscriber);

    onMessage?.({
      type: STORE_UPDATE_STATE,
      data: updatedState,
    });

    expect(store.getState()).toBe(updatedState);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('allows subscribers to unsubscribe', async () => {
    const store = await createUIStore();
    const subscriber = jest.fn();
    const unsubscribe = store.subscribe(subscriber);
    unsubscribe();

    onMessage?.({
      type: STORE_UPDATE_STATE,
      data: updatedState,
    });

    expect(subscriber).not.toHaveBeenCalled();
  });
});
