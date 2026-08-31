# Testing harness

MSW is **test-only**: the app itself always talks to the real backend (ADR-0006).
Nothing here runs in dev or production.

There are **two** test seams in this project.

## 1. The network boundary (default)

Everything that is not the agent stream is tested here:

- Render the real page/component tree wrapped in the real `QueryClientProvider`
  (and `RouterProvider` / Zustand store where relevant) — no mocking of
  TanStack Query, Zustand, or child components.
- MSW intercepts the HTTP calls made through `api/apiClient.ts` and
  returns fixture data.
- Assertions go through Testing Library's user-facing queries (`getByRole`,
  `getByText`, ...), never through implementation details.

`src/mocks/handlers.sessionFiles.test.ts` is a compact worked example: it drives the
session-files endpoints through the wire and asserts only on what comes back.

## 2. `useAgentStream` (the agent stream state machine)

The streaming state machine has more state combinations than the page seam can drive
comfortably (nine event types, user stop, unexpected disconnection, backend refusal,
elapsed time, ERROR-does-not-end-the-run), so it is tested directly via `renderHook`:

- `src/hooks/useAgentStream.test.ts` — state combinations
- `src/utils/sseParser.test.ts` — SSE wire format (a pure function)
- `src/pages/Studio/StudioPage.*.test.tsx` — the user-facing flow, still at the page seam

Both hook- and page-level tests drive the stream through `src/test/agentStream.ts`:

```ts
const stream = mockAgentStream();
// ...render, send...
stream.push({ type: 'STEP', stepKey: 'connect', ..., status: 'RUNNING' });
// assert the intermediate state right here
stream.push({ type: 'TOKEN', delta: 'Vt ' });
stream.close();
```

Nothing is on a timer. The test decides when the next event arrives, so **every**
intermediate state is observable — which is the whole point of the streaming UI. Do
not reach for `vi.useFakeTimers()`: the old 500ms step-reveal timer it existed for is
gone (ADR-0003). `mockAgentStreamRejection()` covers a refusal before the stream
opens, and `stream.disconnect()` covers a connection dying mid-run.

## Two environment shims you must not reorder

`setup.ts` installs two things before the suite runs. Both exist because the test
environment lies about something the browser gets right:

- **`seedTestIdentity.ts`** — fixes the anonymous user id, and is imported **first**,
  ahead of the mocks' module graph. `getUserId` re-reads `localStorage` on every call
  (no in-memory cache, cowork parity) and the fixtures capture `currentUser.id` at
  module-load time, so an unseeded id would flip every ownership check mid-file.
- **`formDataWire.ts`** — serialises `FormData` into browser-equivalent multipart
  bytes. jsdom's `File` is downgraded to an anonymous blob on the way through
  MSW/undici, which would silently erase every uploaded filename.

## Adding a feature's tests

1. Add the feature's handler(s) to `src/mocks/handlers.ts`, backed by
   `createPersistedResource` (`src/mocks/persistedResource.ts`) if the
   resource needs to survive a reload.
2. Build it per `architecture.md`: the endpoint module in `src/api/`, data hooks in
   `src/hooks/`, the UI under `src/components/<domain>/`, wired into a `pages/` entry.
3. Test at the page level: render the page with real providers, let MSW
   answer, assert on the rendered DOM.

## Layout

- `src/mocks/` — MSW handlers, the node server used by tests, fixtures, and the
  `createPersistedResource` localStorage helper.
- `src/test/setup.ts` — Vitest setup: the two shims above, the MSW node server's
  start/reset/close, and `localStorage` clearing between tests.
- `src/test/agentStream.ts` / `studioRun.ts` — helpers for driving a run.

Tests run with a **bounded worker pool** (`maxWorkers: 4`; measured 2026-08-28:
~110s serial → 30s, five green runs). Every pane suspends before it renders, so a
`findBy*` waits one more async hop than it used to — _unbounded_ parallelism (a worker
per core) starves those waits, a bounded pool does not. If the suite flakes under
load, lower the worker count before disabling parallelism.

## Running tests

```
npm test        # single run
npm run test:watch
```
