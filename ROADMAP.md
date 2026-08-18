# Cookie AutoDelete Modernization Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving existing cleanup semantics, user data, privacy behavior, Firefox-specific capabilities and Chromium compatibility. Changes must remain attributable, testable and reversible; dependency/toolchain major upgrades are integrated only after compatibility has been demonstrated.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is the integration and validation branch for the modernization effort and is not yet release-ready.

Regular functional CI has been green on validated modernization heads (`Initial Checks`, `Tests, Builds, Coverage`, CodeQL and JavaScript/TypeScript/Actions analysis where reported). The separate `github-advanced-security` agent can fail before repository analysis because the GitHub-hosted agent requests an unsupported model; this is classified as an external GitHub service/configuration problem rather than a functional repository defect.

There are currently no repository issues and no fork releases. Remaining Dependabot updates require compatibility review rather than automatic merging.

## Phase 0 — Manifest V3 modernization foundation

- [x] Add Manifest V3 build/manifest foundations for Chromium and Firefox.
- [x] Make background lifecycle and listener registration service-worker-safe.
- [x] Add session-backed state persistence needed for MV3 worker restart behavior.
- [x] Introduce StoreBridge/UIStore synchronization for extension UI state.
- [x] Preserve cleanup/list behavior across the initial MV3 migration.
- [x] Fix the legacy settings migration payload shape.
- [x] Preserve existing author, contributor, license, support, donation and project-origin information unless explicitly reviewed separately.

## Phase 1 — functional stabilization and CI

- [x] Keep Initial Checks green on validated modernization heads.
- [x] Repair malformed/incomplete Jest assertions and cleanup-test calls introduced during P0 work.
- [x] Align the legacy Firefox cleanup success-path test with the production contract that only browser-confirmed removals count.
- [x] Restore a clean functional test/build matrix and keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported.
- [x] Classify the separate `github-advanced-security` failure as external GitHub infrastructure/configuration because it aborts before repository analysis.

## Phase 2 — migration and behavioral compatibility

- [x] Preserve non-destructive upgrades when older persisted profiles lack settings introduced by newer versions.
- [x] Guard staged legacy-profile upgrades while later-introduced site-data cleanup settings are still absent.
- [x] Validate Firefox legacy-profile activation with a later-introduced cleanup setting missing without destructive cleanup.
- [x] Validate the equivalent Chromium legacy-profile activation path without destructive cleanup.
- [x] Normalize legacy persisted settings before later-added keys are consumed while retaining the pre-normalization snapshot for side-effect comparisons.
- [x] Add broader synthetic regression coverage for representative older Firefox/Chromium settings structures while preserving existing custom values.
- [ ] Validate upgrades from real representative historical Cookie AutoDelete Firefox and Chromium profile/settings exports without destructive resets or silent data loss.
- [x] Verify allowlist/greylist matching semantics after StoreBridge/UIStore migration, including wildcard/subdomain, exact greylist and container-sensitive cases.
- [x] Verify cleanup behavior on tab close, domain change and browser restart for supported policy combinations.
- [x] Verify persisted allowlist/greylist and cleanup-policy settings survive `StatePersistence` → `parsePersistedState()` → `createStore()` restart.
- [x] Verify session/transient tab-domain state restores across a realistic simulated MV3 service-worker module restart and still triggers the expected cleanup.
- [x] Verify popup/options state synchronization and reconnect behavior, including generated Firefox/Chromium manifest entry points.
- [x] Verify container/contextual-identity behavior is capability-gated and functions where the browser exposes the required APIs.
- [x] Audit migration/runtime defects found during the compatibility pass for explicit regression coverage; add the previously missing legacy Chromium 60-second alarm-threshold regression.

## Phase 3 — dependency and build modernization

- [x] Review and synchronize dependency updates that were independently validated against the modernization branch instead of blindly merging Dependabot branches.
- [x] Update verified GitHub Actions dependencies used by modernization workflows.
- [x] Migrate packaging to Archiver 8 using its ESM `ZipArchive` API while preserving Firefox/Chromium packaging behavior.
- [x] Migrate the Redux stack to Redux 5 / Redux Thunk 3 / React-Redux 8 while retaining React 17 and adapting imports/types required by the new APIs.
- [x] Remove obsolete runtime `redux-webext` and redundant Redux type packages as part of the validated Redux migration.
- [ ] Complete the coordinated TypeScript 7 migration; do not merge the open major-version Dependabot PR directly without compatibility work.
  - [ ] Resolve TypeScript 7 WebExtension runtime typing compatibility before committing the compiler migration. Verified with TypeScript 7.0.2: legacy `moduleResolution: node` is removed (`TS5108`); both `node16` and `bundler` resolution expose `@types/firefox-webext-browser@143.0.0` as a namespace that cannot be used as the runtime `browser` value (`TS2708`). A central synthetic `browser` value declaration was rejected because it drops/overrides important API types (`Tab`, `runtime`, `cookies.OnChangedCause`, etc.). A second probe using the maintained `@types/webextension-polyfill` as a typed runtime-value source also failed for all tested global bridge forms (`typeof import`, default import, and `import = require`) under TS7, so that package cannot simply be overlaid as an ambient `browser` value without further adaptation. Do not use an `any`-typed browser shim. Next evaluate an explicit runtime adapter/import boundary or a narrowly typed compatibility interface that preserves Firefox-specific namespace types. SWC candidate versions established by the probe: `@swc/core@1.16.0` and `@swc/jest@0.2.39`; Jest/lint/build validation remains pending until the typing boundary compiles cleanly.
  - [x] Confirm direct TypeScript 7 installation is blocked by legacy `ts-jest@26.5.6` peer constraints rather than application code.
  - [x] Confirm current upstream `ts-jest` still excludes TypeScript 7, so a plain `ts-jest` upgrade is not a viable TS7 path.
  - [x] Confirm TypeScript 7 can be installed with a compiler-independent Jest transform such as SWC without `--force` or `--legacy-peer-deps`.
  - [x] Identify the old `moduleResolution: "node"` / removed `node10` behavior as the first compiler-config gate and prove modern module-resolution settings progress beyond it.
  - [x] Identify why a plain SWC Jest transform is not behaviorally equivalent: ambient `declare const enum` globals (`browserName`, `SiteDataType`, `SettingID`, `ListType`, `ReasonClean`, `OpenTabStatus`) depend on TypeScript whole-program inlining.
  - [x] Probe TypeScript 7 whole-program compilation after clearing the module-resolution gate and isolate stale declaration-ecosystem failures from stricter application-level errors.
  - [x] Confirm `web-ext-types@3.2.1` is the browser-typing source currently used through `typeRoots` and that its published upgrade path is exhausted.
  - [x] Confirm React-17 type-only updates do not solve the `react-redux@8.1.3` / `redux@5.0.1` TypeScript-7 `Action<unknown>` vs. `Action<string>` declaration mismatch.
  - [x] Probe `@types/firefox-webext-browser` under TypeScript 7 with the legacy `src/typings/Webext.d.ts` removed. The maintained declarations cover the required Firefox namespaces, including contextual identities, but are not a drop-in replacement. Remaining browser-specific compile gaps are limited to compatibility-name/shape differences such as `tabs.TabChangeInfo`, `cookies.CookieProperties`, `cookies.CookiePartitionKey` (maintained type: `PartitionKey`), contextual-identity change-info naming, legacy `Tab.selected`, and cookie `firstPartyDomain` expectations.
  - [x] Replace/adapt `web-ext-types@3.2.1` using `@types/firefox-webext-browser` as the maintained base plus the smallest explicit local compatibility augmentation needed by Cookie AutoDelete; preserve Firefox-specific APIs and cross-browser behavior rather than reintroducing the old broad declaration file.
    - [x] Validate the minimal compatibility-layer shape against the maintained Firefox typings: `CookiePartitionKey` can alias `PartitionKey`, `TabChangeInfo` can extend `_OnUpdatedChangeInfo`, legacy `Tab.selected` and contextual-identity change-info need only small local augmentations, and the generic event helper can be expressed structurally without retaining `web-ext-types`.
    - [x] Retype CAD-internal cookie paths and representative fixtures to the project cross-browser cookie shape so Chromium cookies may omit `firstPartyDomain`; the `CadCookie` migration was committed as `ca5a829e` after tests, lint and webpack build passed.
    - [x] Re-run the maintained `@types/firefox-webext-browser@143.0.0` probe after the `CadCookie` migration and confirm that the previous cookie/`firstPartyDomain` diagnostics are gone.
    - [x] Complete the maintained-typing dependency swap: replace `web-ext-types@3.2.1` with `@types/firefox-webext-browser@143.0.0`, add the minimal compatibility augmentation, update `ContextualIdentity` fixtures for `iconUrl`/`colorCode`, handle an absent result from `browser.tabs.getCurrent()` in settings, and enable `skipLibCheck` only to isolate legacy third-party declaration incompatibilities while application use-sites remain checked. Commit `736cdcbe` passed `tsc --noEmit`, the full Jest suite, ESLint, Firefox webpack and Chromium webpack before the temporary validation workflow was removed.
  - [x] Resolve the `react-redux@8.1.3` / `redux@5.0.1` TypeScript-7 declaration incompatibility without unnecessarily changing the React 17 runtime major. The refined TS7 boundary probe (`0585c138`, workflow run 32158487771) confirmed that the existing deliberate `skipLibCheck` boundary suppresses only direct third-party declaration incompatibilities while a TypeScript 7.0.2 whole-program compile reports no CAD application/test diagnostics and no remaining TypeScript diagnostics. No React runtime-major upgrade is required for this migration step.
  - [x] Replace the ambient global `declare const enum` dependency with explicit importable runtime-safe enums. `browserName`, `SiteDataType`, `SettingID`, `ListType`, `ReasonClean`, and `OpenTabStatus` now live as importable runtime values in `src/typings/Enums.ts`; application/test use-sites import them explicitly, while declaration files retain type aliases for compatibility. Production commit `86ec2fe8` passed repository typecheck, an isolated TypeScript 7.0.2 compile, the full Jest suite (37 suites / 409 tests), ESLint, Prettier, Firefox build, and Chromium build in validation run 32171063287.
  - [x] Modernize Jest/type declarations for the TS7 path: `@types/jest@30.0.0` and `@types/jest-when@3.5.5` are pinned, removed matcher aliases were migrated (`toHaveBeenCalledTimes`, `toThrow`), and repository typecheck, full Jest suite, lint, Firefox build, and Chromium build passed in validation run 32164303469. The isolated TS7 diagnostic no longer reports Jest declaration errors; remaining TS7 diagnostics belong to the separately tracked WebExtension/module-resolution and transform migration.
  - [ ] Remove obsolete `ts-jest`-specific Jest configuration when the replacement transform is selected, commit the coordinated TypeScript 7 dependency/configuration changes and regenerate the lockfile.
  - [ ] Run the complete tests, lint, typecheck, Firefox/Chromium build and package-validation matrix on the committed TypeScript 7 toolchain and fix all resulting compatibility defects before marking the migration complete.
- [ ] Review remaining open Dependabot updates individually and integrate only those proven compatible.
  - [x] Integrate `github/codeql-action` v4 from Dependabot PR #22 after confirming its isolated PR checks are green; apply the same change directly to `modernization-p0` rather than merging the stale-base Dependabot branch.
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

- Real historical Firefox/Chromium profile or settings exports are not present as repository fixtures, so the real-world upgrade-path release gate cannot yet be marked complete.
- TypeScript 7.0.2 is blocked at the WebExtension runtime typing boundary under supported TS7 module resolution. Legacy `moduleResolution: node` is removed (`TS5108`); with `node16` or `bundler`, `@types/firefox-webext-browser@143.0.0` exposes the Firefox API namespace but not a usable runtime `browser` value (`TS2708`). A synthetic global value declaration was tested and rejected because it degrades/overrides important Firefox API types. A typed compatibility solution is required before the coordinated TS7/SWC migration can be committed.
- The separate GitHub Advanced Security agent can fail before repository analysis because its requested hosted model is unsupported. This is external to the codebase and does not currently block functional modernization work.
- Manual packaged-browser validation remains required before release readiness can be claimed.

## Completion status

**Not fully completed.** Manifest V3 foundations, functional CI stabilization, Archiver 8 / Redux 5 modernization and the automated migration/runtime compatibility pass are complete. The CAD cross-browser cookie retyping and the maintained `@types/firefox-webext-browser@143.0.0` dependency migration are complete and verified. The React-Redux/Redux TypeScript-7 declaration boundary is now verified clean without a React runtime-major change. The next TypeScript/toolchain step is resolving the TypeScript 7 WebExtension runtime-typing boundary; after that, obsolete `ts-jest` configuration can be removed and the coordinated TypeScript 7/SWC toolchain can be committed and fully validated. Real historical-profile upgrade validation and packaged-browser release-candidate checks remain open.