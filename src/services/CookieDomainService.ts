/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Partition-aware domain cookie enumeration used by popup/badge code. The
 * legacy Libs helper remains available while older tests are migrated.
 */

import { getAllCookiesIncludingPartitions } from './CookieApi';
import {
  cadLog,
  createPartialTabInfo,
  extractMainDomain,
  getHostname,
  getSetting,
  isFirstPartyIsolate,
  returnOptionalCookieAPIAttributes,
} from './Libs';

export const getAllCookiesForDomainIncludingPartitions = async (
  state: State,
  tab: browser.tabs.Tab,
): Promise<browser.cookies.Cookie[] | undefined> => {
  if (!tab.url || tab.url === '') return;
  if (tab.url.startsWith('about:') || tab.url.startsWith('chrome:')) return;

  const debug = getSetting(state, SettingID.DEBUG_MODE) as boolean;
  const partialTabInfo = createPartialTabInfo(tab);
  const { cookieStoreId, url } = tab;
  const hostname = getHostname(url);

  if (hostname === '') {
    cadLog(
      {
        msg: 'CookieDomainService.getAllCookiesForDomainIncludingPartitions: hostname parsed empty for tab url.',
        x: { partialTabInfo, hostname },
      },
      debug,
    );
    return;
  }

  const cookies: browser.cookies.Cookie[] = [];
  const mainDomain = extractMainDomain(hostname);

  if (hostname.startsWith('file:')) {
    const allCookies = await getAllCookiesIncludingPartitions(
      state,
      returnOptionalCookieAPIAttributes(state, {
        storeId: cookieStoreId,
      }),
    );
    const regExp = new RegExp(hostname.slice(7));
    allCookies
      .filter((cookie) => cookie.domain === '' && regExp.test(cookie.path))
      .forEach((cookie) => cookies.push(cookie));
  } else if (await isFirstPartyIsolate()) {
    const cookiesFPI = await getAllCookiesIncludingPartitions(
      state,
      returnOptionalCookieAPIAttributes(state, {
        domain: hostname,
        firstPartyDomain: mainDomain,
        storeId: cookieStoreId,
      }),
    );
    cookiesFPI.forEach((cookie) => cookies.push(cookie));

    const siteURL = new URL(url);
    const proto = siteURL.protocol.replace(':', '');
    const cookiesFPIUseSite = await getAllCookiesIncludingPartitions(
      state,
      returnOptionalCookieAPIAttributes(state, {
        domain: hostname,
        firstPartyDomain: `(${proto},${mainDomain})`,
        storeId: cookieStoreId,
      }),
    );
    cookiesFPIUseSite.forEach((cookie) => cookies.push(cookie));

    if (siteURL.port) {
      const cookiesFPIUseSitePort = await getAllCookiesIncludingPartitions(
        state,
        returnOptionalCookieAPIAttributes(state, {
          domain: hostname,
          firstPartyDomain: `(${proto},${mainDomain},${siteURL.port})`,
          storeId: cookieStoreId,
        }),
      );
      cookiesFPIUseSitePort.forEach((cookie) => cookies.push(cookie));
    }
  } else {
    const cookiesDomain = await getAllCookiesIncludingPartitions(
      state,
      returnOptionalCookieAPIAttributes(state, {
        domain: hostname,
        storeId: cookieStoreId,
      }),
    );
    cookiesDomain.forEach((cookie) => cookies.push(cookie));
  }

  cadLog(
    {
      msg: 'CookieDomainService.getAllCookiesForDomainIncludingPartitions: filtered cookie count.',
      x: {
        partialTabInfo,
        tabURL: tab.url,
        hostname,
        cookieCount: cookies.length,
      },
    },
    debug,
  );

  return cookies;
};
