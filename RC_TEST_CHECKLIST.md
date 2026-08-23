# Cookie AutoDelete release-candidate checklist

This file is the **residual release checklist**, not a duplicate browser test plan. Repeatable functional behavior belongs in automated CI and is documented in `TESTING.md`.

Do not merge PR #1 or create a tagged fork release until the required automated gates and the genuinely manual residual checks below are green.

## Candidate state

The previous candidate `b5cfd87fabdfb9ca70c566a3b12dd8dbee998170` / artifact `9432252522` predates the real-browser E2E architecture and is therefore superseded once the test-overhaul commit lands.

A replacement candidate is considered pinned only when the updated CI workflow has completed all of these jobs successfully for one exact PR head:

- `Tests, Builds, Coverage`
- `Browser E2E — Chromium`
- `Browser E2E — Firefox`
- `Release Candidate Packages`

The `Release Candidate Packages` job is deliberately downstream of both E2E jobs and republishes the **same package bytes** they tested. If source/runtime, manifests, build/packaging, dependencies, toolchain, browser-test infrastructure, or the PR base changes afterwards, stop and pin a replacement candidate.

### Replacement candidate record

Fill this section only after the new pipeline is green:

- Commit SHA: pending
- Base SHA (`3.X.X-Branch`): `3e061b7f77175e536ff664788f3e6692ac6540e8` unless the base advances
- CI pull-request run ID: pending
- `release-candidate-packages` artifact ID: pending
- Chromium E2E result: pending
- Firefox E2E result: pending
- Genuine historical-profile/export result: pending suitable representative data

## Automated release gates

The following behavior is no longer a manual checkbox matrix. It must be green in CI against the packaged extension, using the controlled local E2E site described in `TESTING.md`.

### Shared Firefox + Chromium packaged-runtime gates

- [ ] Packaged extension starts successfully in a real browser.
- [ ] Real options UI renders and accepts configuration changes.
- [ ] Automatic cleanup activates with the configured delay.
- [ ] Unlisted last-tab close removes the test cookie.
- [ ] Unlisted last-tab close removes LocalStorage.
- [ ] Unlisted last-tab close removes IndexedDB.
- [ ] Unlisted last-tab close unregisters the website Service Worker.
- [ ] Unlisted last-tab close removes the controlled browser HTTP-cache entry.
- [ ] Domain change cleans the previous unlisted origin.
- [ ] Whitelist entry created through the real expression UI retains configured site data.
- [ ] Greylist entry created through the real expression UI retains data on normal tab close.
- [ ] Persisted settings and expression lists survive a real extension/background runtime reload.

### Chromium-specific packaged-runtime gates

- [ ] Persistent browser-profile restart retains whitelisted site data.
- [ ] Persistent browser-profile restart applies configured greylist startup cleanup.
- [ ] MV3 runtime reload replaces worker-global transient state while restoring persisted extension state.

### Firefox-specific packaged-runtime gates

- [ ] Packaged Firefox XPI exposes the contextual-identities capability required for container support.
- [ ] Firefox extension runtime reload preserves persisted settings and expression lists.

The machine-readable result matrices and failure screenshots are uploaded as `browser-e2e-chromium-results` and `browser-e2e-firefox-results` artifacts.

## Package provenance

After all automated gates pass:

- [ ] Confirm `Release Candidate Packages` ran **after** both browser E2E jobs on the same PR head.
- [ ] Confirm the artifact contains exactly one `*Chrome.zip`, one `*Firefox.xpi`, and `SHA256SUMS.txt`.
- [ ] Verify both package files against `SHA256SUMS.txt` before any residual manual testing.
- [ ] Confirm PR #1 still targets the recorded current `3.X.X-Branch` base with no real merge conflict/base drift.

The known external `github-advanced-security` AI-agent failure remains non-blocking only when it still aborts before repository analysis and the repository-owned CI/CodeQL checks are green.

## Minimal manual packaged-build smoke

Do **not** manually repeat cookie/IndexedDB/LocalStorage/service-worker/domain-change/list-policy matrices already proven by E2E unless debugging a failure.

### Firefox

- [ ] Install/load the exact E2E-tested XPI in a disposable desktop Firefox profile suitable for unsigned local testing.
- [ ] Visually confirm the toolbar popup opens, is readable, and reflects the current site without obvious rendering errors.
- [ ] Visually confirm the options page is usable and has no obvious layout/permission regressions.
- [ ] Confirm browser permission/install UX is reasonable, including any Firefox-specific host/file-access switches shown by browser chrome.
- [ ] Perform one full Firefox browser restart and confirm the installed-release behavior expected for startup cleanup. This remains manual while CI must use a temporary unsigned XPI that Firefox removes on browser restart.
- [ ] Record Firefox version, OS, and any browser-console/background error not represented by CI.

### Chromium

- [ ] Load the exact E2E-tested packaged Chromium build in a disposable Chromium-family profile using the supported local developer workflow.
- [ ] Visually confirm toolbar popup/options rendering and basic interaction.
- [ ] Confirm browser permission/install UX has no unexpected new permission surface.
- [ ] Record Chromium family/version, OS, and any extension/service-worker error not represented by CI.

## Genuine historical-profile / settings-export upgrade validation

Synthetic and release-derived fixtures already cover published 3.0.2, 3.4.0, and 3.6.0 persisted-state shapes in automated tests. They are valuable regression fixtures but **must not** be reported as genuine historical-profile validation.

For each browser family for which suitable archived user data is available:

- [ ] Make a backup copy of the historical profile/export.
- [ ] Record the old Cookie AutoDelete version if known.
- [ ] Record representative non-default cleanup settings.
- [ ] Record representative whitelist/greylist entries, including wildcard/subdomain and container-sensitive cases where applicable.
- [ ] Upgrade to the exact current release candidate without manually clearing extension storage.
- [ ] Confirm startup/migration does not perform a destructive reset.
- [ ] Confirm existing lists remain present and semantically equivalent.
- [ ] Confirm previously configured cleanup policy remains equivalent.
- [ ] Confirm later-added settings receive safe defaults when absent.
- [ ] Restart the browser and confirm migrated persisted state remains stable.
- [ ] Export/inspect the resulting settings where possible and record dropped or silently rewritten values.

If no suitable genuine historical export/profile is available, leave this gate open. Do not manufacture completion from synthetic fixtures.

## Result record

| Browser family | Browser/version | OS | Automated E2E | Package checksum | Visual/permission smoke | Full startup check | Historical-data upgrade | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Firefox | pending | pending | pending | pending | pending | pending | pending | |
| Chromium | pending | pending | pending | pending | pending | automated | pending | |

## Release decision

- [ ] Fast CI, package validation, Chromium E2E, and Firefox E2E are green for one exact candidate SHA.
- [ ] `release-candidate-packages` was emitted only after those browser gates and contains the exact browser-tested bytes.
- [ ] Minimal visual/permission smoke is green in both browser families.
- [ ] Firefox residual full-browser-startup smoke is green.
- [ ] Genuine historical-profile/export upgrade testing is green for Firefox and Chromium, or an explicit project decision documents why representative data for one family is unobtainable and what compensating evidence exists.
- [ ] PR #1 is mergeable against the current `3.X.X-Branch` base with no unresolved code conflicts.
- [ ] Any candidate-affecting change after the pinned SHA has triggered a replacement candidate and revalidation.
- [ ] Only after all required gates above: merge `modernization-p0` into `3.X.X-Branch`.
- [ ] Only after the integrated branch is validated: create the tagged fork release.
