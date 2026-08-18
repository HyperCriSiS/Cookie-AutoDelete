/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Cookie API compatibility helpers for partitioned-cookie support. Older
 * Chromium versions remain on the legacy unpartitioned query shape, while
 * supported browsers request all partition keys explicitly.
 */

import { supportsPartitionedCookies } from './BrowserCapabilities';

type CookieQueryDetails = Partial<CookiePropertiesCleanup>;

export const getAllCookiesIncludingPartitions = (
  state: State,
  details: CookieQueryDetails,
): Promise<CadCookie[]> => {
  const query = supportsPartitionedCookies(state.cache)
    ? { ...details, partitionKey: {} }
    : details;

  return (browser.cookies.getAll as unknown as (
    queryDetails: CookieQueryDetails,
  ) => Promise<CadCookie[]>)(query);
};

export const cookiePartitionDetails = (
  cookie: CadCookie,
): { partitionKey: browser.cookies.CookiePartitionKey } | Record<string, never> => {
  const { partitionKey } = cookie;
  return partitionKey ? { partitionKey } : {};
};
