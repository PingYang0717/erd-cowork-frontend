# 08: 對話送出與 Scenario 比對

**What to build:** The core "ask a question, get an analysis" loop: typing or clicking a suggested prompt resolves to one of the four Scenarios, shows a multi-step "AI working" animation, and ends with a chat reply.

**Blocked by:** 07 (Session list & CRUD)

**Status:** done

- [x] Composer accepts free-text input and exposes the five suggested-prompt buttons (Inline dashboard / SPC analysis / Generate slides / Daily monitor (A14) / CP Test status)
- [x] Free text is matched (mock, server-side) via keyword/regex to one of `spc`/`inline`/`daily`/`cptest`; suggested-prompt buttons send an explicit `scenarioKey`
- [x] Submitting a message returns a fixed `steps: {key,title,description}[]` list for the resolved Scenario; the UI plays these back sequentially via a client-side timer (no real streaming)
- [x] After the steps finish, a chat reply message appears in the thread, referencing the produced Artifact (Artifact rendering itself is ticket 09 — this ticket may stub the reference)
- [x] `docs/api/interface.md` updated with the "send message" endpoint and its response shape (steps + final reply + artifact reference); `types/api/Message.ts`/`Scenario.ts` finalized
- [x] Seam test: submit each of the 4 scenario triggers (both via button and matching free text), assert the step list plays and a final reply appears

## Comments

**2026-08-23:** Code review found the "Generate slides" suggested prompt was wired to
`scenarioKey: 'spc'` with no other difference, and the message handler hard-coded
`kind: 'dashboard'` — so slides replayed the SPC dashboard verbatim and
`ArtifactKind = 'slides'` was unreachable at runtime. Fixed by adding an optional
`artifactKind` to `POST /sessions/:sessionId/messages`: the slides prompt now sends
`artifactKind: 'slides'`, which keeps the SPC scenario, appends the mockup's fifth
"Generate slides" step, names the Artifact `… (slides)`, and renders it as a slide
deck instead of a dashboard surface. Slides are deliberately not a fifth Scenario —
the mockup appends the step to the same base list, and `CONTEXT.md` fixes the
Scenario set at four. Seam test added in `StudioPage.chat.test.tsx`.
