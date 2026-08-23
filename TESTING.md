# Cookie AutoDelete testing architecture

This file defines **how** Cookie AutoDelete is tested. `ROADMAP.md` tracks project progress; `RC_TEST_CHECKLIST.md` contains only the residual release gates.

## Test layers

1. **Static / build** — locked install, TypeScript, lint, production builds, manifest/archive validation.
2. **Unit + regression** — fast Jest coverage for reducers/services, migration rules and browser-lifecycle logic using controlled WebExtension mocks.
3. **Real-browser E2E** — the actual packaged Firefox XPI / Chromium ZIP runs in real desktop browsers against a local deterministic test site.
4. **Historical upgrade** — release-derived schema fixtures in CI plus genuine archived user profiles/exports when available.
5. **Minimal manual smoke** — only browser chrome, permission/install UX, full-startup paths the CI install model cannot faithfully reproduce, and visual sanity.

Do not treat a unit test as proof that a browser really removed site data. Conversely, do not force a browser E2E test to simulate a lifecycle that its temporary/sideloaded install model cannot represent faithfully.

## Controlled E2E site

`tests/e2e/lib/test-site.mjs` starts two isolated loopback origins:

- `http://127.0.0.1`
- `http://127.0.0.2`

No external websites, accounts, passwords, API keys or cloud services are used.

The fixture can create/inspect:

- cookie
- LocalStorage
- IndexedDB
- website Service Worker registration
- cacheable HTTP response for browser HTTP-cache assertions

Port 80 is intentional. CAD cleanup is hostname-oriented; using the normal HTTP origin avoids introducing a test-only non-default port that production cleanup cannot reconstruct from cookie hostnames.

## Unit / regression layer

`__tests__/` remains the fast logic layer. Targeted `*.regression.spec.*` files are retained when they document a concrete previous failure mode; apparent overlap alone is not a reason to delete them.

Historical state fixtures for 3.0.2, 3.4.0 and 3.6.0 protect migration logic but **do not** count as genuine historical-profile validation.

Local fast validation:

```bash
npm ci
npm run typecheck
npm run test:unit
npm run lint
npm run build
```

`npm test` aliases the unit/regression layer. `npm run test-all` intentionally does not launch browsers.

## Chromium packaged E2E

`tests/e2e/chromium.mjs` uses Playwright Chromium with a persistent profile and loads the unpacked contents of the **packaged Chromium ZIP**.

It verifies:

- MV3 packaged startup and real settings UI
- dynamic popup sizing; enlarged text must not wrap the primary action row
- unlisted last-tab cleanup
- domain-change cleanup
- cookie, LocalStorage, IndexedDB and website Service Worker removal
- selective browser HTTP-cache removal
- whitelist/greylist creation through the real expression UI and retention semantics
- persistent-profile browser-process relaunch
- persisted settings/lists survive that relaunch
- worker-global transient state does **not** survive the new browser process

### Chromium lifecycle boundary

The CI process launches the unpacked candidate with `--load-extension` on each browser process. This is valid for persisted-profile/process-boundary testing, but it cannot faithfully reproduce `runtime.onStartup` of an extension that was already normally installed before browser startup.

A whole-extension `chrome.runtime.reload()` is deliberately **not** an MV3 worker-lifecycle gate. Reloading the entire sideloaded extension is not equivalent to ordinary service-worker suspension/restart and can make the unpacked extension temporarily unavailable. Worker persistence is instead covered by:

- deterministic service-worker module-restart regression tests; and
- real Chromium process relaunch with transient-versus-persisted state assertions.

Greylist cleanup on a genuine already-installed browser startup remains a small residual manual gate.

## Firefox packaged E2E

`tests/e2e/firefox.mjs` uses Selenium/GeckoDriver and installs the **packaged Firefox XPI** temporarily in a disposable Firefox profile. A test-only fixed WebExtension UUID makes packaged extension pages addressable from Selenium.

It verifies:

- packaged-XPI startup and real settings UI
- Firefox contextual-identities capability
- `%tmp*` Temporary Containers collapse into one visible and persisted `%tmp` expression scope
- no concrete temporary-container store IDs leak into persisted CAD state
- unlisted last-tab cleanup
- domain-change cleanup
- cookie, LocalStorage, IndexedDB and website Service Worker removal
- whitelist/greylist creation through the real expression UI and retention semantics
- production `storage.local.state` contains the settings and expression lists created through those real browser/UI interactions

### Firefox lifecycle boundary

Firefox MV3 uses `background.scripts` for this build. Calling `browser.runtime.reload()` reloads the **entire temporary extension**, not an ordinary background-script lifecycle, and destabilizes Marionette. It is therefore not used as an E2E persistence proxy.

State hydration/recreation and simulated restart behavior remain protected by deterministic Jest regressions. A genuine browser restart of a normally installed candidate remains a residual manual gate because Firefox removes temporary unsigned add-ons on restart.

### Firefox HTTP-cache boundary

Firefox hostname-scoped `browsingData` cache removal does not currently reliably evict normal-tab partitioned HTTP-cache entries. CAD must **not** work around that by clearing the entire browser cache: doing so would erase cache belonging to unrelated or allowlisted sites and violate per-site cleanup semantics.

Therefore:

- selective HTTP-cache behavior remains a mandatory real-browser Chromium gate;
- Firefox E2E does not claim selective HTTP-cache cleanup until the browser exposes/reliably implements the required per-site behavior;
- the limitation should be re-evaluated when Firefox behavior changes.

## CI flow

Regular CI is ordered so an RC cannot be published before the exact packages have passed real-browser tests:

1. **Tests, Builds, Coverage**
   - locked dependency install
   - TypeScript typecheck
   - Jest unit/regression suite
   - lint
   - production Firefox + Chromium build/archive validation
   - internal `browser-test-packages` artifact
2. **Browser E2E — Chromium**
   - downloads the exact Chromium package bytes from the build job
   - runs the packaged-browser matrix
3. **Browser E2E — Firefox**
   - downloads the exact Firefox XPI from the build job
   - runs the packaged-browser matrix
4. **Release Candidate Packages** (PR only)
   - requires both browser jobs + fast CI to be green
   - republishes the same already-tested package bytes
   - adds `SHA256SUMS.txt`

Both E2E jobs upload machine-readable result JSON; failure screenshots are uploaded where possible.

## Local E2E

Install the isolated browser-test dependencies:

```bash
npm run test:e2e:install
```

On Linux the controlled fixture uses port 80:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(command -v node)")"
```

Then build and run:

```bash
npm run build

# Chromium: extract the generated *Chrome.zip first
npm run test:e2e:chromium -- /path/to/unpacked/chromium-package

# Firefox
FIREFOX_BIN=/path/to/firefox npm run test:e2e:firefox -- /path/to/Cookie-AutoDelete_Firefox.xpi
```

GitHub Actions installs its own browser runtimes and prepares the port capability automatically.

## Historical upgrade validation

### Automated

Release-derived 3.0.2 / 3.4.0 / 3.6.0 persisted-state fixtures exercise the production migration path for both browser families and remain mandatory CI regressions.

### Genuine user data

A real historical profile/export may expose storage encoding and settings/list combinations that schema fixtures cannot reproduce. If suitable privacy-safe archived data exists, upgrade it in a disposable profile without clearing extension storage and record the result in `RC_TEST_CHECKLIST.md`.

Never mark this gate complete from synthetic fixtures alone.

## What remains manual

Manual release work is intentionally limited to:

- visual sanity of packaged popup/options
- browser permission/install UX
- Firefox full browser startup with a normally installed candidate
- Chromium greylist startup cleanup with an already installed/loaded candidate
- genuine historical profile/export upgrades until reproducible fixtures exist
- platform-specific release claims not represented by desktop Linux E2E, e.g. Firefox Android

Any repeatable functional defect found manually should become an automated regression/E2E test before being considered fixed.

## Maintenance rules

- Prefer deterministic local fixtures to public test sites.
- Never store real credentials or personal browsing data in the repository.
- Keep E2E dependencies isolated from shipping dependencies.
- Pin/update browser-test tooling deliberately.
- Keep unit tests fast and browser E2E focused on boundaries mocks cannot prove.
- A candidate-affecting source/runtime/manifest/build/dependency/test-infrastructure/base change invalidates the pinned RC.
- A new cleanup data type needs unit/capability coverage plus a real-browser assertion where the browser API can represent it safely.
