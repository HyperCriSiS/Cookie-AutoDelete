# Cookie AutoDelete release-candidate checklist

This is the **residual release checklist**. Detailed automated behavior belongs in `TESTING.md`; project progress belongs in `ROADMAP.md`.

Do not merge PR #1 or create a tagged release until every required gate below is satisfied.

## Candidate state

Former candidate `b5cfd87fabdfb9ca70c566a3b12dd8dbee998170` / artifact `9432252522` is **superseded**.

A replacement candidate is pinned only when one exact PR head passes:

- `Tests, Builds, Coverage`
- `Browser E2E — Chromium`
- `Browser E2E — Firefox`
- downstream `Release Candidate Packages`

The RC job republishes the same package bytes tested by the browser jobs. Candidate-affecting source/runtime, manifest, build/packaging, dependency, toolchain, browser-test-infrastructure, or base changes require a new RC.

### Replacement candidate record

- Commit SHA: pending
- Base SHA (`3.X.X-Branch`): `3e061b7f77175e536ff664788f3e6692ac6540e8` unless base advances
- CI pull-request run ID: pending
- `release-candidate-packages` artifact ID: pending
- Artifact digest: pending
- Firefox package: pending
- Chromium package: pending
- Chromium E2E: pending
- Firefox E2E: pending
- Genuine historical-profile/export result: pending suitable data

## Automated packaged-runtime gates

These are CI gates, **not manual retest instructions**.

### Shared Firefox + Chromium

- [ ] Packaged extension starts in a real browser and the real options UI works.
- [ ] Configured automatic last-tab cleanup removes cookie, LocalStorage, IndexedDB and website Service Worker data for an unlisted site.
- [ ] Domain change cleans the previous unlisted origin.
- [ ] Whitelist created through the real expression UI retains protected data.
- [ ] Greylist created through the real expression UI retains data on normal tab close.
- [ ] Production persistence contains the settings and expression lists created through real browser/UI interactions.

### Chromium-specific

- [ ] Dynamic popup primary controls remain on one row with enlarged text.
- [ ] Selective browser HTTP-cache cleanup works for unlisted last-tab/domain-change cleanup.
- [ ] Protected white-/greylisted sites retain their controlled HTTP-cache entry according to policy.
- [ ] Persistent-profile process relaunch preserves persisted settings/lists and protected site data.
- [ ] Real process relaunch removes worker-global transient state while persistent extension state returns.

### Firefox-specific

- [ ] Packaged XPI exposes contextual identities.
- [ ] Multiple `%tmp*` identities produce exactly one visible/persisted `%tmp` expression scope.
- [ ] No concrete temporary-container store IDs leak into persisted CAD state.

Firefox selective HTTP-cache cleanup is **not** a release gate while Firefox cannot reliably evict normal-tab partitioned cache by hostname. CAD must not replace that limitation with a destructive full-browser-cache clear. Chromium remains the packaged-runtime selective-cache gate.

A whole-extension runtime reload is not used as a background-lifecycle proxy in either browser. Chromium worker persistence is covered by deterministic worker-restart regressions plus real process relaunch; Firefox uses `background.scripts`, with hydration/restart logic covered by regressions and the genuine installed-browser startup path retained below.

## Package provenance

After automated jobs are green:

- [ ] `Release Candidate Packages` ran after both browser E2E jobs on the same PR head.
- [ ] Artifact contains exactly one `*Chrome.zip`, one `*Firefox.xpi`, and `SHA256SUMS.txt`.
- [ ] Both packages match `SHA256SUMS.txt`.
- [ ] PR #1 still targets the recorded current `3.X.X-Branch` base without merge conflict/base drift.

The external `github-advanced-security` AI-agent failure is non-blocking only while it still aborts before repository analysis and repository-owned CI/CodeQL are green.

## Minimal manual packaged smoke

Do not manually repeat the data-cleanup/list matrices already proven by E2E unless diagnosing a failure.

### Firefox

- [ ] Install/load the exact RC XPI in a disposable profile suitable for local unsigned testing.
- [ ] Popup visually opens, is readable and reflects the current site.
- [ ] Options page is visually usable without obvious layout regressions.
- [ ] Browser permission/install UX is reasonable, including Firefox host/file-access switches.
- [ ] Perform one genuine full Firefox browser restart with a normally installed candidate and confirm expected startup cleanup/persisted state. CI temporary XPIs are removed on restart and cannot prove this path faithfully.
- [ ] Record Firefox version, OS and unexpected browser/background errors.

### Chromium

- [ ] Load the exact RC package in a disposable Chromium-family profile using the normal local developer workflow.
- [ ] Popup/options visual sanity is green.
- [ ] Permission/install UX exposes no unexpected permissions.
- [ ] Perform one full Chromium startup with the extension already loaded through the normal local workflow and confirm configured greylist startup cleanup.
- [ ] Record Chromium family/version, OS and unexpected extension/service-worker errors.

## Genuine historical-profile / export upgrade

Release-derived 3.0.2 / 3.4.0 / 3.6.0 fixtures already protect schema migration in CI, but they **do not** satisfy this gate.

For representative historical data, where available:

- [ ] Back up the profile/export and record old CAD version if known.
- [ ] Record representative non-default cleanup settings and white-/greylist entries.
- [ ] Upgrade to the exact RC without clearing extension storage.
- [ ] No destructive reset or silent list/settings loss occurs.
- [ ] Existing list semantics and cleanup policy remain equivalent.
- [ ] Later-added absent settings receive safe defaults.
- [ ] Restart and confirm migrated state remains stable.
- [ ] Record any dropped or rewritten value.

If suitable genuine data is unavailable, leave the gate open unless an explicit project decision documents why it is unobtainable and what compensating evidence is accepted.

## Result record

| Browser | Version / OS | Automated E2E | SHA256 | Visual/permission | Full startup | Historical upgrade | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Firefox | pending | pending | pending | pending | pending | pending | |
| Chromium | pending | pending | pending | pending | pending | pending | |

## Release decision

- [ ] Fast CI, package validation, Chromium E2E and Firefox E2E are green for one exact candidate SHA.
- [ ] Same-source `release-candidate-packages` provenance/checksums are confirmed.
- [ ] Minimal visual/permission smoke is green in both browser families.
- [ ] Residual full-browser-startup checks are green.
- [ ] Genuine historical upgrade evidence is green, or an explicit compensating-evidence decision exists.
- [ ] PR #1 is mergeable against the current base with no unresolved conflicts.
- [ ] No candidate-affecting change occurred after the pinned SHA without replacement validation.
- [ ] Only then merge `modernization-p0` into `3.X.X-Branch`.
- [ ] Validate the integrated branch before creating a tagged fork release.
