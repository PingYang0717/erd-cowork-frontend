# 09: Artifact 渲染（Studio 右側面板）

**What to build:** The generated Artifact actually appears next to the conversation, styled for the current theme ([ADR-0001](../../../docs/adr/0001-artifact-rendered-via-sandboxed-iframe.md)).

**Blocked by:** 08 (對話送出與 Scenario 比對), 03 (Theme shell)

**Status:** done

- [x] Artifact panel (ticket 06 layout) renders the Artifact HTML returned for the message sent in ticket 08, inside `<iframe sandbox srcDoc>`
- [x] Iframe receives the current theme (light/dark) via `postMessage` and re-renders in the matching style when the app theme is toggled
- [x] Mock artifact HTML fixtures exist for all 4 Scenarios, each with a light and dark variant (or CSS-variable-driven single variant)
- [x] `docs/api/interface.md` updated with the "get artifact" endpoint (incl. `?theme=` param); `types/api/Artifact.ts` finalized
- [x] Seam test: trigger a scenario, assert the iframe's `srcDoc` contains the expected fixture content; toggle theme, assert the iframe content updates to the dark/light variant

## Comments

**2026-08-23:** Two fidelity gaps found while auditing against the mockup.

First, the panel's empty state was a single centred line of text
("Ask a question to generate an Artifact."), where the mockup's `cwPreviewRoot`
shows a 56px primary-tinted icon tile above a "No artifact yet" heading and one line
of guidance ("Ask eRD AI to build a dashboard or a deck — the result renders here.").
That state is what a user sees immediately after New chat, so it was the first thing
off. Now reproduced, and the three call sites that each repeated the old string share
one `EmptyPanel`.

Second, the fixture palette in `src/mocks/artifactFixtures.ts` was its own invention
(dark `#0b0f14` / `#161b22` / accent `#69b1ff`), so the iframe read as a different
app inside a dark page. It now carries the same values as
`features/theme/tokens.ts`; the iframe cannot read the app's custom properties
(ADR-0001), so the duplication is deliberate and noted in `architecture.md` §8.

- [x] Empty state matches the mockup's "No artifact yet" panel
- [x] Artifact HTML uses the mockup's palette in both themes
