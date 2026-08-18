import { ListType } from '../../src/typings/Enums';
import createUIStore from '../../src/redux/UIStore';
import { getMatchedExpressions } from '../../src/services/Libs';
import {
  STORE_CONNECTION_NAME,
  STORE_UPDATE_STATE,
} from '../../src/redux/StoreProtocol';

describe('UIStore expression matching compatibility', () => {
  let onMessage: ((message: unknown) => void) | undefined;

  const port = {
    onDisconnect: {
      addListener: jest.fn(),
    },
    onMessage: {
      addListener: jest.fn((listener: (message: unknown) => void) => {
        onMessage = listener;
      }),
    },
    postMessage: jest.fn(),
  };

  const defaultWhite: Expression = {
    expression: '*.example.com',
    listType: ListType.WHITE,
    storeId: 'default',
  };
  const defaultGrey: Expression = {
    expression: 'temporary.example.net',
    listType: ListType.GREY,
    storeId: 'default',
  };
  const containerWhite: Expression = {
    expression: '*.container.example.org',
    listType: ListType.WHITE,
    storeId: 'firefox-container-1',
  };

  const backgroundState = {
    lists: {
      default: [defaultWhite, defaultGrey],
      'firefox-container-1': [containerWhite],
    },
  } as unknown as State;

  beforeEach(() => {
    onMessage = undefined;
    global.browser.runtime.connect.mockReturnValue(port as never);
    global.browser.runtime.sendMessage.mockResolvedValue(backgroundState as never);
  });

  it('matches allowlist and greylist rules from the bridged background state', async () => {
    const store = await createUIStore();

    expect(global.browser.runtime.connect).toHaveBeenCalledWith({
      name: STORE_CONNECTION_NAME,
    });
    expect(global.browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: STORE_UPDATE_STATE,
    });

    expect(
      getMatchedExpressions(store.getState().lists, 'default', 'sub.example.com'),
    ).toEqual([defaultWhite]);
    expect(
      getMatchedExpressions(
        store.getState().lists,
        'default',
        'temporary.example.net',
      ),
    ).toEqual([defaultGrey]);
  });

  it('keeps expression matching isolated by Firefox container store id', async () => {
    const store = await createUIStore();

    expect(
      getMatchedExpressions(
        store.getState().lists,
        'firefox-container-1',
        'app.container.example.org',
      ),
    ).toEqual([containerWhite]);
    expect(
      getMatchedExpressions(
        store.getState().lists,
        'default',
        'app.container.example.org',
      ),
    ).toEqual([]);
  });

  it('preserves matching semantics when background state is pushed after startup', async () => {
    const store = await createUIStore();
    const pushedGrey: Expression = {
      expression: '*.session.example.io',
      listType: ListType.GREY,
      storeId: 'default',
    };
    const pushedState = {
      ...backgroundState,
      lists: {
        ...backgroundState.lists,
        default: [...backgroundState.lists.default, pushedGrey],
      },
    } as State;

    onMessage?.({
      type: STORE_UPDATE_STATE,
      data: pushedState,
    });

    expect(store.getState()).toBe(pushedState);
    expect(
      getMatchedExpressions(
        store.getState().lists,
        'default',
        'api.session.example.io',
      ),
    ).toEqual([pushedGrey]);
  });
});
