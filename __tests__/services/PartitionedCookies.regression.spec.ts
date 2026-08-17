import { initialState } from '../../src/redux/State';
import { cleanCookies } from '../../src/services/CleanupService';

const baseCookie: CookiePropertiesCleanup = {
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

const cleanReason = (cookie: CookiePropertiesCleanup): CleanReasonObject => ({
  cached: false,
  cleanCookie: true,
  cookie,
  openTabStatus: OpenTabStatus.TabsWasNotIgnored,
  reason: ReasonClean.NoMatchedExpression,
});

describe('Partitioned cookie removal regressions', () => {
  beforeEach(() => {
    global.browser.cookies.remove.mockResolvedValue({} as never);
  });

  it('passes the exact cookie partition key to cookies.remove', async () => {
    const partitioned = {
      ...baseCookie,
      partitionKey: { topLevelSite: 'https://top.example' },
    };

    await cleanCookies(initialState, [cleanReason(partitioned)]);

    expect(global.browser.cookies.remove).toHaveBeenCalledWith({
      name: 'session',
      partitionKey: { topLevelSite: 'https://top.example' },
      storeId: '0',
      url: 'https://example.com/',
    });
  });

  it('does not send partitionKey for an unpartitioned cookie', async () => {
    await cleanCookies(initialState, [cleanReason(baseCookie)]);

    expect(global.browser.cookies.remove).toHaveBeenCalledWith({
      name: 'session',
      storeId: '0',
      url: 'https://example.com/',
    });
  });
});
