# 14: Artifacts 總覽

**What to build:** A gallery page listing all generated Artifacts with working filters and sort.

**Blocked by:** 09 (Artifact 渲染)

**Status:** done

> Done together with ticket 12 in the same session: per the mockup, ticket 12's Artifact
> pin control's only UI home is this Gallery card, so ticket 12's pin/unpin button lives
> here (see ticket 12's scope note). Ticket 13's Share/Copy-link/Delete card-menu actions
> were left out — out of this ticket's and ticket 12's scope.

- [x] `/cowork/artifacts` lists Artifacts from the mock API (`GET /artifacts`)
- [x] Filters: All / Yours / Shared to me / Pinned, each correctly narrowing the list (verified against seeded fixtures covering each state, independent of whether tickets 12/13's UI has been exercised)
- [x] Sort control (pinned-first / most recent / name A→Z) reorders the list
- [x] Seam test: seed artifacts covering all 4 filter states, assert each filter shows the right subset; assert sort changes order — see `src/pages/ArtifactsGallery/ArtifactsGalleryPage.test.tsx`

## Comments

**2026-08-23:** Code review found the scope note above no longer matches what shipped: `ArtifactCard.tsx` implements Copy link, Share, and Delete in the card's kebab menu (wired to `useDeleteArtifact()` and `ShareArtifactDialog`), which the note above says were left out of this ticket's scope. Retroactively expanding this ticket's scope to cover them, since they're built and working:

- [x] Card kebab menu offers Pin/Unpin, Copy link, Share (hidden once the artifact is already `sharedBy` someone else), and Delete
