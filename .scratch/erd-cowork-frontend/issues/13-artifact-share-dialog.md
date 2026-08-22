# 13: Artifact 分享對話框

**What to build:** Users can generate a shareable link for an Artifact via a department/person picker.

**Blocked by:** 09 (Artifact 渲染)

**Status:** done

- [x] Share dialog with a searchable department/person picker ("搜尋部門碼/課別碼/中文名"), backed by a mock directory dataset
- [x] Confirming share generates a shareable URL and marks the artifact as shared (seed data may simulate a recipient's "Shared to me" view)
- [x] `docs/api/interface.md` updated with the share endpoint
- [x] Seam test: open share dialog, search/select a recipient, confirm, assert a share link is displayed and the artifact's shared state updates
