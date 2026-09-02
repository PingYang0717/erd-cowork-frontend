import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StudioShell from '@/components/layouts/StudioShell';
import ArtifactsGalleryPage from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import StudioPage from '@/pages/Studio/StudioPage';

import { appWrapper } from './appHarness';

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
 *  navigates there.
 *
 *  The providers come from `appWrapper`, which carries `AntdApp` as well as the query
 *  client — without it `useActionErrorToast` is a no-op and no mutation failure can be
 *  asserted from here. */
export const renderStudio = ({ retry = true }: RenderStudioOptions = {}) => {
  return render(
    <MemoryRouter initialEntries={['/cowork']}>
      <Routes>
        <Route path="/cowork" element={<StudioShell />}>
          <Route index element={<StudioPage />} />
          <Route path="artifacts" element={<ArtifactsGalleryPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { wrapper: appWrapper({ retry }) },
  );
};

/** Waits for the composer to be interactive.
 *
 *  Its subtree suspends on its own queries, so anything that reaches for a control with a
 *  synchronous `getBy*` right after selecting a session races that suspension. */
export const waitForComposer = (): Promise<HTMLElement> => {
  return screen.findByRole('textbox', { name: 'Message' });
};
