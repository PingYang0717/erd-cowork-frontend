# 06: Studio three-pane resizable layout

**What to build:** The resizable three-column Studio shell (session rail / thread / artifact panel) that later tickets will fill with real content.

**Blocked by:** 05 (Routing shell)

**Status:** done

- [ ] `/cowork` renders three panels: session list rail, thread panel, artifact panel (currently empty placeholders)
- [ ] Each panel can be resized by dragging its edge, within the bounds implied by the mockup (session rail 200–460px, thread 320–720px)
- [ ] Session rail can collapse to an icon-only rail and expand back
- [ ] Panel widths are session-only UI state (Zustand, not persisted) per `architecture.md`'s state classification rule
- [ ] Seam test: render `/cowork`, simulate a drag-resize interaction, assert panel width state changes; assert collapse/expand toggles visibility
