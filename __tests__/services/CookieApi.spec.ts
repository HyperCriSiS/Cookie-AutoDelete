import { browserName } from '../../src/typings/Enums';
import {
  cookiePartitionDetails,
  getAllCookiesIncludingPartitions,
} from '../../src/services/CookieApi';
import { initialState } from '../../src/redux/State';

describe('CookieApi partition compatibility', () => {
  beforeEach(() => {
    global.browser.cookies.getAll.mockResolvedValue([] as never);
  });

  it('keeps the legacy query shape on Chromium before partitionKey support', async () => {
    const state = {
      ...initialState,
      cache: {
        ...initialState.cache,
        browserDetect: browserName.Chrome,
        browserVersion: 118,
      },
    } as State;

    await getAllCookiesIncludingPartitions(state, { storeId: '0' });

    expect(global.browser.cookies.getAll).toHaveBeenCalledWith({ storeId: '0' });
  });

  it('requests partitioned and unpartitioned cookies on supported Chromium', async () => {
    const state = {
      ...initialState,
      cache: {
        ...initialState.cache,
        browserDetect: browserName.Chrome,
        browserVersion: 119,
      },
    } as State;

    await getAllCookiesIncludingPartitions(state, { storeId: '0' });

    expect(global.browser.cookies.getAll).toHaveBeenCalledWith({
      partitionKey: {},
      storeId: '0',
    });
  });

  it('requests all partitions on supported Firefox', async () => {
    const state = {
      ...initialState,
      cache: {
        ...initialState.cache,
        browserDetect: browserName.Firefox,
        browserVersion: 115,
      },
    } as State;

    await getAllCookiesIncludingPartitions(state, {
      firstPartyDomain: 'example.com',
      storeId: 'firefox-default',
    });

    expect(global.browser.cookies.getAll).toHaveBeenCalledWith({
      firstPartyDomain: 'example.com',
      partitionKey: {},
      storeId: 'firefox-default',
    });
  });

  it('forwards a concrete partition key only when the cookie has one', () => {
    const unpartitioned = {
      domain: 'example.com',
    } as unknown as CadCookie;
    const partitioned = {
      domain: 'example.com',
      partitionKey: { topLevelSite: 'https://top.example' },
    } as unknown as CadCookie;

    expect(cookiePartitionDetails(unpartitioned)).toEqual({});
    expect(cookiePartitionDetails(partitioned)).toEqual({
      partitionKey: { topLevelSite: 'https://top.example' },
    });
  });
});
