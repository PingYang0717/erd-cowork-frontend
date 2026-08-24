import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionSelectionStore } from '@/features/session/store/useSessionSelectionStore';
import { StudioShell } from '@/features/studio/components/StudioShell';
import { useStudioLayoutStore } from '@/features/studio/store/useStudioLayoutStore';
import { useThemeStore } from '@/features/theme/store/useThemeStore';
import { ArtifactsGalleryPage } from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import { answerAnalysisConditions } from '@/test/studioRun';

import { StudioPage } from './StudioPage';

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
  return screen.getByRole('button', { name: /^Artifacts/ });
}

describe('Generation feedback: badge count, coach highlight, toast', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  it('counts only generated Artifacts in the rail badge, increments on generate, coaches the nav entry, and offers a toast', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    // All three seeded Artifacts are generated.
    expect(await within(artifactsNav()).findByText('3')).toBeInTheDocument();

    // A regenerated (ungenerated) version does not change the count, but the
    // artifact needs generating: use a brand-new artifact via the composer.
    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);

    // The new artifact arrives ungenerated once the steps animation finishes.
    const generateButton = await screen.findByRole(
      'button',
      { name: '生成 Artifact' },
      { timeout: 5000 },
    );
    expect(within(artifactsNav()).getByText('3')).toBeInTheDocument();
    expect(artifactsNav()).not.toHaveAttribute('data-coach');

    await user.click(generateButton);

    // Badge +1, coach highlight on, toast with both actions.
    expect(await within(artifactsNav()).findByText('4')).toBeInTheDocument();
    expect(artifactsNav()).toHaveAttribute('data-coach', 'true');

    const toast = await screen.findByRole('status', { name: 'Artifact 已生成' });
    expect(within(toast).getByRole('button', { name: '前往 Artifacts' })).toBeInTheDocument();
    expect(within(toast).getByRole('button', { name: '知道了' })).toBeInTheDocument();
  });

  it('知道了 dismisses the toast and coach; 前往 Artifacts navigates to the gallery', async () => {
    const user = userEvent.setup();
    renderStudioPage();

    await user.click(await screen.findByRole('button', { name: 'New chat' }));
    await screen.findByRole('button', { name: 'New analysis' });
    await user.click(screen.getByRole('button', { name: 'SPC analysis' }));
    await answerAnalysisConditions(user);
    await user.click(
      await screen.findByRole('button', { name: '生成 Artifact' }, { timeout: 5000 }),
    );

    const toast = await screen.findByRole('status', { name: 'Artifact 已生成' });
    await user.click(within(toast).getByRole('button', { name: '知道了' }));
    expect(screen.queryByRole('status', { name: 'Artifact 已生成' })).not.toBeInTheDocument();
    expect(artifactsNav()).not.toHaveAttribute('data-coach');

    // Generate another version to bring the toast back, then navigate.
    await user.click(await screen.findByRole('button', { name: 'Regenerate artifact' }));
    await user.click(await screen.findByRole('button', { name: '生成 Artifact' }));
    const toast2 = await screen.findByRole('status', { name: 'Artifact 已生成' });
    await user.click(within(toast2).getByRole('button', { name: '前往 Artifacts' }));

    expect(await screen.findByRole('heading', { name: 'Artifacts' })).toBeInTheDocument();
  });
});
