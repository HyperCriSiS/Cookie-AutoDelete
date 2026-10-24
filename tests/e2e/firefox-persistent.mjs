import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
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
  throw new Error('Usage: node tests/e2e/firefox-persistent.mjs <Firefox XPI path>');
}
if (!process.env.FIREFOX_PERSISTENT_BIN) {
  throw new Error('FIREFOX_PERSISTENT_BIN must point to Firefox ESR, Developer Edition, Nightly, or another build that permits unsigned persistent add-ons');
}

const addonId = 'CookieAutoDelete@kennydo.com';
const extensionUuid = '2d6ffdb7-5310-4b78-9d0b-2d0d2ac6e2e1';
const cleanupDelayMs = 3000;
const reporter = createReporter('firefox-persistent');
const site = await startTestSite();
const profilePath = await fs.mkdtemp(path.join(os.tmpdir(), 'cad-firefox-persistent-'));
let driver;
let controlHandle;
let browserVersion = 'unknown';

const createDriver = async (marionettePort) => {
  const options = new firefox.Options();
  options.addArguments('-headless', '--profile', profilePath);
  options.setBinary(process.env.FIREFOX_PERSISTENT_BIN);
  options.setPreference('xpinstall.signatures.required', false);
  options.setPreference('extensions.webextensions.uuids', JSON.stringify({ [addonId]: extensionUuid }));
  options.setPreference('browser.shell.checkDefaultBrowser', false);
  options.setPreference('browser.startup.page', 0);
  options.setPreference('browser.sessionstore.max_tabs_undo', 0);
  options.setPreference('browser.sessionstore.max_windows_undo', 0);
  options.setPreference('browser.sessionstore.resume_from_crash', false);
  options.setPreference('datareporting.policy.dataSubmissionEnabled', false);

  const service = new firefox.ServiceBuilder().addArguments(
    '--allow-system-access',
    '--marionette-port',
    String(marionettePort),
  );

  const next = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .setFirefoxService(service)
    .build();
  const capabilities = await next.getCapabilities();
  browserVersion = capabilities.get('browserVersion') || browserVersion;
  return next;
};

const extensionRoot = () => `moz-extension://${extensionUuid}/settings/settings.html`;
const isStale = (error) => {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');
  return name.includes('StaleElementReference') || message.includes("can't access dead object");
};

const retryDom = async (label, operation, attempts = 6) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isStale(error) || attempt === attempts) throw error;
      await sleep(100);
    }
  }
  throw new Error(`${label} could not complete after repeated DOM rerenders`);
};

const navigateExtension = async () => {
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
  await retryDom(`open ${tabId}`, async () => {
    const tab = await waitForElement(tabId);
    await driver.wait(until.elementIsVisible(tab), 10000);
    await tab.click();
  });
  if (readyId) {
    await retryDom(`wait for ${readyId}`, async () => {
      const ready = await waitForElement(readyId);
      await driver.wait(until.elementIsVisible(ready), 10000);
    });
  }
};

const setCheckbox = async (id, wanted) => retryDom(`set ${id}`, async () => {
  const element = await waitForElement(id);
  const current = (await element.getAttribute('aria-checked')) === 'true';
  if (current !== wanted) await element.click();
  await driver.wait(async () => {
    try {
      const currentElement = await driver.findElement(By.id(id));
      return (await currentElement.getAttribute('aria-checked')) === String(wanted);
    } catch (error) {
      if (isStale(error)) return false;
      throw error;
    }
  }, 10000);
});

const setNumberInput = async (id, wanted) => retryDom(`set ${id}`, async () => {
  const element = await waitForElement(id);
  await element.click();
  await element.sendKeys(Key.chord(Key.CONTROL, 'a'));
  await element.sendKeys(String(wanted), Key.TAB);
  await driver.wait(async () => {
    try {
      return (await driver.findElement(By.id(id)).getAttribute('value')) === String(wanted);
    } catch (error) {
      if (isStale(error)) return false;
      throw error;
    }
  }, 5000);
});

const configure = async () => {
  await openExtensionTab('tabSettings', 'activeMode');
  await setCheckbox('activeMode', true);
  await setCheckbox('indexedDBCleanup', true);
  await setCheckbox('localStorageCleanup', true);
  await setCheckbox('serviceWorkersCleanup', true);
  await setCheckbox('showNotificationAfterCleanup', false);
  await setCheckbox('manualNotifications', false);
  await setNumberInput('delayBeforeClean', 1);
  await sleep(300);
};

const addGreyExpression = async (host) => {
  await openExtensionTab('tabExpressionList', 'formText');
  await retryDom(`add grey expression ${host}`, async () => {
    const input = await waitForElement('formText');
    await input.clear();
    await input.sendKeys(host, Key.chord(Key.SHIFT, Key.ENTER));
    await driver.wait(async () => {
      try {
        return (await driver.findElement(By.id('formText')).getAttribute('value')) === '';
      } catch (error) {
        if (isStale(error)) return false;
        throw error;
      }
    }, 10000);
  });
  assert.ok((await driver.findElement(By.css('body')).getText()).includes(host));
};

const readPersistedState = async () => {
  const state = await driver.executeAsyncScript(
    `const done = arguments[arguments.length - 1];
     browser.storage.local.get('state')
       .then((value) => done(value.state ? JSON.parse(value.state) : {}))
       .catch((error) => done({ __error: String(error) }));`,
  );
  assert.equal(state.__error, undefined, `Unable to read persisted CAD state: ${state.__error || ''}`);
  return state;
};

const openSiteTab = async (origin) => {
  await driver.switchTo().newWindow('tab');
  const handle = await driver.getWindowHandle();
  await driver.get(`${origin}/`);
  await driver.wait(
    async () => driver.executeScript('return typeof window.cadE2E?.inspect === "function";'),
    10000,
  );
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

const verifyPersistentAddon = async () => {
  await driver.setContext(firefox.Context.CHROME);
  try {
    return await driver.executeAsyncScript(
      `const addonId = arguments[0];
       const done = arguments[arguments.length - 1];
       ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs').AddonManager
         .getAddonByID(addonId)
         .then((addon) => done(addon ? { id: addon.id, active: addon.isActive } : null))
         .catch((error) => done({ error: String(error) }));`,
      addonId,
    );
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
};

const screenshotFailure = async () => {
  if (!driver) return;
  await fs.mkdir('tests/e2e/results', { recursive: true });
  const png = await driver.takeScreenshot().catch(() => null);
  if (png) await fs.writeFile('tests/e2e/results/firefox-persistent-failure.png', png, 'base64');
};

try {
  driver = await createDriver(2828);
  const installedId = await driver.installAddon(xpiPath, false);
  assert.equal(installedId, addonId, 'Firefox persistently installed an unexpected extension id');
  const firstAddon = await verifyPersistentAddon();
  assert.equal(firstAddon?.id, addonId, `Persistent Firefox add-on was not visible to AddonManager: ${JSON.stringify(firstAddon)}`);
  assert.equal(firstAddon?.active, true, 'Persistent Firefox add-on was not active after installation');

  await driver.get('about:blank');
  controlHandle = await driver.getWindowHandle();
  await reporter.step('persistently installed Firefox candidate can be configured through the real UI', configure);
  await reporter.step('greylist state is created through the real UI and survives normal tab close', async () => {
    const token = 'firefox-persistent-startup';
    await addGreyExpression('127.0.0.2');
    site.resetHits(token);
    await openSiteTab(site.origin('b'));
    assertSeeded(await seed(token), 'Firefox persistent startup seed');
    await driver.close();
    await driver.switchTo().window(controlHandle);
    await sleep(cleanupDelayMs);
    await openSiteTab(site.origin('b'));
    assertRetained(await inspect(), token, 'Firefox greylist data before browser restart');
    await driver.close();
    await driver.switchTo().window(controlHandle);

    const persisted = await readPersistedState();
    assert.equal(persisted.settings?.activeMode?.value, true, 'Firefox active mode did not persist before restart');
    const expressions = Object.values(persisted.lists || {}).flat();
    assert.ok(expressions.some((expression) => expression.expression === '127.0.0.2'), 'Firefox greylist did not persist before restart');
  });

  await driver.quit();
  driver = undefined;
  await sleep(700);

  driver = await createDriver(2829);
  await driver.get('about:blank');
  controlHandle = await driver.getWindowHandle();
  await reporter.step('persistent Firefox profile restarts without reinstalling the XPI', async () => {
    const restartedAddon = await verifyPersistentAddon();
    assert.equal(restartedAddon?.id, addonId, `Persisted Firefox add-on disappeared after restart: ${JSON.stringify(restartedAddon)}`);
    assert.equal(restartedAddon?.active, true, 'Persisted Firefox add-on was inactive after restart');

    await navigateExtension();
    const persisted = await readPersistedState();
    assert.equal(persisted.settings?.activeMode?.value, true, 'Firefox active mode was lost across browser restart');
    const expressions = Object.values(persisted.lists || {}).flat();
    assert.ok(expressions.some((expression) => expression.expression === '127.0.0.2'), 'Firefox greylist was lost across browser restart');
  });

  await reporter.step('real Firefox startup event cleans retained greylist site data', async () => {
    await sleep(cleanupDelayMs);
    await openSiteTab(site.origin('b'));
    assertCleaned(await inspect(), 'Firefox persistent-profile startup cleanup');
    await driver.close();
    await driver.switchTo().window(controlHandle);
  });

  await reporter.write({ browserVersion, extensionId: addonId, profileMode: 'persistent', status: 'pass' });
} catch (error) {
  await screenshotFailure();
  await reporter.write({ browserVersion, extensionId: addonId, profileMode: 'persistent', status: 'fail' });
  throw error;
} finally {
  await driver?.quit().catch(() => undefined);
  await site.close().catch(() => undefined);
  await fs.rm(profilePath, { recursive: true, force: true }).catch(() => undefined);
}
