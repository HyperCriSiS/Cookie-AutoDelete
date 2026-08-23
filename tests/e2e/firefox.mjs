import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import {
  assertCleaned,
  assertRetained,
  assertSeeded,
  createReporter,
  sleep,
} from './lib/assertions.mjs';
import { startTestSite } from './lib/test-site.mjs';

const xpiPath = path.resolve(process.argv[2] || process.env.CAD_E2E_FIREFOX_XPI || '');
if (!xpiPath || !(await fs.stat(xpiPath).catch(() => false))) {
  throw new Error('Usage: node tests/e2e/firefox.mjs <Firefox XPI path>');
}

const addonId = 'CookieAutoDelete@kennydo.com';
let extensionUuid = '2d6ffdb7-5310-4b78-9d0b-2d0d2ac6e2e1';
const cleanupDelayMs = 2600;
const reporter = createReporter('firefox');
const site = await startTestSite();
let driver;
let controlHandle;
let browserVersion = 'unknown';

const options = new firefox.Options();
options.addArguments('-headless');
if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
options.setPreference(
  'extensions.webextensions.uuids',
  JSON.stringify({ [addonId]: extensionUuid }),
);
options.setPreference('browser.shell.checkDefaultBrowser', false);
options.setPreference('browser.startup.page', 0);
options.setPreference('datareporting.policy.dataSubmissionEnabled', false);

const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
const extensionRoot = () => `moz-extension://${extensionUuid}/settings/settings.html`;

const resolveExtensionUuid = async () => {
  await driver.setContext(firefox.Context.CHROME);
  try {
    const raw = await driver.executeScript(
      `return Services.prefs.getStringPref('extensions.webextensions.uuids', '{}');`,
    );
    const mapping = JSON.parse(String(raw || '{}'));
    if (mapping[addonId]) extensionUuid = mapping[addonId];
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
};

const navigateExtension = async () => {
  // WebDriver navigation itself is content-context-only, while Firefox blocks
  // direct content-context navigation to moz-extension:// pages. With
  // geckodriver --allow-system-access we ask the browser UI process to load the
  // extension URL and verify the browser chrome reached that exact URL before
  // returning to normal content-context DOM automation.
  const target = extensionRoot();
  await driver.setContext(firefox.Context.CHROME);
  try {
    await driver.executeScript(
      `const target = arguments[0];
       const principal = Services.scriptSecurityManager.getSystemPrincipal();
       window.gBrowser.selectedBrowser.loadURI(Services.io.newURI(target), { triggeringPrincipal: principal });`,
      target,
    );
    await driver.wait(
      async () => driver.executeScript(
        `return window.gBrowser.selectedBrowser.currentURI?.spec || '';`,
      ).then((url) => String(url).startsWith(target)),
      10000,
    );
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
  await driver.wait(async () => (await driver.getCurrentUrl()).startsWith(target), 10000);
};

const waitForElement = async (id) => driver.wait(until.elementLocated(By.id(id)), 10000);

const openExtensionTab = async (tabId, readyId) => {
  await navigateExtension();
  const tab = await waitForElement(tabId);
  await driver.wait(until.elementIsVisible(tab), 10000);
  await tab.click();
  if (readyId) {
    const ready = await waitForElement(readyId);
    await driver.wait(until.elementIsVisible(ready), 10000);
  }
};

const setCheckbox = async (id, wanted) => {
  const element = await waitForElement(id);
  const current = (await element.getAttribute('aria-checked')) === 'true';
  if (current !== wanted) {
    await element.click();
    await driver.wait(async () => (await (await driver.findElement(By.id(id))).getAttribute('aria-checked')) === String(wanted), 10000);
  }
};

const openSettings = async () => openExtensionTab('tabSettings', 'activeMode');

const configure = async () => {
  await openSettings();
  await setCheckbox('activeMode', true);
  await setCheckbox('domainChangeCleanup', true);
  await setCheckbox('cacheCleanup', true);
  await setCheckbox('indexedDBCleanup', true);
  await setCheckbox('localStorageCleanup', true);
  await setCheckbox('serviceWorkersCleanup', true);
  await setCheckbox('showNotificationAfterCleanup', false);
  await setCheckbox('manualNotifications', false);
  const delay = await waitForElement('delayBeforeClean');
  await delay.click();
  await delay.sendKeys(Key.chord(Key.CONTROL, 'a'));
  await delay.sendKeys('1', Key.TAB);
  await driver.wait(async () => (await delay.getAttribute('value')) === '1', 5000);
  await sleep(300);
};

const addExpression = async (host, grey = false) => {
  await openExtensionTab('tabExpressionList', 'formText');
  const input = await waitForElement('formText');
  await input.clear();
  if (grey) {
    await input.sendKeys(host, Key.chord(Key.SHIFT, Key.ENTER));
  } else {
    await input.sendKeys(host, Key.ENTER);
  }
  await driver.wait(async () => (await input.getAttribute('value')) === '', 10000);
  assert.ok((await driver.findElement(By.css('body')).getText()).includes(host), `${host} was not rendered in the Firefox expression list`);
};

const openSiteTab = async (origin) => {
  await driver.switchTo().newWindow('tab');
  const handle = await driver.getWindowHandle();
  await driver.get(origin + '/');
  await driver.wait(async () => driver.executeScript('return typeof window.cadE2E?.inspect === "function";'), 10000);
  return handle;
};

const runSiteAsync = async (method, token) => {
  const result = await driver.executeAsyncScript(
    `const method = arguments[0];
     const token = arguments[1];
     const done = arguments[arguments.length - 1];
     Promise.resolve(token === null ? window.cadE2E[method]() : window.cadE2E[method](token))
       .then((value) => done({ ok: true, value }))
       .catch((error) => done({ ok: false, error: String(error && (error.stack || error.message) || error) }));`,
    method,
    token ?? null,
  );
  if (!result.ok) throw new Error(`Test-site ${method} failed: ${result.error}`);
  return result.value;
};

const seed = (token) => runSiteAsync('seed', token);
const inspect = () => runSiteAsync('inspect', null);
const fetchCached = (token) => runSiteAsync('fetchCache', token);

const closeSiteAndReturn = async () => {
  await driver.close();
  await driver.switchTo().window(controlHandle);
};

const inspectOrigin = async (origin) => {
  await openSiteTab(origin);
  return inspect();
};

const verifyCacheBaseline = (token, label) => {
  assert.equal(site.hits(token), 1, `${label}: the controlled HTTP response was not cached before cleanup`);
};
const verifyCacheCleaned = async (token, label) => {
  await fetchCached(token);
  assert.equal(site.hits(token), 2, `${label}: browser HTTP cache survived Cookie AutoDelete cleanup`);
};
const verifyCacheRetained = async (token, label) => {
  await fetchCached(token);
  assert.equal(site.hits(token), 1, `${label}: browser HTTP cache was removed unexpectedly`);
};

const screenshotFailure = async () => {
  if (!driver) return;
  await fs.mkdir('tests/e2e/results', { recursive: true });
  const png = await driver.takeScreenshot().catch(() => null);
  if (png) await fs.writeFile('tests/e2e/results/firefox-failure.png', png, 'base64');
};

try {
  driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .setFirefoxService(service)
    .build();
  const capabilities = await driver.getCapabilities();
  browserVersion = capabilities.get('browserVersion') || 'unknown';
  const installedId = await driver.installAddon(xpiPath, true);
  assert.equal(installedId, addonId, 'Firefox installed an unexpected extension id');
  await resolveExtensionUuid();

  await driver.get('about:blank');
  controlHandle = await driver.getWindowHandle();

  await reporter.step('packaged Firefox extension starts and settings UI renders', async () => {
    await configure();
    await driver.get('about:blank');
  });

  await reporter.step('Firefox contextual-identities capability is available to the packaged extension', async () => {
    await openSettings();
    const result = await driver.executeAsyncScript(
      `const done = arguments[arguments.length - 1];
       browser.contextualIdentities.create({ name: 'CAD E2E', color: 'blue', icon: 'fingerprint' })
         .then(async (container) => {
           await browser.contextualIdentities.remove(container.cookieStoreId);
           done({ ok: true, storeId: container.cookieStoreId });
         })
         .catch((error) => done({ ok: false, error: String(error) }));`,
    );
    assert.equal(result.ok, true, `Firefox contextualIdentities API failed: ${result.error || 'unknown error'}`);
    await driver.get('about:blank');
  });

  await reporter.step('Temporary Containers share one %tmp expression UI scope', async () => {
    await openSettings();
    const created = await driver.executeAsyncScript(
      `const done = arguments[arguments.length - 1];
       Promise.all([
         browser.contextualIdentities.create({ name: '%tmp-e2e-one', color: 'blue', icon: 'fingerprint' }),
         browser.contextualIdentities.create({ name: '%tmp-e2e-two', color: 'green', icon: 'briefcase' }),
       ])
         .then((containers) => done({ ok: true, ids: containers.map((container) => container.cookieStoreId) }))
         .catch((error) => done({ ok: false, error: String(error) }));`,
    );
    assert.equal(created.ok, true, `Firefox Temporary Container creation failed: ${created.error || 'unknown error'}`);

    await openExtensionTab('tabExpressionList', 'formText');
    const navLinks = await driver.findElements(By.css('ul.nav-tabs a.nav-link'));
    const labels = await Promise.all(navLinks.map((link) => link.getText()));
    assert.equal(labels.filter((label) => label === '%tmp').length, 1, `Expected one shared %tmp tab, got: ${labels.join(', ')}`);
    assert.equal(labels.includes('%tmp-e2e-one'), false, 'First Temporary Container leaked into the expression tab list');
    assert.equal(labels.includes('%tmp-e2e-two'), false, 'Second Temporary Container leaked into the expression tab list');

    let temporaryTab;
    for (const link of navLinks) {
      if ((await link.getText()) === '%tmp') {
        temporaryTab = link;
        break;
      }
    }
    assert.ok(temporaryTab, 'Shared %tmp expression tab was not found');
    await temporaryTab.click();
    const input = await waitForElement('formText');
    await input.clear();
    await input.sendKeys('tmp-e2e.invalid', Key.ENTER);
    await driver.wait(async () => (await input.getAttribute('value')) === '', 10000);
    assert.ok((await driver.findElement(By.css('body')).getText()).includes('tmp-e2e.invalid'), 'Shared %tmp rule was not stored in the visible group');

    const stored = await driver.executeAsyncScript(
      `const done = arguments[arguments.length - 1];
       browser.storage.local.get('expressionStore').then((value) => done(value.expressionStore || {}));`,
    );
    assert.ok(stored['%tmp'], 'Shared %tmp expression store was not persisted');
    for (const id of created.ids) {
      assert.equal(stored[id], undefined, `Concrete Temporary Container store ${id} leaked into persistence`);
    }

    const removed = await driver.executeAsyncScript(
      `const ids = arguments[0];
       const done = arguments[arguments.length - 1];
       Promise.all(ids.map((id) => browser.contextualIdentities.remove(id)))
         .then(() => done({ ok: true }))
         .catch((error) => done({ ok: false, error: String(error) }));`,
      created.ids,
    );
    assert.equal(removed.ok, true, `Firefox Temporary Container cleanup failed: ${removed.error || 'unknown error'}`);
    await driver.get('about:blank');
  });

  const closeToken = 'firefox-close';
  await reporter.step('unlisted last-tab close removes cookies and configured site data', async () => {
    site.resetHits(closeToken);
    await openSiteTab(site.origin('a'));
    assertSeeded(await seed(closeToken), 'Firefox close seed');
    verifyCacheBaseline(closeToken, 'Firefox close seed');
    await closeSiteAndReturn();
    await sleep(cleanupDelayMs);

    await openSiteTab(site.origin('a'));
    assertCleaned(await inspect(), 'Firefox last-tab cleanup');
    await verifyCacheCleaned(closeToken, 'Firefox last-tab cleanup');
    await closeSiteAndReturn();
  });

  const domainToken = 'firefox-domain-change';
  await reporter.step('domain change removes the previous unlisted origin', async () => {
    site.resetHits(domainToken);
    await openSiteTab(site.origin('b'));
    assertSeeded(await seed(domainToken), 'Firefox domain-change seed');
    verifyCacheBaseline(domainToken, 'Firefox domain-change seed');
    await driver.get(site.origin('a') + '/');
    await sleep(cleanupDelayMs);

    await driver.get(site.origin('b') + '/');
    assertCleaned(await inspect(), 'Firefox domain-change cleanup');
    await verifyCacheCleaned(domainToken, 'Firefox domain-change cleanup');
    await closeSiteAndReturn();
  });

  const whitelistToken = 'firefox-whitelist';
  await reporter.step('whitelist created through real options UI retains site data', async () => {
    await addExpression('127.0.0.1', false);
    site.resetHits(whitelistToken);
    await openSiteTab(site.origin('a'));
    assertSeeded(await seed(whitelistToken), 'Firefox whitelist seed');
    verifyCacheBaseline(whitelistToken, 'Firefox whitelist seed');
    await closeSiteAndReturn();
    await sleep(cleanupDelayMs);

    await openSiteTab(site.origin('a'));
    assertRetained(await inspect(), whitelistToken, 'Firefox whitelist retention');
    await verifyCacheRetained(whitelistToken, 'Firefox whitelist retention');
    await closeSiteAndReturn();
  });

  const greylistToken = 'firefox-greylist';
  await reporter.step('greylist created through real options UI retains data on normal tab close', async () => {
    await addExpression('127.0.0.2', true);
    site.resetHits(greylistToken);
    await openSiteTab(site.origin('b'));
    assertSeeded(await seed(greylistToken), 'Firefox greylist seed');
    verifyCacheBaseline(greylistToken, 'Firefox greylist seed');
    await closeSiteAndReturn();
    await sleep(cleanupDelayMs);

    await openSiteTab(site.origin('b'));
    assertRetained(await inspect(), greylistToken, 'Firefox greylist close retention');
    await verifyCacheRetained(greylistToken, 'Firefox greylist close retention');
    await closeSiteAndReturn();
  });

  await reporter.step('extension runtime reload restores persisted settings and expression state', async () => {
    await openSettings();
    await driver.executeScript('browser.runtime.reload();');
    await driver.get('about:blank');
    await sleep(1800);

    await openSettings();
    assert.equal(await (await driver.findElement(By.id('activeMode'))).getAttribute('aria-checked'), 'true');
    assert.equal(await (await driver.findElement(By.id('indexedDBCleanup'))).getAttribute('aria-checked'), 'true');

    await openExtensionTab('tabExpressionList', 'formText');
    const body = await driver.findElement(By.css('body')).getText();
    assert.ok(body.includes('127.0.0.1'), 'Firefox whitelist entry was lost across runtime reload');
    assert.ok(body.includes('127.0.0.2'), 'Firefox greylist entry was lost across runtime reload');
    await driver.get('about:blank');
  });

  await reporter.write({ browserVersion, extensionId: installedId, status: 'pass' });
} catch (error) {
  await screenshotFailure();
  await reporter.write({ browserVersion, extensionId: addonId, status: 'fail' });
  throw error;
} finally {
  await driver?.quit().catch(() => undefined);
  await site.close().catch(() => undefined);
}