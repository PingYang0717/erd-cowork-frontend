# 10: Artifact 全頁檢視

**What to build:** A shareable, dedicated page for viewing a single Artifact outside the Studio conversation.

**Blocked by:** 05 (Routing shell), 09 (Artifact 渲染)

**Status:** done

- [x] `/cowork/artifact/:artifactId` renders the same iframe-based Artifact viewer as ticket 09, full-page
- [x] Navigating directly to this URL (simulating a shared link, no prior session context) loads and renders the correct Artifact
- [x] Theme toggling on this page also propagates to the iframe
- [x] Seam test: navigate directly to an artifact URL (fixture seeded), assert the correct Artifact renders
