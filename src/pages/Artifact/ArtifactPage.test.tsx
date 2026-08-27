import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { ArtifactsGalleryPage } from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import { StudioPage } from '@/pages/Studio/StudioPage';

import { ArtifactPage } from './ArtifactPage';

function renderArtifactPageAt(path: string) {
  // Retries would hide the "not found" case behind exponential backoff, so
  // this suite's requests resolve/reject immediately.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
            <Route path="artifacts" element={<ArtifactsGalleryPage />} />
          </Route>
          <Route path="/cowork/artifact/:artifactId" element={<ArtifactPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Artifact full-page view', () => {
  it('renders the correct seeded Artifact when navigated to directly, with no prior session context', async () => {
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
  });

  it('shows a not-found message when the Artifact id does not exist', async () => {
    renderArtifactPageAt('/cowork/artifact/does-not-exist');

    expect(await screen.findByText('Artifact not found.')).toBeInTheDocument();
    expect(screen.queryByTitle('Artifact preview')).not.toBeInTheDocument();
  });

  it('shows Back and returns to the gallery when opened from a gallery card', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifacts');

    await user.click(await screen.findByRole('button', { name: 'SPC analysis — Vt (gate CD)' }));
    await screen.findByTitle('Artifact preview');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
  });

  it('shows Home and returns to the Studio when opened directly (a shared link)', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(await screen.findByRole('button', { name: 'New chat' })).toBeInTheDocument();
  });

  it('lists the session-derived versions in the toolbar version menu', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');

    // Versions derive from the artifact's session history: session-1 seeds one
    // artifact-bearing message, so artifact-1 is its v1 (and its only version).
    // Switching between versions is covered in the Studio panel's suite.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('SPC analysis — Vt (gate CD)');
    expect(items[0]).toHaveAttribute('aria-current', 'true');
  });

  it('shows the Shared to me header instead of the version menu for an Artifact shared by someone else', async () => {
    renderArtifactPageAt('/cowork/artifact/artifact-3');

    await screen.findByTitle('Artifact preview');

    const header = screen.getByLabelText('Shared to me');
    expect(within(header).getByText('Alice Wu')).toBeInTheDocument();
    expect(within(header).getByText('Shared to me')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '切換版本' })).not.toBeInTheDocument();
  });

  it('offers Share, Refresh, and Open-in-new-tab in the toolbar', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');

    // Share is live: clicking opens the recipient dialog (the submit surfaces the
    // backend's own answer, ready or not).
    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Refresh artifact' }));
    expect(await screen.findByTitle('Artifact preview')).toBeInTheDocument();

    const openInNewTab = screen.getByRole('button', { name: 'Open artifact in new tab' });
    await user.hover(openInNewTab);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('在新分頁開啟預覽');
    await user.unhover(openInNewTab);

    await user.click(openInNewTab);
    expect(openSpy).toHaveBeenCalledWith(
      '/cowork/artifact/artifact-1',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
  });
});
