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

- [x] Keep Initial Checks green on the previously validated PR head.
- [x] Keep CodeQL / JavaScript-TypeScript / Actions analysis green where reported on the previously validated PR head.
- [x] Repair the malformed Jest assertion introduced in `96edf535`; commit `c68555a` restored the intended negative expectation.
- [x] Restore the missing `);` on the affected `otherBrowsingDataCleanup(...)` test call; commit `0f597563` repairs the incomplete call without changing production behavior.
- [x] Capture and isolate the remaining Jest failure: after the syntax/call repairs, 29 of 30 suites and 548 of 549 tests passed; the sole failure was the legacy Firefox cleanup test expecting two confirmed removals while its path did not explicitly mock successful `browser.cookies.remove` results.
- [x] Align that legacy success-path test with the production contract that only browser-confirmed removals count; commit `6f309b55` explicitly mocks successful removal results rather than weakening the production accounting logic.
- [ ] Re-run the complete `Tests, Builds, Coverage` matrix after `6f309b55` and address any remaining functional/build failures.
- [ ] Investigate the failing `github-advanced-security` check and determine whether it is a repository/configuration limitation or an actionable code/workflow failure.
- [ ] Require a clean functional validation state before P0 is merge-ready.

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

- The fresh PR #1 validation matrix triggered by the latest cleanup-test repair is still running; its final functional/build result must be checked before Phase 1 can be considered green.
- The `github-advanced-security` check has previously reported failure and still needs classification.
- Several open Dependabot PRs are major-version jumps and must not be treated as safe/automatic upgrades without compatibility validation.

## Completion status

**Not fully completed.** The previously opaque cleanup-test failure is now isolated and repaired without weakening production semantics. The next priority is the fresh full CI result, followed by any remaining build/test issue and Advanced Security classification.