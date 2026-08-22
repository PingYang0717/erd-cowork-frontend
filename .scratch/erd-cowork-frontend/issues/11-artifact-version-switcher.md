# 11: Artifact 版本切換

**What to build:** Users can see and switch between an Artifact's past versions.

**Blocked by:** 09 (Artifact 渲染)

**Status:** done

- [x] "切換版本" menu lists an Artifact's versions (label/time) via a new MSW endpoint
- [x] Selecting a version re-renders the iframe with that version's HTML
- [x] `docs/api/interface.md` updated with the versions endpoint; `types/api/ArtifactVersion.ts` finalized
- [x] Seam test: seed an artifact with 2+ versions, switch between them, assert the rendered content changes accordingly
