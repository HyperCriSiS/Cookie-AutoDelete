# Cookie AutoDelete Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving established cleanup behavior, user data/settings, UI compatibility and project attribution.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is the integration and validation branch for the modernization effort and is not yet release-ready.

Regular functional CI on the validated modernization heads is green (`Initial Checks`, `Tests, Builds, Coverage`, CodeQL and JavaScript/TypeScript/Actions analysis where reported). The separate `github-advanced-security` agent still fails before repository analysis because the GitHub-hosted agent requests an unsupported model; this is classified as an external GitHub service/configuration problem rather than a functional repository defect.

There are currently no repository issues and no fork releases. Several Dependabot PRs remain open and require compatibility review rather than automatic merging.

## Phase 0 — Manifest V3 modernization foundation

- [x] Add Manifest V3 build/manifest foundations for Chromium and Firefox.
- [x] Make background lifecycle and listener registration service-worker-safe.
- [x] Add browser-action abstraction for cross-browser runtime differences.
- [x] Replace timer-dependent transient state with persistence/session-backed state where required by MV3 lifecycle constraints.
- [x] Correct cleanup result accounting, including failed cookie-removal operations.
- [x] Migrate injected-script usage to the MV3 scripting API.
- [x] Replace runtime `redux-webext` dependency with local StoreBridge/UIStore infrastructure.
- [x] Add reproducible browser-specific build staging and package validation.
- [x] Restore the hardened validation workflow after P0 repair work.
- [x] Preserve the legacy popup during the MV3 migration.
- [x] Fix the legacy settings migration payload shape.
- [x] Preserve existing author, contributor, license, support, donation and project-origin information unless explicitly reviewed separately.

## Phase 1 — functional CI stabilization

- [x] Repair the malformed Jest assertion introduced during P0 work.
- [x] Repair the incomplete `otherBrowsingDataCleanup(...)` test call.
- [x] Align the legacy Firefox cleanup success-path test with the production contract that only browser-confirmed removals count.
- [x] Restore a clean functional test/build matrix.
- [x] Keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported on the validated modernization head.
- [x] Classify the separate `github-advanced-security` failure as external GitHub infrastructure/configuration: the job aborts before repository analysis because the requested model is unsupported.

## Phase 2 — migration and behavioral compatibility

- [x] Validate the Firefox legacy-profile activation path without destructive cleanup.
- [x] Validate the equivalent Chromium legacy-profile activation path without destructive cleanup.
- [x] Normalize legacy persisted settings before later-added keys are consumed while retaining the pre-normalization snapshot for side-effect comparisons.
- [x] Exercise persisted allowlist/greylist restoration through `StatePersistence` → `parsePersistedState()` → `createStore()` across a simulated service-worker restart.
- [x] Verify persisted cleanup-policy settings (`ACTIVE_MODE`, `ENABLE_GREYLIST`, `CLEAN_OPEN_TABS_STARTUP`) survive a persisted-state restart.
- [x] Add synthetic representative older Firefox/Chromium settings-profile regression coverage, preserving custom values while filling later-added defaults.
- [ ] Validate upgrades from real representative historical Cookie AutoDelete Firefox and Chromium profile/settings exports without destructive resets or silent data loss.
  - Blocked until representative historical exports are available as fixtures; synthetic legacy-profile coverage is already present but does not replace this release-gate check.
- [x] Verify allowlist/greylist matching semantics after StoreBridge/UIStore migration, including wildcard/subdomain, exact greylist and container-isolation cases.
- [x] Verify cleanup behavior on tab close, domain change and browser restart for supported policy combinations.
- [x] Verify session/transient-state restoration across realistic MV3 service-worker module restart by discarding module state while preserving `browser.storage.session`.
- [x] Verify popup/options state synchronization, including UIStore reconnect/hydration after background-worker loss and generated Firefox/Chromium entry surfaces.
- [x] Verify container/contextual-identity behavior where the browser exposes the required APIs, including capability gating when unavailable.
- [x] Add regression tests for every migration/runtime defect found during this compatibility pass.
  - [x] Audit modernization/runtime fix history against explicit tests.
  - [x] Add and validate explicit coverage for the legacy Chromium 60-second cleanup-alarm threshold.

## Phase 3 — dependency and build modernization

- [x] Migrate packaging to Archiver 8 using its ESM `ZipArchive` API while preserving Firefox/Chromium packaging behavior.
- [x] Migrate the Redux stack to Redux 5 / Redux Thunk 3 / React-Redux 8 while retaining React 17 and adapting imports/types required by the new APIs.
- [x] Remove obsolete runtime `redux-webext` and redundant Redux type packages as part of the validated Redux migration.
- [ ] Evaluate and migrate to TypeScript 7 only through the modernization branch with full install/test/build validation; do not merge the open major-version Dependabot PR directly.
  - [x] Inspect Dependabot PR #7 (`typescript` 4.9.4 → 7.0.2): it is based on `3.X.X-Branch`, not the current `modernization-p0` integration head.
  - [x] Confirm PR #7 does not provide a usable compatibility proof: both `Tests, Builds, Coverage` checks fail during `npm ci` before tests, lint or builds run; `Initial Checks` pass.
  - [x] Identify the concrete install-time blocker from PR #7 CI: `ts-jest@26.5.6` declares peer `typescript >=3.8 <5.0`, so npm rejects `typescript@7.0.2` with `ERESOLVE`. `ts-loader@9.4.2` itself accepts `typescript@*` and is not the immediate peer conflict.
  - [x] Verify the current upstream `ts-jest` line is still not TypeScript-7-compatible: upstream `ts-jest` 29.4.12 declares peer `typescript >=4.3 <7` even while supporting Jest 29/30, so merely upgrading Jest/`ts-jest` cannot satisfy the TypeScript 7 gate.
  - [x] Prove an isolated `modernization-p0` dependency probe can remove `ts-jest` and install `typescript@7.0.2`, `@swc/core@1.16.0` and `@swc/jest@0.2.39` without `--force` or `--legacy-peer-deps`; the former npm peer-install blocker is therefore avoidable by decoupling Jest transpilation from `ts-jest`.
  - [x] Identify the first TypeScript 7 compiler-config incompatibility: the existing `moduleResolution: "node"` is interpreted as removed `node10` behavior and fails with TS5108, so the TypeScript 7 migration must update/remove that legacy compiler setting.
  - [x] Identify why a plain SWC Jest transform is not behaviorally equivalent to the current compiler-backed transform: `src/typings/Global.d.ts` exposes `browserName`, `SiteDataType`, `SettingID` and `ListType` as ambient `declare const enum` values that depend on whole-program TypeScript inlining. The isolated SWC probe therefore reached Jest but produced runtime `ReferenceError`s and failed 27 of 36 suites (9 passed).
  - [ ] Replace the ambient global `declare const enum` dependency with explicit importable runtime-safe constants/enums, or choose a TypeScript-7-compatible Jest transform that preserves equivalent whole-program semantics; do not mask the problem with test-only globals.
  - [ ] Remove obsolete `ts-jest`-specific Jest configuration when the replacement transform is selected, then commit the coordinated TypeScript 7 dependency/configuration changes and regenerate the lockfile.
  - [ ] Run the complete tests, lint, typecheck, Firefox/Chromium build and package-validation matrix on the committed TypeScript 7 toolchain and fix all resulting compatibility defects before marking the migration complete.
- [ ] Review the remaining open Dependabot updates (`form-data`, `tough-cookie`, grouped npm updates) individually and integrate only those proven compatible.
- [ ] Re-check generated Firefox and Chromium package contents after all remaining dependency/toolchain migrations.

## Phase 4 — release readiness

- [ ] Produce Firefox and Chromium release-candidate packages from the same validated source state.
- [ ] Perform representative manual browser smoke tests in addition to automated CI.
- [ ] Confirm existing user settings/data survive a real release-candidate upgrade path in both target browser families.
- [ ] Confirm popup/options, cleanup triggers, allowlist/greylist and restart behavior in packaged builds rather than source/unit tests alone.
- [ ] Merge `modernization-p0` into `3.X.X-Branch` only after migration/runtime checks and release-candidate validation are green.
- [ ] Create a tagged fork release only after the integrated branch has passed the release checklist.
- [ ] Consider an upstream proposal only after the fork branch is stable and the modernization scope is documented.

## Blockers / dependencies

- Real historical Firefox/Chromium profile exports are not present as repository fixtures, so the real-world upgrade-path release gate cannot yet be marked complete.
- TypeScript 7 is no longer blocked merely by npm peer resolution once `ts-jest` is removed, but a compiler-independent SWC transform is not yet a drop-in replacement because the codebase relies on ambient `declare const enum` inlining (`browserName`, `SiteDataType`, `SettingID`, `ListType`). The TypeScript 7 path also requires replacing the removed legacy `moduleResolution=node10` configuration.
- The separate GitHub Advanced Security agent fails before repository analysis because its requested hosted model is unsupported. This is external to the codebase and does not currently block functional modernization work.
- Manual packaged-browser validation remains required before release readiness can be claimed.

## Completion status

**Not fully completed.** Manifest V3 foundations, functional CI stabilization, Archiver 8 / Redux 5 modernization and the automated migration/runtime compatibility pass are complete. The TypeScript 7 investigation has advanced from an install-time peer conflict to two concrete migration tasks: remove the obsolete `moduleResolution=node10` configuration and replace the ambient global `declare const enum` dependency (or use an equivalent TypeScript-7-compatible whole-program test transform) before the full toolchain can be committed and validated. Real historical-profile upgrade validation and packaged-browser release-candidate checks remain open.
