# 18: DC Item 選擇器

**What to build:** Users can scope an SPC analysis to specific control-chart parameters, including custom ones.

**Blocked by:** 08 (對話送出與 Scenario 比對)

**Status:** wontfix

> **Note (2026-08-23):** Deliberately deferred — hold off starting this one until told otherwise.

- [ ] DC Item picker: searchable list of predefined items (e.g. Idsat, Vt (gate CD), Contact Rs) with spec limits, multi-select via checkboxes
- [ ] "Add custom item" input lets the user add a DC Item not in the predefined list
- [ ] Selected DC Items are attached to the outgoing message/request (consumed by the SPC scenario from ticket 08)
- [ ] `docs/api/interface.md` updated with the DC item list/create endpoints; `types/api/DcItem.ts` finalized
- [ ] Seam test: search, select existing items, add a custom item, assert selection state reflected in the picker and passed along with the submitted request

## Comments

**2026-08-24:** Superseded by `.scratch/erd-cowork-agent-streaming/issues/09-dc-item-card.md`.
DC Item 選擇不再是一個獨立的 composer 元件，而是 SPC 執行途中的第二次反問——agent 掃描
發現 DC Item 數量過多時推出 QUESTION 事件，DC item 卡是 `dcitem` field kind 的專屬渲染器
（[ADR-0006](../../../docs/adr/0006-scenario-drives-clarification.md)）。本 ticket 的四條 AC
全部併入該 issue，不在此處實作。
