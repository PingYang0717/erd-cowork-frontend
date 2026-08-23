import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { StudioShell } from '@/features/studio/components/StudioShell';
import { useStudioLayoutStore } from '@/features/studio/store/useStudioLayoutStore';
import { useThemeStore } from '@/features/theme/store/useThemeStore';

import { StudioPage } from './StudioPage';

// StudioPage is only the /cowork index route's content now; the session
// rail lives in StudioShell, the route's shared parent (router.tsx). This
// mirrors that nesting so the rendered tree matches production.
function renderStudioPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Artifact version switcher', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('lists a seeded Artifact’s versions and re-renders the iframe with the selected version’s HTML', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).not.toContain('Draft');

    await user.click(screen.getByTitle('切換版本'));
    expect(screen.getByRole('menuitem', { name: /draft/i })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /draft/i }));

    const updatedIframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(await screen.findByRole('button', { name: /draft/i })).toBeInTheDocument();
    expect(updatedIframe.getAttribute('srcdoc')).toContain('Draft');
  });

  it('renders content of its own for a regenerated version', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('· v2');

    await user.click(screen.getByRole('button', { name: 'Regenerate artifact' }));

    await expect
      .poll(() =>
        (screen.getByTitle('Artifact preview') as HTMLIFrameElement).getAttribute('srcdoc'),
      )
      .toContain('· v3');
  });
});
