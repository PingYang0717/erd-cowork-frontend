# 05: 生成流程 coach highlight + toast

**What to build:** Generating an Artifact version gives the user visible feedback about where the result landed, via a toast and a highlighted nav entry.

**Blocked by:** 02 (Per-version 生成/發佈狀態 + 生成動作)

**Status:** ready-for-agent

- [ ] Generating a version increments the Artifacts count shown in the left rail's Artifacts nav row
- [ ] The left-rail Artifacts nav entry receives a coach highlight immediately after generation
- [ ] A toast appears offering "前往 Artifacts" and "知道了"; "前往 Artifacts" navigates to the Artifacts gallery
- [ ] Seam test: trigger generation on a version, assert the Artifacts count updates, the nav entry is highlighted, and the toast renders with both actions; click "前往 Artifacts" and assert navigation to the gallery
