# 12: Session rail 結構修正

**What to build:** The session rail remains fully usable regardless of how many sessions exist, and never appears to lose a section entirely.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] Session rail separates its fixed header (New chat button, Schedule/Artifacts nav rows) from a scrollable session-list region, so every session remains reachable when the list is taller than one screen (currently the rail is `overflow:hidden` and later sessions are unreachable)
- [ ] The "Recents" header renders even when there are no recent sessions, showing "No recent chats." instead of hiding the whole section
- [ ] Seam test: seed enough sessions to overflow the rail, assert the list scrolls and the last session is reachable/clickable; separately seed zero recent sessions, assert the "Recents" header and empty-state text render
