# Historical state fixtures

This directory contains migration fixtures used by
`HistoricalReleaseState.regression.spec.ts`.

## Release-derived fixtures

The committed `3.0.2.json`, `3.4.0.json`, and `3.6.0.json` fixtures are derived
from the exact `initialState` schema in tagged upstream Cookie AutoDelete
releases. Their metadata records the upstream tag, commit SHA, source path, and
source blob SHA so the provenance is auditable.

They are intentionally **not** described as real user profile exports. The test
overlays representative non-default user values in memory and then runs the
current persisted-state parser, Redux store hydration, and `validateSettings()`
normalization against both Firefox and Chromium capability contexts.

## Adding a real historical profile/export

Real historical user data remains a release gate. When a representative profile
or persisted-state snapshot is available:

1. Work from a copy and remove secrets or personally identifying data. Replace
   private domains with stable placeholders while preserving list structure,
   store/container IDs, setting keys, value types, and missing legacy fields.
2. Do not commit raw browser profile directories, cookies, tokens, credentials,
   browsing history, or unrelated extension storage.
3. Store only the minimal Cookie AutoDelete persisted Redux state needed for the
   upgrade check, using the same fixture envelope (`metadata` + `state`). Set a
   distinct metadata `kind`, for example `sanitized-real-profile`.
4. Record the source CAD version and browser family in metadata. Do not claim a
   version when it cannot be established.
5. Extend the regression test only if the real snapshot uses a genuinely older
   storage envelope that the current harness cannot represent without changing
   its meaning.

A sanitized real-profile fixture must still be validated manually in the
packaged release candidate as required by `RC_TEST_CHECKLIST.md`; this automated
harness is an additional non-destructive regression gate, not a replacement for
that browser-level test.

## Public genuine-user fixtures

Genuine public historical-user evidence lives separately in
`../genuine-user-state/` and is exercised by
`GenuineHistoricalUserData.regression.spec.ts`.

The initial evidence set contains:

- Firefox 57.0b9 / CAD 2.0.1 from upstream issue #197: a verbatim persisted
  Redux state posted by the user, including a real Firefox-container whitelist,
  counters, legacy setting shapes/value types, and container cache entries.
- Google Chrome 119.0.6045.160 / CAD 3.8.2 from upstream issue #1606: the real
  CAD core-settings values posted by the user. The fixture only performs the
  mechanical name-to-key transformation needed to feed those exported values
  through the persisted-state migration harness; no user values are invented.

Both source issues are public. The committed evidence contains no cookies,
credentials, tokens, browsing history, private domains, or personal profile
paths. Provenance and source form are recorded in each fixture.

This closes the gap in **automated** migration evidence between release-derived
schemas and genuine user data. It does not replace the packaged/manual upgrade
and restart checks in `RC_TEST_CHECKLIST.md`.
