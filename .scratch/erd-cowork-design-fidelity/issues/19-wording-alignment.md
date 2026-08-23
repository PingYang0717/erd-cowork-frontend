# 19: 文案中文化

**What to build:** Interface text that drifted to English is restored to the mockup's approved Chinese wording, without introducing an i18n framework.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Sort menu labels restored to Chinese ("排序: 釘選優先/最近建立/名稱 A→Z")
- [ ] Gallery empty-state and attachment Modal copy restored to Chinese (e.g. "點擊選擇 或把檔案拖拉到這裡", "最多 5 個檔案 · 總計上限 5 GB")
- [ ] Artifact chip in chat shows a "shown right →" hint next to the Artifact name (the hint text itself stays in English — a deliberate exception, not an oversight)
- [ ] Open-in-new-tab tooltip text changed to "在新分頁開啟預覽"
- [ ] Seam test: assert the sort menu, gallery empty state, and attachment modal render the Chinese copy; assert the Artifact chip hint and open-in-new-tab tooltip render the specified text
