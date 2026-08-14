import { initialState } from '../../src/redux/State';
import { getAllCookiesForDomainIncludingPartitions } from '../../src/services/CookieDomainService';

const tab = {
  cookieStoreId: '0',
  url: 'https://example.com/path',
} as browser.tabs.Tab;

const chromeState = (version: number): State =>
  ({
    ...initialState,
    cache: {
      ...initialState.cache,
      browserDetect: browserName.Chrome,
      browserVersion: version,
    },
  } as State);

describe('CookieDomainService partition compatibility', () => {
  beforeEach(() => {
    global.browser.cookies.getAll.mockResolvedValue([] as never);
  });

  it('keeps domain enumeration compatible with Chromium 118', async () => {
    await getAllCookiesForDomainIncludingPartitions(chromeState(118), tab);

    expect(global.browser.cookies.getAll).toHaveBeenLastCalledWith({
      domain: 'example.com',
      storeId: '0',
    });
  });

  it('includes all cookie partitions from Chromium 119 onward', async () => {
    await getAllCookiesForDomainIncludingPartitions(chromeState(119), tab);

    expect(global.browser.cookies.getAll).toHaveBeenLastCalledWith({
      domain: 'example.com',
      partitionKey: {},
      storeId: '0',
    });
  });
});
