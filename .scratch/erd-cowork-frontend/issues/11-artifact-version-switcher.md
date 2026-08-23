# 11: Artifact 版本切換

**What to build:** Users can see and switch between an Artifact's past versions.

**Blocked by:** 09 (Artifact 渲染)

**Status:** done

- [x] "切換版本" menu lists an Artifact's versions (label/time) via a new MSW endpoint
- [x] Selecting a version re-renders the iframe with that version's HTML
- [x] `docs/api/interface.md` updated with the versions endpoint; `types/api/ArtifactVersion.ts` finalized
- [x] Seam test: seed an artifact with 2+ versions, switch between them, assert the rendered content changes accordingly

## Comments

**2026-08-23:** Code review found `ArtifactPanel.tsx` also ships a "重新生成" (Regenerate) action (`useRegenerateArtifact`, `POST /artifacts/:id/regenerate`) that appends a new `ArtifactVersion` and switches the panel to it. No ticket's AC covers this; retroactively expanding this ticket's scope to own it, since it's the ticket that owns "versions" for this Artifact:

- [x] "重新生成"/Regenerate button re-runs the artifact's generation via `POST /artifacts/:id/regenerate`, appending a new version and switching the panel to it
