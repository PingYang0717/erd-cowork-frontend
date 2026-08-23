# 07: Session list & CRUD

**What to build:** A working session rail: users can see, create, pin, and rename sessions, and the list survives a reload.

**Blocked by:** 04 (Shared API types & mock identity), 06 (Studio three-pane layout)

**Status:** done

- [x] MSW endpoints for list/create/rename/pin sessions, backed by the ticket-02 localStorage helper
- [x] Session rail (built into the ticket-06 layout) shows Pinned and Recent sections
- [x] "New chat" creates a session and selects it
- [x] User can pin/unpin and rename a session from the rail
- [x] `docs/api/interface.md` updated with the session endpoints; `types/api/Session.ts` finalized
- [x] Seam test: create a session, rename it, pin it, reload (simulated), assert it's still there and in the right section

## Comments

**2026-08-23:** Code review flagged session deletion (`DELETE /sessions/:id` plus the
rail's delete action) as behaviour outside this ticket's AC, which covers list / create
/ rename / pin only. It is built, working, and documented in `docs/api/interface.md`,
so this ticket's scope is retroactively expanded to cover it rather than removing a
working feature:

- [x] User can delete a session from the rail; the deletion is persisted
