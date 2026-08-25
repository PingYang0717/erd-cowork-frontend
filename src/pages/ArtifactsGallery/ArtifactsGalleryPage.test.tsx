import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';
import { ArtifactPage } from '@/pages/Artifact/ArtifactPage';
import type { Artifact } from '@/types/api/index';

import { ArtifactsGalleryPage } from './ArtifactsGalleryPage';

function renderGalleryPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ArtifactsGalleryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Artifacts gallery', () => {
  it('lists every seeded Artifact under "All", with per-filter counts', async () => {
    renderGalleryPage();

    expect(
      await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inline dashboard — W12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily monitor (A14)' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /^All/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /^Yours/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /^Shared to me/ })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /^Pinned/ })).toHaveTextContent('1');
  });

  it('narrows the list per filter, independent of any pin/rename interaction', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(screen.getByRole('button', { name: /^Yours/ }));
    expect(screen.getByRole('button', { name: 'SPC analysis — Vt (gate CD)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inline dashboard — W12' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Daily monitor (A14)' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Shared to me/ }));
    expect(screen.getByRole('button', { name: 'Daily monitor (A14)' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Pinned/ }));
    expect(screen.getByRole('button', { name: 'Inline dashboard — W12' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Daily monitor (A14)' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^All/ }));
    expect(screen.getByRole('button', { name: 'Daily monitor (A14)' })).toBeInTheDocument();
  });

  it('reorders the list via the sort control', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    function orderedCardNames() {
      const list = screen.getByRole('list', { name: 'Artifacts' });
      return within(list)
        .getAllByRole('listitem')
        .map((item) => within(item).getAllByRole('button')[0].textContent);
    }

    await user.click(screen.getByRole('button', { name: /排序:/ }));
    await user.click(screen.getByRole('menuitem', { name: /名稱 A→Z/ }));

    const namesByNameSort = orderedCardNames();
    expect(namesByNameSort[0]).toContain('Daily monitor');
    expect(namesByNameSort[1]).toContain('Inline dashboard');
    expect(namesByNameSort[2]).toContain('SPC analysis');

    await user.click(screen.getByRole('button', { name: /排序:/ }));
    await user.click(screen.getByRole('menuitem', { name: /最近建立/ }));

    const namesByRecency = orderedCardNames();
    expect(namesByRecency[0]).toContain('Inline dashboard');
    expect(namesByRecency[1]).toContain('SPC analysis');
    expect(namesByRecency[2]).toContain('Daily monitor');
  });

  it('pins an Artifact from its card, and the pinned state persists across a simulated reload', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    const pinButton = screen.getByRole('button', {
      name: 'Pin SPC analysis — Vt (gate CD)',
    });
    await user.click(pinButton);

    expect(
      await screen.findByRole('button', { name: 'Unpin SPC analysis — Vt (gate CD)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pinned/ })).toHaveTextContent('2');

    // Reload: fresh QueryClient + fresh render, so the only way pinned state
    // survives is if the mock backend (localStorage-backed) actually persisted it.
    renderGalleryPage();
    const pinnedFilters = await screen.findAllByRole('button', { name: /^Pinned/ });
    const reloadedPinnedFilter = pinnedFilters[pinnedFilters.length - 1];
    expect(reloadedPinnedFilter).toHaveTextContent('2');

    const reloadedGalleries = screen.getAllByRole('button', {
      name: 'Unpin SPC analysis — Vt (gate CD)',
    });
    expect(reloadedGalleries.length).toBeGreaterThan(0);
  });

  it("shows Pin, Copy Link, Share, and Delete in an owned card's more-actions menu", async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    expect(screen.getByRole('menuitem', { name: 'Pin' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('hides Share in the more-actions menu of a "Shared to me" card', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'Daily monitor (A14)' });

    await user.click(screen.getByRole('button', { name: 'More actions for Daily monitor (A14)' }));
    expect(screen.getByRole('menuitem', { name: 'Pin' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('deletes an Artifact from its card menu, and the deletion persists across a simulated reload', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(
      screen.queryByRole('button', { name: 'SPC analysis — Vt (gate CD)' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All/ })).toHaveTextContent('2');

    renderGalleryPage();
    await screen.findByRole('button', { name: 'Inline dashboard — W12' });
    expect(screen.queryAllByRole('button', { name: 'SPC analysis — Vt (gate CD)' })).toHaveLength(
      0,
    );
  });

  it("copies an Artifact's link to the clipboard from its card menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = writeText;
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/cowork/artifact/artifact-1'));
  });

  it('opens the share dialog for an Artifact from its card menu', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Share' }));

    expect(await screen.findByRole('dialog', { name: '分享 Artifact' })).toBeInTheDocument();
  });

  it('distinguishes kinds by thumbnail, names the producing session, and badges sharing states', async () => {
    renderGalleryPage();

    const spcOpen = await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });
    const spcCard = spcOpen.closest('[role="listitem"]') as HTMLElement;
    const dailyCard = screen
      .getByRole('button', { name: 'Daily monitor (A14)' })
      .closest('[role="listitem"]') as HTMLElement;

    // Thumbnails carry the kind so dashboard and slides cards can be told apart.
    expect(within(spcCard).getByTestId('artifact-thumbnail')).toHaveAttribute(
      'data-kind',
      'dashboard',
    );
    expect(within(dailyCard).getByTestId('artifact-thumbnail')).toHaveAttribute(
      'data-kind',
      'slides',
    );

    // Each card names the session that produced it (session list loads async).
    expect(await within(spcCard).findByText('SPC — Vt (gate CD)')).toBeInTheDocument();
    expect(await within(dailyCard).findByText('Defect pareto — W12')).toBeInTheDocument();

    // Shared-to-me cards carry the thumbnail overlay badge; owned ones don't.
    expect(within(dailyCard).getByText('Shared to me')).toBeInTheDocument();
    expect(within(spcCard).queryByText('Shared to me')).not.toBeInTheDocument();
  });

  it('shows the primary "Shared" badge in the meta row once an Artifact has been shared', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    const spcCard = screen
      .getByRole('button', { name: 'SPC analysis — Vt (gate CD)' })
      .closest('[role="listitem"]') as HTMLElement;
    expect(within(spcCard).queryByText('Shared')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Share' }));

    const dialog = await screen.findByRole('dialog', { name: '分享 Artifact' });
    const picker = within(dialog).getByRole('combobox');
    await user.type(picker, '鄭凱宇');
    await user.click(await screen.findByRole('option', { name: /CHXXGHYC/ }));
    await user.click(within(dialog).getByRole('button', { name: '分享' }));
    await user.click(within(dialog).getByRole('button', { name: '完成' }));

    expect(await within(spcCard).findByText('Shared')).toBeInTheDocument();
  });

  it('de-duplicates "Shared to me" by artifact id without collapsing distinct same-name artifacts', async () => {
    const shared = (over: Partial<Artifact> & Pick<Artifact, 'id' | 'name'>): Artifact => ({
      sessionId: 'session-2',
      kind: 'dashboard',
      scenario: 'daily',
      pinned: false,
      mine: false,
      shared: false,
      sharedBy: 'Alice Wu',
      generated: true,
      createdAt: '2026-08-19T08:30:00.000Z',
      ...over,
    });
    server.use(
      http.get('/api/artifacts', () =>
        HttpResponse.json([
          // The same artifact shared to the user twice: one row survives.
          shared({ id: 'artifact-9', name: 'Daily monitor (A14)' }),
          shared({ id: 'artifact-9', name: 'Daily monitor (A14)' }),
          // Two different artifacts that happen to share a name: both stay.
          shared({ id: 'artifact-10', name: 'Q3 report', sharedBy: 'Bob Lin' }),
          shared({ id: 'artifact-11', name: 'Q3 report', sharedBy: 'Carol Kao' }),
        ]),
      ),
    );

    const user = userEvent.setup();
    renderGalleryPage();

    await user.click(await screen.findByRole('button', { name: /^Shared to me/ }));

    expect(screen.getAllByRole('button', { name: 'Daily monitor (A14)' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Q3 report' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /^Shared to me/ })).toHaveTextContent('3');
  });

  it('opens an Artifact in the full-page view when its card is clicked', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cowork/artifacts']}>
          <Routes>
            <Route path="/cowork/artifacts" element={<ArtifactsGalleryPage />} />
            <Route path="/cowork/artifact/:artifactId" element={<ArtifactPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(screen.getByRole('button', { name: 'SPC analysis — Vt (gate CD)' }));

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
  });
});
