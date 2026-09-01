import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  assertCleaned,
  assertRetained,
  assertSeeded,
  createReporter,
  sleep,
} from './lib/assertions.mjs';
import { startTestSite } from './lib/test-site.mjs';

const extensionDir = path.resolve(process.argv[2] || process.env.CAD_E2E_EXTENSION_DIR || '');
if (!extensionDir || !(await fs.stat(path.join(extensionDir, 'manifest.json')).catch(() => false))) {
  throw new Error('Usage: node tests/e2e/chromium-startup.mjs <unpacked Chromium extension directory>');
}

const cleanupDelayMs = 2600;
const reporter = createReporter('chromium-startup');
const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cad-e2e-chromium-startup-'));
const site = await startTestSite();
let context;
let extensionId;
let browserVersion = 'unknown';

const launch = async () => {
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
    ],
  });
  const browser = context.browser();
  if (browser) browserVersion = browser.version();
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
  extensionId = worker.url().split('/')[2];
  assert.ok(extensionId, 'Unable to determine Chromium extension id from the MV3 service worker');
};

const extensionRoot = () => `chrome-extension://${extensionId}/settings/settings.html`;

const openExtensionTab = async (tabId, readyId) => {
  const page = await context.newPage();
  let loaded = false;
  let lastNavigationError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await page.goto(extensionRoot());
      loaded = true;
      break;
    } catch (error) {
      lastNavigationError = error;
      if (!String(error).includes('ERR_BLOCKED_BY_CLIENT')) throw error;
      await page.waitForTimeout(250);
    }
  }
  if (!loaded) throw lastNavigationError;

  const tab = page.locator(`#${tabId}`);
  await tab.waitFor({ state: 'visible', timeout: 10000 });
  await tab.click();
  if (readyId) await page.locator(`#${readyId}`).waitFor({ state: 'visible', timeout: 10000 });
  return page;
};

const setCheckbox = async (page, id, wanted) => {
  const box = page.locator(`#${id}`);
  await box.waitFor({ state: 'visible', timeout: 10000 });
  const checked = (await box.getAttribute('aria-checked')) === 'true';
  if (checked !== wanted) {
    await box.click();
    await page.waitForFunction(
      ({ selector, value }) => document.querySelector(selector)?.getAttribute('aria-checked') === String(value),
      { selector: `#${id}`, value: wanted },
    );
  }
};

const configure = async () => {
  const page = await openExtensionTab('tabSettings', 'activeMode');
  await setCheckbox(page, 'activeMode', true);
  await setCheckbox(page, 'indexedDBCleanup', true);
  await setCheckbox(page, 'localStorageCleanup', true);
  await setCheckbox(page, 'serviceWorkersCleanup', true);
  await setCheckbox(page, 'showNotificationAfterCleanup', false);
  await setCheckbox(page, 'manualNotifications', false);
  const delay = page.locator('#delayBeforeClean');
  await delay.fill('1');
  await page.waitForFunction(() => document.querySelector('#delayBeforeClean')?.value === '1');
  await sleep(300);
  await page.close();
};

const addGreyExpression = async (host) => {
  const page = await openExtensionTab('tabExpressionList', 'formText');
  const input = page.locator('#formText');
  await input.fill(host);
  await input.press('Shift+Enter');
  await page.waitForFunction(() => document.querySelector('#formText')?.value === '');
  assert.ok((await page.locator('body').textContent()).includes(host), `${host} was not rendered in the expression list`);
  await page.close();
};

const openSite = async () => {
  const page = await context.newPage();
  await page.goto(site.origin('b') + '/');
  await page.waitForFunction(() => typeof window.cadE2E?.inspect === 'function');
  return page;
};

const seed = async (page, token) => page.evaluate((value) => window.cadE2E.seed(value), token);
const inspect = async (page) => page.evaluate(() => window.cadE2E.inspect());

const screenshotFailure = async () => {
  if (!context) return;
  await fs.mkdir('tests/e2e/results', { recursive: true });
  const pages = context.pages();
  const page = pages[pages.length - 1];
  if (page) {
    await page
      .screenshot({ path: 'tests/e2e/results/chromium-startup-failure.png' })
      .catch(() => undefined);
  }
};

try {
  await launch();

  await reporter.step('greylist data survives normal close before Chromium restart', async () => {
    await configure();
    await addGreyExpression('127.0.0.2');

    const token = 'chromium-startup';
    const page = await openSite();
    assertSeeded(await seed(page, token), 'Chromium startup seed');
    await page.close();
    await sleep(cleanupDelayMs);

    const retained = await openSite();
    assertRetained(await inspect(retained), token, 'Chromium greylist before startup');
    await retained.close();
  });

  await Promise.all(context.pages().map((page) => page.close().catch(() => undefined)));
  await context.close();
  context = undefined;
  await sleep(700);

  await launch();

  await reporter.step('real Chromium process startup cleans retained greylist site data', async () => {
    await sleep(cleanupDelayMs);
    const page = await openSite();
    assertCleaned(await inspect(page), 'Chromium process-startup greylist cleanup');
    await page.close();
  });

  await reporter.write({
    browserVersion,
    extensionId,
    profileMode: 'persistent-relaunch',
    status: 'pass',
  });
} catch (error) {
  await screenshotFailure();
  await reporter.write({
    browserVersion,
    extensionId,
    profileMode: 'persistent-relaunch',
    status: 'fail',
  });
  throw error;
} finally {
  await context?.close().catch(() => undefined);
  await site.close().catch(() => undefined);
  await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
}
