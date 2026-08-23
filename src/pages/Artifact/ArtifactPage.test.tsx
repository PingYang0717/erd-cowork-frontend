import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { ArtifactsGalleryPage } from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';

import { ArtifactPage } from './ArtifactPage';

function renderArtifactPageAt(path: string) {
  // Retries would hide the "not found" case behind exponential backoff, so
  // this suite's requests resolve/reject immediately.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/cowork/artifacts" element={<ArtifactsGalleryPage />} />
          <Route path="/cowork/artifact/:artifactId" element={<ArtifactPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Artifact full-page view', () => {
  beforeEach(() => {
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('renders the correct seeded Artifact when navigated to directly, with no prior session context', async () => {
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('SPC analysis — Vt (gate CD)');
    expect(iframe.getAttribute('srcdoc')).toContain('data-artifact-theme="light"');
  });

  it('shows a not-found message when the Artifact id does not exist', async () => {
    renderArtifactPageAt('/cowork/artifact/does-not-exist');

    expect(await screen.findByText('Artifact not found.')).toBeInTheDocument();
    expect(screen.queryByTitle('Artifact preview')).not.toBeInTheDocument();
  });

  it('propagates theme toggling on this page to the iframe', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    const iframe = (await screen.findByTitle('Artifact preview')) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('data-artifact-theme="dark"');
  });

  it('shows a Back button that returns to the Artifacts gallery', async () => {
    const user = userEvent.setup();
    renderArtifactPageAt('/cowork/artifact/artifact-1');

    await screen.findByTitle('Artifact preview');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
  });
});
