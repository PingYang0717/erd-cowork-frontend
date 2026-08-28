import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StudioShell from '@/components/layouts/StudioShell';
import ArtifactsGalleryPage from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import StudioPage from '@/pages/Studio/StudioPage';

interface RenderStudioOptions {
  /** Passed to the QueryClient. Suites that assert a "not found" state set this to
   *  `false`, so a rejection surfaces immediately instead of behind exponential backoff. */
  retry?: boolean;
}

/** Renders the Studio the way the router does.
 *
 *  StudioPage is only the `/cowork` index route's content; the session rail lives in
 *  StudioShell, the route's shared parent (`app/router.tsx`). Mirroring that nesting is
 *  what makes the rendered tree match production — a test that rendered StudioPage alone
 *  would have no rail to click. The artifacts route is included because publishing
 *  navigates there. */
export function renderStudio({ retry = true }: RenderStudioOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
            <Route path="artifacts" element={<ArtifactsGalleryPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Waits for the composer to be interactive.
 *
 *  Its subtree suspends on its own queries, so anything that reaches for a control with a
 *  synchronous `getBy*` right after selecting a session races that suspension. */
export function waitForComposer(): Promise<HTMLElement> {
  return screen.findByRole('textbox', { name: 'Message' });
}
