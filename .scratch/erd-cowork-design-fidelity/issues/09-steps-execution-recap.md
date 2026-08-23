# 09: Steps 執行紀錄摺疊卡

**What to build:** Users can review what the system did to produce a result, both while it's running and after it's done.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] After a Scenario finishes running, a collapsible "Worked through N steps" summary remains in the thread (it currently disappears entirely on completion)
- [ ] Expanding the summary shows each step's title and description (description data already exists in the response but is not currently rendered)
- [ ] While a Scenario is running, the label reads "eRD AI is working…" (not just "eRD AI"), and the step list renders inside a bordered, rounded card
- [ ] Seam test: trigger a Scenario, assert the in-progress label and bordered card render; assert the completed message keeps the collapsible steps summary and that expanding it shows each step's description
