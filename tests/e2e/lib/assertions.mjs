import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const assertSeeded = (state, label) => {
  assert.equal(state.cookie, true, `${label}: test cookie was not created`);
  assert.notEqual(state.localStorage, null, `${label}: localStorage was not created`);
  assert.equal(state.indexedDB, true, `${label}: IndexedDB was not created`);
  assert.equal(state.serviceWorker, true, `${label}: website service worker was not registered`);
};

export const assertCleaned = (state, label) => {
  assert.equal(state.cookie, false, `${label}: cookie survived cleanup`);
  assert.equal(state.localStorage, null, `${label}: localStorage survived cleanup`);
  assert.equal(state.indexedDB, false, `${label}: IndexedDB survived cleanup`);
  assert.equal(state.serviceWorker, false, `${label}: website service worker registration survived cleanup`);
};

export const assertRetained = (state, token, label) => {
  assert.equal(state.cookie, true, `${label}: cookie was removed unexpectedly`);
  assert.equal(state.localStorage, token, `${label}: localStorage was removed or changed unexpectedly`);
  assert.equal(state.indexedDB, true, `${label}: IndexedDB was removed unexpectedly`);
  assert.equal(state.serviceWorker, true, `${label}: website service worker was removed unexpectedly`);
};

export const createReporter = (browserName) => {
  const results = [];
  return {
    async step(name, fn) {
      const startedAt = Date.now();
      try {
        const details = await fn();
        results.push({ name, status: 'pass', durationMs: Date.now() - startedAt, details });
        console.log(`PASS ${browserName}: ${name}`);
        return details;
      } catch (error) {
        results.push({
          name,
          status: 'fail',
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.stack || error.message : String(error),
        });
        console.error(`FAIL ${browserName}: ${name}`);
        throw error;
      }
    },
    async write(extra = {}) {
      const outDir = path.resolve('tests/e2e/results');
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(
        path.join(outDir, `${browserName}.json`),
        `${JSON.stringify({ browser: browserName, ...extra, results }, null, 2)}\n`,
      );
    },
  };
};
