# Cookie AutoDelete Roadmap

## Project goal

Modernize Cookie AutoDelete into a robust cross-browser Manifest V3 extension while preserving established cleanup behavior, user data/settings, UI compatibility and project attribution.

## Current status

**Status: in progress / draft**

Active modernization work is on `modernization-p0`, tracked by draft PR #1 into `3.X.X-Branch`. The branch is intentionally a CI/review envelope and is not yet considered merge-ready or suitable for an upstream proposal.

## Completed P0 modernization foundation

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

## Phase 1 — make the P0 branch consistently green

- [x] Keep Initial Checks green on the validated PR head.
- [x] Keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported on the validated PR head.
- [x] Repair the malformed Jest assertion introduced in `96edf535`; commit `c68555a` restored the intended negative expectation.
- [x] Restore the missing `);` on the affected `otherBrowsingDataCleanup(...)` test call; commit `0f597563` repairs the incomplete call without changing production behavior.
- [x] Capture and isolate the remaining Jest failure: after the syntax/call repairs, 29 of 30 suites and 548 of 549 tests passed; the sole failure was the legacy Firefox cleanup test expecting two confirmed removals while its path did not explicitly mock successful `browser.cookies.remove` results.
- [x] Align that legacy success-path test with the production contract that only browser-confirmed removals count; commit `6f309b55` explicitly mocks successful removal results rather than weakening the production accounting logic.
- [x] Re-run the complete functional CI matrix: the clean branch head `8bad8409` passes the regular push, pull-request and pull-request-target CI workflows, including 549/549 tests.
- [x] Classify the separate `github-advanced-security` failure: its job aborts before code analysis because GitHub's own agent requests unsupported model `claude-opus-4.6` and receives HTTP 400. This is an external GitHub service/configuration failure, not a repository code or workflow defect.
- [x] Require a clean functional validation state before continuing beyond P0; the regular CI state is green.

## Phase 2 — migration and behavioral compatibility

- [x] Preserve non-destructive upgrades when older persisted profiles lack settings introduced by newer versions: `SettingService.hasNewValue()` now treats a missing previous key as changed, with a regression test covering the legacy-profile case (`1e1856ab`).

- [ ] Validate upgrades from existing Cookie AutoDelete user profiles/settings on Firefox and Chromium without destructive resets.
- [ ] Verify allowlist/greylist behavior and domain matching after StoreBridge/UIStore migration.
- [ ] Verify cleanup on tab close, domain change and browser restart according to configured behavior.
- [ ] Verify session/transient-state restoration across MV3 service-worker suspension/restart.
- [ ] Verify popup/options interactions and state synchronization in both Firefox and Chromium builds.
- [ ] Verify container/contextual-identity behavior where the browser exposes the required APIs.
- [ ] Add regression tests for every migration/runtime defect found during this compatibility pass.

## Phase 3 — dependency and build modernization

- [ ] Review Dependabot updates individually; do not merge breaking major updates just to reduce version drift.
- [ ] Prioritize security/runtime-required dependency updates that can be proven compatible with the P0 branch.
- [ ] Isolate major migrations such as Redux, TypeScript and build/archive tooling so regressions are attributable and reversible.
- [ ] Keep generated browser packages reproducible and validate manifests/package contents for each target.

## Phase 4 — release readiness

- [ ] Produce Firefox and Chromium release-candidate packages from the same validated source state.
- [ ] Perform representative manual browser smoke tests in addition to automated CI.
- [ ] Confirm existing user settings/data survive the release-candidate upgrade path.
- [ ] Merge the modernization branch only after checks and migration tests are green.
- [ ] Consider an upstream proposal only after the fork branch is stable and the modernization scope is documented.

## Blockers / dependencies

- No functional CI blocker is currently known on `modernization-p0`; regular CI is green on clean head `8bad8409`.
- The separate GitHub Advanced Security agent currently fails inside GitHub infrastructure with `400 The requested model is not supported` before repository analysis starts; this does not block functional P0 validation.
- Several open Dependabot PRs are major-version jumps and must not be treated as safe/automatic upgrades without compatibility validation.

## Completion status

**Not fully completed.** Phase 1 functional stabilization is complete. The next priority is Phase 2 upgrade/migration compatibility, starting with non-destructive upgrades from existing Firefox and Chromium user profiles/settings.