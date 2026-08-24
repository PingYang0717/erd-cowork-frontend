# Testing harness

There are **two** test seams in this project.

## 1. The network boundary (default)

Everything that is not the agent stream is tested here (confirmed in
`.scratch/erd-cowork-frontend/spec.md` → "Testing Decisions"):

- Render the real page/component tree wrapped in the real `QueryClientProvider`
  (and `RouterProvider` / Zustand store where relevant) — no mocking of
  TanStack Query, Zustand, or child components.
- MSW intercepts the HTTP calls made through `services/apiClient.ts` and
  returns fixture data.
- Assertions go through Testing Library's user-facing queries (`getByRole`,
  `getByText`, ...), never through implementation details.

See `src/test/example/ExampleWidgetsPage.tsx` + `.test.tsx` for a worked
example: a trivial page fetches a list via `apiClient`, MSW serves it from a
`createPersistedResource`-backed handler (`src/mocks/handlers.ts`), and the
test only asserts on rendered DOM.

## 2. `useAgentStream` (the agent stream state machine)

Added with `.scratch/erd-cowork-agent-streaming/` and confirmed with the user before
implementation. The streaming state machine has more state combinations than the page
seam can drive comfortably (nine event types, user stop, unexpected disconnection,
backend refusal, elapsed time, ERROR-does-not-end-the-run), so it is tested directly
via `renderHook`:

- `src/features/thread/hooks/useAgentStream.test.ts` — state combinations
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
gone (ADR-0005). `mockAgentStreamRejection()` covers a refusal before the stream
opens, and `stream.disconnect()` covers a connection dying mid-run.

## Copying this pattern for a real feature

1. Add the feature's handler(s) to `src/mocks/handlers.ts`, backed by
   `createPersistedResource` (`src/mocks/persistedResource.ts`) if the
   resource needs to survive a reload.
2. Build the feature under `features/<name>/` per `architecture.md` (API
   function in `api/`, data hooks in `hooks/`), wired into a `pages/` entry.
3. Test at the page level: render the page with real providers, let MSW
   answer, assert on the rendered DOM.

## Layout

- `src/mocks/` — MSW handlers, the browser worker (dev) and node server
  (test), and the `createPersistedResource` localStorage helper. Both dev and
  test share the same `handlers.ts`.
- `src/test/setup.ts` — Vitest setup: starts/resets/closes the MSW node
  server and clears `localStorage` between tests.
- `src/test/example/` — the worked example above.

## Running tests

```
npm test        # single run
npm run test:watch
```
