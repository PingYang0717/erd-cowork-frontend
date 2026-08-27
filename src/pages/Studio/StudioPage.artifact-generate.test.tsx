import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { BACKEND_UNSUPPORTED } from '@/constants/messages';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';

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

describe('Per-version Artifact generation', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  // Generating and sharing both had backend-less endpoints behind them (ADR-0009), so
  // the two tests that drove 生成 → 已生成 → Share now assert the pair is disabled.
  // What still works — a fresh version being recognised as ungenerated — is kept.
  it('offers a disabled 生成 Artifact for a fresh (regenerated) version', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    // The seeded session's latest version is already generated.
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    expect(await screen.findByText('已生成')).toBeInTheDocument();

    // Regenerating produces a new, not-yet-generated version.
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));

    expect(await screen.findByRole('button', { name: '生成 Artifact' })).toBeDisabled();
    expect(screen.queryByText('已生成')).not.toBeInTheDocument();
  });

  it('disables Share on both a generated and an ungenerated version, saying why', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已生成');

    const share = screen.getByRole('button', { name: 'Share artifact' });
    expect(share).toBeDisabled();
    await user.hover(share);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(BACKEND_UNSUPPORTED);
    await user.unhover(share);

    // Still disabled on a fresh version — the reason is the missing endpoint, not the
    // version's generated state.
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await screen.findByRole('button', { name: '生成 Artifact' });
    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeDisabled();
  });

  it('keeps each version’s generated state independent when switching versions', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已生成');

    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await screen.findByRole('button', { name: '生成 Artifact' });

    // Switch back to the seeded, already-generated v1: the chip returns.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/ }));
    expect(await screen.findByText('已生成')).toBeInTheDocument();

    // And v2 is still ungenerated when switching to it again.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v2/ }));
    expect(await screen.findByRole('button', { name: '生成 Artifact' })).toBeInTheDocument();
  });
});
