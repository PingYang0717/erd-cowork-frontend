import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
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

  it('offers 生成 Artifact for a fresh (regenerated) version, and generating flips it to the 已生成 chip', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    // The seeded session's latest version is already generated.
    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    expect(await screen.findByText('已生成')).toBeInTheDocument();

    // Regenerating produces a new, not-yet-generated version.
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));

    const generateButton = await screen.findByRole('button', { name: '生成 Artifact' });
    expect(screen.queryByText('已生成')).not.toBeInTheDocument();

    await user.click(generateButton);

    expect(await screen.findByText('已生成')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '生成 Artifact' })).not.toBeInTheDocument();
  });

  it('gates the Share button on the current version being generated', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已生成');

    // Generated version: share is enabled.
    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeEnabled();

    // A fresh ungenerated version disables share with an explanatory tooltip.
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await screen.findByRole('button', { name: '生成 Artifact' });

    const share = screen.getByRole('button', { name: 'Share artifact' });
    expect(share).toBeDisabled();

    await user.hover(share);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('請先生成 Artifact');
    await user.unhover(share);

    // Generating unlocks it again.
    await user.click(screen.getByRole('button', { name: '生成 Artifact' }));
    await screen.findByText('已生成');
    expect(screen.getByRole('button', { name: 'Share artifact' })).toBeEnabled();
  });

  it('keeps each version’s generated state independent when switching versions', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
    await screen.findByText('已生成');

    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await screen.findByRole('button', { name: '生成 Artifact' });

    // Switch back to the seeded, already-generated v2: the chip returns.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v2/ }));
    expect(await screen.findByText('已生成')).toBeInTheDocument();

    // And v3 is still ungenerated when switching to it again.
    await user.click(await screen.findByRole('button', { name: '切換版本' }));
    await user.click(await screen.findByRole('menuitem', { name: /v3/ }));
    expect(await screen.findByRole('button', { name: '生成 Artifact' })).toBeInTheDocument();
  });
});
