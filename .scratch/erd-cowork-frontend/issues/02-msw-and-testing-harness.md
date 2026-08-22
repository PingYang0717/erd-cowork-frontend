# 02: MSW + testing harness

**What to build:** The mocked network boundary and the single testing seam (render + MSW + Testing Library) that every subsequent feature ticket will use, plus a shared localStorage-persistence helper so mock resources survive a page reload.

**Blocked by:** 01 (Project scaffold & tooling)

**Status:** done

- [x] `services/apiClient.ts` (Axios instance with interceptors per `architecture.md` 第5節) exists and is the only way features call the API
- [x] MSW wired for both dev mode (browser worker) and test mode (node server), sharing the same handler definitions
- [x] A shared helper (e.g. `createPersistedResource`) lets a handler read/write a named JSON collection in `localStorage`, so mocked collections survive a reload
- [x] Vitest + React Testing Library + `@testing-library/user-event` configured and runnable via `npm test`
- [x] One example end-to-end test proves the seam: render a trivial page wrapped in the real `QueryClientProvider`, MSW returns fixture data via the persisted-resource helper, test asserts on rendered DOM only (no mocking of React Query/Zustand/child components)
- [x] The pattern is documented (short README or comment in the test harness) so later tickets copy it rather than reinvent it
