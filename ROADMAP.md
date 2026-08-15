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

- [x] Keep Initial Checks green on the current PR head.
- [x] Keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported on the current PR head.
- [ ] Repair the syntax corruption introduced in `96edf535` in `__tests__/services/CleanupService.spec.ts`: `expect(spyCleanupService.cleanSiteData).not.toHaveBeenCalled();edTimes(1);` must become the intended negative expectation.
- [ ] Re-run `Tests, Builds, Coverage` after repairing the test syntax and then address any remaining behavioral failures instead of masking them.
- [ ] Investigate the failing `github-advanced-security` check and determine whether it is a repository/configuration limitation or an actionable code/workflow failure.
- [ ] Re-run the full PR check matrix after fixes and require a clean functional validation state before P0 is merge-ready.

## Phase 2 — migration and behavioral compatibility

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

- PR #1 currently has three failing `Tests, Builds, Coverage` jobs. The immediate concrete blocker is a malformed Jest assertion introduced by commit `96edf535`; functional results are not trustworthy until that syntax error is repaired.
- The `github-advanced-security` check also reports failure and must be classified before completion.
- Several open Dependabot PRs are major-version jumps and must not be treated as safe/automatic upgrades without compatibility validation.

## Completion status

**Not fully completed.** The next action is the one-line Jest syntax repair, followed immediately by a fresh test/build matrix so any remaining behavioral failures can be isolated.