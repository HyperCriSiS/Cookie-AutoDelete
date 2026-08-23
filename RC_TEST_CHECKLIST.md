# Cookie AutoDelete release-candidate checklist

This is the **residual release checklist**. Detailed automated behavior belongs in `TESTING.md`; project progress belongs in `ROADMAP.md`.

Do not merge PR #1 or create a tagged release until every required gate below is satisfied.

## Candidate state

Former candidate `b5cfd87fabdfb9ca70c566a3b12dd8dbee998170` / artifact `9432252522` is **superseded**.

### Pinned technical release candidate

- Technical RC source: `7fc3dd14bc2c82464ccaf24ebada6493dff76b0c`
- Base SHA (`3.X.X-Branch`): `3e061b7f77175e536ff664788f3e6692ac6540e8`
- CI pull-request run: `32644238045`
- `release-candidate-packages` artifact: `9494441111`
- Artifact wrapper digest: `sha256:b482c9a7d9a90bca727d84275001c95de9def717aab3aa865a1baa7ddfdae4b8`
- Firefox package: `Cookie-AutoDelete_Dev_20260823_140402_7fc3dd1_Firefox.xpi`
- Chromium package: `Cookie-AutoDelete_Dev_20260823_140402_7fc3dd1_Chrome.zip`
- Firefox convenience artifact: `9494441599`
- Chromium convenience artifact: `9494442021`
- Firefox E2E results artifact: `9494435062`
- Chromium E2E results artifact: `9494438468`
- Chromium E2E: ✅
- Firefox E2E: ✅
- Fast CI/build/package validation: ✅
- CodeQL / Actions / JavaScript-TypeScript analysis: ✅
- Genuine historical-profile/export result: pending suitable data

`Release Candidate Packages` ran only after the fast build job and both browser-E2E jobs succeeded and republishes the same package bytes they consumed. Documentation-only commits made after the technical RC record do not change those package bytes and do not invalidate `7fc3dd14…`; any candidate-affecting source/runtime, manifest, build/packaging, dependency, toolchain, browser-test-infrastructure, or base change does.

The separate `github-advanced-security` AI-agent check still fails before repository analysis because its requested hosted model is unavailable. It remains non-blocking while repository-owned CI/CodeQL are green.

## Automated packaged-runtime gates

These are CI gates, **not manual retest instructions**.

### Shared Firefox + Chromium

- [x] Packaged extension starts in a real browser and the real options UI works.
- [x] Configured automatic last-tab cleanup removes cookie, LocalStorage, IndexedDB and website Service Worker data for an unlisted site.
- [x] Domain change cleans the previous unlisted origin.
- [x] Whitelist created through the real expression UI retains protected data.
- [x] Greylist created through the real expression UI retains data on normal tab close.
- [x] Production persistence contains the settings and expression lists created through real browser/UI interactions.

### Chromium-specific

- [x] Dynamic popup primary controls remain on one row with enlarged text.
- [x] Selective browser HTTP-cache cleanup works for unlisted last-tab/domain-change cleanup.
- [x] Protected white-/greylisted sites retain their controlled HTTP-cache entry according to policy.
- [x] Persistent-profile process relaunch preserves persisted settings/lists and protected site data.
- [x] Real process relaunch removes worker-global transient state while persistent extension state returns.

### Firefox-specific

- [x] Packaged XPI exposes contextual identities.
- [x] Multiple `%tmp*` identities produce exactly one visible/persisted `%tmp` expression scope.
- [x] No concrete temporary-container store IDs leak into persisted CAD state.

Firefox selective HTTP-cache cleanup is **not** a release gate while Firefox cannot reliably evict normal-tab partitioned cache by hostname. CAD must not replace that limitation with a destructive full-browser-cache clear. Chromium remains the packaged-runtime selective-cache gate.

A whole-extension runtime reload is not used as a background-lifecycle proxy in either browser. Chromium worker persistence is covered by deterministic worker-restart regressions plus real process relaunch; Firefox uses `background.scripts`, with hydration/restart logic covered by regressions and the genuine installed-browser startup path retained below.

## Package provenance

- [x] `Release Candidate Packages` ran after both browser E2E jobs on the exact technical RC source.
- [x] Artifact publication succeeded with one Chromium package, one Firefox package and `SHA256SUMS.txt` configured as required inputs.
- [ ] Verify the downloaded Firefox and Chromium package files against `SHA256SUMS.txt` before residual manual testing.
- [x] PR #1 still targets recorded base `3e061b7f77175e536ff664788f3e6692ac6540e8`; no newer base has been observed during RC qualification.

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
| Firefox | pending | GitHub Actions ✅ | pending | pending | pending | pending | packaged XPI E2E green |
| Chromium | pending | GitHub Actions ✅ | pending | pending | pending | pending | packaged ZIP E2E green |

## Release decision

- [x] Fast CI, package validation, Chromium E2E and Firefox E2E are green for one exact technical candidate SHA.
- [x] Same-source `release-candidate-packages` provenance is confirmed.
- [ ] Downloaded package SHA256 verification is confirmed.
- [ ] Minimal visual/permission smoke is green in both browser families.
- [ ] Residual full-browser-startup checks are green.
- [ ] Genuine historical upgrade evidence is green, or an explicit compensating-evidence decision exists.
- [ ] PR #1 is mergeable against the current base with no unresolved conflicts/blocking functional checks.
- [ ] No candidate-affecting change occurred after the pinned SHA without replacement validation.
- [ ] Only then merge `modernization-p0` into `3.X.X-Branch`.
- [ ] Validate the integrated branch before creating a tagged fork release.
