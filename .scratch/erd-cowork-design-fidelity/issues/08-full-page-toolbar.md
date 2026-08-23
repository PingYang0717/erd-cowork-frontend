# 08: 全頁 Artifact 檢視工具列

**What to build:** The full-page Artifact view's toolbar carries the same capabilities as the Studio panel (version switching, sharing) plus context-aware navigation and a distinct header for content shared by others.

**Blocked by:** 03 (分享鈕 gating), 04 (版本選單元件化)

**Status:** done

> **Note (implementation):** the "session thread" entry point has no in-app
> navigation today — the Studio panel opens the full-page view in a new tab,
> which cannot carry router state — so a direct/new-tab open falls back to the
> Home variant, which returns to the Studio (`/cowork`). The gallery records
> `from: 'gallery'` and gets a true Back.

- [ ] Navigating to the full-page view records which entry point it was opened from (session thread / gallery / schedule); the Back control is labeled and routes accordingly. Opening the URL directly with no recorded entry point (e.g. a shared link) falls back to the current default behaviour
- [ ] When the Artifact belongs to the current user, the toolbar's middle section embeds ticket 04's version-switch menu
- [ ] When viewing an Artifact shared by someone else, the middle section instead shows a "Shared to me" header (usergroup icon + sharer's name + badge)
- [ ] The toolbar's right side offers Share (gated per ticket 03), Refresh, and Open-in-new-tab, each using ticket 01's tooltip
- [ ] Seam test: navigate to the full-page view from a session thread and separately from the gallery, assert Back returns to the correct origin each time; seed a `sharedBy` Artifact and assert the "Shared to me" header variant renders instead of the version pill
