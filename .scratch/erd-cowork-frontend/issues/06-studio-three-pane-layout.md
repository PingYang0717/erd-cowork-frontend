# 06: Studio three-pane resizable layout

**What to build:** The resizable three-column Studio shell (session rail / thread / artifact panel) that later tickets will fill with real content.

**Blocked by:** 05 (Routing shell)

**Status:** done

- [ ] `/cowork` renders three panels: session list rail, thread panel, artifact panel (currently empty placeholders)
- [ ] Each panel can be resized by dragging its edge, within the bounds implied by the mockup (session rail 200–460px, thread 320–720px)
- [ ] Session rail can collapse to an icon-only rail and expand back
- [ ] Panel widths are session-only UI state (Zustand, not persisted) per `architecture.md`'s state classification rule
- [ ] Seam test: render `/cowork`, simulate a drag-resize interaction, assert panel width state changes; assert collapse/expand toggles visibility

## Comments

**2026-08-23:** The boundary between the thread and the Artifact panel was
invisible: both panes share the same `bg-layout` background, the thread pane had no
`border-right` (the session rail did), and both resize handles were bare 4px strips
with nothing drawn in them — so at any zoom level there was nothing to aim at.

The mockup's own `erd-resize` was reproduced instead: a 9px grab area with
`margin: 0 -4px` so it sits on top of the pane border, containing a 1px full-height
line that is `--erd-color-border-secondary` at rest and `--erd-color-primary` on
hover or while dragging. It lives in `features/studio/components/ResizeHandle.tsx`
and is shared by `StudioShell` and `StudioLayout`, which previously repeated the
handle markup. `useHorizontalDrag` now also pins `cursor`/`user-select` on
`<body>` for the duration of a drag, as the mockup does, and reports `isDragging`.

- [x] The thread pane carries the mockup's `border-right`, and both dividers render a
      visible line with hover / dragging feedback
