# Cookie AutoDelete Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving established cleanup behavior, user data/settings, UI compatibility and project attribution.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is the integration and validation branch for the modernization effort and is not yet release-ready.

The current PR head has green regular functional CI (`Initial Checks`, `Tests, Builds, Coverage`, CodeQL and JavaScript/TypeScript/Actions analysis where reported). The separate `github-advanced-security` agent still fails before repository analysis because the GitHub-hosted agent requests an unsupported model; this is classified as an external GitHub service/configuration problem rather than a functional repository defect.

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

## Phase 1 — functional stabilization and CI

- [x] Keep Initial Checks green on the validated modernization head.
- [x] Repair the malformed Jest assertion introduced during P0 work.
- [x] Repair the incomplete `otherBrowsingDataCleanup(...)` test call.
- [x] Align the legacy Firefox cleanup success-path test with the production contract that only browser-confirmed removals count.
- [x] Restore a clean functional test/build matrix; the current PR head reports successful `Tests, Builds, Coverage` checks.
- [x] Keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported on the current PR head.
- [x] Classify the separate `github-advanced-security` failure as external GitHub infrastructure/configuration: the job aborts before repository analysis because the requested model is unsupported.

## Phase 2 — migration and behavioral compatibility

- [x] Preserve non-destructive upgrades when older persisted profiles lack settings introduced by newer versions.
- [x] Guard staged legacy-profile upgrades while later-introduced site-data cleanup settings are still absent.
- [x] Validate Firefox legacy-profile activation with a later-introduced cleanup setting missing without destructive cleanup.
- [x] Validate the equivalent Chromium legacy-profile activation path without destructive cleanup.
- [x] Normalize legacy persisted settings before later-added keys are consumed while retaining the pre-normalization snapshot for side-effect comparisons.
- [x] Exercise persisted allowlist/greylist restoration through `StatePersistence` → `parsePersistedState()` → `createStore()` across a simulated service-worker restart.
- [x] Verify persisted cleanup-policy settings (`ACTIVE_MODE`, `ENABLE_GREYLIST`, `CLEAN_OPEN_TABS_STARTUP`) survive `StatePersistence` → `parsePersistedState()` → `createStore()` restart.
- [ ] Validate broader upgrades from representative existing Cookie AutoDelete Firefox and Chromium profiles/settings without destructive resets or silent data loss.
- [ ] Verify allowlist/greylist matching semantics after StoreBridge/UIStore migration, including representative domain/subdomain cases.
- [ ] Verify cleanup behavior on tab close, domain change and browser restart for the supported policy combinations.
- [ ] Verify session/transient-state restoration across realistic MV3 service-worker suspension/restart scenarios beyond the persisted-list/settings unit coverage.
- [ ] Verify popup/options interactions and state synchronization in both Firefox and Chromium builds.
- [ ] Verify container/contextual-identity behavior where the browser exposes the required APIs.
- [ ] Add regression tests for every migration/runtime defect found during this compatibility pass.

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
- [ ] Confirm existing user settings/data survive a real release-candidate upgrade path in both target browser families.
- [ ] Confirm popup/options, cleanup triggers, allowlist/greylist and restart behavior in packaged builds rather than source/unit tests alone.
- [ ] Merge `modernization-p0` into `3.X.X-Branch` only after migration/runtime checks and release-candidate validation are green.
- [ ] Create a tagged fork release only after the integrated branch has passed the release checklist.
- [ ] Consider an upstream proposal only after the fork branch is stable and the modernization scope is documented.

## Blockers / dependencies

- No known functional CI blocker exists on the current `modernization-p0` PR head; regular test/build/static-analysis checks are green.
- The separate GitHub Advanced Security agent fails before repository analysis because its requested hosted model is unsupported. This is external to the codebase and does not currently block functional modernization work.
- Major dependency upgrades must continue to be isolated and validated; the open TypeScript 7 and other Dependabot PRs are not evidence of compatibility by themselves.
- Manual packaged-browser validation is still required before release readiness can be claimed.

## Completion status

**Not fully completed.** The Manifest V3 foundation and functional CI stabilization are complete, and validated Archiver 8 / Redux 5 modernization has been integrated. The next priority is broader Firefox/Chromium profile-upgrade compatibility, followed by runtime cleanup/state/UI validation. Release readiness remains open.