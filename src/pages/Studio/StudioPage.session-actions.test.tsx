import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';

import { StudioPage } from './StudioPage';

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

async function openMenuOf(user: ReturnType<typeof userEvent.setup>, title: string) {
  await screen.findByRole('button', { name: title });
  await user.click(screen.getByRole('button', { name: `More actions for ${title}` }));
}

/** The three session writes go straight to the backend now — no disabled rows, no
 *  後端未支援 hints (the backend is here; an endpoint that is not answers with an
 *  error instead). */
describe('Session row actions', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
  });

  it('renames a session through the menu, and the row shows the new name', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));

    const input = await screen.findByRole('textbox', { name: 'Rename Defect pareto — W12' });
    await user.clear(input);
    await user.type(input, 'Pareto — W13{Enter}');

    expect(await screen.findByRole('button', { name: 'Pareto — W13' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Defect pareto — W12' })).not.toBeInTheDocument();
  });

  it('pins a recent session and finds it under Pinned', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    const recents = await screen.findByRole('region', { name: 'Recents sessions' });
    expect(
      within(recents).getByRole('button', { name: 'Defect pareto — W12' }),
    ).toBeInTheDocument();

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Pin' }));

    const pinned = screen.getByRole('region', { name: 'Pinned sessions' });
    expect(
      await within(pinned).findByRole('button', { name: 'Defect pareto — W12' }),
    ).toBeInTheDocument();
  });

  it('deletes a session and the row is gone', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await openMenuOf(user, 'Defect pareto — W12');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Defect pareto — W12' })).not.toBeInTheDocument(),
    );
  });
});
