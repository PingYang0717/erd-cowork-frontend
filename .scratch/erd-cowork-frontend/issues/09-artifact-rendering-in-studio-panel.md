# 09: Artifact 渲染（Studio 右側面板）

**What to build:** The generated Artifact actually appears next to the conversation, styled for the current theme ([ADR-0001](../../../docs/adr/0001-artifact-rendered-via-sandboxed-iframe.md)).

**Blocked by:** 08 (對話送出與 Scenario 比對), 03 (Theme shell)

**Status:** done

- [x] Artifact panel (ticket 06 layout) renders the Artifact HTML returned for the message sent in ticket 08, inside `<iframe sandbox srcDoc>`
- [x] Iframe receives the current theme (light/dark) via `postMessage` and re-renders in the matching style when the app theme is toggled
- [x] Mock artifact HTML fixtures exist for all 4 Scenarios, each with a light and dark variant (or CSS-variable-driven single variant)
- [x] `docs/api/interface.md` updated with the "get artifact" endpoint (incl. `?theme=` param); `types/api/Artifact.ts` finalized
- [x] Seam test: trigger a scenario, assert the iframe's `srcDoc` contains the expected fixture content; toggle theme, assert the iframe content updates to the dark/light variant
