import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';

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

function artifactSrcdoc() {
  return (screen.getByTitle('Artifact preview') as HTMLIFrameElement).getAttribute('srcdoc');
}

/** Versions are derived from the session's artifact-bearing messages (cowork master's
 *  model): every regenerate is a chat turn that yields a new artifact, and that
 *  artifact is the next version. */
describe('Artifact version switcher', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('derives versions from the history; regenerating appends v2 and switching back re-renders v1', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    // The seeded session has one artifact-bearing message → one version, v1.
    await screen.findByTitle('Artifact preview');
    await expect.poll(artifactSrcdoc).toContain('· v1');

    // Regenerate sends a chat turn (mockup's cwRegen) that lands as v2 and takes
    // over the panel.
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await expect.poll(artifactSrcdoc, { timeout: 5000 }).toContain('· v2');

    // Switching back to v1 re-renders the iframe with v1's HTML.
    await user.click(screen.getByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/ }));
    await expect.poll(artifactSrcdoc).toContain('· v1');
  });

  it('shows the custom menu: header row, current-version highlight, per-row time, and published checks', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByTitle('Artifact preview');

    // Regenerate so the menu holds mixed published states (v1 published, v2 not).
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await screen.findByRole('button', { name: '發布 Artifact' });

    await user.click(screen.getByRole('button', { name: '切換版本' }));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('版本 · 共 2 個，可切換後再發布')).toBeInTheDocument();

    const current = within(menu).getByRole('menuitem', { name: /v2/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    const v1Row = within(menu).getByRole('menuitem', { name: /v1/ });
    expect(v1Row).not.toHaveAttribute('aria-current', 'true');

    // The published seeded version carries the green check; the fresh v2 does not.
    expect(within(v1Row).getByLabelText('已發布')).toBeInTheDocument();
    expect(within(current).queryByLabelText('已發布')).not.toBeInTheDocument();

    // Seeded v1's timestamp (2026-08-20) renders in its row; the relative
    // format shows a weekday within a week of "now", the date beyond that.
    expect(within(v1Row).getByText(/^(Thu|Aug 20)$/)).toBeInTheDocument();
  });
});
