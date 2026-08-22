import { createBrowserRouter, Navigate } from 'react-router-dom';

import { StudioShell } from '@/features/studio/components/StudioShell';
import { ArtifactPage } from '@/pages/Artifact/ArtifactPage';
import { ArtifactsGalleryPage } from '@/pages/ArtifactsGallery/ArtifactsGalleryPage';
import { SchedulePage } from '@/pages/Schedule/SchedulePage';
import { StudioPage } from '@/pages/Studio/StudioPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/cowork" replace />,
  },
  {
    // The session rail (StudioShell) persists across Studio, Artifacts, and
    // Schedule — only the single-Artifact full-page view below opts out of
    // it, matching the mockup's cwView-driven layout (ADR-0002).
    path: '/cowork',
    element: <StudioShell />,
    children: [
      { index: true, element: <StudioPage /> },
      { path: 'artifacts', element: <ArtifactsGalleryPage /> },
      { path: 'schedule', element: <SchedulePage /> },
    ],
  },
  {
    path: '/cowork/artifact/:artifactId',
    element: <ArtifactPage />,
  },
]);
