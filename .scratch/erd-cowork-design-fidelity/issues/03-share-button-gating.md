# 03: 分享鈕 gating

**What to build:** The share button reflects whether the current Artifact version has actually been generated, instead of always being clickable.

**Blocked by:** 02 (Per-version 生成/發佈狀態 + 生成動作)

**Status:** ready-for-agent

- [ ] Share button is disabled (grayed out, `cursor: not-allowed`) while the current version is not generated, with ticket 01's tooltip reading "請先生成 Artifact"
- [ ] Share button becomes primary-colored and clickable once the current version is generated
- [ ] The extra `sharedIndicator` checkmark badge (not present in the mockup) is removed from the share button
- [ ] Seam test: seed an ungenerated version and assert the share button is disabled with the gating tooltip; generate it and assert the button becomes enabled
