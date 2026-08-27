import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { useActiveRunStore } from '@/stores/useActiveRunStore';
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

function artifactSrcdoc() {
  return (screen.getByTitle('Artifact preview') as HTMLIFrameElement).getAttribute('srcdoc');
}

/** Puts two artifact-bearing messages in one thread: the seeded session has one, and
 *  regenerating sends a chat turn that lands as the next. */
async function threadWithTwoArtifacts(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'SPC — Vt (gate CD)' }));
  await screen.findByTitle('Artifact preview');
  await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
  await expect.poll(artifactSrcdoc, { timeout: 5000 }).toContain('· v2');
}

describe("A past reply's Artifact chip", () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useActiveRunStore.setState(useActiveRunStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('puts that reply’s Artifact back on the pane when clicked', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await threadWithTwoArtifacts(user);

    // v2 owns the pane, so v1's chip offers to take it over rather than claiming — as
    // it used to, whatever was on screen — that it is already there.
    const earlier = await screen.findByRole('button', {
      name: /^Show .* in the Artifact panel$/,
    });
    await user.click(earlier);

    await expect.poll(artifactSrcdoc).toContain('· v1');
  });

  it('labels exactly one chip as the one on the pane, and moves that label on a pick', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await threadWithTwoArtifacts(user);

    expect(screen.getAllByRole('button', { name: /shown in the Artifact panel$/ })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /^Show .* in the Artifact panel$/ }));
    await expect.poll(artifactSrcdoc).toContain('· v1');

    // Still exactly one — the label moved to the chip the user picked.
    expect(screen.getAllByRole('button', { name: /shown in the Artifact panel$/ })).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /^Show .* in the Artifact panel$/ }),
    ).toBeInTheDocument();
  });

  it('hands the pane back to a new run, so a stale pick cannot outlive it', async () => {
    const user = userEvent.setup();
    renderStudioPage();
    await threadWithTwoArtifacts(user);

    await user.click(screen.getByRole('button', { name: /^Show .* in the Artifact panel$/ }));
    await expect.poll(artifactSrcdoc).toContain('· v1');

    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await expect.poll(artifactSrcdoc, { timeout: 5000 }).toContain('· v3');
  });
});
