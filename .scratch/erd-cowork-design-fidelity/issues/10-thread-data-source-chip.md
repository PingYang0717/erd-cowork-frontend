# 10: Thread 資料來源 chip

**What to build:** Users can see what data source their conversation is scoped to, directly in the thread header.

**Blocked by:** None (can start immediately)

**Status:** done

- [ ] Thread header shows a data-source chip (e.g. "Inline DB · N5 line": database icon, fs11.5, border-secondary, br7, pad 3 8) reflecting the current session/Scenario's data source
- [ ] The chip renders alongside the existing ThemeToggle in the header, not replacing it
- [ ] Seam test: open a session with a known data source, assert the chip's text and icon render correctly next to the theme toggle
