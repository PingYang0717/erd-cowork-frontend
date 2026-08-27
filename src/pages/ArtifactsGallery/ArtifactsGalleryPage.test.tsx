import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { BACKEND_UNSUPPORTED } from '@/constants/messages';
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

  // Pinning used to be clicked here and asserted across a simulated reload. There is no
  // backend endpoint behind it (ADR-0009), so the button states what it cannot do.
  it('disables the card pin button, saying why', async () => {
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    expect(screen.getByRole('button', { name: 'Pin SPC analysis — Vt (gate CD)' })).toBeDisabled();
  });

  it("shows Pin, Copy Link, Share, and Delete in an owned card's more-actions menu", async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' });

    await user.click(
      screen.getByRole('button', { name: 'More actions for SPC analysis — Vt (gate CD)' }),
    );
    // Copy link is the only one with nothing behind it to wait for: it reads the
    // current URL. The other three are disabled until the backend has the endpoints.
    expect(screen.getByRole('menuitem', { name: 'Copy link' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    for (const label of ['Pin', 'Share', 'Delete']) {
      const item = screen.getByRole('menuitem', { name: new RegExp(`^${label}`) });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(within(item).getByText(BACKEND_UNSUPPORTED)).toBeInTheDocument();
    }
  });

  it('hides Share in the more-actions menu of a "Shared to me" card', async () => {
    const user = userEvent.setup();
    renderGalleryPage();
    await screen.findByRole('button', { name: 'Daily monitor (A14)' });

    await user.click(screen.getByRole('button', { name: 'More actions for Daily monitor (A14)' }));
    expect(screen.getByRole('menuitem', { name: /^Pin/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Share/ })).not.toBeInTheDocument();
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

  // Sharing is disabled (ADR-0009), so the badge is asserted from the data that would
  // arrive once something has been shared, rather than by sharing it here.
  it('shows the primary "Shared" badge in the meta row for an Artifact already shared', async () => {
    server.use(
      http.get('/api/artifacts', () =>
        HttpResponse.json([
          {
            id: 'artifact-1',
            sessionId: 'session-1',
            name: 'SPC analysis — Vt (gate CD)',
            kind: 'dashboard',
            scenario: 'spc',
            pinned: false,
            mine: true,
            shared: true,
            generated: true,
            createdAt: '2026-08-20T09:15:00.000Z',
          },
        ]),
      ),
    );
    renderGalleryPage();

    const spcCard = (
      await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' })
    ).closest('[role="listitem"]') as HTMLElement;
    expect(within(spcCard).getByText('Shared')).toBeInTheDocument();
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
