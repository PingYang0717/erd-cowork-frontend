import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('Artifact panel toolbar', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('shows a "生成 Artifact" CTA for an unshared Artifact, and clicking it opens the share dialog', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    const cta = await screen.findByRole('button', { name: '生成 Artifact' });
    await user.click(cta);

    expect(await screen.findByRole('dialog', { name: '分享 Artifact' })).toBeInTheDocument();
  });

  it('shows a "已生成" badge instead of the CTA once the Artifact has been shared', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await user.click(await screen.findByRole('button', { name: 'Share artifact' }));

    const dialog = await screen.findByRole('dialog', { name: '分享 Artifact' });
    const picker = within(dialog).getByRole('combobox');
    await user.type(picker, '鄭凱宇');
    await user.click(await screen.findByRole('option', { name: /CHXXGHYC/ }));
    await user.click(within(dialog).getByRole('button', { name: '分享' }));
    await user.click(within(dialog).getByRole('button', { name: '完成' }));

    expect(screen.getByText('已生成')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '生成 Artifact' })).not.toBeInTheDocument();
  });

  it('opens the Artifact’s full-page view in a new tab', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await user.click(await screen.findByRole('button', { name: 'Open artifact in new tab' }));

    expect(openSpy).toHaveBeenCalledWith(
      '/cowork/artifact/artifact-1',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
  });

  it('regenerates the Artifact, adding and switching to a new version', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));

    await user.click(await screen.findByTitle('切換版本'));
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    await user.keyboard('{Escape}');

    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));

    await user.click(await screen.findByTitle('切換版本'));
    await expect.poll(() => screen.getAllByRole('menuitem')).toHaveLength(3);
  });
});
