# 13: Artifact 分享對話框

**What to build:** Users can generate a shareable link for an Artifact via a department/person picker.

**Blocked by:** 09 (Artifact 渲染)

**Status:** done

- [x] Share dialog with a searchable department/person picker ("搜尋部門碼/課別碼/中文名"), backed by a mock directory dataset
- [x] Confirming share generates a shareable URL and marks the artifact as shared (seed data may simulate a recipient's "Shared to me" view)
- [x] `docs/api/interface.md` updated with the share endpoint
- [x] Seam test: open share dialog, search/select a recipient, confirm, assert a share link is displayed and the artifact's shared state updates

## Comments

**2026-08-23:** Code review found `ArtifactPanel.tsx`'s "生成 Artifact"/"已生成" toggle was gated on `artifact.shared`, conflating "has been shared to someone" with "has been generated" — mislabeling the share action as "generate," and duplicating the adjacent Share button, which already does the actual share-dialog opening correctly per this ticket. Fixed: the panel now always shows a static "已生成" badge (every artifact reaching this panel already exists per ticket 09 — there's no separate un-generated state in this app's data model, unlike the mockup's `cwArtifactShared` flow), and the Share button remains the sole control for this ticket's share flow, with its `sharedIndicator` checkmark still reflecting `artifact.shared`.
