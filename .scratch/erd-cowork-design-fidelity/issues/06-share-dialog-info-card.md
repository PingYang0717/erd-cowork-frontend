# 06: 分享 Dialog 資訊卡

**What to build:** The share dialog shows a summary card of what's being shared, instead of a bare name.

**Blocked by:** 02 (Per-version 生成/發佈狀態 + 生成動作)

**Status:** ready-for-agent

- [ ] Share dialog shows an info card: 40×40 icon tile (primary-bg), the Artifact's name, a "{kind} · eRD Cowork" subtitle, and a success-colored "已生成" chip reflecting the current version's generated state from ticket 02
- [ ] Seam test: open the share dialog for a generated Artifact, assert the info card renders the correct name, kind, and generated chip
