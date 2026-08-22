# 12: Artifact pin & rename

**What to build:** Users can pin and rename an Artifact from the panel, and this status persists.

**Blocked by:** 09 (Artifact 渲染)

**Status:** done

> **Scope note (resolved with user before implementation):** `eRDWorkspace20260819.html`
> has no rename affordance for Artifacts anywhere (only Sessions can be renamed), and its
> only Artifact pin control lives on the **Artifacts Gallery card** (ticket 14's screen),
> not the Studio panel or the full-page view. Per ADR-0004's mockup-fidelity mandate, this
> ticket was implemented as **pin only, on the Gallery card**, and was done together with
> ticket 14 (which is where the pin control's only UI home actually is). Rename was
> dropped entirely — it was never in the mockup.

- [x] Pin/unpin control on the Artifacts Gallery card (see scope note above), backed by an MSW PATCH endpoint (`PATCH /artifacts/:id`)
- [x] Pinned state persists across reload (localStorage-backed)
- [x] `docs/api/interface.md` updated with the pin endpoint
- [x] Seam test: pin an artifact, reload (simulated via a fresh QueryClient + re-render), assert pinned state persists — see `src/pages/ArtifactsGallery/ArtifactsGalleryPage.test.tsx`
