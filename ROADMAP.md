# Cookie AutoDelete Modernization Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving existing user data, cleanup semantics, project attribution and browser compatibility.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is the integration and validation branch for the modernization effort and is not yet release-ready.

Regular functional CI on the modernization PR is green on the latest validated head: `Initial Checks`, `Tests, Builds, Coverage`, CodeQL and the JavaScript/TypeScript/Actions analyses succeed. The separate `github-advanced-security` agent still fails before repository analysis because its hosted model request is unsupported; this is treated as an external GitHub service/configuration issue rather than a functional repository defect.

There are currently no repository issues and no fork releases. Remaining Dependabot updates require compatibility review rather than automatic merging.

## Phase 0 — Manifest V3 modernization foundation

- [x] Add Manifest V3 build/manifest foundations for Chromium and Firefox.
- [x] Make background lifecycle and listener registration service-worker-safe.
- [x] Add state persistence/hydration foundations needed for MV3 worker restarts.
- [x] Add StoreBridge/UIStore foundations for UI/background state synchronization.
- [x] Add browser-capability gating for APIs that differ between targets.
- [x] Preserve existing author, contributor, license, support, donation and project-origin information unless explicitly reviewed separately.

## Phase 1 — functional stabilization and CI

- [x] Keep Initial Checks green on validated modernization heads.
- [x] Repair malformed/incomplete Jest tests introduced during P0 work.
- [x] Align legacy Firefox cleanup success-path coverage with browser-confirmed removal accounting.
- [x] Restore a clean functional test/build matrix.
- [x] Keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported.
- [x] Classify the separate `github-advanced-security` failure as external GitHub infrastructure/configuration.

## Phase 2 — migration and behavioral compatibility

- [x] Preserve non-destructive upgrades when older persisted profiles lack settings introduced by newer versions.
- [x] Guard staged legacy-profile upgrades while later-introduced site-data cleanup settings are absent.
- [x] Validate Firefox legacy-profile activation with a later-introduced cleanup setting missing without destructive cleanup.
- [x] Validate the equivalent Chromium legacy-profile activation path without destructive cleanup.
- [x] Normalize legacy persisted settings before later-added keys are consumed while retaining the pre-normalization snapshot for side-effect comparisons.
- [x] Exercise persisted allowlist/greylist restoration through `StatePersistence` → `parsePersistedState()` → `createStore()` across a simulated service-worker restart.
- [x] Verify persisted cleanup-policy settings (`ACTIVE_MODE`, `ENABLE_GREYLIST`, `CLEAN_OPEN_TABS_STARTUP`) survive the same restart path.
- [x] Add representative Firefox/Chromium legacy-profile regression coverage proving multiple later settings are restored while existing customized values and older setting shapes are preserved.
- [ ] Validate broader upgrades from representative real Cookie AutoDelete Firefox and Chromium profile/settings exports without destructive resets or silent data loss.
- [x] Verify allowlist/greylist matching semantics after StoreBridge/UIStore migration, including representative domain/subdomain and container-scoped cases.
- [ ] Verify cleanup behavior on tab close, domain change and browser restart for supported policy combinations.
- [ ] Verify session/transient-state restoration across realistic MV3 service-worker suspension/restart scenarios beyond persisted-list/settings unit coverage.
- [ ] Verify popup/options interactions and state synchronization in both Firefox and Chromium builds.
- [ ] Verify container/contextual-identity behavior where the browser exposes the required APIs.
- [ ] Add regression tests for every migration/runtime defect found during this compatibility pass.

## Phase 3 — dependency and build modernization

- [x] Review and synchronize dependency updates independently validated against the modernization branch instead of blindly merging Dependabot branches.
- [x] Update verified GitHub Actions dependencies used by modernization workflows.
- [x] Migrate packaging to Archiver 8 using its ESM `ZipArchive` API while preserving Firefox/Chromium packaging behavior.
- [x] Migrate the Redux stack to Redux 5 / Redux Thunk 3 / React-Redux 8 while retaining React 17 and adapting imports/types required by the new APIs.
- [x] Remove obsolete runtime `redux-webext` and redundant Redux type packages.
- [ ] Evaluate and migrate to TypeScript 7 only on an isolated branch with full test/build validation; do not merge the open major-version Dependabot PR directly without compatibility work.
- [ ] Review remaining open Dependabot updates (`form-data`, `tough-cookie`, grouped npm updates) individually and integrate only those proven compatible.
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

- No known functional CI blocker exists on the latest validated `modernization-p0` head.
- Real exported legacy profiles are not present in the repository, so the real-profile upgrade item cannot be completed from repository evidence alone; synthetic legacy-shape regression coverage is already green.
- The separate GitHub Advanced Security agent can fail before repository analysis because its requested hosted model is unsupported; this is external to the codebase.
- Major dependency upgrades must remain isolated and validated.
- Manual packaged-browser validation is still required before release readiness can be claimed.

## Completion status

**Not fully completed.** Manifest V3 foundations, functional CI stabilization, Archiver 8 / Redux 5 modernization, synthetic legacy-profile compatibility coverage and StoreBridge/UIStore allowlist/greylist matching regression coverage are validated. The next priority is cleanup behavior on tab close, domain change and browser restart. Real legacy-profile export validation remains blocked until representative exports are available, and release-candidate testing remains open.
