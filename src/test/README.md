# Testing harness

The only test seam in this project is the **network boundary** (confirmed in
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
