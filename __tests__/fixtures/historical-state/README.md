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
