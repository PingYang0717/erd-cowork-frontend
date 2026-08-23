# 16: Connectors 面板

**What to build:** Users can see and control which data connectors are available to their analyses, from within the composer.

**Blocked by:** 08 (對話送出與 Scenario 比對)

**Status:** done

> Done together with ticket 17 in the same session: both live behind the same
> composer entry point (the "+" attach/connect menu), so they were built as
> one seam. Scope trimmed from the mockup: no category filter chips/search
> and no "add a custom connector" input (ticket 16 has no AC for either); the
> mockup's transient "Connecting…" spin-delay before a connector flips to
> Connected was also dropped — connect/disconnect apply immediately via the
> PATCH, matching the AC as written.

- [x] An entry point in the composer (attach/connect menu) opens a Connectors panel/modal
- [x] Lists all connector types (Inline, WAT, CP, Lot Info, Lot Abnormal, Process, Defect, TEM, Recipe, Offline Tool Log) with status (connected/available/expired/no_access)
- [x] Connect/disconnect action updates status via MSW PATCH, persisted
- [x] `docs/api/interface.md` updated with connector endpoints; `types/api/Connector.ts` finalized
- [x] Seam test: open panel, toggle a connector's connection state, reload (simulated), assert it persisted

## Comments

**2026-08-23:** Code review found the scope note above no longer matches what shipped: `ConnectorsPanel.tsx` implements a search box, a status filter-chip row, an "Add a custom data source" input with its own mutation, and a `Connecting…` pending state on toggle — all four of which this ticket's note says were explicitly trimmed from scope. Retroactively expanding this ticket's scope to cover them, since they're built and working:

- [x] Search box filters the connector list by name
- [x] Status filter chips narrow the list by connection state
- [x] "Add a custom data source" input creates a new connector via its own mutation
- [x] Toggling a connector shows a transient "Connecting…" pending state before flipping to Connected
