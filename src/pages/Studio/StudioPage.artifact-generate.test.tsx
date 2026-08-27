import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { artifactApi } from '@/api/artifactApi';
import { StudioShell } from '@/components/layouts/StudioShell';
import { BACKEND_UNSUPPORTED } from '@/constants/messages';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import type { Artifact } from '@/types/api/index';

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

describe('Per-version Artifact publishing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  // 發布 = 開放給別人使用。The button the mockup labels 生成 Artifact is what does it,
  // and `publishedAt` is what it sets — not to be confused with 重新生成, which asks the
  // Agent for a whole new version.
  it('offers 發布 Artifact for a fresh (regenerated) version, and publishes through the backend', async () => {
    const publish = vi.spyOn(artifactApi, 'publish').mockResolvedValue({} as Artifact);
    const user = userEvent.setup();
    renderStudioPage();

    // The seeded session's latest version is already published.
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    expect(await screen.findByText('已發布')).toBeInTheDocument();

    // Regenerating produces a new, not-yet-published version.
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));

    const publishButton = await screen.findByRole('button', { name: '發布 Artifact' });
    expect(publishButton).toBeEnabled();
    expect(screen.queryByText('已發布')).not.toBeInTheDocument();

    // The chip does not flip here: the Artifacts listing this panel reads its
    // published state from is still stubbed (ADR-0009). What the click must do is
    // reach the endpoint.
    await user.click(publishButton);
    expect(publish).toHaveBeenCalled();
  });

  it('disables Share on a published version too — the endpoint is what is missing, not the publish', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已發布');

    const share = screen.getByRole('button', { name: 'Share artifact' });
    expect(share).toBeDisabled();
    await user.hover(share);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(BACKEND_UNSUPPORTED);
  });

  it('keeps each version’s published state independent when switching versions', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已發布');

    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await screen.findByRole('button', { name: '發布 Artifact' });

    // Switch back to the seeded, already-published v1: the chip returns.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/ }));
    expect(await screen.findByText('已發布')).toBeInTheDocument();

    // And v2 is still unpublished when switching to it again.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v2/ }));
    expect(await screen.findByRole('button', { name: '發布 Artifact' })).toBeInTheDocument();
  });
});
