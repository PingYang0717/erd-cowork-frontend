# 04: Shared API types & mock identity

**What to build:** The shared DTO contract and endpoint-documentation skeleton that every later feature ticket extends, plus a fixed mock "current user" the rest of the app can read.

**Blocked by:** 02 (MSW + testing harness)

**Status:** done

- [x] `types/api/` contains DTO types for `Session`, `Message`, `Scenario`, `Artifact`, `ArtifactVersion`, `Connector`, `ScheduleJob`, `DcItem`, `Upload` (fields may be stubs where a later ticket owns the detail, but each type exists)
- [x] `docs/api/interface.md` created with a table skeleton (method / path / request / response) ready for later tickets to append their own endpoints to
- [x] A mock current-user constant/module (name, department, id) is exported and used wherever "who am I" is needed later (e.g. "Yours" filters, CP Test 送測人)
- [x] No login UI exists; the identity is available immediately on app load

## Comments

**2026-08-23:** Code review found the third AC was checked but not honoured:
`services/currentUser.ts` had no importer anywhere in the repo, and the Gallery's
"Yours" filter read a hard-coded `mine` boolean from the fixtures instead. Fixed by
moving ownership to the mock backend: each stored Artifact now carries an `ownerId`
(the seeded shared one belongs to Alice, the rest to `currentUser`), and every
Artifact response derives `mine` from `ownerId === currentUser.id`. The wire DTO is
unchanged, so no client code moved; the "Yours" filter now genuinely runs through the
mock identity. Documented in `docs/api/interface.md` (Artifact section).
