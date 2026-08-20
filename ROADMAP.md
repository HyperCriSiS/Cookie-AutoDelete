# Cookie AutoDelete Modernization Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving existing cleanup semantics, user data, privacy behavior, Firefox-specific capabilities and Chromium compatibility. Changes must remain attributable, testable and reversible; dependency/toolchain major upgrades are integrated only after compatibility has been demonstrated.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is the integration and validation branch for the modernization effort and is not yet release-ready.

Regular functional CI has been green on validated modernization heads (`Initial Checks`, `Tests, Builds, Coverage`, CodeQL and JavaScript/TypeScript/Actions analysis where reported). The regular CI now includes an explicit TypeScript 7 `npm run typecheck` gate in addition to tests, lint and build. The separate `github-advanced-security` agent can fail before repository analysis because the GitHub-hosted agent requests an unsupported model; this is classified as an external GitHub service/configuration problem rather than a functional repository defect.

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
- [x] Complete the coordinated TypeScript 7 migration without blindly merging the original major-version Dependabot branch.
  - [x] Use TypeScript 7.0.2 for the authoritative application typecheck via `@typescript/native` while retaining the official `@typescript/typescript6@6.0.2` compatibility package only for JavaScript compiler-API consumers that cannot use the TS7 native compiler API.
  - [x] Replace legacy `moduleResolution: "node"` with `bundler` resolution and move the compiler module target to `esnext`.
  - [x] Replace `web-ext-types@3.2.1` with maintained `@types/firefox-webext-browser@143.0.0` plus the smallest explicit local compatibility layer needed by Cookie AutoDelete; preserve Firefox-specific APIs and avoid a broad `any` browser shim.
  - [x] Retype CAD-internal cookie paths around the cross-browser `CadCookie` shape so Chromium cookies may omit Firefox-only fields such as `firstPartyDomain`.
  - [x] Keep the React 17 runtime while validating the React-Redux 8 / Redux 5 declaration boundary under TS7; the deliberate `skipLibCheck` boundary isolates third-party declaration incompatibilities while CAD application/test use-sites remain checked.
  - [x] Replace ambient compile-time enum dependencies with explicit importable runtime-safe enums, including `browserName`, `SiteDataType`, `SettingID`, `ListType`, `ReasonClean`, `OpenTabStatus`, `EventListenerAction` and `ReasonKeep`.
  - [x] Modernize Jest declarations (`@types/jest@30.0.0`, `@types/jest-when@3.5.5`) and removed matcher aliases needed by the TS7 path.
  - [x] Remove `ts-jest` and its obsolete Jest configuration. Jest now uses the repository-local `tools/jest-typescript-transformer.cjs`, backed by the official TypeScript 6 compatibility compiler API, while `tsc --noEmit` remains the separate authoritative TS7 typecheck.
  - [x] Commit the coordinated dependency/compiler/Jest configuration and lockfile changes. Production migration commit: `087498d1` (`chore: migrate toolchain to TypeScript 7`).
  - [x] Validate the committed migration with TypeScript 7 typecheck, the full Jest suite (36 suites / 568 tests), ESLint, Prettier, Firefox build, Chromium build and production package validation.
  - [x] Remove obsolete TS7 probe workflows and `.tmp-ts7-*` diagnostic artifacts after migration completion.
  - [x] Make TS7 compatibility a permanent regular-CI gate via `npm run typecheck`.
  - [x] Restore the missing Bootstrap 4 peer lock entry `popper.js@1.16.1` from the existing upstream lock metadata so ordinary `npm ci` is reproducible again; one-shot validation run `32309151986` passed locked install, TS7 typecheck, tests, lint and production build, then removed its temporary repair workflow.
- [ ] Review remaining open Dependabot updates individually and integrate only those proven compatible.
  - [x] Integrate `github/codeql-action` v4 from Dependabot PR #22 after confirming its isolated PR checks are green; apply the same change directly to `modernization-p0` rather than merging the stale-base Dependabot branch.
  - [x] Integrate `actions/checkout` v7 independently from stale-base Dependabot PR #20 across all six active workflow references. Final branch state `2f891142` is green in regular CI: push `32310456365`, `pull_request_target` `32310458651`, and pull request `32310460633`; the temporary integration workflow was removed.
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
- The separate GitHub Advanced Security agent can fail before repository analysis because its requested hosted model is unsupported. This is external to the codebase and does not currently block functional modernization work.
- Manual packaged-browser validation remains required before release readiness can be claimed.

## Completion status

**Not fully completed.** Manifest V3 foundations, functional CI stabilization, the automated migration/runtime compatibility pass, Archiver 8 / Redux 5 modernization, maintained Firefox WebExtension typings and the coordinated TypeScript 7 migration are complete and verified. TypeScript 7 is now protected by the regular CI typecheck, `ts-jest` and temporary TS7 probes are removed, and the repaired dependency lock again supports reproducible `npm ci`. Phase 3 still requires individual review of the remaining Dependabot updates and a final generated-package content audit. Real historical-profile upgrade validation and packaged-browser release-candidate/manual-browser checks remain open.