import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import StudioShell from '@/components/layouts/StudioShell';
import ArtifactsGalleryPage from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import { useSessionSelectionStore } from '@/stores/useSessionSelectionStore';
import { useStudioLayoutStore } from '@/stores/useStudioLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { answerAnalysisConditions } from '@/test/studioRun';

import StudioPage from './StudioPage';

function renderStudioPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cowork']}>
        <Routes>
          <Route path="/cowork" element={<StudioShell />}>
            <Route index element={<StudioPage />} />
            <Route path="artifacts" element={<ArtifactsGalleryPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function artifactsNav() {
  // Name starts with the label ("Artifacts" + badge count); the toast's
  // 前往 Artifacts button doesn't match the anchor.
  return screen.findByRole('button', { name: /^Artifacts/ });
}

describe('Publish feedback: badge count, coach highlight, toast', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('counts only published Artifacts in the rail badge, increments on publish, coaches the nav entry, and offers a toast', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    // All three seeded Artifacts are published.
    // The rail suspends until the Artifacts list arrives, so wait for it first.
    expect(await within(await artifactsNav()).findByText('3')).toBeInTheDocument();

    // A regenerated (unpublished) version does not change the count, but the
    // artifact needs publishing: use a brand-new artifact via the composer.
    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    // The composer subtree suspends on its queries; wait for it before sync getBy*.
    await screen.findByRole('textbox', { name: 'Message' });
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);

    // The new artifact arrives unpublished once the steps animation finishes.
    const publishButton = await screen.findByRole(
      'button',
      { name: '發布 Artifact' },
      { timeout: 5000 },
    );
    expect(within(await artifactsNav()).getByText('3')).toBeInTheDocument();
    expect(await artifactsNav()).not.toHaveAttribute('data-coach');

    await user.click(publishButton);

    // Badge +1, coach highlight on, toast with both actions.
    expect(await within(await artifactsNav()).findByText('4')).toBeInTheDocument();
    expect(await artifactsNav()).toHaveAttribute('data-coach', 'true');

    const toast = await screen.findByRole('status', { name: 'Artifact 已發布' });
    expect(within(toast).getByRole('button', { name: '前往 Artifacts' })).toBeInTheDocument();
    expect(within(toast).getByRole('button', { name: '知道了' })).toBeInTheDocument();
  });

  it('知道了 dismisses the toast and coach; 前往 Artifacts navigates to the gallery', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    // The composer subtree suspends on its queries; wait for it before sync getBy*.
    await screen.findByRole('textbox', { name: 'Message' });
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);
    await user.click(
      await screen.findByRole('button', { name: '發布 Artifact' }, { timeout: 5000 }),
    );

    const toast = await screen.findByRole('status', { name: 'Artifact 已發布' });
    await user.click(within(toast).getByRole('button', { name: '知道了' }));
    expect(screen.queryByRole('status', { name: 'Artifact 已發布' })).not.toBeInTheDocument();
    expect(await artifactsNav()).not.toHaveAttribute('data-coach');

    // Publish another version to bring the toast back, then navigate.
    await user.type(
      await screen.findByRole('textbox', { name: 'Message' }),
      'Regenerate the dashboard.{Enter}',
    );
    await user.click(await screen.findByRole('button', { name: '發布 Artifact' }));
    const toast2 = await screen.findByRole('status', { name: 'Artifact 已發布' });
    await user.click(within(toast2).getByRole('button', { name: '前往 Artifacts' }));

    expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
  });
});
