import {
  extractMainDomain,
  getMatchedExpressions,
  ipv6Prep,
  isAnIP,
  prepareCleanupDomains,
  prepareCookieDomain,
} from '../../src/services/Libs';

const expression = (value: string): Expression => ({
  expression: value,
  id: value,
  listType: ListType.WHITE,
  storeId: 'default',
});

const cookie = (domain: string): browser.cookies.Cookie =>
  ({
    domain,
    expirationDate: undefined,
    firstPartyDomain: undefined,
    hostOnly: true,
    httpOnly: false,
    name: 'session',
    path: '/',
    sameSite: 'no_restriction',
    secure: true,
    session: true,
    storeId: '0',
    value: 'value',
  } as browser.cookies.Cookie);

describe('IPv6 regression coverage', () => {
  it('normalizes URL-style IPv6 brackets only for parser input', () => {
    expect(ipv6Prep('[::1]')).toBe('::1');
    expect(ipv6Prep('[fd12:3456:7890:1::]/64')).toBe(
      'fd12:3456:7890:1::/64',
    );
    expect(ipv6Prep('::1')).toBeUndefined();
  });

  it('recognizes raw, bracketed and URL IPv6 addresses', () => {
    expect(isAnIP('::1')).toBe(true);
    expect(isAnIP('[::1]')).toBe(true);
    expect(isAnIP('https://[::1]/')).toBe(true);
    expect(isAnIP('127.0.0.1')).toBe(true);
    expect(isAnIP('file:///tmp/test.html')).toBe(false);
  });

  it('does not try to split IPv6 addresses as DNS domains', () => {
    expect(extractMainDomain('fd12:3456:789a:1::1')).toBe(
      'fd12:3456:789a:1::1',
    );
    expect(extractMainDomain('[fd12:3456:789a:1::1]')).toBe(
      '[fd12:3456:789a:1::1]',
    );
  });

  it('matches bracketed and unbracketed IPv6 expressions interchangeably', () => {
    const lists: StoreIdToExpressionList = {
      default: [
        expression('fd12:3456:789a:1::1'),
        expression('[fd12:3456:7890:1::]/64'),
      ],
    };

    expect(
      getMatchedExpressions(lists, 'default', '[fd12:3456:789a:1::1]'),
    ).toEqual([lists.default[0]]);
    expect(
      getMatchedExpressions(
        lists,
        'default',
        'fd12:3456:7890:1:5555::',
      ),
    ).toEqual([lists.default[1]]);
  });

  it('generates exactly one bracket pair for IPv6 cleanup targets', () => {
    expect(prepareCleanupDomains('::1', browserName.Firefox)).toEqual([
      '[::1]',
    ]);
    expect(prepareCleanupDomains('[::1]', browserName.Firefox)).toEqual([
      '[::1]',
    ]);
    expect(prepareCleanupDomains('[::1]', browserName.Chrome)).toEqual([
      'http://[::1]',
      'https://[::1]',
    ]);
    expect(prepareCleanupDomains('::1', browserName.EdgeChromium)).toEqual([
      'http://[::1]',
      'https://[::1]',
    ]);
  });

  it('generates valid cookies.remove URLs for either IPv6 cookie-domain form', () => {
    expect(prepareCookieDomain(cookie('::1'))).toBe('https://[::1]/');
    expect(prepareCookieDomain(cookie('[::1]'))).toBe('https://[::1]/');
  });
});
