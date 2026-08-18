# Cookie AutoDelete Modernization Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving existing user data, cleanup semantics, browser-specific behavior and upstream project attribution. Modernization must remain reviewable, regression-tested and releasable for both Firefox and Chromium without destructive migration behavior.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is the integration and validation branch for the modernization effort and is not yet release-ready.

Regular functional CI on the modernization PR has been green on validated heads. The separate `github-advanced-security` agent has failed before repository analysis because its hosted model request is unsupported; this is treated as an external GitHub service/configuration issue rather than a functional repository defect.

There are currently no repository issues and no fork releases. Remaining Dependabot updates require compatibility review rather than automatic merging.

## Phase 0 — Manifest V3 modernization foundation

- [x] Add Manifest V3 build/manifest foundations for Chromium and Firefox.
- [x] Make background lifecycle and listener registration service-worker-safe.
- [x] Replace delayed `redux-webext` background/UI bridging with a local runtime-message StoreBridge/UIStore implementation.
- [x] Package browser builds without mutating source files.
- [x] Add browser-specific unpacked MV3 development builds.
- [x] Validate generated browser packages before archiving and release staging.
- [x] Centralize browser capability decisions instead of browser-name checks where practical.
- [x] Add partitioned-cookie capability handling for modern Chromium while retaining compatibility with older supported Chromium versions.
- [x] Replace runtime `shortid` use with a local UUID generator and remove obsolete compatibility/build aliases.
- [x] Add versioned expression backup foundations and explicit Firefox-container import mapping safeguards.
- [x] Pin release actions to reviewed SHAs and align CI/release Node version handling.
- [x] Fix the legacy settings migration payload shape.
- [x] Preserve existing author, contributor, license, support, donation and project-origin information unless explicitly reviewed separately.

## Phase 1 — functional stabilization and CI

- [x] Keep Initial Checks green on the validated modernization head.
- [x] Repair the malformed Jest assertion introduced during P0 work.
- [x] Repair the incomplete `otherBrowsingDataCleanup(...)` test call.
- [x] Align the legacy Firefox cleanup success-path test with the production contract that only browser-confirmed removals count.
- [x] Restore a clean functional test/build matrix; validated PR heads report successful `Tests, Builds, Coverage` checks.
- [x] Keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported on validated PR heads.
- [x] Classify the separate `github-advanced-security` failure as external GitHub infrastructure/configuration: the job aborts before repository analysis because the requested model is unsupported.

## Phase 2 — migration and behavioral compatibility

- [x] Preserve non-destructive upgrades when older persisted profiles lack settings introduced by newer versions.
- [x] Guard staged legacy-profile upgrades while later-introduced site-data cleanup settings are still absent.
- [x] Validate Firefox legacy-profile activation with a later-introduced cleanup setting missing without destructive cleanup.
- [x] Validate the equivalent Chromium legacy-profile activation path without destructive cleanup.
- [x] Normalize legacy persisted settings before later-added keys are consumed while retaining the pre-normalization snapshot for side-effect comparisons.
- [x] Exercise persisted allowlist/greylist restoration through `StatePersistence` → `parsePersistedState()` → `createStore()` across a simulated service-worker restart.
- [x] Verify persisted cleanup-policy settings (`ACTIVE_MODE`, `ENABLE_GREYLIST`, `CLEAN_OPEN_TABS_STARTUP`) survive `StatePersistence` → `parsePersistedState()` → `createStore()` restart.
- [ ] Validate broader upgrades from representative existing Cookie AutoDelete Firefox and Chromium profiles/settings without destructive resets or silent data loss. Synthetic legacy Firefox/Chromium profile-shape coverage is green, but representative real exported profiles are not present in the repository.
- [x] Verify allowlist/greylist matching semantics after StoreBridge/UIStore migration, including wildcard subdomains, exact greylist rules, Firefox container isolation and background-pushed state updates.
- [x] Verify cleanup behavior on tab close, domain change and browser restart for supported policy combinations. Existing regression coverage verifies tab-close cleanup scheduling/direct cleanup and per-tab state removal, session-backed domain-change detection (including worker restart), and restart/greylist/open-tab cleanup semantics; background listener wiring and startup dispatch paths were re-checked against the current branch.
- [x] Verify session/transient-state restoration across realistic MV3 service-worker suspension/restart scenarios beyond persisted-list/settings unit coverage. `MV3WorkerRestart.regression.spec.ts` discards and reloads the Jest module graph while preserving `browser.storage.session`, proving per-tab domain state is restored and cleanup still fires after worker-memory loss.
- [x] Verify popup/options interactions and state synchronization in both Firefox and Chromium builds. Existing UIStore/StoreBridge coverage verifies initial state hydration, UI dispatch, pushed background state and subscriber updates; `UIStoreReconnect.regression.spec.ts` verifies disconnect/reconnect state refresh after background-worker loss, while `UIBuildSurface.regression.spec.js` and build-stage validation confirm both generated browser targets keep popup/options entry points and bundles wired. Packaged manual interaction remains part of Phase 4.
- [x] Verify container/contextual-identity behavior where the browser exposes the required APIs. `BrowserCapabilities` detects the API dynamically and gates listener registration when unavailable; existing `ContextualIdentitiesEvents` and `ContextualIdentityService` regression coverage exercises create/update/remove behavior and container naming when the API is present, while Chromium legacy-profile coverage verifies unsupported container settings are disabled.
- [ ] Add regression tests for every migration/runtime defect found during this compatibility pass.
  - [x] Audit modernization/runtime fix history against explicit tests: context-menu worker state, persisted cleanup alarms/domain state, StoreBridge pass-through/readiness, persisted-state validation, expression IDs, browser capability gates, IPv6 normalization, partitioned-cookie cleanup/domain enumeration, container backup metadata/import planning, plugin-data capability gating and confirmed cookie-removal accounting all have direct regression coverage in their fix or paired test commits.
  - [x] Identify the remaining uncovered runtime compatibility fix: commit `46d431b` raised the precise short-delay cutoff from 30 to 60 seconds for the supported Chrome 102–119 range without an explicit threshold regression test.
  - [ ] Validate the new `AlarmEvents.spec.ts` regression added in `fab7147f`, which pins `RELIABLE_ALARM_DELAY_MS` at 60 seconds; Initial Checks are green, full test/build/static-analysis CI is still running on this head.

## Phase 3 — dependency and build modernization

- [x] Review and synchronize dependency updates that were independently validated against the modernization branch instead of blindly merging the original Dependabot branches.
- [x] Update the verified GitHub Actions dependencies used by the modernization workflows.
- [x] Migrate packaging to Archiver 8 using its ESM `ZipArchive` API while preserving Firefox/Chromium packaging behavior.
- [x] Migrate the Redux stack to Redux 5 / Redux Thunk 3 / React-Redux 8 while retaining React 17 and adapting imports/types required by the new APIs.
- [x] Remove obsolete runtime `redux-webext` and redundant Redux type packages as part of the validated Redux migration.
- [ ] Evaluate and migrate to TypeScript 7 only on an isolated branch with full test/build validation; do not merge the open major-version Dependabot PR directly without compatibility work.
- [ ] Review the remaining open Dependabot updates (`form-data`, `tough-cookie`, grouped npm updates) individually and integrate only those proven compatible.
- [ ] Re-check generated Firefox and Chromium package contents after all remaining dependency/toolchain migrations.

## Phase 4 — release readiness

- [ ] Produce Firefox and Chromium release-candidate packages from the same validated source state.
- [ ] Perform representative manual browser smoke tests in addition to automated CI.
- [ ] Confirm existing user settings/data survive the real release-candidate upgrade path in both browser families.
- [ ] Verify packaged popup/options, cleanup, allowlist/greylist and restart behavior in both browser families.
- [ ] Merge `modernization-p0` into `3.X.X-Branch` only after required checks and migration validation are green.
- [ ] Create a tagged fork release only after the release checklist is complete.
- [ ] Consider an upstream proposal only after the fork branch is stable and the modernization scope is documented.

## Blockers / dependencies

- No known functional CI blocker exists on validated `modernization-p0` heads.
- The separate GitHub Advanced Security agent can fail before repository analysis because its requested hosted model is unsupported; this is external to the codebase.
- Major dependency upgrades must remain isolated and validated.
- Representative real exported legacy Firefox/Chromium profiles are not present in the repository, so the real-profile upgrade-validation item remains blocked until suitable fixtures are available.
- Manual packaged-browser validation is still required before release readiness can be claimed.

## Completion status

**Not fully completed.** Manifest V3 foundations, functional CI stabilization, Archiver 8 / Redux 5 modernization, synthetic legacy-profile compatibility coverage, StoreBridge/UIStore list matching, cleanup-trigger compatibility, module-reset MV3 worker restart coverage, popup/options source-level synchronization and contextual-identity compatibility are validated. The migration/runtime regression audit found one previously uncovered compatibility threshold and added a targeted regression in `fab7147f`; full CI for that test is pending before Phase 2 regression coverage can be closed. Real legacy-profile export validation remains blocked until representative exports are available, and dependency/release-candidate work remains open.
