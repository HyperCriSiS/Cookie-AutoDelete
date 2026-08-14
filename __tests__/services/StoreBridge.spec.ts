import StoreUser from '../../src/services/StoreUser';
import {
  handleStoreConnection,
  handleStoreMessage,
  STORE_CONNECTION_NAME,
  STORE_DISPATCH,
  STORE_UPDATE_STATE,
} from '../../src/services/StoreBridge';

describe('StoreBridge', () => {
  const state = { cache: { browserDetect: browserName.Chrome } };
  const unsubscribe = jest.fn();
  const store = {
    dispatch: jest.fn(),
    getState: jest.fn(() => state),
    subscribe: jest.fn(() => unsubscribe),
  };

  beforeEach(() => {
    StoreUser.init(store as never);
  });

  it('responds to a state request after store readiness', async () => {
    const sendResponse = jest.fn();

    expect(
      handleStoreMessage(
        { type: STORE_UPDATE_STATE },
        undefined,
        sendResponse,
      ),
    ).toBe(true);

    await Promise.resolve();
    expect(sendResponse).toHaveBeenCalledWith(state);
  });

  it('dispatches the legacy wire-format action through the background store', async () => {
    const sendResponse = jest.fn();

    expect(
      handleStoreMessage(
        {
          type: STORE_DISPATCH,
          action: {
            type: ReduxConstants.UPDATE_SETTING,
            payload: { name: SettingID.ACTIVE_MODE, value: true },
          },
        },
        undefined,
        sendResponse,
      ),
    ).toBe(true);

    await Promise.resolve();
    expect(store.dispatch).toHaveBeenCalledWith({
      type: ReduxConstants.UPDATE_SETTING,
      payload: { name: SettingID.ACTIVE_MODE, value: true },
    });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('broadcasts state changes to a connected legacy UI port', async () => {
    let onDisconnect: (() => void) | undefined;
    const connection = {
      name: STORE_CONNECTION_NAME,
      onDisconnect: {
        addListener: jest.fn((listener: () => void) => {
          onDisconnect = listener;
        }),
      },
      postMessage: jest.fn(),
    };

    handleStoreConnection(connection as never);
    await Promise.resolve();

    expect(store.subscribe).toHaveBeenCalledTimes(1);
    const subscriber = store.subscribe.mock.calls[0][0];
    subscriber();
    expect(connection.postMessage).toHaveBeenCalledWith({
      type: STORE_UPDATE_STATE,
      data: state,
    });

    onDisconnect?.();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated messages and ports', () => {
    const sendResponse = jest.fn();
    expect(handleStoreMessage({ type: 'other' }, undefined, sendResponse)).toBe(
      false,
    );

    handleStoreConnection({
      name: 'other',
      onDisconnect: { addListener: jest.fn() },
      postMessage: jest.fn(),
    } as never);
    expect(store.subscribe).not.toHaveBeenCalled();
  });
});
