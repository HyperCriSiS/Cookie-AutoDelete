/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT
 * (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 *
 * Small compatibility layer for browser APIs whose names differ between
 * Manifest V2 and Manifest V3.
 */

type ActionApi = typeof browser.browserAction;
type BrowserWithAction = typeof browser & {
  action?: ActionApi;
  browserAction?: ActionApi;
};
type ChromeWithAction = {
  action?: ActionApi;
  browserAction?: ActionApi;
};

const browserWithAction = browser as BrowserWithAction;
const chromeWithAction =
  typeof chrome !== 'undefined'
    ? (chrome as unknown as ChromeWithAction)
    : undefined;

export const actionApi = (
  browserWithAction.action ||
  chromeWithAction?.action ||
  browserWithAction.browserAction ||
  chromeWithAction?.browserAction
) as ActionApi;
