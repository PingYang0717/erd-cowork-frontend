# 16: Connectors 面板

**What to build:** Users can see and control which data connectors are available to their analyses, from within the composer.

**Blocked by:** 08 (對話送出與 Scenario 比對)

**Status:** ready-for-agent

- [ ] An entry point in the composer (attach/connect menu) opens a Connectors panel/modal
- [ ] Lists all connector types (Inline, WAT, CP, Lot Info, Lot Abnormal, Process, Defect, TEM, Recipe, Offline Tool Log) with status (connected/available/expired/no_access)
- [ ] Connect/disconnect action updates status via MSW PATCH, persisted
- [ ] `docs/api/interface.md` updated with connector endpoints; `types/api/Connector.ts` finalized
- [ ] Seam test: open panel, toggle a connector's connection state, reload (simulated), assert it persisted
