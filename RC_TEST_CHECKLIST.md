# Cookie AutoDelete Release Candidate Test Checklist

This checklist is the manual release-readiness gate for the Manifest V3 modernization. It supplements automated CI; it does not replace it.

## Test identity

Record the exact candidate before testing:

- Commit SHA: `53209f360b52b7e6a3f4025cc07c910b24c0151f`
- Base SHA (`3.X.X-Branch`): `81b259c131fa6c0570a8253b852991f2b482be88`
- CI pull-request run ID: `32439378775`
- `release-candidate-packages` artifact ID: `9431860563`
- Operating system:
- Firefox version / edition:
- Chromium/Chrome version:
- Tester:
- Date:

Use the Firefox XPI and Chromium ZIP from the **same** `release-candidate-packages` artifact. For the current candidate these are `Cookie-AutoDelete_Dev_20260821_021858_53209f3_Firefox.xpi` and `Cookie-AutoDelete_Dev_20260821_021858_53209f3_Chrome.zip`. Verify both packaged files against the included `SHA256SUMS.txt` before loading them.

Automated validation for this exact candidate already passed archive/stage parity (60 Firefox files, 61 Chromium files), Firefox ZIP/XPI byte identity, TypeScript 7 typecheck, 37/37 Jest suites (577/577 tests), lint and production build. The dependency/test-toolchain state includes Jest 30, `webextension-polyfill 0.12.0` and `ts-loader 9.6.2`; the validated dependency migration reached zero findings in both full `npm audit` and `npm audit --omit=dev`. The GitHub wrapper artifact digest is `sha256:891232f8281af65ede7cb80e1da7fe1911d11b55eea67a614408dcf01f29cc41`; this wrapper digest is not a substitute for verifying the two package checksums inside `SHA256SUMS.txt`.

Before starting the final manual matrix, confirm PR #1 still targets the recorded current `3.X.X-Branch` base, has no real merge conflict/base drift, and that the candidate was generated **after** the most recent required base synchronization. The known external `github-advanced-security` AI-agent failure may make GitHub report `mergeable_state: unstable`; that external failure alone does not invalidate the candidate when regular CI, CodeQL and JavaScript/TypeScript/Actions analysis remain green. If the base changes or an actual merge conflict appears, resolve/synchronize first, rerun CI, and record the replacement candidate instead of testing a stale artifact.

## 1. Package integrity and installation

### Firefox

- [ ] Extract the GitHub Actions artifact wrapper and locate the `*Firefox.xpi` candidate.
- [ ] Verify the XPI checksum against `SHA256SUMS.txt`.
- [ ] Load/install the unsigned candidate using an appropriate Firefox development/test method.
- [ ] Confirm the extension starts without a fatal error.
- [ ] Confirm the toolbar action opens the popup.
- [ ] Confirm the settings/options page opens.

### Chromium / Chrome

- [ ] Extract the GitHub Actions artifact wrapper and locate the `*Chrome.zip` candidate.
- [ ] Verify the ZIP checksum against `SHA256SUMS.txt`.
- [ ] Extract the Chrome ZIP and load the resulting directory with Developer mode / Load unpacked.
- [ ] Confirm the extension starts without a fatal error.
- [ ] Confirm the toolbar action opens the popup.
- [ ] Confirm the settings/options page opens.

## 2. Basic UI and persisted settings

Run in both browser families unless a check is explicitly Firefox-only.

- [ ] Change several ordinary settings, close the popup/options page, reopen it and confirm the values persist.
- [ ] Restart the browser and confirm the changed settings still persist.
- [ ] Confirm popup and options state agree after changing a setting in one surface and reopening the other.
- [ ] Confirm no obvious broken labels, missing controls or fatal console errors are present in popup/options.

## 3. Allowlist and greylist behavior

Use disposable test sites/cookies so that no important browser data is at risk.

- [ ] Add an exact-domain allowlist rule and confirm matching site data is retained when cleanup would otherwise run.
- [ ] Remove the allowlist rule and confirm the same cleanup path can remove the test data.
- [ ] Add an exact-domain greylist rule and confirm the configured greylist behavior is honored.
- [ ] Verify a wildcard/subdomain allowlist case.
- [ ] Verify an unrelated domain is not accidentally matched by the test rules.
- [ ] Firefox only: if container/contextual-identity support is available, verify a container-sensitive rule does not leak across containers.

## 4. Cleanup triggers

Use test cookies/storage created specifically for this checklist.

### Tab close

- [ ] Enable the relevant cleanup-on-tab-close policy.
- [ ] Create test site data.
- [ ] Close the last relevant tab.
- [ ] Confirm the expected data is removed and allowlisted data is retained.

### Domain change

- [ ] Enable the relevant domain-change cleanup policy.
- [ ] Create test site data on domain A.
- [ ] Navigate the tab to unrelated domain B.
- [ ] Confirm domain A is cleaned according to policy while protected entries remain intact.

### Browser restart

- [ ] Enable the relevant restart cleanup policy.
- [ ] Create disposable test data plus at least one protected/allowlisted entry.
- [ ] Fully exit the browser and start it again.
- [ ] Confirm cleanup occurs as configured and protected data survives.

## 5. MV3 lifecycle / restart resilience

### Chromium

- [ ] Exercise the extension after the browser has had an opportunity to suspend/recreate its Manifest V3 service worker.
- [ ] Reopen popup/options and confirm state is still coherent.
- [ ] Repeat one cleanup trigger after worker recreation and confirm it still functions.

### Firefox

- [ ] Restart Firefox with the candidate still installed/loaded through the chosen test method.
- [ ] Confirm state restoration and one cleanup trigger still function.

## 6. Firefox-specific capability checks

- [ ] Confirm Firefox-specific contextual identity/container functionality is available only where supported.
- [ ] Verify a container-specific allowlist/cleanup scenario if containers are enabled.
- [ ] Confirm ordinary non-container browsing remains functional when container APIs are present.

## 7. Real historical-profile upgrade test

This gate requires **real representative historical Cookie AutoDelete data** rather than a synthetic fixture. Do not perform it on an important primary browser profile.

For each available historical Firefox/Chromium profile or exported settings/list dataset:

- [ ] Make a backup or clone of the test profile/export before upgrading.
- [ ] Record the old Cookie AutoDelete version and browser version if known.
- [ ] Record representative custom settings and allowlist/greylist entries before the upgrade.
- [ ] Upgrade/import into the RC without clearing extension storage first.
- [ ] Confirm existing lists remain present with their intended values.
- [ ] Confirm existing custom settings remain present where still supported.
- [ ] Confirm settings introduced after the historical version receive safe defaults without resetting unrelated values.
- [ ] Confirm no cleanup occurs merely because the old profile lacks a later-introduced setting.
- [ ] Exercise one protected-domain and one cleanup-domain case after the upgrade.
- [ ] Record any migration warning, data loss, unexpected cleanup or silent reset as a release blocker.

## 8. Result matrix

| Gate | Firefox | Chromium | Notes |
| --- | --- | --- | --- |
| Package/checksum | ☐ | ☐ | |
| Install/start | ☐ | ☐ | |
| Popup/options | ☐ | ☐ | |
| Settings persistence | ☐ | ☐ | |
| Allowlist/greylist | ☐ | ☐ | |
| Tab-close cleanup | ☐ | ☐ | |
| Domain-change cleanup | ☐ | ☐ | |
| Restart cleanup | ☐ | ☐ | |
| MV3 lifecycle/restart | ☐ | ☐ | |
| Real historical upgrade | ☐ | ☐ | |
| Firefox containers | ☐ | n/a | |

## Release gate

Do **not** merge `modernization-p0` into `3.X.X-Branch` or create a tagged fork release until:

1. all applicable manual Firefox and Chromium checks above pass,
2. at least one representative real historical upgrade path per browser family is validated when suitable historical data is available,
3. PR #1 is mergeable with the current `3.X.X-Branch` base and the tested candidate was generated after the latest required base synchronization,
4. the exact candidate SHA remains green in regular CI, and
5. any discovered regression is fixed and the affected checks are repeated on the replacement candidate.
