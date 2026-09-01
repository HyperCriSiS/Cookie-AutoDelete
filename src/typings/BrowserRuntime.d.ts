/// <reference types="firefox-webext-browser" />

/**
 * TypeScript 7 with bundler module resolution keeps the Firefox WebExtension
 * declaration namespaces but does not expose a global runtime `browser` value.
 *
 * Keep the maintained Firefox declarations as the source of truth and derive
 * the runtime surface CAD uses from those namespaces. The explicit type
 * reference prevents module-resolution changes from dropping the ambient base.
 */
type CadBrowserRuntime = {
  tabs: typeof browser.tabs;
  runtime: typeof browser.runtime;
  cookies: typeof browser.cookies;
  storage: typeof browser.storage;
  browsingData: typeof browser.browsingData;
  contextualIdentities: typeof browser.contextualIdentities;
  notifications: typeof browser.notifications;
  alarms: typeof browser.alarms;
  commands: typeof browser.commands;
  management: typeof browser.management;
  permissions: typeof browser.permissions;
  windows: typeof browser.windows;
  i18n: typeof browser.i18n;
  contextMenus: typeof browser.contextMenus;
  sessions: typeof browser.sessions;
  browserAction: typeof browser.browserAction;
  extension: typeof browser.extension;
};

declare const browser: CadBrowserRuntime;
