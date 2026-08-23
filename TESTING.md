# Cookie AutoDelete testing architecture

This document is the source of truth for how Cookie AutoDelete is tested. Release decisions should reference the layers below rather than duplicating long browser test instructions in release checklists.

## Goals

The test strategy must prove both application logic and real browser behavior without depending on external websites, real accounts, or mutable third-party services.

The layers are intentionally separated:

1. **Static checks** — TypeScript, lint, manifest/build validation.
2. **Unit and regression tests** — fast Jest coverage using mocked WebExtension APIs.
3. **Real-browser E2E** — the packaged Firefox/Chromium extension loaded into real browsers against a controlled local website.
4. **Historical upgrade validation** — synthetic/release-derived migrations in Jest plus genuine archived user data when available.
5. **Minimal manual smoke** — only browser chrome, permission/install UX, visual sanity, and gaps that cannot be reproduced safely in CI.

A green unit suite is not accepted as proof that a browser actually removed IndexedDB, LocalStorage, cookies, cache, or a website Service Worker. Those behaviors belong to the real-browser layer.

## Controlled E2E website

`tests/e2e/lib/test-site.mjs` starts a local HTTP server and exposes two independent loopback origins:

- `http://127.0.0.1`
- `http://127.0.0.2`

No login, cloud service, dummy account, API key, or external website is required. Both origins are entirely owned by the test process and deliberately create data that Cookie AutoDelete is expected to remove or retain.

Each origin can create and inspect:

- a deterministic test cookie;
- LocalStorage;
- IndexedDB;
- a website Service Worker registration;
- a cacheable HTTP response used to verify browser HTTP-cache cleanup.

The server records cache endpoint hits, so the test first proves the response is actually cached and can then prove a cleanup caused a new network request. This tests Cookie AutoDelete's current **browser HTTP cache** option; it must not be confused with the Cache Storage API, which is a distinct data type and is not currently exposed by Cookie AutoDelete.

The CI test site intentionally uses HTTP port 80. Chromium `browsingData.origins` is origin-scoped, while Cookie AutoDelete currently derives cleanup targets from cookie hostnames and therefore has no originating non-default port available. Using the normal HTTP origin keeps the E2E fixture representative of the extension's current cleanup model rather than weakening assertions for a test-only port.

## Unit and regression layer

The existing `__tests__/` tree remains the fast logic layer. It includes core service/reducer tests and targeted regressions for defects that have previously been fixed.

Do not delete a `*.regression.spec.*` file merely because a broader `*.spec.*` file exists. Regression tests document a specific failure mode and are retained unless the behavior is removed or the assertion is demonstrably duplicated by an equally explicit test.

Historical release-state fixtures under `__tests__/fixtures/historical-state/` are release-derived schema fixtures. They protect migration logic but are **not** evidence that a genuine old browser profile was upgraded successfully.

Run locally:

```bash
npm ci
npm run typecheck
npm run test:unit
npm run lint
npm run build
```

`npm test` is an alias for the unit/regression layer. `npm run test-all` runs typecheck, unit/regression tests, and lint; it deliberately does not launch browsers.

## Real-browser E2E layer

Dependencies are isolated in `tests/e2e/package.json` so Playwright/Selenium do not become part of the extension's shipping dependency graph.

Install them with:

```bash
npm run test:e2e:install
```

### Chromium

`tests/e2e/chromium.mjs` uses Playwright's bundled Chromium with a persistent browser profile and loads the **unpacked contents of the packaged Chromium ZIP**. It does not test a source-only mock extension.

Automated Chromium scenarios include:

- MV3 packaged-extension startup and real options UI rendering;
- configuration through the extension's actual settings controls;
- unlisted last-tab-close cleanup;
- domain-change cleanup;
- cookie removal;
- LocalStorage removal;
- IndexedDB removal;
- website Service Worker removal;
- browser HTTP-cache removal;
- whitelist creation through the real expression UI and retention behavior;
- greylist creation through the real expression UI and normal-close retention behavior;
- persistent-profile browser restart, including whitelist retention and greylist startup cleanup;
- actual MV3 runtime reload with persisted settings/list restoration and loss of worker-global transient state.

The test uses the packaged build produced by CI and therefore exercises manifest generation, extension startup, browser APIs, persistence, and cleanup together.

### Firefox

`tests/e2e/firefox.mjs` uses Selenium WebDriver and installs the **packaged Firefox XPI** as a temporary add-on in a disposable Firefox profile. A fixed test-only `moz-extension://` UUID is preconfigured so Selenium can address the options pages without depending on Firefox's randomly generated internal UUID.

Automated Firefox scenarios include:

- packaged-XPI startup and real options UI rendering;
- configuration through the extension's actual settings controls;
- Firefox contextual-identities API availability from the packaged extension;
- unlisted last-tab-close cleanup;
- domain-change cleanup;
- cookie, LocalStorage, IndexedDB, website Service Worker, and browser HTTP-cache assertions;
- whitelist creation/retention;
- greylist creation/normal-close retention;
- extension runtime reload and persisted settings/list restoration.

A full Firefox **browser restart with the same unsigned temporary XPI already installed at startup** is not equivalent to a normal installed release: Firefox removes temporary add-ons on browser restart. Until the CI environment uses an appropriate signed/unbranded test package, the Firefox full-browser-startup greylist path remains a small residual manual gate. Its core policy logic continues to be covered by Jest regression tests.

## CI flow

The regular CI workflow is structured so the release artifact cannot be treated as validated before the browser E2E jobs pass:

1. `Tests, Builds, Coverage`
   - locked dependency install;
   - TypeScript typecheck;
   - Jest unit/regression suite;
   - lint;
   - production Firefox/Chromium build and archive validation;
   - upload a short-lived internal `browser-test-packages` artifact.
2. `Browser E2E — Chromium`
   - downloads the exact Chromium package from `browser-test-packages`;
   - loads it in Playwright Chromium;
   - runs the controlled-site E2E matrix.
3. `Browser E2E — Firefox`
   - downloads the exact Firefox XPI from `browser-test-packages`;
   - installs it into real Firefox with Selenium;
   - runs the controlled-site E2E matrix.
4. `Release Candidate Packages` (pull requests only)
   - runs only after both real-browser jobs and the fast CI layer are green;
   - downloads those same already-tested package bytes;
   - generates `SHA256SUMS.txt`;
   - publishes `release-candidate-packages` plus browser-specific artifacts.

Each E2E job uploads `tests/e2e/results/` even on failure. The directory contains a machine-readable JSON result matrix and, where possible, a failure screenshot.

## Running the E2E tests locally

The full site-data matrix uses port 80. On Linux, grant the current Node binary permission to bind the port before starting a test:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(command -v node)")"
```

Build the extension and prepare the browser package first. Chromium expects an unpacked directory containing the packaged `manifest.json`; Firefox expects the packaged `.xpi`.

```bash
npm run build
npm run test:e2e:install

# Chromium: extract the generated *Chrome.zip first
npm run test:e2e:chromium -- /path/to/unpacked/chromium-package

# Firefox
FIREFOX_BIN=/path/to/firefox npm run test:e2e:firefox -- /path/to/Cookie-AutoDelete_Firefox.xpi
```

GitHub Actions installs its own browser runtimes and performs the port capability setup automatically.

## Historical upgrade testing

There are two distinct levels and they must not be conflated:

### Automated schema migration

The release-derived 3.0.2, 3.4.0, and 3.6.0 fixtures exercise the production persisted-state migration path for both browser families. These remain mandatory CI tests.

### Genuine historical profile/export upgrade

A genuine old Cookie AutoDelete profile or settings export contains evidence that synthetic fixtures cannot reproduce, such as historical extension-storage encoding and user-created combinations of settings/lists. If representative archived data becomes available, keep a privacy-scrubbed copy as a dedicated test fixture only if redistribution is appropriate; otherwise perform the upgrade in a disposable local profile and record the result in `RC_TEST_CHECKLIST.md`.

Never invent or mark this gate complete from synthetic data.

## What remains manual

The manual release checklist is intentionally small. It should not repeat E2E behavior already proven by CI. Manual checks are limited to:

- final visual sanity of toolbar popup/options in packaged builds;
- browser permission/install UX where browser chrome itself is the subject of the test;
- Firefox full-browser-startup behavior while CI uses a temporary unsigned XPI;
- genuine historical profile/export upgrade data until a suitable reproducible fixture exists;
- platform-specific surfaces not represented by the desktop Linux browser jobs, such as Firefox Android, when they are part of a release claim.

Any repeatable functional defect found manually should become an automated regression or E2E test before it is considered fixed.

## Maintenance rules

- Prefer local deterministic fixtures to public test websites.
- Never store real credentials or personal browsing data in the repository.
- Pin top-level E2E tool versions and update them deliberately.
- A dependency/toolchain/browser-test infrastructure change invalidates an already pinned RC just like a build change does.
- Keep fast unit tests fast; do not move all logic assertions into browsers.
- Keep real-browser E2E focused on boundaries that mocks cannot prove.
- A new cleanup data type must receive both capability/unit coverage and a real-browser assertion where the browser API permits it.
