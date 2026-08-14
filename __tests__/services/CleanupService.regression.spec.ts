import { when } from 'jest-when';

import { initialState } from '../../src/redux/State';
import {
  cleanCookies,
  cleanCookiesOperation,
  clearSiteDataForThisDomain,
  filterSiteData,
} from '../../src/services/CleanupService';

const mockCookie: CookiePropertiesCleanup = {
  domain: 'example.com',
  hostOnly: true,
  hostname: 'example.com',
  httpOnly: false,
  mainDomain: 'example.com',
  name: 'session',
  path: '/',
  preparedCookieDomain: 'https://example.com/',
  sameSite: 'no_restriction',
  secure: true,
  session: true,
  storeId: '0',
  value: 'value',
};

const cleanReason: CleanReasonObject = {
  cached: false,
  cleanCookie: true,
  cookie: mockCookie,
  openTabStatus: OpenTabStatus.TabsWasNotIgnored,
  reason: ReasonClean.NoMatchedExpression,
};

describe('CleanupService regressions', () => {
  it('treats a null cookies.remove result as not removed', async () => {
    when(global.browser.cookies.remove)
      .calledWith(expect.any(Object))
      .mockResolvedValue(null as never);

    await expect(cleanCookies(initialState, [cleanReason])).resolves.toEqual([]);
  });

  it('does not count null cookie-removal results in cleanup totals', async () => {
    const chromeState: State = {
      ...initialState,
      cache: {
        ...initialState.cache,
        browserDetect: browserName.Chrome,
      },
    };

    when(global.browser.tabs.query)
      .calledWith({ windowType: 'normal' })
      .mockResolvedValue([] as never);
    when(global.browser.extension.isAllowedIncognitoAccess)
      .calledWith()
      .mockResolvedValue(false as never);
    when(global.browser.cookies.getAllCookieStores)
      .calledWith()
      .mockResolvedValue([{ id: '0' }] as never);
    when(global.browser.cookies.getAll)
      .calledWith({ storeId: '0' })
      .mockResolvedValue([mockCookie] as never);
    when(global.browser.cookies.remove)
      .calledWith(expect.any(Object))
      .mockResolvedValue(null as never);

    const result = await cleanCookiesOperation(chromeState);

    expect(result.cachedResults.recentlyCleaned).toBe(0);
    expect(result.cachedResults.storeIds).toEqual({});
    expect(result.setOfDeletedDomainCookies).toEqual([]);
  });

  it('propagates a failed manual site-data cleanup as false', async () => {
    when(global.browser.browsingData.remove)
      .calledWith(expect.any(Object), expect.any(Object))
      .mockRejectedValue(new Error('cleanup failed') as never);

    await expect(
      clearSiteDataForThisDomain(
        initialState,
        SiteDataType.CACHE,
        'example.com',
      ),
    ).resolves.toBe(false);
  });

  it('does not misclassify unrelated cleanup reasons as CAD site-data cookies', () => {
    const expiredReason: CleanReasonObject = {
      ...cleanReason,
      reason: ReasonClean.ExpiredCookie,
    };

    expect(filterSiteData(expiredReason, SiteDataType.CACHE)).toBe(false);
  });
});
