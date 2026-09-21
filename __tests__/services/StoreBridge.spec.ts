import { browserName, SettingID } from '../../src/typings/Enums';
import StoreUser from '../../src/services/StoreUser';
import {
  handleStoreConnection,
  handleStoreMessage,
  STORE_CONNECTION_NAME,
  STORE_DISPATCH,
  STORE_UPDATE_STATE,
} from '../../src/services/StoreBridge';
import { ReduxConstants } from '../../src/typings/ReduxConstants';

describe('StoreBridge', () => {
  const state = { cache: { browserDetect: browserName.Chrome } };
  const unsubscribe = jest.fn();
  const store = {
    dispatch: jest.fn(),
    getState: jest.fn(() => state),
    subscribe: jest.fn((_listener: () => void) => unsubscribe),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    StoreUser.init(store as never);
  });

  it('responds to a state request after store readiness', async () => {
    await expect(
      handleStoreMessage({ type: STORE_UPDATE_STATE }),
    ).resolves.toBe(state);
  });

  it('dispatches the legacy wire-format action through the background store', async () => {
    await expect(
      handleStoreMessage({
        type: STORE_DISPATCH,
        action: {
          type: ReduxConstants.UPDATE_SETTING,
          payload: { name: SettingID.ACTIVE_MODE, value: true },
        },
      }),
    ).resolves.toEqual({ ok: true });

    expect(store.dispatch).toHaveBeenCalledWith({
      type: ReduxConstants.UPDATE_SETTING,
      payload: { name: SettingID.ACTIVE_MODE, value: true },
    });
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

  it('does not claim unrelated runtime messages or ports', () => {
    expect(handleStoreMessage({ type: 'other' })).toBeUndefined();

    handleStoreConnection({
      name: 'other',
      onDisconnect: { addListener: jest.fn() },
      postMessage: jest.fn(),
    } as never);
    expect(store.subscribe).not.toHaveBeenCalled();
  });
});
