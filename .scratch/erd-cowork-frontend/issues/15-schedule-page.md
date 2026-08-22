# 15: Schedule 排程列表

**What to build:** Users can see and control their scheduled/recurring analysis jobs.

**Blocked by:** 05 (Routing shell), 04 (Shared API types & mock identity)

**Status:** ready-for-agent

- [ ] `/cowork/schedule` lists scheduled jobs with cadence, last-run time, and status (Active/Paused)
- [ ] Pause/resume control toggles a job's status via MSW PATCH, persisted
- [ ] `docs/api/interface.md` updated with schedule endpoints; `types/api/ScheduleJob.ts` finalized
- [ ] Seam test: list seeded jobs, pause one, reload (simulated), assert status persisted
