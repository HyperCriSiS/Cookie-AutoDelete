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
options.setPreference('extensions.webextensions.uuids', JSON.stringify({ [addonId]: extensionUuid }));
options.setPreference('browser.shell.checkDefaultBrowser', false);
options.setPreference('browser.startup.page', 0);
options.setPreference('datareporting.policy.dataSubmissionEnabled', false);

const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
const extensionRoot = () => `moz-extension://${extensionUuid}/settings/settings.html`;
const isStale = (error) => String(error?.name || error).includes('StaleElementReference');

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

const openSettings = async () => openExtensionTab('tabSettings', 'activeMode');

const configure = async () => {
  await openSettings();
  await setCheckbox('activeMode', true);
  await setCheckbox('contextualIdentities', true);
  await setCheckbox('domainChangeCleanup', true);
  await setCheckbox('indexedDBCleanup', true);
  await setCheckbox('localStorageCleanup', true);
  await setCheckbox('serviceWorkersCleanup', true);
  await setCheckbox('showNotificationAfterCleanup', false);
  await setCheckbox('manualNotifications', false);
  await setNumberInput('delayBeforeClean', 1);
  await sleep(300);
};

const addExpression = async (host, grey = false) => {
  await openExtensionTab('tabExpressionList', 'formText');
  await retryDom(`add expression ${host}`, async () => {
    const input = await waitForElement('formText');
    await input.clear();
    await input.sendKeys(host, grey ? Key.chord(Key.SHIFT, Key.ENTER) : Key.ENTER);
    await driver.wait(async () => {
      try {
        return (await driver.findElement(By.id('formText')).getAttribute('value')) === '';
      } catch (error) {
        if (isStale(error)) return false;
        throw error;
      }
    }, 10000);
  });
  assert.ok(
    (await driver.findElement(By.css('body')).getText()).includes(host),
    `${host} was not rendered in the Firefox expression list`,
  );
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
const closeSiteAndReturn = async () => {
  await driver.close();
  await driver.switchTo().window(controlHandle);
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

  await reporter.step('packaged Firefox extension starts and settings UI renders', configure);

  await reporter.step('Firefox contextual identities and Temporary Containers share one %tmp expression UI scope', async () => {
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

    await driver.navigate().refresh();
    await retryDom('open expression list after container creation', async () => {
      const tab = await waitForElement('tabExpressionList');
      await driver.wait(until.elementIsVisible(tab), 10000);
      await tab.click();
      const formText = await waitForElement('formText');
      await driver.wait(until.elementIsVisible(formText), 10000);
    });

    const navLinks = await driver.findElements(By.css('ul.nav-tabs a.nav-link'));
    const labels = await Promise.all(navLinks.map((link) => link.getText()));
    assert.equal(labels.filter((label) => label === '%tmp').length, 1, `Expected one shared %tmp tab, got: ${labels.join(', ')}`);
    assert.equal(labels.includes('%tmp-e2e-one'), false, 'First Temporary Container leaked into the expression tabs');
    assert.equal(labels.includes('%tmp-e2e-two'), false, 'Second Temporary Container leaked into the expression tabs');

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
    await driver.wait(async () => (await driver.findElement(By.id('formText')).getAttribute('value')) === '', 10000);
    assert.ok((await driver.findElement(By.css('body')).getText()).includes('tmp-e2e.invalid'));

    const persisted = await readPersistedState();
    assert.ok(persisted.lists?.['%tmp'], 'Shared %tmp expression list was not persisted');
    assert.ok(persisted.lists['%tmp'].some((expression) => expression.expression === 'tmp-e2e.invalid'));
    for (const id of created.ids) {
      assert.equal(persisted.lists[id], undefined, `Concrete Temporary Container store ${id} leaked into persistence`);
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

  await reporter.step('unlisted last-tab close removes cookies and configured site data', async () => {
    const token = 'firefox-close';
    site.resetHits(token);
    await openSiteTab(site.origin('a'));
    assertSeeded(await seed(token), 'Firefox close seed');
    await closeSiteAndReturn();
    await sleep(cleanupDelayMs);
    await openSiteTab(site.origin('a'));
    assertCleaned(await inspect(), 'Firefox last-tab cleanup');
    await closeSiteAndReturn();
  });

  await reporter.step('domain change removes the previous unlisted origin', async () => {
    const token = 'firefox-domain-change';
    site.resetHits(token);
    await openSiteTab(site.origin('b'));
    assertSeeded(await seed(token), 'Firefox domain-change seed');
    await driver.get(`${site.origin('a')}/`);
    await sleep(cleanupDelayMs);
    await driver.get(`${site.origin('b')}/`);
    assertCleaned(await inspect(), 'Firefox domain-change cleanup');
    await closeSiteAndReturn();
  });

  await reporter.step('whitelist created through real options UI retains site data', async () => {
    const token = 'firefox-whitelist';
    await addExpression('127.0.0.1', false);
    site.resetHits(token);
    await openSiteTab(site.origin('a'));
    assertSeeded(await seed(token), 'Firefox whitelist seed');
    await closeSiteAndReturn();
    await sleep(cleanupDelayMs);
    await openSiteTab(site.origin('a'));
    assertRetained(await inspect(), token, 'Firefox whitelist retention');
    await closeSiteAndReturn();
  });

  await reporter.step('greylist created through real options UI retains data on normal tab close', async () => {
    const token = 'firefox-greylist';
    await addExpression('127.0.0.2', true);
    site.resetHits(token);
    await openSiteTab(site.origin('b'));
    assertSeeded(await seed(token), 'Firefox greylist seed');
    await closeSiteAndReturn();
    await sleep(cleanupDelayMs);
    await openSiteTab(site.origin('b'));
    assertRetained(await inspect(), token, 'Firefox greylist close retention');
    await closeSiteAndReturn();
  });

  await reporter.step('production persistence contains settings and expression state after real browser interactions', async () => {
    await openSettings();
    assert.equal(await (await driver.findElement(By.id('activeMode'))).getAttribute('aria-checked'), 'true');
    assert.equal(await (await driver.findElement(By.id('indexedDBCleanup'))).getAttribute('aria-checked'), 'true');

    const persisted = await readPersistedState();
    assert.equal(persisted.settings?.activeMode?.value, true, 'Firefox activeMode was not persisted');
    assert.equal(persisted.settings?.indexedDBCleanup?.value, true, 'Firefox indexedDBCleanup was not persisted');
    const expressions = Object.values(persisted.lists || {}).flat();
    assert.ok(expressions.some((expression) => expression.expression === '127.0.0.1'), 'Firefox whitelist entry was not persisted');
    assert.ok(expressions.some((expression) => expression.expression === '127.0.0.2'), 'Firefox greylist entry was not persisted');
    assert.ok(expressions.some((expression) => expression.expression === 'tmp-e2e.invalid'), 'Firefox shared %tmp entry was not persisted');
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
