# 11: Thread 自動捲動

**What to build:** New messages are always visible without the user needing to scroll manually.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] When a new message is added to the thread, the scroll container scrolls to the bottom (matching the mockup's ~40ms-after-render timing so it happens after layout settles)
- [ ] Seam test: seed a thread scrolled away from the bottom, send a new message, assert the scroll container's position reaches the bottom after the update
