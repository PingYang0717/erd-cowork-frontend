import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { StudioShell } from '@/components/layouts/StudioShell';
import { ArtifactsGalleryPage } from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
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

describe('Generation feedback: badge count, coach highlight, toast', () => {
  beforeEach(() => {
    useStudioLayoutStore.setState(useStudioLayoutStore.getInitialState());
    useSessionSelectionStore.setState(useSessionSelectionStore.getInitialState());
    useThemeStore.setState(useThemeStore.getInitialState());
  });

  // The coach — badge increment, nav highlight, toast — is triggered by a successful
  // generate, and generating has no backend endpoint (ADR-0009). Both tests that drove
  // it are gone; what survives without generating is the badge's own arithmetic.
  it('counts only generated Artifacts in the rail badge, and coaches nothing until one is generated', async () => {
    renderStudioPage();

    // All three seeded Artifacts are generated.
    // The rail suspends until the Artifacts list arrives, so wait for it first.
    expect(await within(await artifactsNav()).findByText('3')).toBeInTheDocument();
    expect(await artifactsNav()).not.toHaveAttribute('data-coach');
    expect(screen.queryByRole('status', { name: 'Artifact 已生成' })).not.toBeInTheDocument();
  });
});
