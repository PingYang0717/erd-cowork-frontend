# 18: DC Item 選擇器

**What to build:** Users can scope an SPC analysis to specific control-chart parameters, including custom ones.

**Blocked by:** 08 (對話送出與 Scenario 比對)

**Status:** ready-for-agent

> **Note (2026-08-23):** Deliberately deferred — hold off starting this one until told otherwise.

- [ ] DC Item picker: searchable list of predefined items (e.g. Idsat, Vt (gate CD), Contact Rs) with spec limits, multi-select via checkboxes
- [ ] "Add custom item" input lets the user add a DC Item not in the predefined list
- [ ] Selected DC Items are attached to the outgoing message/request (consumed by the SPC scenario from ticket 08)
- [ ] `docs/api/interface.md` updated with the DC item list/create endpoints; `types/api/DcItem.ts` finalized
- [ ] Seam test: search, select existing items, add a custom item, assert selection state reflected in the picker and passed along with the submitted request
