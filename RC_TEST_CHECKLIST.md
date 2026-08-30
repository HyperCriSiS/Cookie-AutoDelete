# Cookie AutoDelete release-candidate checklist

This is the **residual release checklist**. Detailed automated behavior belongs in `TESTING.md`; project progress belongs in `ROADMAP.md`.

Do not merge PR #1 or create a tagged release until every required gate below is satisfied.

## Candidate state

Former candidate `97c032f24c3aad902ad6fc28007721f61b50ee56` / artifact `9608199330` is **superseded** by the persistent Firefox startup test and session-restore regression fix. Candidate `c7492fe4ff72872c455d3bc18d4ed22fa4d0f219` / artifact `9503607308` and earlier candidates are also superseded.

### Pinned technical release candidate

- Technical RC source: `1deff25d035c950e6b1688419406005965df9a29`
- Base SHA (`3.X.X-Branch`): `7eecf7fbc281e8e0ea8a08047c0f617d6517ad8d`
- CI pull-request run: `33288673483`
- `release-candidate-packages` artifact: `9725278462`
- Artifact wrapper digest: `sha256:b8065e49be1577025f50703a7c3944994712cc34b94b59758855866436ebba18`
- Firefox package: `Cookie-AutoDelete_Dev_20260830_024453_1deff25_Firefox.xpi`
- Chromium package: `Cookie-AutoDelete_Dev_20260830_024453_1deff25_Chrome.zip`
- Firefox convenience artifact: `9725279042`
- Chromium convenience artifact: `9725279326`
- Firefox E2E diagnostics artifact: not emitted on success (failure-only by design)
- Chromium E2E diagnostics artifact: not emitted on success (failure-only by design)
- Chromium E2E: ✅
- Firefox E2E: ✅
- Fast CI/build/package validation: ✅
- Published-RC artifact download + inner SHA256 roundtrip: ✅ (integrated into `Release Candidate Packages`, job `99196488207`)
- CodeQL / Actions / JavaScript-TypeScript analysis: ✅
- Genuine historical-user-data regression: ✅ Firefox issue #197 (CAD 2.0.1 persisted state) + Chromium issue #1606 (CAD 3.8.2 settings snapshot); packaged upgrade/restart remains pending

`Release Candidate Packages` ran only after the fast build job and both browser-E2E jobs succeeded and republishes the same package bytes they consumed. Documentation-only commits made after the technical RC record do not change those package bytes and do not invalidate `1deff25d…`; any candidate-affecting source/runtime, manifest, build/packaging, dependency, toolchain, browser-test-infrastructure, or base change does.

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
- [x] Exact packaged XPI can be persistently installed in Firefox ESR, survives a complete browser restart without reinstallation, retains CAD state, and performs greylist cleanup on the real startup event.

Firefox selective HTTP-cache cleanup is **not** a release gate while Firefox cannot reliably evict normal-tab partitioned cache by hostname. CAD must not replace that limitation with a destructive full-browser-cache clear. Chromium remains the packaged-runtime selective-cache gate.

A whole-extension runtime reload is not used as a background-lifecycle proxy in either browser. Chromium worker persistence is covered by deterministic worker-restart regressions plus real process relaunch; Firefox uses `background.scripts`; hydration/restart logic is covered by regressions and the persistent-install Firefox ESR startup path is now a green packaged E2E gate.

## Package provenance

- [x] `Release Candidate Packages` ran after both browser E2E jobs on the exact technical RC source.
- [x] Artifact publication succeeded with one Chromium package, one Firefox package and `SHA256SUMS.txt` configured as required inputs.
- [x] Published `release-candidate-packages` artifact was downloaded again inside the already-required `Release Candidate Packages` job and both Firefox/Chromium package files verified against `SHA256SUMS.txt`.

Optional reproducible local cross-check for the pinned candidate:

```bash
gh run download 33288673483 --repo HyperCriSiS/Cookie-AutoDelete --name release-candidate-packages --dir cad-rc-1deff25
cd cad-rc-1deff25
sha256sum -c SHA256SUMS.txt
```

`Release Candidate Packages` job `99196488207` already performed this exact artifact roundtrip successfully after publishing the RC artifact. The optional command should likewise report `OK` for both `Cookie-AutoDelete_Dev_20260830_024453_1deff25_Firefox.xpi` and `Cookie-AutoDelete_Dev_20260830_024453_1deff25_Chrome.zip`. The GitHub artifact-wrapper digest is recorded separately and is not substituted for the inner package checksums.
- [x] Replacement RC was qualified against base `7eecf7fbc281e8e0ea8a08047c0f617d6517ad8d` and PR #1 is currently mergeable/`clean` against that base as of 2026-08-30. The final mergeability gate remains open until residual testing is complete.

## Minimal manual packaged smoke

Do not manually repeat the data-cleanup/list matrices already proven by E2E unless diagnosing a failure.

### Firefox

- [ ] Install/load the exact RC XPI in a disposable profile suitable for local unsigned testing.
- [ ] Popup visually opens, is readable and reflects the current site.
- [ ] Options page is visually usable without obvious layout regressions.
- [ ] Browser permission/install UX is reasonable, including Firefox host/file-access switches.
- [x] Full Firefox restart/startup cleanup is automated in CI with the exact packaged XPI persistently installed in Firefox ESR; the same disposable profile restarts without reinstalling the add-on and proves persisted state plus greylist startup cleanup.
- [ ] Record Firefox version, OS and unexpected browser/background errors.

### Chromium

- [ ] Load the exact RC package in a disposable Chromium-family profile using the normal local developer workflow.
- [ ] Popup/options visual sanity is green.
- [ ] Permission/install UX exposes no unexpected permissions.
- [ ] Perform one full Chromium startup with the extension already loaded through the normal local workflow and confirm configured greylist startup cleanup.
- [ ] Record Chromium family/version, OS and unexpected extension/service-worker errors.

## Genuine historical-profile / export upgrade

Release-derived 3.0.2 / 3.4.0 / 3.6.0 fixtures protect schema migration in CI. In addition, genuine public user data now passes automated migration regression: Firefox issue #197 provides a CAD 2.0.1 persisted state and Chromium issue #1606 provides a CAD 3.8.2 core-settings snapshot. The browser-level gate below still requires the exact packaged RC and restart path.

Using the committed genuine-user fixtures/evidence:

- [ ] Back up the profile/export and record old CAD version if known.
- [ ] Record representative non-default cleanup settings and white-/greylist entries.
- [ ] Upgrade to the exact RC without clearing extension storage.
- [ ] No destructive reset or silent list/settings loss occurs.
- [ ] Existing list semantics and cleanup policy remain equivalent.
- [ ] Later-added absent settings receive safe defaults.
- [ ] Restart and confirm migrated state remains stable.
- [ ] Record any dropped or rewritten value.

The data-availability blocker is resolved. Leave this gate open until the exact packaged RC has been exercised through the browser-level upgrade/restart path; automated fixture validation alone is intentionally insufficient.

## Result record

| Browser | Version / OS | Automated E2E | SHA256 | Visual/permission | Full startup | Historical upgrade | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Firefox | current Release + ESR / Ubuntu 24.04 CI | GitHub Actions ✅ | CI roundtrip ✅ | pending | persistent-install restart ✅ | automated genuine-user regression ✅; packaged upgrade pending | startup session-restore regression fixed; upstream #197 / CAD 2.0.1 state |
| Chromium | pending | GitHub Actions ✅ | CI roundtrip ✅ | pending | pending | automated genuine-user regression ✅; packaged upgrade pending | upstream #1606 / CAD 3.8.2 settings snapshot |

## Release decision

- [x] Fast CI, package validation, Chromium E2E and Firefox E2E are green for one exact technical candidate SHA.
- [x] Same-source `release-candidate-packages` provenance is confirmed.
- [x] Published-artifact download and inner package SHA256 verification are confirmed inside the already-required `Release Candidate Packages` job.
- [ ] Minimal visual/permission smoke is green in both browser families.
- [ ] Residual full-browser-startup checks are green. Firefox is now ✅; Chromium already-installed startup remains pending.
- [ ] Exact-RC packaged historical upgrade + restart evidence is green in both browser families (automated genuine-user migration regression is already green).
- [ ] PR #1 is mergeable against the current base with no unresolved conflicts/blocking functional checks.
- [ ] No candidate-affecting change occurred after the pinned SHA without replacement validation.
- [ ] Only then merge `modernization-p0` into `3.X.X-Branch`.
- [ ] Validate the integrated branch before creating a tagged fork release.
