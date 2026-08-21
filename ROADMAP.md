# Cookie AutoDelete Modernization Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving existing cleanup semantics, user data, privacy behavior, Firefox-specific capabilities and Chromium compatibility. Changes must remain attributable, testable and reversible; dependency/toolchain major upgrades are integrated only after compatibility has been demonstrated.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is the integration and validation branch for the modernization effort and is not yet release-ready.

The pinned release-candidate source commit is `53209f36`, whose regular functional CI is green in all three event paths: push `32439375945`, `pull_request_target` `32439377479`, and pull request `32439378775`. Pull-request CI produced replacement RC artifact `9431860563` (GitHub wrapper digest `sha256:891232f8281af65ede7cb80e1da7fe1911d11b55eea67a614408dcf01f29cc41`) containing the same-source Chromium ZIP, Firefox XPI and `SHA256SUMS.txt`. That exact source passed TypeScript 7 typecheck, 37/37 Jest suites (577/577 tests), lint, Firefox archive validation (60 files), Chromium archive validation (61 files), and Firefox ZIP/XPI byte identity. The branch may advance through documentation-only commits without invalidating this pinned candidate; any change to the base or candidate-affecting runtime/source, manifest, build/packaging, dependency or toolchain state requires a replacement RC and repetition of the affected gates. PR #1 is currently mergeable/clean against `3.X.X-Branch` base `81b259c1`. The separate `github-advanced-security` agent still fails before repository analysis because the GitHub-hosted agent requests an unsupported model; this remains classified as an external GitHub service/configuration problem rather than a functional repository defect.

There are currently no repository issues and no fork releases. All Dependabot PRs that were open during the modernization dependency pass have now either been integrated independently from the current modernization graph or closed as superseded; only draft modernization PR #1 remains open.

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
- [x] Validate published historical Cookie AutoDelete release-state schemas from 3.0.2, 3.4.0 and 3.6.0 through the production persisted-state migration path for both Firefox and Chromium. Release-derived fixtures were added in `42ff2052` and made immutable in `f8b996a3`; regular push/PR CI is green. This supplements but does not replace the still-open real user export/profile gate below.
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
- [x] Review remaining open Dependabot updates individually and integrate only those proven compatible.
  - [x] Integrate `github/codeql-action` v4 from Dependabot PR #22 after confirming its isolated PR checks are green; apply the same change directly to `modernization-p0` rather than merging the stale-base Dependabot branch.
  - [x] Integrate `actions/checkout` v7 independently from stale-base Dependabot PR #20 across all six active workflow references. Final branch state `2f891142` is green in regular CI: push `32315952478`, `pull_request_target` `32315954064`, and pull request `32315955984`; the temporary integration workflow was removed.
  - [x] Integrate `peter-evans/slash-command-dispatch` v5 independently from Dependabot PR #19. Commit `adc875af` is green in regular CI: push `32316163722`, `pull_request_target` `32316165646`, and pull request `32316166615`.
  - [x] Integrate `peter-evans/create-or-update-comment` v5 independently from Dependabot PR #23 after verifying the existing workflow inputs remain supported. Commit `231a5f5b` is green in regular CI: push `32317215811`, `pull_request_target` `32317217033`, and pull request `32317219531`.
  - [x] Close superseded Dependabot PRs #7, #19, #20, #22 and #23 after their compatible changes were either incorporated through the coordinated migration or applied directly to `modernization-p0`.
  - [x] Integrate Codecov Action v7 independently from Dependabot PR #24 after confirming the repository's coverage/override inputs remain supported. Commit `e599d4a8` was exercised by one-shot validation run `32317530386`; the helper was removed in final state `ff584734`, whose regular CI is green: push `32319129811`, `pull_request_target` `32319131089`, and pull request `32319132676`.
  - [x] Update Webpack from the current modernization dependency graph to `5.109.2` instead of merging stale-base Dependabot PR #21 and its obsolete lockfile. Final state `e5263cce` is green in regular CI: push `32319617684`, `pull_request_target` `32319619166`, and pull request `32319621248`; PR #21 is closed as superseded.
  - [x] Resolve the remaining security dependency PRs from the current modernization lockfile instead of merging their stale dependency graph. `copy-webpack-plugin` is now `14.0.0`, with the targeted transitive fixes including `serialize-javascript 7.1.0`, `lodash 4.18.1`, `tough-cookie 4.1.4`, `form-data 3.0.5`, `ws 7.5.13`, `minimatch 3.1.5` and `js-yaml 3.15.1`. Final state `756e64ba` is green in regular CI: push `32320110348`, `pull_request_target` `32320111670`, and pull request `32320112760`; superseded PRs #13, #14 and #15 are closed with rationale recorded.

  - [x] Integrate the later compatible dependency updates from the current modernization graph instead of merging stale-base Dependabot branches: `webextension-polyfill` is now `0.12.0` and `ts-loader` is `9.6.2`. SemVer-safe lockfile remediation was also applied before the final test-toolchain migration.
  - [x] Complete the coordinated Jest 30 migration rather than accepting the stale grouped dependency proposal. Current test tooling uses `jest@30.4.2`, `jest-environment-jsdom@30.4.1`, `jest-when@4.0.3` and the repository-local TypeScript transformer. Compatibility work replaced obsolete `jest-when` `.clearMocks()` calls with `.mockReset()` and fixed an argument-mismatched `TabEvents` mock that leaked into real asynchronous cookie-domain code. Validation run `32437006947` passed the full suite, TS7 typecheck, lint and both production builds; the candidate dependency graph reported **zero** findings in both full `npm audit` and `npm audit --omit=dev`. Production migration commit: `5fcd4a4d`.
  - [x] Resolve Dependabot PRs #25–#31 without unsafe wholesale merges. PRs #28 (`webextension-polyfill`), #29 (`ts-loader`) and #30 (`softprops/action-gh-release`) were superseded by independently validated modernization changes; grouped PR #31 was superseded by the targeted security/Jest/toolchain work. Bootstrap 5 (#25), React DOM 19 (#26) and `@typescript-eslint` 8 (#27) were deliberately deferred as coordinated post-RC major migrations because partial adoption would make the current Bootstrap 4 / React 17 / ESLint 7 stacks inconsistent. All seven PRs are closed with rationale recorded; only draft PR #1 remains open.
- [x] Re-check generated Firefox and Chromium package contents after all remaining dependency/toolchain migrations. Permanent archive validation was added in `e036529b`: the build now compares the actual Archiver file entries against the validated stage contents, rejects missing/unexpected/duplicate/empty output, and verifies Firefox ZIP/XPI byte identity. Final CI on `e036529b` is green: push `32322333493`, `pull_request_target` `32322334711`, and pull request `32322336150`. The validated production archives contain 60 Firefox files and 61 Chromium files.

## Phase 4 — release readiness

- [x] Harden `pull_request_target` commit-message lookup so a transient/non-JSON GitHub API response cannot abort CI before repository tests. The fail-safe is present on `3.X.X-Branch` in `81b259c1` and mirrored on `modernization-p0` in `2ad69cf8`; modernization push run `32326611971` and PR-target run `32326613299` are green.
- [x] Produce Firefox and Chromium release-candidate packages from the same validated source state. PR CI now retains the installable `*Chrome.zip` and `*Firefox.xpi` plus `SHA256SUMS.txt` in a dedicated `release-candidate-packages` artifact. Commit `a8af649e` is green in regular CI: push `32322777150`, `pull_request_target` `32322778298`, and pull request `32322779658`; RC artifact `9390334806` is tied to that exact head SHA.
- [x] Resolve base drift / merge conflicts between `modernization-p0` and `3.X.X-Branch` without replacing the validated modernization tree with stale base dependency/workflow state. The synchronization was performed on an isolated branch, the restored synchronized tree was verified byte-for-byte equivalent by matching Git tree/subtree SHAs, and null-diff PR #33 imported only the corrected base ancestry. Merge commit `fc70abfe` now contains current base `81b259c1`; PR #1 reports `mergeable_state: clean`.
- [x] Regenerate the first post-base-sync same-source `release-candidate-packages` artifact. Exact post-sync head `fc70abfe` was green in regular CI and produced artifact `9392296156`; that candidate is now **superseded** because later dependency/test-toolchain and tagged-workflow changes affected the candidate state.
- [x] Revalidate the dependency/test toolchain after the post-sync update pass. Jest 30, `webextension-polyfill 0.12.0`, `ts-loader 9.6.2`, the repaired lockfile and Node engine metadata are now integrated; full and runtime `npm audit` both reached zero findings during the validated Jest migration.
- [x] Align tagged test-build and tagged release workflows with the permanent release gates. Commit `0363f282` moved the test-build path from hard-coded Node 18 to `.nvmrc`, added locked-install/npm caching and permanent TS7 typecheck to both tag pipelines, pinned `softprops/action-gh-release` to v3.0.2, and added `SHA256SUMS.txt` to tagged package uploads. Regular CI on that workflow state is green: push `32439203126`, `pull_request_target` `32439204333`, and pull request `32439205746`.
- [x] Remove all temporary dependency/Jest/lock synchronization helpers and generate the current replacement release candidate from the clean technical head. Exact candidate source `53209f36` is green in regular CI: push `32439375945`, `pull_request_target` `32439377479`, and pull request `32439378775`. Pull-request run `32439378775` passed TS7 typecheck, 37/37 Jest suites (577/577 tests), lint, Firefox archive validation (60 files), Chromium archive validation (61 files), and Firefox ZIP/XPI byte identity. Artifact `9431860563` contains exactly `*Firefox.xpi`, `*Chrome.zip`, and `SHA256SUMS.txt`; its GitHub wrapper digest is `sha256:891232f8281af65ede7cb80e1da7fe1911d11b55eea67a614408dcf01f29cc41`.
- [ ] Perform representative manual browser smoke tests in addition to automated CI. The exact cross-browser procedure and result matrix are defined in `RC_TEST_CHECKLIST.md`; execution remains a manual release gate.
- [ ] Confirm existing user settings/data survive a real release-candidate upgrade path in both target browser families. `RC_TEST_CHECKLIST.md` defines the non-destructive real-profile/export procedure; suitable historical data is still required.
- [ ] Confirm popup/options, cleanup triggers, allowlist/greylist and restart behavior in packaged builds rather than source/unit tests alone. These packaged-runtime checks are enumerated in `RC_TEST_CHECKLIST.md` and must be recorded for both browser families.
- [ ] Merge `modernization-p0` into `3.X.X-Branch` only after migration/runtime checks and release-candidate validation are green.
- [ ] Create a tagged fork release only after the integrated branch has passed the release checklist.
- [ ] Consider an upstream proposal only after the fork branch is stable and the modernization scope is documented.

## Blockers / dependencies

- There is currently no base-drift blocker: PR #1 is clean/mergeable against `3.X.X-Branch` base `81b259c1`, and pinned replacement RC source `53209f36` was generated after the latest candidate-affecting dependency/toolchain/workflow changes. Documentation-only commits after that source do not invalidate artifact `9431860563`; any base change or candidate-affecting runtime/source, manifest, build/packaging, dependency or toolchain change requires a replacement candidate and repetition of the affected gates.
- Real historical Firefox/Chromium profile or settings exports are not present as repository fixtures, so the real-world upgrade-path release gate cannot yet be marked complete.
- The separate GitHub Advanced Security agent can fail before repository analysis because its requested hosted model is unsupported. This is external to the codebase and does not currently block functional modernization work.
- Manual packaged-browser validation remains required before release readiness can be claimed.

## Completion status

**Not fully completed.** Manifest V3 foundations, functional CI stabilization, the automated migration/runtime compatibility pass, Archiver 8 / Redux 5 modernization, maintained Firefox WebExtension typings, TypeScript 7 and the coordinated Jest 30 migration are complete and verified. TypeScript 7 is protected by regular CI typecheck; the repaired dependency graph supports reproducible `npm ci` and reached zero findings in the validated full/runtime npm audits. Phase 3 is complete: dependency/toolchain modernization and generated-package content auditing are permanently enforced and green. Phase 4 now also has automated coverage for published historical 3.0.2/3.4.0/3.6.0 release-state schemas, hardened tag/release pipelines, a clean base-synchronized PR #1, and current automated same-source RC artifact `9431860563` from source `53209f36`. The remaining release blockers are manual packaged-browser validation and real representative historical-profile/export upgrade validation; merge/tagging remain prohibited until those gates pass.
