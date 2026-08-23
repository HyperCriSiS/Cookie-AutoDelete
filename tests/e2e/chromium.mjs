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
  throw new Error('Usage: node tests/e2e/chromium.mjs <unpacked Chromium extension directory>');
}

const cleanupDelayMs = 2600;
const reporter = createReporter('chromium');
const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cad-e2e-chromium-'));
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
  return worker;
};

const extensionRoot = () => `chrome-extension://${extensionId}/settings/settings.html`;
const popupRoot = () => `chrome-extension://${extensionId}/popup/popup.html`;

const openExtensionTab = async (tabId, readyId) => {
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(extensionRoot());
  const tab = page.locator(`#${tabId}`);
  await tab.waitFor({ state: 'visible', timeout: 10000 }).catch(async (error) => {
    const body = (await page.locator('body').textContent().catch(() => '')) || '';
    throw new Error(`${error.message}\nExtension page: ${page.url()}\nPage errors: ${pageErrors.join(' | ') || 'none'}\nBody: ${body.slice(0, 2000)}`);
  });
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

const openSettings = async () => openExtensionTab('tabSettings', 'activeMode');

const configure = async () => {
  const page = await openSettings();
  await setCheckbox(page, 'activeMode', true);
  await setCheckbox(page, 'domainChangeCleanup', true);
  await setCheckbox(page, 'cacheCleanup', true);
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

const addExpression = async (host, grey = false) => {
  const page = await openExtensionTab('tabExpressionList', 'formText');
  const input = page.locator('#formText');
  await input.fill(host);
  await input.press(grey ? 'Shift+Enter' : 'Enter');
  await page.waitForFunction(() => document.querySelector('#formText')?.value === '');
  assert.ok((await page.locator('body').textContent()).includes(host), `${host} was not rendered in the expression list`);
  await page.close();
};

const openSite = async (origin) => {
  const page = await context.newPage();
  await page.goto(origin + '/');
  await page.waitForFunction(() => typeof window.cadE2E?.inspect === 'function');
  return page;
};

const seed = async (page, token) => page.evaluate((value) => window.cadE2E.seed(value), token);
const inspect = async (page) => page.evaluate(() => window.cadE2E.inspect());
const fetchCached = async (page, token) => page.evaluate((value) => window.cadE2E.fetchCache(value), token);

const verifyCacheBaseline = (token, label) => {
  assert.equal(site.hits(token), 1, `${label}: the controlled HTTP response was not cached before cleanup`);
};

const verifyCacheCleaned = async (page, token, label) => {
  await fetchCached(page, token);
  assert.equal(site.hits(token), 2, `${label}: browser HTTP cache survived Cookie AutoDelete cleanup`);
};

const verifyCacheRetained = async (page, token, label) => {
  await fetchCached(page, token);
  assert.equal(site.hits(token), 1, `${label}: browser HTTP cache was removed unexpectedly`);
};

const screenshotFailure = async () => {
  if (!context) return;
  await fs.mkdir('tests/e2e/results', { recursive: true });
  const pages = context.pages();
  const page = pages[pages.length - 1];
  if (page) await page.screenshot({ path: 'tests/e2e/results/chromium-failure.png' }).catch(() => undefined);
};

let worker;
try {
  worker = await launch();

  await reporter.step('packaged MV3 extension starts and settings UI renders', async () => {
    await configure();
  });

  await reporter.step('popup primary actions stay on one dynamically sized row', async () => {
    const page = await context.newPage();
    await page.goto(popupRoot());
    const primaryActions = page.locator('#cadPrimaryActions');
    await primaryActions.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#cadPrimaryActions button').length >= 5,
    );

    await page.evaluate(() => {
      document.documentElement.style.fontSize = '24px';
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(250);

    const layout = await page.evaluate(() => {
      const row = document.querySelector('#cadPrimaryActions');
      if (!row) return null;
      const buttons = Array.from(row.querySelectorAll('button')).filter(
        (button) => button.getClientRects().length > 0,
      );
      const rects = buttons.map((button) => button.getBoundingClientRect());
      const rowRect = row.getBoundingClientRect();
      const topValues = rects.map((rect) => Math.round(rect.top));
      const firstTop = topValues[0];
      return {
        buttonCount: buttons.length,
        sameRow: topValues.every((top) => Math.abs(top - firstTop) <= 1),
        bodyWidth: document.body.getBoundingClientRect().width,
        rowClientWidth: rowRect.width,
        rowScrollWidth: row.scrollWidth,
        allInsideRow:
          rects.every(
            (rect) =>
              rect.left >= rowRect.left - 1 &&
              rect.right <= rowRect.right + 1,
          ),
      };
    });

    assert.ok(layout, 'Primary popup action row did not render');
    assert.equal(layout.buttonCount, 5, 'Expected all five top-level popup action buttons, including the clean dropdown');
    assert.equal(layout.sameRow, true, 'Primary popup buttons wrapped onto multiple rows');
    assert.equal(layout.allInsideRow, true, 'A primary popup button was clipped outside the action row');
    assert.ok(
      layout.rowClientWidth >= layout.rowScrollWidth,
      `Primary action row still overflows: client ${layout.rowClientWidth}px < scroll ${layout.rowScrollWidth}px`,
    );
    assert.ok(
      layout.bodyWidth >= layout.rowScrollWidth,
      `Popup body width ${layout.bodyWidth}px is smaller than primary-action width ${layout.rowScrollWidth}px`,
    );
    await page.close();
  });

  const closeToken = 'chromium-close';
  await reporter.step('unlisted last-tab close removes cookies and configured site data', async () => {
    site.resetHits(closeToken);
    const page = await openSite(site.origin('a'));
    assertSeeded(await seed(page, closeToken), 'Chromium close seed');
    verifyCacheBaseline(closeToken, 'Chromium close seed');
    await page.close();
    await sleep(cleanupDelayMs);

    const check = await openSite(site.origin('a'));
    assertCleaned(await inspect(check), 'Chromium last-tab cleanup');
    await verifyCacheCleaned(check, closeToken, 'Chromium last-tab cleanup');
    await check.close();
  });

  const domainToken = 'chromium-domain-change';
  await reporter.step('domain change removes the previous unlisted origin', async () => {
    site.resetHits(domainToken);
    const page = await openSite(site.origin('b'));
    const before = await seed(page, domainToken);
    assertSeeded(before, 'Chromium domain-change seed');
    verifyCacheBaseline(domainToken, 'Chromium domain-change seed');
    await page.goto(site.origin('a') + '/');
    await sleep(cleanupDelayMs);

    const check = await openSite(site.origin('b'));
    const after = await inspect(check);
    assertCleaned(after, 'Chromium domain-change cleanup');
    await verifyCacheCleaned(check, domainToken, 'Chromium domain-change cleanup');
    await check.close();
    await page.close();
  });

  const whitelistToken = 'chromium-whitelist';
  await reporter.step('whitelist created through real options UI retains site data', async () => {
    await addExpression('127.0.0.1', false);
    site.resetHits(whitelistToken);
    const page = await openSite(site.origin('a'));
    assertSeeded(await seed(page, whitelistToken), 'Chromium whitelist seed');
    verifyCacheBaseline(whitelistToken, 'Chromium whitelist seed');
    await page.close();
    await sleep(cleanupDelayMs);

    const check = await openSite(site.origin('a'));
    assertRetained(await inspect(check), whitelistToken, 'Chromium whitelist retention');
    await verifyCacheRetained(check, whitelistToken, 'Chromium whitelist retention');
    await check.close();
  });

  const greylistToken = 'chromium-greylist';
  await reporter.step('greylist created through real options UI retains data on normal tab close', async () => {
    await addExpression('127.0.0.2', true);
    site.resetHits(greylistToken);
    const page = await openSite(site.origin('b'));
    assertSeeded(await seed(page, greylistToken), 'Chromium greylist seed');
    verifyCacheBaseline(greylistToken, 'Chromium greylist seed');
    await page.close();
    await sleep(cleanupDelayMs);

    const check = await openSite(site.origin('b'));
    assertRetained(await inspect(check), greylistToken, 'Chromium greylist close retention');
    await verifyCacheRetained(check, greylistToken, 'Chromium greylist close retention');
    await check.close();
  });

  await reporter.step('persistent profile relaunch preserves whitelist and extension state', async () => {
    await Promise.all(context.pages().map((page) => page.close().catch(() => undefined)));
    await context.close();
    context = undefined;
    worker = await launch();
    await sleep(cleanupDelayMs);

    const whiteCheck = await openSite(site.origin('a'));
    assertRetained(await inspect(whiteCheck), whitelistToken, 'Chromium whitelist after profile relaunch');
    await whiteCheck.close();

    const settings = await openSettings();
    assert.equal(await settings.locator('#activeMode').getAttribute('aria-checked'), 'true');
    assert.equal(await settings.locator('#indexedDBCleanup').getAttribute('aria-checked'), 'true');
    await settings.close();
  });

  await reporter.step('MV3 runtime reload restores persisted settings and expression state', async () => {
    await worker.evaluate(() => {
      globalThis.__cadE2ETransient = 'must-not-survive';
      chrome.runtime.reload();
    }).catch((error) => {
      if (!String(error).includes('Target page, context or browser has been closed')) throw error;
    });
    await sleep(1800);
    const workers = context.serviceWorkers();
    if (workers.length === 0) {
      worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
    } else {
      worker = workers[0];
    }
    const transient = await worker.evaluate(() => globalThis.__cadE2ETransient ?? null);
    assert.equal(transient, null, 'MV3 worker-global transient state survived runtime reload unexpectedly');

    const settings = await openSettings();
    assert.equal(await settings.locator('#activeMode').getAttribute('aria-checked'), 'true');
    assert.equal(await settings.locator('#indexedDBCleanup').getAttribute('aria-checked'), 'true');
    await settings.close();

    const expressions = await openExtensionTab('tabExpressionList', 'formText');
    const body = await expressions.locator('body').textContent();
    assert.ok(body.includes('127.0.0.1'), 'Whitelist entry was lost across MV3 runtime reload');
    assert.ok(body.includes('127.0.0.2'), 'Greylist entry was lost across MV3 runtime reload');
    await expressions.close();
  });

  await reporter.write({ browserVersion, extensionId, status: 'pass' });
} catch (error) {
  await screenshotFailure();
  await reporter.write({ browserVersion, extensionId, status: 'fail' });
  throw error;
} finally {
  await context?.close().catch(() => undefined);
  await site.close().catch(() => undefined);
  await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
}
