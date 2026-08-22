# 04: Shared API types & mock identity

**What to build:** The shared DTO contract and endpoint-documentation skeleton that every later feature ticket extends, plus a fixed mock "current user" the rest of the app can read.

**Blocked by:** 02 (MSW + testing harness)

**Status:** done

- [x] `types/api/` contains DTO types for `Session`, `Message`, `Scenario`, `Artifact`, `ArtifactVersion`, `Connector`, `ScheduleJob`, `DcItem`, `Upload` (fields may be stubs where a later ticket owns the detail, but each type exists)
- [x] `docs/api/interface.md` created with a table skeleton (method / path / request / response) ready for later tickets to append their own endpoints to
- [x] A mock current-user constant/module (name, department, id) is exported and used wherever "who am I" is needed later (e.g. "Yours" filters, CP Test 送測人)
- [x] No login UI exists; the identity is available immediately on app load
