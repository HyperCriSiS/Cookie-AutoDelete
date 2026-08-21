# Cookie AutoDelete release-candidate test checklist

This checklist is the manual release gate for the current modernization candidate. Do not merge PR #1 or create a tagged fork release until the required Firefox and Chromium checks below have been completed and recorded.

## Pinned candidate

Use one exact candidate for the complete matrix. If runtime/source, manifests, build/packaging, dependencies, toolchain or the PR base changes, stop and pin a newly validated candidate before continuing.

- Commit SHA: `b5cfd87fabdfb9ca70c566a3b12dd8dbee998170`
- Base SHA (`3.X.X-Branch`): `3e061b7f77175e536ff664788f3e6692ac6540e8`
- CI pull-request run ID: `32440495062`
- `release-candidate-packages` artifact ID: `9432252522`
- Firefox result: pending manual validation
- Chromium result: pending manual validation
- Real historical-profile/export upgrade result: pending suitable representative data

## Package provenance

Use the Firefox XPI and Chromium ZIP from the **same** `release-candidate-packages` artifact. For the current candidate these are `Cookie-AutoDelete_Dev_20260821_023812_b5cfd87_Firefox.xpi` and `Cookie-AutoDelete_Dev_20260821_023812_b5cfd87_Chrome.zip`. Verify both packaged files against the included `SHA256SUMS.txt` before loading them.

Automated validation for this exact candidate already passed archive/stage parity (60 Firefox files, 61 Chromium files), Firefox ZIP/XPI byte identity, TypeScript 7 typecheck, 37/37 Jest suites (577/577 tests), lint and production build. The dependency/test-toolchain state includes Jest 30, `webextension-polyfill 0.12.0` and `ts-loader 9.6.2`; the validated dependency migration reached zero findings in both full `npm audit` and `npm audit --omit=dev`. The GitHub wrapper artifact digest is `sha256:ff8c7495404f6b0d950ecfe91e5de93f6cb86770bd96d07cd252c6b521102ddd`; this wrapper digest is not a substitute for verifying the two package checksums inside `SHA256SUMS.txt`.

Before starting the final manual matrix, confirm PR #1 still targets the recorded current `3.X.X-Branch` base, has no real merge conflict/base drift, and that the candidate was generated **after** the most recent required base synchronization. The known external `github-advanced-security` AI-agent failure may make GitHub report `mergeable_state: unstable`; that external failure alone does not invalidate the candidate when regular CI, CodeQL and JavaScript/TypeScript/Actions analysis remain green. If the base changes or an actual merge conflict appears, resolve/synchronize first, rerun CI, and record the replacement candidate instead of testing a stale artifact.

## Firefox packaged-build smoke test

- [ ] Verify the Firefox package checksum from `SHA256SUMS.txt`.
- [ ] Extract the GitHub Actions artifact wrapper and locate the `*Firefox.xpi` candidate.
- [ ] Install/load the packaged XPI in a disposable Firefox profile appropriate for unsigned local testing.
- [ ] Confirm the extension starts without startup/background errors.
- [ ] Confirm popup opens and displays current-tab/site state.
- [ ] Confirm options page opens and settings render correctly.
- [ ] Confirm changing a setting in options is reflected in popup/runtime behavior without a destructive state reset.
- [ ] Confirm allowlist entry creation, matching and persistence across browser restart.
- [ ] Confirm greylist entry creation, matching and persistence across browser restart.
- [ ] Confirm container/contextual-identity-specific behavior where Firefox exposes the capability.
- [ ] Confirm cleanup on last-tab close for a non-allowlisted test site.
- [ ] Confirm domain-change cleanup for a non-allowlisted test site.
- [ ] Confirm configured browser-restart cleanup path.
- [ ] Confirm an allowlisted site is retained through the same cleanup triggers.
- [ ] Confirm a greylisted site follows configured greylist semantics rather than full allowlist semantics.
- [ ] Confirm MV3/background lifecycle restart does not lose persisted policy/list state.
- [ ] Record Firefox version, OS, observed result and any console/background errors.

## Chromium packaged-build smoke test

- [ ] Verify the Chromium package checksum from `SHA256SUMS.txt`.
- [ ] Extract the GitHub Actions artifact wrapper and locate the `*Chrome.zip` candidate.
- [ ] Extract/load the packaged Chromium extension in a disposable Chromium-family profile using developer mode.
- [ ] Confirm the extension starts without service-worker/startup errors.
- [ ] Confirm popup opens and displays current-tab/site state.
- [ ] Confirm options page opens and settings render correctly.
- [ ] Confirm changing a setting in options is reflected in popup/runtime behavior without a destructive state reset.
- [ ] Confirm allowlist entry creation, matching and persistence across browser restart.
- [ ] Confirm greylist entry creation, matching and persistence across browser restart.
- [ ] Confirm Firefox-only container/contextual-identity behavior is capability-gated rather than throwing or corrupting state.
- [ ] Confirm cleanup on last-tab close for a non-allowlisted test site.
- [ ] Confirm domain-change cleanup for a non-allowlisted test site.
- [ ] Confirm configured browser-restart cleanup path supported by Chromium.
- [ ] Confirm an allowlisted site is retained through the same cleanup triggers.
- [ ] Confirm a greylisted site follows configured greylist semantics rather than full allowlist semantics.
- [ ] Force/observe service-worker suspension/restart and confirm persisted policy/list state remains intact.
- [ ] Record Chromium version/family, OS, observed result and any service-worker/extension errors.

## Real historical-profile / settings-export upgrade validation

Synthetic and release-derived fixtures already cover representative older schemas in automated tests. This gate must use genuinely representative historical user data or a real archived profile/export; do not fabricate completion from the synthetic fixtures.

For each browser family for which suitable historical data is available:

- [ ] Make a backup copy of the historical profile/export before testing.
- [ ] Record the source Cookie AutoDelete version if known.
- [ ] Record non-default cleanup settings that should survive.
- [ ] Record representative allowlist and greylist entries, including wildcard/subdomain and container-sensitive entries where applicable.
- [ ] Upgrade/load the current packaged release candidate without manually clearing extension storage first.
- [ ] Confirm startup/migration does not perform a destructive reset.
- [ ] Confirm existing allowlist and greylist entries remain present and semantically equivalent.
- [ ] Confirm previously configured cleanup policy remains equivalent after migration.
- [ ] Confirm later-added settings receive safe defaults when absent rather than corrupting older state.
- [ ] Restart the browser and confirm the migrated persisted state remains stable.
- [ ] Export/inspect the resulting settings where possible and record any dropped or silently rewritten values.

If no suitable genuine historical export/profile is available, leave this gate open. The release must not claim real-profile upgrade validation until such data has actually been exercised.

## Result record

Record each completed environment here rather than replacing unchecked items with assumptions.

| Browser family | Browser/version | OS | Package checksum verified | Smoke matrix | Historical-data upgrade | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Firefox | pending | pending | pending | pending | pending | |
| Chromium | pending | pending | pending | pending | pending | |

## Release decision

- [ ] Both packaged browser smoke-test matrices are green.
- [ ] Real representative historical-profile/export upgrade testing is green for Firefox and Chromium, or an explicit project decision has documented why one browser family lacks obtainable historical data and what compensating evidence exists.
- [ ] PR #1 is mergeable against the current `3.X.X-Branch` base with no unresolved code conflicts.
- [ ] Regular CI/typecheck/tests/lint/build/archive checks are green for the pinned candidate.
- [ ] Any candidate-affecting change after the pinned SHA has triggered a replacement candidate and revalidation.
- [ ] Only after all required gates above: merge `modernization-p0` into `3.X.X-Branch`.
- [ ] Only after the integrated branch is validated: create the tagged fork release.
