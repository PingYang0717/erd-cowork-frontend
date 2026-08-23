import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
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

describe('Artifact share dialog', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('shows the Artifact info card in the share dialog', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await user.click(await screen.findByRole('button', { name: 'Share artifact' }));

    const dialog = await screen.findByRole('dialog', { name: '分享 Artifact' });

    // Info card: icon tile + name + "{kind} · eRD Cowork" + generated chip.
    const infoCard = within(dialog).getByLabelText('Artifact 資訊');
    expect(within(infoCard).getByText('SPC analysis — Vt (gate CD)')).toBeInTheDocument();
    expect(within(infoCard).getByText('Dashboard · eRD Cowork')).toBeInTheDocument();
    expect(within(infoCard).getByText('已生成')).toBeInTheDocument();
  });

  it('shares an Artifact with a searched recipient and shows the share link', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    await user.click(await screen.findByRole('button', { name: 'Share artifact' }));

    const dialog = await screen.findByRole('dialog', { name: '分享 Artifact' });

    const picker = within(dialog).getByRole('combobox');
    await user.type(picker, '鄭凱宇');
    await user.click(await screen.findByRole('option', { name: /CHXXGHYC/ }));

    await user.click(within(dialog).getByRole('button', { name: '分享' }));

    expect(
      await within(dialog).findByDisplayValue(/\/cowork\/artifact\/artifact-1$/),
    ).toBeInTheDocument();

    // The mockup's share button carries no extra shared checkmark; it stays
    // the plain Share control after sharing (ticket 03 removed the indicator).
    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeInTheDocument();
  });
});
