# Cookie AutoDelete Modernization Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving existing cleanup semantics, user data, privacy behavior, Firefox-specific capabilities and Chromium compatibility. Changes must remain attributable, testable and reversible. Major dependency/toolchain upgrades are integrated only after compatibility has been demonstrated.

`ROADMAP.md` is the project Source of Truth. Detailed automated-test architecture lives in `TESTING.md`; the deliberately small residual release checklist lives in `RC_TEST_CHECKLIST.md`.

## Current status

**Status: in progress / draft — technical RC qualified, residual release gates open**

- Development/integration branch: `modernization-p0`
- Draft PR: #1 → `3.X.X-Branch`
- Validated base: `3e061b7f77175e536ff664788f3e6692ac6540e8`
- Pinned technical RC source: `be91e59f3013569687dcf9a08c5fbb5d7a381814`
- Qualified pull-request CI run: `32678681488`
- `release-candidate-packages` artifact: `9503496423`
- Artifact wrapper digest: `sha256:07d57d72865d4878db789f96eac90cf881146267348386363322f454d0b66c09`
- Firefox package: `Cookie-AutoDelete_Dev_20260824_010631_be91e59_Firefox.xpi`
- Chromium package: `Cookie-AutoDelete_Dev_20260824_010631_be91e59_Chrome.zip`
- Former RC `b5cfd87fabdfb9ca70c566a3b12dd8dbee998170` / artifact `9432252522`: **superseded**
- Only draft modernization PR #1 is currently intended to remain open.

For the exact technical RC source, all repository-owned automated qualification gates are green:

- `Tests, Builds, Coverage` ✅
- `Browser E2E — Firefox` ✅
- `Browser E2E — Chromium` ✅
- `Release Candidate Packages` ✅
- CodeQL ✅
- Actions analysis ✅
- JavaScript/TypeScript analysis ✅

The separate GitHub Advanced Security AI-agent check can still fail before repository analysis because its hosted model is unavailable. This remains external to repository functionality while the repository-owned security/CI checks above are green.

Documentation-only commits after `be91e59f…` do not change the tested package bytes and therefore do not invalidate this technical RC. Any candidate-affecting source/runtime, manifest, build/packaging, dependency, toolchain, browser-test-infrastructure or base change requires a replacement candidate.

## Engineering principles

- Preserve existing author/contributor/license/support/donation/project-origin information unless separately reviewed.
- Prefer deterministic local test fixtures over external test sites/accounts.
- Do not weaken an assertion merely to make CI green; distinguish product defects, harness defects and browser-platform limitations.
- Do not substitute broad destructive cleanup for a browser API that cannot safely perform per-site cleanup.
- Every repeatable functional bug found manually should become a unit/regression or real-browser E2E test.
- Keep PR #1 draft; do not merge or tag a release while any required release gate remains open.

## Phase 0 — Manifest V3 foundation ✅

- [x] Add Chromium and Firefox Manifest V3 build/manifest foundations.
- [x] Make background lifecycle/listener registration service-worker-safe.
- [x] Add session-backed transient state required for MV3 worker restarts.
- [x] Introduce StoreBridge/UIStore synchronization for extension UI state.
- [x] Preserve cleanup/list semantics through the initial MV3 migration.
- [x] Repair legacy settings-migration payload shape.

## Phase 1 — functional stabilization and CI ✅

- [x] Restore a clean TypeScript/Jest/lint/production-build matrix.
- [x] Repair malformed/incomplete regression assertions discovered during modernization.
- [x] Align cleanup success-path tests with browser-confirmed removals.
- [x] Keep repository-owned CodeQL / JavaScript-TypeScript / Actions analysis green.
- [x] Harden `pull_request_target` prechecks against transient/non-JSON GitHub API responses.
- [x] Avoid duplicate full Push + PR browser matrices on feature/development branches.
- [x] Ignore Markdown-only changes for expensive browser CI and cancel superseded PR runs automatically.

## Phase 2 — migration and behavioral compatibility

### Automated compatibility ✅

- [x] Preserve non-destructive upgrades when older persisted profiles lack later-added settings.
- [x] Normalize legacy persisted state safely while retaining the original snapshot where side-effect comparison requires it.
- [x] Cover representative historical release-state schemas from 3.0.2, 3.4.0 and 3.6.0 for Firefox and Chromium through the production migration path.
- [x] Verify allowlist/greylist matching, including wildcard/subdomain and container-sensitive behavior.
- [x] Verify tab-close, domain-change and restart policy logic.
- [x] Verify persisted settings/lists survive StatePersistence → hydration → store recreation.
- [x] Verify transient tab-domain state survives a simulated MV3 worker module restart and still drives cleanup.
- [x] Verify popup/options state synchronization and reconnect behavior.
- [x] Capability-gate Firefox contextual-identity/container behavior.
- [x] Add missing Chromium 60-second alarm-threshold regression.

### Recent behavior improvements ✅

- [x] Treat Firefox Temporary Containers whose names begin with `%tmp` as one logical scope. All concrete temporary `cookieStoreId` values normalize/migrate to stable `%tmp`; the expression UI renders one `%tmp` tab and persistence contains no per-temporary-container rule stores.
- [x] Dynamically size the popup's primary action row from the actually rendered localized controls and prevent wrapping. Real Chromium E2E exercises enlarged 24px popup text.

### Real historical-data regression ✅

- [x] Add genuine public Firefox persisted-state evidence from upstream issue #197 (Firefox 57.0b9 / CAD 2.0.1), including a real container whitelist, legacy setting shapes/value types, counters and container cache.
- [x] Add genuine public Chromium core-settings evidence from upstream issue #1606 (Chrome 119.0.6045.160 / CAD 3.8.2), preserving every posted setting value without inventing user values.
- [x] Run both through the production persisted-state parser, Redux hydration and `validateSettings()` normalization; verify original lists/settings/counters survive and the normalized result remains stable after a second persistence/hydration cycle.
- [x] Keep genuine-user fixtures distinct from release-derived schemas and record auditable upstream provenance.

This closes the **automated genuine-user-data** gap. It does not replace the exact-RC packaged/browser upgrade + restart smoke retained in Phase 4.

## Phase 3 — dependency and build modernization ✅

- [x] Migrate packaging to Archiver 8 ESM APIs without changing generated package semantics.
- [x] Migrate Redux to Redux 5 / Redux Thunk 3 / React-Redux 8 while retaining React 17.
- [x] Remove obsolete `redux-webext` and redundant Redux typings.
- [x] Complete coordinated TypeScript 7 migration using `@typescript/native` for authoritative application typechecking and a TypeScript 6 compatibility package only where JavaScript compiler-API consumers require it.
- [x] Replace legacy module resolution with modern bundler/esnext compiler configuration.
- [x] Replace stale WebExtension typings with maintained Firefox WebExtension typings plus minimal local compatibility declarations.
- [x] Modernize Jest to 30.4.x with repository-local TypeScript transformation and permanent TS7 typecheck.
- [x] Restore reproducible `npm ci`; validated dependency graph reached zero findings in full and runtime-only npm audits at the migration point.
- [x] Update compatible Actions/dependencies individually rather than blindly merging stale-base Dependabot branches.
- [x] Permanently validate actual Firefox/Chromium archive contents and Firefox ZIP/XPI byte identity.
- [x] Align tagged test-build/release workflows with locked installs, TS7 typecheck, tests, lint, production builds and SHA-256 package checksums.

### Deliberately deferred coordinated majors

These are **post-RC maintenance**, not current release blockers:

- Bootstrap 5 stack migration
- React / React DOM major migration
- ESLint / `@typescript-eslint` major modernization
- Font Awesome 7 coordinated migration
- small non-security dependency cleanups such as direct AJV declaration alignment and `jest-date-mock` patch update

Each coordinated migration must independently rerun locked install/audit, typecheck, Jest, lint, both builds, package validation and real-browser E2E as appropriate.

## Phase 4 — release readiness

### Release/test infrastructure ✅

- [x] Keep the modernization branch synchronized with the hardened `3.X.X-Branch` base without replacing validated modernization code with stale dependency/workflow state.
- [x] Generate Firefox and Chromium packages from the same source state and attach SHA-256 checksums.
- [x] Supersede older RC artifacts after candidate-affecting changes; old artifacts remain historical evidence only.
- [x] Move repeatable packaged-runtime behavior into deterministic real-browser E2E using a controlled local test site.
- [x] Make `Release Candidate Packages` downstream of both real-browser E2E jobs so only already-tested package bytes can become a candidate.
- [x] Separate fast unit/regression coverage, real-browser E2E, genuine historical-upgrade validation and minimal manual smoke in `TESTING.md` / `RC_TEST_CHECKLIST.md`.
- [x] Remove duplicate full browser CI on both push and pull-request events for the same development commit.

### Chromium real-browser E2E ✅

The packaged Chromium build verifies:

- [x] MV3 extension startup and real options UI.
- [x] Dynamic popup sizing / primary controls remain on one row.
- [x] Unlisted last-tab cleanup.
- [x] Domain-change cleanup.
- [x] Cookie, LocalStorage, IndexedDB and website Service Worker removal.
- [x] Selective browser HTTP-cache cleanup.
- [x] Whitelist and greylist creation through the real expression UI plus policy retention behavior.
- [x] Persistent-profile Chromium process relaunch.
- [x] Persisted settings/lists survive the process relaunch while worker-global transient state does not.

A whole-extension `chrome.runtime.reload()` is intentionally **not** used as an MV3 service-worker lifecycle proxy: reloading the entire unpacked extension is not equivalent to ordinary MV3 worker suspension/restart and conflicts with the `--load-extension` harness. Deterministic worker-module restart regression plus real process-relaunch state boundaries cover the relevant persistence contract.

### Firefox real-browser E2E ✅

The packaged Firefox XPI verifies:

- [x] Extension startup and real options UI.
- [x] Firefox contextual-identities capability.
- [x] Multiple `%tmp*` containers collapse into exactly one visible/persisted `%tmp` expression scope.
- [x] No concrete temporary-container store IDs leak into persisted CAD state.
- [x] Unlisted last-tab cleanup.
- [x] Domain-change cleanup.
- [x] Cookie, LocalStorage, IndexedDB and website Service Worker removal.
- [x] Whitelist and greylist creation through the real expression UI plus policy retention behavior.
- [x] Production `storage.local.state` contains settings and expression lists created through real browser/UI interactions.

Firefox MV3 uses `background.scripts` here. A whole-extension `browser.runtime.reload()` is not used as a normal background-lifecycle proxy because it reloads the temporary extension itself and destabilizes Marionette. State hydration/recreation remains protected by deterministic regressions; the normally-installed browser-startup path remains a residual manual gate.

### Firefox selective HTTP-cache platform boundary ✅ classified

- [x] Current Firefox hostname-scoped `browsingData` cache removal does not reliably evict normal-tab partitioned HTTP-cache entries.
- [x] Do **not** silently fall back to an unscoped full-cache clear: that would erase cache for unrelated/allowlisted sites and violate CAD's per-site policy semantics.
- [x] Keep selective HTTP-cache behavior a mandatory packaged-runtime gate on Chromium.
- [x] Exclude Firefox selective HTTP-cache from the CAD pass/fail release matrix until Firefox provides/reliably implements an appropriate per-site API; re-evaluate when browser behavior changes.

### Replacement technical RC qualification ✅

- [x] Exact source `be91e59f3013569687dcf9a08c5fbb5d7a381814` passes fast CI, Chromium E2E and Firefox E2E.
- [x] Downstream `Release Candidate Packages` succeeds in PR run `32678681488`.
- [x] Technical RC artifact `9503496423` is pinned with wrapper digest `sha256:07d57d72865d4878db789f96eac90cf881146267348386363322f454d0b66c09`.
- [x] Browser-specific artifacts/results are recorded in `RC_TEST_CHECKLIST.md`.
- [ ] Verify downloaded package files against the included `SHA256SUMS.txt` before residual manual testing.

### Residual manual/historical release gates ⏳

- [ ] Minimal Firefox packaged visual/permission smoke.
- [ ] Minimal Chromium packaged visual/permission smoke.
- [ ] Full Firefox browser-startup cleanup with a normally installed candidate; CI currently uses a temporary unsigned XPI that Firefox removes at restart.
- [ ] Full Chromium greylist startup cleanup with an already installed/loaded candidate; CI process relaunch must re-sideload the unpacked extension with `--load-extension`.
- [ ] Exact-RC packaged/browser upgrade + restart smoke using the now-available genuine Firefox/Chromium historical data evidence; automated migration regression is green, but this browser-level release gate remains manual.
- [ ] Reconfirm PR #1 is mergeable against the then-current `3.X.X-Branch` base with no unresolved code conflict/base drift after residual testing.

### Merge / release ⛔ until all required gates pass

- [ ] Merge `modernization-p0` into `3.X.X-Branch` only after technical RC qualification plus residual manual/historical gates are green.
- [ ] Validate the integrated branch.
- [ ] Create a tagged fork release only after integrated-branch validation.
- [ ] Consider an upstream proposal only after the fork branch is stable and modernization scope is documented.

## Current blockers / dependencies

1. **Residual manual smoke:** visual/permission sanity and normally-installed full-startup paths in Firefox/Chromium.
2. **Packaged historical upgrade smoke:** genuine Firefox/Chromium user-data fixtures now exist and pass automated migration regression; the exact-RC browser-level upgrade + restart check remains open.
3. **Downloaded-package checksum verification:** verify the exact RC package files against `SHA256SUMS.txt` before manual use.
4. **Firefox selective HTTP cache:** browser-platform limitation; CAD must not substitute a destructive global cache clear.
5. **External GHAS AI agent:** may fail before repository analysis because of unavailable hosted model; non-blocking only while repository-owned CI/CodeQL are green.

## Completion status

**Not complete.** Phases 0, 1, 2 and 3 are now complete, including automated migration regression against genuine public historical Firefox and Chromium user data. Phase 4 has a fully green same-source real-browser technical RC (`be91e59f…`, artifact `9503496423`) covering the packaged Firefox and Chromium matrices, grouped `%tmp` behavior, dynamic popup sizing and optimized CI orchestration. Remaining release blockers are limited to package checksum verification, minimal visual/permission smoke, genuine normally-installed startup paths and the exact-RC packaged historical upgrade/restart smoke. PR #1 remains draft; merge and tagging remain prohibited until those gates are resolved.
