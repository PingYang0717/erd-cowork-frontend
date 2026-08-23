# 04: 版本選單元件化

**What to build:** A custom version-switch menu matching the mockup, replacing the current antd Dropdown, surfacing the per-version published state from ticket 02.

**Blocked by:** 02 (Per-version 生成/發佈狀態 + 生成動作)

**Status:** ready-for-agent

- [ ] Custom menu (not antd Dropdown), width 340, shows a header row: "版本 · 共 N 個,可切換後再生成"
- [ ] The currently-viewed version row is highlighted (primary-bg background, version label in primary color, fw600)
- [ ] Each row shows its creation timestamp
- [ ] Rows for published versions show a green checkmark
- [ ] The menu's trigger control uses ticket 01's tooltip ("切換版本")
- [ ] Seam test: seed an Artifact with 2+ versions in mixed published states, open the menu, assert the header text, current-version highlight, and published marks all render correctly; select a different version and assert the panel switches to it
